import { GraphQLList, GraphQLNonNull } from 'graphql';

import Testimonial from './testimonial.model.js';
import { TestimonialType } from './testimonial.types.js';
import { requireAdmin } from '../../middleware/authMiddleware.js';

/**
 * Query field configs for the testimonials module.
 * Spread into the RootQuery in `src/graphql/schema.js`.
 */
export const testimonialQueries = {
  // PUBLIC: only approved testimonials, for display on the marketing site.
  // No auth — but it can only ever return testimonials the admin approved.
  approvedTestimonials: {
    type: new GraphQLList(new GraphQLNonNull(TestimonialType)),
    description: 'Public: approved testimonials for display on the site.',
    resolve: async () => {
      return Testimonial.find({ isApproved: true }).sort({ createdAt: -1 });
    },
  },

  // ADMIN: the moderation queue — submissions awaiting a decision.
  pendingTestimonials: {
    type: new GraphQLList(new GraphQLNonNull(TestimonialType)),
    description: 'Admin: testimonials awaiting moderation.',
    resolve: async (_parent, _args, context) => {
      await requireAdmin(context);
      return Testimonial.find({ isApproved: false }).sort({ createdAt: -1 });
    },
  },

  // ADMIN: everything, approved or not — including low-rated feedback. This is
  // the honest "full picture" view that nothing is hidden from.
  allTestimonials: {
    type: new GraphQLList(new GraphQLNonNull(TestimonialType)),
    description: 'Admin: every testimonial, regardless of rating or approval.',
    resolve: async (_parent, _args, context) => {
      await requireAdmin(context);
      return Testimonial.find().sort({ createdAt: -1 });
    },
  },
};