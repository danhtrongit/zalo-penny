<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NCheckboxGroup,
  NCheckbox,
  NSpace,
  NSwitch,
  NButton,
  NAlert,
  useMessage,
} from "naive-ui";
import PageHeader from "@/components/PageHeader.vue";
import { api, apiError } from "@/lib/api";
import type { Plan, SendResult } from "@/types/api";

const message = useMessage();

const messageText = ref("");
const personalized = ref(false);
const selectedPlans = ref<string[]>([]);
const plans = ref<Plan[]>([]);
const sending = ref(false);
const result = ref<SendResult | null>(null);

async function loadPlans() {
  try {
    const { data } = await api.get<Plan[]>("/admin/plans");
    plans.value = data;
  } catch (err) {
    message.error(apiError(err));
  }
}

async function send() {
  const text = messageText.value.trim();
  if (!text) {
    message.warning("Vui lòng nhập nội dung thông báo");
    return;
  }
  sending.value = true;
  try {
    const { data } = await api.post<SendResult>("/admin/notifications/broadcast", {
      message: text,
      personalized: personalized.value,
      planSlugs: selectedPlans.value.length ? selectedPlans.value : undefined,
    });
    result.value = data;
    message.success("Đã gửi thông báo");
  } catch (err) {
    message.error(apiError(err));
  } finally {
    sending.value = false;
  }
}

onMounted(loadPlans);
</script>

<template>
  <div>
    <PageHeader title="Gửi thông báo" subtitle="Phát thông báo tới người dùng" />

    <NCard size="small">
      <NForm>
        <NFormItem label="Nội dung">
          <NInput
            v-model:value="messageText"
            type="textarea"
            placeholder="Nhập nội dung thông báo…"
            :rows="5"
            :maxlength="2000"
            show-count
          />
        </NFormItem>

        <NFormItem label="Lọc theo gói">
          <NCheckboxGroup v-model:value="selectedPlans">
            <NSpace>
              <NCheckbox v-for="p in plans" :key="p.slug" :value="p.slug" :label="p.name" />
            </NSpace>
          </NCheckboxGroup>
        </NFormItem>

        <NFormItem label="Cá nhân hoá theo persona">
          <NSwitch v-model:value="personalized" />
        </NFormItem>

        <NSpace justify="end">
          <NButton type="primary" :loading="sending" @click="send">Gửi</NButton>
        </NSpace>
      </NForm>

      <NAlert
        v-if="result"
        type="success"
        :bordered="false"
        style="margin-top: 16px"
      >
        Đã gửi: {{ result.sent }} · Thất bại: {{ result.failed }}
      </NAlert>
    </NCard>
  </div>
</template>
