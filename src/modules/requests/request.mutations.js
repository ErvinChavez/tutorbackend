import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLInputObjectType,
  GraphQLError,
} from 'graphql';
import mongoose from 'mongoose';

import Request from './request.model.js';
import { TutoringRequestType, RequestStatusEnum } from './request.types.js';
import { sendParentConfirmationEmail } from '../../services/emailService.js';
import { requireAdmin } from '../../middleware/authMiddleware.js';

/**
 * Input type for the public submission mutation. Keeping the args bundled
 * in a single input object keeps the mutation signature clean and makes
 * client-side variable handling simpler.
 */
const SubmitTutoringRequestInput = new GraphQLInputObjectType({
  name: 'SubmitTutoringRequestInput',
  fields: {
    parentName: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    phone: { type: new GraphQLNonNull(GraphQLString) },
    studentName: { type: new GraphQLNonNull(GraphQLString) },
    subject: { type: new GraphQLNonNull(GraphQLString) },
    gradeLevel: { type: GraphQLString },
    message: { type: GraphQLString },
  },
});

export const requestMutations = {
  // Public: a parent submits a new tutoring request. NO auth — parents are
  // anonymous visitors.
  submitTutoringRequest: {
    type: TutoringRequestType,
    description:
      'Public mutation used by parents to submit a new tutoring request.',
    args: {
      input: { type: new GraphQLNonNull(SubmitTutoringRequestInput) },
    },
    resolve: async (_parent, { input }) => {
      try {
        // `status` is intentionally omitted — the model defaults it to PENDING.
        const newRequest = await Request.create(input);

        sendParentConfirmationEmail({
          parentName: newRequest.parentName,
          parentEmail: newRequest.email,
          studentName: newRequest.studentName,
          gradeLevel: newRequest.gradeLevel,
          // The request stores a single subject; pass it as the tutoring
          // options list. Expand this if you later capture multiple subjects.
          tutoringOptions: newRequest.subject ? [newRequest.subject] : [],
        }).catch((err) => {
          console.error(
            `Confirmation email dispatch failed for request ${newRequest._id}: ${err.message}`
          );
        });

        return newRequest;
      } catch (error) {
        // Surface Mongoose validation failures as clean user-input errors.
        if (error.name === 'ValidationError') {
          throw new GraphQLError(error.message, {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        throw new GraphQLError('Failed to submit tutoring request', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },

  updateRequestStatus: {
    type: TutoringRequestType,
    description:
      'Teacher-only mutation to update a request status to ACCEPTED or DECLINED.',
    args: {
      id: { type: new GraphQLNonNull(GraphQLID) },
      status: { type: new GraphQLNonNull(RequestStatusEnum) },
    },
    resolve: async (_parent, { id, status }, context) => {
      await requireAdmin(context);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new GraphQLError('Invalid request ID format', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (!['ACCEPTED', 'DECLINED'].includes(status)) {
        throw new GraphQLError(
          'Status can only be updated to ACCEPTED or DECLINED',
          { extensions: { code: 'BAD_USER_INPUT' } }
        );
      }

      const updatedRequest = await Request.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      );

      if (!updatedRequest) {
        throw new GraphQLError('Tutoring request not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return updatedRequest;
    },
  },
};