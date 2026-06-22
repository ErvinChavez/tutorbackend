import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import mongoose from 'mongoose';

import Student from './student.model.js';
import Request from '../requests/request.model.js';
import { StudentType } from './student.types.js';
import { requireAdmin } from '../../middleware/authMiddleware.js';

/**
 * Mutation field configs for the students module.
 * Spread into the RootMutation in `src/graphql/schema.js`.
 */
export const studentMutations = {
  // Accept a tutoring request and spin up an active student profile from it.
  convertRequestToStudent: {
    type: new GraphQLNonNull(StudentType),
    description:
      'Accept a request and create a student profile from its details (teacher only).',
    args: {
      requestId: { type: new GraphQLNonNull(GraphQLID) },
    },
    resolve: async (_parent, { requestId }, context) => {
      await requireAdmin(context);

      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new GraphQLError('Invalid request ID format', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // 1. The request must exist.
      const request = await Request.findById(requestId);
      if (!request) {
        throw new GraphQLError('Tutoring request not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // 2. Don't convert the same request twice — that would create a
      //    duplicate student. The originalRequestId link makes this cheap
      //    to check.
      const existing = await Student.findOne({ originalRequestId: request._id });
      if (existing) {
        throw new GraphQLError(
          'This request has already been converted to a student',
          { extensions: { code: 'BAD_USER_INPUT' } }
        );
      }

      // 3. Build the student from the request's parent + student details.
      const student = await Student.create({
        name: request.studentName,
        gradeLevel: request.gradeLevel,
        subjects: request.subject ? [request.subject] : [],
        parentName: request.parentName,
        parentEmail: request.email,
        parentPhone: request.phone,
        originalRequestId: request._id,
      });

      // 4. Mark the originating request as accepted.
      //    NOTE: steps 3 and 4 are two separate writes. For a small app this
      //    is fine; if you ever need strict all-or-nothing behavior, wrap
      //    both in a Mongoose session/transaction (Atlas supports them).
      request.status = 'ACCEPTED';
      await request.save();

      return student;
    },
  },
};