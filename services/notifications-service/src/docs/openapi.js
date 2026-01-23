const swaggerJSDoc = require("swagger-jsdoc");

const PORT = Number(process.env.PORT || 3005);

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Notifications Service API",
      version: "1.0.0",
      description:
        "API REST para listar notificações e marcar como lidas. Consumidor RabbitMQ para criar notificações.",
    },
    servers: [
      { url: `http://localhost:${PORT}`, description: "Local" },
      { url: "http://notifications-service:3005", description: "Docker/Swarm" },
    ],
    tags: [{ name: "Health" }, { name: "Notifications" }, { name: "Events" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        gatewayUser: {
          type: "apiKey",
          in: "header",
          name: "x-user-id",
          description: "Header injetado pelo API Gateway (preferido).",
        },
      },
      schemas: {
        Notification: {
          type: "object",
          properties: {
            id: { type: "integer", example: 10 },
            userId: { type: "string", example: "7" },
            title: { type: "string", example: "Projeto aprovado" },
            body: { type: "string", example: "O teu projeto foi aprovado." },
            readAt: { type: "string", nullable: true, example: null },
            createdAt: { type: "string", example: "2026-01-23T12:00:00.000Z" },
          },
        },

        // Contratos RabbitMQ (documentação)
        NotificationRequestedEvent: {
          type: "object",
          description:
            "Evento consumido via RabbitMQ. Exemplo: exchange=notifications, routingKey=notification.requested (ajusta ao teu consumer).",
          required: ["userId", "title", "body"],
          properties: {
            userId: { type: "string", example: "7" },
            title: { type: "string", example: "Novo comentário" },
            body: { type: "string", example: "Alguém comentou o teu projeto." },
            meta: { type: "object", additionalProperties: true },
          },
        },
      },
    },
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Healthcheck",
          responses: { 200: { description: "OK" } },
        },
      },
      "/notifications": {
        get: {
          tags: ["Notifications"],
          summary: "Listar notificações",
          description:
            "Requer x-user-id (gateway) ou Authorization Bearer JWT (fallback).",
          security: [{ gatewayUser: [] }, { bearerAuth: [] }],
          parameters: [
            {
              name: "unread",
              in: "query",
              schema: { type: "boolean" },
              example: true,
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20, maximum: 100 },
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", default: 0 },
            },
          ],
          responses: {
            200: {
              description: "Lista",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Notification" },
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/notifications/{id}/read": {
        post: {
          tags: ["Notifications"],
          summary: "Marcar como lida",
          security: [{ gatewayUser: [] }, { bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            200: { description: "OK" },
            401: { description: "Unauthorized" },
            404: { description: "Not found" },
          },
        },
      },
    },
  },
  apis: [],
});

module.exports = { swaggerSpec };
