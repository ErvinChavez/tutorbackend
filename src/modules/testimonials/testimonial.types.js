import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
} from 'graphql';

import { DateTimeScalar } from '../requests/request.types.js';

/**
 * Public-facing representation of a testimonial / review.
 */
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

/**
 * Returned by submitTestimonial. Bundles the stored testimonial with the
 * routing decision so the frontend knows how to respond:
 *
 *  - invitePublicReview = true  -> show a "share this publicly" prompt and,
 *                                  if configured, the publicReviewUrl link.
 *  - invitePublicReview = false -> show the follow-up message; the business
 *                                  has been alerted by email to reach out.
 *
 * In BOTH cases the testimonial is stored and starts unapproved — this object
 * never publishes anything; it only guides the thank-you screen.
 */
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