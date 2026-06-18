import { ADMIN_TOKEN, EDITOR_TOKEN } from "./data.js";
import { ApiError, unauthorized } from "./errors.js";
import * as store from "./store.js";

function delay(result, ms = 60) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(result), ms);
  });
}

function assertToken(token) {
  const trimmed = token?.trim();
  if (!trimmed || (trimmed !== ADMIN_TOKEN && trimmed !== EDITOR_TOKEN)) {
    unauthorized("Unauthorized");
  }
}

function run(token, fn) {
  try {
    assertToken(token);
    return delay(fn());
  } catch (error) {
    if (error instanceof ApiError) {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
}

export function createAdminApi(getToken) {
  return {
    publishStatus: () => run(getToken(), () => store.getPublishStatus()),
    mallConfig: {
      get: () => run(getToken(), () => store.getAdminMallConfig()),
      saveDraft: (body) => run(getToken(), () => store.saveMallConfigDraft(body)),
      publish: () => run(getToken(), () => store.publishMallConfig()),
    },
    products: {
      list: () => run(getToken(), () => store.getProducts()),
      create: (body) => run(getToken(), () => store.createProduct(body)),
      update: (id, body) => run(getToken(), () => store.updateProduct(id, body)),
      remove: (id) => run(getToken(), () => store.deleteProduct(id)),
      publish: () => run(getToken(), () => store.publishProducts()),
    },
    gameGoods: {
      list: () => run(getToken(), () => store.getGameGoodsCatalog()),
    },
    productCategories: {
      list: () => run(getToken(), () => store.getAdminProductCategories()),
      saveDraft: (items) => run(getToken(), () => store.saveProductCategoriesDraft(items)),
      publish: () => run(getToken(), () => store.publishProductCategories()),
    },
    translations: {
      list: () => run(getToken(), () => store.listTranslations()),
      save: (body) => run(getToken(), () => store.saveTranslationEntry(body)),
      publish: () => run(getToken(), () => store.publishTranslations()),
    },
    gameDelivery: {
      get: () => run(getToken(), () => store.getAdminGameDeliveryConfig()),
      saveDraft: (body) => run(getToken(), () => store.saveGameDeliveryDraft(body)),
      publish: () => run(getToken(), () => store.publishGameDelivery()),
    },
    orders: {
      list: () =>
        run(getToken(), () => ({
          reserved: true,
          message: "商城订单管理功能预留，当前仅展示演示订单列表",
          items: store.listOrders(),
        })),
    },
  };
}

export function toAdminError(error) {
  if (error instanceof ApiError) {
    const message =
      typeof error.data?.message === "string"
        ? error.data.message
        : Array.isArray(error.data?.message)
          ? error.data.message.join("; ")
          : error.data?.message?.message || error.message || `请求失败 (${error.status})`;
    return new Error(message);
  }
  return error;
}
