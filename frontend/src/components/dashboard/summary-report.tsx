import { useEffect, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportData {
  total: number;
  transactionCount: number;
  categories: Record<string, { total: number; count: number }>;
}

const DONUT_COLORS = [
  "#0e8c7c",
  "#249974",
  "#3aab7e",
  "#52ba83",
  "#6ec046",
  "#a8d96b",
  "#d4ed31",
  "#ffeb3b",
  "#f1b721",
];

function formatMoney(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function formatMoneyShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n.toLocaleString("vi-VN");
}

interface SummaryDonutProps {
  title: string;
  data: ReportData | null;
  loading: boolean;
}

function SummaryDonut({ title, data, loading }: SummaryDonutProps) {
  const chartData = data
    ? Object.entries(data.categories)
        .map(([name, v]) => ({ name, value: v.total }))
        .sort((a, b) => b.value - a.value)
    : [];

  const top = chartData.slice(0, 3);

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#f6fbf8] to-[#e8f1e2] shadow-none">
      <CardContent className="p-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#588e7a]">
            {title}
          </h3>
          <span className="text-[10px] font-medium text-[#588e7a]">
            {data?.transactionCount || 0} GD
          </span>
        </div>
        <p className="mt-0.5 font-heading text-base font-extrabold leading-tight text-[#11684c]">
          {loading ? "—" : formatMoney(data?.total || 0)}
        </p>

        {loading ? (
          <Skeleton className="mt-2 h-[110px] w-full" />
        ) : chartData.length === 0 ? (
          <p className="mt-3 py-2 text-center text-[11px] text-[#839d91]">
            Chưa có dữ liệu
          </p>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <div className="h-[110px] w-[110px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={50}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      borderRadius: 8,
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: 11,
                      padding: "6px 8px",
                    }}
                    formatter={(value) => [formatMoney(Number(value ?? 0)), "Chi"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="min-w-0 flex-1 space-y-1">
              {top.map((item, i) => (
                <li
                  key={item.name}
                  className="flex items-center gap-1.5 text-[10px] leading-tight"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                  />
                  <span className="truncate font-medium text-[#11684c]">
                    {item.name}
                  </span>
                  <span className="ml-auto shrink-0 font-bold text-[#11684c]">
                    {formatMoneyShort(item.value)}
                  </span>
                </li>
              ))}
              {chartData.length > 3 && (
                <li className="text-[9px] italic text-[#839d91]">
                  +{chartData.length - 3} khác
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SummaryReport() {
  const [week, setWeek] = useState<ReportData | null>(null);
  const [month, setMonth] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get("/reports", { params: { period: "week" } }),
      api.get("/reports", { params: { period: "month" } }),
    ])
      .then(([w, m]) => {
        setWeek(w.data);
        setMonth(m.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2">
      <SummaryDonut title="Tuần này" data={week} loading={loading} />
      <SummaryDonut title="Tháng này" data={month} loading={loading} />
    </div>
  );
}
