import {
  GraphQLObjectType,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
} from 'graphql';

import Student from '../students/student.model.js';
import { StudentType } from '../students/student.types.js';
import { DateTimeScalar } from '../requests/request.types.js';


export const PaymentStatusEnum = new GraphQLEnumType({
  name: 'PaymentStatus',
  description: 'Payment state of a tutoring session.',
  values: {
    PAID: { value: 'PAID' },
    UNPAID: { value: 'UNPAID' },
    OVERDUE: { value: 'OVERDUE' },
  },
});

export const SessionType = new GraphQLObjectType({
  name: 'Session',
  description: 'An individual tutoring session.',
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLID) },

    // The raw stored reference id.
    studentId: { type: new GraphQLNonNull(GraphQLID) },

    // Derived field: hydrate the full student profile for this session.
    student: {
      type: StudentType,
      description: 'The full student profile this session belongs to.',
      resolve: async (session) => {
        return Student.findById(session.studentId);
      },
    },

    date: { type: new GraphQLNonNull(DateTimeScalar) },
    durationMinutes: { type: GraphQLInt },
    subject: { type: GraphQLString },
    notes: { type: GraphQLString },
    paymentStatus: { type: new GraphQLNonNull(PaymentStatusEnum) },

    createdAt: { type: new GraphQLNonNull(DateTimeScalar) },
    updatedAt: { type: new GraphQLNonNull(DateTimeScalar) },
  }),
});