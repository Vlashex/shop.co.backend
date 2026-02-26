const http = require("http");
const dotenv = require("dotenv");

const { buildProductsRoutes } = require("./adapters/http/routes/products");
const { buildUsersRoutes } = require("./adapters/http/routes/users");
const { buildAuthRoutes } = require("./adapters/http/routes/auth");
const { buildCartRoutes } = require("./adapters/http/routes/cart");
const { buildRateLimiter } = require("./adapters/http/middlewares/rateLimit");
const {
  buildRepositories: buildMongoRepositories,
} = require("./infrastructure/store/mongoStore");
const {
  buildRepositories: buildMariaRepositories,
} = require("./infrastructure/store/mariaStore");
const { buildRedisStore } = require("./infrastructure/store/redisStore");
const {
  buildProductUseCases,
} = require("./application/use-cases/products");
const { buildUserUseCases } = require("./application/use-cases/users");
const { buildAuthUseCases } = require("./application/use-cases/auth");
const { buildCartUseCases } = require("./application/use-cases/cart");
const { buildTokenService } = require("./application/services/tokenService");
const { buildHashService } = require("./application/services/hashService");
const {
  buildRefreshTokenService,
} = require("./application/services/refreshTokenService");

dotenv.config();

const port = process.env.PORT || 4000;
const corsOrigin = process.env.CORS_ORIGIN;
const enforceHttpsInProduction = (process.env.ENFORCE_HTTPS || "true") === "true";

let routes = [];
const routeLimiters = new Map();

function normalizePath(pathname) {
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

function matchRoute(routePath, requestPath) {
  const routeSegments = normalizePath(routePath).split("/").filter(Boolean);
  const requestSegments = normalizePath(requestPath).split("/").filter(Boolean);

  if (routeSegments.length !== requestSegments.length) {
    return null;
  }

  const params = {};

  for (let i = 0; i < routeSegments.length; i += 1) {
    const routeSegment = routeSegments[i];
    const requestSegment = requestSegments[i];

    if (routeSegment.startsWith(":")) {
      params[routeSegment.slice(1)] = requestSegment;
      continue;
    }

    if (routeSegment !== requestSegment) {
      return null;
    }
  }

  return params;
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk.toString("utf8");
    });

    req.on("end", () => {
      if (!raw) return resolve(null);
      try {
        return resolve(JSON.parse(raw));
      } catch {
        return resolve(null);
      }
    });
  });
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const index = pair.indexOf("=");
      if (index < 0) return acc;
      const key = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  }
  if (options.expires instanceof Date) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  parts.push(`Path=${options.path || "/"}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);

  return parts.join("; ");
}

function isSecureRequest(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (typeof forwardedProto === "string") {
    return forwardedProto.split(",")[0].trim() === "https";
  }
  return Boolean(req.socket && req.socket.encrypted);
}

function getRateLimiter(route) {
  if (!route.rateLimit) return null;
  const key = `${route.path}:${route.method}:${route.rateLimit.keyPrefix}`;
  if (!routeLimiters.has(key)) {
    routeLimiters.set(
      key,
      buildRateLimiter({
        windowMs: route.rateLimit.windowMs,
        maxRequests: route.rateLimit.maxRequests,
      })
    );
  }
  return routeLimiters.get(key);
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function createResponse(res, requestOrigin) {
  const cookies = [];

  function buildCorsHeaders() {
    if (!corsOrigin) {
      throw new Error("CORS_ORIGIN is required");
    }
    const origin = requestOrigin === corsOrigin ? requestOrigin : corsOrigin;
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token",
      "Access-Control-Allow-Methods":
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      Vary: "Origin",
    };
  }

  function writeHead(statusCode, extraHeaders = {}) {
    const headers = {
      ...buildCorsHeaders(),
      ...extraHeaders,
    };

    if (cookies.length > 0) {
      headers["Set-Cookie"] = cookies;
    }

    res.writeHead(statusCode, headers);
  }

  return {
    setCookie(name, value, options = {}) {
      cookies.push(serializeCookie(name, value, options));
    },
    clearCookie(name, options = {}) {
      cookies.push(
        serializeCookie(name, "", {
          ...options,
          expires: new Date(0),
          maxAge: 0,
        })
      );
    },
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    json(statusCode, payload) {
      const body = JSON.stringify(payload ?? {});
      writeHead(statusCode, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      });
      res.end(body);
    },
    empty(statusCode = 204) {
      writeHead(statusCode);
      res.end();
    },
  };
}

function logRequest(req, res, startedAt) {
  const durationMs = Date.now() - startedAt;
  console.log(
    `[HTTP] ${req.method} ${req.url} -> ${res.statusCode} ${durationMs}ms`
  );
}

const server = http.createServer(async (req, res) => {
  const startedAt = Date.now();

  res.on("finish", () => logRequest(req, res, startedAt));

  if (!req.url || !req.method) {
    res.statusCode = 400;
    res.end();
    return;
  }

  if (enforceHttpsInProduction && process.env.NODE_ENV === "production" && !isSecureRequest(req)) {
    createResponse(res, req.headers.origin).json(400, {
      statusCode: 400,
      message: "HTTPS is required",
    });
    return;
  }

  if (req.method === "OPTIONS") {
    createResponse(res, req.headers.origin).empty(204);
    return;
  }

  const url = new URL(req.url, `http://localhost:${port}`);
  const pathname = normalizePath(url.pathname);
  const method = req.method.toUpperCase();

  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchRoute(route.path, pathname);
    if (!params) continue;

    const limiter = getRateLimiter(route);
    if (limiter) {
      const key = `${route.rateLimit.keyPrefix}:${getClientIp(req)}`;
      const rateState = limiter.consume(key);
      if (!rateState.allowed) {
        const response = createResponse(res, req.headers.origin);
        response.setHeader("Retry-After", String(rateState.retryAfter));
        response.setHeader("X-RateLimit-Remaining", String(rateState.remaining));
        response.json(429, { statusCode: 429, message: "Too many requests" });
        return;
      }
    }

    const body = await parseJsonBody(req);
    const cookies = parseCookies(req.headers.cookie);
    const context = {
      params,
      query: url.searchParams,
      headers: req.headers,
      body,
      cookies,
      ip: getClientIp(req),
    };

    const response = createResponse(res, req.headers.origin);

    try {
      await route.handler(context, response);
    } catch (error) {
      console.error(error);
      response.json(500, { statusCode: 500, message: "Internal server error" });
    }
    return;
  }

  createResponse(res, req.headers.origin).json(404, { statusCode: 404, message: "Not found" });
});

async function start() {
  const dbType = (process.env.DB_TYPE || "mongodb").toLowerCase();
  let repositories;
  if (dbType === "mariadb") {
    repositories = await buildMariaRepositories();
  } else {
    repositories = await buildMongoRepositories();
  }
  const hashService = buildHashService();
  const tokenService = buildTokenService();
  const { refreshTokenStore } = await buildRedisStore();
  const refreshTokenService = buildRefreshTokenService(
    refreshTokenStore,
    tokenService,
    console
  );

  const productUseCases = buildProductUseCases(repositories);
  const userUseCases = buildUserUseCases(repositories, hashService);
  const authUseCases = buildAuthUseCases(
    repositories,
    hashService,
    tokenService,
    refreshTokenService
  );
  const cartUseCases = buildCartUseCases(repositories);

  routes = [
    ...buildProductsRoutes(productUseCases),
    ...buildUsersRoutes(userUseCases),
    ...buildAuthRoutes(authUseCases),
    ...buildCartRoutes(cartUseCases, tokenService),
    {
      method: "GET",
      path: "/api/health",
      handler: (_ctx, res) => res.json(200, { status: "ok" }),
    },
  ];

  server.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
