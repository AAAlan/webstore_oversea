<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { adminApi } from "../api.js";
import ImageUploadField from "../components/ImageUploadField.vue";
import PublishBar from "../components/PublishBar.vue";
import RichTextEditor from "../components/RichTextEditor.vue";
import { normalizeRechargeTipsForForm } from "../lib/recharge-tips.js";
import { useAutosave } from "../lib/useAutosave.js";
import {
  DEFAULT_LANGUAGE_OPTIONS,
  buildLocaleOptions,
  getDefaultLanguageConfig,
  getFooterFieldDefinitions,
} from "../../../shared/language-presets.js";

const props = defineProps({ loading: Boolean });
const emit = defineEmits(["toast", "loading", "status-change"]);

const defaultBannerTemplates = [
  {
    id: "banner-1",
    title: "春季活动",
    imageUrl: "",
    linkUrl: "https://www.happyelements.com/",
    enabled: true,
    sortOrder: 1,
  },
];

const config = reactive(emptyConfig());
const publishMeta = ref(null);
const activeLocale = ref("zh-CN");
const showLanguageManager = ref(false);
const newLanguageCode = ref("");
const languageManagerDraft = ref([]);
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
    banners: defaultBannerTemplates.map((banner) => ({ ...banner })),
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
    banners: defaultBannerTemplates.map((banner) => ({ ...banner })),
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
    banners: normalizeBannerList(language?.banners, fallbackBanners.length ? fallbackBanners : fallback.banners),
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

function emptyBanner() {
  return {
    id: `banner-${Date.now()}`,
    title: "",
    imageUrl: "",
    linkUrl: "",
    enabled: true,
    sortOrder: bannerListFor(activeLocale.value).length + 1,
  };
}

function bannerListFor(locale = activeLocale.value) {
  return config.languages[locale]?.banners ?? config.banners;
}

function applyDraft(draft) {
  const baseBanners = normalizeBannerList(draft.banners, defaultBannerTemplates);
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
      publisherLogoUrl: draft.header.publisherLogoUrl ?? "",
      customerServiceUrl: draft.header.customerServiceUrl ?? "",
      rechargeCenterName: draft.header.rechargeCenterName ?? "",
      rechargeTips: normalizeRechargeTipsForForm(draft.header.rechargeTips),
    },
    footer: { ...draft.footer },
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

const localeStatus = (locale) => {
  const language = config.languages[locale];
  if (!language) return "未配置";
  const hasContent =
    String(language.gameName ?? "").trim() ||
    (language.banners?.length ?? 0) > 0 ||
    String(language.rechargeTips?.contentHtml ?? "").trim() ||
    String(language.footerDisclaimer ?? "").trim() ||
    String(language.copyrightText ?? "").trim() ||
    String(language.privacyPolicyUrl ?? "").trim() ||
    String(language.userAgreementUrl ?? "").trim() ||
    String(language.contactText ?? "").trim() ||
    String(language.icpText ?? "").trim() ||
    Object.values(language.footerLinks ?? {}).some((value) => String(value ?? "").trim());
  return hasContent ? "已配置" : "未配置";
};

function openLanguageManager() {
  showLanguageManager.value = true;
  newLanguageCode.value = "";
  languageManagerDraft.value = localeList.value.map((language) => ({
    code: language.code,
    label: localeLabel(language.code),
  }));
}

function closeLanguageManager() {
  showLanguageManager.value = false;
  newLanguageCode.value = "";
  languageManagerDraft.value = [];
}

const availableLanguageOptions = computed(() =>
  DEFAULT_LANGUAGE_OPTIONS.filter(
    (language) => !languageManagerDraft.value.some((item) => item.code === language.code),
  ),
);

function addLanguageEntry() {
  const code = newLanguageCode.value.trim();
  if (!code || languageManagerDraft.value.some((item) => item.code === code)) return;
  const option = DEFAULT_LANGUAGE_OPTIONS.find((language) => language.code === code);
  languageManagerDraft.value = [
    ...languageManagerDraft.value,
    { code, label: option?.label ?? code },
  ];
  newLanguageCode.value = "";
}

function removeLanguage(locale) {
  if (languageManagerDraft.value.length <= 1) return;
  languageManagerDraft.value = languageManagerDraft.value.filter((item) => item.code !== locale);
}

function footerFieldDefsFor(locale) {
  return getFooterFieldDefinitions(locale, config.languages[locale]?.footerLinks ?? {});
}

const footerProtectedKeys = new Set([
  "termsLabel",
  "privacyLabel",
  "contactLabel",
  "rulesLabel",
  "paymentLabel",
  "ageLabel",
]);

function removeFooterField(locale, key) {
  if (footerProtectedKeys.has(key)) return;
  delete config.languages[locale]?.footerLinks?.[key];
}

const activeFooterLanguage = computed(
  () => config.languages[activeLocale.value] ?? config.languages["zh-CN"] ?? null,
);

async function load() {
  emit("loading", true);
  try {
    const data = await adminApi.mallConfig.get();
    applyDraft(data.draft);
    publishMeta.value = data.meta;
    autosave.markClean(JSON.stringify(buildPayload()));
    emit("status-change");
  } catch (e) {
    emit("toast", "error", e.message);
  } finally {
    emit("loading", false);
  }
}

function buildPayload() {
  const footerLanguage =
    config.languages[activeLocale.value] ?? config.languages["zh-CN"] ?? emptyLanguageConfig();
  const publishedBanners = normalizeBannerList(
    config.languages[activeLocale.value]?.banners ?? bannerListFor(activeLocale.value),
    defaultBannerTemplates,
  );
  return {
    game: {
      name: config.game.name.trim(),
      icon: "",
      iconUrl: config.game.iconUrl?.trim() || null,
    },
    banners: publishedBanners.map((b, i) => ({
      ...b,
      title: b.title.trim(),
      imageUrl: b.imageUrl.trim(),
      linkUrl: b.linkUrl.trim(),
      sortOrder: b.sortOrder ?? i + 1,
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
      publisherLogoUrl: footerLanguage.footer.publisherLogoUrl?.trim() || null,
      copyrightText: footerLanguage.copyrightText.trim(),
      privacyPolicyUrl: footerLanguage.privacyPolicyUrl.trim(),
      userAgreementUrl: footerLanguage.userAgreementUrl.trim(),
      contactText: footerLanguage.contactText.trim(),
      icpText: footerLanguage.icpText.trim(),
    },
    languageMeta: config.languageMeta,
    languages: Object.fromEntries(
      Object.entries(config.languages).map(([locale, item]) => [
        locale,
        {
          gameName: item.gameName.trim(),
          banners: normalizeBannerList(item.banners, publishedBanners).map((b, i) => ({
            ...b,
            title: b.title.trim(),
            imageUrl: b.imageUrl.trim(),
            linkUrl: b.linkUrl.trim(),
            sortOrder: b.sortOrder ?? i + 1,
          })),
          rechargeTips: {
            contentHtml: item.rechargeTips.contentHtml,
          },
          copyrightText: item.copyrightText.trim(),
          privacyPolicyUrl: item.privacyPolicyUrl.trim(),
          userAgreementUrl: item.userAgreementUrl.trim(),
          contactText: item.contactText.trim(),
          icpText: item.icpText.trim(),
          footerDisclaimer: item.footerDisclaimer.trim(),
          footerLinks: Object.fromEntries(
            Object.entries(item.footerLinks ?? {}).map(([key, value]) => [
              key,
              String(value ?? "").trim(),
            ]),
          ),
        },
      ]),
    ),
  };
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
  } catch (e) {
    if (!quiet) emit("toast", "error", e.message);
    return null;
  } finally {
    if (!quiet) emit("loading", false);
  }
}

async function saveDraft() {
  return persistDraft({ quiet: false });
}

async function saveLanguageManager() {
  if (!languageManagerDraft.value.length) return;

  const draft = languageManagerDraft.value.map((item) => ({
    code: item.code,
    label: item.label?.trim() || item.code,
  }));
  const nextCodes = new Set(draft.map((item) => item.code));
  const nextLanguages = {};
  const nextLanguageMeta = {};
  const sourceLocale = config.languages[activeLocale.value]
    ? activeLocale.value
    : draft[0]?.code ?? "zh-CN";
  const sourceLanguage = config.languages[sourceLocale] ?? emptyLanguageConfig(sourceLocale);

  for (const item of draft) {
    nextLanguages[item.code] = config.languages[item.code]
      ? config.languages[item.code]
      : normalizeLanguageForForm(sourceLanguage, item.code, bannerListFor(sourceLocale));
    nextLanguageMeta[item.code] = { label: item.label };
  }

  for (const code of Object.keys(config.languages)) {
    if (!nextCodes.has(code)) delete config.languages[code];
  }
  Object.assign(config.languages, nextLanguages);

  for (const code of Object.keys(config.languageMeta)) {
    if (!nextCodes.has(code)) delete config.languageMeta[code];
  }
  Object.assign(config.languageMeta, nextLanguageMeta);

  if (!config.languages[activeLocale.value]) {
    activeLocale.value = draft[0]?.code ?? Object.keys(config.languages)[0] ?? "zh-CN";
  }

  closeLanguageManager();
  await persistDraft({ quiet: false });
}

async function publish() {
  if (!publishMeta.value?.hasUnpublishedChanges) return;
  if (!confirm("确认发布当前草稿？（暂不会同步到 C 端商城）")) return;
  emit("loading", true);
  try {
    const saved = await persistDraft({ quiet: true });
    if (!saved) return;
    const result = await adminApi.mallConfig.publish();
    publishMeta.value = result.meta;
    emit("status-change");
    emit("toast", "success", "已发布（后台配置已更新）");
  } catch (e) {
    emit("toast", "error", e.message);
  } finally {
    emit("loading", false);
  }
}

function addBanner(locale = activeLocale.value) {
  const list = bannerListFor(locale);
  const next = [...list, emptyBanner()];
  config.languages[locale].banners = next;
  if (locale === "zh-CN") {
    config.banners = next;
  }
}

function removeBanner(id, locale = activeLocale.value) {
  const list = bannerListFor(locale);
  const next = list.filter((b) => b.id !== id);
  config.languages[locale].banners = next;
  if (locale === "zh-CN") {
    config.banners = next;
  }
}

onMounted(load);

defineExpose({
  load,
  autosaveStatus: autosave.status,
});
</script>

<template>
  <div class="content-panel">
    <PublishBar
      :meta="publishMeta"
      :loading="props.loading"
      module-label="页面内容"
      :autosave-state="autosave.status"
      @save-draft="saveDraft"
      @publish="publish"
    />

    <p class="page-intro">
      按语言版本配置页面内容。先在左侧选择语言，再编辑对应模块。编辑后<strong>保存草稿</strong>，确认后<strong>发布</strong>（当前仅写入后台，不同步 C 端商城）。
    </p>

    <div class="content-shell">
      <aside class="content-language-rail">
        <div class="content-language-rail__head">
          <div>
            <h3>语言版本</h3>
            <p>选择要配置的语言</p>
          </div>
          <button class="btn btn--ghost btn--sm" type="button" @click="openLanguageManager">
            多语言
          </button>
        </div>
        <div class="content-language-list">
          <button
            v-for="language in localeList"
            :key="language.code"
            type="button"
            class="content-language-item"
            :class="{ active: activeLocale === language.code }"
            @click="activeLocale = language.code"
          >
            <span class="content-language-item__name">{{ localeLabel(language.code) }}</span>
            <span class="content-language-item__code">{{ language.code }}</span>
            <span class="content-language-item__status">{{ localeStatus(language.code) }}</span>
          </button>
        </div>
      </aside>

      <div class="content-workspace">
        <div class="content-workspace__head">
          <h2>{{ localeLabel(activeLocale) }} - 页面内容配置</h2>
          <p>当前语言下的页面模块会独立配置，语言名称可在左侧统一管理。</p>
        </div>

        <section class="panel">
          <div class="panel-header"><h3>1. 游戏展示</h3></div>
          <div class="panel-body form-grid">
            <div class="field field--full">
              <label>游戏名称</label>
              <input v-model="config.languages[activeLocale].gameName" />
            </div>
            <div class="field field--full">
              <ImageUploadField
                v-model="config.game.iconUrl"
                label="游戏 Icon"
                hint="建议 1:1 比例；支持 PNG、JPG、WebP、GIF"
              />
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h3>2. 商城 Banner</h3>
              <p class="panel-subtitle">{{ localeLabel(activeLocale) }} 下的 Banner 列表</p>
            </div>
            <button class="btn btn--ghost btn--sm" type="button" @click="addBanner(activeLocale)">
              添加 Banner
            </button>
          </div>
          <p class="hint panel-hint">Banner 图片、标题和跳转链接按语言分别配置，点击编辑当前语言版本。</p>
          <div v-for="banner in bannerListFor(activeLocale)" :key="banner.id" class="sub-card">
            <div class="form-grid">
              <div class="field">
                <label>标题</label>
                <input v-model="banner.title" />
              </div>
              <div class="field">
                <label>排序</label>
                <input v-model.number="banner.sortOrder" type="number" />
              </div>
              <div class="field field--full">
                <ImageUploadField
                  v-model="banner.imageUrl"
                  label="Banner 图片"
                  hint="建议横向比例（如 16:9）；支持 PNG、JPG、WebP、GIF"
                  :preview-width="160"
                  :preview-height="90"
                />
              </div>
              <div class="field field--full">
                <label>跳转链接</label>
                <input v-model="banner.linkUrl" />
              </div>
              <div class="field">
                <label>上架</label>
                <select v-model="banner.enabled">
                  <option :value="true">是</option>
                  <option :value="false">否</option>
                </select>
              </div>
            </div>
            <button class="btn btn--danger btn--sm" type="button" @click="removeBanner(banner.id, activeLocale)">
              删除
            </button>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header"><h3>3. 页头配置</h3></div>
          <div class="panel-body form-grid">
            <div class="field field--full">
              <ImageUploadField v-model="config.header.publisherLogoUrl" label="发行主体 Logo" hint="页头展示；建议透明底 PNG" />
            </div>
            <div class="field field--full">
              <label>客服中心链接</label>
              <input v-model="config.header.customerServiceUrl" />
            </div>
            <div class="field field--full">
              <label>充值中心名称</label>
              <input v-model="config.header.rechargeCenterName" />
            </div>
            <div class="field field--full">
              <label>充值说明文案</label>
              <RichTextEditor v-model="config.header.rechargeTips.contentHtml" />
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header"><h3>4. 页尾配置</h3></div>
          <div class="panel-body form-grid">
            <div class="field field--full">
              <div class="content-footer-locale">
                <span>当前编辑语言：{{ localeLabel(activeLocale) }}</span>
              </div>
            </div>
            <div class="field field--full">
              <ImageUploadField v-model="activeFooterLanguage.footer.publisherLogoUrl" label="发行主体 Logo" hint="页脚展示；建议透明底 PNG" />
            </div>
            <div class="field field--full">
              <div class="footer-field-list">
                <div class="footer-field-head">
                  <span>字段名称</span>
                  <span>字段值</span>
                  <span></span>
                </div>
                <div
                  v-for="field in footerFieldDefsFor(activeLocale)"
                  :key="field.key"
                  class="footer-field-row"
                >
                  <label class="footer-field-row__label">{{ field.label }}</label>
                  <div class="footer-field-row__value">
                    <input v-model="activeFooterLanguage.footerLinks[field.key]" />
                  </div>
                  <div class="footer-field-row__actions">
                    <button
                      v-if="field.removable"
                      class="link-button"
                      type="button"
                      @click="removeFooterField(activeLocale, field.key)"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field--full">
              <label>版权信息文案</label>
              <input v-model="activeFooterLanguage.copyrightText" />
            </div>
            <div class="field field--full">
              <label>页尾提示文案</label>
              <input v-model="activeFooterLanguage.footerDisclaimer" />
            </div>
            <div class="field field--full">
              <label>备案信息文案</label>
              <input v-model="activeFooterLanguage.icpText" />
            </div>
          </div>
        </section>
      </div>
    </div>

    <div v-if="showLanguageManager" class="modal-mask" @click.self="closeLanguageManager">
      <section class="language-manager-modal">
        <header class="language-manager-head">
          <h3>管理支持的语言</h3>
          <button class="modal-close" type="button" @click="closeLanguageManager">×</button>
        </header>

        <div class="language-manager-body">
          <div class="language-manager-section">
            <div class="language-manager-label">当前支持的语言</div>
            <div class="language-manager-chip-list">
              <span
                v-for="language in languageManagerDraft"
                :key="language.code"
                class="language-manager-chip"
              >
                <span>{{ localeLabel(language.code) }}（{{ language.code }}）</span>
                <button
                  type="button"
                  class="language-manager-chip-close"
                  :disabled="languageManagerDraft.length <= 1"
                  @click="removeLanguage(language.code)"
                >
                  ×
                </button>
              </span>
            </div>
          </div>

          <div class="language-manager-section">
            <div class="language-manager-label">添加新语言</div>
            <div class="language-manager-add">
              <select v-model="newLanguageCode">
                <option value="">选择要添加的语言</option>
                <option v-for="language in availableLanguageOptions" :key="language.code" :value="language.code">
                  {{ language.label }}（{{ language.code }}）
                </option>
              </select>
              <button class="btn language-manager-add-btn" type="button" :disabled="!newLanguageCode.trim()" @click="addLanguageEntry">
                添加
              </button>
            </div>
          </div>

          <div class="language-manager-notice">
            <p>• 删除语言会同步删除该语言下的全部页面配置数据，请谨慎操作</p>
            <p>• 至少需要保留一种语言</p>
          </div>
        </div>

        <footer class="language-manager-footer">
          <button class="btn btn--ghost language-manager-footer__btn" type="button" @click="closeLanguageManager">
            取消
          </button>
          <button class="btn language-manager-footer__btn language-manager-footer__btn--primary" type="button" @click="saveLanguageManager">
            保存更改
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>
