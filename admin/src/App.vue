<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { clearAdminToken, getAdminToken, setAdminToken, adminApi } from "./api.js";
import ContentPanel from "./panels/ContentPanel.vue";
import MarketingPanel from "./panels/MarketingPanel.vue";
import OperationsPanel from "./panels/OperationsPanel.vue";
import ProductPanel from "./panels/ProductPanel.vue";
import ProductTypePanel from "./panels/ProductTypePanel.vue";
import TranslationPanel from "./panels/TranslationPanel.vue";

const loggedIn = ref(!!getAdminToken());
const loginToken = ref(getAdminToken());
const activeTab = ref("content");
const loading = ref(false);
const toast = ref({ type: "", text: "" });

const ordersData = ref({ reserved: true, items: [] });
const productPanelRef = ref(null);
const productTypePanelRef = ref(null);
const translationPanelRef = ref(null);
const productSubTab = ref("list");
const publishStatus = ref(null);

const mainNavItems = [
  { id: "content", label: "页面内容管理", icon: "◫" },
  { id: "products", label: "商品管理", icon: "▣" },
  { id: "translations", label: "多语言管理", icon: "◎" },
  { id: "marketing", label: "营销活动管理", icon: "◎" },
];

const ordersNav = { id: "orders", label: "订单管理", icon: "☰" };

const opsMenus = [{ id: "recharge-query", label: "累充查询" }];

const opsExpanded = ref(true);
const activeOpsSub = ref("recharge-query");

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
      const panelRef =
        productSubTab.value === "types" ? productTypePanelRef : productPanelRef;
      const loadFn = panelRef.value?.load;
      if (typeof loadFn === "function") {
        await loadFn.call(panelRef.value);
      }
    } else if (activeTab.value === "translations") {
      await nextTick();
      await translationPanelRef.value?.load?.();
    } else if (activeTab.value === "orders") {
      ordersData.value = await adminApi.orders.list();
    }
  } catch (error) {
    showToast("error", error.message);
  } finally {
    loading.value = false;
  }
}

function switchTab(id) {
  activeTab.value = id;
  if (id === "products") {
    productSubTab.value = "list";
  }
  loadTabData();
}

function switchProductSub(id) {
  productSubTab.value = id;
  loadTabData();
}

function toggleOpsExpanded() {
  opsExpanded.value = !opsExpanded.value;
}

function switchOpsSub(id) {
  activeTab.value = "operations";
  activeOpsSub.value = id;
  if (!opsExpanded.value) {
    opsExpanded.value = true;
  }
}

const isOpsActive = computed(() => activeTab.value === "operations");

const pageTitle = computed(() => {
  if (activeTab.value === "operations") {
    const sub = opsMenus.find((m) => m.id === activeOpsSub.value);
    return sub ? `运营工具 / ${sub.label}` : "运营工具";
  }
  if (activeTab.value === "orders") return ordersNav.label;
  if (activeTab.value === "products") {
    return productSubTab.value === "types" ? "商品管理 / 商品类型" : "商品管理 / 商品列表";
  }
  return mainNavItems.find((t) => t.id === activeTab.value)?.label ?? "";
});

const hasGlobalPending = computed(() => {
  const s = publishStatus.value;
  if (!s) return false;
  return (
    s.content?.hasUnpublishedChanges ||
    s.products?.hasUnpublishedChanges ||
    s.productCategories?.hasUnpublishedChanges ||
    s.translations?.hasUnpublishedChanges
  );
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
          v-for="tab in mainNavItems"
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
            v-if="tab.id === 'translations' && publishStatus?.translations?.hasUnpublishedChanges"
            class="nav-dot"
          />
        </button>

        <button
          type="button"
          class="nav-item"
          :class="{ active: activeTab === ordersNav.id }"
          @click="switchTab(ordersNav.id)"
        >
          <span class="nav-icon" aria-hidden="true">{{ ordersNav.icon }}</span>
          <span class="nav-item-label">{{ ordersNav.label }}</span>
        </button>

        <div class="nav-group" :class="{ expanded: opsExpanded, 'has-active': isOpsActive }">
          <button type="button" class="nav-group-head" @click="toggleOpsExpanded">
            <span class="nav-icon" aria-hidden="true">⚙</span>
            <span class="nav-group-label">运营工具</span>
            <span class="nav-chevron" :class="{ up: opsExpanded }" aria-hidden="true">›</span>
          </button>
          <div v-show="opsExpanded" class="nav-group-children">
            <button
              v-for="sub in opsMenus"
              :key="sub.id"
              type="button"
              class="nav-sub-item"
              :class="{ active: isOpsActive && activeOpsSub === sub.id }"
              @click="switchOpsSub(sub.id)"
            >
              {{ sub.label }}
            </button>
          </div>
        </div>
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
        <div class="topbar-status">
          <span class="dot" :class="{ pending: hasGlobalPending }" />
          {{
            hasGlobalPending
              ? "存在未发布变更"
              : "全部配置已与线上一致"
          }}
        </div>
      </header>

      <main class="main">
        <ContentPanel
          v-if="activeTab === 'content'"
          :loading="loading"
          @toast="showToast"
          @loading="setLoading"
          @status-change="refreshPublishStatus"
        />

        <template v-if="activeTab === 'products'">
          <div class="sub-tabs">
            <button
              type="button"
              class="sub-tab"
              :class="{ active: productSubTab === 'list' }"
              @click="switchProductSub('list')"
            >
              商品列表
            </button>
            <button
              type="button"
              class="sub-tab"
              :class="{ active: productSubTab === 'types' }"
              @click="switchProductSub('types')"
            >
              商品类型
            </button>
          </div>
          <ProductPanel
            v-if="productSubTab === 'list'"
            ref="productPanelRef"
            :loading="loading"
            @toast="showToast"
            @loading="setLoading"
            @status-change="refreshPublishStatus"
          />
          <ProductTypePanel
            v-else
            ref="productTypePanelRef"
            :loading="loading"
            @toast="showToast"
            @loading="setLoading"
            @status-change="refreshPublishStatus"
          />
        </template>

        <MarketingPanel v-if="activeTab === 'marketing'" />

        <TranslationPanel
          v-if="activeTab === 'translations'"
          ref="translationPanelRef"
          :loading="loading"
          @toast="showToast"
          @loading="setLoading"
          @status-change="refreshPublishStatus"
        />

        <OperationsPanel
          v-if="activeTab === 'operations'"
          :sub="activeOpsSub"
        />

        <template v-if="activeTab === 'orders'">
          <p class="page-intro">订单管理能力预留，以下为演示环境产生的订单。</p>
          <section class="panel reserved-panel">
            <div class="reserved-badge">功能预留</div>
            <h3>订单管理</h3>
            <p class="hint">{{ ordersData.message }}</p>
          </section>
          <section class="panel">
            <div class="panel-header"><h3>演示订单列表</h3></div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>账号</th>
                    <th>商品</th>
                    <th>金额</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="o in ordersData.items" :key="o.orderId">
                    <td><code>{{ o.orderId }}</code></td>
                    <td>{{ o.accountId }}</td>
                    <td>{{ o.productName }}</td>
                    <td>￥{{ o.amount }}</td>
                    <td>
                      <span class="tag" :class="o.status === 'paid' ? 'tag--ok' : ''">
                        {{ o.status === "paid" ? "已支付" : "待支付" }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="!ordersData.items?.length">
                    <td colspan="5" class="muted">暂无订单</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
.sub-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.sub-tab {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-secondary);
}

.sub-tab.active {
  border-color: var(--primary);
  color: var(--primary);
  background: #f5f5ff;
}

.nav-dot {
  width: 6px;
  height: 6px;
  margin-left: auto;
  border-radius: 50%;
  background: #f59e0b;
  flex-shrink: 0;
}

</style>
