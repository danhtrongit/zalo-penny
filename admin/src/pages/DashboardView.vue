<script setup lang="ts">
import { onMounted, ref } from "vue";
import { NGrid, NGi, NCard, NStatistic, NList, NListItem, NThing, NSpin, NEmpty, useMessage } from "naive-ui";
import PageHeader from "@/components/PageHeader.vue";
import LineChart from "@/components/LineChart.vue";
import { api, apiError } from "@/lib/api";
import { formatVnd, formatNumber, formatDateTime } from "@/lib/format";
import { CHART_ACCENT, PRIMARY } from "@/theme/tokens";
import type { StatsOverview, TimeseriesResponse } from "@/types/api";

const message = useMessage();
const loading = ref(true);
const overview = ref<StatsOverview | null>(null);

const revenueDates = ref<string[]>([]);
const revenueValues = ref<number[]>([]);
const signupDates = ref<string[]>([]);
const signupValues = ref<number[]>([]);

const tiles = ref<{ label: string; value: string }[]>([]);

async function load() {
  loading.value = true;
  try {
    const [ov, rev, signups] = await Promise.all([
      api.get<StatsOverview>("/admin/stats/overview"),
      api.get<TimeseriesResponse>("/admin/stats/timeseries", { params: { metric: "revenue", range: "30d" } }),
      api.get<TimeseriesResponse>("/admin/stats/timeseries", { params: { metric: "signups", range: "30d" } }),
    ]);
    overview.value = ov.data;
    tiles.value = [
      { label: "Tổng người dùng", value: formatNumber(ov.data.totalUsers) },
      { label: "Đang khoá", value: formatNumber(ov.data.lockedUsers) },
      { label: "Sub đang hoạt động", value: formatNumber(ov.data.activeSubs) },
      { label: "Sub chờ duyệt", value: formatNumber(ov.data.pendingSubs) },
      { label: "Thanh toán tháng này", value: formatNumber(ov.data.paidThisMonth) },
      { label: "Doanh thu tháng này", value: formatVnd(ov.data.revenueThisMonth) },
      { label: "Doanh thu tất cả", value: formatVnd(ov.data.revenueAllTime) },
    ];
    revenueDates.value = rev.data.points.map((p) => p.date.slice(5));
    revenueValues.value = rev.data.points.map((p) => p.value);
    signupDates.value = signups.data.points.map((p) => p.date.slice(5));
    signupValues.value = signups.data.points.map((p) => p.value);
  } catch (err) {
    message.error(apiError(err));
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader title="Tổng quan" subtitle="Số liệu hệ thống Penny" />
    <NSpin :show="loading">
      <NGrid cols="2 s:3 l:4" responsive="screen" :x-gap="16" :y-gap="16">
        <NGi v-for="t in tiles" :key="t.label">
          <NCard size="small">
            <NStatistic :label="t.label">
              <span style="font-size: 22px; font-weight: 700">{{ t.value }}</span>
            </NStatistic>
          </NCard>
        </NGi>
      </NGrid>

      <NGrid cols="1 l:2" responsive="screen" :x-gap="16" :y-gap="16" style="margin-top: 16px">
        <NGi>
          <NCard title="Doanh thu 30 ngày" size="small">
            <LineChart
              :categories="revenueDates"
              :series="[{ name: 'Doanh thu', data: revenueValues, color: PRIMARY }]"
              :value-formatter="(v) => formatVnd(v)"
            />
          </NCard>
        </NGi>
        <NGi>
          <NCard title="Đăng ký mới 30 ngày" size="small">
            <LineChart
              :categories="signupDates"
              :series="[{ name: 'Đăng ký', data: signupValues, color: CHART_ACCENT }]"
            />
          </NCard>
        </NGi>
      </NGrid>

      <NCard title="Đăng ký gần đây" size="small" style="margin-top: 16px">
        <NList v-if="overview?.recentSignups?.length">
          <NListItem v-for="u in overview.recentSignups" :key="u.id">
            <NThing :title="u.name" :description="u.phone" />
            <template #suffix>
              <span style="opacity: 0.6">{{ formatDateTime(u.createdAt) }}</span>
            </template>
          </NListItem>
        </NList>
        <NEmpty v-else description="Chưa có dữ liệu" />
      </NCard>
    </NSpin>
  </div>
</template>
