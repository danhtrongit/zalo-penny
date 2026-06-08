<script setup lang="ts">
import { computed } from "vue";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import VChart from "vue-echarts";
import { useUiStore } from "@/stores/ui";

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent]);

interface Series {
  name: string;
  data: number[];
  color?: string;
}

const props = withDefaults(
  defineProps<{
    categories: string[];
    series: Series[];
    height?: string;
    valueFormatter?: (v: number) => string;
  }>(),
  { height: "300px" }
);

const ui = useUiStore();

const option = computed(() => ({
  darkMode: ui.dark,
  backgroundColor: "transparent",
  tooltip: {
    trigger: "axis",
    valueFormatter: props.valueFormatter,
  },
  legend: { bottom: 0 },
  grid: { left: 8, right: 16, top: 16, bottom: 36, containLabel: true },
  xAxis: {
    type: "category",
    boundaryGap: false,
    data: props.categories,
  },
  yAxis: { type: "value" },
  series: props.series.map((s) => ({
    name: s.name,
    type: "line",
    smooth: true,
    showSymbol: false,
    areaStyle: { opacity: 0.08 },
    lineStyle: { width: 2 },
    itemStyle: s.color ? { color: s.color } : undefined,
    data: s.data,
  })),
}));
</script>

<template>
  <VChart
    :option="option"
    :style="{ height: props.height, width: '100%' }"
    autoresize
  />
</template>
