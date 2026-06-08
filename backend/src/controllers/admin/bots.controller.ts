import { Response } from "express";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { HttpError } from "../../middlewares/error.middleware";
import { logAdminAction } from "../../services/admin-audit.service";
import * as botManager from "../../services/bot-manager.service";
import * as zaloApi from "../../utils/zalo-api";

interface BotCreateInput {
  label: string;
  botToken: string;
  capacity: number;
  botLink?: string;
  qrImageUrl?: string;
  isActive: boolean;
}

export const list = async (_req: AuthRequest, res: Response) => {
  const bots = await prisma.botConfig.findMany({
    where: { kind: "POOL" },
    include: {
      _count: { select: { assignments: true } },
      assignments: {
        include: { user: { select: { id: true, name: true, phone: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Users with an active subscription but no bot at all (pool was full).
  const awaiting = await prisma.subscription.count({
    where: {
      status: "ACTIVE",
      user: { botAssignment: { is: null }, botConfig: { is: null } },
    },
  });

  res.json({ bots, awaiting });
};

export const create = async (req: AuthRequest, res: Response) => {
  const { label, botToken, capacity, botLink, qrImageUrl, isActive } =
    req.body as BotCreateInput;

  try {
    await zaloApi.getMe(botToken.trim());
  } catch (err) {
    throw new HttpError(400, "Bot token không hợp lệ", {
      details: err instanceof Error ? err.message : String(err),
    });
  }

  const bot = await prisma.botConfig.create({
    data: {
      kind: "POOL",
      label,
      botToken: botToken.trim(),
      capacity,
      botLink,
      qrImageUrl,
      isActive,
      connectedAt: new Date(),
    },
  });

  if (bot.isActive) await botManager.startBot(bot.id, bot.botToken);

  await logAdminAction({
    adminId: req.userId!,
    action: "BOT_CREATE",
    payload: { botConfigId: bot.id, label, capacity },
    summary: `Created pool bot ${label} (cap ${capacity})`,
  });

  res.status(201).json(bot);
};

export const update = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const before = await prisma.botConfig.findUnique({ where: { id } });
  if (!before || before.kind !== "POOL") throw new HttpError(404, "Không tìm thấy bot");

  const input = req.body as Partial<BotCreateInput>;
  if (input.botToken) {
    try {
      await zaloApi.getMe(input.botToken.trim());
    } catch (err) {
      throw new HttpError(400, "Bot token không hợp lệ", {
        details: err instanceof Error ? err.message : String(err),
      });
    }
    input.botToken = input.botToken.trim();
  }

  const bot = await prisma.botConfig.update({ where: { id }, data: input });

  if (bot.isActive) await botManager.startBot(bot.id, bot.botToken);
  else botManager.stopBot(bot.id);

  await logAdminAction({
    adminId: req.userId!,
    action: "BOT_UPDATE",
    payload: {
      botConfigId: id,
      before: { label: before.label, capacity: before.capacity, isActive: before.isActive },
      after: { ...input, botToken: input.botToken ? "<changed>" : undefined },
    },
    summary: `Updated pool bot ${bot.label}`,
  });

  res.json(bot);
};

export const remove = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const bot = await prisma.botConfig.findUnique({
    where: { id },
    include: { _count: { select: { assignments: true } } },
  });
  if (!bot || bot.kind !== "POOL") throw new HttpError(404, "Không tìm thấy bot");
  if (bot._count.assignments > 0) {
    throw new HttpError(
      409,
      `Bot còn ${bot._count.assignments} user. Hãy chuyển/giải phóng trước khi xoá.`
    );
  }

  botManager.stopBot(id);
  await prisma.botConfig.delete({ where: { id } });

  await logAdminAction({
    adminId: req.userId!,
    action: "BOT_DELETE",
    payload: { botConfigId: id },
    summary: `Deleted pool bot ${bot.label}`,
  });

  res.json({ ok: true });
};
