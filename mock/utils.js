import { DEFAULT_MALL_CONFIG } from "./data.js";
import {
  computeRemainingDays,
  formatRemainingDaysLabel,
  formatRemainingTimeLabel,
} from "../shared/time-limit.js";

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function hasStructuralChanges(draft, published) {
  return JSON.stringify(draft) !== JSON.stringify(published);
}

export function buildPublishMeta(
  draft,
  published,
  draftUpdatedAt,
  publishedAt,
  draftVersion = null,
  publishedVersion = 1,
) {
  const hasDraft = draft != null;
  const versionDiffers = hasDraft && draftVersion !== publishedVersion;
  const contentDiffers = hasDraft && hasStructuralChanges(draft, published);
  return {
    hasDraft,
    hasUnpublishedChanges: versionDiffers || contentDiffers,
    draftUpdatedAt,
    publishedAt,
    draftVersion,
    publishedVersion,
  };
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function sectionsToContentHtml(sections) {
  return (sections ?? [])
    .map((section) => {
      const title = section.title?.trim() ?? "";
      const body = (section.paragraphs ?? [])
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join("");
      return title ? `<h4>${escapeHtml(title)}</h4>${body}` : body;
    })
    .join("");
}

export function normalizeRechargeTips(input) {
  const tips = input ?? {};
  if (typeof tips.contentHtml === "string" && tips.contentHtml.trim()) {
    return { contentHtml: tips.contentHtml };
  }
  if (Array.isArray(tips.sections) && tips.sections.length > 0) {
    return { contentHtml: sectionsToContentHtml(tips.sections) };
  }
  return DEFAULT_MALL_CONFIG.header.rechargeTips;
}

function normalizeBannerConfig(input = {}, fallback = {}) {
  return {
    id: typeof input.id === "string" ? input.id : fallback.id ?? `banner-${Date.now()}`,
    title: typeof input.title === "string" ? input.title : fallback.title ?? "",
    imageUrl: typeof input.imageUrl === "string" ? input.imageUrl : fallback.imageUrl ?? "",
    linkUrl: typeof input.linkUrl === "string" ? input.linkUrl : fallback.linkUrl ?? "",
    enabled: typeof input.enabled === "boolean" ? input.enabled : fallback.enabled ?? true,
    sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : fallback.sortOrder ?? 0,
  };
}

function normalizeBannerList(input, fallback = []) {
  const source = Array.isArray(input) && input.length ? input : fallback;
  return (source ?? []).map((banner, index) =>
    normalizeBannerConfig(banner, fallback[index] ?? { sortOrder: index + 1, enabled: true }),
  );
}

function normalizeFooterLinks(input = {}, fallback = {}) {
  const source = input && typeof input === "object" ? input : {};
  const base = fallback && typeof fallback === "object" ? fallback : {};
  const keys = new Set([
    ...Object.keys(DEFAULT_MALL_CONFIG.footer.footerLinks ?? {}),
    ...Object.keys(base),
    ...Object.keys(source),
  ]);
  return Object.fromEntries(
    Array.from(keys).map((key) => [
      key,
      typeof source[key] === "string"
        ? source[key]
        : typeof base[key] === "string"
          ? base[key]
          : "",
    ]),
  );
}

export function normalizeLanguageConfig(input = {}, fallback = {}, fallbackBanners = []) {
  return {
    gameName:
      typeof input.gameName === "string"
        ? input.gameName
        : fallback.gameName ?? DEFAULT_MALL_CONFIG.game.name,
    banners: normalizeBannerList(
      input.banners,
      Array.isArray(fallbackBanners) ? fallbackBanners : fallback.banners ?? [],
    ),
    rechargeTips: normalizeRechargeTips(input.rechargeTips ?? fallback.rechargeTips),
    copyrightText:
      typeof input.copyrightText === "string"
        ? input.copyrightText
        : fallback.copyrightText ?? DEFAULT_MALL_CONFIG.footer.copyrightText,
    privacyPolicyUrl:
      typeof input.privacyPolicyUrl === "string"
        ? input.privacyPolicyUrl
        : fallback.privacyPolicyUrl ?? DEFAULT_MALL_CONFIG.footer.privacyPolicyUrl,
    userAgreementUrl:
      typeof input.userAgreementUrl === "string"
        ? input.userAgreementUrl
        : fallback.userAgreementUrl ?? DEFAULT_MALL_CONFIG.footer.userAgreementUrl,
    contactText:
      typeof input.contactText === "string"
        ? input.contactText
        : fallback.contactText ?? DEFAULT_MALL_CONFIG.footer.contactText,
    icpText:
      typeof input.icpText === "string"
        ? input.icpText
        : fallback.icpText ?? DEFAULT_MALL_CONFIG.footer.icpText,
    footerDisclaimer:
      typeof input.footerDisclaimer === "string"
        ? input.footerDisclaimer
        : fallback.footerDisclaimer ?? "",
    footerLinks: normalizeFooterLinks(input.footerLinks, fallback.footerLinks),
  };
}

export function normalizeLanguages(input, fallbackBanners = DEFAULT_MALL_CONFIG.banners) {
  const raw = input ?? {};
  const entries = Object.entries(DEFAULT_MALL_CONFIG.languages).map(([locale, defaults]) => [
    locale,
    normalizeLanguageConfig(raw[locale], defaults, fallbackBanners),
  ]);
  for (const [locale, value] of Object.entries(raw)) {
    if (DEFAULT_MALL_CONFIG.languages[locale]) continue;
    entries.push([
      locale,
      normalizeLanguageConfig(value, { banners: fallbackBanners, footerLinks: {} }, fallbackBanners),
    ]);
  }
  return Object.fromEntries(entries);
}

export function normalizeMallConfig(input) {
  const raw = input ?? {};
  if (raw.header && raw.footer) {
    const banners = normalizeBannerList(raw.banners, DEFAULT_MALL_CONFIG.banners);
    const languages = normalizeLanguages(raw.languages, banners);
    return {
      ...raw,
      banners,
      languages,
      header: {
        ...raw.header,
        rechargeCenterName:
          raw.header.rechargeCenterName ?? DEFAULT_MALL_CONFIG.header.rechargeCenterName,
        rechargeTips: normalizeRechargeTips(raw.header.rechargeTips),
      },
      game: {
        ...raw.game,
        name: raw.game?.name ?? languages["zh-CN"].gameName,
      },
      updatedAt:
        typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    };
  }

  const legacyFooter = raw.footer ?? {};
  const legacyTips = normalizeRechargeTips(
    raw.rechargeTips ?? DEFAULT_MALL_CONFIG.header.rechargeTips,
  );
  const legacyCopyright = legacyFooter.copyrightText ?? "";

  return {
    game: {
      name: raw.game?.name ?? DEFAULT_MALL_CONFIG.game.name,
      icon: raw.game?.icon ?? "",
      iconUrl: raw.game?.iconUrl ?? null,
    },
    banners: normalizeBannerList(raw.banners, DEFAULT_MALL_CONFIG.banners),
    header: {
      publisherLogoUrl: null,
      customerServiceUrl:
        legacyFooter.customerServiceUrl ?? DEFAULT_MALL_CONFIG.header.customerServiceUrl,
      rechargeCenterName: DEFAULT_MALL_CONFIG.header.rechargeCenterName,
      rechargeTips: legacyTips,
    },
    footer: {
      publisherLogoUrl: null,
      copyrightText: legacyCopyright.replace(/\s*｜\s*客服电话：.*$/, "").trim(),
      privacyPolicyUrl:
        legacyFooter.privacyPolicyUrl ?? DEFAULT_MALL_CONFIG.footer.privacyPolicyUrl,
      userAgreementUrl:
        legacyFooter.userAgreementUrl ?? DEFAULT_MALL_CONFIG.footer.userAgreementUrl,
      contactText: legacyCopyright.includes("客服电话")
        ? legacyCopyright.match(/客服电话：[^｜]+/)?.[0] ?? DEFAULT_MALL_CONFIG.footer.contactText
        : DEFAULT_MALL_CONFIG.footer.contactText,
      icpText: legacyFooter.icpText ?? DEFAULT_MALL_CONFIG.footer.icpText,
    },
    banners: normalizeBannerList(raw.banners, DEFAULT_MALL_CONFIG.banners),
    languages: normalizeLanguages(raw.languages, raw.banners ?? DEFAULT_MALL_CONFIG.banners),
    updatedAt:
      typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

export function buildPeriodBucket(period, at) {
  if (period === "monthly") {
    return `m${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`;
  }
  if (period === "weekly") {
    const start = new Date(at.getFullYear(), 0, 1);
    const day = Math.floor((at.getTime() - start.getTime()) / 86400000);
    const week = Math.ceil((day + start.getDay() + 1) / 7);
    return `w${at.getFullYear()}-${week}`;
  }
  if (period === "daily") {
    return `d${at.toISOString().slice(0, 10)}`;
  }
  return "";
}

export { computeRemainingDays, formatRemainingDaysLabel, formatRemainingTimeLabel };
