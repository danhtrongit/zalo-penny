import prisma from "../config/prisma";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let s = "";
  for (let i = 0; i < 4; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `PENNY-${s}`;
}

async function generateLinkCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = randomCode();
    const exists = await prisma.botAssignment.findUnique({ where: { linkCode: code } });
    if (!exists) return code;
  }
  throw new Error("Could not generate unique link code");
}

/** True if at least one active pool bot still has a free slot. */
export async function poolHasCapacity(): Promise<boolean> {
  const bots = await prisma.botConfig.findMany({
    where: { kind: "POOL", isActive: true },
    include: { _count: { select: { assignments: true } } },
  });
  return bots.some((b) => b._count.assignments < b.capacity);
}

/** Load report for admin UI: every pool bot with its current usage. */
export async function getPoolLoad() {
  const bots = await prisma.botConfig.findMany({
    where: { kind: "POOL" },
    include: { _count: { select: { assignments: true } } },
    orderBy: { createdAt: "asc" },
  });
  return bots.map((b) => ({
    botConfigId: b.id,
    label: b.label,
    used: b._count.assignments,
    capacity: b.capacity,
    isActive: b.isActive,
  }));
}

/**
 * Assign the user to a pool bot, distributing evenly (least-loaded first,
 * ties broken by oldest bot). Idempotent: returns the existing assignment if
 * the user already has one. Returns null when no active pool bot has a free
 * slot (caller should treat the user as "awaiting bot" + alert admin).
 */
export async function assignBotToUser(userId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.botAssignment.findUnique({ where: { userId } });
    if (existing) return existing;

    const bots = await tx.botConfig.findMany({
      where: { kind: "POOL", isActive: true },
      include: { _count: { select: { assignments: true } } },
      orderBy: { createdAt: "asc" },
    });
    const available = bots
      .filter((b) => b._count.assignments < b.capacity)
      .sort(
        (a, b) =>
          a._count.assignments - b._count.assignments ||
          a.createdAt.getTime() - b.createdAt.getTime()
      );
    const target = available[0];
    if (!target) return null;

    const linkCode = await generateLinkCode();
    return tx.botAssignment.create({
      data: { botConfigId: target.id, userId, status: "PENDING_LINK", linkCode },
    });
  });
}

/**
 * Release the user's assignment, freeing the slot. Also removes the Zalo→app
 * mapping so a future re-assignment to a different bot can't mis-attribute.
 * Returns true if an assignment was released.
 */
export async function releaseAssignment(userId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const a = await tx.botAssignment.findUnique({ where: { userId } });
    if (!a) return false;
    if (a.linkedZaloUserId) {
      await tx.zaloUser.deleteMany({
        where: { zaloUserId: a.linkedZaloUserId, botConfigId: a.botConfigId },
      });
    }
    await tx.botAssignment.delete({ where: { id: a.id } });
    return true;
  });
}
