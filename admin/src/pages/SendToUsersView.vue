<script setup lang="ts">
import { ref } from "vue";
import {
  NCard,
  NForm,
  NFormItem,
  NSelect,
  NInput,
  NSwitch,
  NButton,
  NSpace,
  NAlert,
  useMessage,
  type SelectOption,
} from "naive-ui";
import PageHeader from "@/components/PageHeader.vue";
import { api, apiError } from "@/lib/api";
import type { AdminUserRow, Paginated, SendResult } from "@/types/api";

const message = useMessage();

const selected = ref<string[]>([]);
const messageText = ref("");
const personalized = ref(false);

const options = ref<SelectOption[]>([]);
const userLoading = ref(false);
const sending = ref(false);
const result = ref<SendResult | null>(null);

// Keep labels for already-selected users so they persist when search results change.
const labelMap = new Map<string, string>();

async function onSearch(q: string) {
  if (!q) {
    options.value = [];
    return;
  }
  userLoading.value = true;
  try {
    const { data } = await api.get<Paginated<AdminUserRow>>("/admin/users", {
      params: { search: q, limit: 20 },
    });
    options.value = data.data.map((u) => {
      const label = `${u.name} (${u.phone})`;
      labelMap.set(u.id, label);
      return { label, value: u.id };
    });
  } catch (err) {
    message.error(apiError(err));
  } finally {
    userLoading.value = false;
  }
}

function renderLabel(option: SelectOption): string {
  return (option.label as string) ?? labelMap.get(option.value as string) ?? String(option.value);
}

async function send() {
  if (selected.value.length === 0) {
    message.warning("Vui lòng chọn ít nhất 1 user");
    return;
  }
  if (!messageText.value.trim()) {
    message.warning("Vui lòng nhập nội dung tin nhắn");
    return;
  }
  sending.value = true;
  result.value = null;
  try {
    const { data } = await api.post<SendResult>("/admin/notifications/send", {
      userIds: selected.value,
      message: messageText.value,
      personalized: personalized.value,
    });
    result.value = data;
    message.success("Đã gửi tin nhắn");
  } catch (err) {
    message.error(apiError(err));
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader title="Gửi cho user" subtitle="Gửi tin nhắn tới các user được chọn" />

    <NCard>
      <NForm>
        <NFormItem label="Người nhận">
          <NSelect
            v-model:value="selected"
            multiple
            filterable
            remote
            clearable
            :loading="userLoading"
            :options="options"
            :render-label="renderLabel"
            placeholder="Tìm theo SĐT / tên / email"
            @search="onSearch"
          />
        </NFormItem>

        <NFormItem label="Nội dung">
          <NInput
            v-model:value="messageText"
            type="textarea"
            placeholder="Nhập nội dung tin nhắn…"
            :maxlength="2000"
            show-count
            :autosize="{ minRows: 4, maxRows: 10 }"
          />
        </NFormItem>

        <NFormItem label="Cá nhân hoá">
          <NSwitch v-model:value="personalized" />
        </NFormItem>

        <NSpace justify="end">
          <NButton type="primary" :loading="sending" @click="send">Gửi</NButton>
        </NSpace>
      </NForm>

      <NAlert v-if="result" type="success" :show-icon="true" style="margin-top: 16px">
        Đã gửi: {{ result.sent }} · Thất bại: {{ result.failed }}
      </NAlert>
    </NCard>
  </div>
</template>
