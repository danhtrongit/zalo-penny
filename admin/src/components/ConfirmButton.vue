<script setup lang="ts">
import { NPopconfirm, NButton } from "naive-ui";
import type { ButtonProps } from "naive-ui";

withDefaults(
  defineProps<{
    confirmText?: string;
    label: string;
    type?: ButtonProps["type"];
    size?: ButtonProps["size"];
    loading?: boolean;
    disabled?: boolean;
  }>(),
  { confirmText: "Bạn chắc chắn?", type: "default", size: "small" }
);

const emit = defineEmits<{ (e: "confirm"): void }>();
</script>

<template>
  <NPopconfirm @positive-click="emit('confirm')">
    <template #trigger>
      <NButton :type="type" :size="size" :loading="loading" :disabled="disabled">
        {{ label }}
      </NButton>
    </template>
    {{ confirmText }}
  </NPopconfirm>
</template>
