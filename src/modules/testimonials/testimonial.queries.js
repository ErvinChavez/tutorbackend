import { GraphQLList, GraphQLNonNull } from 'graphql';

import Testimonial from './testimonial.model.js';
import { TestimonialType } from './testimonial.types.js';
import { requireAdmin } from '../../middleware/authMiddleware.js';

export const testimonialQueries = {
  approvedTestimonials: {
    type: new GraphQLList(new GraphQLNonNull(TestimonialType)),
    description: 'Public: approved testimonials for display on the site.',
    resolve: async () => {
      return Testimonial.find({ isApproved: true }).sort({ createdAt: -1 });
    },
  },

  pendingTestimonials: {
    type: new GraphQLList(new GraphQLNonNull(TestimonialType)),
    description: 'Admin: testimonials awaiting moderation.',
    resolve: async (_parent, _args, context) => {
      await requireAdmin(context);
      return Testimonial.find({ isApproved: false }).sort({ createdAt: -1 });
    },
  },

  allTestimonials: {
    type: new GraphQLList(new GraphQLNonNull(TestimonialType)),
    description: 'Admin: every testimonial, regardless of rating or approval.',
    resolve: async (_parent, _args, context) => {
      await requireAdmin(context);
      return Testimonial.find().sort({ createdAt: -1 });
    },
  },
};