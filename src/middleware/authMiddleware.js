import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';

import Admin from '../modules/auth/Admin.model.js';

/**
 * Inspect the GraphQL context, pull the Bearer token from the Authorization
 * header, verify it, and load the corresponding admin from the database.
 *
 * This "fails open" to null: a missing, malformed, expired, or otherwise
 * invalid token simply yields `null` rather than throwing. Use this when a
 * resolver wants to behave differently for authed vs. anonymous callers.
 *
 * @param {{ req?: { headers?: Record<string, string> } }} context
 * @returns {Promise<import('mongoose').Document|null>} the admin doc, or null.
 */
export const getAdminFromContext = async (context) => {
  const authHeader = context?.req?.headers?.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findById(decoded.id);
    return admin || null;
  } catch (error) {

    return null;
  }
};

/**
 * Strict guard for admin-only resolvers. Resolves to the admin doc if the
 * request carries a valid token, otherwise throws an UNAUTHENTICATED error.
 *
 * Usage inside a protected resolver:
 *   resolve: async (_parent, args, context) => {
 *     const admin = await requireAdmin(context);
 *     // ...admin is guaranteed here...
 *   }
 *
 * @param {object} context - The GraphQL context object.
 * @returns {Promise<import('mongoose').Document>} the authenticated admin.
 */
export const requireAdmin = async (context) => {
  const admin = await getAdminFromContext(context);

  if (!admin) {
    throw new GraphQLError('Not authenticated. Admin access required.', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  return admin;
};