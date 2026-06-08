<script setup lang="ts">
import { h, onMounted, ref } from "vue";
import {
  NDataTable,
  NTag,
  NButton,
  NSpace,
  NModal,
  NInput,
  NInputNumber,
  NForm,
  NFormItem,
  NSwitch,
  useMessage,
  type DataTableColumns,
  type FormInst,
  type FormRules,
} from "naive-ui";
import PageHeader from "@/components/PageHeader.vue";
import ConfirmButton from "@/components/ConfirmButton.vue";
import { api, apiError } from "@/lib/api";
import { formatVnd } from "@/lib/format";
import type { Plan } from "@/types/api";

const message = useMessage();

const plans = ref<Plan[]>([]);
const loading = ref(false);

const columns: DataTableColumns<Plan> = [
  { title: "Tên gói", key: "name" },
  {
    title: "Slug",
    key: "slug",
    render: (r) => h("span", { style: "font-family:monospace;font-size:12px;opacity:.7" }, r.slug),
  },
  {
    title: "Giá",
    key: "price",
    render: (r) => formatVnd(r.price),
  },
  {
    title: "Thời hạn",
    key: "durationDays",
    render: (r) => `${r.durationDays} ngày`,
  },
  {
    title: "Subscription",
    key: "subscriptions",
    render: (r) => r._count?.subscriptions ?? 0,
  },
  {
    title: "Trạng thái",
    key: "isActive",
    render: (r) =>
      h(NTag, { size: "small", type: r.isActive ? "success" : "default", bordered: false }, () =>
        r.isActive ? "Đang bán" : "Tắt"
      ),
  },
  {
    title: "",
    key: "actions",
    align: "right",
    render: (r) =>
      h(NSpace, { justify: "end", size: 6 }, () => [
        h(NButton, { size: "small", tertiary: true, onClick: () => openEdit(r) }, () => "Sửa"),
        h(ConfirmButton, {
          label: "Xoá",
          type: "error",
          size: "small",
          confirmText: "Xoá gói này?",
          onConfirm: () => remove(r),
        }),
      ]),
  },
];

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<Plan[]>("/admin/plans");
    plans.value = data;
  } catch (err) {
    message.error(apiError(err));
  } finally {
    loading.value = false;
  }
}

async function remove(r: Plan) {
  try {
    const { data } = await api.delete<{ ok?: boolean; softDeleted?: boolean }>(`/admin/plans/${r.id}`);
    if (data?.softDeleted) {
      message.info("Gói còn subscription nên chỉ ẩn");
    } else {
      message.success("Đã xoá gói");
    }
    load();
  } catch (err) {
    message.error(apiError(err));
  }
}

// Create / Edit modal
const showModal = ref(false);
const editingId = ref<string | null>(null);
const saving = ref(false);
const formRef = ref<FormInst | null>(null);

interface PlanForm {
  name: string;
  slug: string;
  durationDays: number;
  price: number;
  description: string;
  isActive: boolean;
}

function emptyForm(): PlanForm {
  return { name: "", slug: "", durationDays: 30, price: 0, description: "", isActive: true };
}

const form = ref<PlanForm>(emptyForm());

const rules: FormRules = {
  name: [{ required: true, max: 120, message: "Tên gói tối đa 120 ký tự", trigger: ["input", "blur"] }],
  slug: [
    { required: true, message: "Bắt buộc nhập slug", trigger: ["input", "blur"] },
    { pattern: /^[a-z0-9-]+$/, message: "chữ thường, số, gạch ngang", trigger: ["input", "blur"] },
  ],
  durationDays: [
    { type: "number", required: true, message: "Bắt buộc nhập thời hạn", trigger: ["change", "blur"] },
  ],
  price: [{ type: "number", required: true, message: "Bắt buộc nhập giá", trigger: ["change", "blur"] }],
  description: [{ max: 500, message: "Mô tả tối đa 500 ký tự", trigger: ["input", "blur"] }],
};

function openCreate() {
  editingId.value = null;
  form.value = emptyForm();
  showModal.value = true;
}

function openEdit(r: Plan) {
  editingId.value = r.id;
  form.value = {
    name: r.name,
    slug: r.slug,
    durationDays: r.durationDays,
    price: r.price,
    description: r.description ?? "",
    isActive: r.isActive,
  };
  showModal.value = true;
}

async function save() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  saving.value = true;
  try {
    const payload = {
      name: form.value.name,
      slug: form.value.slug,
      durationDays: form.value.durationDays,
      price: form.value.price,
      description: form.value.description || undefined,
      isActive: form.value.isActive,
    };
    if (editingId.value) {
      await api.patch(`/admin/plans/${editingId.value}`, payload);
      message.success("Đã cập nhật gói");
    } else {
      await api.post("/admin/plans", payload);
      message.success("Đã tạo gói");
    }
    showModal.value = false;
    load();
  } catch (err) {
    message.error(apiError(err));
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader title="Gói cước" subtitle="Quản lý các gói cước">
      <template #actions>
        <NButton type="primary" @click="openCreate">Thêm gói</NButton>
      </template>
    </PageHeader>

    <NDataTable
      :columns="columns"
      :data="plans"
      :loading="loading"
      :row-key="(r: Plan) => r.id"
    />

    <NModal
      v-model:show="showModal"
      preset="card"
      :title="editingId ? 'Sửa gói' : 'Thêm gói'"
      style="width: 480px"
    >
      <NForm ref="formRef" :model="form" :rules="rules" label-placement="top">
        <NFormItem label="Tên gói" path="name">
          <NInput v-model:value="form.name" placeholder="Nhập tên gói…" :maxlength="120" />
        </NFormItem>
        <NFormItem label="Slug" path="slug">
          <NInput v-model:value="form.slug" placeholder="vi-du-goi-thang" />
        </NFormItem>
        <NFormItem label="Thời hạn (ngày)" path="durationDays">
          <NInputNumber v-model:value="form.durationDays" :min="1" style="width: 100%" />
        </NFormItem>
        <NFormItem label="Giá (₫)" path="price">
          <NInputNumber v-model:value="form.price" :min="0" style="width: 100%" />
        </NFormItem>
        <NFormItem label="Mô tả" path="description">
          <NInput
            v-model:value="form.description"
            type="textarea"
            placeholder="Mô tả gói (tuỳ chọn)…"
            :maxlength="500"
          />
        </NFormItem>
        <NFormItem label="Đang bán" path="isActive">
          <NSwitch v-model:value="form.isActive" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showModal = false">Huỷ</NButton>
          <NButton type="primary" :loading="saving" @click="save">Lưu</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>
