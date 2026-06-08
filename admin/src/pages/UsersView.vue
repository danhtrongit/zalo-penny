<script setup lang="ts">
import { h, onMounted, reactive, ref } from "vue";
import { useRouter, RouterLink } from "vue-router";
import {
  NDataTable,
  NTag,
  NButton,
  NSpace,
  NModal,
  NInput,
  NForm,
  NFormItem,
  useMessage,
  type DataTableColumns,
  type PaginationProps,
} from "naive-ui";
import PageHeader from "@/components/PageHeader.vue";
import DataToolbar from "@/components/DataToolbar.vue";
import { api, apiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { toCsv, downloadCsv } from "@/lib/csv";
import type { AdminUserRow, Paginated, SubStatus } from "@/types/api";

const router = useRouter();
const message = useMessage();

const rows = ref<AdminUserRow[]>([]);
const loading = ref(false);
const exporting = ref(false);
const search = ref("");
const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
});

const subStatusType: Record<SubStatus, "success" | "warning" | "error" | "default"> = {
  ACTIVE: "success",
  PENDING: "warning",
  EXPIRED: "default",
  CANCELLED: "error",
};

const columns: DataTableColumns<AdminUserRow> = [
  {
    title: "Người dùng",
    key: "name",
    render: (r) =>
      h("div", [
        h(RouterLink, { to: `/users/${r.id}`, class: "link" }, { default: () => r.name }),
        h("div", { style: "opacity:.6;font-size:12px" }, r.phone),
      ]),
  },
  {
    title: "Gói",
    key: "sub",
    render: (r) =>
      r.subscription
        ? h(NSpace, { size: 4, align: "center" }, () => [
            h(NTag, { size: "small", type: subStatusType[r.subscription!.status], bordered: false }, () => r.subscription!.status),
            h("span", { style: "font-size:12px" }, r.subscription!.plan?.name ?? ""),
          ])
        : h("span", { style: "opacity:.4" }, "—"),
  },
  {
    title: "Bot",
    key: "bot",
    render: (r) =>
      h(NTag, { size: "small", type: r.botConfig?.isActive ? "success" : "default", bordered: false }, () =>
        r.botConfig?.isActive ? "Đã kết nối" : "Chưa"
      ),
  },
  {
    title: "Vai trò",
    key: "role",
    render: (r) => h(NTag, { size: "small", type: r.role === "ADMIN" ? "primary" : "default", bordered: false }, () => r.role),
  },
  {
    title: "Trạng thái",
    key: "locked",
    render: (r) =>
      h(NTag, { size: "small", type: r.isLocked ? "error" : "success", bordered: false }, () => (r.isLocked ? "Đã khoá" : "Bình thường")),
  },
  {
    title: "Ngày tạo",
    key: "createdAt",
    render: (r) => formatDate(r.createdAt),
  },
  {
    title: "",
    key: "actions",
    align: "right",
    render: (r) =>
      h(NSpace, { justify: "end", size: 6 }, () => [
        h(NButton, { size: "small", tertiary: true, onClick: () => router.push(`/users/${r.id}`) }, () => "Xem"),
        r.isLocked
          ? h(NButton, { size: "small", onClick: () => unlock(r) }, () => "Mở khoá")
          : h(NButton, { size: "small", type: "error", ghost: true, onClick: () => openLock(r) }, () => "Khoá"),
      ]),
  },
];

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<Paginated<AdminUserRow>>("/admin/users", {
      params: { page: pagination.page, limit: pagination.pageSize, search: search.value || undefined },
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

// Lock modal
const lockTarget = ref<AdminUserRow | null>(null);
const lockReason = ref("");
const lockSaving = ref(false);
function openLock(r: AdminUserRow) {
  lockTarget.value = r;
  lockReason.value = "";
}
async function confirmLock() {
  if (!lockTarget.value) return;
  lockSaving.value = true;
  try {
    await api.post(`/admin/users/${lockTarget.value.id}/lock`, { reason: lockReason.value || undefined });
    message.success("Đã khoá tài khoản");
    lockTarget.value = null;
    load();
  } catch (err) {
    message.error(apiError(err));
  } finally {
    lockSaving.value = false;
  }
}
async function unlock(r: AdminUserRow) {
  try {
    await api.post(`/admin/users/${r.id}/unlock`);
    message.success("Đã mở khoá");
    load();
  } catch (err) {
    message.error(apiError(err));
  }
}

async function exportCsv() {
  exporting.value = true;
  try {
    const { data } = await api.get<Paginated<AdminUserRow>>("/admin/users", {
      params: { page: 1, limit: 1000, search: search.value || undefined },
    });
    const csv = toCsv(data.data, [
      { key: "name", label: "Tên" },
      { key: "phone", label: "SĐT" },
      { key: "email", label: "Email" },
      { key: "role", label: "Vai trò" },
      { key: "locked", label: "Khoá", value: (r) => (r.isLocked ? "Có" : "Không") },
      { key: "sub", label: "Gói", value: (r) => r.subscription?.plan?.name ?? "" },
      { key: "subStatus", label: "Trạng thái sub", value: (r) => r.subscription?.status ?? "" },
      { key: "createdAt", label: "Ngày tạo", value: (r) => formatDate(r.createdAt) },
    ]);
    downloadCsv(`users-${Date.now()}`, csv);
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
    <PageHeader title="Người dùng" subtitle="Quản lý tài khoản người dùng" />
    <DataToolbar
      :search="search"
      search-placeholder="Tìm theo SĐT / tên / email"
      :loading="loading"
      show-export
      :exporting="exporting"
      @update:search="onSearch"
      @refresh="load"
      @export="exportCsv"
    />
    <NDataTable
      remote
      :columns="columns"
      :data="rows"
      :loading="loading"
      :pagination="pagination"
      :row-key="(r: AdminUserRow) => r.id"
      @update:page="onPage"
      @update:page-size="onPageSize"
    />

    <NModal
      :show="!!lockTarget"
      preset="card"
      title="Khoá tài khoản"
      style="width: 420px"
      @update:show="(v: boolean) => { if (!v) lockTarget = null; }"
    >
      <NForm>
        <NFormItem label="Lý do (tuỳ chọn)">
          <NInput v-model:value="lockReason" type="textarea" placeholder="Nhập lý do khoá…" :maxlength="200" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="lockTarget = null">Huỷ</NButton>
          <NButton type="error" :loading="lockSaving" @click="confirmLock">Khoá</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
:deep(.link) {
  color: #00582a;
  font-weight: 600;
  text-decoration: none;
}
</style>
