<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  modelValue: { type: String, default: "" },
  label: { type: String, default: "图片" },
  hint: { type: String, default: "支持 PNG、JPG、WebP、GIF；单张不超过 2MB" },
  disabled: { type: Boolean, default: false },
  maxSizeMb: { type: Number, default: 2 },
  previewWidth: { type: Number, default: 96 },
  previewHeight: { type: Number, default: 96 },
});

const ACCEPTED_TYPES = /^image\/(png|jpe?g|webp|gif)$/i;
const ACCEPT_ATTR = "image/png,image/jpeg,image/webp,image/gif";

const emit = defineEmits(["update:modelValue"]);

const error = ref("");

const previewUrl = computed(() => props.modelValue?.trim() || "");

function onFileChange(event) {
  error.value = "";
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (!ACCEPTED_TYPES.test(file.type)) {
    error.value = "仅支持 PNG、JPG、WebP、GIF 格式";
    return;
  }
  if (file.size > props.maxSizeMb * 1024 * 1024) {
    error.value = `图片不能超过 ${props.maxSizeMb}MB`;
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    emit("update:modelValue", String(reader.result || ""));
  };
  reader.onerror = () => {
    error.value = "读取图片失败";
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  emit("update:modelValue", "");
}
</script>

<template>
  <div class="image-upload-field">
    <label>{{ label }}</label>
    <p v-if="hint" class="field-hint">{{ hint }}</p>
    <div class="image-upload-row">
      <div
        class="image-upload-preview"
        :class="{ empty: !previewUrl }"
        :style="{ width: `${previewWidth}px`, height: `${previewHeight}px` }"
      >
        <img v-if="previewUrl" :src="previewUrl" alt="预览" />
        <span v-else>暂无图片</span>
      </div>
      <div class="image-upload-actions">
        <label class="btn btn--sm" :class="{ disabled: disabled }">
          上传图片
          <input type="file" :accept="ACCEPT_ATTR" :disabled="disabled" @change="onFileChange" />
        </label>
        <button
          v-if="previewUrl"
          class="btn btn--ghost btn--sm"
          type="button"
          :disabled="disabled"
          @click="clearImage"
        >
          清除
        </button>
      </div>
    </div>
    <p v-if="error" class="field-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.image-upload-field label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
}

.image-upload-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.image-upload-preview {
  border: 1px dashed var(--border-strong);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fc;
  overflow: hidden;
  flex-shrink: 0;
}

.image-upload-preview.empty {
  color: var(--text-muted);
  font-size: 12px;
}

.image-upload-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-upload-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-upload-actions label input {
  display: none;
}

.image-upload-actions label.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.field-error {
  color: var(--danger);
  font-size: 12px;
  margin: 6px 0 0;
}
</style>
