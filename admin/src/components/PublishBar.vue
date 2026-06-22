<script setup>
import { computed } from "vue";

const props = defineProps({
  meta: { type: Object, default: null },
  loading: Boolean,
  moduleLabel: { type: String, default: "配置" },
  hideSaveDraft: { type: Boolean, default: false },
  hidePublish: { type: Boolean, default: false },
  saveDraftLabel: { type: String, default: "保存草稿" },
  publishLabel: { type: String, default: "发布" },
});

const emit = defineEmits(["save-draft", "publish"]);

const hasChanges = computed(() => props.meta?.hasUnpublishedChanges);
const statusText = computed(() => {
  if (!props.meta) return "";
  if (hasChanges.value) return "草稿已修改，尚未发布";
  if (!props.meta.hasDraft) return "当前使用线上版本";
  return "草稿与发布版一致";
});

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", { hour12: false });
}
</script>

<template>
  <div class="publish-bar" :class="{ 'has-changes': hasChanges }">
    <div class="publish-bar-info">
      <span class="publish-bar-label">{{ moduleLabel }}</span>
      <span class="publish-bar-desc">{{ statusText }}</span>
      <span v-if="meta" class="publish-bar-times">
        草稿 {{ meta.hasDraft ? formatTime(meta.draftUpdatedAt) : "—" }} · 发布 {{ formatTime(meta.publishedAt) }}
      </span>
    </div>
    <div class="publish-bar-actions">
      <button
        v-if="!hideSaveDraft"
        class="btn btn--ghost"
        type="button"
        :disabled="loading"
        @click="emit('save-draft')"
      >
        {{ saveDraftLabel }}
      </button>
      <button
        v-if="!hidePublish"
        class="btn btn--publish"
        type="button"
        :disabled="loading || !hasChanges"
        @click="emit('publish')"
      >
        {{ publishLabel }}
      </button>
    </div>
  </div>
</template>
