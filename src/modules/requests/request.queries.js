import { GraphQLList, GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import mongoose from 'mongoose';

import Request from './request.model.js';
import { TutoringRequestType } from './request.types.js';


export const requestQueries = {
  // Teacher dashboard: list every request, newest first.
  requests: {
    type: new GraphQLList(new GraphQLNonNull(TutoringRequestType)),
    description: 'Fetch all tutoring requests (teacher dashboard).',
    resolve: async () => {
      return Request.find().sort({ createdAt: -1 });
    },
  },

  // Fetch a single request by its ID.
  request: {
    type: TutoringRequestType,
    description: 'Fetch a single tutoring request by its ID.',
    args: {
      id: { type: new GraphQLNonNull(GraphQLID) },
    },
    resolve: async (_parent, { id }) => {
      // Guard against malformed ObjectIds before hitting the database,
      // otherwise Mongoose throws a CastError.
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