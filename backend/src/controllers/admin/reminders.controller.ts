import { Response } from "express";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { startOfVnDay, vnDateStr, vnDateRange } from "../../utils/vn-time";

type ReminderKind = "MORNING" | "EVENING";

/**
 * GET /api/admin/reminders?page&limit&date&kind
 * Paginated reminder log with recipient name/phone attached.
 */
export const list = async (req: AuthRequest, res: Response) => {
  const { page, limit, date, kind } = req.query as unknown as {
    page: number;
    limit: number;
    date?: string;
    kind?: ReminderKind;
  };
  const skip = (page - 1) * limit;

  const where: { kind?: ReminderKind; sentOn?: { gte: Date; lt: Date } } = {};
  if (kind) where.kind = kind;
  if (date) {
    const start = startOfVnDay(date);
    where.sentOn = { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
  }

  const [data, total] = await Promise.all([
    prisma.reminderLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.reminderLog.count({ where }),
  ]);

  const userIds = [...new Set(data.map((r) => r.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, phone: true },
  });
  const map = new Map(users.map((u) => [u.id, { name: u.name, phone: u.phone }]));

  res.json({
    data: data.map((r) => ({ ...r, user: map.get(r.userId) ?? null })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
};

/**
 * GET /api/admin/reminders/stats?days=14
 * Per-day, per-kind counts over the last `days` VN calendar days (zero-filled).
 */
export const stats = async (req: AuthRequest, res: Response) => {
  const { days } = req.query as unknown as { days: number };
  const dates = vnDateRange(days);
  const gte = startOfVnDay(dates[0]);

  const rows = await prisma.reminderLog.findMany({
    where: { sentOn: { gte } },
    select: { sentOn: true, kind: true },
  });

  const key = (d: string, k: string) => `${d}|${k}`;
  const counts = new Map<string, number>();
  for (const r of rows) {
    const d = vnDateStr(r.sentOn);
    const kk = key(d, r.kind);
    counts.set(kk, (counts.get(kk) ?? 0) + 1);
  }

  const kinds: ReminderKind[] = ["MORNING", "EVENING"];
  const points: { date: string; kind: ReminderKind; count: number }[] = [];
  for (const d of dates) {
    for (const k of kinds) {
      points.push({ date: d, kind: k, count: counts.get(key(d, k)) ?? 0 });
    }
  }

  res.json({ points });
};
