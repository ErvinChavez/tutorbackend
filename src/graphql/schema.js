import { GraphQLSchema, GraphQLObjectType } from 'graphql';

// Requests module
import { requestQueries } from '../modules/requests/request.queries.js';
import { requestMutations } from '../modules/requests/request.mutations.js';

/**
 * Root Query type.
 * Each feature module exports a plain object of field configs which we
 * spread in here. To add a new module later (students, sessions, etc.),
 * import its queries and spread them alongside the existing ones.
 */
const RootQuery = new GraphQLObjectType({
  name: 'Query',
  description: 'Root query type.',
  fields: () => ({
    ...requestQueries,
    // ...studentQueries,
    // ...sessionQueries,
    // ...testimonialQueries,
  }),
});

/**
 * Root Mutation type.
 * Same pattern as RootQuery — spread each module's mutation field configs.
 */
const RootMutation = new GraphQLObjectType({
  name: 'Mutation',
  description: 'Root mutation type.',
  fields: () => ({
    ...requestMutations,
    // ...authMutations,
    // ...studentMutations,
    // ...sessionMutations,
    // ...testimonialMutations,
  }),
});

/**
 * The unified executable schema. Pass this to Apollo Server in server.js:
 *   const server = new ApolloServer({ schema });
 */
const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: RootMutation,
});

export default schema;