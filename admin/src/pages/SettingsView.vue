<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  NCard,
  NInputNumber,
  NButton,
  NStatistic,
  NGrid,
  NGi,
  NSpin,
  useMessage,
} from "naive-ui";
import PageHeader from "@/components/PageHeader.vue";
import { api, apiError } from "@/lib/api";
import { formatVnd, formatNumber } from "@/lib/format";

const message = useMessage();

const loading = ref(true);
const saving = ref(false);
const commissionPct = ref<number>(10);
const referredUsers = ref(0);
const totalCommission = ref(0);
const commissionCount = ref(0);

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get("/admin/settings");
    commissionPct.value = data.commissionPct ?? 10;
    referredUsers.value = data.referredUsers ?? 0;
    totalCommission.value = data.totalCommission ?? 0;
    commissionCount.value = data.commissionCount ?? 0;
  } catch (err) {
    message.error(apiError(err));
  } finally {
    loading.value = false;
  }
}

async function save() {
  const pct = commissionPct.value;
  if (pct == null || !Number.isInteger(pct) || pct < 0 || pct > 100) {
    message.error("Hoa hồng phải là số nguyên từ 0 đến 100");
    return;
  }
  saving.value = true;
  try {
    await api.patch("/admin/settings/commission", { pct });
    message.success(`Đã lưu hoa hồng ${pct}%`);
    await load();
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
    <PageHeader title="Cài đặt" subtitle="Mã giới thiệu & hoa hồng" />

    <NSpin :show="loading">
      <NGrid :cols="3" :x-gap="16" :y-gap="16" responsive="screen" style="margin-bottom: 16px">
        <NGi>
          <NCard size="small">
            <NStatistic label="Người được giới thiệu" :value="formatNumber(referredUsers)" />
          </NCard>
        </NGi>
        <NGi>
          <NCard size="small">
            <NStatistic label="Số lần trả hoa hồng" :value="formatNumber(commissionCount)" />
          </NCard>
        </NGi>
        <NGi>
          <NCard size="small">
            <NStatistic label="Tổng hoa hồng đã trả" :value="formatVnd(totalCommission)" />
          </NCard>
        </NGi>
      </NGrid>

      <NCard title="Hoa hồng giới thiệu" size="small" style="max-width: 480px">
        <p style="margin: 0 0 12px; opacity: 0.7; font-size: 13px">
          Phần trăm hoa hồng người giới thiệu nhận được khi người được giới thiệu mua gói.
          Áp dụng cho các giao dịch mới.
        </p>
        <div style="display: flex; gap: 12px; align-items: center">
          <NInputNumber
            v-model:value="commissionPct"
            :min="0"
            :max="100"
            :precision="0"
            style="width: 160px"
          >
            <template #suffix>%</template>
          </NInputNumber>
          <NButton type="primary" :loading="saving" @click="save">Lưu</NButton>
        </div>
      </NCard>
    </NSpin>
  </div>
</template>
