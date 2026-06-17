<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  NGrid,
  NGi,
  NCard,
  NTag,
  NButton,
  NSpace,
  NSpin,
  NEmpty,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NInputNumber,
  useMessage,
  type SelectOption,
} from "naive-ui";
import PageHeader from "@/components/PageHeader.vue";
import { api, apiError } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import type { AdminUserDetail, Plan, Role, SubStatus } from "@/types/api";

const route = useRoute();
const router = useRouter();
const message = useMessage();

const userId = route.params.id as string;

const loading = ref(true);
const detail = ref<AdminUserDetail | null>(null);

const subStatusType: Record<SubStatus, "success" | "warning" | "error" | "default"> = {
  ACTIVE: "success",
  PENDING: "warning",
  EXPIRED: "default",
  CANCELLED: "error",
};

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<AdminUserDetail>(`/admin/users/${userId}`);
    detail.value = data;
  } catch (err) {
    message.error(apiError(err));
  } finally {
    loading.value = false;
  }
}

// Role toggle
const roleSaving = ref(false);
async function toggleRole() {
  if (!detail.value) return;
  const nextRole: Role = detail.value.role === "ADMIN" ? "USER" : "ADMIN";
  roleSaving.value = true;
  try {
    await api.patch(`/admin/users/${userId}/role`, { role: nextRole });
    message.success("Đã cập nhật vai trò");
    await load();
  } catch (err) {
    message.error(apiError(err));
  } finally {
    roleSaving.value = false;
  }
}

// Lock / unlock
const lockSaving = ref(false);
const showLock = ref(false);
const lockReason = ref("");

function openLock() {
  lockReason.value = "";
  showLock.value = true;
}

async function confirmLock() {
  lockSaving.value = true;
  try {
    await api.post(`/admin/users/${userId}/lock`, { reason: lockReason.value || undefined });
    message.success("Đã khoá tài khoản");
    showLock.value = false;
    await load();
  } catch (err) {
    message.error(apiError(err));
  } finally {
    lockSaving.value = false;
  }
}

async function unlock() {
  lockSaving.value = true;
  try {
    await api.post(`/admin/users/${userId}/unlock`);
    message.success("Đã mở khoá");
    await load();
  } catch (err) {
    message.error(apiError(err));
  } finally {
    lockSaving.value = false;
  }
}

// Delete user (danger zone)
const showDelete = ref(false);
const deleteConfirmPhone = ref("");
const deleting = ref(false);

function openDelete() {
  deleteConfirmPhone.value = "";
  showDelete.value = true;
}

async function confirmDelete() {
  deleting.value = true;
  try {
    await api.delete(`/admin/users/${userId}`);
    message.success("Đã xoá người dùng và toàn bộ dữ liệu");
    showDelete.value = false;
    router.push("/users");
  } catch (err) {
    message.error(apiError(err, "Không thể xoá người dùng"));
  } finally {
    deleting.value = false;
  }
}

// Upgrade modal
const showUpgrade = ref(false);
const upgradeSaving = ref(false);
const planOptions = ref<SelectOption[]>([]);
const upgradeForm = ref<{ planSlug: string | null; durationDays: number | null; note: string }>({
  planSlug: null,
  durationDays: null,
  note: "",
});

async function openUpgrade() {
  upgradeForm.value = { planSlug: null, durationDays: null, note: "" };
  showUpgrade.value = true;
  try {
    const { data } = await api.get<Plan[]>("/admin/plans");
    planOptions.value = data.map((p) => ({ label: p.name, value: p.slug }));
  } catch (err) {
    message.error(apiError(err));
  }
}

async function confirmUpgrade() {
  if (!upgradeForm.value.planSlug) {
    message.error("Vui lòng chọn gói");
    return;
  }
  upgradeSaving.value = true;
  try {
    await api.post(`/admin/subscriptions/users/${userId}/upgrade`, {
      planSlug: upgradeForm.value.planSlug,
      durationDays: upgradeForm.value.durationDays ?? undefined,
      note: upgradeForm.value.note || undefined,
    });
    message.success("Đã nâng cấp gói");
    showUpgrade.value = false;
    await load();
  } catch (err) {
    message.error(apiError(err));
  } finally {
    upgradeSaving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader :title="detail?.name ?? 'Người dùng'" :subtitle="detail?.phone">
      <template #actions>
        <NButton tertiary @click="router.push('/users')">← Danh sách</NButton>
        <NButton type="primary" @click="openUpgrade">Nâng cấp gói</NButton>
      </template>
    </PageHeader>

    <NSpin :show="loading">
      <NGrid v-if="detail" cols="1 l:3" responsive="screen" :x-gap="16" :y-gap="16">
        <!-- Gói cước -->
        <NGi>
          <NCard title="Gói cước" size="small">
            <template v-if="detail.subscription">
              <div class="rows">
                <div class="row">
                  <span class="label">Tên gói</span>
                  <span class="value">{{ detail.subscription.plan.name }}</span>
                </div>
                <div class="row">
                  <span class="label">Trạng thái</span>
                  <NTag :type="subStatusType[detail.subscription.status]" size="small" :bordered="false">
                    {{ detail.subscription.status }}
                  </NTag>
                </div>
                <div class="row">
                  <span class="label">Bắt đầu</span>
                  <span class="value">{{ formatDate(detail.subscription.startDate) }}</span>
                </div>
                <div class="row">
                  <span class="label">Kết thúc</span>
                  <span class="value">{{ formatDate(detail.subscription.endDate) }}</span>
                </div>
                <div class="row">
                  <span class="label">Số hoá đơn</span>
                  <span class="value">{{ detail.subscription.invoiceNumber }}</span>
                </div>
              </div>
            </template>
            <NEmpty v-else description="Chưa có gói" />
          </NCard>
        </NGi>

        <!-- Hoạt động -->
        <NGi>
          <NCard title="Hoạt động" size="small">
            <div class="rows">
              <div class="row">
                <span class="label">Giao dịch</span>
                <span class="value">{{ detail._count.transactions }}</span>
              </div>
              <div class="row">
                <span class="label">Hoá đơn</span>
                <span class="value">{{ detail._count.receipts }}</span>
              </div>
              <div class="row">
                <span class="label">Ngân sách</span>
                <span class="value">{{ detail._count.budgets }}</span>
              </div>
              <div class="row">
                <span class="label">Bot</span>
                <NTag :type="detail.botConfig?.isActive ? 'success' : 'default'" size="small" :bordered="false">
                  {{ detail.botConfig?.isActive ? "Đã kết nối" : "Chưa" }}
                </NTag>
              </div>
              <div class="row">
                <span class="label">Loại bot</span>
                <span class="value">{{ detail.botConfig?.kind ?? "—" }}</span>
              </div>
              <div class="row">
                <span class="label">Sức chứa</span>
                <span class="value">{{ detail.botConfig?.capacity ?? "—" }}</span>
              </div>
              <div class="row">
                <span class="label">Kết nối lúc</span>
                <span class="value">{{ formatDateTime(detail.botConfig?.connectedAt) }}</span>
              </div>
            </div>
          </NCard>
        </NGi>

        <!-- Phân quyền -->
        <NGi>
          <NCard title="Phân quyền" size="small">
            <div class="rows">
              <div class="row">
                <span class="label">Vai trò</span>
                <NSpace size="small" align="center">
                  <NTag :type="detail.role === 'ADMIN' ? 'primary' : 'default'" size="small" :bordered="false">
                    {{ detail.role }}
                  </NTag>
                  <NButton size="small" :loading="roleSaving" @click="toggleRole">
                    {{ detail.role === "ADMIN" ? "Hạ xuống USER" : "Nâng lên ADMIN" }}
                  </NButton>
                </NSpace>
              </div>
              <div class="row">
                <span class="label">Trạng thái</span>
                <NSpace size="small" align="center">
                  <NTag :type="detail.isLocked ? 'error' : 'success'" size="small" :bordered="false">
                    {{ detail.isLocked ? "Đã khoá" : "Bình thường" }}
                  </NTag>
                  <NButton
                    v-if="detail.isLocked"
                    size="small"
                    :loading="lockSaving"
                    @click="unlock"
                  >
                    Mở khoá
                  </NButton>
                  <NButton v-else size="small" type="error" ghost @click="openLock">Khoá</NButton>
                </NSpace>
              </div>
              <div v-if="detail.role === 'USER'" class="row">
                <span class="label">Nguy hiểm</span>
                <NButton
                  v-if="detail && detail.role === 'USER'"
                  size="small"
                  type="error"
                  @click="openDelete"
                >
                  Xoá người dùng
                </NButton>
              </div>
              <div v-if="detail.isLocked" class="row">
                <span class="label">Lý do khoá</span>
                <span class="value">{{ detail.lockedReason ?? "—" }}</span>
              </div>
            </div>
          </NCard>
        </NGi>
      </NGrid>
    </NSpin>

    <!-- Lock modal -->
    <NModal
      :show="showLock"
      preset="card"
      title="Khoá tài khoản"
      style="width: 420px"
      @update:show="(v: boolean) => (showLock = v)"
    >
      <NForm>
        <NFormItem label="Lý do (tuỳ chọn)">
          <NInput v-model:value="lockReason" type="textarea" placeholder="Nhập lý do khoá…" :maxlength="200" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showLock = false">Huỷ</NButton>
          <NButton type="error" :loading="lockSaving" @click="confirmLock">Khoá</NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- Delete modal -->
    <NModal v-model:show="showDelete" preset="dialog" type="error" title="Xoá người dùng vĩnh viễn">
      <template #default>
        <p>
          Hành động này <strong>không thể hoàn tác</strong>. Toàn bộ dữ liệu của người dùng
          (giao dịch, ngân sách, hoá đơn, hội thoại, bot, gói &amp; thanh toán) sẽ bị xoá.
        </p>
        <p style="margin-top: 8px">
          Nhập số điện thoại <strong>{{ detail?.phone }}</strong> để xác nhận:
        </p>
        <NInput
          v-model:value="deleteConfirmPhone"
          placeholder="Số điện thoại của người dùng"
          style="margin-top: 8px"
        />
      </template>
      <template #action>
        <NButton @click="showDelete = false">Huỷ</NButton>
        <NButton
          type="error"
          :loading="deleting"
          :disabled="deleteConfirmPhone !== detail?.phone"
          @click="confirmDelete"
        >
          Xoá vĩnh viễn
        </NButton>
      </template>
    </NModal>

    <!-- Upgrade modal -->
    <NModal
      :show="showUpgrade"
      preset="card"
      title="Nâng cấp gói"
      style="width: 480px"
      @update:show="(v: boolean) => (showUpgrade = v)"
    >
      <NForm>
        <NFormItem label="Gói cước">
          <NSelect
            v-model:value="upgradeForm.planSlug"
            :options="planOptions"
            placeholder="Chọn gói"
          />
        </NFormItem>
        <NFormItem label="Số ngày (tuỳ chọn)">
          <NInputNumber
            v-model:value="upgradeForm.durationDays"
            :min="1"
            placeholder="Mặc định theo gói"
            style="width: 100%"
          />
        </NFormItem>
        <NFormItem label="Ghi chú (tuỳ chọn)">
          <NInput
            v-model:value="upgradeForm.note"
            type="textarea"
            placeholder="Nhập ghi chú…"
            :maxlength="300"
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showUpgrade = false">Huỷ</NButton>
          <NButton type="primary" :loading="upgradeSaving" @click="confirmUpgrade">Nâng cấp</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.label {
  font-size: 13px;
  opacity: 0.6;
}
.value {
  font-size: 14px;
  font-weight: 600;
  text-align: right;
}
</style>
