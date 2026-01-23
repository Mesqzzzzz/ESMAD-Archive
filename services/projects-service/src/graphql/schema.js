import { gql } from "graphql-tag";

export const typeDefs = gql`
  type UserRef {
    id: ID!
    name: String
    email: String
  }

  type Course {
    id: ID!
    type: String!
    name: String!
  }

  type UC {
    id: ID!
    courseId: ID!
    name: String!
  }

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
    createdBy: UserRef

    visibility: String!
    fileId: ID

    # ✅ 1 projeto = 1 UC
    ucId: ID

    tags: [String!]!
  }

  input ProjectFiltersInput {
    search: String
    courseId: ID
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
    tags: [String!] = []
    fileId: ID!

    # ✅ obrigatório (porque 1 projeto = 1 UC)
    ucId: ID!
  }

  input UpdateProjectInput {
    title: String
    description: String
    repoUrl: String
    demoUrl: String
    coverImageUrl: String
    tags: [String!]
    fileId: ID

    # ✅ permitir trocar UC
    ucId: ID
  }

  type Query {
    health: String!
    project(id: Int!): Project
    projects(filters: ProjectFiltersInput, page: PaginationInput): ProjectsPage!

    courses: [Course!]!
    ucs(courseId: ID, search: String): [UC!]!
  }

  type Mutation {
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: Int!, input: UpdateProjectInput!): Project!
    deleteProject(id: Int!): Boolean!
  }
`;
