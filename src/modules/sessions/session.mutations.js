import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLInputObjectType,
  GraphQLError,
} from 'graphql';
import mongoose from 'mongoose';

import Session from './session.model.js';
import Student from '../students/student.model.js';
import { SessionType, PaymentStatusEnum } from './session.types.js';
import { DateTimeScalar } from '../requests/request.types.js';
import { requireAdmin } from '../../middleware/authMiddleware.js';

/**
 * Input type for scheduling a session. `date` and `paymentStatus` are
 * optional — the Session model defaults them (date -> now, status -> UNPAID).
 */
const CreateSessionInput = new GraphQLInputObjectType({
  name: 'CreateSessionInput',
  fields: {
    studentId: { type: new GraphQLNonNull(GraphQLID) },
    date: { type: DateTimeScalar },
    durationMinutes: { type: GraphQLInt },
    subject: { type: GraphQLString },
    notes: { type: GraphQLString },
    paymentStatus: { type: PaymentStatusEnum },
  },
});

/**
 * Mutation field configs for the sessions module.
 * Spread into the RootMutation in `src/graphql/schema.js`. Admin-only.
 */
export const sessionMutations = {
  // Schedule a new session for an existing student.
  createSession: {
    type: new GraphQLNonNull(SessionType),
    description: 'Schedule a new tutoring session for a student (teacher only).',
    args: {
      input: { type: new GraphQLNonNull(CreateSessionInput) },
    },
    resolve: async (_parent, { input }, context) => {
      await requireAdmin(context);

      if (!mongoose.Types.ObjectId.isValid(input.studentId)) {
        throw new GraphQLError('Invalid student ID format', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // The session must belong to a real student.
      const student = await Student.findById(input.studentId);
      if (!student) {
        throw new GraphQLError('Cannot schedule a session: student not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      try {
        const session = await Session.create(input);
        return session;
      } catch (error) {
        if (error.name === 'ValidationError') {
          throw new GraphQLError(error.message, {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        throw new GraphQLError('Failed to create session', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },

  // Update a session's payment status (PAID / UNPAID / OVERDUE).
  updateSessionPayment: {
    type: new GraphQLNonNull(SessionType),
    description: "Update a session's payment status (teacher only).",
    args: {
      id: { type: new GraphQLNonNull(GraphQLID) },
      paymentStatus: { type: new GraphQLNonNull(PaymentStatusEnum) },
    },
    resolve: async (_parent, { id, paymentStatus }, context) => {
      await requireAdmin(context);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new GraphQLError('Invalid session ID format', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const session = await Session.findByIdAndUpdate(
        id,
        { paymentStatus },
        { new: true, runValidators: true }
      );

      if (!session) {
        throw new GraphQLError('Session not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return session;
    },
  },
};