import swaggerJSDoc from "swagger-jsdoc";

const PORT = Number(process.env.PORT || 3002);

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Projects Service API (GraphQL)",
      version: "1.0.0",
      description: "Endpoint GraphQL para projetos, cursos, UCs, etc.",
    },
    servers: [
      { url: `http://localhost:${PORT}`, description: "Local" },
      { url: "http://projects-service:3002", description: "Docker/Swarm" },
    ],
    tags: [{ name: "Health" }, { name: "GraphQL" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        GraphQLRequest: {
          type: "object",
          required: ["query"],
          properties: {
            query: { type: "string" },
            variables: { type: "object", additionalProperties: true },
            operationName: { type: "string" },
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
      "/graphql": {
        post: {
          tags: ["GraphQL"],
          summary: "GraphQL endpoint",
          description:
            "Envia GraphQL queries/mutations via JSON. Usa Authorization: Bearer <JWT> quando necessário.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GraphQLRequest" },
                examples: {
                  listPublicProjects: {
                    value: {
                      query: "query { projects { total items { id title } } }",
                    },
                  },
                  createProject: {
                    value: {
                      query:
                        "mutation($input: CreateProjectInput!) { createProject(input: $input) { id title ucId fileId } }",
                      variables: {
                        input: {
                          title: "Meu Projeto",
                          fileId: "123",
                          ucId: "1",
                          tags: ["web"],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "GraphQL response" } },
        },
      },
      "/graphql/schema": {
        get: {
          tags: ["GraphQL"],
          summary: "GraphQL schema (SDL)",
          responses: { 200: { description: "Schema em text/plain" } },
        },
      },
    },
  },
  apis: [],
});
