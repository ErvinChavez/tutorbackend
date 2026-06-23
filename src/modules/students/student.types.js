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

    originalRequestId: { type: GraphQLID },

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