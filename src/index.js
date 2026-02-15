const http = require("http");
const dotenv = require("dotenv");

const { buildProductsRoutes } = require("./adapters/http/routes/products");
const { buildUsersRoutes } = require("./adapters/http/routes/users");
const { buildAuthRoutes } = require("./adapters/http/routes/auth");
const { buildCartRoutes } = require("./adapters/http/routes/cart");
const {
  buildRepositories: buildMongoRepositories,
} = require("./infrastructure/store/mongoStore");
const {
  buildRepositories: buildMariaRepositories,
} = require("./infrastructure/store/mariaStore");
const {
  buildRepositories: buildNeoRepositories,
} = require("./infrastructure/store/neoStore");
const {
  buildProductUseCases,
} = require("./application/use-cases/products");
const { buildUserUseCases } = require("./application/use-cases/users");
const { buildAuthUseCases } = require("./application/use-cases/auth");
const { buildCartUseCases } = require("./application/use-cases/cart");
const { buildTokenService } = require("./application/services/tokenService");
const { buildHashService } = require("./application/services/hashService");

dotenv.config();

const port = process.env.PORT || 4000;

let routes = [];

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

function createResponse(res) {
  return {
    json(statusCode, payload) {
      const body = JSON.stringify(payload ?? {});
      res.writeHead(statusCode, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      });
      res.end(body);
    },
    empty(statusCode = 204) {
      res.writeHead(statusCode, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      });
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

  if (req.method === "OPTIONS") {
    createResponse(res).empty(204);
    return;
  }

  const url = new URL(req.url, `http://localhost:${port}`);
  const pathname = normalizePath(url.pathname);
  const method = req.method.toUpperCase();

  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchRoute(route.path, pathname);
    if (!params) continue;

    const body = await parseJsonBody(req);
    const context = {
      params,
      query: url.searchParams,
      headers: req.headers,
      body,
    };

    const response = createResponse(res);

    try {
      await route.handler(context, response);
    } catch (error) {
      console.error(error);
      response.json(500, { error: "Internal server error" });
    }
    return;
  }

  createResponse(res).json(404, { error: "Not found" });
});

async function start() {
  const dbType = (process.env.DB_TYPE || "mongodb").toLowerCase();
  let repositories;
  if (dbType === "mariadb") {
    repositories = await buildMariaRepositories();
  } else if (dbType === "neo4j") {
    repositories = await buildNeoRepositories();
  } else {
    repositories = await buildMongoRepositories();
  }
  const hashService = buildHashService();
  const tokenService = buildTokenService();

  const productUseCases = buildProductUseCases(repositories);
  const userUseCases = buildUserUseCases(repositories, hashService);
  const authUseCases = buildAuthUseCases(
    repositories,
    hashService,
    tokenService
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
