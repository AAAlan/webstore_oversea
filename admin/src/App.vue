<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { clearAdminToken, getAdminRole, getAdminToken, setAdminToken, adminApi } from "./api.js";
import PublishBar from "./components/PublishBar.vue";
import ContentPanel from "./panels/ContentPanel.vue";
import GameDeliveryPanel from "./panels/GameDeliveryPanel.vue";
import ProductPanel from "./panels/ProductPanel.vue";
import ProductTypePanel from "./panels/ProductTypePanel.vue";
import TranslationPanel from "./panels/TranslationPanel.vue";

const loggedIn = ref(!!getAdminToken());
const loginToken = ref(getAdminToken());
const activeTab = ref("content");
const loading = ref(false);
const toast = ref({ type: "", text: "" });

const contentPanelRef = ref(null);
const productPanelRef = ref(null);
const productTypePanelRef = ref(null);
const gameDeliveryPanelRef = ref(null);
const translationPanelRef = ref(null);
const publishStatus = ref(null);
const adminRole = computed(() => getAdminRole());

const mainNavItems = [
  { id: "content", label: "页面内容管理", icon: "◫" },
  { id: "products", label: "商品管理", icon: "▣" },
  { id: "gameDelivery", label: "游戏发货配置", icon: "↗" },
  { id: "translations", label: "多语言管理", icon: "◎" },
];

function showToast(type, text) {
  toast.value = { type, text };
  setTimeout(() => {
    if (toast.value.text === text) toast.value = { type: "", text: "" };
  }, 3200);
}

function setLoading(v) {
  loading.value = v;
}

async function refreshPublishStatus() {
  try {
    publishStatus.value = await adminApi.publishStatus();
  } catch {
    publishStatus.value = null;
  }
}

function login() {
  setAdminToken(loginToken.value || "demo-admin-token");
  loggedIn.value = true;
  loadTabData();
}

function logout() {
  clearAdminToken();
  loggedIn.value = false;
}

async function loadTabData() {
  if (!loggedIn.value) return;
  loading.value = true;
  try {
    await refreshPublishStatus();
    if (activeTab.value === "products") {
      await nextTick();
      await Promise.all([
        productTypePanelRef.value?.load?.(),
        productPanelRef.value?.load?.(),
      ]);
    } else if (activeTab.value === "translations") {
      await nextTick();
      await translationPanelRef.value?.load?.();
    } else if (activeTab.value === "gameDelivery") {
      await nextTick();
      await gameDeliveryPanelRef.value?.load?.();
    }
  } catch (error) {
    showToast("error", error.message);
  } finally {
    loading.value = false;
  }
}

function switchTab(id) {
  activeTab.value = id;
  loadTabData();
}

const pageTitle = computed(() => {
  if (activeTab.value === "products") return "商品管理";
  return mainNavItems.find((t) => t.id === activeTab.value)?.label ?? "";
});

const hasGlobalPending = computed(() => {
  const s = publishStatus.value;
  if (!s) return false;
  return (
    s.content?.hasUnpublishedChanges ||
    s.products?.hasUnpublishedChanges ||
    s.productCategories?.hasUnpublishedChanges ||
    s.gameDelivery?.hasUnpublishedChanges ||
    s.translations?.hasUnpublishedChanges
  );
});

function latestIso(values) {
  const timestamps = values
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));
  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

const productPublishMeta = computed(() => {
  const status = publishStatus.value;
  const metas = [status?.productCategories, status?.products].filter(Boolean);
  if (!metas.length) return null;
  return {
    hasUnpublishedChanges: metas.some((meta) => meta.hasUnpublishedChanges),
    draftUpdatedAt: latestIso(metas.map((meta) => meta.draftUpdatedAt)),
    publishedAt: latestIso(metas.map((meta) => meta.publishedAt)),
  };
});

function readAutosaveState(value) {
  if (!value) return "idle";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "value" in value) return value.value ?? "idle";
  return "idle";
}

function combineAutosaveStates(states) {
  if (states.includes("saving")) return "saving";
  if (states.includes("dirty")) return "dirty";
  if (states.includes("clean")) return "clean";
  return "idle";
}

const activeAutosaveState = computed(() => {
  if (activeTab.value === "content") {
    return readAutosaveState(contentPanelRef.value?.autosaveStatus);
  }
  if (activeTab.value === "products") {
    return combineAutosaveStates([
      readAutosaveState(productTypePanelRef.value?.autosaveStatus),
      readAutosaveState(productPanelRef.value?.autosaveStatus),
    ]);
  }
  if (activeTab.value === "gameDelivery") {
    return readAutosaveState(gameDeliveryPanelRef.value?.autosaveStatus);
  }
  return "idle";
});

const topbarStatusText = computed(() => {
  if (activeTab.value === "translations") return "";
  const state = activeAutosaveState.value;
  if (state === "saving") return "保存中";
  if (state === "dirty") return "未保存";
  if (state === "clean") return "已保存";
  return hasGlobalPending.value ? "存在未发布变更" : "全部配置已与线上一致";
});

const topbarStatusClass = computed(() => {
  if (activeTab.value === "translations") return "";
  const state = activeAutosaveState.value;
  if (state === "saving") return "saving";
  if (state === "dirty") return "pending";
  if (state === "clean") return "synced";
  return hasGlobalPending.value ? "pending" : "synced";
});

async function saveProductDraft() {
  if (activeTab.value !== "products") return;
  const saved = await productTypePanelRef.value?.saveDraft?.();
  if (saved) {
    await refreshPublishStatus();
  }
}

async function publishProductsPage() {
  if (!productPublishMeta.value?.hasUnpublishedChanges) return;
  if (!confirm("确认发布商品管理页面的全部草稿？")) return;
  loading.value = true;
  try {
    const saved = await productTypePanelRef.value?.saveDraft?.({ quiet: true });
    if (saved === false) {
      showToast("error", "商品类型草稿保存失败");
      return;
    }
    await Promise.all([adminApi.productCategories.publish(), adminApi.products.publish()]);
    await refreshPublishStatus();
    showToast("success", "商品管理已发布");
  } catch (error) {
    showToast("error", error.message);
  } finally {
    loading.value = false;
  }
}

const visibleMainNavItems = computed(() =>
  mainNavItems.filter((item) => item.id !== "gameDelivery" || adminRole.value === "admin"),
);

watch(adminRole, () => {
  if (activeTab.value === "gameDelivery" && adminRole.value !== "admin") {
    activeTab.value = "content";
  }
});

onMounted(() => {
  if (loggedIn.value) loadTabData();
});
</script>

<template>
  <div v-if="toast.text" class="toast" :class="toast.type">{{ toast.text }}</div>

  <div v-if="!loggedIn" class="login-page">
    <section class="login-card">
      <h1>充值商城管理后台</h1>
      <p>配置 C 端展示与商品数据。支持草稿与发布分离；当前阶段发布仅更新后台配置，不会同步到 C 端商城。</p>
      <div class="field">
        <label>管理 Token</label>
        <input v-model="loginToken" type="password" placeholder="默认 demo-admin-token" />
      </div>
      <button class="btn" type="button" style="width: 100%" @click="login">进入后台</button>
    </section>
  </div>

  <div v-else class="layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        充值商城
        <small>配置与发布</small>
      </div>
      <div class="sidebar-nav">
        <button
          v-for="tab in visibleMainNavItems"
          :key="tab.id"
          type="button"
          class="nav-item"
          :class="{ active: activeTab === tab.id }"
          @click="switchTab(tab.id)"
        >
          <span class="nav-icon" aria-hidden="true">{{ tab.icon }}</span>
          <span class="nav-item-label">{{ tab.label }}</span>
          <span
            v-if="tab.id === 'content' && publishStatus?.content?.hasUnpublishedChanges"
            class="nav-dot"
          />
          <span
            v-if="
              tab.id === 'products' &&
              (publishStatus?.products?.hasUnpublishedChanges ||
                publishStatus?.productCategories?.hasUnpublishedChanges)
            "
            class="nav-dot"
          />
          <span
            v-if="tab.id === 'gameDelivery' && publishStatus?.gameDelivery?.hasUnpublishedChanges"
            class="nav-dot"
          />
          <span
            v-if="tab.id === 'translations' && publishStatus?.translations?.hasUnpublishedChanges"
            class="nav-dot"
          />
        </button>
      </div>

      <div class="sidebar-footer">
        <button type="button" class="btn btn--ghost btn--sm" style="width: 100%" @click="logout">
          退出登录
        </button>
      </div>
    </aside>

    <div class="layout-main">
      <header class="topbar">
        <div class="topbar-breadcrumb">
          充值商城 / <strong>{{ pageTitle }}</strong>
        </div>
        <div v-if="activeTab !== 'translations'" class="topbar-status">
          <span class="dot" :class="topbarStatusClass" />
          {{ topbarStatusText }}
        </div>
      </header>

      <main class="main">
        <ContentPanel
          v-if="activeTab === 'content'"
          ref="contentPanelRef"
          :loading="loading"
          @toast="showToast"
          @loading="setLoading"
          @status-change="refreshPublishStatus"
        />

        <template v-if="activeTab === 'products'">
          <PublishBar
            :meta="productPublishMeta"
            :loading="loading"
            module-label="商品管理"
            @save-draft="saveProductDraft"
            @publish="publishProductsPage"
          />
          <ProductTypePanel
            ref="productTypePanelRef"
            :loading="loading"
            @toast="showToast"
            @loading="setLoading"
            @status-change="refreshPublishStatus"
          />
          <ProductPanel
            ref="productPanelRef"
            :loading="loading"
            @toast="showToast"
            @loading="setLoading"
            @status-change="refreshPublishStatus"
          />
        </template>

        <GameDeliveryPanel
          v-if="activeTab === 'gameDelivery' && adminRole === 'admin'"
          ref="gameDeliveryPanelRef"
          :loading="loading"
          @toast="showToast"
          @loading="setLoading"
          @status-change="refreshPublishStatus"
        />

        <TranslationPanel
          v-if="activeTab === 'translations'"
          ref="translationPanelRef"
          :loading="loading"
          @toast="showToast"
          @loading="setLoading"
          @status-change="refreshPublishStatus"
        />

      </main>
    </div>
  </div>
</template>

<style scoped>
.nav-dot {
  width: 6px;
  height: 6px;
  margin-left: auto;
  border-radius: 50%;
  background: #f59e0b;
  flex-shrink: 0;
}

</style>
