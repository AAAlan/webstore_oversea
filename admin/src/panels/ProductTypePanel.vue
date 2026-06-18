<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { adminApi } from "../api.js";
import MultilingualField from "../components/MultilingualField.vue";
import { useAutosave } from "../lib/useAutosave.js";
import { buildLocaleOptions } from "../../../shared/language-presets.js";

const props = defineProps({ loading: Boolean });
const emit = defineEmits(["toast", "loading", "status-change"]);

const categories = ref([]);
const editingId = ref(null);
const modalVisible = ref(false);
const form = reactive(emptyForm());
const translationMap = ref({});
const localeOptions = ref([]);
const autosave = useAutosave({
  watchSource: categories,
  snapshot: () => JSON.stringify(categories.value),
  save: () => persistDraft({ quiet: true }),
  enabled: computed(() => !props.loading),
  delay: 900,
});
const formAutosave = useAutosave({
  watchSource: form,
  snapshot: () =>
    JSON.stringify({
      id: form.id.trim(),
      label: form.label.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      editingId: editingId.value || "",
    }),
  save: () => syncFormToCategories({ quiet: true, close: false }),
  enabled: computed(() => modalVisible.value && !props.loading),
  delay: 800,
});

function emptyForm() {
  return { id: "", label: "", sortOrder: 0 };
}

async function load() {
  emit("loading", true);
  try {
    const [data] = await Promise.all([
      adminApi.productCategories.list(),
      loadTranslations(),
      loadMallConfig(),
    ]);
    categories.value = data.items ?? [];
    autosave.markClean(JSON.stringify(categories.value));
    emit("status-change");
  } catch (e) {
    emit("toast", "error", e.message);
  } finally {
    emit("loading", false);
  }
}

async function loadTranslations() {
  try {
    const data = await adminApi.translations.list();
    translationMap.value = Object.fromEntries(
      (data.items ?? []).map((item) => [item.key, item]),
    );
  } catch {
    translationMap.value = {};
  }
}

async function loadMallConfig() {
  try {
    const data = await adminApi.mallConfig.get();
    const draft = data.draft ?? data.published ?? {};
    localeOptions.value = buildLocaleOptions({
      languageMeta: draft.languageMeta ?? {},
      languages: draft.languages ?? {},
    });
  } catch {
    localeOptions.value = buildLocaleOptions();
  }
}

function valuesFor(key, fallback = "") {
  return {
    "zh-CN": fallback,
    ...(translationMap.value[key]?.values ?? {}),
  };
}

async function saveTranslation(entry) {
  try {
    await adminApi.translations.save(entry);
    await loadTranslations();
    emit("status-change");
    if (!entry?.silent) emit("toast", "success", "多语言文案已保存");
  } catch (error) {
    if (!entry?.silent) emit("toast", "error", error.message);
  }
}

function resetForm() {
  editingId.value = null;
  Object.assign(form, emptyForm());
}

function formSnapshot() {
  return JSON.stringify({
    id: form.id.trim(),
    label: form.label.trim(),
    sortOrder: Number(form.sortOrder) || 0,
    editingId: editingId.value || "",
  });
}

function openCreate() {
  resetForm();
  form.sortOrder = (categories.value.length + 1) * 10;
  modalVisible.value = true;
  formAutosave.markClean(formSnapshot());
}

function openEdit(item) {
  editingId.value = item.id;
  Object.assign(form, {
    id: item.id,
    label: item.label,
    sortOrder: item.sortOrder ?? 0,
  });
  modalVisible.value = true;
  formAutosave.markClean(formSnapshot());
}

function closeModal() {
  void formAutosave.flush();
  modalVisible.value = false;
  resetForm();
}

function syncFormToCategories({ quiet = false, close = false } = {}) {
  if (!form.id.trim() || !form.label.trim()) {
    if (!quiet) emit("toast", "error", "请填写类型 ID 与显示名称");
    return false;
  }
  const payload = {
    id: form.id.trim(),
    label: form.label.trim(),
    sortOrder: Number(form.sortOrder) || 0,
  };
  const index = categories.value.findIndex((c) => c.id === payload.id);
  if (index >= 0 && editingId.value !== payload.id) {
    emit("toast", "error", "类型 ID 已存在");
    return;
  }
  if (editingId.value && editingId.value !== payload.id) {
    const oldIndex = categories.value.findIndex((c) => c.id === editingId.value);
    if (oldIndex >= 0) {
      categories.value.splice(oldIndex, 1);
    }
  }
  if (index >= 0) {
    categories.value[index] = payload;
  } else {
    categories.value.push(payload);
  }
  editingId.value = payload.id;
  autosave.markClean(JSON.stringify(categories.value));
  emit("status-change");
  if (close) closeModal();
  return true;
}

function upsertLocal() {
  return syncFormToCategories({ quiet: false, close: true });
}

function removeItem(id) {
  if (!confirm(`确定删除商品类型「${id}」？`)) return;
  categories.value = categories.value.filter((c) => c.id !== id);
  autosave.markClean(JSON.stringify(categories.value));
  emit("status-change");
  if (editingId.value === id) closeModal();
}

async function persistDraft({ quiet = false } = {}) {
  if (!quiet) emit("loading", true);
  try {
    const result = await adminApi.productCategories.saveDraft(categories.value);
    autosave.markClean(JSON.stringify(categories.value));
    emit("status-change");
    if (!quiet) {
      emit("toast", "success", "商品类型草稿已保存");
    }
    return result;
  } catch (e) {
    if (!quiet) {
      emit("toast", "error", e.message);
    }
    return null;
  } finally {
    if (!quiet) emit("loading", false);
  }
}

async function saveDraft(options = {}) {
  return persistDraft(options);
}

onMounted(() => {
  load();
});

defineExpose({
  load,
  saveDraft,
  autosaveStatus: computed(() => {
    const states = [autosave.status.value, formAutosave.status.value];
    if (states.includes("saving")) return "saving";
    if (states.includes("dirty")) return "dirty";
    if (states.includes("clean")) return "clean";
    return "idle";
  }),
});
</script>

<template>
  <div class="product-type-panel">
    <p class="page-intro">
      各游戏可自定义商品分类名称（如「衍质源石」「月卡」），用于 C 端 Tab 分组与后台商品表单下拉。
      修改后请使用页面顶部的<strong>保存草稿</strong>与<strong>发布</strong>。
    </p>

    <section class="panel">
      <div class="panel-header">
        <h3>类型列表（{{ categories.length }}）</h3>
        <button class="btn btn--sm" type="button" @click="openCreate">新增类型</button>
      </div>

      <div class="table-wrap">
        <table>
      <thead>
        <tr>
          <th>类型 ID</th>
          <th>显示名称</th>
          <th>排序</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in categories" :key="c.id">
          <td><code>{{ c.id }}</code></td>
          <td>{{ c.label }}</td>
          <td>{{ c.sortOrder }}</td>
          <td class="actions">
            <button class="btn btn--ghost btn--sm" type="button" @click="openEdit(c)">编辑</button>
            <button class="btn btn--danger btn--sm" type="button" @click="removeItem(c.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="modalVisible" class="modal-mask" @click.self="closeModal">
      <section class="modal modal--wide" style="max-width: 720px">
        <h3>{{ editingId ? "编辑商品类型" : "新增商品类型" }}</h3>

        <div class="form-grid">
          <div class="field">
            <label>类型 ID（slug）</label>
            <input v-model="form.id" :disabled="!!editingId" placeholder="如 gem、bundle" />
            <span class="field-hint">小写英文开头，仅含字母、数字、下划线或连字符；创建后不可修改。</span>
          </div>
          <div class="field">
            <label>显示名称</label>
            <MultilingualField
              v-model="form.label"
              label="商品类型名称"
              :translation-key="`category.${form.id || 'new'}.label`"
              category="商品类型"
              usage="C端 - 商品分类 Tab"
            placeholder="C 端 Tab 文案"
            :translations="valuesFor(`category.${form.id || 'new'}.label`, form.label)"
            :locale-options="localeOptions"
            @save-translations="saveTranslation"
          />
          </div>
          <div class="field">
            <label>排序</label>
            <input v-model.number="form.sortOrder" type="number" />
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn--ghost" type="button" @click="closeModal">取消</button>
          <button class="btn" type="button" @click="upsertLocal">
            {{ editingId ? "保存修改" : "确认新增" }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
