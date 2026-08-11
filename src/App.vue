<script setup>
import { ref } from 'vue'
import RiskDetailModal from './components/RiskDetailModal.vue'
import RiskOverviewCard from './components/RiskOverviewCard.vue'
import { cardData } from './mock/riskData.js'

const detailOpen = ref(false)
const activeFilter = ref({ kind: 'all' })

const openDetail = (filter) => {
  activeFilter.value = filter
  detailOpen.value = true
}
</script>

<template>
  <main class="app-shell">
    <section class="workspace">
      <RiskOverviewCard :data="cardData" @select="openDetail" />
    </section>

    <RiskDetailModal :open="detailOpen" :filter="activeFilter" @close="detailOpen = false" />
  </main>
</template>
