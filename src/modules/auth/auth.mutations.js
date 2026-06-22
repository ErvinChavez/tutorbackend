import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLError,
} from 'graphql';

import Admin from './Admin.model.js';
import generateToken from '../../utils/generateToken.js';
// Reuse the DateTime scalar defined in the requests module. As the schema
// grows you may want to lift this into a shared `src/graphql/scalars.js`
// so auth doesn't depend on the requests module just for a scalar.
import { DateTimeScalar } from '../requests/request.types.js';

/**
 * Public-facing representation of an Admin. Note there is deliberately NO
 * `password` field here, so the hash can never be exposed through GraphQL.
 */
export const AdminType = new GraphQLObjectType({
  name: 'Admin',
  description: 'A teacher/admin account.',
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    role: { type: new GraphQLNonNull(GraphQLString) },
    createdAt: { type: new GraphQLNonNull(DateTimeScalar) },
    updatedAt: { type: new GraphQLNonNull(DateTimeScalar) },
  }),
});

/**
 * Returned by register/login: the signed JWT plus the admin it belongs to.
 */
export const AuthPayloadType = new GraphQLObjectType({
  name: 'AuthPayload',
  description: 'Authentication result containing a JWT and the admin.',
  fields: () => ({
    token: { type: new GraphQLNonNull(GraphQLString) },
    admin: { type: new GraphQLNonNull(AdminType) },
  }),
});

/**
 * Mutation field configs for the auth module.
 * Spread into the RootMutation in `src/graphql/schema.js`.
 */
export const authMutations = {
  // Create the teacher/admin account. The Admin model's pre-save hook hashes
  // the password automatically.
  //
  // ⚠️ SECURITY: this mutation is currently OPEN. Anyone who can reach your
  // API could create an admin. Before going live, lock it down — e.g. allow
  // registration only when zero admins exist (bootstrap), or require a
  // one-time setup secret from process.env. See the chat notes.
  adminRegister: {
    type: new GraphQLNonNull(AuthPayloadType),
    description: 'Register a new teacher/admin account and return a token.',
    args: {
      name: { type: new GraphQLNonNull(GraphQLString) },
      email: { type: new GraphQLNonNull(GraphQLString) },
      password: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: async (_parent, { name, email, password }) => {
      const normalizedEmail = email.toLowerCase().trim();

      const existing = await Admin.findOne({ email: normalizedEmail });
      if (existing) {
        throw new GraphQLError('An admin with this email already exists', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      try {
        const admin = await Admin.create({
          name,
          email: normalizedEmail,
          password,
        });

        const token = generateToken(admin._id);
        return { token, admin };
      } catch (error) {
        console.error('adminRegister failed:', error);
        // Schema-level validation failures (e.g. password too short).
        if (error.name === 'ValidationError') {
          throw new GraphQLError(error.message, {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        // Race-condition safety net for the unique email index.
        if (error.code === 11000) {
          throw new GraphQLError('An admin with this email already exists', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        throw new GraphQLError('Failed to register admin', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },

  // Authenticate an existing admin and return a token + admin.
  adminLogin: {
    type: new GraphQLNonNull(AuthPayloadType),
    description: 'Log in as an admin and return a token.',
    args: {
      email: { type: new GraphQLNonNull(GraphQLString) },
      password: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: async (_parent, { email, password }) => {
      // `password` is `select: false` on the model, so we must explicitly
      // re-include it to run the comparison.
      const admin = await Admin.findOne({
        email: email.toLowerCase().trim(),
      }).select('+password');

      // Single generic error for both "no such email" and "wrong password"
      // so the API can't be used to enumerate which emails are registered.
      if (!admin || !(await admin.matchPassword(password))) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const token = generateToken(admin._id);

      // Drop the hash from the in-memory doc before returning. (The AdminType
      // doesn't expose it anyway, but this is belt-and-suspenders.)
      admin.password = undefined;

      return { token, admin };
    },
  },
};