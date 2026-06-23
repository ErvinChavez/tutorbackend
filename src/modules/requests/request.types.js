import {
  GraphQLObjectType,
  GraphQLEnumType,
  GraphQLScalarType,
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  Kind,
} from 'graphql';


export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'An ISO-8601 encoded UTC date-time string.',
  serialize(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new TypeError(`DateTime cannot serialize an invalid date: ${value}`);
    }
    return date.toISOString();
  },
  parseValue(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new TypeError(`DateTime cannot parse an invalid date: ${value}`);
    }
    return date;
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new TypeError(`DateTime must be a string, but got: ${ast.kind}`);
    }
    const date = new Date(ast.value);
    if (Number.isNaN(date.getTime())) {
      throw new TypeError(`DateTime cannot parse an invalid date: ${ast.value}`);
    }
    return date;
  },
});


export const RequestStatusEnum = new GraphQLEnumType({
  name: 'RequestStatus',
  description: 'Lifecycle status of a tutoring request.',
  values: {
    PENDING: { value: 'PENDING' },
    ACCEPTED: { value: 'ACCEPTED' },
    DECLINED: { value: 'DECLINED' },
  },
});

export const TutoringRequestType = new GraphQLObjectType({
  name: 'TutoringRequest',
  description: 'A tutoring request submitted by a parent.',
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLID) },
    parentName: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    phone: { type: new GraphQLNonNull(GraphQLString) },
    studentName: { type: new GraphQLNonNull(GraphQLString) },
    subject: { type: new GraphQLNonNull(GraphQLString) },
    gradeLevel: { type: GraphQLString },
    message: { type: GraphQLString },
    status: { type: new GraphQLNonNull(RequestStatusEnum) },
    createdAt: { type: new GraphQLNonNull(DateTimeScalar) },
    updatedAt: { type: new GraphQLNonNull(DateTimeScalar) },
  }),
});