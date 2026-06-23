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


export const testimonialMutations = {
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