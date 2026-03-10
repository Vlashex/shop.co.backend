function isObjectIdLike(value) {
  return typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
}

function buildUsersRoutes(userUseCases, tokenService) {
  const adminUserIds = new Set(
    (process.env.ADMIN_USER_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );

  function getUserId(headers) {
    const authHeader = headers.authorization;
    if (!authHeader) return null;
    return tokenService.getUserIdFromToken(authHeader);
  }

  function isAdmin(userId) {
    return adminUserIds.has(userId);
  }

  return [
    {
      method: "GET",
      path: "/api/users",
      handler: async ({ headers }, res) => {
        const userId = getUserId(headers);
        if (!userId) {
          return res.json(401, { error: "Invalid or missing token" });
        }
        if (!isAdmin(userId)) {
          return res.json(403, { error: "Forbidden" });
        }

        const users = await userUseCases.listUsers();
        return res.json(200, users);
      },
    },
    {
      method: "GET",
      path: "/api/users/:id",
      handler: async ({ headers, params }, res) => {
        const userId = getUserId(headers);
        if (!userId) {
          return res.json(401, { error: "Invalid or missing token" });
        }

        const id = params.id;
        if (!isObjectIdLike(id)) {
          return res.json(400, { error: "Invalid user ID" });
        }
        if (userId !== id && !isAdmin(userId)) {
          return res.json(403, { error: "Forbidden" });
        }

        const user = await userUseCases.getUser(id);
        if (!user) {
          return res.json(404, { error: "User not found" });
        }

        return res.json(200, user);
      },
    },
    {
      method: "POST",
      path: "/api/users",
      handler: async ({ headers, body }, res) => {
        const userId = getUserId(headers);
        if (!userId) {
          return res.json(401, { error: "Invalid or missing token" });
        }
        if (!isAdmin(userId)) {
          return res.json(403, { error: "Forbidden" });
        }

        const { email, name, password } = body || {};
        if (!email || !name || !password) {
          return res.json(400, { error: "Missing required fields" });
        }

        const user = await userUseCases.createUser({ email, name, password });
        return res.json(201, user);
      },
    },
    {
      method: "PUT",
      path: "/api/users/:id",
      handler: async ({ headers, params, body }, res) => {
        const userId = getUserId(headers);
        if (!userId) {
          return res.json(401, { error: "Invalid or missing token" });
        }

        const id = params.id;
        if (!isObjectIdLike(id)) {
          return res.json(400, { error: "Invalid user ID" });
        }
        if (userId !== id && !isAdmin(userId)) {
          return res.json(403, { error: "Forbidden" });
        }

        const updated = await userUseCases.updateUser(id, body || {});
        if (!updated) {
          return res.json(404, { error: "User not found" });
        }

        return res.json(200, updated);
      },
    },
    {
      method: "DELETE",
      path: "/api/users/:id",
      handler: async ({ headers, params }, res) => {
        const userId = getUserId(headers);
        if (!userId) {
          return res.json(401, { error: "Invalid or missing token" });
        }

        const id = params.id;
        if (!isObjectIdLike(id)) {
          return res.json(400, { error: "Invalid user ID" });
        }
        if (userId !== id && !isAdmin(userId)) {
          return res.json(403, { error: "Forbidden" });
        }

        const deleted = await userUseCases.deleteUser(id);
        if (!deleted) {
          return res.json(404, { error: "User not found" });
        }

        return res.json(200, { success: true });
      },
    },
  ];
}

module.exports = {
  buildUsersRoutes,
};
