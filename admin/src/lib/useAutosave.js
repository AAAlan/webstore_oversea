import { computed, onBeforeUnmount, ref, unref, watch } from "vue";

export function useAutosave({
  watchSource,
  snapshot,
  save,
  enabled = true,
  delay = 800,
}) {
  const saving = ref(false);
  const dirty = ref(false);
  const ready = ref(false);
  const status = computed(() => {
    if (saving.value) return "saving";
    if (dirty.value) return "dirty";
    return ready.value ? "clean" : "idle";
  });
  let timer = null;
  let queued = false;
  let lastSnapshot = "";

  function currentSnapshot() {
    return snapshot();
  }

  function canRun() {
    return Boolean(unref(enabled)) && ready.value;
  }

  function markClean(nextSnapshot = currentSnapshot()) {
    lastSnapshot = nextSnapshot;
    dirty.value = false;
    ready.value = true;
  }

  async function flush() {
    clearTimeout(timer);
    timer = null;

    if (!canRun()) return false;

    const nextSnapshot = currentSnapshot();
    if (nextSnapshot === lastSnapshot) {
      dirty.value = false;
      return true;
    }

    if (saving.value) {
      queued = true;
      return false;
    }

    saving.value = true;
    try {
      const result = await save();
      if (result === false || result == null) {
        dirty.value = true;
        return false;
      }
      markClean(currentSnapshot());
      return true;
    } finally {
      saving.value = false;
      if (queued) {
        queued = false;
        void flush();
      }
    }
  }

  function schedule() {
    if (!canRun()) return;

    const nextSnapshot = currentSnapshot();
    dirty.value = nextSnapshot !== lastSnapshot;
    if (!dirty.value) return;

    clearTimeout(timer);
    timer = setTimeout(() => {
      void flush();
    }, delay);
  }

  watch(watchSource, schedule, { deep: true, flush: "post" });

  onBeforeUnmount(() => {
    clearTimeout(timer);
    if (ready.value && dirty.value && !saving.value) {
      void flush();
    }
  });

  return {
    saving,
    dirty,
    ready,
    status,
    markClean,
    flush,
    schedule,
  };
}
