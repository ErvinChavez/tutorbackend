import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
} from 'graphql';

import Request from '../requests/request.model.js';
import { TutoringRequestType, DateTimeScalar } from '../requests/request.types.js';

/**
 * The GraphQL representation of an active student profile.
 *
 * Field names map 1:1 to the Student Mongoose document, so the default
 * resolvers read straight off it. The one exception is `originalRequest`,
 * which is a derived field: it follows the stored `originalRequestId`
 * reference and loads the source request on demand.
 */
export const StudentType = new GraphQLObjectType({
  name: 'Student',
  description: 'An active student profile.',
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLID) },

    // Student details
    name: { type: new GraphQLNonNull(GraphQLString) },
    gradeLevel: { type: GraphQLString },
    subjects: { type: new GraphQLList(GraphQLString) },

    // Parent / guardian details
    parentName: { type: new GraphQLNonNull(GraphQLString) },
    parentEmail: { type: new GraphQLNonNull(GraphQLString) },
    parentPhone: { type: new GraphQLNonNull(GraphQLString) },

    isActive: { type: new GraphQLNonNull(GraphQLBoolean) },

    // Raw stored reference (handy for clients that just want the id).
    originalRequestId: { type: GraphQLID },

    // Derived field: resolve the linked request only if one exists. Returns
    // null for students that were created manually rather than converted.
    originalRequest: {
      type: TutoringRequestType,
      description:
        'The tutoring request this student was converted from, if any.',
      resolve: async (student) => {
        if (!student.originalRequestId) return null;
        return Request.findById(student.originalRequestId);
      },
    },

    createdAt: { type: new GraphQLNonNull(DateTimeScalar) },
    updatedAt: { type: new GraphQLNonNull(DateTimeScalar) },
  }),
});