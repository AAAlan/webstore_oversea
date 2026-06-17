<script setup>
import { onMounted, reactive, ref } from "vue";
import { adminApi } from "../api.js";
import MultilingualField from "../components/MultilingualField.vue";
import PublishBar from "../components/PublishBar.vue";

const props = defineProps({ loading: Boolean });
const emit = defineEmits(["toast", "loading", "status-change"]);

const categories = ref([]);
const publishMeta = ref(null);
const editingId = ref(null);
const form = reactive(emptyForm());
const translationMap = ref({});

function emptyForm() {
  return { id: "", label: "", sortOrder: 0, enabled: true };
}

async function load() {
  emit("loading", true);
  try {
    const [data] = await Promise.all([
      adminApi.productCategories.list(),
      loadTranslations(),
    ]);
    categories.value = data.items ?? [];
    publishMeta.value = data.meta ?? null;
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
    emit("toast", "success", "多语言文案已保存");
  } catch (error) {
    emit("toast", "error", error.message);
  }
}

async function publish() {
  if (!publishMeta.value?.hasUnpublishedChanges) return;
  if (!confirm("确认发布商品类型配置？（暂不会同步到 C 端商城）")) return;
  emit("loading", true);
  try {
    const result = await adminApi.productCategories.publish();
    publishMeta.value = result.meta;
    emit("status-change");
    emit("toast", "success", `已发布 ${result.count} 个商品类型`);
  } catch (e) {
    emit("toast", "error", e.message);
  } finally {
    emit("loading", false);
  }
}

function resetForm() {
  editingId.value = null;
  Object.assign(form, emptyForm());
}

function openCreate() {
  resetForm();
  form.sortOrder = (categories.value.length + 1) * 10;
}

function openEdit(item) {
  editingId.value = item.id;
  Object.assign(form, {
    id: item.id,
    label: item.label,
    sortOrder: item.sortOrder ?? 0,
    enabled: item.enabled,
  });
}

function upsertLocal() {
  if (!form.id.trim() || !form.label.trim()) {
    emit("toast", "error", "请填写类型 ID 与显示名称");
    return;
  }
  const payload = {
    id: form.id.trim(),
    label: form.label.trim(),
    sortOrder: Number(form.sortOrder) || 0,
    enabled: form.enabled,
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
  resetForm();
}

function removeItem(id) {
  if (!confirm(`确定删除商品类型「${id}」？`)) return;
  categories.value = categories.value.filter((c) => c.id !== id);
  if (editingId.value === id) resetForm();
}

async function saveDraft() {
  emit("loading", true);
  try {
    await adminApi.productCategories.saveDraft(categories.value);
    await load();
    emit("toast", "success", "商品类型草稿已保存");
  } catch (e) {
    emit("toast", "error", e.message);
  } finally {
    emit("loading", false);
  }
}

onMounted(() => {
  load();
});

defineExpose({ load });
</script>

<template>
  <div class="product-type-panel">
    <PublishBar
      :meta="publishMeta"
      :loading="props.loading"
      module-label="商品类型"
      @save-draft="saveDraft"
      @publish="publish"
    />

    <p class="page-intro">
      各游戏可自定义商品分类名称（如「衍质源石」「月卡」），用于 C 端 Tab 分组与后台商品表单下拉。
      修改后需<strong>保存草稿</strong>并<strong>发布</strong>。
    </p>

    <section class="panel">
      <div class="panel-header">
        <h3>类型列表（{{ categories.length }}）</h3>
        <button class="btn btn--sm" type="button" @click="openCreate">新增类型</button>
      </div>

      <div class="form-grid form-grid--inline">
        <div class="field">
          <label>类型 ID（slug）</label>
          <input v-model="form.id" :disabled="!!editingId" placeholder="如 gem、bundle" />
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
            @save-translations="saveTranslation"
          />
        </div>
        <div class="field">
          <label>排序</label>
          <input v-model.number="form.sortOrder" type="number" />
        </div>
        <div class="field">
          <label>启用</label>
          <select v-model="form.enabled">
            <option :value="true">是</option>
            <option :value="false">否</option>
          </select>
        </div>
        <div class="field field--actions">
          <button class="btn btn--sm" type="button" @click="upsertLocal">
            {{ editingId ? "更新到列表" : "加入列表" }}
          </button>
          <button v-if="editingId" class="btn btn--ghost btn--sm" type="button" @click="resetForm">
            取消编辑
          </button>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>类型 ID</th>
              <th>显示名称</th>
              <th>排序</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in categories" :key="c.id">
              <td><code>{{ c.id }}</code></td>
              <td>{{ c.label }}</td>
              <td>{{ c.sortOrder }}</td>
              <td>
                <span class="tag" :class="c.enabled ? 'tag--ok' : 'tag--off'">
                  {{ c.enabled ? "启用" : "停用" }}
                </span>
              </td>
              <td class="actions">
                <button class="btn btn--ghost btn--sm" type="button" @click="openEdit(c)">编辑</button>
                <button class="btn btn--danger btn--sm" type="button" @click="removeItem(c.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
