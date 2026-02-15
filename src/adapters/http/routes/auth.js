function buildAuthRoutes(authUseCases) {
  return [
    {
      method: "POST",
      path: "/api/auth/signup",
      handler: async ({ body }, res) => {
        const { email, name, password } = body || {};
        if (!email || !name || !password) {
          return res.json(400, {
            statusCode: 400,
            message: "Missing required fields",
          });
        }

        const result = await authUseCases.signUp({ email, name, password });
        if (result.error) {
          return res.json(result.error.statusCode, {
            statusCode: result.error.statusCode,
            message: result.error.message,
          });
        }

        return res.json(201, result.data);
      },
    },
    {
      method: "POST",
      path: "/api/auth/signin",
      handler: async ({ body }, res) => {
        const { email, password } = body || {};
        if (!email || !password) {
          return res.json(400, {
            statusCode: 400,
            message: "Missing required fields",
          });
        }

        const result = await authUseCases.signIn({ email, password });
        if (result.error) {
          return res.json(result.error.statusCode, {
            statusCode: result.error.statusCode,
            message: result.error.message,
          });
        }

        return res.json(200, result.data);
      },
    },
  ];
}

module.exports = {
  buildAuthRoutes,
};
