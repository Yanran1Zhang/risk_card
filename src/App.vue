<script setup>
import { ref } from 'vue'
import { Activity, Clock3, Database, RadioTower } from 'lucide-vue-next'
import RiskDetailModal from './components/RiskDetailModal.vue'
import RiskOverviewCard from './components/RiskOverviewCard.vue'
import { cardData } from './mock/riskData.js'

const detailOpen = ref(false)
const activeFilter = ref({ kind: 'all', label: '网络风险详情' })
const toastVisible = ref(false)
let toastTimer

const openDetail = (filter) => {
  activeFilter.value = filter
  detailOpen.value = true
}

const showViewAllMessage = () => {
  toastVisible.value = true
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toastVisible.value = false }, 2200)
}
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand__mark"><RadioTower :size="22" aria-hidden="true" /></span>
        <span>NetCare Edge</span>
      </div>
      <div class="topbar__meta">
        <span><span class="status-dot"></span>云地协同在线</span>
        <span>沙特区域 · 5G核心网</span>
      </div>
    </header>

    <section class="page-heading">
      <div>
        <p class="eyebrow">风险快排 / 日常运行态</p>
        <h1>网络风险监控</h1>
        <p class="page-heading__subtitle">聚焦近3个月现网扫描结果，提前识别并推动风险整改。</p>
      </div>
      <div class="scan-status">
        <Clock3 :size="17" aria-hidden="true" />
        最近扫描：2026-08-05 11:20
      </div>
    </section>

    <section class="workspace">
      <RiskOverviewCard :data="cardData" @select="openDetail" @view-all="showViewAllMessage" />

      <section class="network-stage" aria-label="现网态势概览">
        <div class="stage-grid"></div>
        <div class="stage-content">
          <div class="stage-heading">
            <div>
              <p class="eyebrow">CURRENT NETWORK</p>
              <h2>现网态势概览</h2>
            </div>
            <span class="live-tag"><span></span>实时同步</span>
          </div>

          <div class="metric-row">
            <article>
              <Database :size="19" aria-hidden="true" />
              <span>纳管网元</span>
              <strong>128</strong>
            </article>
            <article>
              <Activity :size="19" aria-hidden="true" />
              <span>运行健康度</span>
              <strong>96.8%</strong>
            </article>
            <article>
              <RadioTower :size="19" aria-hidden="true" />
              <span>本次扫描</span>
              <strong>128/128</strong>
            </article>
          </div>

          <div class="network-lines" aria-hidden="true">
            <span class="node node--1"></span>
            <span class="node node--2"></span>
            <span class="node node--3"></span>
            <span class="node node--4"></span>
            <span class="network-line network-line--1"></span>
            <span class="network-line network-line--2"></span>
            <span class="network-line network-line--3"></span>
          </div>
        </div>
      </section>
    </section>

    <RiskDetailModal :open="detailOpen" :filter="activeFilter" @close="detailOpen = false" />

    <Transition name="toast">
      <div v-if="toastVisible" class="toast" role="status">全网风险详情页面为独立页面，本演示聚焦卡片与弹窗交互。</div>
    </Transition>
  </main>
</template>
