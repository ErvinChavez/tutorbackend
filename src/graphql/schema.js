import { GraphQLSchema, GraphQLObjectType } from 'graphql';

// Requests module
import { requestQueries } from '../modules/requests/request.queries.js';
import { requestMutations } from '../modules/requests/request.mutations.js';

// Auth module
import { authMutations } from '../modules/auth/auth.mutations.js';

// Students module
import { studentQueries } from '../modules/students/student.queries.js';
import { studentMutations } from '../modules/students/student.mutations.js';

// Sessions module
import { sessionQueries } from '../modules/sessions/session.queries.js';
import { sessionMutations } from '../modules/sessions/session.mutations.js';

// Testimonials module
import { testimonialQueries } from '../modules/testimonials/testimonial.queries.js';
import { testimonialMutations } from '../modules/testimonials/testimonial.mutations.js';

/**
 * Root Query type. Each feature module exports a flat object of field
 * configs which we spread in here.
 */
const RootQuery = new GraphQLObjectType({
  name: 'Query',
  description: 'Root query type.',
  fields: () => ({
    ...requestQueries,
    ...studentQueries,
    ...sessionQueries,
    ...testimonialQueries,
  }),
});

/**
 * Root Mutation type. Same spread pattern as RootQuery.
 */
const RootMutation = new GraphQLObjectType({
  name: 'Mutation',
  description: 'Root mutation type.',
  fields: () => ({
    ...requestMutations,
    ...authMutations,
    ...studentMutations,
    ...sessionMutations,
    ...testimonialMutations,
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