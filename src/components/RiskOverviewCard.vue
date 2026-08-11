<script setup>
import { ArrowUpRight, ChevronRight } from 'lucide-vue-next'

defineProps({
  data: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['select'])

const select = (filter) => emit('select', filter)
</script>

<template>
  <section class="risk-card" aria-labelledby="risk-card-title">
    <header class="risk-card__header">
      <h2 id="risk-card-title">{{ data.title }}</h2>
      <button class="view-all" type="button" @click="select({ kind: 'all' })">
        查看全量
        <ChevronRight :size="16" aria-hidden="true" />
      </button>
    </header>

    <div class="risk-total">
      <button
        class="risk-total__number"
        type="button"
        aria-label="查看全部网络风险"
        @click="select({ kind: 'all' })"
      >
        <span>{{ data.total }}</span>
        <ArrowUpRight :size="18" aria-hidden="true" />
      </button>
      <p>风险总数 <span>({{ data.periodLabel }})</span></p>
      <div class="risk-total__status">
        <button type="button" class="status-link status-link--open" @click="select({ kind: 'status', value: '未关闭' })">
          未关闭 <strong>{{ data.open }}</strong>
        </button>
        <span class="status-divider" aria-hidden="true"></span>
        <button type="button" class="status-link status-link--closed" @click="select({ kind: 'status', value: '已关闭' })">
          已关闭 <strong>{{ data.closed }}</strong>
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
          v-for="(item, index) in data.riskTypes"
          :key="item.name"
          class="type-row"
          type="button"
          @click="select({ kind: 'riskType', value: item.name })"
        >
          <span class="type-row__meta">
            <strong>{{ item.name }}</strong>
            <span>{{ item.count }}</span>
          </span>
          <span class="type-row__track">
            <span
              class="type-row__fill"
              :class="`type-row__fill--${index + 1}`"
              :style="{ width: `${Math.max(8, (item.count / data.open) * 100)}%` }"
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
          v-for="item in data.neTypes"
          :key="item.name"
          class="ne-row"
          type="button"
          @click="select({ kind: 'neType', value: item.name })"
        >
          <span>{{ item.name }}</span>
          <strong>{{ item.count }}</strong>
        </button>
      </div>
    </div>
  </section>
</template>
