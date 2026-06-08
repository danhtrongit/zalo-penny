<script setup lang="ts">
import { h, onMounted, reactive, ref } from "vue";
import {
  NDataTable,
  NTag,
  NSelect,
  useMessage,
  type DataTableColumns,
  type PaginationProps,
} from "naive-ui";
import PageHeader from "@/components/PageHeader.vue";
import DataToolbar from "@/components/DataToolbar.vue";
import { api, apiError } from "@/lib/api";
import { formatVnd, formatDateTime } from "@/lib/format";
import { toCsv, downloadCsv } from "@/lib/csv";
import type { PaymentRow, Paginated, PayStatus } from "@/types/api";

const message = useMessage();

const rows = ref<PaymentRow[]>([]);
const loading = ref(false);
const exporting = ref(false);
const search = ref("");
const status = ref<PayStatus | "ALL">("ALL");
const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
});

const statusOptions: { label: string; value: PayStatus | "ALL" }[] = [
  { label: "Tất cả", value: "ALL" },
  { label: "Đã thanh toán", value: "PAID" },
  { label: "Chờ thanh toán", value: "PENDING" },
  { label: "Thất bại", value: "FAILED" },
];

const payStatusType: Record<PayStatus, "success" | "warning" | "error"> = {
  PAID: "success",
  PENDING: "warning",
  FAILED: "error",
};

const columns: DataTableColumns<PaymentRow> = [
  {
    title: "Hoá đơn",
    key: "invoiceNumber",
    render: (r) => r.subscription.invoiceNumber,
  },
  {
    title: "Người dùng",
    key: "user",
    render: (r) =>
      h("div", [
        h("div", r.subscription.user.name),
        h("div", { style: "opacity:.6;font-size:12px" }, r.subscription.user.phone),
      ]),
  },
  {
    title: "Gói",
    key: "plan",
    render: (r) => r.subscription.plan.name,
  },
  {
    title: "Số tiền",
    key: "amount",
    align: "right",
    render: (r) => formatVnd(r.amount),
  },
  {
    title: "Phương thức",
    key: "method",
    render: (r) => r.method ?? "—",
  },
  {
    title: "Trạng thái",
    key: "status",
    render: (r) => h(NTag, { size: "small", type: payStatusType[r.status], bordered: false }, () => r.status),
  },
  {
    title: "Thanh toán lúc",
    key: "paidAt",
    render: (r) => formatDateTime(r.paidAt),
  },
];

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<Paginated<PaymentRow>>("/admin/payments", {
      params: {
        page: pagination.page,
        limit: pagination.pageSize,
        status: status.value === "ALL" ? undefined : status.value,
        search: search.value || undefined,
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
function onSearch(v: string) {
  search.value = v;
  pagination.page = 1;
  load();
}
function onStatus(v: PayStatus | "ALL") {
  status.value = v;
  pagination.page = 1;
  load();
}

async function exportCsv() {
  exporting.value = true;
  try {
    const { data } = await api.get<Paginated<PaymentRow>>("/admin/payments", {
      params: {
        page: 1,
        limit: 1000,
        status: status.value === "ALL" ? undefined : status.value,
        search: search.value || undefined,
      },
    });
    const csv = toCsv(data.data, [
      { key: "invoice", label: "Hoá đơn", value: (r) => r.subscription.invoiceNumber },
      { key: "name", label: "Tên", value: (r) => r.subscription.user.name },
      { key: "phone", label: "SĐT", value: (r) => r.subscription.user.phone },
      { key: "plan", label: "Gói", value: (r) => r.subscription.plan.name },
      { key: "amount", label: "Số tiền", value: (r) => r.amount },
      { key: "method", label: "Phương thức", value: (r) => r.method ?? "" },
      { key: "status", label: "Trạng thái", value: (r) => r.status },
      { key: "paidAt", label: "Thanh toán lúc", value: (r) => formatDateTime(r.paidAt) },
    ]);
    downloadCsv(`payments-${Date.now()}`, csv);
  } catch (err) {
    message.error(apiError(err));
  } finally {
    exporting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader title="Thanh toán" subtitle="Quản lý giao dịch thanh toán" />
    <DataToolbar
      :search="search"
      search-placeholder="Tìm theo invoice / SĐT"
      :loading="loading"
      show-export
      :exporting="exporting"
      @update:search="onSearch"
      @refresh="load"
      @export="exportCsv"
    >
      <template #filters>
        <NSelect
          :value="status"
          :options="statusOptions"
          style="width: 180px"
          @update:value="onStatus"
        />
      </template>
    </DataToolbar>
    <NDataTable
      remote
      :columns="columns"
      :data="rows"
      :loading="loading"
      :pagination="pagination"
      :row-key="(r: PaymentRow) => r.id"
      @update:page="onPage"
      @update:page-size="onPageSize"
    />
  </div>
</template>
