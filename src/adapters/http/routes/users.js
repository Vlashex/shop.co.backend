function isObjectIdLike(value) {
  return typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
}

function buildUsersRoutes(userUseCases) {
  return [
    {
      method: "GET",
      path: "/api/users",
      handler: async (_ctx, res) => {
        const users = await userUseCases.listUsers();
        return res.json(200, users);
      },
    },
    {
      method: "GET",
      path: "/api/users/:id",
      handler: async ({ params }, res) => {
        const id = params.id;
        if (!isObjectIdLike(id)) {
          return res.json(400, { error: "Invalid user ID" });
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
      handler: async ({ body }, res) => {
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
      handler: async ({ params, body }, res) => {
        const id = params.id;
        if (!isObjectIdLike(id)) {
          return res.json(400, { error: "Invalid user ID" });
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
      handler: async ({ params }, res) => {
        const id = params.id;
        if (!isObjectIdLike(id)) {
          return res.json(400, { error: "Invalid user ID" });
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