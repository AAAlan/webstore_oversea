import { createAdminApi, toAdminError } from "../../mock/admin-api.js";

const TOKEN_KEY = "recharge-admin-token";
const DEFAULT_TOKEN = "demo-admin-token";
const ADMIN_TOKEN = "demo-admin-token";
const EDITOR_TOKEN = "demo-editor-token";

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY) || DEFAULT_TOKEN;
}

export function setAdminToken(token) {
  localStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAdminRole() {
  const token = getAdminToken();
  if (token === ADMIN_TOKEN) return "admin";
  if (token === EDITOR_TOKEN) return "editor";
  return "guest";
}

const mockApi = createAdminApi(getAdminToken);

async function request(fn) {
  try {
    return await fn();
  } catch (error) {
    throw toAdminError(error);
  }
}

export const adminApi = {
  publishStatus: () => request(() => mockApi.publishStatus()),
  mallConfig: {
    get: () => request(() => mockApi.mallConfig.get()),
    saveDraft: (body) => request(() => mockApi.mallConfig.saveDraft(body)),
    publish: () => request(() => mockApi.mallConfig.publish()),
  },
  products: {
    list: () => request(() => mockApi.products.list()),
    create: (body) => request(() => mockApi.products.create(body)),
    update: (id, body) => request(() => mockApi.products.update(id, body)),
    remove: (id) => request(() => mockApi.products.remove(id)),
    publish: () => request(() => mockApi.products.publish()),
  },
  gameGoods: {
    list: () => request(() => mockApi.gameGoods.list()),
  },
  productCategories: {
    list: () => request(() => mockApi.productCategories.list()),
    saveDraft: (items) => request(() => mockApi.productCategories.saveDraft(items)),
    publish: () => request(() => mockApi.productCategories.publish()),
  },
  translations: {
    list: () => request(() => mockApi.translations.list()),
    save: (body) => request(() => mockApi.translations.save(body)),
    publish: () => request(() => mockApi.translations.publish()),
  },
  gameDelivery: {
    get: () => request(() => mockApi.gameDelivery.get()),
    saveDraft: (body) => request(() => mockApi.gameDelivery.saveDraft(body)),
    publish: () => request(() => mockApi.gameDelivery.publish()),
  },
  orders: {
    list: () => request(() => mockApi.orders.list()),
  },
};
