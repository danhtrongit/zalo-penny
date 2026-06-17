<script setup lang="ts">
import { h, onMounted, reactive, ref } from "vue";
import {
  NDataTable,
  NTag,
  NButton,
  NSpace,
  NModal,
  NSelect,
  useMessage,
  type DataTableColumns,
  type PaginationProps,
} from "naive-ui";
import PageHeader from "@/components/PageHeader.vue";
import DataToolbar from "@/components/DataToolbar.vue";
import { api, apiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { toCsv, downloadCsv } from "@/lib/csv";
import type { AuditRow, Paginated } from "@/types/api";

const message = useMessage();

const rows = ref<AuditRow[]>([]);
const loading = ref(false);
const exporting = ref(false);
const search = ref("");
const action = ref<string>("ALL");
const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
});

const actionOptions = [
  { label: "Tất cả", value: "ALL" },
  { label: "USER_LOCK", value: "USER_LOCK" },
  { label: "USER_UNLOCK", value: "USER_UNLOCK" },
  { label: "USER_ROLE_CHANGE", value: "USER_ROLE_CHANGE" },
  { label: "PLAN_CREATE", value: "PLAN_CREATE" },
  { label: "PLAN_UPDATE", value: "PLAN_UPDATE" },
  { label: "PLAN_DELETE", value: "PLAN_DELETE" },
  { label: "SUBSCRIPTION_MANUAL_UPGRADE", value: "SUBSCRIPTION_MANUAL_UPGRADE" },
  { label: "NOTIFICATION_BROADCAST", value: "NOTIFICATION_BROADCAST" },
  { label: "BOT_CREATE", value: "BOT_CREATE" },
  { label: "BOT_UPDATE", value: "BOT_UPDATE" },
  { label: "BOT_DELETE", value: "BOT_DELETE" },
  { label: "USER_DELETE", value: "USER_DELETE" },
];

const columns: DataTableColumns<AuditRow> = [
  {
    title: "Thời gian",
    key: "createdAt",
    render: (r) => formatDateTime(r.createdAt),
  },
  {
    title: "Hành động",
    key: "action",
    render: (r) => h(NTag, { size: "small", bordered: false }, () => r.action),
  },
  {
    title: "Mô tả",
    key: "summary",
    render: (r) => r.summary ?? h("span", { style: "opacity:.4" }, "—"),
  },
  {
    title: "Admin",
    key: "admin",
    render: (r) =>
      h("div", [
        h("div", r.admin.name),
        h("div", { style: "opacity:.6;font-size:12px" }, r.admin.phone),
      ]),
  },
  {
    title: "",
    key: "actions",
    align: "right",
    render: (r) =>
      h(NSpace, { justify: "end", size: 6 }, () => [
        h(NButton, { size: "small", tertiary: true, onClick: () => openPayload(r) }, () => "Payload"),
      ]),
  },
];

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<Paginated<AuditRow>>("/admin/subscriptions/audit", {
      params: {
        page: pagination.page,
        limit: pagination.pageSize,
        action: action.value === "ALL" ? undefined : action.value,
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
function onAction(v: string) {
  action.value = v;
  pagination.page = 1;
  load();
}

// Payload modal
const payloadTarget = ref<AuditRow | null>(null);
function openPayload(r: AuditRow) {
  payloadTarget.value = r;
}

async function exportCsv() {
  exporting.value = true;
  try {
    const { data } = await api.get<Paginated<AuditRow>>("/admin/subscriptions/audit", {
      params: {
        page: 1,
        limit: 1000,
        action: action.value === "ALL" ? undefined : action.value,
      },
    });
    const csv = toCsv(data.data, [
      { key: "createdAt", label: "Thời gian", value: (r) => formatDateTime(r.createdAt) },
      { key: "action", label: "Hành động" },
      { key: "summary", label: "Mô tả", value: (r) => r.summary ?? "" },
      { key: "adminName", label: "Admin", value: (r) => r.admin.name },
    ]);
    downloadCsv(`audit-${Date.now()}`, csv);
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
    <PageHeader title="Nhật ký quản trị" subtitle="Lịch sử thao tác của quản trị viên" />
    <DataToolbar
      :search="search"
      :loading="loading"
      show-export
      :exporting="exporting"
      @update:search="(v: string) => (search = v)"
      @refresh="load"
      @export="exportCsv"
    >
      <template #filters>
        <NSelect
          :value="action"
          :options="actionOptions"
          style="width: 240px"
          @update:value="onAction"
        />
      </template>
    </DataToolbar>
    <NDataTable
      remote
      :columns="columns"
      :data="rows"
      :loading="loading"
      :pagination="pagination"
      :row-key="(r: AuditRow) => r.id"
      @update:page="onPage"
      @update:page-size="onPageSize"
    />

    <NModal
      :show="!!payloadTarget"
      preset="card"
      title="Payload"
      style="width: 640px"
      @update:show="(v: boolean) => { if (!v) payloadTarget = null; }"
    >
      <pre class="payload">{{ payloadTarget ? JSON.stringify(payloadTarget.payload, null, 2) : "" }}</pre>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="payloadTarget = null">Đóng</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.payload {
  margin: 0;
  max-height: 60vh;
  overflow: auto;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.04);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
