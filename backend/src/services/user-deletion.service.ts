import prisma from "../config/prisma";
import { Prisma } from "../generated/prisma/client";
import * as botManager from "./bot-manager.service";
import * as zaloApi from "../utils/zalo-api";
import { logger } from "../utils/logger";

/**
 * Permanently delete a user and ALL of their data. Bot/webhook teardown runs
 * best-effort outside the transaction (a dead token must not block deletion);
 * every table is then deleted in FK-safe order inside a single transaction.
 * Returns the number of rows removed per table.
 */
export async function deleteUserCompletely(
  userId: string
): Promise<Record<string, number>> {
  const ownedBot = await prisma.botConfig.findUnique({
    where: { userId },
    select: { id: true, botToken: true },
  });
  if (ownedBot) {
    botManager.stopBot(ownedBot.id);
    try {
      await zaloApi.deleteWebhook(ownedBot.botToken);
    } catch (err) {
      logger.warn({ err, userId }, "deleteWebhook failed during user deletion (ignored)");
    }
  }

  // ConversationState has no userId column — clean it by the user's
  // (zaloUserId, botConfigId) pairs, gathered before we delete ZaloUser.
  const zaloRows = await prisma.zaloUser.findMany({
    where: { userId },
    select: { zaloUserId: true, botConfigId: true },
  });

  return prisma.$transaction(async (tx) => {
    const counts: Record<string, number> = {};
    counts.payments = (await tx.payment.deleteMany({ where: { subscription: { userId } } })).count;
    counts.subscriptions = (await tx.subscription.deleteMany({ where: { userId } })).count;
    counts.subscriptionAudits = (await tx.subscriptionAudit.deleteMany({ where: { userId } })).count;
    counts.transactions = (await tx.transaction.deleteMany({ where: { userId } })).count;
    counts.receipts = (await tx.receipt.deleteMany({ where: { userId } })).count;
    counts.budgets = (await tx.budget.deleteMany({ where: { userId } })).count;
    counts.personas = (await tx.persona.deleteMany({ where: { userId } })).count;
    counts.dailyUsage = (await tx.dailyUsage.deleteMany({ where: { userId } })).count;
    counts.reminderLogs = (await tx.reminderLog.deleteMany({ where: { userId } })).count;
    counts.botAssignments = (await tx.botAssignment.deleteMany({ where: { userId } })).count;
    counts.zaloUsers = (await tx.zaloUser.deleteMany({ where: { userId } })).count;

    const orConds: Prisma.ConversationStateWhereInput[] = zaloRows.map((z) => ({
      zaloUserId: z.zaloUserId,
      botConfigId: z.botConfigId,
    }));
    if (ownedBot) orConds.push({ botConfigId: ownedBot.id });
    counts.conversationStates = orConds.length
      ? (await tx.conversationState.deleteMany({ where: { OR: orConds } })).count
      : 0;

    counts.botConfigs = (await tx.botConfig.deleteMany({ where: { userId } })).count;
    await tx.user.delete({ where: { id: userId } });
    counts.user = 1;
    return counts;
  });
}
