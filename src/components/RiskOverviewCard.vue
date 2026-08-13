<script setup>
import { onMounted, ref } from 'vue'
import { ArrowUpRight, ChevronRight } from 'lucide-vue-next'
import RiskDetailModal from './RiskDetailModal.vue'
import { getRiskOverview } from '../api/api.js'

const cardData = ref({ title: '网络风险', periodLabel: '3个月', total: 0, open: 0, closed: 0, riskTypes: [], neTypes: [] })
const overviewLoading = ref(true)
const overviewError = ref('')
const detailOpen = ref(false)
const activeFilter = ref({ kind: 'all' })

const openDetail = (filter) => {
  activeFilter.value = filter
  detailOpen.value = true
}

const loadOverview = async () => {
  overviewLoading.value = true
  overviewError.value = ''
  try {
    const data = await getRiskOverview()
    cardData.value = {
      title: '网络风险',
      periodLabel: '3个月',
      total: data.total || 0,
      open: data.open || 0,
      closed: data.closed || 0,
      riskTypes: data.riskTypes || [],
      neTypes: data.neTypes || [],
    }
  } catch (error) {
    overviewError.value = '概览数据加载失败'
  } finally {
    overviewLoading.value = false
  }
}

onMounted(loadOverview)
</script>

<template>
  <section class="risk-overview">
    <div v-if="overviewLoading" class="overview-state">正在加载风险概览...</div>
    <div v-else-if="overviewError" class="overview-state">
      <span>{{ overviewError }}</span>
      <button class="retry-button" type="button" @click="loadOverview">重新加载</button>
    </div>
    <section v-else class="risk-card" aria-labelledby="risk-card-title">
      <header class="risk-card__header">
        <h2 id="risk-card-title">{{ cardData.title }}</h2>
        <button class="view-all" type="button" @click="openDetail({ kind: 'all' })">
          查看全量
          <ChevronRight :size="16" aria-hidden="true" />
        </button>
      </header>

      <div class="risk-total">
        <button
          class="risk-total__number"
          type="button"
          aria-label="查看全部网络风险"
          @click="openDetail({ kind: 'all' })"
        >
          <span>{{ cardData.total }}</span>
          <ArrowUpRight :size="18" aria-hidden="true" />
        </button>
        <p>风险总数 <span>({{ cardData.periodLabel }})</span></p>
        <div class="risk-total__status">
          <button type="button" class="status-link status-link--open" @click="openDetail({ kind: 'status', value: '未关闭' })">
            未关闭 <strong>{{ cardData.open }}</strong>
          </button>
          <span class="status-divider" aria-hidden="true"></span>
          <button type="button" class="status-link status-link--closed" @click="openDetail({ kind: 'status', value: '已关闭' })">
            已关闭 <strong>{{ cardData.closed }}</strong>
          </button>
        </div>
      </div>

      <div class="risk-section">
        <div class="risk-section__title">
          <h3>按风险类型</h3>
          <span>未关闭</span>
        </div>
        <div class="type-list">
          <button
            v-for="(item, index) in cardData.riskTypes"
            :key="item.name"
            class="type-row"
            type="button"
            @click="openDetail({ kind: 'riskType', value: item.name })"
          >
            <span class="type-row__meta">
              <strong>{{ item.name }}</strong>
              <span>{{ item.count }}</span>
            </span>
            <span class="type-row__track">
              <span
                class="type-row__fill"
                :class="`type-row__fill--${index + 1}`"
                :style="{ width: `${Math.max(8, (item.count / cardData.open) * 100)}%` }"
              ></span>
            </span>
          </button>
        </div>
      </div>

      <div class="risk-section risk-section--ne">
        <div class="risk-section__title">
          <h3>按网元类型</h3>
          <span>未关闭</span>
        </div>
        <div class="ne-list">
          <button
            v-for="item in cardData.neTypes"
            :key="item.name"
            class="ne-row"
            type="button"
            @click="openDetail({ kind: 'neType', value: item.name })"
          >
            <span>{{ item.name }}</span>
            <strong>{{ item.count }}</strong>
          </button>
        </div>
      </div>
    </section>

    <RiskDetailModal :open="detailOpen" :filter="activeFilter" @close="detailOpen = false" />
  </section>
</template>

<style scoped>
.risk-overview {
  --line: rgba(161, 193, 196, 0.14);
  --muted: #819397;
  --cyan: #22d3c5;
  --blue: #39a8ff;
  --red: #ff5468;
  --orange: #ffad4f;
  --green: #57d39a;
  width: min(360px, 100%);
}

.risk-overview button { color: inherit; }
.risk-overview button:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }

.overview-state { padding: 48px 24px; text-align: center; color: var(--muted); }
.retry-button { margin-left: 12px; padding: 7px 10px; border: 1px solid rgba(34,211,197,.3); background: rgba(34,211,197,.08); color: var(--cyan); cursor: pointer; }
.retry-button:hover { background: rgba(34,211,197,.15); }

.risk-card { padding: 22px; border: 1px solid var(--line); background: rgba(13,24,28,.94); box-shadow: 0 20px 50px rgba(0,0,0,.22); }
.risk-card__header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
.risk-card__header h2 { margin: 0; color: #f1f8f8; font-size: 18px; }
.view-all { display: flex; align-items: center; gap: 2px; padding: 5px 0; border: 0; background: none; color: #7bcaff; font-size: 12px; cursor: pointer; }
.view-all:hover { color: #b8e5ff; }

.risk-total { padding: 24px 0 22px; text-align: center; }
.risk-total__number { display: inline-flex; align-items: flex-start; gap: 2px; padding: 0 6px; border: 0; background: transparent; cursor: pointer; }
.risk-total__number span { font-size: 46px; font-weight: 700; line-height: 1; }
.risk-total__number svg { margin-top: 5px; color: var(--cyan); }
.risk-total__number:hover span { color: var(--cyan); }
.risk-total > p { margin: 8px 0 14px; color: #bdcbcc; font-size: 13px; }
.risk-total > p span { color: var(--muted); }
.risk-total__status { display: flex; align-items: center; justify-content: center; gap: 15px; }
.status-link { border: 0; background: transparent; font-size: 12px; cursor: pointer; }
.status-link strong { margin-left: 3px; font-size: 14px; }
.status-link--open { color: #ff6577; }
.status-link--closed { color: #49d6a0; }
.status-link:hover { filter: brightness(1.25); }
.status-divider { width: 1px; height: 13px; background: var(--line); }

.risk-section { padding-top: 20px; border-top: 1px solid var(--line); }
.risk-section--ne { margin-top: 24px; }
.risk-section__title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 11px; }
.risk-section__title h3 { margin: 0; font-size: 13px; }
.risk-section__title span { color: var(--muted); font-size: 11px; }
.type-list { display: grid; gap: 8px; }
.type-row { display: block; width: 100%; padding: 9px 7px; border: 1px solid transparent; background: transparent; text-align: left; cursor: pointer; }
.type-row:hover { border-color: rgba(57,168,255,.24); background: rgba(57,168,255,.05); }
.type-row__meta { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; }
.type-row__meta strong { font-weight: 600; }
.type-row__meta > span { color: #dce9ea; font-weight: 700; }
.type-row__track { display: block; width: 100%; height: 5px; overflow: hidden; background: rgba(255,255,255,.07); }
.type-row__fill { display: block; height: 100%; background: var(--blue); box-shadow: 0 0 12px rgba(57,168,255,.45); }
.type-row__fill--2 { background: var(--orange); box-shadow: 0 0 12px rgba(255,173,79,.32); }
.type-row__fill--3 { background: var(--green); box-shadow: 0 0 12px rgba(87,211,154,.28); }
.ne-list { display: grid; }
.ne-row { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 43px; padding: 0 8px; border: 0; border-bottom: 1px solid rgba(161,193,196,.08); background: transparent; font-size: 13px; cursor: pointer; }
.ne-row:hover { padding-left: 12px; color: var(--cyan); background: rgba(34,211,197,.05); }
.ne-row strong { color: #eef6f6; }
</style>
