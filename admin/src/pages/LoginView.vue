<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { NCard, NForm, NFormItem, NInput, NButton, useMessage } from "naive-ui";
import { useAuthStore } from "@/stores/auth";
import { apiError } from "@/lib/api";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const message = useMessage();

const phone = ref("");
const password = ref("");
const loading = ref(false);

async function submit() {
  if (!phone.value || !password.value) {
    message.warning("Nhập số điện thoại và mật khẩu");
    return;
  }
  loading.value = true;
  try {
    await auth.login(phone.value.trim(), password.value);
    const redirect = (route.query.redirect as string) || "/";
    router.push(redirect);
  } catch (err) {
    message.error(apiError(err, "Đăng nhập thất bại"));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-wrap">
    <NCard class="login-card" :bordered="false">
      <div class="logo">
        <span class="dot" />
        <span class="penny-brand">Penny Admin</span>
      </div>
      <p class="hint">Đăng nhập bằng tài khoản quản trị</p>
      <NForm @submit.prevent="submit">
        <NFormItem label="Số điện thoại">
          <NInput v-model:value="phone" placeholder="0xxxxxxxxx" @keyup.enter="submit" />
        </NFormItem>
        <NFormItem label="Mật khẩu">
          <NInput
            v-model:value="password"
            type="password"
            show-password-on="click"
            placeholder="••••••••"
            @keyup.enter="submit"
          />
        </NFormItem>
        <NButton type="primary" block :loading="loading" attr-type="submit" @click="submit">
          Đăng nhập
        </NButton>
      </NForm>
    </NCard>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #00582a 0%, #003d1d 100%);
  padding: 20px;
}
.login-card {
  width: 380px;
  max-width: 100%;
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
}
.logo .dot {
  width: 16px;
  height: 16px;
  border-radius: 5px;
  background: #00582a;
}
.hint {
  margin: 6px 0 20px;
  font-size: 13px;
  opacity: 0.6;
}
</style>
