import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLError,
} from 'graphql';

import Admin from './Admin.model.js';
import generateToken from '../../utils/generateToken.js';

import { DateTimeScalar } from '../requests/request.types.js';


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

export const AuthPayloadType = new GraphQLObjectType({
  name: 'AuthPayload',
  description: 'Authentication result containing a JWT and the admin.',
  fields: () => ({
    token: { type: new GraphQLNonNull(GraphQLString) },
    admin: { type: new GraphQLNonNull(AdminType) },
  }),
});

export const authMutations = {

  adminRegister: {
    type: new GraphQLNonNull(AuthPayloadType),
    description: 'Register the first teacher/admin account (sealed afterward).',
    args: {
      name: { type: new GraphQLNonNull(GraphQLString) },
      email: { type: new GraphQLNonNull(GraphQLString) },
      password: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: async (_parent, { name, email, password }) => {
      // Seal registration once any admin exists.
      const adminCount = await Admin.countDocuments();
      if (adminCount > 0) {
        throw new GraphQLError('Registration is closed.', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

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
        // Schema-level validation failures
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

        console.error('[adminRegister] Unexpected error:', error);
        throw new GraphQLError('Failed to register admin', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },

  
  adminLogin: {
    type: new GraphQLNonNull(AuthPayloadType),
    description: 'Log in as an admin and return a token.',
    args: {
      email: { type: new GraphQLNonNull(GraphQLString) },
      password: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: async (_parent, { email, password }) => {
      try {

        const admin = await Admin.findOne({
          email: email.toLowerCase().trim(),
        }).select('+password');

        if (!admin || !(await admin.matchPassword(password))) {
          throw new GraphQLError('Invalid email or password', {
            extensions: { code: 'UNAUTHENTICATED' },
          });
        }

        const token = generateToken(admin._id);

        admin.password = undefined;

        return { token, admin };
      } catch (error) {
        // Re-throw our own intentional auth error untouched.
        if (error instanceof GraphQLError) {
          throw error;
        }
        // Log unexpected failures (e.g. token signing) for visibility.
        console.error('[adminLogin] Unexpected error:', error);
        throw new GraphQLError('Failed to log in', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },
};