<script setup>
import { onMounted, ref } from 'vue'
import RiskDetailModal from './components/RiskDetailModal.vue'
import RiskOverviewCard from './components/RiskOverviewCard.vue'
import { getRiskOverview } from './api/api.js'

const detailOpen = ref(false)
const activeFilter = ref({ kind: 'all' })
const cardData = ref({ title: '网络风险', periodLabel: '3个月', total: 0, open: 0, closed: 0, riskTypes: [], neTypes: [] })
const overviewLoading = ref(true)
const overviewError = ref('')

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
  <main class="app-shell">
    <section class="workspace">
      <div v-if="overviewLoading" class="overview-state">正在加载风险概览...</div>
      <div v-else-if="overviewError" class="overview-state">
        <span>{{ overviewError }}</span>
        <button class="retry-button" type="button" @click="loadOverview">重新加载</button>
      </div>
      <RiskOverviewCard v-else :data="cardData" @select="openDetail" />
    </section>

    <RiskDetailModal :open="detailOpen" :filter="activeFilter" @close="detailOpen = false" />
  </main>
</template>
