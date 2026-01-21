import { gql } from "graphql-tag";

export const typeDefs = gql`
  type Project {
    id: ID!
    title: String!
    description: String
    repoUrl: String
    demoUrl: String
    coverImageUrl: String
    createdAt: String!
    updatedAt: String!
    creatorUserId: String
    visibility: String!

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
  }

  input UpdateProjectInput {
    title: String
    description: String
    repoUrl: String
    demoUrl: String
    coverImageUrl: String
    ucIds: [ID!]
    tags: [String!]
  }

  type Query {
    health: String!
    project(id: ID!): Project
    projects(filters: ProjectFiltersInput, page: PaginationInput): ProjectsPage!
  }

  type Mutation {
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Boolean!
  }
`;
