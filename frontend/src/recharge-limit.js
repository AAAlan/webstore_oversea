export const REGION_DEMO_JP_ADULT = "15200000001";
export const REGION_DEMO_JP_TEEN = "15200000005";
export const REGION_DEMO_JP_16_TO_20 = "15200000007";
export const REGION_DEMO_US_TEEN = "15200000006";
export const REGION_DEMO_US_CHILD = "15200000004";
export const REGION_DEMO_CODE = "1234";

const DEMO_ACCOUNT_PROFILES = {
  [REGION_DEMO_JP_ADULT]: { age: 25, country: "JP" },
  [REGION_DEMO_JP_TEEN]: { age: 15, country: "JP" },
  [REGION_DEMO_JP_16_TO_20]: { age: 17, country: "JP" },
  [REGION_DEMO_US_TEEN]: { age: 14, country: "US", parentalVerified: false },
  [REGION_DEMO_US_CHILD]: { age: 12, country: "US", parentalVerified: false },
  "15200000002": { age: 22, country: "JP" },
  "15200000003": { age: 22, country: "US" },
};

const DEMO_MONTHLY_SPENT = {
  [REGION_DEMO_JP_TEEN]: 4800,
  [REGION_DEMO_JP_16_TO_20]: 20000,
  [REGION_DEMO_US_TEEN]: 80,
};

const COUNTRY_LABELS = {
  JP: "日本",
  US: "美国",
};

function buildPolicy(profile) {
  const country = profile.country ?? "US";
  const age = profile.age ?? 25;

  if (country === "JP") {
    if (age < 16) {
      return {
        region: "JP",
        regionLabel: COUNTRY_LABELS.JP,
        ageTier: "jp-under16",
        ageTierLabel: "未满16周岁",
        canRecharge: true,
        singleMax: null,
        monthlyMax: 5000,
        currency: "JPY",
        currencyLabel: "日元",
        summary: "月累计充值不超过 5,000 日元",
        blockReason: null,
        parentalVerificationRequired: false,
      };
    }
    if (age < 20) {
      return {
        region: "JP",
        regionLabel: COUNTRY_LABELS.JP,
        ageTier: "jp-16to20",
        ageTierLabel: "16-20周岁",
        canRecharge: true,
        singleMax: null,
        monthlyMax: 20000,
        currency: "JPY",
        currencyLabel: "日元",
        summary: "月累计充值不超过 20,000 日元",
        blockReason: null,
        parentalVerificationRequired: false,
      };
    }
  }

  if (country === "US") {
    if (age < 13) {
      const verified = Boolean(profile.parentalVerified);
      return {
        region: "US",
        regionLabel: COUNTRY_LABELS.US,
        ageTier: "us-under13",
        ageTierLabel: "未满13周岁",
        canRecharge: verified,
        singleMax: null,
        monthlyMax: null,
        currency: "USD",
        currencyLabel: "美元",
        summary: verified ? "已完成家长管控验证，支付无限额" : "需经家长管控验证后开启支付功能",
        blockReason: verified ? null : "美国注册地未满13周岁的用户需经家长管控验证后开启支付功能",
        parentalVerificationRequired: !verified,
      };
    }
    if (age < 16) {
      const verified = Boolean(profile.parentalVerified);
      return {
        region: "US",
        regionLabel: COUNTRY_LABELS.US,
        ageTier: "us-13to16",
        ageTierLabel: "13-16周岁",
        canRecharge: verified,
        singleMax: null,
        monthlyMax: null,
        currency: "USD",
        currencyLabel: "美元",
        summary: verified ? "已完成家长管控验证，支付无限额" : "支付前需经家长管控验证后开启支付功能",
        blockReason: verified ? null : "美国注册地 13-16 周岁的用户需经家长管控验证后开启支付功能",
        parentalVerificationRequired: !verified,
      };
    }
  }

  return {
    region: country,
    regionLabel: COUNTRY_LABELS[country] ?? "美国",
    ageTier: "adult",
    ageTierLabel: "已满18周岁",
    canRecharge: true,
    singleMax: null,
    monthlyMax: null,
    currency: country === "JP" ? "JPY" : "USD",
    currencyLabel: country === "JP" ? "日元" : "美元",
    summary: "无充值限额",
    blockReason: null,
    parentalVerificationRequired: false,
  };
}

function formatAmount(amount, currencyLabel) {
  if (amount == null) return "不限";
  return `${amount.toFixed(2)} ${currencyLabel}`;
}

function buildNotice(profile, policy, monthlySpent, monthlyRemaining) {
  const prefix = `账户注册地为${policy.regionLabel}（按注册时 IP 判断）。`;
  if (!policy.canRecharge) {
    return `${prefix}${policy.blockReason}。每次点击充值将跳转至验证通知；如注册地或用户信息有误，请联系客服修改。`;
  }
  if (policy.singleMax == null && policy.monthlyMax == null) {
    return `${prefix}${policy.summary}。同一游戏账号体系下，全平台统一统计累计充值金额；不同区服角色共用支付限额。如注册地或用户信息有误，请联系客服修改。`;
  }
  return [
    prefix,
    `用户年龄为 ${profile.age} 岁（${policy.ageTierLabel}），${policy.summary}。`,
    `本月已充值 ${formatAmount(monthlySpent, policy.currencyLabel)}，剩余可用额度 ${formatAmount(
      monthlyRemaining,
      policy.currencyLabel,
    )}。`,
    "如注册地或用户信息有误，请联系客服修改。",
  ].join("");
}

export function buildLocalRechargeLimit(accountId) {
  const id = accountId?.trim();
  const profile = DEMO_ACCOUNT_PROFILES[id] ?? { age: 25, country: "US" };
  const policy = buildPolicy(profile);
  const monthlySpent = DEMO_MONTHLY_SPENT[id] ?? 0;
  const monthlyRemaining =
    policy.monthlyMax == null
      ? null
      : Math.max(Number((policy.monthlyMax - monthlySpent).toFixed(2)), 0);

  return {
    age: profile.age,
    country: policy.region,
    countryLabel: policy.regionLabel,
    ...policy,
    isLimited: policy.singleMax != null || policy.monthlyMax != null || !policy.canRecharge,
    monthlySpent: Number(monthlySpent.toFixed(2)),
    monthlyRemaining,
    notice: buildNotice(profile, policy, monthlySpent, monthlyRemaining),
  };
}

export function getProductAgeLimitReason(limit, unitPrice, quantity = 1) {
  if (!limit) {
    return null;
  }
  const amount = Number((unitPrice * quantity).toFixed(2));
  const currencyLabel = limit.currencyLabel ?? "";
  if (!limit.canRecharge) {
    return limit.blockReason ?? "当前账号无法充值";
  }
  if (limit.singleMax != null && amount > limit.singleMax) {
    return `单次支付不能超过 ${limit.singleMax} ${currencyLabel}`;
  }
  if (limit.monthlyRemaining != null && amount > limit.monthlyRemaining) {
    return `已超出每月 ${limit.monthlyMax.toFixed(2)} ${currencyLabel}充值限额，无法支付（本月剩余额度 ${limit.monthlyRemaining.toFixed(2)} ${currencyLabel}）`;
  }
  return null;
}

export function applyAgeLimitToProduct(product, limit) {
  const ageLimitReason = getProductAgeLimitReason(limit, product.price, 1);
  if (!ageLimitReason) {
    return product;
  }
  return {
    ...product,
    ageLimitBlocked: true,
    ageLimitReason,
    unavailableReason: ageLimitReason,
    soldOut: true,
  };
}
