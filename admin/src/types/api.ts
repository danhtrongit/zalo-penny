export type Role = "USER" | "ADMIN";
export type SubStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED";
export type PayStatus = "PENDING" | "PAID" | "FAILED";
export type ReminderKind = "MORNING" | "EVENING";

export interface AuthUser {
  id: string;
  phone: string;
  email: string | null;
  name: string;
  role: Role;
  createdAt: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PlanRef {
  name: string;
  slug: string;
}

export interface AdminUserRow {
  id: string;
  phone: string;
  email: string | null;
  name: string;
  role: Role;
  isLocked: boolean;
  lockedAt: string | null;
  createdAt: string;
  subscription: { status: SubStatus; endDate: string | null; plan: PlanRef } | null;
  botConfig: { isActive: boolean } | null;
}

export interface AdminUserDetail {
  id: string;
  phone: string;
  email: string | null;
  name: string;
  role: Role;
  isLocked: boolean;
  lockedAt: string | null;
  lockedReason: string | null;
  createdAt: string;
  updatedAt: string;
  subscription:
    | {
        id: string;
        status: SubStatus;
        startDate: string | null;
        endDate: string | null;
        invoiceNumber: string;
        plan: Plan;
      }
    | null;
  botConfig: {
    id: string;
    isActive: boolean;
    kind: string;
    capacity: number;
    connectedAt: string | null;
  } | null;
  persona: { id: string; style: string; displayName: string | null } | null;
  _count: { transactions: number; receipts: number; budgets: number };
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  durationDays: number;
  price: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { subscriptions: number };
}

export interface BotAssignmentRef {
  id: string;
  userId: string;
  user: { id: string; name: string; phone: string };
}

export interface BotPoolItem {
  id: string;
  kind: string;
  label: string | null;
  botToken: string;
  capacity: number;
  botLink: string | null;
  qrImageUrl: string | null;
  isActive: boolean;
  connectedAt: string | null;
  createdAt: string;
  _count: { assignments: number };
  assignments: BotAssignmentRef[];
}

export interface BotsResponse {
  bots: BotPoolItem[];
  awaiting: number;
}

export interface PaymentRow {
  id: string;
  amount: number;
  status: PayStatus;
  paidAt: string | null;
  method: string | null;
  transactionId: string | null;
  subscription: {
    invoiceNumber: string;
    user: { id: string; phone: string; name: string; email: string | null };
    plan: PlanRef;
  };
}

export interface StatsOverview {
  totalUsers: number;
  lockedUsers: number;
  activeSubs: number;
  pendingSubs: number;
  paidThisMonth: number;
  revenueAllTime: number;
  revenueThisMonth: number;
  recentSignups: { id: string; phone: string; name: string; createdAt: string }[];
}

export interface TimeseriesPoint {
  date: string;
  value: number;
}

export interface TimeseriesResponse {
  points: TimeseriesPoint[];
}

export interface AuditRow {
  id: string;
  adminId: string;
  action: string;
  payload: Record<string, unknown>;
  summary: string | null;
  createdAt: string;
  admin: { id: string; phone: string; name: string };
}

export interface SendResult {
  sent: number;
  failed: number;
}

export interface ReminderRow {
  id: string;
  userId: string;
  kind: ReminderKind;
  sentOn: string;
  createdAt: string;
  user: { name: string; phone: string } | null;
}

export interface ReminderStatPoint {
  date: string;
  kind: ReminderKind;
  count: number;
}

export interface ReminderStatsResponse {
  points: ReminderStatPoint[];
}
