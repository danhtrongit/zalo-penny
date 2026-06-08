<script setup lang="ts">
import { h, onMounted, reactive, ref } from "vue";
import {
  NCard,
  NDataTable,
  NTag,
  NDatePicker,
  NSelect,
  NSpin,
  useMessage,
  type DataTableColumns,
  type PaginationProps,
} from "naive-ui";
import PageHeader from "@/components/PageHeader.vue";
import DataToolbar from "@/components/DataToolbar.vue";
import LineChart from "@/components/LineChart.vue";
import { api, apiError } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { toCsv, downloadCsv } from "@/lib/csv";
import { CHART_ACCENT, PRIMARY } from "@/theme/tokens";
import type { ReminderRow, ReminderStatsResponse, ReminderKind, Paginated } from "@/types/api";

const message = useMessage();

// Summary chart
const statsLoading = ref(true);
const chartCategories = ref<string[]>([]);
const morningSeries = ref<number[]>([]);
const eveningSeries = ref<number[]>([]);

async function loadStats() {
  statsLoading.value = true;
  try {
    const { data } = await api.get<ReminderStatsResponse>("/admin/reminders/stats", {
      params: { days: 14 },
    });
    const dates = Array.from(new Set(data.points.map((p) => p.date))).sort();
    const byDateKind = new Map<string, number>();
    for (const p of data.points) {
      byDateKind.set(`${p.date}|${p.kind}`, p.count);
    }
    chartCategories.value = dates.map((d) => d.slice(5));
    morningSeries.value = dates.map((d) => byDateKind.get(`${d}|MORNING`) ?? 0);
    eveningSeries.value = dates.map((d) => byDateKind.get(`${d}|EVENING`) ?? 0);
  } catch (err) {
    message.error(apiError(err));
  } finally {
    statsLoading.value = false;
  }
}

// Remote table
const rows = ref<ReminderRow[]>([]);
const loading = ref(false);
const exporting = ref(false);
const dateFilter = ref<string | null>(null);
const kindFilter = ref<ReminderKind | "ALL">("ALL");
const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
});

const kindOptions = [
  { label: "Tất cả", value: "ALL" },
  { label: "Sáng", value: "MORNING" },
  { label: "Tối", value: "EVENING" },
];

const kindLabel: Record<ReminderKind, string> = {
  MORNING: "Sáng",
  EVENING: "Tối",
};
const kindType: Record<ReminderKind, "warning" | "info"> = {
  MORNING: "warning",
  EVENING: "info",
};

const columns: DataTableColumns<ReminderRow> = [
  {
    title: "Người dùng",
    key: "user",
    render: (r) =>
      r.user
        ? h("div", [
            h("div", r.user.name),
            h("div", { style: "opacity:.6;font-size:12px" }, r.user.phone),
          ])
        : h("span", { style: "opacity:.4" }, "—"),
  },
  {
    title: "Loại",
    key: "kind",
    render: (r) =>
      h(NTag, { size: "small", type: kindType[r.kind], bordered: false }, () => kindLabel[r.kind]),
  },
  {
    title: "Ngày gửi",
    key: "sentOn",
    render: (r) => formatDate(r.sentOn),
  },
  {
    title: "Thời điểm tạo",
    key: "createdAt",
    render: (r) => formatDateTime(r.createdAt),
  },
];

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<Paginated<ReminderRow>>("/admin/reminders", {
      params: {
        page: pagination.page,
        limit: pagination.pageSize,
        date: dateFilter.value || undefined,
        kind: kindFilter.value === "ALL" ? undefined : kindFilter.value,
      },
    });
    rows.value = data.data;
    pagination.itemCount = data.total;
  } catch (err) {
    message.error(apiError(err));
  } finally {
    loading.value = false;
  }
}

function onPage(p: number) {
  pagination.page = p;
  load();
}
function onPageSize(ps: number) {
  pagination.pageSize = ps;
  pagination.page = 1;
  load();
}
function onDateChange(v: string | null) {
  dateFilter.value = v;
  pagination.page = 1;
  load();
}
function onKindChange(v: ReminderKind | "ALL") {
  kindFilter.value = v;
  pagination.page = 1;
  load();
}

async function exportCsv() {
  exporting.value = true;
  try {
    const { data } = await api.get<Paginated<ReminderRow>>("/admin/reminders", {
      params: {
        page: 1,
        limit: 1000,
        date: dateFilter.value || undefined,
        kind: kindFilter.value === "ALL" ? undefined : kindFilter.value,
      },
    });
    const csv = toCsv(data.data, [
      { key: "user", label: "Người dùng", value: (r) => r.user?.name ?? "" },
      { key: "phone", label: "SĐT", value: (r) => r.user?.phone ?? "" },
      { key: "kind", label: "Loại", value: (r) => kindLabel[r.kind] },
      { key: "sentOn", label: "Ngày gửi", value: (r) => formatDate(r.sentOn) },
    ]);
    downloadCsv(`reminders-${Date.now()}`, csv);
  } catch (err) {
    message.error(apiError(err));
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  loadStats();
  load();
});
</script>

<template>
  <div>
    <PageHeader title="Nhắc nhở" subtitle="Lịch sử nhắc nhở hoá đơn" />

    <NCard title="Nhắc nhở 14 ngày" size="small" style="margin-bottom: 16px">
      <NSpin :show="statsLoading">
        <LineChart
          :categories="chartCategories"
          :series="[
            { name: 'Sáng', data: morningSeries, color: PRIMARY },
            { name: 'Tối', data: eveningSeries, color: CHART_ACCENT },
          ]"
        />
      </NSpin>
    </NCard>

    <DataToolbar
      :search="undefined"
      :loading="loading"
      show-export
      :exporting="exporting"
      @refresh="load"
      @export="exportCsv"
    >
      <template #filters>
        <NDatePicker
          :value="null"
          type="date"
          value-format="yyyy-MM-dd"
          clearable
          placeholder="Lọc theo ngày"
          style="width: 180px"
          @update:formatted-value="onDateChange"
        />
        <NSelect
          :value="kindFilter"
          :options="kindOptions"
          style="width: 140px"
          @update:value="onKindChange"
        />
      </template>
    </DataToolbar>

    <NDataTable
      remote
      :columns="columns"
      :data="rows"
      :loading="loading"
      :pagination="pagination"
      :row-key="(r: ReminderRow) => r.id"
      @update:page="onPage"
      @update:page-size="onPageSize"
    />
  </div>
</template>
