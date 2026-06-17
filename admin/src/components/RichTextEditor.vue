<script setup>
import { nextTick, onMounted, ref, watch } from "vue";

const model = defineModel({ type: String, default: "" });
const editorRef = ref(null);

function syncFromEditor() {
  if (!editorRef.value) return;
  const html = editorRef.value.innerHTML;
  if (html !== model.value) {
    model.value = html;
  }
}

function applyToEditor(html) {
  if (!editorRef.value) return;
  if (editorRef.value.innerHTML !== html) {
    editorRef.value.innerHTML = html || "";
  }
}

function exec(command, value) {
  editorRef.value?.focus();
  document.execCommand(command, false, value ?? undefined);
  syncFromEditor();
}

function insertLink() {
  const url = window.prompt("链接地址", "https://");
  if (!url?.trim()) return;
  exec("createLink", url.trim());
}

function onInput() {
  syncFromEditor();
}

onMounted(() => {
  applyToEditor(model.value);
});

watch(
  () => model.value,
  (html) => {
    nextTick(() => applyToEditor(html));
  },
);
</script>

<template>
  <div class="rich-text-editor">
    <div class="rich-text-editor__toolbar">
      <button type="button" class="rte-btn" title="加粗" @click="exec('bold')"><b>B</b></button>
      <button type="button" class="rte-btn" title="斜体" @click="exec('italic')"><i>I</i></button>
      <button type="button" class="rte-btn" title="下划线" @click="exec('underline')"><u>U</u></button>
      <span class="rte-sep" />
      <button type="button" class="rte-btn" @click="exec('formatBlock', 'h4')">小标题</button>
      <button type="button" class="rte-btn" @click="exec('formatBlock', 'p')">正文</button>
      <span class="rte-sep" />
      <button type="button" class="rte-btn" @click="exec('insertUnorderedList')">列表</button>
      <button type="button" class="rte-btn" @click="insertLink">链接</button>
    </div>
    <div
      ref="editorRef"
      class="rich-text-editor__body"
      contenteditable="true"
      data-placeholder="输入充值说明内容…"
      @input="onInput"
      @blur="syncFromEditor"
    />
  </div>
</template>
