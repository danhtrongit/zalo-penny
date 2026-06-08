<script setup lang="ts">
import { NInput, NButton, NIcon } from "naive-ui";
import { h } from "vue";

withDefaults(
  defineProps<{
    search?: string;
    searchPlaceholder?: string;
    loading?: boolean;
    showExport?: boolean;
    exporting?: boolean;
  }>(),
  { searchPlaceholder: "Tìm kiếm…", showExport: false }
);

const emit = defineEmits<{
  (e: "update:search", value: string): void;
  (e: "refresh"): void;
  (e: "export"): void;
}>();

const SearchIcon = () =>
  h(
    "svg",
    { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", "stroke-width": "2" },
    [h("circle", { cx: "11", cy: "11", r: "7" }), h("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })]
  );
</script>

<template>
  <div class="toolbar">
    <div class="left">
      <slot name="filters" />
      <NInput
        :value="search"
        :placeholder="searchPlaceholder"
        clearable
        style="max-width: 280px"
        @update:value="(v: string) => emit('update:search', v)"
      >
        <template #prefix>
          <NIcon :component="SearchIcon" />
        </template>
      </NInput>
    </div>
    <div class="right">
      <slot name="actions" />
      <NButton
        v-if="showExport"
        secondary
        :loading="exporting"
        @click="emit('export')"
      >
        Xuất CSV
      </NButton>
      <NButton :loading="loading" @click="emit('refresh')">Làm mới</NButton>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.left,
.right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
