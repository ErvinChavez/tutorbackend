import { GraphQLList, GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import mongoose from 'mongoose';

import Request from './request.model.js';
import { TutoringRequestType } from './request.types.js';
import { requireAdmin } from '../../middleware/authMiddleware.js';


export const requestQueries = {
  // Teacher dashboard: list every request, newest first.
  requests: {
    type: new GraphQLList(new GraphQLNonNull(TutoringRequestType)),
    description: 'Fetch all tutoring requests (teacher dashboard, admin only).',
    resolve: async (_parent, _args, context) => {
      await requireAdmin(context);
      return Request.find().sort({ createdAt: -1 });
    },
  },

  // Fetch a single request by its ID.
  request: {
    type: TutoringRequestType,
    description: 'Fetch a single tutoring request by its ID (admin only).',
    args: {
      id: { type: new GraphQLNonNull(GraphQLID) },
    },
    resolve: async (_parent, { id }, context) => {
      await requireAdmin(context);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new GraphQLError('Invalid request ID format', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const request = await Request.findById(id);

      if (!request) {
        throw new GraphQLError('Tutoring request not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return request;
    },
  },
};