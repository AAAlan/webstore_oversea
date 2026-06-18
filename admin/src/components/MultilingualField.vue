<script setup>
import { computed, reactive, ref, watch } from "vue";
import { buildLocaleOptions } from "../../../shared/language-presets.js";

const props = defineProps({
  modelValue: { type: String, default: "" },
  label: { type: String, required: true },
  translationKey: { type: String, required: true },
  category: { type: String, default: "页面文案" },
  usage: { type: String, default: "" },
  disabled: Boolean,
  multiline: Boolean,
  buttonOnly: Boolean,
  translations: { type: Object, default: () => ({}) },
  localeOptions: { type: Array, default: () => [] },
  placeholder: { type: String, default: "" },
  autoSave: { type: Boolean, default: true },
});

const emit = defineEmits(["update:modelValue", "save-translations"]);

const visible = ref(false);
const draftKey = reactive({ prefix: "", name: "" });
const draftValues = reactive({});
let autoSaveTimer = null;
let suppressAutoSave = false;
let lastAutoSaveSignature = "";

const languageOptions = computed(() =>
  (props.localeOptions?.length ? props.localeOptions : buildLocaleOptions()).map((language) => ({
    ...language,
    placeholder:
      language.code === "zh-CN"
        ? "简中 原文"
        : `${language.label} 翻译(可先留空)`,
  })),
);

const filledCount = computed(
  () =>
    languageOptions.value.filter((language) =>
      String(draftValues[language.code] ?? "").trim(),
    ).length,
);

function splitKey(key) {
  const parts = key.split(".");
  return {
    prefix: parts.length > 1 ? `${parts.slice(0, -1).join(".")}.` : "",
    name: parts.length > 1 ? parts.at(-1) : key,
  };
}

function openModal() {
  const key = splitKey(props.translationKey);
  suppressAutoSave = true;
  draftKey.prefix = key.prefix;
  draftKey.name = key.name;
  for (const language of languageOptions.value) {
    draftValues[language.code] =
      props.translations?.[language.code] ??
      (language.code === "zh-CN" ? props.modelValue : "");
  }
  visible.value = true;
  lastAutoSaveSignature = buildSignature();
  queueMicrotask(() => {
    suppressAutoSave = false;
  });
}

function closeModal() {
  clearTimeout(autoSaveTimer);
  const key = `${draftKey.prefix}${draftKey.name}`.trim();
  const sourceText = String(draftValues["zh-CN"] ?? "").trim();
  if (visible.value && key && sourceText) {
    save({ silent: true });
  }
  visible.value = false;
}

function save({ silent = false } = {}) {
  const key = `${draftKey.prefix}${draftKey.name}`.trim();
  const values = Object.fromEntries(
    languageOptions.value.map((language) => [
      language.code,
      String(draftValues[language.code] ?? ""),
    ]),
  );
  emit("update:modelValue", values["zh-CN"]);
  emit("save-translations", {
    key,
    category: props.category,
    usage: props.usage,
    sourceText: values["zh-CN"],
    values,
    silent,
  });
  lastAutoSaveSignature = buildSignature();
  if (!silent) {
    visible.value = false;
  }
}

function buildSignature() {
  return JSON.stringify({
    key: `${draftKey.prefix}${draftKey.name}`.trim(),
    values: Object.fromEntries(
      languageOptions.value.map((language) => [
        language.code,
        String(draftValues[language.code] ?? ""),
      ]),
    ),
  });
}

function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  if (!props.autoSave || !visible.value || suppressAutoSave) return;
  const nextSignature = buildSignature();
  if (nextSignature === lastAutoSaveSignature) return;
  autoSaveTimer = setTimeout(() => {
    const key = `${draftKey.prefix}${draftKey.name}`.trim();
    const sourceText = String(draftValues["zh-CN"] ?? "").trim();
    if (!key || !sourceText) return;
    save({ silent: true });
  }, 800);
}

watch(
  () => props.modelValue,
  (value) => {
    if (!visible.value) draftValues["zh-CN"] = value;
  },
);

watch(
  () => [draftKey.prefix, draftKey.name, JSON.stringify(draftValues)],
  () => {
    scheduleAutoSave();
  },
  { deep: true },
);
</script>

<template>
  <div class="ml-field" :class="{ 'ml-field--button-only': buttonOnly }">
    <div v-if="!buttonOnly" class="ml-field__control">
      <textarea
        v-if="multiline"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        rows="3"
        @input="emit('update:modelValue', $event.target.value)"
      />
      <input
        v-else
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        @input="emit('update:modelValue', $event.target.value)"
      />
      <button class="ml-field__btn" type="button" :disabled="disabled" @click="openModal">
        <span aria-hidden="true">◎</span>
        <span>多语言</span>
      </button>
    </div>
    <button
      v-else
      class="ml-field__btn ml-field__btn--icon"
      type="button"
      :disabled="disabled"
      @click="openModal"
    >
      <span aria-hidden="true">◎</span>
      <span>多语言</span>
    </button>
    <p v-if="!buttonOnly" class="ml-field__key">Key: <code>{{ translationKey }}</code></p>

    <div v-if="visible" class="ml-modal-mask" @click.self="closeModal">
      <section class="ml-modal">
        <header class="ml-modal__head">
          <div class="ml-modal__title">
            <span aria-hidden="true">◎</span>
            <h3>多语言</h3>
            <strong>{{ label }}</strong>
          </div>
          <button class="ml-modal__close" type="button" @click="closeModal">×</button>
        </header>

        <div class="ml-modal__body">
          <div class="ml-key-row">
            <label><span>*</span> KEY</label>
            <div class="ml-key-input">
              <span>{{ draftKey.prefix }}</span>
              <input v-model="draftKey.name" />
            </div>
            <em>{{ filledCount }}/{{ languageOptions.length }} 已填</em>
          </div>
          <p class="ml-key-hint">
            Key 与原文必填；Key 仅支持小写字母、数字、下划线和点号，保存时会用于统一多语言管理。
          </p>

          <div
            v-for="language in languageOptions"
            :key="language.code"
            class="ml-language-row"
          >
            <label :class="{ required: language.code === 'zh-CN' }">
              {{ language.label }}
            </label>
            <div class="ml-language-control">
              <textarea
                v-model="draftValues[language.code]"
                :placeholder="language.placeholder"
                rows="3"
              />
              <span
                class="ml-language-status"
                :class="{ filled: String(draftValues[language.code] ?? '').trim() }"
              />
            </div>
          </div>
        </div>

        <footer class="ml-modal__footer">
          <button class="btn btn--ghost" type="button" @click="closeModal">取消</button>
          <button class="btn" type="button" @click="save">保存</button>
        </footer>
      </section>
    </div>
  </div>
</template>
