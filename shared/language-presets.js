export const DEFAULT_LANGUAGE_DEFINITIONS = [
  {
    code: "zh-CN",
    label: "简中",
    gameName: "终末地",
    footerDisclaimer: "业务内容请以游戏内信息为准。请合理安排游戏时间，适度消费。",
    footerLinks: {
      termsLabel: "用户利用规则",
      privacyLabel: "隐私政策",
      contactLabel: "联系我们",
    },
  },
  {
    code: "zh-TW",
    label: "繁中",
    gameName: "終末地",
    footerDisclaimer: "業務內容請以遊戲內資訊為準。請合理安排遊戲時間，適度消費。",
    footerLinks: {
      termsLabel: "服務條款",
      privacyLabel: "隱私政策",
      contactLabel: "聯絡我們",
    },
  },
  {
    code: "en",
    label: "英语",
    gameName: "Arknights: Endfield",
    footerDisclaimer: "In-game information prevails. Please play responsibly and spend moderately.",
    footerLinks: {
      termsLabel: "TERMS OF SERVICE",
      privacyLabel: "PRIVACY POLICY",
      contactLabel: "CONTACT US",
    },
  },
  {
    code: "ja",
    label: "日语",
    gameName: "アークナイツ：エンドフィールド",
    footerDisclaimer: "内容はゲーム内表示を基準とします。適度にお楽しみください。",
    footerLinks: {
      termsLabel: "ユーザー利用規約",
      privacyLabel: "プライバシーポリシー",
      contactLabel: "お問い合わせ",
      rulesLabel: "資金決済法に基づく表示",
      paymentLabel: "資金決済法に基づく表示",
      ageLabel: "12歳以上",
    },
  },
  {
    code: "ko",
    label: "韩语",
    gameName: "명일방주: 엔드필드",
    footerDisclaimer: "상품 내용은 게임 내 정보를 기준으로 합니다. 적절한 이용과 소비를 부탁드립니다.",
    footerLinks: {
      termsLabel: "서비스 이용약관",
      privacyLabel: "개인 정보 처리 방침",
      contactLabel: "문의하기",
    },
  },
];

export const DEFAULT_LANGUAGE_OPTIONS = DEFAULT_LANGUAGE_DEFINITIONS.map(({ code, label }) => ({
  code,
  label,
}));

export const DEFAULT_LANGUAGE_META = Object.fromEntries(
  DEFAULT_LANGUAGE_OPTIONS.map((item) => [item.code, { label: item.label }]),
);

export const FOOTER_LINK_LABELS = {
  termsLabel: "条款标题",
  privacyLabel: "隐私标题",
  contactLabel: "联系标题",
  rulesLabel: "特商法链接标题",
  paymentLabel: "资金结算法链接标题",
  ageLabel: "年龄提示标题",
};

export function getDefaultLanguageDefinition(locale) {
  return (
    DEFAULT_LANGUAGE_DEFINITIONS.find((item) => item.code === locale) ??
    DEFAULT_LANGUAGE_DEFINITIONS[0]
  );
}

export function getDefaultLanguageConfig(locale) {
  const definition = getDefaultLanguageDefinition(locale);
  return {
    gameName: definition.gameName,
    footerDisclaimer: definition.footerDisclaimer,
    footerLinks: { ...definition.footerLinks },
  };
}

export function getLocaleLabel(locale, languageMeta = {}) {
  return languageMeta?.[locale]?.label ?? DEFAULT_LANGUAGE_META?.[locale]?.label ?? locale;
}

export function buildLocaleOptions({ languageMeta = {}, languages = {} } = {}) {
  const result = [];
  const seen = new Set();
  for (const option of DEFAULT_LANGUAGE_OPTIONS) {
    seen.add(option.code);
    result.push({
      code: option.code,
      label: getLocaleLabel(option.code, languageMeta),
    });
  }
  for (const code of [
    ...Object.keys(languageMeta ?? {}),
    ...Object.keys(languages ?? {}),
  ]) {
    if (seen.has(code)) continue;
    seen.add(code);
    result.push({
      code,
      label: getLocaleLabel(code, languageMeta),
    });
  }
  return result;
}

export function getFooterFieldKeys(locale, footerLinks = {}) {
  return getFooterFieldDefinitions(locale, footerLinks).map((field) => field.key);
}

export function getFooterFieldDefinitions(locale, footerLinks = {}) {
  const base = ["termsLabel", "privacyLabel", "contactLabel"];
  const localeExtras = locale === "ja" ? ["rulesLabel", "paymentLabel", "ageLabel"] : [];
  const dynamicExtras = Object.keys(footerLinks ?? {}).filter(
    (key) => !base.includes(key) && !localeExtras.includes(key),
  );
  const keys = [...base, ...localeExtras, ...dynamicExtras];
  return keys.map((key) => ({
    key,
    label: getFooterFieldLabel(key),
    removable: !base.includes(key) && !localeExtras.includes(key),
  }));
}

export function getFooterFieldLabel(key) {
  return FOOTER_LINK_LABELS[key] ?? key;
}
