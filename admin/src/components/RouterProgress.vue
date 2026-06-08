<script setup lang="ts">
import { useLoadingBar } from "naive-ui";
import { useRouter } from "vue-router";

const bar = useLoadingBar();
const router = useRouter();

router.beforeEach(() => {
  bar.start();
});
router.afterEach(() => {
  bar.finish();
});
router.onError(() => {
  bar.error();
});
</script>

<template>
  <slot />
</template>
