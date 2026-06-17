import { DEFAULT_MALL_CONFIG } from "./data.js";

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function hasStructuralChanges(draft, published) {
  return JSON.stringify(draft) !== JSON.stringify(published);
}

export function buildPublishMeta(draft, published, draftUpdatedAt, publishedAt) {
  return {
    hasUnpublishedChanges: hasStructuralChanges(draft, published),
    draftUpdatedAt,
    publishedAt,
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

export function normalizeLanguageConfig(input = {}, fallback = {}) {
  return {
    gameName:
      typeof input.gameName === "string"
        ? input.gameName
        : fallback.gameName ?? DEFAULT_MALL_CONFIG.game.name,
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
    footerLinks:
      input.footerLinks && typeof input.footerLinks === "object"
        ? {
            termsLabel:
              typeof input.footerLinks.termsLabel === "string"
                ? input.footerLinks.termsLabel
                : fallback.footerLinks?.termsLabel ?? "",
            privacyLabel:
              typeof input.footerLinks.privacyLabel === "string"
                ? input.footerLinks.privacyLabel
                : fallback.footerLinks?.privacyLabel ?? "",
            contactLabel:
              typeof input.footerLinks.contactLabel === "string"
                ? input.footerLinks.contactLabel
                : fallback.footerLinks?.contactLabel ?? "",
            rulesLabel:
              typeof input.footerLinks.rulesLabel === "string"
                ? input.footerLinks.rulesLabel
                : fallback.footerLinks?.rulesLabel ?? "",
            paymentLabel:
              typeof input.footerLinks.paymentLabel === "string"
                ? input.footerLinks.paymentLabel
                : fallback.footerLinks?.paymentLabel ?? "",
            ageLabel:
              typeof input.footerLinks.ageLabel === "string"
                ? input.footerLinks.ageLabel
                : fallback.footerLinks?.ageLabel ?? "",
          }
        : fallback.footerLinks ?? {},
  };
}

export function normalizeLanguages(input) {
  const raw = input ?? {};
  return Object.fromEntries(
    Object.entries(DEFAULT_MALL_CONFIG.languages).map(([locale, defaults]) => [
      locale,
      normalizeLanguageConfig(raw[locale], defaults),
    ]),
  );
}

export function normalizeMallConfig(input) {
  const raw = input ?? {};
  if (raw.header && raw.footer) {
    const languages = normalizeLanguages(raw.languages);
    return {
      ...raw,
      languages,
      header: {
        ...raw.header,
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
    banners: Array.isArray(raw.banners) ? raw.banners : DEFAULT_MALL_CONFIG.banners,
    header: {
      publisherLogoUrl: null,
      customerServiceUrl:
        legacyFooter.customerServiceUrl ?? DEFAULT_MALL_CONFIG.header.customerServiceUrl,
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
    languages: normalizeLanguages(raw.languages),
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

export function computeRemainingDays(timeLimitEnd, now = Date.now()) {
  if (!timeLimitEnd) return null;
  const end = new Date(timeLimitEnd).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

export function formatRemainingDaysLabel(days) {
  if (days == null) return null;
  if (days <= 0) return "活动已结束";
  return `剩余${days}天`;
}
