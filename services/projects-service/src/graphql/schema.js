import { gql } from "graphql-tag";

export const typeDefs = gql`
  type Project {
    id: Int!
    title: String!
    description: String
    repoUrl: String
    demoUrl: String
    coverImageUrl: String
    createdAt: String!
    updatedAt: String!
    creatorUserId: String
    visibility: String!

    # 1 ficheiro por projeto (uuid na BD)
    fileId: ID

    ucIds: [ID!]!
    tags: [String!]!
  }

  input ProjectFiltersInput {
    search: String
    courseId: ID
    year: Int
    ucId: ID
    tag: String
  }

  input PaginationInput {
    limit: Int = 20
    offset: Int = 0
  }

  type ProjectsPage {
    total: Int!
    items: [Project!]!
  }

  input CreateProjectInput {
    title: String!
    description: String
    repoUrl: String
    demoUrl: String
    coverImageUrl: String
    ucIds: [ID!] = []
    tags: [String!] = []

    # obrigatório: 1 ficheiro por projeto (uuid)
    fileId: ID!
  }

  input UpdateProjectInput {
    title: String
    description: String
    repoUrl: String
    demoUrl: String
    coverImageUrl: String
    ucIds: [ID!]
    tags: [String!]

    # opcional: permitir trocar/associar ficheiro no futuro
    fileId: ID
  }

  type Query {
    health: String!
    project(id: Int!): Project
    projects(filters: ProjectFiltersInput, page: PaginationInput): ProjectsPage!
  }

  type Mutation {
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: Int!, input: UpdateProjectInput!): Project!
    deleteProject(id: Int!): Boolean!
  }
`;
