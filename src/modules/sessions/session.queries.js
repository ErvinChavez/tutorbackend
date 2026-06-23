import { GraphQLList, GraphQLNonNull } from 'graphql';

import Session from './session.model.js';
import { SessionType } from './session.types.js';
import { requireAdmin } from '../../middleware/authMiddleware.js';


export const sessionQueries = {
  // Every session, most recent first.
  sessions: {
    type: new GraphQLList(new GraphQLNonNull(SessionType)),
    description: 'Fetch all scheduled sessions (teacher only).',
    resolve: async (_parent, _args, context) => {
      await requireAdmin(context);
      return Session.find().sort({ date: -1 });
    },
  },

  unpaidSessions: {
    type: new GraphQLList(new GraphQLNonNull(SessionType)),
    description:
      'Fetch sessions whose payment is UNPAID or OVERDUE (teacher only).',
    resolve: async (_parent, _args, context) => {
      await requireAdmin(context);
      return Session.find({
        paymentStatus: { $in: ['UNPAID', 'OVERDUE'] },
      }).sort({ date: -1 });
    },
  },
};