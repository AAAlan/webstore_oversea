<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { adminApi } from "../api.js";
import PublishBar from "../components/PublishBar.vue";
import { useAutosave } from "../lib/useAutosave.js";

const props = defineProps({ loading: Boolean });
const emit = defineEmits(["toast", "loading", "status-change"]);

const publishMeta = ref(null);
const form = reactive(emptyForm());
const autosave = useAutosave({
  watchSource: form,
  snapshot: () => JSON.stringify(buildPayload()),
  save: () => persistDraft({ quiet: true }),
  enabled: computed(() => !props.loading),
  delay: 900,
});

function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
}

function emptyWhitelistRow() {
  return { id: genId("wl"), pattern: "" };
}

function emptyForwardRow() {
  return { id: genId("fw"), url: "", notifyId: "", userIdsText: "" };
}

function emptyForm() {
  return {
    gameId: "silver",
    creditUrl: "",
    secretKey: "",
    whitelist: [],
    forwardRules: [],
  };
}

function normalizeWhitelist(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    id: item.id || genId("wl"),
    pattern: typeof item.pattern === "string" ? item.pattern : typeof item.value === "string" ? item.value : "",
  }));
}

function normalizeForwardRules(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    id: item.id || genId("fw"),
    url: typeof item.url === "string" ? item.url : "",
    notifyId: typeof item.notifyId === "string" ? item.notifyId : "",
    userIdsText: Array.isArray(item.userIds)
      ? item.userIds.join(", ")
      : typeof item.userIds === "string"
        ? item.userIds
        : "",
  }));
}

function applyDraft(draft) {
  Object.assign(form, {
    gameId: draft?.gameId ?? "silver",
    creditUrl: draft?.creditUrl ?? "",
    secretKey: draft?.secretKey ?? "",
    whitelist: normalizeWhitelist(draft?.whitelist),
    forwardRules: normalizeForwardRules(draft?.forwardRules),
  });
}

function buildPayload() {
  return {
    gameId: form.gameId.trim(),
    creditUrl: form.creditUrl.trim(),
    secretKey: form.secretKey.trim(),
    whitelist: form.whitelist
      .map((row) => ({
        id: row.id,
        pattern: row.pattern.trim(),
      }))
      .filter((row) => row.pattern),
    forwardRules: form.forwardRules
      .map((row) => ({
        id: row.id,
        url: row.url.trim(),
        notifyId: row.notifyId.trim(),
        userIds: row.userIdsText
          .split(/[\n,]/)
          .map((value) => value.trim())
          .filter(Boolean),
      }))
      .filter((row) => row.url || row.notifyId || row.userIds.length),
  };
}

async function load() {
  emit("loading", true);
  try {
    const data = await adminApi.gameDelivery.get();
    applyDraft(data.draft);
    publishMeta.value = data.meta ?? null;
    autosave.markClean(JSON.stringify(buildPayload()));
    emit("status-change");
  } catch (error) {
    emit("toast", "error", error.message);
  } finally {
    emit("loading", false);
  }
}

async function persistDraft({ quiet = false } = {}) {
  if (!quiet) emit("loading", true);
  try {
    const result = await adminApi.gameDelivery.saveDraft(buildPayload());
    publishMeta.value = result.meta ?? publishMeta.value;
    emit("status-change");
    autosave.markClean(JSON.stringify(buildPayload()));
    if (!quiet) emit("toast", "success", "游戏发货配置草稿已保存");
    return true;
  } catch (error) {
    if (!quiet) emit("toast", "error", error.message);
    return false;
  } finally {
    if (!quiet) emit("loading", false);
  }
}

async function saveDraft(options = {}) {
  return persistDraft(options);
}

async function publish() {
  if (!publishMeta.value?.hasUnpublishedChanges) return;
  if (!confirm("确认保存并发布游戏发货配置？")) return;
  emit("loading", true);
  try {
    const saved = await persistDraft({ quiet: true });
    if (!saved) return;
    const result = await adminApi.gameDelivery.publish();
    publishMeta.value = result.meta ?? publishMeta.value;
    emit("status-change");
    emit("toast", "success", "游戏发货配置已发布");
  } catch (error) {
    emit("toast", "error", error.message);
  } finally {
    emit("loading", false);
  }
}

function addWhitelistRow() {
  form.whitelist.push(emptyWhitelistRow());
}

function addForwardRow() {
  form.forwardRules.push(emptyForwardRow());
}

function removeWhitelistRow(id) {
  form.whitelist = form.whitelist.filter((row) => row.id !== id);
}

function removeForwardRow(id) {
  form.forwardRules = form.forwardRules.filter((row) => row.id !== id);
}

function testWhitelist() {
  const userId = window.prompt("请输入用户 ID");
  if (!userId) return;
  const matched = form.whitelist.some((row) => {
    const pattern = row.pattern.trim();
    if (!pattern) return false;
    try {
      if (pattern.startsWith("/") && pattern.lastIndexOf("/") > 0) {
        const last = pattern.lastIndexOf("/");
        const body = pattern.slice(1, last);
        const flags = pattern.slice(last + 1);
        return new RegExp(body, flags).test(userId);
      }
      return pattern === userId;
    } catch {
      return pattern === userId;
    }
  });
  emit("toast", matched ? "success" : "error", matched ? "命中白名单" : "未命中白名单");
}

onMounted(load);

defineExpose({
  load,
  saveDraft,
  publish,
  autosaveStatus: autosave.status,
});
</script>

<template>
  <div class="game-delivery-panel">
    <PublishBar
      :meta="publishMeta"
      :loading="props.loading"
      module-label="游戏发货配置"
      :autosave-state="autosave.status"
      save-draft-label="保存"
      publish-label="保存并发布"
      @save-draft="saveDraft"
      @publish="publish"
    />

    <p class="page-intro">
      维护加币密钥与加币转发规则，按当前区域配置海外发货参数。保存后可单独发布到线上。
    </p>

    <section class="panel">
      <div class="panel-header">
        <h3>基础信息</h3>
      </div>
      <div class="panel-body form-grid">
        <div class="field">
          <label>Gameid</label>
          <input v-model="form.gameId" placeholder="silver" />
        </div>
        <div class="field">
          <label>加币地址</label>
          <input v-model="form.creditUrl" />
        </div>
        <div class="field">
          <label>加币密钥</label>
          <input v-model="form.secretKey" />
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3>用户白名单</h3>
        <div class="panel-header__actions">
          <button class="btn btn--ghost btn--sm" type="button" @click="testWhitelist">用户 id 测试</button>
          <button class="btn btn--sm" type="button" @click="addWhitelistRow">+ 添加一行</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>userId / 正则</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody v-if="form.whitelist.length">
            <tr v-for="row in form.whitelist" :key="row.id">
              <td>
                <input v-model="row.pattern" placeholder="例如 user123 或 /^jp-/" />
              </td>
              <td class="actions">
                <button class="btn btn--danger btn--sm" type="button" @click="removeWhitelistRow(row.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!form.whitelist.length" class="empty-state">暂无数据</div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3>加币转发</h3>
        <div class="panel-header__actions">
          <button class="btn btn--sm" type="button" @click="addForwardRow">+ 添加一行</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>url</th>
              <th>notifyId</th>
              <th>用户 ID 列表</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody v-if="form.forwardRules.length">
            <tr v-for="row in form.forwardRules" :key="row.id">
              <td><input v-model="row.url" /></td>
              <td><input v-model="row.notifyId" /></td>
              <td><input v-model="row.userIdsText" placeholder="user1, user2" /></td>
              <td class="actions">
                <button class="btn btn--danger btn--sm" type="button" @click="removeForwardRow(row.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!form.forwardRules.length" class="empty-state">暂无数据</div>
      </div>
    </section>
  </div>
</template>
