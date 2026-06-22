import { ApiError } from "./errors.js";
import * as store from "./store.js";

function delay(result, ms = 80) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(result), ms);
  });
}

function run(fn) {
  try {
    return delay(fn());
  } catch (error) {
    if (error instanceof ApiError) {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
}

export const consumerApi = {
  getMallConfig: () => run(() => store.getMallConfig()),
  getTranslations: () => run(() => store.getConsumerTranslations()),
  getProductCategories: () => run(() => store.getProductCategories()),
  getRoles: () => run(() => store.getRoles()),
  getAccountStatus: (accountId) => run(() => store.getAccountStatus(accountId)),
  getMall: (accountId, roleId, countryCode) =>
    run(() => store.getMall(accountId, roleId, countryCode)),
  createOrder: (body) => run(() => store.createOrder(body)),
  getOrderPaymentStatus: (orderId, accountId) =>
    run(() => store.getOrderPaymentStatus(orderId, accountId)),
  notifyOrderPaid: (orderId, accountId, payChannel) =>
    run(() => store.notifyOrderPaid(orderId, accountId, payChannel)),
};

export function toFetchError(error) {
  if (error instanceof ApiError) {
    const err = new Error(error.message);
    err.status = error.status;
    err.data = error.data;
    return err;
  }
  return error;
}
