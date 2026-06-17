<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { adminApi } from "../api.js";
import ImageUploadField from "../components/ImageUploadField.vue";
import MultilingualField from "../components/MultilingualField.vue";
import PublishBar from "../components/PublishBar.vue";
import { computeRemainingDays } from "../lib/time-limit.js";

const props = defineProps({ loading: Boolean });
const emit = defineEmits(["toast", "loading", "status-change"]);

const products = ref([]);
const publishMeta = ref(null);
const productModal = ref(false);
const editingProductId = ref(null);
const viewOnly = ref(false);
const categoryOptions = ref([]);
const gameGoodsCatalog = ref([]);
const translationMap = ref({});

function emptyProductForm() {
  const defaultCategory = categoryOptions.value[0]?.id || "bundle";
  return {
    goodsId: "",
    enabled: true,
    name: "",
    category: defaultCategory,
    currency: "CNY",
    price: 6,
    originalPrice: "",
    firstBonus: false,
    description: "",
    image: "📦",
    imageUrl: "",
    tag: "",
    promoText: "",
    limitMax: 1,
    limitPeriod: "season",
    limitSyncWithGame: true,
    timeLimitEnd: "",
    sortOrder: 0,
  };
}

const productForm = reactive(emptyProductForm());

const currencyOptions = [
  { value: "CNY", label: "CNY 人民币" },
  { value: "USD", label: "USD 美元" },
  { value: "HKD", label: "HKD 港币" },
  { value: "TWD", label: "TWD 新台币" },
  { value: "JPY", label: "JPY 日元" },
];

const limitPeriodLabels = {
  none: "不限购",
  monthly: "按月",
  weekly: "按周",
  daily: "按日",
  season: "赛季/活动",
};

const categoryLabelMap = computed(() =>
  Object.fromEntries(categoryOptions.value.map((c) => [c.id, c.label])),
);

const computedRemainingDays = computed(() =>
  computeRemainingDays(productForm.timeLimitEnd),
);

const remainingDaysPreview = computed(() => {
  if (!productForm.timeLimitEnd) return "";
  const days = computedRemainingDays.value;
  if (days == null) return "";
  if (days <= 0) return "活动已结束";
  return `C 端将展示「剩余${days}天」`;
});

const usedGoodsIds = computed(() =>
  new Set(
    products.value
      .filter((p) => p.id !== editingProductId.value)
      .map((p) => p.goodsId)
      .filter(Boolean),
  ),
);

const selectableGameGoods = computed(() =>
  gameGoodsCatalog.value.filter((g) => !usedGoodsIds.value.has(g.goodsId)),
);

async function loadCategories() {
  try {
    const data = await adminApi.productCategories.list();
    categoryOptions.value = (data.items ?? []).filter((c) => c.enabled);
  } catch {
    categoryOptions.value = [
      { id: "gem", label: "衍质源石" },
      { id: "monthly", label: "月卡" },
      { id: "pass", label: "协议通行证" },
      { id: "bundle", label: "组合包" },
    ];
  }
}

async function loadGameGoods() {
  try {
    const data = await adminApi.gameGoods.list();
    gameGoodsCatalog.value = data.items ?? [];
  } catch {
    gameGoodsCatalog.value = [];
  }
}

async function loadTranslations() {
  try {
    const data = await adminApi.translations.list();
    translationMap.value = Object.fromEntries(
      (data.items ?? []).map((item) => [item.key, item]),
    );
  } catch {
    translationMap.value = {};
  }
}

function valuesFor(key, fallback = "") {
  return {
    "zh-CN": fallback,
    ...(translationMap.value[key]?.values ?? {}),
  };
}

async function saveTranslation(entry) {
  try {
    await adminApi.translations.save(entry);
    await loadTranslations();
    emit("status-change");
    emit("toast", "success", "多语言文案已保存");
  } catch (error) {
    emit("toast", "error", error.message);
  }
}

async function load() {
  emit("loading", true);
  try {
    await Promise.all([loadCategories(), loadGameGoods(), loadTranslations()]);
    const data = await adminApi.products.list();
    products.value = data.items ?? [];
    publishMeta.value = data.meta ?? null;
    emit("status-change");
  } catch (e) {
    emit("toast", "error", e.message);
  } finally {
    emit("loading", false);
  }
}

async function publishProducts() {
  if (!publishMeta.value?.hasUnpublishedChanges) return;
  if (!confirm("确认发布商品草稿？（暂不会同步到 C 端商城）")) return;
  emit("loading", true);
  try {
    const result = await adminApi.products.publish();
    publishMeta.value = result.meta;
    emit("status-change");
    emit("toast", "success", `已发布 ${result.count} 个商品（后台配置）`);
  } catch (e) {
    emit("toast", "error", e.message);
  } finally {
    emit("loading", false);
  }
}

function fillProductForm(product) {
  Object.assign(productForm, {
    goodsId: product.goodsId,
    enabled: product.enabled,
    name: product.name,
    category: product.category,
    currency: product.currency || "CNY",
    price: product.price,
    originalPrice: product.originalPrice ?? "",
    firstBonus: product.firstBonus,
    description: product.description,
    image: product.image,
    imageUrl: product.imageUrl ?? "",
    tag: product.tag || "",
    promoText: product.promoText || "",
    limitMax: product.limitMax,
    limitPeriod: product.limitPeriod === "lifetime" || product.limitPeriod === "account"
      ? "season"
      : product.limitPeriod,
    limitSyncWithGame: product.limitSyncWithGame ?? true,
    timeLimitEnd: product.timeLimitEnd ? product.timeLimitEnd.slice(0, 16) : "",
    sortOrder: product.sortOrder ?? 0,
  });
}

function openCreate() {
  viewOnly.value = false;
  editingProductId.value = null;
  Object.assign(productForm, emptyProductForm());
  productModal.value = true;
}

function openView(product) {
  viewOnly.value = true;
  editingProductId.value = product.id;
  fillProductForm(product);
  productModal.value = true;
}

function openEdit(product) {
  viewOnly.value = false;
  editingProductId.value = product.id;
  fillProductForm(product);
  productModal.value = true;
}

function applyGameGoodsTemplate(goodsId) {
  const item = gameGoodsCatalog.value.find((g) => g.goodsId === goodsId);
  if (!item) return;
  productForm.goodsId = item.goodsId;
  productForm.name = item.name || productForm.name;
  productForm.category = item.category || productForm.category;
  productForm.description = item.description || productForm.description;
  productForm.limitMax = item.limitMax ?? productForm.limitMax;
  productForm.limitPeriod = item.limitPeriod || productForm.limitPeriod;
  if (item.price != null) productForm.price = item.price;
  if (item.originalPrice != null) productForm.originalPrice = item.originalPrice;
  if (item.imageUrl) productForm.imageUrl = item.imageUrl;
}

function buildPayload() {
  const payload = {
    goodsId: productForm.goodsId.trim() || undefined,
    enabled: productForm.enabled,
    name: productForm.name.trim(),
    category: productForm.category,
    currency: productForm.currency || "CNY",
    price: Number(productForm.price),
    firstBonus: productForm.firstBonus,
    description: productForm.description.trim(),
    image: productForm.image.trim() || "📦",
    limitMax: Number(productForm.limitMax),
    limitPeriod: productForm.limitPeriod,
    limitSyncWithGame: productForm.limitSyncWithGame,
    sortOrder: Number(productForm.sortOrder) || 0,
  };
  if (productForm.originalPrice !== "" && productForm.originalPrice != null) {
    payload.originalPrice = Number(productForm.originalPrice);
  } else {
    payload.originalPrice = null;
  }
  payload.discountLabel = null;
  if (productForm.imageUrl.trim()) payload.imageUrl = productForm.imageUrl.trim();
  else payload.imageUrl = null;
  if (productForm.tag.trim()) payload.tag = productForm.tag.trim();
  if (productForm.promoText.trim()) payload.promoText = productForm.promoText.trim();
  if (productForm.timeLimitEnd) {
    payload.timeLimitEnd = new Date(productForm.timeLimitEnd).toISOString();
  } else {
    payload.timeLimitEnd = null;
  }
  return payload;
}

async function saveProduct() {
  const payload = buildPayload();
  emit("loading", true);
  try {
    if (editingProductId.value) {
      await adminApi.products.update(editingProductId.value, payload);
      emit("toast", "success", "已保存至商品草稿");
    } else {
      if (!productForm.goodsId.trim()) {
        emit("toast", "error", "请选择游戏库存 GoodsID");
        return;
      }
      payload.goodsId = productForm.goodsId.trim();
      await adminApi.products.create(payload);
      emit("toast", "success", "已加入商品草稿");
    }
    productModal.value = false;
    await load();
    emit("status-change");
  } catch (e) {
    emit("toast", "error", e.message);
  } finally {
    emit("loading", false);
  }
}

async function removeProduct(id) {
  if (!confirm(`确定删除商品 ${id}？`)) return;
  emit("loading", true);
  try {
    await adminApi.products.remove(id);
    await load();
    emit("status-change");
    emit("toast", "success", "已从草稿删除");
  } catch (e) {
    emit("toast", "error", e.message);
  } finally {
    emit("loading", false);
  }
}

watch(
  () => productForm.limitPeriod,
  (period) => {
    if (period === "none") {
      productForm.limitMax = 0;
    }
  },
);

watch(
  () => productForm.goodsId,
  (goodsId) => {
    if (!editingProductId.value && goodsId) {
      applyGameGoodsTemplate(goodsId);
    }
  },
);

onMounted(() => {
  load();
});

defineExpose({ load });
</script>

<template>
  <div class="product-panel">
    <PublishBar
      :meta="publishMeta"
      :loading="props.loading"
      module-label="商品管理"
      hide-save-draft
      @publish="publishProducts"
    />

    <p class="page-intro">
      新增/编辑商品写入<strong>草稿</strong>，确认后<strong>发布</strong>更新后台配置；C 端商城仍使用独立演示数据。
      GoodsID 须从游戏库存列表选择；限购周期最长支持赛季/活动（约 3 个月），不支持终身限购。
    </p>

    <section class="panel">
      <div class="panel-header">
        <h3>商品列表（{{ products.length }}）</h3>
        <button class="btn btn--sm" type="button" @click="openCreate">新增商品</button>
      </div>
      <p class="hint panel-hint">
        限购次数在后台配置「上限」；<strong>剩余次数</strong>由 Payment 查询 + 账号角色实时计算，不可直接编辑。
        活动剩余天数由<strong>活动结束时间</strong>自动计算，无需手工填写。
      </p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>GoodsID</th>
              <th>名称</th>
              <th>类型</th>
              <th>排序编号</th>
              <th>定价</th>
              <th>限购</th>
              <th>促销</th>
              <th>上架状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in products" :key="p.id">
              <td><code>{{ p.goodsId }}</code></td>
              <td>{{ p.name }}</td>
              <td>{{ categoryLabelMap[p.category] || p.category }}</td>
              <td class="col-sort">{{ p.sortOrder ?? 0 }}</td>
              <td>
                {{ p.currency }} {{ p.price }}
                <span v-if="p.originalPrice" class="muted"> / 原价{{ p.originalPrice }}</span>
              </td>
              <td>
                <span v-if="p.limitMax > 0">{{ limitPeriodLabels[p.limitPeriod] || p.limitPeriod }} ×{{ p.limitMax }}</span>
                <span v-else class="tag tag--off">不限</span>
              </td>
              <td>{{ p.tag || "—" }}</td>
              <td>
                <span class="tag" :class="p.enabled ? 'tag--ok' : 'tag--off'">
                  {{ p.enabled ? "上架" : "下架" }}
                </span>
              </td>
              <td class="actions">
                <button class="btn btn--ghost btn--sm" type="button" @click="openView(p)">查看</button>
                <button class="btn btn--ghost btn--sm" type="button" @click="openEdit(p)">编辑</button>
                <button class="btn btn--danger btn--sm" type="button" @click="removeProduct(p.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="productModal" class="modal-mask" @click.self="productModal = false">
      <section class="modal modal--wide">
        <h3>{{ viewOnly ? "查看商品" : editingProductId ? "编辑商品" : "新增商品" }}</h3>

        <div class="form-sections" :class="{ 'is-view-only': viewOnly }">
          <section class="form-section">
            <header class="form-section__head">
              <h4 class="form-section__title">1. 基础与上架</h4>
              <p class="form-section__hint">GoodsID 从游戏库存列表选择，不可手输；排序数字越小越靠前。</p>
            </header>
            <div class="form-section__body">
              <div class="form-grid">
                <div class="field field--full">
                  <label>游戏库存 GoodsID *</label>
                  <select
                    v-model="productForm.goodsId"
                    :disabled="!!editingProductId || viewOnly"
                  >
                    <option value="">请选择库存 ID</option>
                    <option
                      v-for="g in selectableGameGoods"
                      :key="g.goodsId"
                      :value="g.goodsId"
                    >
                      {{ g.goodsId }} — {{ g.name }}
                    </option>
                    <option
                      v-if="editingProductId && productForm.goodsId"
                      :value="productForm.goodsId"
                    >
                      {{ productForm.goodsId }}（当前）
                    </option>
                  </select>
                  <span class="field-hint">选择后自动填充名称、类型、限购等模板字段，可再编辑。</span>
                </div>
                <div class="field">
                  <label>上架状态</label>
                  <select v-model="productForm.enabled" :disabled="viewOnly">
                    <option :value="true">上架</option>
                    <option :value="false">下架</option>
                  </select>
                </div>
                <div class="field">
                  <label>商品类型</label>
                  <select v-model="productForm.category" :disabled="viewOnly">
                    <option
                      v-for="cat in categoryOptions"
                      :key="cat.id"
                      :value="cat.id"
                    >
                      {{ cat.label }}
                    </option>
                  </select>
                </div>
                <div class="field">
                  <label>列表排序</label>
                  <input v-model.number="productForm.sortOrder" type="number" :disabled="viewOnly" />
                </div>
                <div class="field field--full">
                  <label>商品名称</label>
                  <MultilingualField
                    v-model="productForm.name"
                    label="商品名称"
                    :translation-key="`product.${productForm.goodsId || 'new'}.name`"
                    category="商品名称"
                    usage="C端 - 商品卡片/详情名称"
                    placeholder="C 端卡片标题"
                    :disabled="viewOnly"
                    :translations="valuesFor(`product.${productForm.goodsId || 'new'}.name`, productForm.name)"
                    @save-translations="saveTranslation"
                  />
                </div>
                <div class="field field--full">
                  <label>商品描述</label>
                  <MultilingualField
                    v-model="productForm.description"
                    label="商品描述"
                    :translation-key="`product.${productForm.goodsId || 'new'}.description`"
                    category="商品描述"
                    usage="C端 - 商品到账说明/礼包内容"
                    placeholder="到账说明、礼包内容等"
                    multiline
                    :disabled="viewOnly"
                    :translations="valuesFor(`product.${productForm.goodsId || 'new'}.description`, productForm.description)"
                    @save-translations="saveTranslation"
                  />
                </div>
              </div>
            </div>
          </section>

          <section class="form-section">
            <header class="form-section__head">
              <h4 class="form-section__title">2. 展示素材</h4>
              <p class="form-section__hint">上传图片并即时预览；仅支持 PNG/JPG/WebP/GIF；PC/H5 等比例缩放展示。</p>
            </header>
            <div class="form-section__body">
              <ImageUploadField
                v-model="productForm.imageUrl"
                label="商品图片"
                hint="建议 1:1 比例，推荐 150×150 或 2 倍图；支持 PNG、JPG、WebP、GIF"
                :disabled="viewOnly"
              />
            </div>
          </section>

          <section class="form-section">
            <header class="form-section__head">
              <h4 class="form-section__title">3. 定价</h4>
              <p class="form-section__hint">国内默认人民币（CNY）。划线价用于促销展示，不填则仅展示售价。</p>
            </header>
            <div class="form-section__body">
              <div class="form-grid">
                <div class="field">
                  <label>币种</label>
                  <select v-model="productForm.currency" :disabled="viewOnly">
                    <option
                      v-for="opt in currencyOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
                <div class="field">
                  <label>售价</label>
                  <input v-model.number="productForm.price" type="number" min="0" step="0.01" :disabled="viewOnly" />
                </div>
                <div class="field">
                  <label>划线原价</label>
                  <input
                    v-model="productForm.originalPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="不填则不展示"
                    :disabled="viewOnly"
                  />
                </div>
                <div v-if="productForm.category === 'gem'" class="field">
                  <label>首充双倍</label>
                  <select v-model="productForm.firstBonus" :disabled="viewOnly">
                    <option :value="true">开启</option>
                    <option :value="false">关闭</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section class="form-section">
            <header class="form-section__head">
              <h4 class="form-section__title">4. 限购规则</h4>
              <p class="form-section__hint">
                配置可购上限；剩余次数由 Payment 统计，<strong>限购周期优先以发货时间计算</strong>（非下单/支付时间），避免发货延迟导致周期归属误差；与游戏内共享策略需保持一致。不支持终身限购。
              </p>
            </header>
            <div class="form-section__body">
              <div class="form-grid">
                <div class="field">
                  <label>限购周期</label>
                  <select v-model="productForm.limitPeriod" :disabled="viewOnly">
                    <option value="none">不限购</option>
                    <option value="monthly">按月</option>
                    <option value="weekly">按周</option>
                    <option value="daily">按日</option>
                    <option value="season">赛季/活动（最长约 3 个月）</option>
                  </select>
                  <span class="field-hint">周期桶按发货时间归属，待支付/未发货不计入已购</span>
                </div>
                <div class="field">
                  <label>限购次数</label>
                  <input
                    v-model.number="productForm.limitMax"
                    type="number"
                    min="0"
                    :disabled="productForm.limitPeriod === 'none' || viewOnly"
                  />
                  <span class="field-hint">0 表示不限购</span>
                </div>
                <div class="field field--full">
                  <label>与游戏内共享限购计数</label>
                  <select v-model="productForm.limitSyncWithGame" :disabled="viewOnly">
                    <option :value="true">是 — 与游戏内一致（推荐）</option>
                    <option :value="false">否 — 仅网页商城独立计数（演示）</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section class="form-section">
            <header class="form-section__head">
              <h4 class="form-section__title">5. 活动时效</h4>
              <p class="form-section__hint">配置活动结束时间，C 端右上角自动展示剩余天数。</p>
            </header>
            <div class="form-section__body">
              <div class="form-grid">
                <div class="field">
                  <label>活动结束时间</label>
                  <input v-model="productForm.timeLimitEnd" type="datetime-local" :disabled="viewOnly" />
                </div>
                <div class="field">
                  <label>剩余天数预览</label>
                  <input :value="remainingDaysPreview || '—'" readonly class="readonly-field" />
                </div>
              </div>
            </div>
          </section>

          <section class="form-section">
            <header class="form-section__head">
              <h4 class="form-section__title">6. 营销标签</h4>
              <p class="form-section__hint">
                角标用于列表卡片；营销说明展示在商品详情名称下方。
              </p>
            </header>
            <div class="form-section__body">
              <div class="form-grid">
                <div class="field">
                  <label>角标标签</label>
                  <MultilingualField
                    v-model="productForm.tag"
                    label="角标标签"
                    :translation-key="`product.${productForm.goodsId || 'new'}.tag`"
                    category="商品营销"
                    usage="C端 - 商品卡片角标"
                    placeholder="如：双倍-限购1次"
                    :disabled="viewOnly"
                    :translations="valuesFor(`product.${productForm.goodsId || 'new'}.tag`, productForm.tag)"
                    @save-translations="saveTranslation"
                  />
                </div>
                <div class="field field--full">
                  <label>营销说明</label>
                  <MultilingualField
                    v-model="productForm.promoText"
                    label="营销说明"
                    :translation-key="`product.${productForm.goodsId || 'new'}.promoText`"
                    category="商品营销"
                    usage="C端 - 商品详情营销说明"
                    placeholder="如：购买共获得 6 颗行质源石（首充共获得 12 颗）。"
                    :disabled="viewOnly"
                    :translations="valuesFor(`product.${productForm.goodsId || 'new'}.promoText`, productForm.promoText)"
                    @save-translations="saveTranslation"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="modal-actions">
          <button class="btn btn--ghost" type="button" @click="productModal = false">
            {{ viewOnly ? "关闭" : "取消" }}
          </button>
          <button v-if="!viewOnly" class="btn" type="button" @click="saveProduct">保存草稿</button>
        </div>
      </section>
    </div>
  </div>
</template>
