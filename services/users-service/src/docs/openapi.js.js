const swaggerJSDoc = require("swagger-jsdoc");

const PORT = process.env.PORT || 3001;

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Users Service API",
      version: "1.0.0",
      description: "Endpoints de autenticação e utilizadores (JWT).",
    },
    servers: [
      { url: `http://localhost:${PORT}`, description: "Local" },
      { url: "http://users-service:3001", description: "Docker/Swarm" },
    ],
    tags: [{ name: "Health" }, { name: "Auth" }, { name: "Users" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: ["./src/routes/**/*.js"],
});

module.exports = { swaggerSpec };
