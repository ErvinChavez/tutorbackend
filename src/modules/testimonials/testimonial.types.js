import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
} from 'graphql';

import { DateTimeScalar } from '../requests/request.types.js';

export const TestimonialType = new GraphQLObjectType({
  name: 'Testimonial',
  description: 'A parent review/testimonial.',
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLID) },
    parentAuthor: { type: new GraphQLNonNull(GraphQLString) },
    message: { type: new GraphQLNonNull(GraphQLString) },
    rating: { type: new GraphQLNonNull(GraphQLInt) },
    isApproved: { type: new GraphQLNonNull(GraphQLBoolean) },
    studentId: { type: GraphQLID },
    createdAt: { type: new GraphQLNonNull(DateTimeScalar) },
    updatedAt: { type: new GraphQLNonNull(DateTimeScalar) },
  }),
});

export const SubmitTestimonialResponseType = new GraphQLObjectType({
  name: 'SubmitTestimonialResponse',
  description: 'Result of submitting a testimonial, with a routing hint.',
  fields: () => ({
    testimonial: { type: new GraphQLNonNull(TestimonialType) },
    invitePublicReview: {
      type: new GraphQLNonNull(GraphQLBoolean),
      description:
        'Whether to encourage the submitter to also post a public review.',
    },
    publicReviewUrl: {
      type: GraphQLString,
      description:
        'Where to send happy reviewers (from env), or null if not inviting.',
    },
    followUpMessage: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'A friendly message for the thank-you screen.',
    },
  }),
});