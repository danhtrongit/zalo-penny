import prisma from "../../config/prisma";
import { ConversationSession, lastTransaction } from "../conversation-state.service";

/**
 * Resolve which transaction an edit/delete request refers to. Prefers an
 * explicit amount/description match; otherwise falls back to the transaction the
 * user just entered (tracked in conversation state) so "sửa/xoá cái vừa ghi"
 * hits a concrete row instead of a blind newest-overall guess.
 */
export async function resolveTransactionTarget(
  userId: string,
  match: { description?: string; amount?: number } | undefined,
  session: ConversationSession
) {
  const hasMatch = !!(match && (match.amount || match.description));
  if (hasMatch) {
    const where: {
      userId: string;
      amount?: number;
      description?: { contains: string; mode: "insensitive" };
    } = { userId };
    if (match!.amount) where.amount = match!.amount;
    if (match!.description) {
      where.description = { contains: match!.description, mode: "insensitive" };
    }
    const found = await prisma.transaction.findFirst({
      where,
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
