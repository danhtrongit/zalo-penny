<script setup lang="ts">
import { computed } from "vue";
import {
  NConfigProvider,
  NLoadingBarProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
  NGlobalStyle,
  darkTheme,
} from "naive-ui";
import { RouterView } from "vue-router";
import { useUiStore } from "@/stores/ui";
import { buildThemeOverrides } from "@/theme/naive";
import RouterProgress from "@/components/RouterProgress.vue";

const ui = useUiStore();
const theme = computed(() => (ui.dark ? darkTheme : null));
const overrides = computed(() => buildThemeOverrides(ui.dark));
</script>

<template>
  <NConfigProvider :theme="theme" :theme-overrides="overrides">
    <NLoadingBarProvider>
      <NMessageProvider>
        <NDialogProvider>
          <NNotificationProvider>
            <NGlobalStyle />
            <RouterProgress>
              <RouterView />
            </RouterProgress>
          </NNotificationProvider>
        </NDialogProvider>
      </NMessageProvider>
    </NLoadingBarProvider>
  </NConfigProvider>
</template>
