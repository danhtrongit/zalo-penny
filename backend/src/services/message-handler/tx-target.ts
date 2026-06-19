import prisma from "../../config/prisma";
import { ConversationSession, lastTransaction } from "../conversation-state.service";
import { startOfVnDay } from "../../utils/vn-time";

const DAY_MS = 24 * 60 * 60 * 1000;
const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface TargetMatch {
  description?: string;
  amount?: number;
  /** YYYY-MM-DD — the VN calendar day the transaction belongs to. */
  date?: string;
}

export function hasTargetMatch(match?: TargetMatch): boolean {
  return !!(match && (match.amount || match.description || match.date));
}

type TargetWhere = {
  userId: string;
  amount?: number;
  description?: { contains: string; mode: "insensitive" };
  date?: { gte: Date; lt: Date };
};

/** Build the Prisma `where` for an edit/delete target, scoping by VN day when a
 *  date is given so identical amount+description rows on different days don't
 *  collide. */
export function buildTargetWhere(userId: string, match?: TargetMatch): TargetWhere {
  const where: TargetWhere = { userId };
  if (match?.amount) where.amount = match.amount;
  if (match?.description) {
    where.description = { contains: match.description, mode: "insensitive" };
  }
  if (match?.date && VALID_DATE.test(match.date)) {
    const start = startOfVnDay(match.date);
    where.date = { gte: start, lt: new Date(start.getTime() + DAY_MS) };
  }
  return where;
}

/**
 * Resolve which transaction an edit/delete request refers to. Prefers an
 * explicit match (amount/description/date — date scopes to the VN day);
 * otherwise falls back to the transaction the user just entered.
 */
export async function resolveTransactionTarget(
  userId: string,
  match: TargetMatch | undefined,
  session: ConversationSession
) {
  if (hasTargetMatch(match)) {
    const found = await prisma.transaction.findFirst({
      where: buildTargetWhere(userId, match),
      orderBy: { createdAt: "desc" },
    });
    if (found) return found;
  }

  const last = lastTransaction(session);
  if (last) {
    return prisma.transaction.findFirst({ where: { id: last.id, userId } });
  }
  return null;
}
