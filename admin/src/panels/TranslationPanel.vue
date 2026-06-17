<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { adminApi } from "../api.js";
import PublishBar from "../components/PublishBar.vue";

const props = defineProps({ loading: Boolean });
const emit = defineEmits(["toast", "loading", "status-change"]);

const items = ref([]);
const publishMeta = ref(null);
const searchKey = ref("");
const categoryFilter = ref("");
const modalVisible = ref(false);
const detail = reactive(emptyEntry());

const detailLanguages = [
  { code: "zh-CN", label: "简体中文", source: true },
  { code: "en", label: "英语" },
  { code: "ko", label: "韩语" },
  { code: "ja", label: "日语" },
  { code: "zh-TW", label: "繁体中文" },
];
const translationColumns = detailLanguages.filter((language) => !language.source);

function emptyEntry() {
  return {
    key: "",
    category: "",
    usage: "",
    sourceText: "",
    values: { "zh-CN": "", en: "", ko: "", ja: "", "zh-TW": "" },
  };
}

const categories = computed(() =>
  Array.from(new Set(items.value.map((item) => item.category).filter(Boolean))).sort(),
);

const filteredItems = computed(() => {
  const keyword = searchKey.value.trim().toLowerCase();
  return items.value.filter((item) => {
    if (categoryFilter.value && item.category !== categoryFilter.value) return false;
    if (!keyword) return true;
    return (
      item.key.toLowerCase().includes(keyword) ||
      item.sourceText.toLowerCase().includes(keyword)
    );
  });
});

async function load() {
  emit("loading", true);
  try {
    const data = await adminApi.translations.list();
    items.value = data.items ?? [];
    publishMeta.value = data.meta ?? null;
    emit("status-change");
  } catch (error) {
    emit("toast", "error", error.message);
  } finally {
    emit("loading", false);
  }
}

function resetFilters() {
  searchKey.value = "";
  categoryFilter.value = "";
}

function openView(item) {
  Object.assign(detail, {
    key: item.key,
    category: item.category,
    usage: item.usage,
    sourceText: item.sourceText,
    updatedAt: item.updatedAt,
    values: { ...emptyEntry().values, ...(item.values ?? {}) },
  });
  modalVisible.value = true;
}

async function publish() {
  if (!publishMeta.value?.hasUnpublishedChanges) return;
  if (!confirm("确认发布多语言文案？")) return;
  emit("loading", true);
  try {
    const result = await adminApi.translations.publish();
    publishMeta.value = result.meta;
    emit("status-change");
    emit("toast", "success", `已发布 ${result.count} 条多语言文案`);
  } catch (error) {
    emit("toast", "error", error.message);
  } finally {
    emit("loading", false);
  }
}

function languageFilled(item, code) {
  return Boolean(String(item.values?.[code] ?? "").trim());
}

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

onMounted(load);

defineExpose({ load });
</script>

<template>
  <div class="translation-panel">
    <PublishBar
      :meta="publishMeta"
      :loading="props.loading"
      module-label="多语言管理"
      hide-save-draft
      @publish="publish"
    />

    <section class="panel">
      <div class="panel-header">
        <h3>多语言管理</h3>
        <button class="btn btn--publish btn--sm" type="button" :disabled="!publishMeta?.hasUnpublishedChanges" @click="publish">
          发布到线上
        </button>
      </div>
      <div class="panel-body">
        <div class="translation-toolbar">
          <div class="field">
            <label>Key</label>
            <input v-model="searchKey" placeholder="Key 关键字模糊搜索" />
          </div>
          <div class="field">
            <label>类别</label>
            <select v-model="categoryFilter">
              <option value="">全部类别</option>
              <option v-for="category in categories" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
          </div>
          <div class="field field--actions">
            <button class="btn btn--sm" type="button">查询</button>
            <button class="btn btn--ghost btn--sm" type="button" @click="resetFilters">重置</button>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>类别</th>
                <th>简体中文（原文）</th>
                <th v-for="language in translationColumns" :key="language.code">{{ language.label }}</th>
                <th>使用位置</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredItems" :key="item.key">
                <td><code>{{ item.key }}</code></td>
                <td>{{ item.category }}</td>
                <td>{{ item.sourceText }}</td>
                <td v-for="language in translationColumns" :key="language.code" class="translation-status-cell">
                  <span v-if="languageFilled(item, language.code)" class="translation-check">✓</span>
                  <span v-else class="translation-empty">—</span>
                </td>
                <td>{{ item.usage || "—" }}</td>
                <td>{{ formatTime(item.updatedAt) }}</td>
                <td>
                  <button class="btn btn--ghost btn--sm" type="button" @click="openView(item)">查看</button>
                </td>
              </tr>
              <tr v-if="!filteredItems.length">
                <td colspan="9" class="empty-cell">暂无多语言文案</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <div v-if="modalVisible" class="modal-mask" @click.self="modalVisible = false">
      <section class="translation-detail-modal">
        <header class="translation-detail-head">
          <div class="translation-detail-title">
            <span aria-hidden="true">◎</span>
            <h3>多语言详情</h3>
            <strong>{{ detail.category }}</strong>
          </div>
          <button class="translation-detail-close" type="button" @click="modalVisible = false">×</button>
        </header>

        <div class="translation-detail-meta">
          <div class="translation-detail-row">
            <span>Key</span>
            <strong>{{ detail.key }}</strong>
          </div>
          <div class="translation-detail-row">
            <span>类别</span>
            <strong>{{ detail.category || "—" }}</strong>
          </div>
          <div class="translation-detail-row">
            <span>使用位置</span>
            <strong>{{ detail.usage || "—" }}</strong>
          </div>
          <div class="translation-detail-row">
            <span>更新时间</span>
            <strong>{{ formatTime(detail.updatedAt) }}</strong>
          </div>
        </div>

        <h4 class="translation-detail-section">译文</h4>
        <div class="translation-detail-list">
          <div
            v-for="language in detailLanguages"
            :key="language.code"
            class="translation-detail-item"
          >
            <span class="translation-detail-language">
              {{ language.label }}
              <em v-if="language.source">原文</em>
            </span>
            <strong
              :class="{ empty: !String(detail.values?.[language.code] ?? '').trim() }"
            >
              {{ String(detail.values?.[language.code] ?? '').trim() || "（未翻译）" }}
            </strong>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
