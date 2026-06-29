<script setup lang="ts">
import { computed, h, ref } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import {
  NLayout,
  NLayoutSider,
  NLayoutHeader,
  NLayoutContent,
  NMenu,
  NIcon,
  NButton,
  NDropdown,
  NAvatar,
  type MenuOption,
} from "naive-ui";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();
const collapsed = ref(ui.siderCollapsed);

function icon(path: string) {
  return () =>
    h(NIcon, null, {
      default: () =>
        h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
          h("path", { d: path }),
        ]),
    });
}

const menuOptions: MenuOption[] = [
  { label: () => h(RouterLink, { to: "/" }, { default: () => "Tổng quan" }), key: "dashboard", icon: icon("M3 13h8V3H3zM13 21h8v-8h-8zM13 3v6h8V3zM3 21h8v-6H3z") },
  { label: () => h(RouterLink, { to: "/users" }, { default: () => "Người dùng" }), key: "users", icon: icon("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75") },
  { label: () => h(RouterLink, { to: "/plans" }, { default: () => "Gói cước" }), key: "plans", icon: icon("M16.5 9.4 7.5 4.21M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12") },
  { label: () => h(RouterLink, { to: "/bots" }, { default: () => "Bot Pool" }), key: "bots", icon: icon("M12 8V4H8M4 8h16v12H4zM2 14h2M20 14h2M9 13v2M15 13v2") },
  { label: () => h(RouterLink, { to: "/payments" }, { default: () => "Thanh toán" }), key: "payments", icon: icon("M1 4h22v16H1zM1 10h22") },
  { label: () => h(RouterLink, { to: "/notifications" }, { default: () => "Gửi thông báo" }), key: "notifications", icon: icon("M3 11l18-8-8 18-2-7-8-3z") },
  { label: () => h(RouterLink, { to: "/send" }, { default: () => "Gửi cho user" }), key: "send", icon: icon("M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z") },
  { label: () => h(RouterLink, { to: "/reminders" }, { default: () => "Nhắc nhở" }), key: "reminders", icon: icon("M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0") },
  { label: () => h(RouterLink, { to: "/audit" }, { default: () => "Lịch sử admin" }), key: "audit", icon: icon("M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8") },
  { label: () => h(RouterLink, { to: "/settings" }, { default: () => "Cài đặt" }), key: "settings", icon: icon("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z") },
];

const activeKey = computed(() => (route.name as string) || "dashboard");

const userMenuOptions = [{ label: "Đăng xuất", key: "logout" }];
function onUserMenu(key: string) {
  if (key === "logout") {
    auth.logout();
    router.push("/login");
  }
}

const DarkIcon = () =>
  h("svg", { viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", "stroke-width": "2" }, [
    h("path", { d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" }),
  ]);
</script>

<template>
  <NLayout has-sider style="height: 100vh">
    <NLayoutSider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="232"
      :collapsed="collapsed"
      show-trigger
      @collapse="() => { collapsed = true; ui.siderCollapsed = true; }"
      @expand="() => { collapsed = false; ui.siderCollapsed = false; }"
    >
      <div class="brand">
        <span class="dot" />
        <span v-if="!collapsed" class="penny-brand">Penny Admin</span>
      </div>
      <NMenu
        :value="activeKey"
        :options="menuOptions"
        :collapsed="collapsed"
        :collapsed-width="64"
        :indent="18"
      />
    </NLayoutSider>

    <NLayout>
      <NLayoutHeader bordered class="header">
        <div class="spacer" />
        <NButton quaternary circle @click="ui.toggleDark()">
          <template #icon><NIcon :component="DarkIcon" /></template>
        </NButton>
        <NDropdown :options="userMenuOptions" @select="onUserMenu">
          <div class="user">
            <NAvatar round size="small" :style="{ background: '#00582a' }">
              {{ (auth.user?.name || 'A').charAt(0).toUpperCase() }}
            </NAvatar>
            <span class="uname">{{ auth.user?.name || 'Admin' }}</span>
          </div>
        </NDropdown>
      </NLayoutHeader>
      <NLayoutContent class="content" content-style="padding: 24px;">
        <RouterView />
      </NLayoutContent>
    </NLayout>
  </NLayout>
</template>

<style scoped>
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 56px;
  padding: 0 18px;
  font-size: 16px;
}
.brand .dot {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: #00582a;
  flex-shrink: 0;
}
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 20px;
}
.spacer {
  flex: 1;
}
.user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
}
.uname {
  font-size: 14px;
  font-weight: 500;
}
.content {
  background: transparent;
}
</style>
