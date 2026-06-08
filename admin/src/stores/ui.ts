import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";

export const useUiStore = defineStore("ui", () => {
  const dark = useStorage("penny_admin_dark", false);
  const siderCollapsed = useStorage("penny_admin_sider", false);

  function toggleDark() {
    dark.value = !dark.value;
  }

  return { dark, siderCollapsed, toggleDark };
});
