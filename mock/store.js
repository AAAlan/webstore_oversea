import {
  BANNED_DEMO_ACCOUNT,
  CONSUMER_MALL_CONFIG,
  CONSUMER_PRODUCT_CATEGORIES,
  CONSUMER_PRODUCTS,
  DEFAULT_MALL_CONFIG,
  DEFAULT_GAME_DELIVERY_CONFIG,
  INITIAL_BAN_RECORDS,
  INITIAL_MONTHLY_SPENT,
  INITIAL_PRODUCT_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_PURCHASE_COUNTS,
  INITIAL_ROLES,
  LOCKED_DEMO_ACCOUNT,
  MOCK_GAME_GOODS_CATALOG,
  STORAGE_KEY,
} from "./data.js";
import { badRequest, forbidden } from "./errors.js";
import {
  buildRechargeLimitView,
  getProductAgeLimitReason,
  validateRechargeAmount,
} from "./recharge-limit.js";
import {
  buildPeriodBucket,
  buildPublishMeta,
  computeRemainingDays,
  deepClone,
  formatRemainingDaysLabel,
  formatRemainingTimeLabel,
  normalizeMallConfig,
} from "./utils.js";
import { DEFAULT_LANGUAGE_OPTIONS } from "../shared/language-presets.js";

function normalizeGameDeliveryConfig(input = {}, fallback = DEFAULT_GAME_DELIVERY_CONFIG) {
  const source = input ?? {};
  const normalizeWhitelist = (items) =>
    (Array.isArray(items) ? items : []).map((item, index) => ({
      id: typeof item.id === "string" ? item.id : `wl-${Date.now()}-${index}`,
      pattern:
        typeof item.pattern === "string"
          ? item.pattern.trim()
          : typeof item.value === "string"
            ? item.value.trim()
            : "",
      note: typeof item.note === "string" ? item.note.trim() : "",
    }));
  const normalizeForwardRules = (items) =>
    (Array.isArray(items) ? items : []).map((item, index) => ({
      id: typeof item.id === "string" ? item.id : `fw-${Date.now()}-${index}`,
      url: typeof item.url === "string" ? item.url.trim() : "",
      notifyId: typeof item.notifyId === "string" ? item.notifyId.trim() : "",
      userIds: Array.isArray(item.userIds)
        ? item.userIds.map((value) => String(value).trim()).filter(Boolean)
        : typeof item.userIds === "string"
          ? item.userIds
              .split(/[,\n]/)
              .map((value) => value.trim())
              .filter(Boolean)
          : [],
    }));

  return {
    gameId:
      typeof source.gameId === "string" && source.gameId.trim()
        ? source.gameId.trim()
        : fallback.gameId,
    creditUrl:
      typeof source.creditUrl === "string" && source.creditUrl.trim()
        ? source.creditUrl.trim()
        : fallback.creditUrl,
    secretKey:
      typeof source.secretKey === "string" && source.secretKey.trim()
        ? source.secretKey.trim()
        : fallback.secretKey,
    whitelist: normalizeWhitelist(source.whitelist ?? fallback.whitelist),
    forwardRules: normalizeForwardRules(source.forwardRules ?? fallback.forwardRules),
  };
}

function sanitizeLegacyGameDeliveryConfig(config) {
  if (!config || typeof config !== "object") return config;
  const next = { ...config };
  if (next.creditUrl === "http://dev2.payment.happyelements.com/success.html") {
    next.creditUrl = "";
  }
  if (next.secretKey === "b6debd406c39fd868075ce555228a994") {
    next.secretKey = "";
  }
  return next;
}

function createInitialState() {
  return {
    roles: deepClone(INITIAL_ROLES),
    mallConfigDraft: deepClone(DEFAULT_MALL_CONFIG),
    mallConfigPublished: deepClone(DEFAULT_MALL_CONFIG),
    contentDraftUpdatedAt: null,
    contentPublishedAt: new Date().toISOString(),
    productsDraft: deepClone(INITIAL_PRODUCTS),
    productsPublished: deepClone(INITIAL_PRODUCTS),
    productCategoriesDraft: deepClone(INITIAL_PRODUCT_CATEGORIES),
    productCategoriesPublished: deepClone(INITIAL_PRODUCT_CATEGORIES),
    translationsDraft: {},
    translationsPublished: {},
    productsDraftUpdatedAt: null,
    productsPublishedAt: new Date().toISOString(),
    translationsDraftUpdatedAt: null,
    translationsPublishedAt: new Date().toISOString(),
    gameDeliveryDraft: deepClone(DEFAULT_GAME_DELIVERY_CONFIG),
    gameDeliveryPublished: deepClone(DEFAULT_GAME_DELIVERY_CONFIG),
    gameDeliveryDraftUpdatedAt: null,
    gameDeliveryPublishedAt: new Date().toISOString(),
    consumerMallConfig: deepClone(CONSUMER_MALL_CONFIG),
    consumerProducts: deepClone(CONSUMER_PRODUCTS),
    banRecords: deepClone(INITIAL_BAN_RECORDS),
    monthlyRechargeSpent: { ...INITIAL_MONTHLY_SPENT },
    purchaseCounts: { ...INITIAL_PURCHASE_COUNTS },
    orders: {},
  };
}

function loadState() {
  if (typeof localStorage === "undefined") {
    return createInitialState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    const initial = createInitialState();
    return {
      ...initial,
      ...parsed,
      gameDeliveryDraft: sanitizeLegacyGameDeliveryConfig(parsed.gameDeliveryDraft ?? initial.gameDeliveryDraft),
      gameDeliveryPublished: sanitizeLegacyGameDeliveryConfig(parsed.gameDeliveryPublished ?? initial.gameDeliveryPublished),
      monthlyRechargeSpent: {
        ...initial.monthlyRechargeSpent,
        ...(parsed.monthlyRechargeSpent ?? {}),
      },
    };
  } catch {
    return createInitialState();
  }
}

let state = loadState();

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const parsed = JSON.parse(event.newValue);
      state = {
        ...createInitialState(),
        ...parsed,
        gameDeliveryDraft: sanitizeLegacyGameDeliveryConfig(parsed.gameDeliveryDraft),
        gameDeliveryPublished: sanitizeLegacyGameDeliveryConfig(parsed.gameDeliveryPublished),
      };
    } catch {
      /* ignore corrupt snapshot */
    }
  });
}

function persist() {
  if (typeof localStorage === "undefined") return;
  const snapshot = {
    mallConfigDraft: state.mallConfigDraft,
    mallConfigPublished: state.mallConfigPublished,
    contentDraftUpdatedAt: state.contentDraftUpdatedAt,
    contentPublishedAt: state.contentPublishedAt,
    productsDraft: state.productsDraft,
    productsPublished: state.productsPublished,
    productCategoriesDraft: state.productCategoriesDraft,
    productCategoriesPublished: state.productCategoriesPublished,
    translationsDraft: state.translationsDraft,
    translationsPublished: state.translationsPublished,
    productsDraftUpdatedAt: state.productsDraftUpdatedAt,
    productsPublishedAt: state.productsPublishedAt,
    translationsDraftUpdatedAt: state.translationsDraftUpdatedAt,
    translationsPublishedAt: state.translationsPublishedAt,
    gameDeliveryDraft: state.gameDeliveryDraft,
    gameDeliveryPublished: state.gameDeliveryPublished,
    gameDeliveryDraftUpdatedAt: state.gameDeliveryDraftUpdatedAt,
    gameDeliveryPublishedAt: state.gameDeliveryPublishedAt,
    banRecords: state.banRecords,
    monthlyRechargeSpent: state.monthlyRechargeSpent,
    purchaseCounts: state.purchaseCounts,
    orders: state.orders,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function limitPeriodLabel(period) {
  const map = {
    none: "不限购",
    monthly: "按月",
    weekly: "按周",
    daily: "按日",
    season: "赛季/活动",
    lifetime: "赛季/活动（已废弃）",
    account: "赛季/活动（已废弃）",
  };
  return map[period] ?? period;
}

function normalizeLimitPeriod(period) {
  if (period === "lifetime" || period === "account") return "season";
  if (["none", "monthly", "weekly", "daily", "season"].includes(period)) return period;
  return "season";
}

function getMonthlySpent(accountId) {
  return state.monthlyRechargeSpent[accountId.trim()] ?? 0;
}

function getRechargeLimit(accountId) {
  const id = accountId?.trim();
  if (!id) badRequest("账号不能为空");
  return buildRechargeLimitView(id, getMonthlySpent(id));
}

function assertRechargeAllowed(accountId, amount) {
  const limit = getRechargeLimit(accountId);
  const reason = validateRechargeAmount(limit, amount);
  if (reason) {
    forbidden({ code: "RECHARGE_LIMIT", message: reason, rechargeLimit: limit });
  }
}

function purchaseKey(accountId, roleId, productId, limitPeriod, at = new Date()) {
  const base = `${accountId}:${roleId}:${productId}`;
  const bucket = buildPeriodBucket(limitPeriod, at);
  return bucket ? `${base}:${bucket}` : base;
}

function legacyPurchaseKey(accountId, roleId, productId) {
  return `${accountId}:${roleId}:${productId}`;
}

function getPurchasedCount(accountId, roleId, product) {
  const key = purchaseKey(accountId, roleId, product.id, product.limitPeriod);
  const legacy = legacyPurchaseKey(accountId, roleId, product.id);
  return state.purchaseCounts[key] ?? state.purchaseCounts[legacy] ?? 0;
}

function incrementPurchase(accountId, roleId, product, fulfilledAt) {
  const key = purchaseKey(accountId, roleId, product.id, product.limitPeriod, fulfilledAt);
  const next = getPurchasedCount(accountId, roleId, product) + 1;
  state.purchaseCounts[key] = next;
  persist();
}

function getRemaining(accountId, roleId, product) {
  if (product.limitMax <= 0) return null;
  const purchased = getPurchasedCount(accountId, roleId, product);
  return Math.max(product.limitMax - purchased, 0);
}

function resolvePromoTag(product, soldOut) {
  if (soldOut) return null;
  const tag = product.tag ?? "";
  if (/剩余\d+(?:天|小时)/.test(tag)) return null;
  if (tag) return tag;
  if (product.firstBonus && product.category === "gem") return "首充双倍";
  return null;
}

function resolveTimeLimit(product) {
  const fromEnd = formatRemainingTimeLabel(product.timeLimitEnd);
  if (fromEnd && fromEnd !== "活动已结束") return fromEnd;
  if (product.expiresInDays != null) return formatRemainingDaysLabel(product.expiresInDays);
  return null;
}

function resolveLimitInfo(product, remaining, soldOut) {
  if (product.limitMax <= 0) return null;
  if (soldOut) return "已达限购上限";
  if (remaining == null) return null;
  return `剩余可购买 ${remaining} / ${product.limitMax}`;
}

function resolveDisplayName(product) {
  const qtyMatch = product.description.match(/[×x]\s*(\d+)/i);
  if (qtyMatch) return `${product.name}×${qtyMatch[1]}`;
  return product.name;
}

function resolveRewardDesc(product, soldOut) {
  if (soldOut) return null;
  if (product.description.includes("共获得") || product.description.includes("每日")) {
    return product.description;
  }
  return null;
}

function resolveOriginalPrice(product) {
  if (product.originalPrice != null && product.originalPrice > product.price) {
    return product.originalPrice;
  }
  if (product.firstBonus && product.category === "gem") {
    return Number((product.price * 2).toFixed(2));
  }
  return null;
}

function isProductTimeExpired(product) {
  if (product.timeLimitEnd) {
    return new Date(product.timeLimitEnd).getTime() < Date.now();
  }
  return false;
}

function toMallProduct(accountId, roleId, product) {
  const timeExpired = isProductTimeExpired(product);
  const purchased = getPurchasedCount(accountId, roleId, product);
  const remaining = getRemaining(accountId, roleId, product);
  const limitSoldOut = product.limitMax > 0 && (remaining ?? 0) <= 0;
  const soldOut = timeExpired || limitSoldOut;
  const unavailableReason = timeExpired
    ? "活动已结束"
    : limitSoldOut
      ? product.limitPeriod === "season"
        ? "活动礼包限购已满"
        : "已达限购上限"
      : null;

  return {
    id: product.id,
    goodsId: product.goodsId,
    name: product.name,
    category: product.category,
    currency: product.currency,
    price: product.price,
    firstBonus: product.firstBonus,
    description: product.description,
    image: product.image,
    imageUrl: product.imageUrl,
    promoTag: resolvePromoTag(product, soldOut),
    promoText: product.promoText,
    discountLabel: product.discountLabel,
    timeLimit: resolveTimeLimit(product),
    limitInfo: resolveLimitInfo(product, remaining, soldOut),
    displayName: resolveDisplayName(product),
    rewardDesc: resolveRewardDesc(product, soldOut),
    originalPrice: resolveOriginalPrice(product),
    limitMax: product.limitMax,
    limitPeriod: product.limitPeriod,
    limitSyncWithGame: product.limitSyncWithGame,
    purchasedCount: purchased,
    remaining,
    soldOut,
    unavailableReason,
    expiresInDays: product.expiresInDays ?? null,
    timeLimitEnd: product.timeLimitEnd ?? null,
  };
}

function toAdminProduct(product) {
  return {
    ...product,
    limitPeriodLabel: limitPeriodLabel(product.limitPeriod),
    limitSyncHint: product.limitSyncWithGame
      ? "限购次数与游戏内共享（演示环境由 Mock 内存计数）"
      : "仅网页商城独立计数",
    remainingHint:
      product.limitMax > 0
        ? "剩余次数按账号+角色实时计算，不可在后台直接改"
        : "不限购",
  };
}

function toOrderResponse(orderId) {
  const order = state.orders[orderId];
  if (!order) badRequest("订单不存在");
  return {
    orderId: order.orderId,
    accountId: order.accountId,
    role: order.role,
    product: order.product,
    quantity: order.quantity,
    amount: order.amount,
    status: order.status,
    payChannel: order.payChannel ?? null,
    createdAt: order.createdAt,
    payUrl: `https://pay.le-elements.com/mock/${order.product.id}`,
    remaining: getRemaining(order.accountId, order.roleId, order.product),
  };
}

function finalizeOrderPayment(orderId) {
  const order = state.orders[orderId];
  if (!order || order.status === "paid") return;
  order.status = "paid";
  const fulfilledAt = new Date();
  order.fulfilledAt = fulfilledAt.toISOString();
  for (let i = 0; i < order.quantity; i += 1) {
    incrementPurchase(order.accountId, order.roleId, order.product, fulfilledAt);
  }
  const accountId = order.accountId;
  const nextSpent = getMonthlySpent(accountId) + order.amount;
  state.monthlyRechargeSpent[accountId] = Number(nextSpent.toFixed(2));
  persist();
}

function getContentPublishMeta() {
  return buildPublishMeta(
    state.mallConfigDraft,
    state.mallConfigPublished,
    state.contentDraftUpdatedAt,
    state.contentPublishedAt,
  );
}

function getProductsPublishMeta() {
  return buildPublishMeta(
    state.productsDraft,
    state.productsPublished,
    state.productsDraftUpdatedAt,
    state.productsPublishedAt,
  );
}

function getProductCategoriesPublishMeta() {
  return buildPublishMeta(
    state.productCategoriesDraft,
    state.productCategoriesPublished,
    null,
    null,
  );
}

function getTranslationsPublishMeta() {
  return buildPublishMeta(
    state.translationsDraft,
    state.translationsPublished,
    state.translationsDraftUpdatedAt,
    state.translationsPublishedAt,
  );
}

function getGameDeliveryPublishMeta() {
  return buildPublishMeta(
    state.gameDeliveryDraft,
    state.gameDeliveryPublished,
    state.gameDeliveryDraftUpdatedAt,
    state.gameDeliveryPublishedAt,
  );
}

function getTranslationLocaleCodes() {
  const locales = new Set(DEFAULT_LANGUAGE_OPTIONS.map((item) => item.code));
  for (const source of [state.mallConfigDraft, state.mallConfigPublished, state.consumerMallConfig]) {
    for (const locale of Object.keys(source?.languageMeta ?? {})) locales.add(locale);
    for (const locale of Object.keys(source?.languages ?? {})) locales.add(locale);
  }
  return Array.from(locales);
}

function normalizeTranslationValues(input = {}, fallback = {}) {
  const values = {};
  for (const locale of getTranslationLocaleCodes()) {
    values[locale] =
      typeof input[locale] === "string"
        ? input[locale]
        : typeof fallback[locale] === "string"
          ? fallback[locale]
          : "";
  }
  for (const [locale, value] of Object.entries(input ?? {})) {
    if (values[locale] == null) values[locale] = typeof value === "string" ? value : "";
  }
  return values;
}

function buildProductFromDto(id, goodsId, dto) {
  return {
    id,
    goodsId,
    enabled: dto.enabled,
    name: dto.name,
    category: dto.category,
    currency: dto.currency ?? "CNY",
    price: dto.price,
    originalPrice: dto.originalPrice ?? null,
    discountLabel: dto.discountLabel ?? null,
    firstBonus: dto.firstBonus,
    description: dto.description,
    image: dto.image,
    imageUrl: dto.imageUrl ?? null,
    tag: dto.tag,
    promoText: dto.promoText ?? null,
    limitMax: dto.limitMax,
    limitPeriod: normalizeLimitPeriod(dto.limitPeriod),
    limitSyncWithGame: dto.limitSyncWithGame ?? true,
    expiresInDays: computeRemainingDays(dto.timeLimitEnd) ?? undefined,
    timeLimitEnd: dto.timeLimitEnd ?? null,
    sortOrder: dto.sortOrder ?? 0,
  };
}

function isLockedDemoAccount(accountId) {
  return accountId?.trim() === LOCKED_DEMO_ACCOUNT;
}

function assertAccountNotBanned(accountId) {
  const status = getAccountStatus(accountId);
  if (status.banned) {
    forbidden({
      code: "ACCOUNT_BANNED",
      message: status.banReason,
      banReason: status.banReason,
      bannedAt: status.bannedAt,
    });
  }
}

export function getAccountStatus(accountId) {
  const id = accountId?.trim();
  if (!id) badRequest("账号不能为空");
  const ban = state.banRecords[id];
  if (ban) {
    return {
      status: "banned",
      banned: true,
      accountId: id,
      banReason: ban.reason,
      bannedAt: ban.bannedAt,
    };
  }
  return {
    status: "active",
    banned: false,
    accountId: id,
    rechargeLimit: getRechargeLimit(id),
  };
}

export function getRoles() {
  return state.roles;
}

export function getMallConfig() {
  return {
    ...normalizeMallConfig(state.consumerMallConfig),
    translations: deepClone(state.translationsPublished),
  };
}

export function getConsumerTranslations() {
  return deepClone(state.translationsPublished);
}

export function getProductCategories() {
  return deepClone(CONSUMER_PRODUCT_CATEGORIES)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getMall(accountId, roleId) {
  assertAccountNotBanned(accountId);
  const role = state.roles.find((item) => item.id === roleId);
  if (!role) badRequest("角色不存在");
  if (!accountId?.trim()) badRequest("账号不能为空");

  if (!role.storeUnlocked || isLockedDemoAccount(accountId)) {
    return { storeUnlocked: false, role, products: [] };
  }

  const products = state.consumerProducts
    .filter((product) => product.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((product) => toMallProduct(accountId.trim(), roleId, product));

  const rechargeLimit = getRechargeLimit(accountId.trim());
  const productsWithAgeLimit = products.map((product) => {
    if (rechargeLimit?.ageTier === "jp-under16" || rechargeLimit?.ageTier === "jp-16to20") {
      return product;
    }
    const ageLimitReason = getProductAgeLimitReason(rechargeLimit, product.price, 1);
    if (!ageLimitReason) return product;
    return {
      ...product,
      ageLimitBlocked: true,
      ageLimitReason,
      unavailableReason: ageLimitReason,
      soldOut: true,
    };
  });

  return {
    storeUnlocked: true,
    role,
    products: productsWithAgeLimit,
    rechargeLimit,
    categories: getProductCategories(),
  };
}

export function createOrder(dto) {
  assertAccountNotBanned(dto.accountId);
  const role = state.roles.find((item) => item.id === dto.roleId);
  if (!role) badRequest("角色不存在");
  if (!role.storeUnlocked || isLockedDemoAccount(dto.accountId)) {
    badRequest("商店未解锁，请前往游戏打开");
  }

  const product = state.consumerProducts.find((item) => item.id === dto.productId);
  if (!product) badRequest("商品不存在");
  if (!product.enabled) badRequest("商品已下架");

  const mallProduct = toMallProduct(dto.accountId.trim(), dto.roleId, product);
  const quantity = Math.max(1, Math.min(dto.quantity ?? 1, 99));
  const remaining = mallProduct.remaining;

  if (remaining != null && quantity > remaining) {
    badRequest(`最多还可购买 ${remaining} 件`);
  }

  const orderId = `LE${Date.now()}`;
  const amount = Number((product.price * quantity).toFixed(2));
  assertRechargeAllowed(dto.accountId, amount);

  state.orders[orderId] = {
    orderId,
    accountId: dto.accountId.trim(),
    roleId: dto.roleId,
    productId: product.id,
    quantity,
    amount,
    status: "pending",
    createdAt: new Date().toISOString(),
    role,
    product,
  };
  persist();

  if (!dto.pendingOnly) {
    finalizeOrderPayment(orderId);
  }

  return toOrderResponse(orderId);
}

export function getOrderPaymentStatus(orderId, accountId) {
  const order = state.orders[orderId];
  if (!order || order.accountId !== accountId?.trim()) {
    badRequest("订单不存在");
  }
  return {
    paid: order.status === "paid",
    order: toOrderResponse(orderId),
  };
}

export function notifyOrderPaid(orderId, accountId, payChannel) {
  const order = state.orders[orderId];
  if (!order || order.accountId !== accountId?.trim()) {
    badRequest("订单不存在");
  }
  if (payChannel) order.payChannel = payChannel;
  finalizeOrderPayment(orderId);
  return getOrderPaymentStatus(orderId, accountId);
}

export function getPublishStatus() {
  return {
    content: getContentPublishMeta(),
    products: getProductsPublishMeta(),
    productCategories: getProductCategoriesPublishMeta(),
    translations: getTranslationsPublishMeta(),
    gameDelivery: getGameDeliveryPublishMeta(),
  };
}

export function getAdminMallConfig() {
  return {
    draft: normalizeMallConfig(state.mallConfigDraft),
    published: normalizeMallConfig(state.mallConfigPublished),
    meta: getContentPublishMeta(),
  };
}

export function saveMallConfigDraft(dto) {
  state.mallConfigDraft = normalizeMallConfig({
    ...dto,
    game: {
      ...dto.game,
      icon: dto.game?.icon?.trim() || "",
      name: dto.languages?.["zh-CN"]?.gameName?.trim() || dto.game?.name || "",
    },
    updatedAt: new Date().toISOString(),
  });
  state.contentDraftUpdatedAt = new Date().toISOString();
  persist();
  return { draft: state.mallConfigDraft, meta: getContentPublishMeta() };
}

export function publishMallConfig() {
  state.mallConfigPublished = deepClone(normalizeMallConfig(state.mallConfigDraft));
  state.consumerMallConfig = deepClone(state.mallConfigPublished);
  state.contentPublishedAt = new Date().toISOString();
  state.mallConfigPublished.updatedAt = state.contentPublishedAt;
  state.consumerMallConfig.updatedAt = state.contentPublishedAt;
  persist();
  return { published: state.mallConfigPublished, meta: getContentPublishMeta() };
}

export function listTranslations() {
  const items = Object.values(state.translationsDraft ?? {}).sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  return {
    items,
    meta: getTranslationsPublishMeta(),
  };
}

export function saveTranslationEntry(dto) {
  const key = dto.key?.trim();
  if (!key || !/^[a-z0-9_.]+$/.test(key)) {
    badRequest("多语言 Key 仅支持小写字母、数字、下划线和点号");
  }
  const current = state.translationsDraft[key] ?? {};
  const values = normalizeTranslationValues(dto.values ?? {}, current.values ?? {});
  state.translationsDraft[key] = {
    key,
    category: dto.category?.trim() || current.category || "页面文案",
    usage: dto.usage?.trim() || current.usage || "",
    sourceText: dto.sourceText ?? values["zh-CN"] ?? current.sourceText ?? "",
    values,
    updatedAt: new Date().toISOString(),
  };
  state.translationsDraftUpdatedAt = new Date().toISOString();
  persist();
  return { item: state.translationsDraft[key], meta: getTranslationsPublishMeta() };
}

export function publishTranslations() {
  state.translationsPublished = deepClone(state.translationsDraft);
  state.translationsPublishedAt = new Date().toISOString();
  persist();
  return {
    count: Object.keys(state.translationsPublished).length,
    meta: getTranslationsPublishMeta(),
  };
}

export function getAdminGameDeliveryConfig() {
  return {
    draft: normalizeGameDeliveryConfig(state.gameDeliveryDraft),
    published: normalizeGameDeliveryConfig(state.gameDeliveryPublished),
    meta: getGameDeliveryPublishMeta(),
  };
}

export function saveGameDeliveryDraft(dto) {
  const normalized = normalizeGameDeliveryConfig(dto, DEFAULT_GAME_DELIVERY_CONFIG);
  if (!normalized.gameId) badRequest("请填写 GameID");
  if (!normalized.creditUrl) badRequest("请填写加币地址");
  if (!normalized.secretKey) badRequest("请填写加币密钥");
  state.gameDeliveryDraft = normalized;
  state.gameDeliveryDraftUpdatedAt = new Date().toISOString();
  persist();
  return { draft: state.gameDeliveryDraft, meta: getGameDeliveryPublishMeta() };
}

export function publishGameDelivery() {
  state.gameDeliveryPublished = deepClone(normalizeGameDeliveryConfig(state.gameDeliveryDraft));
  state.gameDeliveryPublishedAt = new Date().toISOString();
  persist();
  return { published: state.gameDeliveryPublished, meta: getGameDeliveryPublishMeta() };
}

export function getProducts() {
  return {
    items: state.productsDraft.map((product) => toAdminProduct(product)),
    meta: getProductsPublishMeta(),
  };
}

export function createProduct(dto) {
  const goodsId = dto.goodsId?.trim() || `goods-${Date.now()}`;
  const id = goodsId;
  if (state.productsDraft.some((p) => p.id === id || p.goodsId === goodsId)) {
    badRequest("商品 ID / GoodsID 已存在");
  }
  const product = buildProductFromDto(id, goodsId, dto);
  state.productsDraft.push(product);
  state.productsDraftUpdatedAt = new Date().toISOString();
  persist();
  return toAdminProduct(product);
}

export function updateProduct(id, dto) {
  const index = state.productsDraft.findIndex((p) => p.id === id);
  if (index < 0) badRequest("商品不存在");
  const current = state.productsDraft[index];
  const goodsId = dto.goodsId?.trim() || current.goodsId;
  if (
    state.productsDraft.some(
      (p) => p.id !== id && (p.goodsId === goodsId || p.id === goodsId),
    )
  ) {
    badRequest("GoodsID 已被其他商品使用");
  }
  state.productsDraft[index] = buildProductFromDto(id, goodsId, dto);
  state.productsDraftUpdatedAt = new Date().toISOString();
  persist();
  return toAdminProduct(state.productsDraft[index]);
}

export function deleteProduct(id) {
  const index = state.productsDraft.findIndex((p) => p.id === id);
  if (index < 0) badRequest("商品不存在");
  const [removed] = state.productsDraft.splice(index, 1);
  state.productsDraftUpdatedAt = new Date().toISOString();
  persist();
  return { ok: true, id: removed.id };
}

export function publishProducts() {
  state.productsPublished = deepClone(state.productsDraft);
  state.productsPublishedAt = new Date().toISOString();
  persist();
  return { count: state.productsPublished.length, meta: getProductsPublishMeta() };
}

export function getGameGoodsCatalog() {
  return {
    items: MOCK_GAME_GOODS_CATALOG,
    source: "mock",
    hint: "正式环境由项目组按接口文档提供全量库存 ID；选择后可自动填充商品模板。",
  };
}

export function getAdminProductCategories() {
  return {
    items: [...state.productCategoriesDraft]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ enabled, ...item }) => item),
    meta: getProductCategoriesPublishMeta(),
  };
}

export function saveProductCategoriesDraft(items) {
  if (!items.length) badRequest("至少保留一个商品类型");
  const ids = new Set();
  for (const item of items) {
    const id = item.id?.trim();
    if (!id || !/^[a-z][a-z0-9_-]{0,31}$/.test(id)) {
      badRequest(`商品类型 ID 不合法：${item.id}`);
    }
    if (ids.has(id)) badRequest(`商品类型 ID 重复：${id}`);
    ids.add(id);
    if (!item.label?.trim()) badRequest(`请填写类型名称：${id}`);
  }
  state.productCategoriesDraft = items.map((item, index) => ({
    id: item.id.trim(),
    label: item.label.trim(),
    sortOrder: item.sortOrder ?? index * 10,
  }));
  persist();
  return { ok: true, count: state.productCategoriesDraft.length };
}

export function publishProductCategories() {
  state.productCategoriesPublished = deepClone(state.productCategoriesDraft);
  persist();
  return {
    ok: true,
    count: state.productCategoriesPublished.length,
    meta: getProductCategoriesPublishMeta(),
  };
}

export function listOrders() {
  return Object.values(state.orders)
    .map((order) => ({
      orderId: order.orderId,
      accountId: order.accountId,
      roleId: order.roleId,
      roleName: order.role.name,
      productId: order.productId,
      productName: order.product.name,
      quantity: order.quantity,
      amount: order.amount,
      status: order.status,
      payChannel: order.payChannel ?? null,
      createdAt: order.createdAt,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function resetMockState() {
  state = createInitialState();
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
