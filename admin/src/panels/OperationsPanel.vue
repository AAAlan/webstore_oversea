<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  sub: { type: String, required: true },
});

const queryUserId = ref("");
const queryLoading = ref(false);
const queryResult = ref(null);

/** 演示数据，正式环境对接支付中台 / 账号体系 */
function runQuery() {
  const userId = queryUserId.value.trim();
  if (!userId) return;
  queryLoading.value = true;
  queryResult.value = null;
  setTimeout(() => {
    const isAgeDemo =
      userId === "15200000004" || userId === "15200000005" || userId === "15200000006";
    queryResult.value = {
      userId,
      totalLifetime: isAgeDemo ? 170 : 328,
      monthSpent: isAgeDemo ? 170 : 198,
      monthLimit: isAgeDemo ? 200 : 1000,
      limitAppliesTo: "该账号下全部区服角色共用",
      platforms: [
        { channel: "网页商城", amount: isAgeDemo ? 170 : 198 },
        { channel: "iOS 包", amount: isAgeDemo ? 0 : 98 },
        { channel: "谷歌包", amount: isAgeDemo ? 0 : 32 },
      ],
      identityNote:
        "国服：同一身份证可绑定多个游戏账号；渠道包 SDK 通行证 / 渠道通行证按独立账号分别统计与限额（演示说明）。",
    };
    queryLoading.value = false;
  }, 400);
}

function resetQuery() {
  queryUserId.value = "";
  queryResult.value = null;
}

watch(
  () => props.sub,
  () => {
    resetQuery();
  },
);
</script>

<template>
  <div v-if="sub === 'recharge-query'" class="operations-panel">
    <p class="page-intro">
      按<strong>游戏账号（User_id）</strong>查询全渠道累充与限额占用。当前为功能预留与规则说明，查询结果为演示数据。
    </p>

    <section class="panel">
      <div class="panel-header">
        <h3>统计与限额规则</h3>
      </div>
      <div class="panel-body rules-body">
        <ul class="rules-list">
          <li>
            同一游戏账号体系下，<strong>全平台</strong>（如 iOS 包、谷歌包、网页商城等）统一进行累充金额统计，并<strong>统一限制充值</strong>。
          </li>
          <li>
            <strong>游戏账号（User_id）</strong>：游戏层级账号；单游戏内互通、三方登录绑定主体、实名认证信息绑定主体均归属该维度。
          </li>
          <li>同一游戏账号下，<strong>不同区服角色共用</strong>支付限额。</li>
          <li>
            <strong>国服</strong>：同一身份证可绑定不同游戏账号；渠道包 SDK 通行证 / 渠道通行证按<strong>两个独立账号</strong>分别统计与限额。
          </li>
        </ul>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3>累充查询</h3>
        <span class="reserved-badge reserved-badge--inline">功能预留</span>
      </div>
      <div class="panel-body">
        <div class="query-form">
          <div class="field field--grow">
            <label>游戏账号 User_id</label>
            <input
              v-model="queryUserId"
              placeholder="输入游戏账号，如 15200000001"
              @keyup.enter="runQuery"
            />
          </div>
          <button class="btn" type="button" :disabled="queryLoading" @click="runQuery">
            {{ queryLoading ? "查询中…" : "查询" }}
          </button>
          <button
            v-if="queryResult || queryUserId"
            class="btn btn--ghost"
            type="button"
            @click="resetQuery"
          >
            清空
          </button>
        </div>
        <p class="hint query-hint">
          演示：可输入 <code>15200000001</code>（常规）、<code>15200000005</code>（8–16 岁限额演示，月限额 200 元）。
        </p>

        <div v-if="queryResult" class="query-result">
          <div class="result-summary">
            <div class="result-card">
              <span class="result-label">账号</span>
              <span class="result-value"><code>{{ queryResult.userId }}</code></span>
            </div>
            <div class="result-card">
              <span class="result-label">全平台累充（终身）</span>
              <span class="result-value">￥{{ queryResult.totalLifetime.toFixed(2) }}</span>
            </div>
            <div class="result-card">
              <span class="result-label">本月已充 / 限额</span>
              <span class="result-value">
                ￥{{ queryResult.monthSpent.toFixed(2) }} / ￥{{ queryResult.monthLimit.toFixed(2) }}
              </span>
            </div>
            <div class="result-card result-card--wide">
              <span class="result-label">限额范围</span>
              <span class="result-value">{{ queryResult.limitAppliesTo }}</span>
            </div>
          </div>

          <h4 class="result-section-title">分渠道累充（本月）</h4>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>渠道</th>
                  <th>金额（CNY）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in queryResult.platforms" :key="row.channel">
                  <td>{{ row.channel }}</td>
                  <td>￥{{ row.amount.toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="hint identity-note">{{ queryResult.identityNote }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
