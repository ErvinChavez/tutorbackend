import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLError,
} from 'graphql';
import mongoose from 'mongoose';

import Testimonial from './testimonial.model.js';
import {
  TestimonialType,
  SubmitTestimonialResponseType,
} from './testimonial.types.js';
import { requireAdmin } from '../../middleware/authMiddleware.js';
import { sendTestimonialAlertEmail } from '../../services/emailService.js';

// Ratings at or ABOVE this threshold get invited to share publicly. Anything
// below it is routed to the business inbox for a personal follow-up instead.
// Tune to taste; 4 means 4-5 stars are "happy", 1-3 are "needs attention".
const PUBLIC_REVIEW_RATING_THRESHOLD = 4;

const SubmitTestimonialInput = new GraphQLInputObjectType({
  name: 'SubmitTestimonialInput',
  fields: {
    parentAuthor: { type: new GraphQLNonNull(GraphQLString) },
    message: { type: new GraphQLNonNull(GraphQLString) },
    rating: { type: new GraphQLNonNull(GraphQLInt) },
    studentId: { type: GraphQLID },
  },
});

/**
 * Mutation field configs for the testimonials module.
 * Spread into the RootMutation in `src/graphql/schema.js`.
 */
export const testimonialMutations = {
  // PUBLIC: a parent submits feedback. The submission is ALWAYS stored in full
  // (including low ratings) and ALWAYS starts unapproved. The rating only
  // decides the thank-you experience, never whether the feedback is recorded.
  submitTestimonial: {
    type: new GraphQLNonNull(SubmitTestimonialResponseType),
    description:
      'Public: submit feedback. Always stored and never auto-published.',
    args: {
      input: { type: new GraphQLNonNull(SubmitTestimonialInput) },
    },
    resolve: async (_parent, { input }) => {
      let testimonial;
      try {
        testimonial = await Testimonial.create({
          parentAuthor: input.parentAuthor,
          message: input.message,
          rating: input.rating,
          studentId: input.studentId || null,
          // isApproved defaults to false on the model.
        });
      } catch (error) {
        if (error.name === 'ValidationError') {
          // e.g. rating outside 1–5, or non-integer rating.
          throw new GraphQLError(error.message, {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        throw new GraphQLError('Failed to submit testimonial', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }

      const invitePublicReview =
        testimonial.rating >= PUBLIC_REVIEW_RATING_THRESHOLD;

      if (!invitePublicReview) {
        // Service-recovery path: alert the business so a human can reach out.
        // Fire-and-forget — the feedback is already safely stored, and a mail
        // hiccup must not fail the submission. (Same pattern as the request
        // confirmation email.)
        sendTestimonialAlertEmail({
          parentAuthor: testimonial.parentAuthor,
          rating: testimonial.rating,
          message: testimonial.message,
        }).catch((err) => {
          console.error(
            `Testimonial alert email failed for ${testimonial._id}: ${err.message}`
          );
        });
      }

      return {
        testimonial,
        invitePublicReview,
        publicReviewUrl: invitePublicReview
          ? process.env.PUBLIC_REVIEW_URL || null
          : null,
        followUpMessage: invitePublicReview
          ? `Thank you so much, ${testimonial.parentAuthor}! If you have a moment, we would love for you to share this publicly.`
          : `Thank you for the honest feedback. It comes straight to us so we can make things right, and we will be in touch.`,
      };
    },
  },

  // ADMIN: approve or un-approve a testimonial for public display. This is the
  // only thing that controls whether a stored testimonial appears on the site.
  setTestimonialApproval: {
    type: new GraphQLNonNull(TestimonialType),
    description:
      'Admin: approve or unapprove a testimonial for public display.',
    args: {
      id: { type: new GraphQLNonNull(GraphQLID) },
      isApproved: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: async (_parent, { id, isApproved }, context) => {
      await requireAdmin(context);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new GraphQLError('Invalid testimonial ID format', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const testimonial = await Testimonial.findByIdAndUpdate(
        id,
        { isApproved },
        { new: true, runValidators: true }
      );

      if (!testimonial) {
        throw new GraphQLError('Testimonial not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return testimonial;
    },
  },
};