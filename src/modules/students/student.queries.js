import { GraphQLList, GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import mongoose from 'mongoose';

import Student from './student.model.js';
import { StudentType } from './student.types.js';
import { requireAdmin } from '../../middleware/authMiddleware.js';

/**
 * Query field configs for the students module.
 * Spread into the RootQuery in `src/graphql/schema.js`.
 *
 * Both queries are admin-only — student profiles contain parent PII.
 */
export const studentQueries = {
  // All active student profiles, newest first.
  students: {
    type: new GraphQLList(new GraphQLNonNull(StudentType)),
    description: 'Fetch all active student profiles (teacher only).',
    resolve: async (_parent, _args, context) => {
      await requireAdmin(context);
      return Student.find({ isActive: true }).sort({ createdAt: -1 });
    },
  },

  // A single student's complete profile.
  student: {
    type: StudentType,
    description: "Fetch a single student's full profile by ID (teacher only).",
    args: {
      id: { type: new GraphQLNonNull(GraphQLID) },
    },
    resolve: async (_parent, { id }, context) => {
      await requireAdmin(context);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new GraphQLError('Invalid student ID format', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const student = await Student.findById(id);

      if (!student) {
        throw new GraphQLError('Student not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return student;
    },
  },
};