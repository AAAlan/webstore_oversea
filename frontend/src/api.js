import { consumerApi, toFetchError } from "../../mock/consumer-api.js";

async function call(fn) {
  try {
    return await fn();
  } catch (error) {
    throw toFetchError(error);
  }
}

export const api = {
  getMallConfig: () => call(() => consumerApi.getMallConfig()),
  getTranslations: () => call(() => consumerApi.getTranslations()),
  getProductCategories: () => call(() => consumerApi.getProductCategories()),
  getRoles: () => call(() => consumerApi.getRoles()),
  getAccountStatus: (accountId) => call(() => consumerApi.getAccountStatus(accountId)),
  getMall: (accountId, roleId) => call(() => consumerApi.getMall(accountId, roleId)),
  createOrder: (body) => call(() => consumerApi.createOrder(body)),
  getOrderPaymentStatus: (orderId, accountId) =>
    call(() => consumerApi.getOrderPaymentStatus(orderId, accountId)),
  notifyOrderPaid: (orderId, accountId, payChannel) =>
    call(() => consumerApi.notifyOrderPaid(orderId, accountId, payChannel)),
};
