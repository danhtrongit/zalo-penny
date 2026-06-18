<script setup lang="ts">
import { h, onMounted, reactive, ref } from "vue";
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
  NAlert,
  useMessage,
  type DataTableColumns,
} from "naive-ui";
import PageHeader from "@/components/PageHeader.vue";
import ConfirmButton from "@/components/ConfirmButton.vue";
import { api, apiError } from "@/lib/api";
import type { BotPoolItem, BotsResponse } from "@/types/api";

const message = useMessage();

const bots = ref<BotPoolItem[]>([]);
const awaiting = ref(0);
const loading = ref(false);

interface BotForm {
  label: string;
  botToken: string;
  capacity: number;
  botLink: string;
  isActive: boolean;
}

function emptyForm(): BotForm {
  return {
    label: "",
    botToken: "",
    capacity: 5,
    botLink: "",
    isActive: true,
  };
}

const showModal = ref(false);
const editingId = ref<string | null>(null);
const saving = ref(false);
const form = reactive<BotForm>(emptyForm());

function truncate(value: string, max = 60): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

const columns: DataTableColumns<BotPoolItem> = [
  {
    title: "Nhãn",
    key: "label",
    render: (r) => r.label || h("span", { style: "opacity:.4" }, "—"),
  },
  {
    title: "Tải",
    key: "load",
    render: (r) => `${r._count.assignments}/${r.capacity}`,
  },
  {
    title: "Người dùng",
    key: "assignments",
    render: (r) => {
      const names = r.assignments.map((a) => a.user.name).join(", ");
      return names
        ? h("span", { title: names }, truncate(names))
        : h("span", { style: "opacity:.4" }, "—");
    },
  },
  {
    title: "Trạng thái",
    key: "isActive",
    render: (r) =>
      h(NTag, { size: "small", type: r.isActive ? "success" : "default", bordered: false }, () =>
        r.isActive ? "Bật" : "Tắt"
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
          confirmText: "Xoá bot này?",
          onConfirm: () => removeBot(r),
        }),
      ]),
  },
];

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<BotsResponse>("/admin/bots");
    bots.value = data.bots;
    awaiting.value = data.awaiting;
  } catch (err) {
    message.error(apiError(err));
  } finally {
    loading.value = false;
  }
}

async function removeBot(r: BotPoolItem) {
  try {
    await api.delete(`/admin/bots/${r.id}`);
    message.success("Đã xoá bot");
    load();
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 409) {
      message.error(apiError(err, "Bot còn người dùng, không thể xoá"));
    } else {
      message.error(apiError(err));
    }
  }
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  showModal.value = true;
}

function openEdit(r: BotPoolItem) {
  editingId.value = r.id;
  Object.assign(form, {
    label: r.label ?? "",
    botToken: "",
    capacity: r.capacity,
    botLink: r.botLink ?? "",
    isActive: r.isActive,
  });
  showModal.value = true;
}

async function save() {
  if (!form.label.trim()) {
    message.error("Vui lòng nhập nhãn");
    return;
  }
  if (!editingId.value && !form.botToken.trim()) {
    message.error("Vui lòng nhập bot token");
    return;
  }
  if (!form.botLink.trim()) {
    message.error("Vui lòng nhập link bot (dùng để tạo QR)");
    return;
  }
  saving.value = true;
  try {
    if (editingId.value) {
      const payload: Record<string, unknown> = {
        label: form.label.trim(),
        capacity: form.capacity,
        botLink: form.botLink.trim(),
        isActive: form.isActive,
      };
      if (form.botToken.trim()) {
        payload.botToken = form.botToken.trim();
      }
      await api.patch(`/admin/bots/${editingId.value}`, payload);
      message.success("Đã cập nhật bot");
    } else {
      await api.post("/admin/bots", {
        label: form.label.trim(),
        botToken: form.botToken.trim(),
        capacity: form.capacity,
        botLink: form.botLink.trim(),
        isActive: form.isActive,
      });
      message.success("Đã thêm bot");
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
    <PageHeader title="Bot Pool" subtitle="Quản lý nhóm bot cấp cho người dùng">
      <template #actions>
        <NButton type="primary" @click="openCreate">Thêm bot</NButton>
      </template>
    </PageHeader>

    <NAlert v-if="awaiting > 0" type="warning" :bordered="false" style="margin-bottom: 16px">
      Có {{ awaiting }} người dùng đang chờ cấp bot
    </NAlert>

    <NDataTable
      :columns="columns"
      :data="bots"
      :loading="loading"
      :row-key="(r: BotPoolItem) => r.id"
    />

    <NModal
      v-model:show="showModal"
      preset="card"
      :title="editingId ? 'Sửa bot' : 'Thêm bot'"
      style="width: 480px"
    >
      <NForm>
        <NFormItem label="Nhãn" required>
          <NInput v-model:value="form.label" placeholder="Nhập nhãn bot" :maxlength="100" />
        </NFormItem>
        <NFormItem :label="editingId ? 'Bot token (để trống nếu không đổi)' : 'Bot token'" :required="!editingId">
          <NInput
            v-model:value="form.botToken"
            type="password"
            show-password-on="click"
            :placeholder="editingId ? 'Nhập để thay token mới' : 'Nhập bot token'"
          />
        </NFormItem>
        <NFormItem label="Sức chứa">
          <NInputNumber v-model:value="form.capacity" :min="1" style="width: 100%" />
        </NFormItem>
        <NFormItem label="Link bot (tạo QR & nút truy cập tự động)" required>
          <NInput v-model:value="form.botLink" placeholder="https://zalo.me/<id>?src=qr" />
        </NFormItem>
        <NFormItem label="Kích hoạt">
          <NSwitch v-model:value="form.isActive" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showModal = false">Huỷ</NButton>
          <NButton type="primary" :loading="saving" @click="save">
            {{ editingId ? "Lưu" : "Thêm" }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>
