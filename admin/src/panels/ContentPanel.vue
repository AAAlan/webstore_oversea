<script setup>
import { onMounted, reactive, ref } from "vue";
import { adminApi } from "../api.js";
import ImageUploadField from "../components/ImageUploadField.vue";
import MultilingualField from "../components/MultilingualField.vue";
import PublishBar from "../components/PublishBar.vue";
import RichTextEditor from "../components/RichTextEditor.vue";
import { normalizeRechargeTipsForForm } from "../lib/recharge-tips.js";

const props = defineProps({ loading: Boolean });
const emit = defineEmits(["toast", "loading", "status-change"]);

const languageOptions = [
  { code: "zh-CN", label: "简中" },
  { code: "zh-TW", label: "繁中" },
  { code: "en", label: "英语" },
  { code: "ja", label: "日语" },
  { code: "ko", label: "韩语" },
];

const defaultLanguageValues = {
  "zh-CN": { gameName: "终末地", footerDisclaimer: "业务内容请以游戏内信息为准。请合理安排游戏时间，适度消费。" },
  "zh-TW": { gameName: "終末地", footerDisclaimer: "業務內容請以遊戲內資訊為準。請合理安排遊戲時間，適度消費。" },
  en: { gameName: "Arknights: Endfield", footerDisclaimer: "In-game information prevails. Please play responsibly and spend moderately." },
  ja: { gameName: "アークナイツ：エンドフィールド", footerDisclaimer: "内容はゲーム内表示を基準とします。適度にお楽しみください。" },
  ko: { gameName: "명일방주: 엔드필드", footerDisclaimer: "상품 내용은 게임 내 정보를 기준으로 합니다. 적절한 이용과 소비를 부탁드립니다." },
};

const footerLinkDefaults = {
  "zh-CN": {
    termsLabel: "用户利用规则",
    privacyLabel: "隐私政策",
    contactLabel: "联系我们",
  },
  "zh-TW": {
    termsLabel: "服務條款",
    privacyLabel: "隱私政策",
    contactLabel: "聯絡我們",
  },
  en: {
    termsLabel: "TERMS OF SERVICE",
    privacyLabel: "PRIVACY POLICY",
    contactLabel: "CONTACT US",
  },
  ja: {
    termsLabel: "ユーザー利用規約",
    privacyLabel: "プライバシーポリシー",
    contactLabel: "お問い合わせ",
    rulesLabel: "資金決済法に基づく表示",
    paymentLabel: "資金決済法に基づく表示",
    ageLabel: "12歳以上",
  },
  ko: {
    termsLabel: "서비스 이용약관",
    privacyLabel: "개인 정보 처리 방침",
    contactLabel: "문의하기",
  },
};

const config = reactive(emptyConfig());
const publishMeta = ref(null);
const activeLocale = ref("zh-CN");
const translationMap = ref({});

function emptyConfig() {
  return {
    game: { name: "", iconUrl: "" },
    banners: [],
    header: {
      publisherLogoUrl: "",
      customerServiceUrl: "",
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
    languages: Object.fromEntries(
      languageOptions.map((language) => [
        language.code,
        emptyLanguageConfig(language.code),
      ]),
    ),
  };
}

function emptyLanguageConfig(locale = "zh-CN") {
  const fallback = defaultLanguageValues[locale] ?? defaultLanguageValues["zh-CN"];
  return {
    gameName: fallback.gameName,
    rechargeTips: { contentHtml: "" },
    footerDisclaimer: fallback.footerDisclaimer,
    footerLinks: {
      ...footerLinkDefaults[locale],
    },
    copyrightText: "© GRYPHLINE. All rights reserved.",
    privacyPolicyUrl: "https://www.happyelements.com/",
    userAgreementUrl: "https://www.happyelements.com/",
    contactText: "Customer Support",
    icpText: "",
  };
}

function normalizeLanguageForForm(language, locale) {
  const fallback = emptyLanguageConfig(locale);
  return {
    ...fallback,
    ...(language ?? {}),
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
    sortOrder: config.banners.length + 1,
  };
}

function applyDraft(draft) {
  const languages = Object.fromEntries(
    languageOptions.map((language) => [
      language.code,
      normalizeLanguageForForm(draft.languages?.[language.code], language.code),
    ]),
  );
  Object.assign(config, {
    game: { ...draft.game, iconUrl: draft.game.iconUrl ?? "" },
    banners: draft.banners.map((b) => ({ ...b })),
    header: {
      publisherLogoUrl: draft.header.publisherLogoUrl ?? "",
      customerServiceUrl: draft.header.customerServiceUrl ?? "",
      rechargeTips: normalizeRechargeTipsForForm(draft.header.rechargeTips),
    },
    footer: { ...draft.footer },
    languages,
  });
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

async function load() {
  emit("loading", true);
  try {
    const [data] = await Promise.all([adminApi.mallConfig.get(), loadTranslations()]);
    applyDraft(data.draft);
    publishMeta.value = data.meta;
    emit("status-change");
  } catch (e) {
    emit("toast", "error", e.message);
  } finally {
    emit("loading", false);
  }
}

function buildPayload() {
  return {
    game: {
      name: config.game.name.trim(),
      icon: "",
      iconUrl: config.game.iconUrl?.trim() || null,
    },
    banners: config.banners.map((b, i) => ({
      ...b,
      title: b.title.trim(),
      imageUrl: b.imageUrl.trim(),
      linkUrl: b.linkUrl.trim(),
      sortOrder: b.sortOrder ?? i + 1,
    })),
    header: {
      publisherLogoUrl: config.header.publisherLogoUrl?.trim() || null,
      customerServiceUrl: config.header.customerServiceUrl.trim(),
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
    languages: Object.fromEntries(
      languageOptions.map((language) => {
        const item = config.languages[language.code] ?? emptyLanguageConfig(language.code);
        return [
          language.code,
          {
            gameName: item.gameName.trim(),
            rechargeTips: {
              contentHtml: item.rechargeTips.contentHtml,
            },
            copyrightText: item.copyrightText.trim(),
            privacyPolicyUrl: item.privacyPolicyUrl.trim(),
            userAgreementUrl: item.userAgreementUrl.trim(),
            contactText: item.contactText.trim(),
            icpText: item.icpText.trim(),
            footerDisclaimer: item.footerDisclaimer.trim(),
            footerLinks: {
              termsLabel: item.footerLinks.termsLabel.trim(),
              privacyLabel: item.footerLinks.privacyLabel.trim(),
              contactLabel: item.footerLinks.contactLabel.trim(),
              rulesLabel: item.footerLinks.rulesLabel?.trim?.() ?? "",
              paymentLabel: item.footerLinks.paymentLabel?.trim?.() ?? "",
              ageLabel: item.footerLinks.ageLabel?.trim?.() ?? "",
            },
          },
        ];
      }),
    ),
  };
}

async function saveDraft() {
  emit("loading", true);
  try {
    const result = await adminApi.mallConfig.saveDraft(buildPayload());
    publishMeta.value = result.meta;
    emit("status-change");
    emit("toast", "success", "草稿已保存");
  } catch (e) {
    emit("toast", "error", e.message);
  } finally {
    emit("loading", false);
  }
}

async function publish() {
  if (!publishMeta.value?.hasUnpublishedChanges) return;
  if (!confirm("确认发布当前草稿？（暂不会同步到 C 端商城）")) return;
  emit("loading", true);
  try {
    await adminApi.mallConfig.saveDraft(buildPayload());
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

function addBanner() {
  config.banners.push(emptyBanner());
}

function removeBanner(id) {
  config.banners = config.banners.filter((b) => b.id !== id);
}

onMounted(load);
</script>

<template>
  <div class="content-panel">
    <PublishBar
      :meta="publishMeta"
      :loading="props.loading"
      module-label="页面内容"
      @save-draft="saveDraft"
      @publish="publish"
    />

    <p class="page-intro">
      按模块配置 C 端展示。编辑后<strong>保存草稿</strong>，确认后<strong>发布</strong>（当前仅写入后台，不同步 C 端商城）。
    </p>

    <!-- 1. 游戏展示 -->
    <section class="panel">
      <div class="panel-header"><h3>1. 游戏展示</h3></div>
      <div class="panel-body form-grid">
        <div class="field field--full">
          <label>游戏名称</label>
          <MultilingualField
            v-model="config.languages['zh-CN'].gameName"
            label="游戏名称"
            translation-key="mall.game.name"
            category="页面内容"
            usage="C端 - 游戏名称展示"
            :translations="valuesFor('mall.game.name', config.languages['zh-CN'].gameName)"
            @save-translations="saveTranslation"
          />
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

    <!-- 2. 商城 Banner -->
    <section class="panel">
      <div class="panel-header">
        <h3>2. 商城 Banner</h3>
        <button class="btn btn--ghost btn--sm" type="button" @click="addBanner">添加 Banner</button>
      </div>
      <p class="hint panel-hint">未上传 Banner 图时 C 端显示标题占位；点击跳转 linkUrl。</p>
      <div v-for="banner in config.banners" :key="banner.id" class="sub-card">
        <div class="form-grid">
          <div class="field">
            <label>标题</label>
            <MultilingualField
              v-model="banner.title"
              label="Banner 标题"
              :translation-key="`mall.banner.${banner.id}.title`"
              category="页面内容"
              usage="C端 - 商城 Banner 标题"
              :translations="valuesFor(`mall.banner.${banner.id}.title`, banner.title)"
              @save-translations="saveTranslation"
            />
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
        <button class="btn btn--danger btn--sm" type="button" @click="removeBanner(banner.id)">删除</button>
      </div>
    </section>

    <!-- 3. 页头配置 -->
    <section class="panel">
      <div class="panel-header"><h3>3. 页头配置</h3></div>
      <div class="panel-body form-grid">
        <div class="field field--full">
          <div class="language-tabs language-tabs--compact">
            <button
              v-for="language in languageOptions"
              :key="language.code"
              type="button"
              class="language-tab"
              :class="{ active: activeLocale === language.code }"
              @click="activeLocale = language.code"
            >
              {{ language.label }}
            </button>
          </div>
        </div>
        <div class="field field--full">
          <ImageUploadField
            v-model="config.languages[activeLocale].header.publisherLogoUrl"
            label="发行主体 Logo"
            hint="页头展示；建议透明底 PNG"
          />
        </div>
        <div class="field field--full">
          <label>客服中心链接</label>
          <input v-model="config.languages[activeLocale].header.customerServiceUrl" />
        </div>
        <div class="field field--full">
          <label>充值说明文案</label>
          <RichTextEditor v-model="config.languages[activeLocale].header.rechargeTips.contentHtml" />
        </div>
      </div>
    </section>

    <!-- 4. 页尾配置 -->
    <section class="panel">
      <div class="panel-header"><h3>4. 页尾配置</h3></div>
      <div class="panel-body form-grid">
        <div class="field field--full">
          <ImageUploadField
            v-model="config.languages[activeLocale].footer.publisherLogoUrl"
            label="发行主体 Logo"
            hint="页脚展示；建议透明底 PNG"
          />
        </div>
        <div class="field field--full">
          <div class="form-grid">
            <div class="field">
              <label>条款标题</label>
              <input v-model="config.languages[activeLocale].footerLinks.termsLabel" />
            </div>
            <div class="field">
              <label>隐私标题</label>
              <input v-model="config.languages[activeLocale].footerLinks.privacyLabel" />
            </div>
            <div class="field">
              <label>联系标题</label>
              <input v-model="config.languages[activeLocale].footerLinks.contactLabel" />
            </div>
            <div class="field">
              <label>规则标题</label>
              <input v-model="config.languages[activeLocale].footerLinks.rulesLabel" />
            </div>
            <div class="field">
              <label>支付标题</label>
              <input v-model="config.languages[activeLocale].footerLinks.paymentLabel" />
            </div>
            <div class="field">
              <label>年龄提示标题</label>
              <input v-model="config.languages[activeLocale].footerLinks.ageLabel" />
            </div>
            <div class="field field--full">
              <label>版权信息文案</label>
              <input v-model="config.languages[activeLocale].copyrightText" />
            </div>
            <div class="field field--full">
              <label>页尾提示文案</label>
              <input v-model="config.languages[activeLocale].footerDisclaimer" />
            </div>
            <div class="field field--full">
              <label>备案信息文案</label>
              <input v-model="config.languages[activeLocale].icpText" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
