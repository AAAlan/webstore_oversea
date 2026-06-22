<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  REGION_DEMO_CODE,
  REGION_DEMO_CA_DEFAULT,
  REGION_DEMO_JP_16_TO_20,
  REGION_DEMO_JP_ADULT,
  REGION_DEMO_JP_TEEN,
  REGION_DEMO_RU_LOCKED_PRICE,
  REGION_DEMO_US_CHILD,
  REGION_DEMO_US_TEEN,
  applyAgeLimitToProduct,
  buildLocalRechargeLimit,
  getProductAgeLimitReason,
} from "./recharge-limit.js";
import { api } from "./api.js";
import { buildLocaleOptions, getFooterFieldKeys } from "../../shared/language-presets.js";
import { formatRemainingDaysLabel, formatRemainingTimeLabel } from "../../shared/time-limit.js";

const UNLIMITED_PRODUCT_MAX_QUANTITY = 99;

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sectionsToContentHtml(sections) {
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

function normalizeRechargeTips(tips) {
  const fallback = {
    contentHtml: sectionsToContentHtml([
      {
        title: "温馨提示",
        paragraphs: [
          "首次双倍返利状态请以游戏内商城界面为准。",
          "网页商城需先在游戏内解锁商店后展示；礼包限购次数与游戏内共享。",
        ],
      },
    ]),
  };
  if (!tips) return fallback;
  if (tips.contentHtml?.trim()) {
    return { contentHtml: tips.contentHtml };
  }
  if (tips.sections?.length) {
    return { contentHtml: sectionsToContentHtml(tips.sections) };
  }
  return fallback;
}

const I18N = {
  "zh-CN": {
    topupCenter: "充值中心",
    rechargeTips: "充值说明",
    customerService: "客服中心",
    login: "登录",
    logout: "退出登录",
    switchAccount: "切换账号",
    switchRole: "切换角色",
    loginHint: "充值前请先登录账号",
    selectRoleHint: "登录成功，请先选择角色后继续充值。",
    selectRole: "选择角色",
    confirm: "确定",
    noRoleServer: "该服务器尚无角色",
    server: "服务器",
    roleId: "角色 ID",
    rechargeGame: "充值游戏",
    loginAccount: "登录账号",
    roleServer: "角色区服",
    roleName: "角色名称",
    goodsList: "商品列表",
    limitTitle: "注册地限额说明",
    singleLimit: "单次支付额度",
    monthlyLimit: "月累计额度",
    monthlySpent: "本月已充值",
    monthlyRemaining: "剩余",
    contactChange: "按注册时 IP 判断注册地；如需修改账户注册地及用户信息，请联系客服。",
    unavailable: "无法购买",
    productDetail: "商品详情",
    account: "账号",
    quantityLimit: "限购说明",
    payNow: "立即支付",
    cannotRecharge: "无法充值",
    restriction: "充值限制",
    gotIt: "我知道了",
    cashierTitle: "收银台",
    cashierSecurity: "你的个人信息非常安全且不会公开",
    choosePayMethod: "请选择支付方式",
    cashierOrderTitle: "Gryphline 充值中心订单",
    cashierItemPrice: "商品价格",
    cashierTotal: "总价",
    cashierAgreement: "已阅读并同意支付协议条款",
    cashierPayNow: "立即支付",
    cashierCard: "信用卡/借记卡",
    cashierPaypal: "PayPal",
    cashierApple: "Apple Pay",
    cashierGoogle: "Google Pay",
    cashierKonbini: "Konbini",
    cashierPaypalSave: "保存 PayPal 账号用于下次购买",
    payWaitingTitle: "待支付",
    payWaitingDesc: "请您尽快完成支付",
    payCancel: "取消",
    payIHavePaid: "我已支付",
    konbiniReturnTitle: "待支付",
    konbiniReturnDesc: "请在便利店完成支付后，返回游戏内确认您的购买结果。如有疑问，请提供支付小票联系客户服务。",
    konbiniReturnConfirm: "去确认",
    payProcessingToast: "付款正在处理中，请勿关闭此页面",
    payNoResultToast: "未查询到您的支付结果。如果您已完成支付，请返回商城确认到账结果。",
    userAgreement: "用户协议",
    privacyPolicy: "隐私协议",
    footerDisclaimer: "业务内容请以游戏内信息为准。请合理安排游戏时间，适度消费。",
  },
  "zh-TW": {
    topupCenter: "儲值中心",
    rechargeTips: "儲值說明",
    customerService: "客服中心",
    login: "登入",
    logout: "登出",
    switchAccount: "切換帳號",
    switchRole: "切換角色",
    loginHint: "儲值前請先登入帳號",
    selectRoleHint: "登入成功，請先選擇角色後繼續儲值。",
    selectRole: "選擇角色",
    confirm: "確定",
    noRoleServer: "該伺服器尚無角色",
    server: "伺服器",
    roleId: "角色 ID",
    rechargeGame: "儲值遊戲",
    loginAccount: "登入帳號",
    roleServer: "角色伺服器",
    roleName: "角色名稱",
    goodsList: "商品列表",
    limitTitle: "註冊地限額說明",
    singleLimit: "單次支付額度",
    monthlyLimit: "月累計額度",
    monthlySpent: "本月已儲值",
    monthlyRemaining: "剩餘",
    contactChange: "按註冊時 IP 判斷註冊地；如需修改帳戶註冊地及用戶資訊，請聯繫客服。",
    unavailable: "無法購買",
    productDetail: "商品詳情",
    account: "帳號",
    quantityLimit: "限購說明",
    payNow: "立即支付",
    cannotRecharge: "無法儲值",
    restriction: "儲值限制",
    gotIt: "我知道了",
    cashierTitle: "收銀台",
    cashierSecurity: "你的個人資訊非常安全且不會公開",
    choosePayMethod: "請選擇支付方式",
    cashierOrderTitle: "Gryphline 儲值中心訂單",
    cashierItemPrice: "商品價格",
    cashierTotal: "總價",
    cashierAgreement: "已閱讀並同意支付協議條款",
    cashierPayNow: "立即支付",
    cashierCard: "信用卡／簽帳卡",
    cashierPaypal: "PayPal",
    cashierApple: "Apple Pay",
    cashierGoogle: "Google Pay",
    cashierKonbini: "Konbini",
    cashierPaypalSave: "保存 PayPal 帳號用於下次購買",
    payWaitingTitle: "待支付",
    payWaitingDesc: "請您盡快完成支付",
    payCancel: "取消",
    payIHavePaid: "我已支付",
    konbiniReturnTitle: "待支付",
    konbiniReturnDesc: "請在便利商店完成支付後，返回遊戲內確認您的購買結果。如有疑問，請提供支付小票聯繫客服。",
    konbiniReturnConfirm: "去確認",
    payProcessingToast: "付款正在處理中，請勿關閉此頁面",
    payNoResultToast: "未查詢到您的支付結果。如果您已完成支付，請返回商店確認到帳結果。",
    userAgreement: "用戶協議",
    privacyPolicy: "隱私協議",
    footerDisclaimer: "業務內容請以遊戲內資訊為準。請合理安排遊戲時間，適度消費。",
  },
  en: {
    topupCenter: "Top-up Center",
    rechargeTips: "Top-up Info",
    customerService: "Support",
    login: "Log in",
    logout: "Log out",
    switchAccount: "Switch account",
    switchRole: "Switch role",
    loginHint: "Please log in before topping up.",
    selectRoleHint: "Login succeeded. Please select a role before continuing.",
    selectRole: "Select Role",
    confirm: "Confirm",
    noRoleServer: "No role on this server",
    server: "Server",
    roleId: "Role ID",
    rechargeGame: "Game",
    loginAccount: "Account",
    roleServer: "Server",
    roleName: "Role Name",
    goodsList: "Items",
    limitTitle: "Registration Region Limit",
    singleLimit: "Single payment limit",
    monthlyLimit: "Monthly limit",
    monthlySpent: "Spent this month",
    monthlyRemaining: "Remaining",
    contactChange: "Registration region is determined by the IP at registration. Contact support to update region or user info.",
    unavailable: "Unavailable",
    productDetail: "Item Details",
    account: "Account",
    quantityLimit: "Purchase limit",
    payNow: "Pay Now",
    cannotRecharge: "Unavailable",
    restriction: "Top-up Restricted",
    gotIt: "OK",
    cashierTitle: "Checkout",
    cashierSecurity: "Your personal information is secure and will not be made public",
    choosePayMethod: "Choose a payment method",
    cashierOrderTitle: "Gryphline Top-up Center Order",
    cashierItemPrice: "Item price",
    cashierTotal: "Total",
    cashierAgreement: "I have read and agree to the payment terms",
    cashierPayNow: "Pay Now",
    cashierCard: "Credit / Debit Card",
    cashierPaypal: "PayPal",
    cashierApple: "Apple Pay",
    cashierGoogle: "Google Pay",
    cashierKonbini: "Konbini",
    cashierPaypalSave: "Save PayPal account for next purchase",
    payWaitingTitle: "Awaiting payment",
    payWaitingDesc: "Please complete the payment as soon as possible",
    payCancel: "Cancel",
    payIHavePaid: "I have paid",
    konbiniReturnTitle: "Awaiting payment",
    konbiniReturnDesc: "Please finish payment at the convenience store, then return to the game to confirm your purchase. If you need help, contact support with your receipt.",
    konbiniReturnConfirm: "Go to confirm",
    payProcessingToast: "Payment is being processed. Please do not close this page.",
    payNoResultToast: "No payment result was found. If you have already paid, please return to the mall to confirm receipt.",
    userAgreement: "Terms of Service",
    privacyPolicy: "Privacy Policy",
    footerDisclaimer: "In-game information prevails. Please play responsibly and spend moderately.",
  },
  ja: {
    topupCenter: "チャージセンター",
    rechargeTips: "チャージ説明",
    customerService: "サポート",
    login: "ログイン",
    logout: "ログアウト",
    switchAccount: "アカウント切替",
    switchRole: "キャラクター切替",
    loginHint: "チャージ前にログインしてください。",
    selectRoleHint: "ログインに成功しました。続けるには先にキャラクターを選択してください。",
    selectRole: "キャラクター選択",
    confirm: "確定",
    noRoleServer: "このサーバーにキャラクターはいません",
    server: "サーバー",
    roleId: "UID",
    rechargeGame: "ゲーム",
    loginAccount: "アカウント",
    roleServer: "サーバー",
    roleName: "キャラクター名",
    goodsList: "商品一覧",
    limitTitle: "登録地域の利用制限",
    singleLimit: "1回の支払上限",
    monthlyLimit: "月間上限",
    monthlySpent: "今月の利用額",
    monthlyRemaining: "残額",
    contactChange: "登録地域は登録時の IP で判定されます。変更が必要な場合はサポートへご連絡ください。",
    unavailable: "購入不可",
    productDetail: "商品詳細",
    account: "アカウント",
    quantityLimit: "購入制限",
    payNow: "今すぐ支払う",
    cannotRecharge: "チャージ不可",
    restriction: "チャージ制限",
    gotIt: "OK",
    cashierTitle: "レジ",
    cashierSecurity: "個人情報は安全に保護され、公開されません",
    choosePayMethod: "支払い方法を選択してください",
    cashierOrderTitle: "Gryphline チャージセンター注文",
    cashierItemPrice: "商品価格",
    cashierTotal: "合計",
    cashierAgreement: "支払い規約に同意します",
    cashierPayNow: "今すぐ支払う",
    cashierCard: "クレジット／デビットカード",
    cashierPaypal: "PayPal",
    cashierApple: "Apple Pay",
    cashierGoogle: "Google Pay",
    cashierKonbini: "Konbini",
    cashierPaypalSave: "次回購入用に PayPal アカウントを保存",
    payWaitingTitle: "支払い待ち",
    payWaitingDesc: "できるだけ早く支払いを完了してください",
    payCancel: "キャンセル",
    payIHavePaid: "支払いました",
    konbiniReturnTitle: "支払い待ち",
    konbiniReturnDesc: "コンビニで支払いを完了したら、ゲームに戻って購入結果をご確認ください。ご不明な点があれば、支払い控えを添えてサポートまでご連絡ください。",
    konbiniReturnConfirm: "確認する",
    payProcessingToast: "支払い処理中です。しばらくこのページを閉じないでください。",
    payNoResultToast: "支払い結果が確認できませんでした。すでに支払い済みの場合は、ストアに戻って到着結果を確認してください。",
    userAgreement: "利用規約",
    privacyPolicy: "プライバシーポリシー",
    footerDisclaimer: "内容はゲーム内表示を基準とします。適度にお楽しみください。",
  },
  ko: {
    topupCenter: "충전 센터",
    rechargeTips: "충전 안내",
    customerService: "고객센터",
    login: "로그인",
    logout: "로그아웃",
    switchAccount: "계정 전환",
    switchRole: "캐릭터 전환",
    loginHint: "충전 전 계정에 로그인해 주세요.",
    selectRoleHint: "로그인에 성공했습니다. 계속하려면 먼저 캐릭터를 선택해 주세요.",
    selectRole: "캐릭터 선택",
    confirm: "확인",
    noRoleServer: "해당 서버에 캐릭터가 없습니다",
    server: "서버",
    roleId: "UID",
    rechargeGame: "충전 게임",
    loginAccount: "로그인 계정",
    roleServer: "서버",
    roleName: "캐릭터명",
    goodsList: "상품 목록",
    limitTitle: "등록 지역 한도 안내",
    singleLimit: "1회 결제 한도",
    monthlyLimit: "월 누적 한도",
    monthlySpent: "이번 달 충전",
    monthlyRemaining: "잔여",
    contactChange: "등록 지역은 가입 시 IP로 판단됩니다. 지역 또는 사용자 정보 변경은 고객센터에 문의해 주세요.",
    unavailable: "구매 불가",
    productDetail: "상품 상세",
    account: "계정",
    quantityLimit: "구매 제한",
    payNow: "바로 결제",
    cannotRecharge: "충전 불가",
    restriction: "충전 제한",
    gotIt: "확인",
    cashierTitle: "결제창",
    cashierSecurity: "개인정보는 안전하게 보호되며 공개되지 않습니다",
    choosePayMethod: "결제 수단을 선택해 주세요",
    cashierOrderTitle: "Gryphline 충전 센터 주문",
    cashierItemPrice: "상품 가격",
    cashierTotal: "총액",
    cashierAgreement: "결제 약관에 동의합니다",
    cashierPayNow: "바로 결제",
    cashierCard: "신용/체크카드",
    cashierPaypal: "PayPal",
    cashierApple: "Apple Pay",
    cashierGoogle: "Google Pay",
    cashierKonbini: "Konbini",
    cashierPaypalSave: "다음 구매를 위해 PayPal 계정 저장",
    payWaitingTitle: "결제 대기",
    payWaitingDesc: "가능한 빨리 결제를 완료해 주세요",
    payCancel: "취소",
    payIHavePaid: "결제했어요",
    konbiniReturnTitle: "결제 대기",
    konbiniReturnDesc: "편의점에서 결제를 완료한 뒤 게임으로 돌아와 구매 결과를 확인해 주세요. 도움이 필요하면 영수증을 첨부해 고객센터에 문의해 주세요.",
    konbiniReturnConfirm: "확인하러 가기",
    payProcessingToast: "결제 처리 중입니다. 이 페이지를 닫지 마세요.",
    payNoResultToast: "결제 결과를 찾지 못했습니다. 이미 결제했다면 몰로 돌아가 수령 여부를 확인해 주세요.",
    cashierTitle: "결제창",
    cashierSecurity: "개인정보는 안전하게 보호되며 공개되지 않습니다",
    choosePayMethod: "결제 수단을 선택해 주세요",
    cashierOrderTitle: "Gryphline 충전 센터 주문",
    cashierItemPrice: "상품 가격",
    cashierTotal: "총액",
    cashierAgreement: "결제 약관에 동의합니다",
    cashierPayNow: "바로 결제",
    cashierCard: "신용/체크카드",
    cashierPaypal: "PayPal",
    cashierApple: "Apple Pay",
    cashierGoogle: "Google Pay",
    userAgreement: "이용약관",
    privacyPolicy: "개인정보 처리방침",
    footerDisclaimer: "상품 내용은 게임 내 정보를 기준으로 합니다. 적절한 이용과 소비를 부탁드립니다.",
  },
};

const currentLocale = ref("zh-CN");
const currentMessages = computed(() => I18N[currentLocale.value] ?? I18N["zh-CN"]);
function t(key) {
  return currentMessages.value[key] ?? I18N["zh-CN"][key] ?? key;
}

const DEFAULT_BANNER_TEMPLATES = [
  {
    id: "banner-1",
    title: "春季活动",
    imageUrl: "",
    linkUrl: "https://www.happyelements.com/",
    enabled: true,
    sortOrder: 1,
  },
];

const DEFAULT_MALL_CONFIG = {
  game: { name: "终末地", icon: "", iconUrl: null },
  banners: DEFAULT_BANNER_TEMPLATES.map((banner) => ({ ...banner })),
  header: {
    publisherLogoUrl: "/assets/publisher-logo.png",
    customerServiceUrl: "https://www.happyelements.com/",
    rechargeCenterName: "充值中心",
    rechargeTips: normalizeRechargeTips(null),
  },
  footer: {
    publisherLogoUrl: "/assets/publisher-logo.png",
    copyrightText: "© GRYPHLINE. All rights reserved.",
    privacyPolicyUrl: "https://www.happyelements.com/",
    userAgreementUrl: "https://www.happyelements.com/",
    contactText: "Customer Support",
    icpText: "",
    footerLinks: {},
  },
  languages: {
    "zh-CN": {
      gameName: "终末地",
      banners: DEFAULT_BANNER_TEMPLATES.map((banner) => ({ ...banner })),
      rechargeTips: normalizeRechargeTips(null),
      copyrightText: "© GRYPHLINE. All rights reserved.",
      privacyPolicyUrl: "https://www.happyelements.com/",
      userAgreementUrl: "https://www.happyelements.com/",
      contactText: "Customer Support",
      icpText: "",
      footerDisclaimer: I18N["zh-CN"].footerDisclaimer,
      footerLinks: {
        termsLabel: "用户利用规则",
        privacyLabel: "隐私政策",
        contactLabel: "联系我们",
      },
    },
    "zh-TW": {
      gameName: "終末地",
      banners: DEFAULT_BANNER_TEMPLATES.map((banner) => ({ ...banner })),
      rechargeTips: normalizeRechargeTips(null),
      copyrightText: "© GRYPHLINE. All rights reserved.",
      privacyPolicyUrl: "https://www.happyelements.com/",
      userAgreementUrl: "https://www.happyelements.com/",
      contactText: "Customer Support",
      icpText: "",
      footerDisclaimer: I18N["zh-TW"].footerDisclaimer,
      footerLinks: {
        termsLabel: "服務條款",
        privacyLabel: "隱私政策",
        contactLabel: "聯絡我們",
      },
    },
    en: {
      gameName: "Arknights: Endfield",
      banners: DEFAULT_BANNER_TEMPLATES.map((banner) => ({ ...banner })),
      rechargeTips: normalizeRechargeTips(null),
      copyrightText: "© GRYPHLINE. All rights reserved.",
      privacyPolicyUrl: "https://www.happyelements.com/",
      userAgreementUrl: "https://www.happyelements.com/",
      contactText: "Customer Support",
      icpText: "",
      footerDisclaimer: I18N.en.footerDisclaimer,
      footerLinks: {
        termsLabel: "TERMS OF SERVICE",
        privacyLabel: "PRIVACY POLICY",
        contactLabel: "CONTACT US",
      },
    },
    ja: {
      gameName: "アークナイツ：エンドフィールド",
      banners: DEFAULT_BANNER_TEMPLATES.map((banner) => ({ ...banner })),
      rechargeTips: normalizeRechargeTips(null),
      copyrightText: "© GRYPHLINE. All rights reserved.",
      privacyPolicyUrl: "https://www.happyelements.com/",
      userAgreementUrl: "https://www.happyelements.com/",
      contactText: "Customer Support",
      icpText: "",
      footerDisclaimer: I18N.ja.footerDisclaimer,
      footerLinks: {
        termsLabel: "ユーザー利用規約",
        privacyLabel: "プライバシーポリシー",
        contactLabel: "お問い合わせ",
        rulesLabel: "資金決済法に基づく表示",
        paymentLabel: "資金決済法に基づく表示",
      },
    },
    ko: {
      gameName: "명일방주: 엔드필드",
      banners: DEFAULT_BANNER_TEMPLATES.map((banner) => ({ ...banner })),
      rechargeTips: normalizeRechargeTips(null),
      copyrightText: "© GRYPHLINE. All rights reserved.",
      privacyPolicyUrl: "https://www.happyelements.com/",
      userAgreementUrl: "https://www.happyelements.com/",
      contactText: "Customer Support",
      icpText: "",
      footerDisclaimer: I18N.ko.footerDisclaimer,
      footerLinks: {
        termsLabel: "서비스 이용약관",
        privacyLabel: "개인 정보 처리 방침",
        contactLabel: "문의하기",
      },
    },
  },
};

function normalizeLanguageConfig(raw, fallback) {
  return {
    gameName: raw?.gameName || fallback.gameName,
    banners: Array.isArray(raw?.banners) ? raw.banners : fallback.banners ?? [],
    rechargeTips: normalizeRechargeTips(raw?.rechargeTips ?? fallback.rechargeTips),
    copyrightText: raw?.copyrightText ?? fallback.copyrightText,
    privacyPolicyUrl: raw?.privacyPolicyUrl ?? fallback.privacyPolicyUrl,
    userAgreementUrl: raw?.userAgreementUrl ?? fallback.userAgreementUrl,
    contactText: raw?.contactText ?? fallback.contactText,
    icpText: raw?.icpText ?? fallback.icpText,
    footerDisclaimer: raw?.footerDisclaimer ?? fallback.footerDisclaimer,
    footerLinks: raw?.footerLinks ?? fallback.footerLinks ?? {},
  };
}

function normalizeLanguages(raw, fallbackBanners = DEFAULT_MALL_CONFIG.banners) {
  const entries = Object.entries(DEFAULT_MALL_CONFIG.languages).map(([locale, fallback]) => [
    locale,
    normalizeLanguageConfig(
      raw?.[locale],
      { ...fallback, banners: fallbackBanners },
    ),
  ]);
  for (const [locale, value] of Object.entries(raw ?? {})) {
    if (DEFAULT_MALL_CONFIG.languages[locale]) continue;
    entries.push([
      locale,
      normalizeLanguageConfig(value, { banners: fallbackBanners, footerLinks: {} }),
    ]);
  }
  return Object.fromEntries(entries);
}

function resolveMallConfig(raw) {
  if (!raw) return DEFAULT_MALL_CONFIG;
  if (raw.header && raw.footer) {
    const languages = normalizeLanguages(raw.languages, raw.banners ?? DEFAULT_MALL_CONFIG.banners);
    return {
      ...raw,
      banners: Array.isArray(raw.banners) ? raw.banners : DEFAULT_MALL_CONFIG.banners,
      languages,
      header: {
        ...raw.header,
        publisherLogoUrl:
          raw.header.publisherLogoUrl || DEFAULT_MALL_CONFIG.header.publisherLogoUrl,
        rechargeCenterName:
          raw.header.rechargeCenterName || DEFAULT_MALL_CONFIG.header.rechargeCenterName,
        rechargeTips: normalizeRechargeTips(raw.header.rechargeTips),
      },
      footer: {
        ...raw.footer,
        publisherLogoUrl:
          raw.footer.publisherLogoUrl || DEFAULT_MALL_CONFIG.footer.publisherLogoUrl,
        footerLinks: raw.footer.footerLinks ?? DEFAULT_MALL_CONFIG.footer.footerLinks,
      },
    };
  }
  const legacyFooter = raw.footer ?? {};
  return {
    ...DEFAULT_MALL_CONFIG,
    ...raw,
    banners: Array.isArray(raw.banners) ? raw.banners : DEFAULT_MALL_CONFIG.banners,
    languages: normalizeLanguages(raw.languages, raw.banners ?? DEFAULT_MALL_CONFIG.banners),
    game: raw.game ?? DEFAULT_MALL_CONFIG.game,
    header: {
      publisherLogoUrl: DEFAULT_MALL_CONFIG.header.publisherLogoUrl,
      customerServiceUrl:
        legacyFooter.customerServiceUrl ?? DEFAULT_MALL_CONFIG.header.customerServiceUrl,
      rechargeCenterName: DEFAULT_MALL_CONFIG.header.rechargeCenterName,
      rechargeTips: normalizeRechargeTips(raw.rechargeTips),
    },
    footer: {
      publisherLogoUrl: DEFAULT_MALL_CONFIG.footer.publisherLogoUrl,
      copyrightText: legacyFooter.copyrightText ?? DEFAULT_MALL_CONFIG.footer.copyrightText,
      privacyPolicyUrl:
        legacyFooter.privacyPolicyUrl ?? DEFAULT_MALL_CONFIG.footer.privacyPolicyUrl,
      userAgreementUrl:
        legacyFooter.userAgreementUrl ?? DEFAULT_MALL_CONFIG.footer.userAgreementUrl,
      contactText: DEFAULT_MALL_CONFIG.footer.contactText,
      icpText: legacyFooter.icpText ?? DEFAULT_MALL_CONFIG.footer.icpText,
      footerLinks: DEFAULT_MALL_CONFIG.footer.footerLinks,
    },
  };
}

const mallConfig = ref(null);
const translationEntries = ref({});
/** 演示：登录后商城未解锁（与游戏内商店状态一致） */
const LOCKED_DEMO_PHONE = "15200000002";
const LOCKED_DEMO_CODE = "1234";
const UNLOCKED_DEMO_PHONE = "15200000001";
const UNLOCKED_DEMO_CODE = "1234";
/** 演示：登录后账号封禁弹窗 */
const BANNED_DEMO_PHONE = "15200000003";
const BANNED_DEMO_CODE = "1234";
const DEFAULT_BAN_REASON =
  "您的账号因存在异常充值行为，已被限制使用网页支付服务。如有疑问请联系客服申诉。";

const gameDisplay = computed(() => {
  const config = mallConfigResolved.value;
  const game = config.game ?? DEFAULT_MALL_CONFIG.game;
  const localized = config.languages?.[currentLocale.value];
  const name = localized?.gameName || game.name || "游戏";
  return {
    name,
    iconUrl: game.iconUrl,
    iconFallback: name.trim().charAt(0) || "游",
  };
});

const activeBanners = computed(() => {
  const list =
    mallConfigResolved.value.languages?.[currentLocale.value]?.banners ??
    mallConfigResolved.value.banners ??
    DEFAULT_MALL_CONFIG.banners;
  return list
    .filter((b) => b.enabled)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((banner) => ({ ...banner }));
});

const mallConfigResolved = computed(() => resolveMallConfig(mallConfig.value));

const languageOptions = computed(() =>
  buildLocaleOptions({
    languageMeta: mallConfigResolved.value.languageMeta ?? {},
    languages: mallConfigResolved.value.languages ?? {},
  }),
);

const headerConfig = computed(
  () => mallConfigResolved.value.header,
);

const footerConfig = computed(
  () => mallConfigResolved.value.footer,
);

const rechargeTipsConfig = computed(
  () => ({
    contentHtml: localizedText(
      "mall.header.rechargeTips",
      headerConfig.value.rechargeTips.contentHtml,
    ),
  }),
);

const rechargeCenterNameText = computed(() =>
  localizedText(
    "mall.header.rechargeCenterName",
    headerConfig.value.rechargeCenterName || t("topupCenter"),
  ),
);

const localizedFooterConfig = computed(() => ({
  ...footerConfig.value,
  ...(mallConfigResolved.value.languages?.[currentLocale.value] ?? {}),
}));

const footerLinkList = computed(() => {
  const links = localizedFooterConfig.value.footerLinks ?? {};
  return getFooterFieldKeys(currentLocale.value, links)
    .map((key) => {
      if (key === "termsLabel") {
        return { label: links.termsLabel || t("userAgreement"), url: localizedFooterConfig.value.userAgreementUrl };
      }
      if (key === "privacyLabel") {
        return { label: links.privacyLabel || t("privacyPolicy"), url: localizedFooterConfig.value.privacyPolicyUrl };
      }
      if (key === "contactLabel") {
        return { label: links.contactLabel || t("customerService"), url: localizedFooterConfig.value.customerServiceUrl };
      }
      if (key === "rulesLabel" || key === "paymentLabel" || key === "ageLabel") {
        if (key === "ageLabel") return null;
        const fallbackLabel =
          key === "rulesLabel" || key === "paymentLabel"
            ? "資金決済法に基づく表示"
            : key;
        return {
          label: links[key] || fallbackLabel,
          url: localizedFooterConfig.value.customerServiceUrl,
        };
      }
      return links[key] ? { label: links[key], url: localizedFooterConfig.value.customerServiceUrl } : null;
    })
    .filter(Boolean);
});

function openCustomerService() {
  const url = headerConfig.value.customerServiceUrl || "https://www.happyelements.com/";
  window.open(url, "_blank", "noopener,noreferrer");
}

function openFooterLink(url) {
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function formatMoney(amount, currency = "USD") {
  const normalizedCurrency = currency || "USD";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCurrency,
      currencyDisplay: "narrowSymbol",
    }).format(amount ?? 0);
  } catch {
    return `${normalizedCurrency} ${(amount ?? 0).toFixed(2)}`;
  }
}

function openBanner(banner) {
  if (banner?.linkUrl) {
    window.open(banner.linkUrl, "_blank", "noopener,noreferrer");
  }
}

function localizedText(key, fallback = "") {
  const entry = translationEntries.value?.[key];
  return entry?.values?.[currentLocale.value]?.trim() || fallback;
}

async function loadMallConfig() {
  try {
    const data = await api.getMallConfig();
    mallConfig.value = data;
    translationEntries.value = data.translations ?? {};
  } catch {
    mallConfig.value = null;
  }
}

async function loadTranslations() {
  try {
    translationEntries.value = await api.getTranslations();
  } catch {
    translationEntries.value = {};
  }
}

async function loadProductCategories() {
  try {
    productCategories.value = await api.getProductCategories();
  } catch {
    productCategories.value = [];
  }
}

const isLoggedIn = ref(false);
const gameAccount = ref("");
const roleList = ref([]);
const selectedRole = ref("");
const packList = ref([]);
const mallProducts = ref([]);
const mallReady = ref(false);
const storeUnlocked = ref(true);
const mallLoading = ref(false);
const showStoreLockedModal = ref(true);
const accountBanned = ref(false);
const showBannedModal = ref(false);
const banReason = ref("");
const banBannedAt = ref("");
const rechargeLimit = ref(null);
const showAgeLimitModal = ref(false);
const ageLimitModalMessage = ref("");
const creating = ref(false);
const resultMessage = ref("");

const showRechargeTips = ref(false);
const showAccountMenu = ref(false);
const showLoginModal = ref(false);
const showRoleSelector = ref(false);
const showProductDetail = ref(false);
const showCashier = ref(false);
const showCashierRetain = ref(false);
const showKonbiniReturnConfirm = ref(false);
const showPayResultConfirm = ref(false);
const showPayResultPage = ref(false);
const showPaypalPage = ref(false);
const showKonbiniPage = ref(false);
const payResultStatus = ref("success");
const payResultOrderId = ref("");
const payResultAmount = ref(0);
const payResultCurrency = ref("USD");
const payResultFailMessage = ref("");

const selectedProduct = ref(null);
const draftSelectedRole = ref("");
const purchaseQty = ref(1);
const payChannel = ref("alipay");
const pcPaymentMethod = ref("card");
const savePayPalAccount = ref(true);
const hasLaunchedPayApp = ref(false);
const isMobileH5 = ref(false);
const payOrderNo = ref("");
const pendingOrderId = ref("");
const showPayLanding = ref(false);
const showPayNoResult = ref(false);
const payToastMessage = ref("");
const showPayToast = ref(false);
const payToastLoading = ref(false);
const cashierCardRef = ref(null);
const konbiniExpireAt = ref("");
const simulatedIpCountryCode = ref("US");
const ipCountryOptions = [
  { value: "US", label: "US / USD" },
  { value: "JP", label: "JP / JPY" },
  { value: "RU", label: "RU / RUB" },
  { value: "CA", label: "CA / 默认价" },
];
const PAY_SESSION_KEY = "le_pay_session";
let payToastTimer = null;

const loginMode = ref("sms");
const loginPhone = ref("");
const loginSmsCode = ref("");
const loginPassword = ref("");
const loginAgreed = ref(false);
const smsCountdown = ref(0);
let smsTimer = null;

const defaultMockRoles = [
  { id: "r1", server: "Asia", name: "draupadi", uid: "4940436068", level: 68, storeUnlocked: true },
  { id: "r2", server: "Americas / Europe", name: "", uid: "", level: 0, storeUnlocked: false, empty: true },
  { id: "r3", server: "Japan", name: "Akatsuki", uid: "1201020944", level: 54, storeUnlocked: true },
];

const activeCategory = ref("all");
const productCategories = ref([]);
const mockProducts = ref([
  { id: "mock-pack-1", name: "宏景兵装组合包", category: "bundle", currency: "USD", price: 6, note: "剩余可购买 1 / 1", tag: "", image: "🧰" },
  { id: "mock-pack-2", name: "全面人才组合包", category: "bundle", currency: "USD", price: 128, note: "剩余可购买 1 / 1", tag: "", image: "📦" },
  { id: "mock-pack-3", name: "协议源能组合包", category: "bundle", currency: "USD", price: 198, note: "剩余2天", tag: "剩余2天", image: "🔥" },
  { id: "mock-pack-4", name: "人事支援组合包", category: "bundle", currency: "USD", price: 98, note: "剩余可购买 1 / 1", tag: "", image: "🎫" },
  { id: "mock-pass-1", name: "协议通行证·协议定制", category: "pass", currency: "USD", price: 68, note: "共获得协议通行证奖励", tag: "", image: "🪪" },
  { id: "monthly-card", name: "月卡", category: "monthly", currency: "USD", price: 30, note: "剩余可购买 6 / 8", tag: "", image: "🗓️" },
  {
    id: "gem-60",
    name: "开采-行质源石",
    category: "gem",
    currency: "USD",
    price: 6,
    note: "共获得行质源石包×6",
    tag: "特派赠送",
    promoText: "购买共获得 6 颗行质源石（首充共获得 12 颗）。",
    image: "🟡",
  },
  { id: "gem-300", name: "开采-一组行质源石", category: "gem", currency: "USD", price: 30, note: "共获得行质源石包×24", tag: "双倍-限购1次", image: "🟡" },
  { id: "gem-980", name: "开采-堆行质源石", category: "gem", currency: "USD", price: 98, note: "共获得行质源石包×84", tag: "双倍-限购1次", image: "🟡" },
  { id: "gem-1980", name: "开采-袋行质源石", category: "gem", currency: "USD", price: 198, note: "共获得同质源石×170", tag: "双倍-限购1次", image: "🟡" },
  { id: "gem-3280", name: "开采-盒行质源石", category: "gem", currency: "USD", price: 328, note: "共获得同质源石×282", tag: "双倍-限购1次", image: "🟡" },
  { id: "gem-6480", name: "开采-箱行质源石", category: "gem", currency: "USD", price: 648, note: "共获得同质源石×560", tag: "双倍-限购1次", image: "🟡" },
  { id: "mock-monthly-2", name: "每月素材组合包", category: "bundle", currency: "USD", price: 30, note: "剩余可购买 1 / 1", tag: "剩余6天", image: "🧪" },
  { id: "mock-monthly-3", name: "每月素材组合包", category: "bundle", currency: "USD", price: 98, note: "剩余可购买 1 / 1", tag: "剩余28天", image: "🧴" },
]);

const maskedAccount = computed(() => {
  const raw = gameAccount.value?.trim() || "";
  if (raw.length < 6) {
    return "152****68";
  }
  return `${raw.slice(0, 3)}****${raw.slice(-2)}`;
});

const tabOptions = computed(() => {
  const dynamic = productCategories.value
    .filter((c) => c.enabled !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((c) => ({
      label: localizedText(`category.${c.id}.label`, c.label),
      value: c.id,
    }));
  if (dynamic.length) {
    return [{ label: "全部", value: "all" }, ...dynamic];
  }
  return [
    { label: "全部", value: "all" },
    { label: "衍质源石", value: "gem" },
    { label: "月卡", value: "monthly" },
    { label: "协议通行证", value: "pass" },
    { label: "组合包", value: "bundle" },
  ];
});

const productSource = computed(() => {
  if (!isLoggedIn.value) {
    return mockProducts.value;
  }
  if (!mallReady.value || !storeUnlocked.value) {
    return [];
  }
  return mallProducts.value;
});

function mapProductCard(item) {
  const soldOut = Boolean(item.soldOut);
  const timeLimit =
    formatRemainingTimeLabel(item.timeLimitEnd, currentLocale.value) ??
    (item.expiresInDays != null
      ? formatRemainingDaysLabel(item.expiresInDays, currentLocale.value)
      : null) ??
    item.timeLimit ??
    (item.tag && /剩余\d+(?:天|小时)/.test(item.tag) ? item.tag : null);
  const promoTag =
    item.promoTag ??
    (soldOut || !item.tag || item.tag === "无法购买" || item.tag === timeLimit
      ? null
      : item.tag);
  const limitInfo =
    item.limitInfo ??
    (item.note && item.note.includes("剩余可购买")
      ? item.note
      : soldOut && item.limitMax > 0
        ? "已达限购上限"
        : null);
  const displayName = item.displayName ?? item.name;
  const keyBase = `product.${item.goodsId || item.id}`;
  const localizedPromoTag = localizedText(`${keyBase}.tag`, promoTag ?? "");
  const originalPrice =
    item.originalPrice ??
    (item.tag?.includes("双倍") && item.category === "gem" ? item.price * 2 : null);

  return {
    ...item,
    soldOut,
    promoTag: localizedPromoTag,
    timeLimit,
    limitInfo,
    displayName: localizedText(`${keyBase}.name`, displayName),
    description: localizedText(`${keyBase}.description`, item.description ?? ""),
    promoText: localizedText(`${keyBase}.promoText`, item.promoText ?? ""),
    originalPrice,
    unavailableReason:
      item.unavailableReason ??
      (item.ageLimitReason ?? (soldOut ? "已达限购上限" : null)),
    ageLimitBlocked: Boolean(item.ageLimitBlocked),
    ageLimitReason: item.ageLimitReason ?? null,
  };
}

const showRechargeLimitBanner = computed(() => {
  if (!isLoggedIn.value || !mallReady.value || !storeUnlocked.value || accountBanned.value) {
    return false;
  }
  const limit = rechargeLimit.value;
  if (!limit) {
    return false;
  }
  return !limit.canRecharge || limit.isLimited;
});

const rechargeLimitBannerClass = computed(() => {
  const tier = rechargeLimit.value?.ageTier;
  if (tier === "us-under13" || tier === "us-13to16") {
    return "is-blocked";
  }
  if (tier === "jp-under16" || tier === "jp-16to20") {
    return "is-limited";
  }
  return "";
});

const detailAgeBlockReason = computed(() => {
  if (!selectedProduct.value || !rechargeLimit.value) {
    return "";
  }
  return (
    getProductAgeLimitReason(
      rechargeLimit.value,
      selectedProduct.value.price,
      purchaseQty.value,
    ) || ""
  );
});

const canPayInDetail = computed(() => {
  if (!rechargeLimit.value?.canRecharge) {
    return false;
  }
  return !detailAgeBlockReason.value;
});

const displayProducts = computed(() => {
  const list =
    activeCategory.value === "all"
      ? productSource.value
      : productSource.value.filter((item) => item.category === activeCategory.value);
  return list.map(mapProductCard);
});

const currentRole = computed(() => {
  const role = roleList.value.find((item) => item.id === selectedRole.value);
  if (role) {
    return role;
  }
  return defaultMockRoles[0];
});

const hasSelectedRole = computed(() => Boolean(selectedRole.value));
const showMallPage = computed(() => isLoggedIn.value && hasSelectedRole.value);

const maxPurchaseQty = computed(() => {
  const product = selectedProduct.value;
  if (!product) {
    return 1;
  }
  let cap = UNLIMITED_PRODUCT_MAX_QUANTITY;
  if (product.limitMax > 0 && product.remaining != null) {
    cap = Math.min(Math.max(product.remaining, 1), UNLIMITED_PRODUCT_MAX_QUANTITY);
  } else if (product.limitMax > 0) {
    cap = Math.min(product.limitMax, UNLIMITED_PRODUCT_MAX_QUANTITY);
  }
  const limit = rechargeLimit.value;
  if (limit?.canRecharge && product.price > 0) {
    if (limit.singleMax != null) {
      cap = Math.min(cap, Math.max(Math.floor(limit.singleMax / product.price), 1));
    }
    if (limit.monthlyRemaining != null) {
      cap = Math.min(
        cap,
        Math.max(Math.floor(limit.monthlyRemaining / product.price), 1),
      );
    }
  }
  return Math.max(cap, 1);
});

const canDecreaseQty = computed(() => purchaseQty.value > 1);

const canIncreaseQty = computed(() => purchaseQty.value < maxPurchaseQty.value);

const detailLimitHint = computed(() => {
  const product = selectedProduct.value;
  if (!product) {
    return "";
  }
  if (product.limitMax > 0) {
    return `剩余可购买 ${maxPurchaseQty.value} / ${product.limitMax}`;
  }
  return `单次最多购买 ${maxPurchaseQty.value} 件`;
});

const detailTotalAmount = computed(() => {
  if (!selectedProduct.value) {
    return 0;
  }
  return selectedProduct.value.price * normalizePurchaseQty(purchaseQty.value);
});

const selectedCurrency = computed(() => selectedProduct.value?.currency || "USD");
const cashierAmountLabel = computed(() => formatMoney(detailTotalAmount.value, selectedCurrency.value));

function normalizePurchaseQty(value) {
  const quantity = Math.floor(Number(value));
  if (!Number.isFinite(quantity)) {
    return 1;
  }
  return Math.min(Math.max(quantity, 1), maxPurchaseQty.value);
}

function setPurchaseQty(value) {
  purchaseQty.value = normalizePurchaseQty(value);
}

function handlePurchaseQtyInput(event) {
  const rawValue = event.target.value;
  if (rawValue === "") {
    purchaseQty.value = "";
    return;
  }
  const nextValue = normalizePurchaseQty(rawValue);
  purchaseQty.value = nextValue;
  event.target.value = String(nextValue);
}

const pcPaymentMethods = computed(() => [
  {
    id: "card",
    label: t("cashierCard"),
    note: currentLocale.value === "en" ? "Visa / Mastercard / AmEx" : "支持多种主流银行卡",
    badge: "C",
  },
  {
    id: "paypal",
    label: t("cashierPaypal"),
    note: currentLocale.value === "en" ? "Pay with your PayPal account" : "使用 PayPal 账号支付",
    badge: "P",
  },
  {
    id: "apple",
    label: t("cashierApple"),
    note: currentLocale.value === "en" ? "Available on Apple devices" : "苹果设备可用",
    badge: "A",
  },
  {
    id: "google",
    label: t("cashierGoogle"),
    note: currentLocale.value === "en" ? "Fast checkout with Google Pay" : "使用 Google Pay 快速结账",
    badge: "G",
  },
  {
    id: "konbini",
    label: t("cashierKonbini"),
    note: currentLocale.value === "ja" ? "ローソン / ファミリーマート / セイコーマート / ミニストップ" : "日本便利店支付",
    badge: "K",
  },
]);

const selectedPcPaymentMethod = computed(
  () => pcPaymentMethods.value.find((item) => item.id === pcPaymentMethod.value) ?? pcPaymentMethods.value[0],
);

const isWaitingCheckout = computed(
  () =>
    showPaypalPage.value ||
    showKonbiniPage.value ||
    pcPaymentMethod.value === "paypal" ||
    pcPaymentMethod.value === "konbini" ||
    payChannel.value === "paypal" ||
    payChannel.value === "konbini",
);

function clearPayToast() {
  if (payToastTimer) {
    window.clearTimeout(payToastTimer);
    payToastTimer = null;
  }
  showPayToast.value = false;
  payToastMessage.value = "";
  payToastLoading.value = false;
}

function openPayToast(message, { loading = false, duration = 0 } = {}) {
  clearPayToast();
  payToastMessage.value = message;
  payToastLoading.value = loading;
  showPayToast.value = true;
  if (duration > 0) {
    payToastTimer = window.setTimeout(() => {
      clearPayToast();
    }, duration);
  }
}

const canSendSms = computed(() => /^1\d{10}$/.test(loginPhone.value.trim()) && smsCountdown.value === 0);

const canSubmitLogin = computed(() => {
  if (!loginAgreed.value || !/^1\d{10}$/.test(loginPhone.value.trim())) {
    return false;
  }
  if (loginMode.value === "sms") {
    return loginSmsCode.value.trim().length >= 4;
  }
  return loginPassword.value.trim().length >= 6;
});

function applyDefaultRoles() {
  roleList.value = [...defaultMockRoles];
}

async function loadData({ promptRole = false } = {}) {
  try {
    roleList.value = await api.getRoles();
    if (roleList.value.length === 0) {
      applyDefaultRoles();
    }
  } catch {
    applyDefaultRoles();
  }
  if (!isLoggedIn.value || !gameAccount.value) {
    return;
  }
  const allowed = await checkAccountStatus();
  if (!allowed) {
    showRoleSelector.value = false;
    draftSelectedRole.value = "";
    return;
  }
  if (promptRole || !selectedRole.value) {
    draftSelectedRole.value = "";
    showRoleSelector.value = true;
    return;
  }
  if (selectedRole.value) {
    await loadMall();
  }
}

function openRoleSelector(preselectCurrent = true) {
  draftSelectedRole.value = preselectCurrent ? selectedRole.value : "";
  showRoleSelector.value = true;
}

async function confirmRoleSelection() {
  const role = roleList.value.find((item) => item.id === draftSelectedRole.value);
  if (!role || role.empty) {
    return;
  }
  selectedRole.value = role.id;
  showRoleSelector.value = false;
  const allowed = await checkAccountStatus();
  if (allowed) {
    await loadMall();
  }
}

function applyRechargeLimitFromData(data) {
  rechargeLimit.value =
    data?.rechargeLimit ?? buildLocalRechargeLimit(gameAccount.value.trim());
}

function applyLocalAccountStatus() {
  const accountId = gameAccount.value.trim();
  if (accountId === BANNED_DEMO_PHONE) {
  accountBanned.value = true;
  banReason.value = DEFAULT_BAN_REASON;
  banBannedAt.value = "2026-05-01";
  showBannedModal.value = true;
  showRoleSelector.value = false;
  draftSelectedRole.value = "";
  mallReady.value = true;
  storeUnlocked.value = false;
  mallProducts.value = [];
    rechargeLimit.value = null;
    return false;
  }
  accountBanned.value = false;
  showBannedModal.value = false;
  banReason.value = "";
  banBannedAt.value = "";
  applyRechargeLimitFromData(null);
  return true;
}

async function checkAccountStatus() {
  if (!gameAccount.value.trim()) {
    return true;
  }
  try {
    const data = await api.getAccountStatus(gameAccount.value.trim());
    if (data.banned) {
      accountBanned.value = true;
      banReason.value = data.banReason || DEFAULT_BAN_REASON;
      banBannedAt.value = data.bannedAt || "";
      showBannedModal.value = true;
      showRoleSelector.value = false;
      draftSelectedRole.value = "";
      mallReady.value = true;
      storeUnlocked.value = false;
      mallProducts.value = [];
      rechargeLimit.value = null;
      return false;
    }
    accountBanned.value = false;
    showBannedModal.value = false;
    banReason.value = "";
    banBannedAt.value = "";
    applyRechargeLimitFromData(data);
    return true;
  } catch {
    return applyLocalAccountStatus();
  }
}

function closeBannedModal() {
  showBannedModal.value = false;
}

function contactSupportFromBan() {
  openCustomerService();
}

async function loadMall() {
  if (!isLoggedIn.value || !gameAccount.value || !selectedRole.value || accountBanned.value) {
    return;
  }
  mallLoading.value = true;
  mallReady.value = false;
  try {
    const data = await api.getMall(
      gameAccount.value,
      selectedRole.value,
      simulatedIpCountryCode.value,
    );
    storeUnlocked.value = data.storeUnlocked;
    if (data.rechargeLimit) {
      rechargeLimit.value = data.rechargeLimit;
    } else if (!rechargeLimit.value) {
      applyRechargeLimitFromData(null);
    }
    const rawProducts = data.products ?? [];
    if (data.categories?.length) {
      productCategories.value = data.categories;
    }
    mallProducts.value = storeUnlocked.value
      ? rawProducts.map((item) =>
          item.ageLimitBlocked
            ? item
            : applyAgeLimitToProduct(item, rechargeLimit.value),
        )
      : [];
    packList.value = mallProducts.value;
    showStoreLockedModal.value = !storeUnlocked.value;
    mallReady.value = true;
  } catch (error) {
    const role = roleList.value.find((item) => item.id === selectedRole.value);
    const accountLocked = gameAccount.value.trim() === LOCKED_DEMO_PHONE;
    storeUnlocked.value = !accountLocked && role?.storeUnlocked !== false;
    applyRechargeLimitFromData(null);
    const base = storeUnlocked.value ? [...mockProducts.value] : [];
    mallProducts.value = base.map((item) =>
      applyAgeLimitToProduct(item, rechargeLimit.value),
    );
    mallReady.value = true;
    resultMessage.value = error.message || "商城数据加载失败";
  } finally {
    mallLoading.value = false;
  }
}

function closeStoreLockedModal() {
  showStoreLockedModal.value = false;
}

function openLogin() {
  showLoginModal.value = true;
}

function closeLogin() {
  showLoginModal.value = false;
}

function switchLoginMode(mode) {
  loginMode.value = mode;
}

function sendSmsCode() {
  if (!canSendSms.value) {
    return;
  }
  smsCountdown.value = 60;
  smsTimer = window.setInterval(() => {
    smsCountdown.value -= 1;
    if (smsCountdown.value <= 0 && smsTimer) {
      window.clearInterval(smsTimer);
      smsTimer = null;
    }
  }, 1000);
  resultMessage.value = "验证码已发送（演示）";
}

function fillLockedDemoAccount() {
  loginMode.value = "sms";
  loginPhone.value = LOCKED_DEMO_PHONE;
  loginSmsCode.value = LOCKED_DEMO_CODE;
  loginAgreed.value = true;
}

function fillUnlockedDemoAccount() {
  loginMode.value = "sms";
  loginPhone.value = UNLOCKED_DEMO_PHONE;
  loginSmsCode.value = UNLOCKED_DEMO_CODE;
  loginAgreed.value = true;
}

function fillBannedDemoAccount() {
  loginMode.value = "sms";
  loginPhone.value = BANNED_DEMO_PHONE;
  loginSmsCode.value = BANNED_DEMO_CODE;
  loginAgreed.value = true;
}

async function loginWithLockedDemo() {
  fillLockedDemoAccount();
  await submitLogin();
}

async function loginWithUnlockedDemo() {
  fillUnlockedDemoAccount();
  await submitLogin();
}

async function loginWithBannedDemo() {
  fillBannedDemoAccount();
  await submitLogin();
}

function fillRegionDemoAccount(phone) {
  loginMode.value = "sms";
  loginPhone.value = phone;
  loginSmsCode.value = REGION_DEMO_CODE;
  loginAgreed.value = true;
}

async function loginWithUsChildDemo() {
  fillRegionDemoAccount(REGION_DEMO_US_CHILD);
  await submitLogin();
}

async function loginWithJpTeenDemo() {
  fillRegionDemoAccount(REGION_DEMO_JP_TEEN);
  await submitLogin();
}

async function loginWithJp16To20Demo() {
  fillRegionDemoAccount(REGION_DEMO_JP_16_TO_20);
  await submitLogin();
}

async function loginWithUsTeenDemo() {
  fillRegionDemoAccount(REGION_DEMO_US_TEEN);
  await submitLogin();
}

async function loginWithCaDefaultDemo() {
  fillRegionDemoAccount(REGION_DEMO_CA_DEFAULT);
  await submitLogin();
}

async function loginWithRuLockedPriceDemo() {
  fillRegionDemoAccount(REGION_DEMO_RU_LOCKED_PRICE);
  await submitLogin();
}

function openAgeLimitModal(message) {
  ageLimitModalMessage.value = message;
  showAgeLimitModal.value = true;
}

function closeAgeLimitModal() {
  showAgeLimitModal.value = false;
}

async function submitLogin() {
  if (!canSubmitLogin.value) {
    return;
  }
  gameAccount.value = loginPhone.value.trim();
  isLoggedIn.value = true;
  selectedRole.value = "";
  showLoginModal.value = false;
  await loadData({ promptRole: true });
}

async function submitOrder(productId, quantity = 1, pendingOnly = false) {
  if (!isLoggedIn.value) {
    openLogin();
    throw new Error("请先登录");
  }
  if (!selectedRole.value) {
    throw new Error("请先选择角色");
  }
  try {
    return await api.createOrder({
      accountId: gameAccount.value,
      roleId: selectedRole.value,
      productId,
      quantity,
      pendingOnly,
      countryCode: simulatedIpCountryCode.value,
    });
  } catch (error) {
    const payload =
      typeof error.data?.message === "object" && error.data.message
        ? error.data.message
        : null;
    if (payload?.rechargeLimit) {
      rechargeLimit.value = payload.rechargeLimit;
    }
    const msg =
      typeof error.data?.message === "string"
        ? error.data.message
        : payload?.message || error.message || "创建订单失败";
    throw new Error(msg);
  }
}

function savePaySession() {
  sessionStorage.setItem(
    PAY_SESSION_KEY,
    JSON.stringify({
      orderId: pendingOrderId.value,
      payChannel: payChannel.value,
      accountId: gameAccount.value,
    }),
  );
}

function clearPaySession() {
  sessionStorage.removeItem(PAY_SESSION_KEY);
}

function openPayResultPage(status, orderData = null, failMessage = "") {
  payResultStatus.value = status;
  payResultOrderId.value = orderData?.orderId ?? payOrderNo.value;
  payResultAmount.value = orderData?.amount ?? detailTotalAmount.value;
  payResultCurrency.value = orderData?.currency ?? orderData?.product?.currency ?? selectedCurrency.value;
  payResultFailMessage.value = failMessage;
  showCashier.value = false;
  showPaypalPage.value = false;
  showKonbiniPage.value = false;
  showKonbiniReturnConfirm.value = false;
  showPayLanding.value = false;
  showPayResultConfirm.value = false;
  showPayNoResult.value = false;
  showCashierRetain.value = false;
  clearPayToast();
  konbiniExpireAt.value = "";
  resetH5PayFlow();
  clearPaySession();
  showPayResultPage.value = true;
}

function closePayResultPage() {
  showPayResultPage.value = false;
  resetH5PayFlow();
}

function retryPayment() {
  showPayResultPage.value = false;
  showCashier.value = true;
  resetH5PayFlow();
}

function payChannelLabel(channel = payChannel.value) {
  if (channel === "wechat") {
    return "微信支付";
  }
  if (channel === "paypal") {
    return "PayPal";
  }
  if (channel === "konbini") {
    return "Konbini";
  }
  return "支付宝支付";
}

function formatKonbiniExpireAt() {
  const time = new Date(Date.now() + 30 * 60 * 1000);
  return time.toLocaleString("ja-JP", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function processPaymentSuccess() {
  if (!selectedProduct.value) {
    return;
  }
  setPurchaseQty(purchaseQty.value);
  creating.value = true;
  try {
    const data = await submitOrder(selectedProduct.value.id, purchaseQty.value);
    purchaseQty.value = 1;
    await loadMall();
    openPayResultPage("success", data);
  } catch (error) {
    openPayResultPage("fail", null, error.message || "订单创建失败，请稍后重试");
  } finally {
    creating.value = false;
  }
}

function processPaymentFailed() {
  openPayResultPage("fail", null, "支付未完成或已取消，请重新发起支付。");
}

async function queryOrderPaymentStatus(orderId = pendingOrderId.value) {
  try {
    return await api.getOrderPaymentStatus(orderId, gameAccount.value);
  } catch (error) {
    throw new Error(error.data?.message || error.message || "查询订单失败");
  }
}

async function notifyOrderPaidFromApp() {
  try {
    return await api.notifyOrderPaid(
      pendingOrderId.value,
      gameAccount.value,
      payChannel.value,
    );
  } catch (error) {
    throw new Error(error.data?.message || error.message || "同步支付结果失败");
  }
}

async function createPendingPayOrder() {
  setPurchaseQty(purchaseQty.value);
  const data = await submitOrder(
    selectedProduct.value.id,
    purchaseQty.value,
    true,
  );
  pendingOrderId.value = data.orderId;
  payOrderNo.value = data.orderId;
  return data;
}

function openPayResultQuery() {
  showPayResultConfirm.value = true;
}

/** 确保存在待支付订单，供 H5 前端模拟器触发截图场景 */
async function ensureMockPendingOrder(channel = payChannel.value, forceNew = false) {
  if (!selectedProduct.value) {
    resultMessage.value = "请先选择商品并打开收银台";
    return false;
  }
  payChannel.value = channel;
  try {
    if (forceNew || !pendingOrderId.value) {
      await createPendingPayOrder();
      savePaySession();
    }
    return true;
  } catch (error) {
    resultMessage.value = error.message || "创建演示订单失败";
    return false;
  }
}

/** 截图2：从 App 返回后 — 支付结果确认 */
async function mockTriggerPayResultConfirm(channel = "alipay") {
  showPayLanding.value = false;
  showPayNoResult.value = false;
  showPayResultPage.value = false;
  showPayResultConfirm.value = false;
  if (!(await ensureMockPendingOrder(channel, true))) {
    return;
  }
  showCashier.value = true;
  hasLaunchedPayApp.value = true;
  openPayResultQuery();
}

/** 截图3：点击「已支付」但订单仍未支付 — 未查询到结果 */
async function mockTriggerPayNoResult(channel = "alipay") {
  showPayLanding.value = false;
  showPayResultConfirm.value = false;
  showPayResultPage.value = false;
  if (!(await ensureMockPendingOrder(channel, true))) {
    return;
  }
  showCashier.value = true;
  showPayNoResult.value = true;
}

/** 演示：支付成功结果页（落地页「已支付完成返回」同等效果） */
async function mockTriggerPaySuccess(channel = "alipay") {
  showPayLanding.value = false;
  showPayResultConfirm.value = false;
  showPayNoResult.value = false;
  creating.value = true;
  try {
    if (!(await ensureMockPendingOrder(channel, true))) {
      return;
    }
    await notifyOrderPaidFromApp();
    await loadMall();
    const status = await queryOrderPaymentStatus();
    openPayResultPage("success", status.order);
  } catch (error) {
    resultMessage.value = error.message;
  } finally {
    creating.value = false;
  }
}

function toggleAccountMenu() {
  showAccountMenu.value = !showAccountMenu.value;
}

function logout() {
  isLoggedIn.value = false;
  gameAccount.value = "";
  selectedRole.value = "";
  roleList.value = [];
  mallProducts.value = [];
  mallReady.value = false;
  storeUnlocked.value = true;
  showStoreLockedModal.value = false;
  accountBanned.value = false;
  showBannedModal.value = false;
  banReason.value = "";
  banBannedAt.value = "";
  rechargeLimit.value = null;
  showAgeLimitModal.value = false;
  ageLimitModalMessage.value = "";
  showRoleSelector.value = false;
  draftSelectedRole.value = "";
  showAccountMenu.value = false;
  showCashier.value = false;
  showPaypalPage.value = false;
  showKonbiniPage.value = false;
  showKonbiniReturnConfirm.value = false;
  showProductDetail.value = false;
  konbiniExpireAt.value = "";
  clearPayToast();
  resultMessage.value = "已退出登录";
}

function handleBuy(productId) {
  if (!isLoggedIn.value) {
    openLogin();
    return;
  }
  if (accountBanned.value) {
    showBannedModal.value = true;
    return;
  }
  if (!storeUnlocked.value) {
    showStoreLockedModal.value = true;
    return;
  }
  if (rechargeLimit.value && !rechargeLimit.value.canRecharge) {
    openAgeLimitModal(
      rechargeLimit.value.notice ||
        rechargeLimit.value.blockReason ||
        "当前账号无法充值",
    );
    return;
  }
  const raw = productSource.value.find((item) => item.id === productId);
  if (!raw) {
    resultMessage.value = "商品不存在";
    return;
  }
  const product = mapProductCard(raw);
  if (product.ageLimitBlocked || product.ageLimitReason) {
    openAgeLimitModal(product.ageLimitReason || "该商品超出当前账号充值限额");
    return;
  }
  if (product.soldOut) {
    resultMessage.value = product.ageLimitReason || "该商品已达限购上限，与游戏内共享";
    return;
  }
  selectedProduct.value = product;
  purchaseQty.value = 1;
  showProductDetail.value = true;
}

function closeProductDetail() {
  showProductDetail.value = false;
  purchaseQty.value = 1;
}

function increaseQty() {
  if (canIncreaseQty.value) {
    setPurchaseQty(purchaseQty.value + 1);
  }
}

function decreaseQty() {
  if (canDecreaseQty.value) {
    setPurchaseQty(purchaseQty.value - 1);
  }
}

function detectMobileH5() {
  const ua = navigator.userAgent.toLowerCase();
  const mobileUa = /android|iphone|ipad|ipod|mobile|micromessenger/i.test(ua);
  isMobileH5.value = window.innerWidth <= 768 || mobileUa;
}

function resetH5PayFlow() {
  hasLaunchedPayApp.value = false;
  pendingOrderId.value = "";
}

function payNow() {
  if (!selectedProduct.value) {
    return;
  }
  if (!rechargeLimit.value?.canRecharge) {
    openAgeLimitModal(
      rechargeLimit.value?.notice ||
        rechargeLimit.value?.blockReason ||
        "当前账号无法充值",
    );
    return;
  }
  if (detailAgeBlockReason.value) {
    openAgeLimitModal(detailAgeBlockReason.value);
    return;
  }
  showProductDetail.value = false;
  payChannel.value =
    pcPaymentMethod.value === "paypal"
      ? "paypal"
      : pcPaymentMethod.value === "konbini"
        ? "konbini"
        : isMobileH5.value
          ? "alipay"
          : "wechat";
  resetH5PayFlow();
  payOrderNo.value = `LE${Date.now()}`;
  showCashier.value = true;
}

function tryOpenPayScheme(channel) {
  const schemes = {
    alipay: "alipays://platformapi/startapp?appId=20000056",
    wechat: "weixin://dl/business/?t=lepay",
  };
  const url = schemes[channel];
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = url;
  document.body.appendChild(iframe);
  window.setTimeout(() => {
    iframe.remove();
  }, 2500);
  window.setTimeout(() => {
    window.location.href = url;
  }, 120);
}

async function openPayLanding(channel) {
  if (!selectedProduct.value) {
    return;
  }
  payChannel.value = channel;
  creating.value = true;
  try {
    await createPendingPayOrder();
    showCashier.value = false;
    showCashierRetain.value = false;
    showKonbiniReturnConfirm.value = false;
    showPayLanding.value = true;
    hasLaunchedPayApp.value = false;
    savePaySession();
  } catch (error) {
    resultMessage.value = error.message;
    showCashier.value = true;
  } finally {
    creating.value = false;
  }
}

async function openPaypalPage() {
  if (!selectedProduct.value) {
    return;
  }
  payChannel.value = "paypal";
  creating.value = true;
  try {
    if (!pendingOrderId.value) {
      await createPendingPayOrder();
    }
    savePaySession();
    konbiniExpireAt.value = formatKonbiniExpireAt();
    clearPayToast();
    showCashierRetain.value = false;
    showKonbiniReturnConfirm.value = false;
    showPayResultConfirm.value = false;
    showPayNoResult.value = false;
    showPaypalPage.value = true;
    showKonbiniPage.value = false;
    showCashier.value = true;
    hasLaunchedPayApp.value = false;
  } catch (error) {
    resultMessage.value = error.message || "创建 PayPal 订单失败";
  } finally {
    creating.value = false;
  }
}

async function openKonbiniPage() {
  if (!selectedProduct.value) {
    return;
  }
  payChannel.value = "konbini";
  creating.value = true;
  try {
    if (!pendingOrderId.value) {
      await createPendingPayOrder();
    }
    savePaySession();
    clearPayToast();
    showCashierRetain.value = false;
    showKonbiniReturnConfirm.value = false;
    showPayResultConfirm.value = false;
    showPayNoResult.value = false;
    showPaypalPage.value = false;
    showKonbiniPage.value = true;
    showCashier.value = true;
  } catch (error) {
    resultMessage.value = error.message || "创建 Konbini 订单失败";
  } finally {
    creating.value = false;
  }
}

function launchFromLanding() {
  hasLaunchedPayApp.value = true;
  savePaySession();
  tryOpenPayScheme(payChannel.value);
}

function closePayLandingToCashier() {
  showPayLanding.value = false;
  showCashier.value = true;
}

async function returnFromLandingPaidLink() {
  creating.value = true;
  try {
    await notifyOrderPaidFromApp();
    showPayLanding.value = false;
    await loadMall();
    const status = await queryOrderPaymentStatus();
    openPayResultPage("success", status.order);
  } catch (error) {
    resultMessage.value = error.message;
  } finally {
    creating.value = false;
  }
}

async function handleH5PayReturn() {
  if (!pendingOrderId.value || !isMobileH5.value) {
    return;
  }
  showPayLanding.value = false;
  try {
    const status = await queryOrderPaymentStatus();
    if (status.paid) {
      await loadMall();
      openPayResultPage("success", status.order);
      return;
    }
    showCashier.value = true;
    openPayResultQuery();
  } catch {
    showCashier.value = true;
    openPayResultQuery();
  }
}

function closeCashier() {
  showCashier.value = false;
  showCashierRetain.value = false;
  showPaypalPage.value = false;
  showKonbiniPage.value = false;
  showKonbiniReturnConfirm.value = false;
  showPayLanding.value = false;
  showPayResultConfirm.value = false;
  showPayNoResult.value = false;
  clearPayToast();
  konbiniExpireAt.value = "";
  resetH5PayFlow();
  clearPaySession();
}

function requestCloseCashier() {
  if (showKonbiniPage.value) {
    showCashierRetain.value = false;
    showKonbiniPage.value = false;
    showCashier.value = true;
    showKonbiniReturnConfirm.value = true;
    return;
  }
  if (isWaitingCheckout.value) {
    showPaypalPage.value = false;
    showKonbiniPage.value = false;
    showCashierRetain.value = true;
    return;
  }
  showCashierRetain.value = true;
}

function cancelCashierRetain() {
  showCashierRetain.value = false;
}

function cancelKonbiniReturnConfirm() {
  showKonbiniReturnConfirm.value = false;
  showCashier.value = true;
}

function confirmKonbiniReturnConfirm() {
  showKonbiniReturnConfirm.value = false;
  closeCashier();
}

function confirmCashierRetainLeave() {
  closeCashier();
}

function selectPcPaymentMethod(method) {
  pcPaymentMethod.value = method;
}

function openPcPayConfirm() {
  if (pcPaymentMethod.value === "paypal") {
    openPaypalPage();
    return;
  }
  if (pcPaymentMethod.value === "konbini") {
    openKonbiniPage();
    return;
  }
  processPaymentSuccess();
}

async function completePaypalPayment() {
  creating.value = true;
  try {
    if (!pendingOrderId.value) {
      await createPendingPayOrder();
    }
    await notifyOrderPaidFromApp();
    showPaypalPage.value = false;
    showKonbiniPage.value = false;
    showKonbiniReturnConfirm.value = false;
    await loadMall();
    const status = await queryOrderPaymentStatus();
    openPayResultPage("success", status.order);
  } catch (error) {
    resultMessage.value = error.message || "PayPal 支付失败";
  } finally {
    creating.value = false;
  }
}

async function completeKonbiniPayment() {
  creating.value = true;
  try {
    if (!pendingOrderId.value) {
      await createPendingPayOrder();
    }
    await notifyOrderPaidFromApp();
    showKonbiniPage.value = false;
    showPaypalPage.value = false;
    showKonbiniReturnConfirm.value = false;
    await loadMall();
    const status = await queryOrderPaymentStatus();
    openPayResultPage("success", status.order);
  } catch (error) {
    resultMessage.value = error.message || "Konbini 支付失败";
  } finally {
    creating.value = false;
  }
}

async function confirmPayWaitingPaid() {
  if (!pendingOrderId.value) {
    if (pcPaymentMethod.value === "konbini" || payChannel.value === "konbini") {
      await completeKonbiniPayment();
    } else {
      await completePaypalPayment();
    }
    return;
  }
  showCashierRetain.value = false;
  openPayToast(t("payProcessingToast"), { loading: true });
  creating.value = true;
  try {
    const status = await queryOrderPaymentStatus();
    if (status.paid) {
      clearPayToast();
      await loadMall();
      openPayResultPage("success", status.order);
      return;
    }
    showPaypalPage.value = false;
    showKonbiniPage.value = false;
    showKonbiniReturnConfirm.value = false;
    showCashier.value = true;
    if (isMobileH5.value) {
      clearPayToast();
      showPayNoResult.value = true;
    } else {
      openPayToast(t("payNoResultToast"), { loading: false, duration: 5200 });
    }
  } catch (error) {
    showPaypalPage.value = false;
    showKonbiniPage.value = false;
    showKonbiniReturnConfirm.value = false;
    showCashier.value = true;
    openPayToast(error.message || t("payNoResultToast"), { loading: false, duration: 5200 });
  } finally {
    creating.value = false;
  }
}

async function confirmPaid() {
  if (!pendingOrderId.value) {
    processPaymentSuccess();
    return;
  }
  showPayResultConfirm.value = false;
  creating.value = true;
  try {
    const status = await queryOrderPaymentStatus();
    if (status.paid) {
      await loadMall();
      openPayResultPage("success", status.order);
      return;
    }
    showPayNoResult.value = true;
  } catch {
    showPayNoResult.value = true;
  } finally {
    creating.value = false;
  }
}

function confirmUnpaid() {
  showPayResultConfirm.value = false;
  showPayLanding.value = false;
  showCashier.value = true;
}

function closePayNoResult() {
  showPayNoResult.value = false;
  closeCashier();
  clearPaySession();
}

function onVisibilityChange() {
  if (document.hidden) {
    return;
  }
  if (!isMobileH5.value || !pendingOrderId.value) {
    return;
  }
  if (hasLaunchedPayApp.value || showPayLanding.value) {
    handleH5PayReturn();
  }
}

function onPageShow(event) {
  if (event.persisted && pendingOrderId.value) {
    handleH5PayReturn();
  }
}

function restorePaySessionOnMount() {
  const raw = sessionStorage.getItem(PAY_SESSION_KEY);
  if (!raw) {
    return;
  }
  try {
    const session = JSON.parse(raw);
    if (session.accountId && session.accountId !== gameAccount.value.trim()) {
      return;
    }
    if (session.orderId) {
      pendingOrderId.value = session.orderId;
      payOrderNo.value = session.orderId;
      if (session.payChannel) {
        payChannel.value = session.payChannel;
      }
    }
  } catch {
    clearPaySession();
  }
}

watch(selectedRole, () => {
  if (isLoggedIn.value && !accountBanned.value && selectedRole.value && !showRoleSelector.value) {
    loadMall();
  }
});

watch(simulatedIpCountryCode, () => {
  if (isLoggedIn.value && !accountBanned.value && selectedRole.value && !showRoleSelector.value) {
    loadMall();
  }
});

watch(showCashier, async (visible) => {
  if (!visible) {
    return;
  }
  await nextTick();
  cashierCardRef.value?.scrollTo?.({ top: 0, behavior: "auto" });
  if (cashierCardRef.value) {
    cashierCardRef.value.scrollTop = 0;
  }
});

onMounted(() => {
  detectMobileH5();
  window.addEventListener("resize", detectMobileH5);
  loadMallConfig();
  loadTranslations();
  loadProductCategories();
  loadData();
  restorePaySessionOnMount();
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pageshow", onPageShow);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", detectMobileH5);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  window.removeEventListener("pageshow", onPageShow);
  if (smsTimer) {
    window.clearInterval(smsTimer);
  }
  if (payToastTimer) {
    window.clearTimeout(payToastTimer);
  }
});
</script>

<template>
  <div class="page">
    <header class="topbar">
      <div class="logo-wrap">
        <img
          v-if="headerConfig.publisherLogoUrl"
          :src="headerConfig.publisherLogoUrl"
          alt="发行主体"
          class="publisher-logo"
        />
        <span v-if="headerConfig.publisherLogoUrl" class="logo-divider">|</span>
        <span v-if="headerConfig.publisherLogoUrl" class="logo-sub">{{ rechargeCenterNameText }}</span>
        <template v-else>
          <span class="logo">GRYPHLINE</span>
          <span class="logo-divider">|</span>
          <span class="logo-sub">{{ rechargeCenterNameText }}</span>
        </template>
      </div>
      <div class="actions">
        <select v-model="currentLocale" class="language-select" aria-label="Language">
          <option v-for="language in languageOptions" :key="language.code" :value="language.code">
            {{ language.label }}
          </option>
        </select>
        <button class="tips-btn icon-help" type="button" :title="t('rechargeTips')" @click="showRechargeTips = true">?</button>
        <button class="tips-btn icon-service" type="button" :title="t('customerService')" @click="openCustomerService">⌕</button>
        <button v-if="!isLoggedIn" class="login-header-btn" type="button" @click="openLogin">{{ t("login") }}</button>
        <div v-else class="account-wrap">
          <button class="account-btn" type="button" @click="toggleAccountMenu">
            <span>{{ maskedAccount }}</span>
            <span class="account-arrow" :class="{ open: showAccountMenu }">⌃</span>
          </button>
          <div v-if="showAccountMenu" class="account-menu">
            <button class="logout-btn" type="button" @click="logout">
              <span class="logout-icon">⎋</span>
              <span>{{ t("logout") }}</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="container">
      <section class="hero">
        <div v-if="!activeBanners.length" class="banner-placeholder">Banner 占位（可在管理后台配置）</div>
        <button
          v-for="banner in activeBanners"
          :key="banner.id"
          type="button"
          class="mall-banner"
          @click="openBanner(banner)"
        >
          <img v-if="banner.imageUrl" :src="banner.imageUrl" :alt="banner.title" class="mall-banner-img" />
          <span v-else class="mall-banner-title">{{ banner.title }}</span>
        </button>
      </section>

      <!-- 登录前 / 选角前 -->
      <section v-if="!showMallPage" class="login-panel">
        <div class="game-icon">
          <img v-if="gameDisplay.iconUrl" :src="gameDisplay.iconUrl" alt="" class="game-icon-img" />
          <span v-else class="game-icon-fallback">{{ gameDisplay.iconFallback }}</span>
        </div>
        <h2 class="game-title">{{ gameDisplay.name }}</h2>
        <button
          v-if="!isLoggedIn"
          class="login-main-btn"
          type="button"
          @click="openLogin"
        >
          {{ t("login") }}
        </button>
        <button
          v-else
          class="login-main-btn"
          type="button"
          @click="openRoleSelector"
        >
          {{ t("selectRole") }}
        </button>
        <p class="login-hint">
          {{ !isLoggedIn ? t("loginHint") : t("selectRoleHint") }}
        </p>

        <div class="login-demo-block">
          <p class="login-demo-title">演示账号（点击一键登录）</p>
          <button class="login-demo-card locked" type="button" @click="loginWithLockedDemo">
            <span class="login-demo-badge">未解锁商城</span>
            <span class="login-demo-phone">{{ LOCKED_DEMO_PHONE }}</span>
            <span class="login-demo-desc">验证码 {{ LOCKED_DEMO_CODE }} · 登录后出现「商店未解锁」弹框</span>
          </button>
          <button class="login-demo-card" type="button" @click="loginWithUnlockedDemo">
            <span class="login-demo-badge unlocked">日本 · 成年</span>
            <span class="login-demo-phone">{{ UNLOCKED_DEMO_PHONE }}</span>
            <span class="login-demo-desc">验证码 {{ UNLOCKED_DEMO_CODE }} · 日本注册地成年用户，无充值限额</span>
          </button>

          <p class="login-demo-subtitle">海外注册地限额演示（验证码均为 {{ REGION_DEMO_CODE }}）</p>
          <button class="login-demo-card age-blocked" type="button" @click="loginWithUsChildDemo">
            <span class="login-demo-badge age-blocked">美国 · 未满 13 岁</span>
            <span class="login-demo-phone">{{ REGION_DEMO_US_CHILD }}</span>
            <span class="login-demo-desc">不能充值 · 商城展示注册地限额提示</span>
          </button>
          <button class="login-demo-card age-limited" type="button" @click="loginWithJpTeenDemo">
            <span class="login-demo-badge age-limited">日本 · 未满 16 岁</span>
            <span class="login-demo-phone">{{ REGION_DEMO_JP_TEEN }}</span>
            <span class="login-demo-desc">月累计 ≤5,000 日元（演示本月已充 4,800 日元）</span>
          </button>
          <button class="login-demo-card age-limited" type="button" @click="loginWithJp16To20Demo">
            <span class="login-demo-badge age-limited">日本 · 16-20 岁</span>
            <span class="login-demo-phone">{{ REGION_DEMO_JP_16_TO_20 }}</span>
            <span class="login-demo-desc">每月 20,000 日元 · 演示已达限额，点击支付会弹出无法支付提示</span>
          </button>
          <button class="login-demo-card age-limited" type="button" @click="loginWithUsTeenDemo">
            <span class="login-demo-badge age-limited">美国 · 13-16 岁</span>
            <span class="login-demo-phone">{{ REGION_DEMO_US_TEEN }}</span>
            <span class="login-demo-desc">需经家长管控验证开通支付功能，未开通时点击充值跳转验证通知</span>
          </button>
          <button class="login-demo-card" type="button" @click="loginWithCaDefaultDemo">
            <span class="login-demo-badge">加拿大 · 默认币种</span>
            <span class="login-demo-phone">{{ REGION_DEMO_CA_DEFAULT }}</span>
            <span class="login-demo-desc">未配置 CA 国家定价时，商品展示默认币种和默认售价</span>
          </button>
          <button class="login-demo-card age-limited" type="button" @click="loginWithRuLockedPriceDemo">
            <span class="login-demo-badge age-limited">俄罗斯 · 注册地锁定</span>
            <span class="login-demo-phone">{{ REGION_DEMO_RU_LOCKED_PRICE }}</span>
            <span class="login-demo-desc">不受模拟 IP / VPN 影响，商品始终展示 RUB 定价</span>
          </button>

          <button class="login-demo-card banned" type="button" @click="loginWithBannedDemo">
            <span class="login-demo-badge banned">账号封禁</span>
            <span class="login-demo-phone">{{ BANNED_DEMO_PHONE }}</span>
            <span class="login-demo-desc">验证码 {{ BANNED_DEMO_CODE }} · 登录后展示封禁说明与联系客服</span>
          </button>
        </div>
      </section>

      <!-- 已登录且已选角色 -->
      <template v-else>
        <section class="role-info-card">
          <div class="role-info-head">
            <div class="role-game">
              <div class="role-game-icon">
                <img v-if="gameDisplay.iconUrl" :src="gameDisplay.iconUrl" alt="" class="game-icon-img" />
                <span v-else class="game-icon-fallback">{{ gameDisplay.iconFallback }}</span>
              </div>
              <div>
                <p class="role-game-label">{{ t("rechargeGame") }}</p>
                <p class="role-game-name">{{ gameDisplay.name }}</p>
              </div>
            </div>
            <div class="role-actions">
              <label class="ip-country-control">
                <span>模拟 IP</span>
                <select v-model="simulatedIpCountryCode">
                  <option v-for="option in ipCountryOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <button class="switch-account-btn" type="button" @click="openRoleSelector">{{ t("switchRole") }}</button>
            </div>
          </div>

          <div class="role-info-body">
            <div class="role-info-row">
              <span class="role-info-label">{{ t("loginAccount") }}</span>
              <span class="role-info-value">{{ maskedAccount }}</span>
            </div>
            <div class="role-info-row">
              <span class="role-info-label">{{ t("roleServer") }}</span>
              <span class="role-info-value">{{ currentRole.server }}</span>
            </div>
            <div class="role-info-row">
              <span class="role-info-label">{{ t("roleName") }}</span>
              <span class="role-info-value">{{ currentRole.name }}</span>
            </div>
            <div class="role-info-row">
              <span class="role-info-label">{{ t("roleId") }}</span>
              <span class="role-info-value">{{ currentRole.uid || currentRole.id }}</span>
            </div>
          </div>
        </section>

        <section
          class="goods-panel"
          :class="{
            locked: mallReady && !storeUnlocked && !accountBanned,
            banned: accountBanned,
          }"
        >
          <div class="goods-header">
            <h2>{{ t("goodsList") }}</h2>
          </div>

          <div v-if="accountBanned" class="mall-banned-placeholder">
            <div class="mall-banned-icon">⛔</div>
            <p>账号已封禁，暂无法充值</p>
          </div>

          <div v-else-if="mallReady && !storeUnlocked" class="mall-locked-placeholder">
            <div class="mall-locked-icon">📦</div>
            <p>未解锁商城</p>
          </div>

          <template v-else-if="!accountBanned">
            <div
              v-if="showRechargeLimitBanner && rechargeLimit"
              class="recharge-limit-banner"
              :class="rechargeLimitBannerClass"
            >
              <p class="recharge-limit-banner-title">{{ t("limitTitle") }}</p>
              <p class="recharge-limit-banner-text">{{ rechargeLimit.notice }}</p>
              <ul v-if="rechargeLimit.canRecharge" class="recharge-limit-rules">
                <li v-if="rechargeLimit.singleMax != null">
                  {{ t("singleLimit") }}：{{ rechargeLimit.singleMax }} {{ rechargeLimit.currencyLabel }}
                </li>
                <li v-if="rechargeLimit.monthlyMax != null">
                  {{ t("monthlyLimit") }}：{{ rechargeLimit.monthlyMax }} {{ rechargeLimit.currencyLabel }}
                </li>
                <li>
                  {{ t("monthlySpent") }} {{ rechargeLimit.monthlySpent.toFixed(2) }}
                  {{ rechargeLimit.currencyLabel }}，{{ t("monthlyRemaining") }}
                  {{ rechargeLimit.monthlyRemaining?.toFixed(2) ?? "—" }}
                  {{ rechargeLimit.currencyLabel }}
                </li>
              </ul>
              <p v-else class="recharge-limit-blocked-tip">{{ rechargeLimit.blockReason }}</p>
              <p class="recharge-limit-contact">{{ t("contactChange") }}</p>
            </div>

            <div class="goods-tabs">
              <button
                v-for="tab in tabOptions"
                :key="tab.value"
                type="button"
                :class="['tab-btn', { active: activeCategory === tab.value }]"
                @click="activeCategory = tab.value"
              >
                {{ tab.label }}
              </button>
            </div>

            <p v-if="mallLoading" class="mall-loading">正在同步游戏内商城数据…</p>

            <div v-else class="goods-grid">
              <article
                v-for="product in displayProducts"
                :key="product.id"
                class="goods-card"
                :class="{
                  'is-sold-out': product.soldOut,
                  'is-age-limited': product.ageLimitBlocked,
                }"
              >
                <span v-if="product.promoTag" class="goods-promo-tag">{{ product.promoTag }}</span>
                <span v-if="product.timeLimit" class="goods-time-limit">{{ product.timeLimit }}</span>

                <div class="goods-icon-area">
                  <div class="goods-image">
                    <img
                      v-if="product.imageUrl"
                      :src="product.imageUrl"
                      :alt="product.displayName"
                      class="goods-image-img"
                    />
                    <span v-else>{{ product.image }}</span>
                  </div>
                  <div
                    v-if="product.soldOut && product.unavailableReason"
                    class="goods-unavailable-banner"
                    :class="{ 'is-age-limit': product.ageLimitBlocked }"
                  >
                    {{ product.unavailableReason }}
                  </div>
                </div>

                <div class="goods-meta">
                  <p v-if="product.limitInfo" class="goods-limit-info">{{ product.limitInfo }}</p>
                  <p class="goods-display-name">{{ product.displayName }}</p>
                </div>

                <button
                  class="goods-price-bar"
                  type="button"
                  :disabled="creating || product.soldOut"
                  @click="handleBuy(product.id)"
                >
                  <span v-if="product.soldOut" class="price-sold-out">{{ t("unavailable") }}</span>
                  <template v-else>
                    <span class="price-current">{{ formatMoney(product.price, product.currency) }}</span>
                    <span v-if="product.originalPrice" class="price-original">
                      （{{ formatMoney(product.originalPrice, product.currency) }}）
                    </span>
                  </template>
                </button>
              </article>
            </div>
          </template>

          <div
            v-if="mallReady && !storeUnlocked && !accountBanned && showStoreLockedModal"
            class="store-locked-mask"
            @click.self="closeStoreLockedModal"
          >
            <section class="store-locked-modal">
              <p class="store-locked-text">商店未解锁，请前往游戏打开</p>
              <button class="store-locked-confirm" type="button" @click="closeStoreLockedModal">
                确认
              </button>
            </section>
          </div>

        </section>
      </template>

      <div v-if="accountBanned && showBannedModal" class="ban-modal-mask">
        <section class="ban-modal">
          <h4 class="ban-modal-title">账号已封禁</h4>
          <p class="ban-modal-reason">{{ banReason }}</p>
          <p v-if="banBannedAt" class="ban-modal-meta">封禁时间：{{ banBannedAt }}</p>
          <div class="ban-modal-actions">
            <button class="ban-modal-cs" type="button" @click="contactSupportFromBan">
              联系客服
            </button>
            <button class="ban-modal-confirm" type="button" @click="closeBannedModal">我知道了</button>
          </div>
        </section>
      </div>

      <p v-if="resultMessage" class="message">{{ resultMessage }}</p>
    </main>

    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <img
            v-if="footerConfig.publisherLogoUrl"
            :src="footerConfig.publisherLogoUrl"
            alt="发行主体"
            class="footer-publisher-logo"
          />
          <div v-else class="brand-mark">LE</div>
          <div>
            <p class="brand-name">GRYPHLINE</p>
            <p class="brand-en">GLOBAL PUBLISHING</p>
          </div>
        </div>
        <div class="footer-meta">
          <p class="footer-links">
            <template v-for="(link, index) in footerLinkList" :key="link.label">
              <button type="button" class="footer-link-btn" @click="openFooterLink(link.url)">
                {{ link.label }}
              </button>
              <span v-if="index < footerLinkList.length - 1" class="footer-divider">|</span>
            </template>
          </p>
          <p v-if="currentLocale === 'ja'" class="footer-ratings">※ 本遊戲內容涉性（僅部分角色穿著凸顯性特徵服飾）及暴力（但可愛人物打鬥或未描述角色傷亡細節之攻擊等而無血腥畫面），依遊戲軟體分級管理辦法分級為輔12級，十二歲以上之人始得使用。</p>
          <p v-if="currentLocale === 'ja'" class="footer-ratings">※ 本遊戲為免費遊戲，但遊戲內另提供購買虛擬遊戲幣、物品等付費服務，請依個人興趣及能力進行適度消費。</p>
          <p v-if="currentLocale === 'ja'" class="footer-ratings">※ 請注意遊戲時間，避免沉迷，長時間進行遊戲，容易影響作息，宜適度休息及運動。</p>
          <p v-if="currentLocale === 'ja'" class="footer-ratings">※ 本遊戲由艾瑞爾網路股份有限公司代理，如有疑問，請以本遊戲客服管道聯繫。</p>
          <p v-if="localizedFooterConfig.copyrightText">{{ localizedFooterConfig.copyrightText }}</p>
          <p v-if="localizedFooterConfig.contactText">{{ localizedFooterConfig.contactText }}</p>
          <p v-if="localizedFooterConfig.icpText">{{ localizedFooterConfig.icpText }}</p>
          <p class="footer-disclaimer">
            {{ localizedFooterConfig.footerDisclaimer || t("footerDisclaimer") }}
          </p>
        </div>
      </div>
    </footer>

    <!-- 充值说明 -->
    <div v-if="showRechargeTips" class="modal-mask" @click.self="showRechargeTips = false">
      <section class="modal-card">
        <button class="modal-close" type="button" @click="showRechargeTips = false">×</button>
        <h3>{{ t("rechargeTips") }}</h3>
        <div
          v-if="rechargeTipsConfig.contentHtml"
          class="recharge-tips-html"
          v-html="rechargeTipsConfig.contentHtml"
        />
        <div class="modal-footer">
          <button class="modal-confirm" type="button" @click="showRechargeTips = false">{{ t("gotIt") }}</button>
        </div>
      </section>
    </div>

    <!-- 登录弹框 -->
    <div v-if="showLoginModal" class="modal-mask login-mask" @click.self="closeLogin">
      <section class="login-modal">
        <button class="modal-close" type="button" @click="closeLogin">×</button>
        <h3>{{ t("login") }}</h3>

        <div class="login-brand">
          <p class="login-brand-name">GRYPHLINE</p>
          <p class="login-brand-slogan">GLOBAL PUBLISHING</p>
        </div>

        <div class="login-tabs">
          <button
            type="button"
            :class="['login-tab', { active: loginMode === 'sms' }]"
            @click="switchLoginMode('sms')"
          >
            短信登录
          </button>
          <button
            type="button"
            :class="['login-tab', { active: loginMode === 'password' }]"
            @click="switchLoginMode('password')"
          >
            密码登录
          </button>
        </div>

        <div v-if="loginMode === 'sms'" class="login-form">
          <div class="phone-row">
            <span class="prefix">+86</span>
            <input v-model="loginPhone" type="tel" maxlength="11" placeholder="请输入手机号" />
          </div>
          <div class="code-row">
            <input v-model="loginSmsCode" type="text" maxlength="6" placeholder="请输入验证码" />
            <button class="code-btn" type="button" :disabled="!canSendSms" @click="sendSmsCode">
              {{ smsCountdown > 0 ? `${smsCountdown}s` : "获取验证码" }}
            </button>
          </div>
        </div>

        <div v-else class="login-form">
          <div class="phone-row">
            <span class="prefix">+86</span>
            <input v-model="loginPhone" type="tel" maxlength="11" placeholder="请输入手机号" />
          </div>
          <div class="phone-row single">
            <input v-model="loginPassword" type="password" placeholder="请输入密码" />
          </div>
        </div>

        <label class="agree-row">
          <input v-model="loginAgreed" type="checkbox" />
          <span>
            已阅读并同意
            <a href="javascript:void(0)">《GRYPHLINE 用户协议》</a>
            <a href="javascript:void(0)">《GRYPHLINE 隐私政策》</a>
            ，未注册的手机号验证通过将自动注册
          </span>
        </label>

        <button class="login-submit-btn" type="button" :disabled="!canSubmitLogin" @click="submitLogin">
          {{ loginMode === "sms" ? "登录" : "登录" }}
        </button>

        <div class="login-demo-inline">
          <p class="login-demo-inline-title">演示账号</p>
          <button class="login-demo-chip locked" type="button" @click="fillLockedDemoAccount">
            未解锁 {{ LOCKED_DEMO_PHONE }}
          </button>
          <button class="login-demo-chip" type="button" @click="fillUnlockedDemoAccount">
            已解锁 {{ UNLOCKED_DEMO_PHONE }}
          </button>
          <button class="login-demo-chip banned" type="button" @click="fillBannedDemoAccount">
            封禁 {{ BANNED_DEMO_PHONE }}
          </button>
          <button class="login-demo-chip age-blocked" type="button" @click="fillRegionDemoAccount(REGION_DEMO_US_CHILD)">
            美国&lt;13 {{ REGION_DEMO_US_CHILD }}
          </button>
          <button class="login-demo-chip age-limited" type="button" @click="fillRegionDemoAccount(REGION_DEMO_JP_TEEN)">
            日本&lt;16 {{ REGION_DEMO_JP_TEEN }}
          </button>
          <button class="login-demo-chip age-limited" type="button" @click="fillRegionDemoAccount(REGION_DEMO_JP_16_TO_20)">
            日本16-20 {{ REGION_DEMO_JP_16_TO_20 }}
          </button>
          <button class="login-demo-chip age-limited" type="button" @click="fillRegionDemoAccount(REGION_DEMO_US_TEEN)">
            美国13-16 {{ REGION_DEMO_US_TEEN }}
          </button>
          <button class="login-demo-chip" type="button" @click="fillRegionDemoAccount(REGION_DEMO_CA_DEFAULT)">
            加拿大默认价 {{ REGION_DEMO_CA_DEFAULT }}
          </button>
          <button class="login-demo-chip age-limited" type="button" @click="fillRegionDemoAccount(REGION_DEMO_RU_LOCKED_PRICE)">
            俄罗斯RUB {{ REGION_DEMO_RU_LOCKED_PRICE }}
          </button>
        </div>

        <div class="login-footer-links">
          <button
            v-if="loginMode === 'sms'"
            type="button"
            class="link-btn"
            @click="switchLoginMode('password')"
          >
            账号密码登录
          </button>
          <button v-else type="button" class="link-btn" @click="switchLoginMode('sms')">短信验证码登录</button>
          <button type="button" class="link-btn">遇到问题</button>
        </div>
      </section>
    </div>

    <!-- 角色选择 -->
    <div v-if="showRoleSelector" class="modal-mask role-select-mask">
      <section class="role-select-modal">
        <button class="modal-close role-select-close" type="button" @click="showRoleSelector = false">
          ×
        </button>
        <header class="role-select-head">
          <h3>{{ t("selectRole") }}</h3>
        </header>
        <div class="role-select-game-mark">
          <div class="role-select-game-title">{{ gameDisplay.name }}</div>
        </div>
        <div class="role-select-list">
          <label
            v-for="role in roleList"
            :key="role.id"
            class="role-select-option"
            :class="{ active: draftSelectedRole === role.id, disabled: role.empty }"
          >
            <input
              v-model="draftSelectedRole"
              type="radio"
              :value="role.id"
              :disabled="role.empty"
            />
            <span class="role-select-main">
              <span class="role-select-name">{{ role.empty ? t("noRoleServer") : role.name }}</span>
              <span class="role-select-meta">
                {{ t("server") }}：{{ role.server }}
                <template v-if="!role.empty"> ｜ UID: {{ role.uid }}</template>
              </span>
            </span>
          </label>
        </div>
        <button
          class="role-select-confirm"
          type="button"
          :disabled="!draftSelectedRole"
          @click="confirmRoleSelection"
        >
          {{ t("confirm") }}
        </button>
      </section>
    </div>

    <!-- 商品详情 -->
    <div v-if="showProductDetail" class="modal-mask" @click.self="closeProductDetail">
      <section class="modal-card product-detail">
        <button class="modal-close" type="button" @click="closeProductDetail">×</button>
        <h3>{{ t("productDetail") }}</h3>
        <div class="detail-account">
          <p class="detail-game">{{ gameDisplay.name }}</p>
          <p>{{ t("account") }}：{{ maskedAccount }}</p>
          <p>区服：{{ currentRole.server }} ｜ 角色：{{ currentRole.name }}（{{ currentRole.uid || currentRole.id }}）</p>
        </div>
        <div v-if="selectedProduct" class="product-body">
          <div class="product-icon">
            <img
              v-if="selectedProduct.imageUrl"
              :src="selectedProduct.imageUrl"
              :alt="selectedProduct.displayName"
              class="product-icon-img"
            />
            <span v-else>{{ selectedProduct.image }}</span>
          </div>
          <div class="product-main">
            <div class="product-name-row">
              <p class="product-name">{{ selectedProduct.displayName || selectedProduct.name }}</p>
              <span v-if="selectedProduct.promoTag" class="product-detail-badge">
                {{ selectedProduct.promoTag }}
              </span>
            </div>
            <p v-if="selectedProduct.promoText" class="product-promo-text">
              {{ selectedProduct.promoText }}
            </p>
            <p class="product-price">{{ formatMoney(selectedProduct.price, selectedProduct.currency) }}</p>
          </div>
          <div class="product-qty">
            <div class="qty-stepper">
              <button
                type="button"
                class="qty-btn qty-minus"
                :disabled="!canDecreaseQty"
                aria-label="减少数量"
                @click="decreaseQty"
              >
                −
              </button>
              <input
                v-model.number="purchaseQty"
                class="qty-value"
                type="number"
                inputmode="numeric"
                pattern="[0-9]*"
                min="1"
                :max="maxPurchaseQty"
                aria-label="购买数量"
                @input="handlePurchaseQtyInput"
                @blur="setPurchaseQty(purchaseQty)"
                @change="setPurchaseQty(purchaseQty)"
              />
              <button
                type="button"
                class="qty-btn qty-plus"
                :disabled="!canIncreaseQty"
                aria-label="增加数量"
                @click="increaseQty"
              >
                +
              </button>
            </div>
          <p class="qty-limit-hint">{{ detailLimitHint }}</p>
            <p v-if="detailAgeBlockReason" class="qty-age-limit-hint">{{ detailAgeBlockReason }}</p>
          </div>
        </div>
        <div class="detail-note">
          <p>商品说明</p>
          <ul>
            <li>购买后，进入游戏即可获得对应道具。</li>
            <li>如因特殊情况导致重复购买达到上限，将无法获得道具，系统会按规则返还资源。</li>
          </ul>
        </div>
        <div class="detail-footer">
          <p class="total">
            合计：<span>{{ cashierAmountLabel }}</span>
          </p>
          <button
            class="pay-now-btn"
            type="button"
            :disabled="creating || !canPayInDetail"
            @click="payNow"
          >
            {{ canPayInDetail ? t("payNow") : t("cannotRecharge") }}
          </button>
        </div>
      </section>
    </div>

    <!-- 充值限额提示 -->
    <div v-if="showAgeLimitModal" class="modal-mask" @click.self="closeAgeLimitModal">
      <section class="modal-card age-limit-modal">
        <h3>{{ t("restriction") }}</h3>
        <p class="modal-text">{{ ageLimitModalMessage }}</p>
        <p v-if="rechargeLimit?.notice" class="modal-text muted">{{ rechargeLimit.notice }}</p>
        <div class="modal-footer">
          <button class="modal-confirm" type="button" @click="closeAgeLimitModal">{{ t("gotIt") }}</button>
        </div>
      </section>
    </div>

    <!-- 收银台：PC 扫码 / H5 拉起 App -->
    <div
      v-if="showCashier"
      class="modal-mask cashier-mask"
      :class="isMobileH5 ? 'cashier-mask--h5' : 'cashier-mask--pc'"
      @click.self="requestCloseCashier"
    >
      <section ref="cashierCardRef" class="cashier-card cashier-card--pc">
        <button class="modal-close" type="button" @click="requestCloseCashier">×</button>

        <div class="cashier-pc">
          <div class="cashier-layout">
            <div class="cashier-side cashier-side--methods">
              <div class="cashier-side-head">
                <h3>{{ t("cashierTitle") }}</h3>
                <p class="cashier-security">
                  <span class="cashier-security-icon">✓</span>
                  {{ t("cashierSecurity") }}
                </p>
              </div>
              <p class="cashier-method-title">{{ t("choosePayMethod") }}</p>
              <div class="cashier-method-list">
                <button
                  v-for="method in pcPaymentMethods"
                  :key="method.id"
                  type="button"
                  class="cashier-method-item"
                  :class="{ active: pcPaymentMethod === method.id }"
                  @click="selectPcPaymentMethod(method.id)"
                >
                  <span class="cashier-method-radio" aria-hidden="true"></span>
                  <span class="cashier-method-copy">
                    <span class="cashier-method-name">{{ method.label }}</span>
                    <span class="cashier-method-note">{{ method.note }}</span>
                  </span>
                  <span class="cashier-method-badge" aria-hidden="true">{{ method.badge }}</span>
                </button>
              </div>
              <label v-if="selectedPcPaymentMethod.id === 'paypal'" class="cashier-paypal-save">
                <input v-model="savePayPalAccount" type="checkbox" />
                <span>{{ t("cashierPaypalSave") }}</span>
              </label>
            </div>

            <div class="cashier-side cashier-side--summary">
              <div class="cashier-order-head">
                <p class="cashier-order-title">{{ t("cashierOrderTitle") }}</p>
                <p v-if="selectedProduct" class="cashier-order-name">{{ selectedProduct.name }}</p>
                <p class="cashier-order-method">{{ selectedPcPaymentMethod.label }}</p>
              </div>

              <div class="cashier-order-row">
                <span>{{ t("cashierItemPrice") }}</span>
                <strong>{{ cashierAmountLabel }}</strong>
              </div>

              <div class="cashier-order-divider" />

              <div class="cashier-total-row">
                <span>{{ t("cashierTotal") }}</span>
                <strong>{{ cashierAmountLabel }}</strong>
              </div>

              <p class="cashier-agreement">{{ t("cashierAgreement") }} {{ t("userAgreement") }}</p>

              <button class="cashier-pay-btn" type="button" :disabled="creating || !selectedProduct" @click="openPcPayConfirm">
                {{ t("cashierPayNow") }} {{ cashierAmountLabel }} →
              </button>
            </div>
          </div>
        </div>

        <!-- 收银台关闭挽留 -->
        <div v-if="showCashierRetain" class="cashier-retain-mask" @click.self="cancelCashierRetain">
          <section class="cashier-retain-card" :class="{ 'is-paypal': isWaitingCheckout }">
            <button class="modal-close cashier-retain-close" type="button" @click="cancelCashierRetain">×</button>
            <h4>{{ isWaitingCheckout ? t("payWaitingTitle") : "确定要离开收银台吗？" }}</h4>
            <p class="cashier-retain-desc">
              {{
                isWaitingCheckout
                  ? t("payWaitingDesc")
                  : showPayLanding || hasLaunchedPayApp
                    ? "支付尚未完成，离开后需重新选择支付方式。"
                    : "订单尚未完成支付，离开后需重新发起支付。"
              }}
            </p>
            <div class="cashier-retain-actions">
              <button class="cashier-retain-leave" type="button" @click="isWaitingCheckout ? cancelCashierRetain() : confirmCashierRetainLeave()">
                {{ isWaitingCheckout ? t("payCancel") : "确认离开" }}
              </button>
              <button
                class="cashier-retain-stay"
                type="button"
                @click="isWaitingCheckout ? confirmPayWaitingPaid() : cancelCashierRetain()"
              >
                {{ isWaitingCheckout ? t("payIHavePaid") : "继续支付" }}
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>

    <!-- PayPal 支付页 -->
    <div v-if="showPaypalPage" class="paypal-page-mask">
      <section class="paypal-page">
        <button class="modal-close paypal-page-close" type="button" @click="requestCloseCashier">×</button>
        <div class="paypal-page-brand">
          <span class="paypal-page-logo">PayPal</span>
          <span class="paypal-page-sub">Checkout</span>
        </div>
        <p class="paypal-page-title">{{ t("cashierOrderTitle") }}</p>
        <div class="paypal-page-info">
          <p class="paypal-page-product">{{ selectedProduct?.name }}</p>
          <p class="paypal-page-amount">{{ cashierAmountLabel }}</p>
        </div>
        <p v-if="savePayPalAccount" class="paypal-page-save">
          {{ t("cashierPaypalSave") }}
        </p>
        <div class="paypal-page-actions">
          <button class="paypal-page-back" type="button" @click="requestCloseCashier">
            返回商城
          </button>
          <button class="paypal-page-paid" type="button" :disabled="creating" @click="completePaypalPayment">
            我已完成支付
          </button>
        </div>
      </section>
    </div>

    <div v-if="showKonbiniPage" class="konbini-page-mask">
      <section class="konbini-page">
        <button class="modal-close konbini-page-close" type="button" @click="requestCloseCashier">×</button>
        <div class="konbini-page-layout">
          <div class="konbini-page-summary">
            <div class="konbini-page-summary-head">
              <p class="konbini-page-summary-title">支払総額</p>
              <p class="konbini-page-summary-amount">¥ {{ detailTotalAmount.toFixed(2) }}</p>
            </div>
            <p class="konbini-page-product">{{ selectedProduct?.name }}</p>
            <div class="konbini-page-meta">
              <div>
                <span>注文番号</span>
                <strong>{{ payOrderNo }}</strong>
              </div>
              <div>
                <span>支払期限</span>
                <strong>{{ konbiniExpireAt }}</strong>
              </div>
            </div>
            <button class="konbini-page-download" type="button" @click="openPayToast('支払い票をダウンロードしました。', { duration: 1800 })">
              ダウンロード
            </button>
          </div>

          <div class="konbini-page-detail">
            <div class="konbini-page-brand">
              <span class="konbini-page-brand-text">Konbini</span>
              <span class="konbini-page-brand-sub">Checkout</span>
            </div>
            <p class="konbini-page-note">
              このコードは、ローソン、セイコーマート、ファミリーマート、ミニストップでご利用いただけます。
            </p>

            <div class="konbini-page-code">
              <p class="konbini-page-code-label">支払いコード</p>
              <p class="konbini-page-code-value">{{ payOrderNo }}</p>
              <p class="konbini-page-code-expire">有効期限: {{ konbiniExpireAt }}</p>
            </div>

            <div class="konbini-page-stores">
              <div class="konbini-store-item">LAWSON</div>
              <div class="konbini-store-item">FamilyMart</div>
              <div class="konbini-store-item">Seicomart</div>
              <div class="konbini-store-item">MINISTOP</div>
            </div>

            <div class="konbini-page-actions">
              <button class="konbini-page-back" type="button" @click="requestCloseCashier">返回商城</button>
              <button class="konbini-page-paid" type="button" :disabled="creating" @click="completeKonbiniPayment">
                我已完成支付
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="showKonbiniReturnConfirm" class="konbini-return-mask" @click.self="cancelKonbiniReturnConfirm">
      <section class="konbini-return-card">
        <button class="modal-close konbini-return-close" type="button" @click="cancelKonbiniReturnConfirm">×</button>
        <div class="konbini-return-icon" aria-hidden="true">?</div>
        <h4>{{ t("konbiniReturnTitle") }}</h4>
        <p class="konbini-return-desc">{{ t("konbiniReturnDesc") }}</p>
        <button class="konbini-return-confirm" type="button" @click="confirmKonbiniReturnConfirm">
          {{ t("konbiniReturnConfirm") }}
        </button>
      </section>
    </div>

    <div v-if="showPayToast" class="pay-toast">
      <span v-if="payToastLoading" class="pay-toast-spinner" aria-hidden="true"></span>
      <span class="pay-toast-text">{{ payToastMessage }}</span>
    </div>

    <!-- H5 支付渠道落地页（全屏） -->
    <div v-if="showPayLanding && isMobileH5" class="pay-landing-page" :class="`is-${payChannel}`">
      <header class="pay-landing-header">
        <button type="button" class="pay-landing-back" aria-label="返回" @click="closePayLandingToCashier">
          ‹
        </button>
        <div class="pay-landing-brand">
          <span v-if="payChannel === 'alipay'" class="pay-landing-logo alipay">支</span>
          <span v-else class="pay-landing-logo wechat">微</span>
        </div>
        <span class="pay-landing-more">⋯</span>
      </header>

      <main class="pay-landing-main">
        <p class="pay-landing-product">{{ selectedProduct?.name }}</p>
        <p class="pay-landing-amount">{{ cashierAmountLabel }}</p>
        <p v-if="payChannel === 'alipay'" class="pay-landing-promo">🧧 首单随机立减，先到先得</p>

        <button class="pay-landing-open-app" type="button" @click="launchFromLanding">
          打开{{ payChannel === "wechat" ? "微信" : "支付宝" }}APP付款
        </button>
        <button class="pay-landing-download" type="button">
          下载{{ payChannel === "wechat" ? "微信" : "支付宝" }}APP付款
        </button>
        <button class="pay-landing-return" type="button" :disabled="creating" @click="returnFromLandingPaidLink">
          {{ creating ? "查询中…" : "已支付完成返回查看订单" }}
        </button>

        <div class="pay-landing-mock">
          <p class="cashier-mock-title">前端模拟</p>
          <button type="button" class="cashier-mock-btn" :disabled="creating" @click="mockTriggerPayResultConfirm(payChannel)">
            截图2 · 支付结果确认
          </button>
          <button type="button" class="cashier-mock-btn" :disabled="creating" @click="mockTriggerPayNoResult(payChannel)">
            截图3 · 未查询到结果
          </button>
        </div>
      </main>
    </div>

    <!-- 支付结果确认（H5 从 App 返回且未查到已支付） -->
    <div v-if="showPayResultConfirm && isMobileH5" class="pay-query-mask">
      <section class="pay-query-card">
        <h4>支付结果确认</h4>
        <p class="pay-query-desc">请根据您在{{ payChannelLabel() }}中的实际支付情况选择。</p>
        <div class="pay-query-actions">
          <button class="pay-query-btn fail" type="button" :disabled="creating" @click="confirmUnpaid">
            未支付
          </button>
          <button class="pay-query-btn success" type="button" :disabled="creating" @click="confirmPaid">
            {{ creating ? "查询中…" : "已支付" }}
          </button>
        </div>
      </section>
    </div>

    <!-- 未查询到支付结果 -->
    <div v-if="showPayNoResult" class="pay-query-mask">
      <section class="pay-no-result-card">
        <div class="pay-no-result-icon" aria-hidden="true">!</div>
        <h4>未查询到结果</h4>
        <p class="pay-no-result-desc">若已完成支付，稍候请在游戏内查收</p>
        <button class="pay-no-result-btn" type="button" @click="closePayNoResult">{{ t("confirm") }}</button>
      </section>
    </div>

    <!-- 支付结果页 -->
    <div v-if="showPayResultPage" class="pay-result-mask">
      <section class="pay-result-card" :class="`is-${payResultStatus}`">
        <div class="pay-result-icon" aria-hidden="true">
          {{ payResultStatus === "success" ? "✓" : "!" }}
        </div>
        <h3 class="pay-result-title">
          {{ payResultStatus === "success" ? "支付成功" : "支付失败" }}
        </h3>
        <p class="pay-result-subtitle">
          {{
            payResultStatus === "success"
              ? "支付已完成，道具将发放至游戏内，请稍后登录游戏查收。"
              : payResultFailMessage
          }}
        </p>

        <div class="pay-result-detail">
          <div v-if="selectedProduct" class="pay-result-row">
            <span class="label">商品名称</span>
            <span class="value">{{ selectedProduct.name }}</span>
          </div>
          <div class="pay-result-row">
            <span class="label">支付金额</span>
            <span class="value amount">{{ formatMoney(payResultAmount, payResultCurrency) }}</span>
          </div>
          <div class="pay-result-row">
            <span class="label">支付方式</span>
            <span class="value">{{ payChannelLabel() }}</span>
          </div>
          <div v-if="payResultStatus === 'success'" class="pay-result-row">
            <span class="label">订单号</span>
            <span class="value">{{ payResultOrderId }}</span>
          </div>
        </div>

        <div class="pay-result-actions">
          <button
            v-if="payResultStatus === 'fail'"
            class="pay-result-btn ghost"
            type="button"
            @click="retryPayment"
          >
            重新支付
          </button>
          <button class="pay-result-btn primary" type="button" @click="closePayResultPage">
            返回商城
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
