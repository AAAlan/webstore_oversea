<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { adminApi } from "../api.js";
import PublishBar from "../components/PublishBar.vue";
import { normalizeRechargeTipsForForm } from "../lib/recharge-tips.js";
import { useAutosave } from "../lib/useAutosave.js";
import {
  DEFAULT_LANGUAGE_OPTIONS,
  buildLocaleOptions,
  getDefaultLanguageConfig,
} from "../../../shared/language-presets.js";

const props = defineProps({ loading: Boolean });
const emit = defineEmits(["toast", "loading", "status-change"]);

const config = reactive(emptyConfig());
const publishMeta = ref(null);
const activeLocale = ref("zh-CN");
const newLanguageCode = ref("");
const newLanguageLabel = ref("");
const autosave = useAutosave({
  watchSource: config,
  snapshot: () => JSON.stringify(buildPayload()),
  save: () => persistDraft({ quiet: true }),
  enabled: computed(() => !props.loading),
  delay: 900,
});

const localeList = computed(() =>
  buildLocaleOptions({
    languageMeta: config.languageMeta,
    languages: config.languages,
  }),
);

function emptyConfig() {
  return {
    game: { name: "", iconUrl: "" },
    banners: [],
    header: {
      publisherLogoUrl: "",
      customerServiceUrl: "",
      rechargeCenterName: "",
      rechargeTips: { contentHtml: "" },
    },
    footer: {
      publisherLogoUrl: "",
      copyrightText: "",
      privacyPolicyUrl: "",
      userAgreementUrl: "",
      contactText: "",
      icpText: "",
      footerLinks: {},
    },
    languageMeta: Object.fromEntries(
      DEFAULT_LANGUAGE_OPTIONS.map((language) => [language.code, { label: language.label }]),
    ),
    languages: Object.fromEntries(
      DEFAULT_LANGUAGE_OPTIONS.map((language) => [
        language.code,
        emptyLanguageConfig(language.code),
      ]),
    ),
  };
}

function emptyLanguageConfig(locale = "zh-CN") {
  const fallback = getDefaultLanguageConfig(locale);
  return {
    gameName: fallback.gameName,
    banners: [],
    header: {
      publisherLogoUrl: "",
      customerServiceUrl: "",
      rechargeTips: { contentHtml: "" },
    },
    footer: {
      publisherLogoUrl: "",
    },
    rechargeTips: { contentHtml: "" },
    footerDisclaimer: fallback.footerDisclaimer,
    footerLinks: { ...fallback.footerLinks },
    copyrightText: "© GRYPHLINE. All rights reserved.",
    privacyPolicyUrl: "https://www.happyelements.com/",
    userAgreementUrl: "https://www.happyelements.com/",
    contactText: "Customer Support",
    icpText: "",
  };
}

function normalizeBannerItem(banner, fallback = {}) {
  return {
    id: banner?.id ?? fallback.id ?? `banner-${Date.now()}`,
    title: typeof banner?.title === "string" ? banner.title : fallback.title ?? "",
    imageUrl: typeof banner?.imageUrl === "string" ? banner.imageUrl : fallback.imageUrl ?? "",
    linkUrl: typeof banner?.linkUrl === "string" ? banner.linkUrl : fallback.linkUrl ?? "",
    enabled: typeof banner?.enabled === "boolean" ? banner.enabled : fallback.enabled ?? true,
    sortOrder: Number.isFinite(banner?.sortOrder) ? banner.sortOrder : fallback.sortOrder ?? 0,
  };
}

function normalizeBannerList(banners, fallback = []) {
  const source = Array.isArray(banners) ? banners : fallback;
  return (source ?? []).map((banner, index) =>
    normalizeBannerItem(banner, fallback[index] ?? { sortOrder: index + 1, enabled: true }),
  );
}

function normalizeLanguageForForm(language, locale, fallbackBanners = []) {
  const fallback = emptyLanguageConfig(locale);
  return {
    ...fallback,
    ...(language ?? {}),
    banners: normalizeBannerList(
      language?.banners,
      fallbackBanners.length ? fallbackBanners : fallback.banners,
    ),
    header: {
      ...fallback.header,
      ...(language?.header ?? {}),
      rechargeTips: normalizeRechargeTipsForForm(language?.header?.rechargeTips),
    },
    footer: {
      ...fallback.footer,
      ...(language?.footer ?? {}),
    },
    rechargeTips: normalizeRechargeTipsForForm(language?.rechargeTips),
  };
}

function bannerListFor(locale = activeLocale.value) {
  return config.languages[locale]?.banners ?? config.banners;
}

function applyDraft(draft) {
  const baseBanners = normalizeBannerList(draft.banners, []);
  const languages = Object.fromEntries(
    DEFAULT_LANGUAGE_OPTIONS.map((language) => [
      language.code,
      normalizeLanguageForForm(draft.languages?.[language.code], language.code, baseBanners),
    ]),
  );
  for (const [locale, item] of Object.entries(draft.languages ?? {})) {
    if (languages[locale]) continue;
    languages[locale] = normalizeLanguageForForm(item, locale, baseBanners);
  }
  Object.assign(config, {
    game: { ...draft.game, iconUrl: draft.game.iconUrl ?? "" },
    banners: baseBanners.map((b) => ({ ...b })),
    header: {
      publisherLogoUrl: draft.header?.publisherLogoUrl ?? "",
      customerServiceUrl: draft.header?.customerServiceUrl ?? "",
      rechargeCenterName: draft.header?.rechargeCenterName ?? "",
      rechargeTips: normalizeRechargeTipsForForm(draft.header?.rechargeTips),
    },
    footer: { ...(draft.footer ?? {}), footerLinks: draft.footer?.footerLinks ?? {} },
    languageMeta: {
      ...Object.fromEntries(
        DEFAULT_LANGUAGE_OPTIONS.map((language) => [language.code, { label: language.label }]),
      ),
      ...(draft.languageMeta ?? {}),
    },
    languages,
  });
  for (const code of Object.keys(config.languages)) {
    if (!config.languageMeta[code]) {
      config.languageMeta[code] = { label: code };
    }
  }
  if (!config.languages[activeLocale.value]) {
    activeLocale.value = Object.keys(config.languages)[0] ?? "zh-CN";
  }
}

function localeLabel(locale) {
  return config.languageMeta?.[locale]?.label ?? locale;
}

function addLanguageEntry() {
  const code = newLanguageCode.value.trim();
  if (!code || config.languages[code]) return;
  const source = config.languages[activeLocale.value] ?? emptyLanguageConfig(code);
  config.languages[code] = normalizeLanguageForForm(
    {
      ...source,
      footer: { ...(source.footer ?? {}) },
      footerLinks: { ...(source.footerLinks ?? {}) },
    },
    code,
    bannerListFor(activeLocale.value),
  );
  config.languageMeta[code] = { label: newLanguageLabel.value.trim() || code };
  activeLocale.value = code;
  newLanguageCode.value = "";
  newLanguageLabel.value = "";
}

function removeLanguage(locale) {
  if (Object.keys(config.languages).length <= 1) return;
  delete config.languages[locale];
  if (config.languageMeta) delete config.languageMeta[locale];
  if (!config.languages[activeLocale.value]) {
    activeLocale.value = Object.keys(config.languages)[0] ?? "zh-CN";
  }
}

function buildPayload() {
  return {
    game: {
      name: config.game.name.trim(),
      icon: "",
      iconUrl: config.game.iconUrl?.trim() || null,
    },
    banners: (config.banners ?? []).map((banner, index) => ({
      ...banner,
      title: String(banner.title ?? "").trim(),
      imageUrl: String(banner.imageUrl ?? "").trim(),
      linkUrl: String(banner.linkUrl ?? "").trim(),
      sortOrder: Number.isFinite(banner.sortOrder) ? banner.sortOrder : index + 1,
    })),
    header: {
      publisherLogoUrl: config.header.publisherLogoUrl?.trim() || null,
      customerServiceUrl: config.header.customerServiceUrl.trim(),
      rechargeCenterName: config.header.rechargeCenterName.trim(),
      rechargeTips: {
        contentHtml: config.header.rechargeTips.contentHtml,
      },
    },
    footer: {
      publisherLogoUrl: config.footer.publisherLogoUrl?.trim() || null,
      copyrightText: config.footer.copyrightText.trim(),
      privacyPolicyUrl: config.footer.privacyPolicyUrl.trim(),
      userAgreementUrl: config.footer.userAgreementUrl.trim(),
      contactText: config.footer.contactText.trim(),
      icpText: config.footer.icpText.trim(),
    },
    languageMeta: config.languageMeta,
    languages: Object.fromEntries(
      Object.entries(config.languages).map(([locale, item]) => [
        locale,
        {
          gameName: String(item.gameName ?? "").trim(),
          banners: Array.isArray(item.banners) ? item.banners : [],
          rechargeTips: {
            contentHtml: item.rechargeTips?.contentHtml ?? "",
          },
          copyrightText: String(item.copyrightText ?? "").trim(),
          privacyPolicyUrl: String(item.privacyPolicyUrl ?? "").trim(),
          userAgreementUrl: String(item.userAgreementUrl ?? "").trim(),
          contactText: String(item.contactText ?? "").trim(),
          icpText: String(item.icpText ?? "").trim(),
          footerDisclaimer: String(item.footerDisclaimer ?? "").trim(),
          footerLinks: Object.fromEntries(
            Object.entries(item.footerLinks ?? {}).map(([key, value]) => [
              key,
              String(value ?? "").trim(),
            ]),
          ),
          footer: {
            publisherLogoUrl: item.footer?.publisherLogoUrl?.trim() || null,
          },
        },
      ]),
    ),
  };
}

async function load() {
  emit("loading", true);
  try {
    const data = await adminApi.mallConfig.get();
    applyDraft(data.draft);
    publishMeta.value = data.meta;
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
    const result = await adminApi.mallConfig.saveDraft(buildPayload());
    publishMeta.value = result.meta;
    emit("status-change");
    autosave.markClean(JSON.stringify(buildPayload()));
    if (!quiet) emit("toast", "success", "草稿已保存");
    return result;
  } catch (error) {
    if (!quiet) emit("toast", "error", error.message);
    return null;
  } finally {
    if (!quiet) emit("loading", false);
  }
}

async function saveDraft() {
  return persistDraft({ quiet: false });
}

async function publish() {
  if (!publishMeta.value?.hasUnpublishedChanges) return;
  if (!confirm("确认发布当前草稿？")) return;
  emit("loading", true);
  try {
    const saved = await persistDraft({ quiet: true });
    if (!saved) return;
    const result = await adminApi.mallConfig.publish();
    publishMeta.value = result.meta;
    emit("status-change");
    emit("toast", "success", "已发布（后台配置已更新）");
  } catch (error) {
    emit("toast", "error", error.message);
  } finally {
    emit("loading", false);
  }
}

onMounted(load);

defineExpose({
  load,
  autosaveStatus: autosave.status,
});
</script>

<template>
  <div class="language-panel">
    <PublishBar
      :meta="publishMeta"
      :loading="props.loading"
      module-label="语言管理"
      :autosave-state="autosave.status"
      @save-draft="saveDraft"
      @publish="publish"
    />

    <p class="page-intro">
      管理商城支持的语言与语言显示名。新增语言后会同步到页面内容、多语言弹框和页脚配置。
    </p>

    <section class="panel">
      <div class="panel-header"><h3>语言管理</h3></div>
      <div class="panel-body form-grid">
        <div class="field field--full">
          <div class="footer-template-adder">
            <input v-model="newLanguageCode" placeholder="语言代码，如 es" />
            <input v-model="newLanguageLabel" placeholder="显示名称，如 西语" />
            <button
              class="btn btn--ghost btn--sm"
              type="button"
              :disabled="!newLanguageCode.trim()"
              @click="addLanguageEntry"
            >
              添加语言
            </button>
          </div>
        </div>
        <div class="field field--full">
          <div class="language-tabs language-tabs--compact">
            <button
              v-for="language in localeList"
              :key="language.code"
              type="button"
              class="language-tab"
              :class="{ active: activeLocale === language.code }"
              @click="activeLocale = language.code"
            >
              {{ localeLabel(language.code) }}
            </button>
          </div>
        </div>
        <div class="field field--full">
          <label>语言代码</label>
          <input :value="activeLocale" readonly class="readonly-field" />
        </div>
        <div class="field field--full">
          <label>显示名称</label>
          <input v-model="config.languageMeta[activeLocale].label" />
        </div>
        <div class="field field--full">
          <button
            class="btn btn--ghost btn--sm"
            type="button"
            :disabled="Object.keys(config.languages).length <= 1"
            @click="removeLanguage(activeLocale)"
          >
            删除当前语言
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
