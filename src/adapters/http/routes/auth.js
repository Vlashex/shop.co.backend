function buildAuthRoutes(authUseCases) {
  const refreshCookieName = process.env.REFRESH_COOKIE_NAME || "refresh_token";
  const refreshCookieMaxAgeMs = 7 * 24 * 60 * 60 * 1000;

  function getClientIp(headers) {
    const forwarded = headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return forwarded.split(",")[0].trim();
    }
    return null;
  }

  function setRefreshCookie(res, refreshToken) {
    // CSRF mitigation: SameSite=Strict blocks cross-site cookie sends; endpoint should also
    // require JSON Content-Type and reject state-changing actions from non-API origins.
    res.setCookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      path: "/api/auth",
      maxAge: refreshCookieMaxAgeMs,
    });
  }

  function clearRefreshCookie(res) {
    res.clearCookie(refreshCookieName, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      path: "/api/auth",
    });
  }

  return [
    {
      method: "POST",
      path: "/api/auth/signup",
      rateLimit: { windowMs: 60_000, maxRequests: 10, keyPrefix: "auth-signup" },
      handler: async ({ body, headers }, res) => {
        const { email, name, password } = body || {};
        if (!email || !name || !password) {
          return res.json(400, {
            statusCode: 400,
            message: "Missing required fields",
          });
        }

        const result = await authUseCases.signUp(
          { email, name, password },
          {
            ip: getClientIp(headers),
            userAgent: headers["user-agent"] || null,
          }
        );
        if (result.error) {
          return res.json(result.error.statusCode, {
            statusCode: result.error.statusCode,
            message: result.error.message,
          });
        }

        setRefreshCookie(res, result.data.tokens.refresh_token);
        return res.json(201, {
          user: result.data.user,
          tokens: result.data.tokens,
        });
      },
    },
    {
      method: "POST",
      path: "/api/auth/signin",
      rateLimit: { windowMs: 60_000, maxRequests: 10, keyPrefix: "auth-signin" },
      handler: async ({ body, headers }, res) => {
        const { email, password } = body || {};
        if (!email || !password) {
          return res.json(400, {
            statusCode: 400,
            message: "Missing required fields",
          });
        }

        const result = await authUseCases.signIn(
          { email, password },
          {
            ip: getClientIp(headers),
            userAgent: headers["user-agent"] || null,
          }
        );
        if (result.error) {
          return res.json(result.error.statusCode, {
            statusCode: result.error.statusCode,
            message: result.error.message,
          });
        }

        setRefreshCookie(res, result.data.tokens.refresh_token);
        return res.json(200, {
          user: result.data.user,
          tokens: result.data.tokens,
        });
      },
    },
    {
      method: "POST",
      path: "/api/auth/refresh",
      rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: "auth-refresh" },
      handler: async ({ cookies, headers }, res) => {
        const refreshToken = cookies[refreshCookieName];
        if (!refreshToken) {
          return res.json(401, { statusCode: 401, message: "Invalid refresh token" });
        }

        const result = await authUseCases.refreshSession(refreshToken, {
          ip: getClientIp(headers),
          userAgent: headers["user-agent"] || null,
        });

        if (result.error) {
          clearRefreshCookie(res);
          return res.json(result.error.statusCode, {
            statusCode: result.error.statusCode,
            message: result.error.message,
          });
        }

        setRefreshCookie(res, result.data.refresh_token);
        return res.json(200, { access_token: result.data.access_token });
      },
    },
    {
      method: "POST",
      path: "/api/auth/logout",
      rateLimit: { windowMs: 60_000, maxRequests: 20, keyPrefix: "auth-logout" },
      handler: async ({ cookies }, res) => {
        const refreshToken = cookies[refreshCookieName];
        if (refreshToken) {
          await authUseCases.signOut(refreshToken);
        }
        clearRefreshCookie(res);
        return res.json(200, { success: true });
      },
    },
  ];
}

module.exports = {
  buildAuthRoutes,
};