<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getRiskOverview, getRiskCheckNeDetails } from '../api/risk.js'
import CardTitle from './card-title.vue'

const cardData = ref({ title: '网络风险', periodLabel: '3个月', total: 0, open: 0, closed: 0, riskTypes: [], neTypes: [] })
const overviewLoading = ref(true)
const overviewError = ref('')
const detailOpen = ref(false)
const activeFilter = ref({ kind: 'all' })

// ===== Detail modal state =====
const page = ref(1)
const pageSize = ref(10)
const records = ref([])
const totalCount = ref(0)
const loading = ref(false)
const loadError = ref('')
const openFilter = ref('')
const columnFilters = ref({})
const filterOptions = ref({ neId: [], neType: [], riskName: [], riskType: [], riskLevel: [] })
let requestSequence = 0

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize.value)))
const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, Math.min(page.value - 2, totalPages.value - 4))
  const end = Math.min(totalPages.value, start + 4)
  for (let index = Math.max(1, start); index <= end; index += 1) pages.push(index)
  return pages
})

const levelClass = (level) => ({ 高: 'level--high', 中: 'level--medium', 低: 'level--low' }[level])
const rowNumber = (index) => (page.value - 1) * pageSize.value + index + 1
const isFilterActive = (field) => Boolean(columnFilters.value[field])

const openDetail = (filter) => {
  activeFilter.value = filter
  detailOpen.value = true
}

const requestParams = () => {
  const params = {
    start: (page.value - 1) * pageSize.value,
    limit: pageSize.value,
    risk_status: 'ALL',
    risk_type_code: '',
    ne_type_code: '',
    risk_level_code: columnFilters.value.riskLevel || '',
    ne_id: columnFilters.value.neId || '',
    risk_name: columnFilters.value.riskName || '',
  }

  if (activeFilter.value.kind === 'status') params.risk_status = activeFilter.value.value === '未关闭' ? 'UNCLOSED' : 'CLOSED'
  if (activeFilter.value.kind === 'riskType') {
    params.risk_status = 'UNCLOSED'
    params.risk_type_code = activeFilter.value.value
  }
  if (activeFilter.value.kind === 'neType') {
    params.risk_status = 'UNCLOSED'
    params.ne_type_code = activeFilter.value.value
  }

  if (columnFilters.value.neType) params.ne_type_code = columnFilters.value.neType
  if (columnFilters.value.riskType) params.risk_type_code = columnFilters.value.riskType
  return params
}

const loadDetails = async () => {
  const sequence = ++requestSequence
  loading.value = true
  loadError.value = ''

  try {
    const p = requestParams()
    const response = await getRiskCheckNeDetails(p.start, p.limit, p.risk_status, p.risk_type_code, p.ne_type_code, p.risk_level_code, p.ne_id, p.risk_name)
    if (sequence !== requestSequence) return
    records.value = response.results
    totalCount.value = response.total_count
    filterOptions.value = response.filter_options
  } catch (error) {
    if (sequence !== requestSequence) return
    records.value = []
    totalCount.value = 0
    loadError.value = '风险详情加载失败，请重试。'
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

const changePage = (nextPage) => {
  page.value = Math.min(Math.max(nextPage, 1), totalPages.value)
}

const toggleFilter = (field) => {
  openFilter.value = openFilter.value === field ? '' : field
}

const selectFilter = (field, value) => {
  const nextFilters = { ...columnFilters.value }
  if (value) nextFilters[field] = value
  else delete nextFilters[field]
  page.value = 1
  columnFilters.value = nextFilters
  openFilter.value = ''
}

const closeFilterMenu = () => {
  openFilter.value = ''
}

const resetTableState = () => {
  page.value = 1
  openFilter.value = ''
  columnFilters.value = {}
  records.value = []
  totalCount.value = 0
  filterOptions.value = { neId: [], neType: [], riskName: [], riskType: [], riskLevel: [] }
}

const handleKeydown = (event) => {
  if (!detailOpen.value || event.key !== 'Escape') return
  if (openFilter.value) closeFilterMenu()
  else detailOpen.value = false
}

watch(page, () => {
  if (detailOpen.value) loadDetails()
})

watch(pageSize, () => {
  if (page.value === 1 && detailOpen.value) loadDetails()
  else page.value = 1
})

watch(columnFilters, () => {
  if (detailOpen.value) loadDetails()
}, { deep: true })

watch(activeFilter, () => {
  resetTableState()
  if (detailOpen.value) loadDetails()
}, { deep: true })

watch(detailOpen, (isOpen) => {
  document.body.classList.toggle('modal-open', isOpen)
  if (isOpen) {
    resetTableState()
    loadDetails()
  } else {
    resetTableState()
  }
})

const loadOverview = async () => {
  overviewLoading.value = true
  overviewError.value = ''
  try {
    const data = await getRiskOverview()
    const results = data.results || []
    const riskTypeMap = {}
    const neTypeMap = {}
    let openCount = 0
    let closedCount = 0

    results.forEach((item) => {
      const isClosed = item.riskStatus === '已关闭' || item.riskStatus === 'CLOSED'
      if (isClosed) {
        closedCount += 1
      } else {
        openCount += 1
        if (item.riskType) riskTypeMap[item.riskType] = (riskTypeMap[item.riskType] || 0) + 1
        if (item.neType) neTypeMap[item.neType] = (neTypeMap[item.neType] || 0) + 1
      }
    })

    cardData.value = {
      title: '网络风险',
      periodLabel: `${data.riskTime || 3}个月`,
      total: data.total_count || 0,
      open: openCount,
      closed: closedCount,
      riskTypes: Object.entries(riskTypeMap).map(([name, count]) => ({ name, count })),
      neTypes: Object.entries(neTypeMap).map(([name, count]) => ({ name, count })),
    }
  } catch (error) {
    overviewError.value = '概览数据加载失败'
  } finally {
    overviewLoading.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('click', closeFilterMenu)
  loadOverview()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('click', closeFilterMenu)
  document.body.classList.remove('modal-open')
})
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
        <CardTitle :text="cardData.title" />
        <button class="view-all" type="button" @click="openDetail({ kind: 'all' })">
          查看全量
        </button>
      </header>

      <div class="risk-total">
        <button
            class="risk-total__number"
            type="button"
            aria-label="查看全部网络风险"
            @click="openDetail({ kind: 'all' })"
        >
          <span class="risk-total__value">{{ cardData.total }}</span>
          <span class="risk-total__unit">个</span>
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
          <h3>按风险类型<span class="risk-section__suffix">（未关闭）</span></h3>
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
          <h3>按网元类型<span class="risk-section__suffix">（未关闭）</span></h3>
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

    <!-- Inline detail modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="detailOpen" class="modal-backdrop" role="presentation" @mousedown.self="detailOpen = false">
          <section class="detail-modal" role="dialog" aria-modal="true" aria-label="网络风险详情" :data-loading="loading">
            <header class="detail-modal__header">
              <h2>网络风险详情</h2>
              <button class="icon-button" type="button" aria-label="关闭详情弹窗" title="关闭" @click="detailOpen = false">
                <X :size="21" aria-hidden="true" />
              </button>
            </header>

            <div class="table-shell">
              <table>
                <thead>
                <tr>
                  <th class="number-column">编号</th>
                  <th>网元名称</th>
                  <th class="filterable-header"><span class="header-label">网元ID<button class="filter-button" :class="{ 'filter-button--active': isFilterActive('neId') }" type="button" aria-label="筛选网元ID" title="筛选网元ID" @click.stop="toggleFilter('neId')"><Funnel :size="14" /></button></span><div v-if="openFilter === 'neId'" class="filter-menu" @click.stop><button type="button" :class="{ active: !columnFilters.neId }" @click="selectFilter('neId', '')"><span>全部</span><Check v-if="!columnFilters.neId" :size="14" /></button><button v-for="option in filterOptions.neId" :key="option" type="button" :class="{ active: columnFilters.neId === option }" @click="selectFilter('neId', option)"><span>{{ option }}</span><Check v-if="columnFilters.neId === option" :size="14" /></button></div></th>
                  <th class="filterable-header"><span class="header-label">网元类型<button class="filter-button" :class="{ 'filter-button--active': isFilterActive('neType') }" type="button" aria-label="筛选网元类型" title="筛选网元类型" @click.stop="toggleFilter('neType')"><Funnel :size="14" /></button></span><div v-if="openFilter === 'neType'" class="filter-menu" @click.stop><button type="button" :class="{ active: !columnFilters.neType }" @click="selectFilter('neType', '')"><span>全部</span><Check v-if="!columnFilters.neType" :size="14" /></button><button v-for="option in filterOptions.neType" :key="option" type="button" :class="{ active: columnFilters.neType === option }" @click="selectFilter('neType', option)"><span>{{ option }}</span><Check v-if="columnFilters.neType === option" :size="14" /></button></div></th>
                  <th class="filterable-header"><span class="header-label">风险名称<button class="filter-button" :class="{ 'filter-button--active': isFilterActive('riskName') }" type="button" aria-label="筛选风险名称" title="筛选风险名称" @click.stop="toggleFilter('riskName')"><Funnel :size="14" /></button></span><div v-if="openFilter === 'riskName'" class="filter-menu filter-menu--wide" @click.stop><button type="button" :class="{ active: !columnFilters.riskName }" @click="selectFilter('riskName', '')"><span>全部</span><Check v-if="!columnFilters.riskName" :size="14" /></button><button v-for="option in filterOptions.riskName" :key="option" type="button" :class="{ active: columnFilters.riskName === option }" @click="selectFilter('riskName', option)"><span>{{ option }}</span><Check v-if="columnFilters.riskName === option" :size="14" /></button></div></th>
                  <th class="filterable-header"><span class="header-label">风险类型<button class="filter-button" :class="{ 'filter-button--active': isFilterActive('riskType') }" type="button" aria-label="筛选风险类型" title="筛选风险类型" @click.stop="toggleFilter('riskType')"><Funnel :size="14" /></button></span><div v-if="openFilter === 'riskType'" class="filter-menu" @click.stop><button type="button" :class="{ active: !columnFilters.riskType }" @click="selectFilter('riskType', '')"><span>全部</span><Check v-if="!columnFilters.riskType" :size="14" /></button><button v-for="option in filterOptions.riskType" :key="option" type="button" :class="{ active: columnFilters.riskType === option }" @click="selectFilter('riskType', option)"><span>{{ option }}</span><Check v-if="columnFilters.riskType === option" :size="14" /></button></div></th>
                  <th class="filterable-header"><span class="header-label">风险等级<button class="filter-button" :class="{ 'filter-button--active': isFilterActive('riskLevel') }" type="button" aria-label="筛选风险等级" title="筛选风险等级" @click.stop="toggleFilter('riskLevel')"><Funnel :size="14" /></button></span><div v-if="openFilter === 'riskLevel'" class="filter-menu" @click.stop><button type="button" :class="{ active: !columnFilters.riskLevel }" @click="selectFilter('riskLevel', '')"><span>全部</span><Check v-if="!columnFilters.riskLevel" :size="14" /></button><button v-for="option in filterOptions.riskLevel" :key="option" type="button" :class="{ active: columnFilters.riskLevel === option }" @click="selectFilter('riskLevel', option)"><span>{{ option }}</span><Check v-if="columnFilters.riskLevel === option" :size="14" /></button></div></th>
                  <th>解决措施</th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="loading"><td class="empty-cell" colspan="8">正在加载风险详情...</td></tr>
                <tr v-else-if="loadError"><td class="empty-cell" colspan="8"><span>{{ loadError }}</span><button class="retry-button" type="button" @click="loadDetails">重新加载</button></td></tr>
                <tr v-else v-for="(item, index) in records" :key="item.id">
                  <td class="number-cell">{{ rowNumber(index) }}</td>
                  <td><strong>{{ item.neName }}</strong></td>
                  <td class="mono">{{ item.neId }}</td><td>{{ item.neType }}</td><td>{{ item.riskName }}</td><td>{{ item.riskType }}</td>
                  <td><span class="level" :class="levelClass(item.riskLevel)">{{ item.riskLevel }}</span></td><td><span class="solution" :title="item.solution">{{ item.solution }}</span></td>
                </tr>
                <tr v-if="!loading && !loadError && records.length === 0"><td class="empty-cell" colspan="8">当前筛选条件下暂无风险</td></tr>
                </tbody>
              </table>
            </div>

            <footer v-if="totalCount && !loading" class="pagination">
              <div class="pagination__total">共 <strong>{{ totalCount }}</strong> 条</div>
              <label><span class="sr-only">每页条数</span><select v-model="pageSize"><option :value="10">10条/页</option><option :value="15">15条/页</option><option :value="20">20条/页</option></select></label>
              <button class="page-button" type="button" :disabled="page === 1" aria-label="上一页" @click="changePage(page - 1)"><ChevronLeft :size="17" /></button>
              <button v-for="pageNumber in visiblePages" :key="pageNumber" class="page-button" :class="{ 'page-button--active': pageNumber === page }" type="button" @click="changePage(pageNumber)">{{ pageNumber }}</button>
              <button class="page-button" type="button" :disabled="page === totalPages" aria-label="下一页" @click="changePage(page + 1)"><ChevronRight :size="17" /></button>
            </footer>
          </section>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
:global(:root.dark) {
  --risk-overview-card-bgc: rgba(243, 243, 243, 0.1);
  --risk-overview-number-color: rgba(245, 245, 245, 1);
  --risk-overview-label-color: rgba(201, 201, 201, 1);
  --risk-overview-type-name-color: rgba(255, 255, 255, 1);
  --risk-overview-border-color: rgba(161, 193, 196, 0.14);
  --risk-overview-row-border-color: transparent;
  --risk-overview-row-hover-border-color: rgba(57, 168, 255, 0.24);
  --risk-overview-row-hover-bgc: rgba(57, 168, 255, 0.05);
  --risk-overview-view-all-color: #7bcaff;
  --risk-overview-status-open-color: #ff6577;
  --risk-overview-status-closed-color: #49d6a0;
  --risk-overview-bar-blue: #39a8ff;
  --risk-overview-bar-orange: #ffad4f;
  --risk-overview-bar-green: #57d39a;
  --risk-overview-track-bgc: rgba(255, 255, 255, 0.07);
  --risk-overview-accent-color: #22d3c5;
  --risk-overview-modal-overlay-bgc: rgba(2, 8, 10, 0.76);
  --risk-overview-modal-bgc: #0e191d;
  --risk-overview-modal-panel-bgc: #111f23;
  --risk-overview-modal-th-bgc: #152428;
  --risk-overview-modal-border-color: rgba(161, 193, 196, 0.14);
  --risk-overview-modal-hover-bgc: rgba(34, 211, 197, 0.035);
  --risk-overview-modal-select-bgc: #0d181c;
  --risk-overview-modal-select-color: #cbd7d8;
  --risk-overview-modal-page-text-color: #94a7aa;
  --risk-overview-modal-page-active-bgc: #1675a7;
  --risk-overview-level-high-color: #ff7685;
  --risk-overview-level-high-border: rgba(255, 84, 104, 0.34);
  --risk-overview-level-high-bgc: rgba(255, 84, 104, 0.11);
  --risk-overview-level-medium-color: #ffc16e;
  --risk-overview-level-medium-border: rgba(255, 173, 79, 0.34);
  --risk-overview-level-medium-bgc: rgba(255, 173, 79, 0.1);
  --risk-overview-level-low-color: #49e0d4;
  --risk-overview-level-low-border: rgba(34, 211, 197, 0.34);
  --risk-overview-level-low-bgc: rgba(34, 211, 197, 0.1);
}

:global(:root.light) {
  --risk-overview-card-bgc: rgba(255, 255, 255, 1);
  --risk-overview-number-color: rgba(30, 30, 30, 1);
  --risk-overview-label-color: rgba(98, 98, 98, 1);
  --risk-overview-type-name-color: rgba(98, 98, 98, 1);
  --risk-overview-border-color: rgba(161, 193, 196, 0.14);
  --risk-overview-row-border-color: rgba(220, 220, 220, 1);
  --risk-overview-row-hover-border-color: rgba(57, 168, 255, 0.24);
  --risk-overview-row-hover-bgc: rgba(57, 168, 255, 0.05);
  --risk-overview-view-all-color: rgba(0, 103, 209, 1);
  --risk-overview-status-open-color: #ff6577;
  --risk-overview-status-closed-color: #49d6a0;
  --risk-overview-bar-blue: #39a8ff;
  --risk-overview-bar-orange: #ffad4f;
  --risk-overview-bar-green: #57d39a;
  --risk-overview-track-bgc: rgba(255, 255, 255, 0.07);
  --risk-overview-accent-color: #22d3c5;
  --risk-overview-modal-overlay-bgc: rgba(0, 0, 0, 0.4);
  --risk-overview-modal-bgc: #ffffff;
  --risk-overview-modal-panel-bgc: #f5f7f8;
  --risk-overview-modal-th-bgc: #f0f3f4;
  --risk-overview-modal-border-color: rgba(0, 0, 0, 0.1);
  --risk-overview-modal-hover-bgc: rgba(0, 103, 209, 0.04);
  --risk-overview-modal-select-bgc: #ffffff;
  --risk-overview-modal-select-color: #2d3e41;
  --risk-overview-modal-page-text-color: #5a6c6e;
  --risk-overview-modal-page-active-bgc: rgba(0, 103, 209, 1);
  --risk-overview-level-high-color: #ff7685;
  --risk-overview-level-high-border: rgba(255, 84, 104, 0.34);
  --risk-overview-level-high-bgc: rgba(255, 84, 104, 0.11);
  --risk-overview-level-medium-color: #ffc16e;
  --risk-overview-level-medium-border: rgba(255, 173, 79, 0.34);
  --risk-overview-level-medium-bgc: rgba(255, 173, 79, 0.1);
  --risk-overview-level-low-color: #49e0d4;
  --risk-overview-level-low-border: rgba(34, 211, 197, 0.34);
  --risk-overview-level-low-bgc: rgba(34, 211, 197, 0.1);
}

.risk-overview {
  width: min(360px, 100%);
  height: 100%;
}

.risk-overview button { color: inherit; }
.risk-overview button:focus-visible { outline: 2px solid var(--risk-overview-accent-color); outline-offset: 2px; }

.overview-state { padding: 48px 24px; text-align: center; color: var(--risk-overview-label-color); }
.retry-button { margin-left: 12px; padding: 7px 10px; border: 1px solid rgba(34, 211, 197, .3); background: rgba(34, 211, 197, .08); color: var(--risk-overview-accent-color); cursor: pointer; }
.retry-button:hover { background: rgba(34, 211, 197, .15); }

.risk-card { height: 100%; padding: 22px; border: 1px solid var(--risk-overview-border-color); background: var(--risk-overview-card-bgc); box-shadow: 0 20px 50px rgba(0, 0, 0, .22); }
.risk-card__header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 18px; border-bottom: 1px solid var(--risk-overview-border-color); }
.risk-overview .view-all { display: flex; align-items: center; gap: 2px; padding: 5px 0; border: 0; background: none; color: var(--risk-overview-view-all-color); font-size: 12px; cursor: pointer; }
.risk-overview .view-all:hover { color: #7bcaff; }

.risk-total { padding: 24px 0 22px; text-align: center; }
.risk-total__number { display: inline-flex; align-items: flex-start; gap: 2px; padding: 0 6px; border: 0; background: transparent; cursor: pointer; }
.risk-total__value { font-size: 46px; font-weight: 700; line-height: 1; color: var(--risk-overview-number-color); }
.risk-total__number:hover .risk-total__value { color: var(--risk-overview-accent-color); }
.risk-total__unit { font-family: "Microsoft YaHei"; font-size: 12px; font-weight: 400; line-height: 20px; letter-spacing: 0; color: var(--risk-overview-label-color); align-self: flex-end; }
.risk-total > p { margin: 8px 0 14px; font-family: "Microsoft YaHei"; font-size: 12px; font-weight: 400; line-height: 20px; letter-spacing: 0; color: var(--risk-overview-label-color); }
.risk-total > p span { color: inherit; }
.risk-total__status { display: flex; align-items: center; justify-content: center; gap: 15px; }
.status-link { border: 0; background: transparent; font-size: 12px; cursor: pointer; }
.status-link strong { margin-left: 3px; font-size: 14px; }
.risk-overview .status-link--open { color: var(--risk-overview-status-open-color); }
.risk-overview .status-link--closed { color: var(--risk-overview-status-closed-color); }
.status-link:hover { filter: brightness(1.25); }
.status-divider { width: 1px; height: 13px; background: var(--risk-overview-border-color); }
.risk-section { padding-top: 20px; border-top: 1px solid var(--risk-overview-border-color); }
.risk-section--ne { margin-top: 24px; }
.risk-section__title { display: flex; align-items: center; margin-bottom: 11px; }
.risk-section__title h3 { margin: 0; font-family: "Microsoft YaHei"; font-size: 12px; font-weight: 400; line-height: 20px; letter-spacing: 0; color: var(--risk-overview-label-color); }
.risk-section__suffix { font-family: "Microsoft YaHei"; font-size: 12px; font-weight: 400; line-height: 20px; letter-spacing: 0; color: var(--risk-overview-label-color); }
.type-list { display: grid; gap: 8px; }
.type-row { display: block; width: 100%; padding: 9px 7px; border: 1px solid var(--risk-overview-row-border-color); border-radius: 8px; background: transparent; text-align: left; cursor: pointer; }
.type-row:hover { border-color: var(--risk-overview-row-hover-border-color); background: var(--risk-overview-row-hover-bgc); }
.type-row__meta { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; }
.type-row__meta strong { font-weight: 600; color: var(--risk-overview-type-name-color); }
.type-row__meta > span { color: var(--risk-overview-number-color); font-weight: 700; }
.type-row__track { display: block; width: 100%; height: 5px; overflow: hidden; background: var(--risk-overview-track-bgc); }
.type-row__fill { display: block; height: 100%; background: var(--risk-overview-bar-blue); box-shadow: 0 0 12px rgba(57, 168, 255, .45); }
.type-row__fill--2 { background: var(--risk-overview-bar-orange); box-shadow: 0 0 12px rgba(255, 173, 79, .32); }
.type-row__fill--3 { background: var(--risk-overview-bar-green); box-shadow: 0 0 12px rgba(87, 211, 154, .28); }
.ne-list { display: grid; gap: 8px; }
.risk-overview .ne-row { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 43px; padding: 0 8px; border: 1px solid var(--risk-overview-row-border-color); border-radius: 8px; background: transparent; font-size: 13px; color: var(--risk-overview-type-name-color); cursor: pointer; }
.risk-overview .ne-row:hover { padding-left: 12px; color: var(--risk-overview-accent-color); border-color: var(--risk-overview-row-hover-border-color); background: var(--risk-overview-row-hover-bgc); }
.risk-overview .ne-row strong { color: var(--risk-overview-number-color); }
.icon-button :deep(svg), .filter-button :deep(svg) { fill: currentColor; }

/* Modal styles */
.modal-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 28px;
  background: var(--risk-overview-modal-overlay-bgc);
  backdrop-filter: blur(6px);
}

.modal-backdrop button, .modal-backdrop select { font: inherit; }
.modal-backdrop button { color: inherit; }
.modal-backdrop button:focus-visible, .modal-backdrop select:focus-visible { outline: 2px solid var(--risk-overview-accent-color); outline-offset: 2px; }

.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

.detail-modal { width: min(1320px, 96vw); max-height: min(820px, 92vh); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--risk-overview-modal-border-color); background: var(--risk-overview-modal-bgc); box-shadow: 0 30px 90px rgba(0, 0, 0, .2); }
.detail-modal__header { display: flex; justify-content: space-between; align-items: center; padding: 20px 26px; border-bottom: 1px solid var(--risk-overview-modal-border-color); background: var(--risk-overview-modal-panel-bgc); }
.detail-modal__header h2 { margin: 0; font-size: 21px; color: var(--risk-overview-number-color); }
.icon-button { width: 36px; height: 36px; display: grid; place-items: center; flex: 0 0 auto; padding: 0; border: 1px solid var(--risk-overview-modal-border-color); background: transparent; color: var(--risk-overview-number-color); cursor: pointer; }
.icon-button:hover { color: var(--risk-overview-number-color); border-color: var(--risk-overview-modal-border-color); background: var(--risk-overview-modal-hover-bgc); }
.table-shell { min-height: 0; overflow: auto; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th { position: sticky; top: 0; z-index: 2; padding: 15px 14px; border-bottom: 1px solid var(--risk-overview-modal-border-color); background: var(--risk-overview-modal-th-bgc); color: var(--risk-overview-number-color); font-size: 12px; text-align: left; white-space: nowrap; }
td { height: 58px; padding: 12px 14px; border-bottom: 1px solid var(--risk-overview-modal-border-color); color: var(--risk-overview-number-color); font-size: 13px; vertical-align: middle; }
tbody tr:hover td { background: var(--risk-overview-modal-hover-bgc); }
th:nth-child(1) { width: 6%; } th:nth-child(2) { width: 12%; } th:nth-child(3) { width: 13%; } th:nth-child(4) { width: 9%; } th:nth-child(5) { width: 16%; } th:nth-child(6) { width: 10%; } th:nth-child(7) { width: 9%; } th:nth-child(8) { width: 25%; }
.number-column, .number-cell { text-align: center; }
.number-cell { color: var(--risk-overview-number-color); font-variant-numeric: tabular-nums; }
.filterable-header { z-index: 4; }
.header-label { display: inline-flex; align-items: center; gap: 3px; }
.filter-button { width: 26px; height: 26px; display: inline-grid; place-items: center; padding: 0; border: 1px solid transparent; background: transparent; color: var(--risk-overview-number-color); cursor: pointer; }
.filter-button:hover { color: var(--risk-overview-number-color); border-color: var(--risk-overview-modal-border-color); background: var(--risk-overview-modal-hover-bgc); }
.filter-button--active { color: var(--risk-overview-accent-color); border-color: rgba(34, 211, 197, .3); background: rgba(34, 211, 197, .08); }
.filter-menu { position: absolute; z-index: 20; top: calc(100% + 5px); left: 10px; width: max-content; min-width: 150px; max-width: 250px; max-height: 280px; overflow-y: auto; padding: 5px; border: 1px solid var(--risk-overview-modal-border-color); background: var(--risk-overview-modal-bgc); box-shadow: 0 14px 36px rgba(0, 0, 0, .15); }
.filter-menu--wide { min-width: 210px; }
.filter-menu button { width: 100%; min-height: 34px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 9px; border: 0; background: transparent; color: var(--risk-overview-number-color); text-align: left; white-space: nowrap; cursor: pointer; }
.filter-menu button:hover { background: var(--risk-overview-modal-hover-bgc); color: var(--risk-overview-number-color); }
.filter-menu button.active { color: var(--risk-overview-accent-color); background: rgba(34, 211, 197, .08); }
.filter-menu button span { overflow: hidden; text-overflow: ellipsis; }
.mono { color: var(--risk-overview-number-color); font-family: "Cascadia Code", Consolas, monospace; font-size: 12px; }
.level { display: inline-flex; min-width: 30px; height: 24px; align-items: center; justify-content: center; border: 1px solid; font-weight: 700; font-size: 11px; }
.level--high { color: var(--risk-overview-level-high-color); border-color: var(--risk-overview-level-high-border); background: var(--risk-overview-level-high-bgc); }
.level--medium { color: var(--risk-overview-level-medium-color); border-color: var(--risk-overview-level-medium-border); background: var(--risk-overview-level-medium-bgc); }
.level--low { color: var(--risk-overview-level-low-color); border-color: var(--risk-overview-level-low-border); background: var(--risk-overview-level-low-bgc); }
.solution { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-height: 1.55; }
.empty-cell { height: 220px; color: var(--risk-overview-number-color); text-align: center; }
.retry-button { margin-left: 12px; padding: 7px 10px; border: 1px solid rgba(34, 211, 197, .3); background: rgba(34, 211, 197, .08); color: var(--risk-overview-accent-color); cursor: pointer; }
.retry-button:hover { background: rgba(34, 211, 197, .15); }
.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 7px; padding: 16px 24px; border-top: 1px solid var(--risk-overview-modal-border-color); background: var(--risk-overview-modal-panel-bgc); }
.pagination__total { margin-right: 5px; color: var(--risk-overview-number-color); font-size: 12px; }
.pagination__total strong { color: var(--risk-overview-number-color); }
.pagination select { height: 34px; padding: 0 28px 0 10px; border: 1px solid var(--risk-overview-modal-border-color); background: var(--risk-overview-modal-select-bgc); color: var(--risk-overview-modal-select-color); font-size: 12px; }
.page-button { min-width: 34px; height: 34px; display: grid; place-items: center; padding: 0 9px; border: 1px solid transparent; background: transparent; color: var(--risk-overview-modal-page-text-color); cursor: pointer; }
.page-button:hover:not(:disabled) { border-color: var(--risk-overview-modal-border-color); color: var(--risk-overview-number-color); }
.page-button--active { color: #fff; border-color: transparent; background: var(--risk-overview-modal-page-active-bgc); }
.page-button:disabled { opacity: .3; cursor: not-allowed; }

.modal-enter-active, .modal-leave-active { transition: opacity .2s ease; }
.modal-enter-active .detail-modal, .modal-leave-active .detail-modal { transition: transform .2s ease, opacity .2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .detail-modal, .modal-leave-to .detail-modal { opacity: 0; transform: translateY(12px) scale(.99); }

@media (max-width: 620px) {
  .detail-modal__header { padding: 18px; }
  .detail-modal__header h2 { font-size: 17px; }
  .table-shell { overflow-x: auto; }
  table { min-width: 1050px; }
  .modal-backdrop { padding: 14px; place-items: stretch; }
  .detail-modal { width: 100%; max-height: calc(100vh - 28px); margin: auto 0; }
  .pagination { justify-content: center; padding: 13px 10px; }
  .pagination__total { display: none; }
}
</style>

<style>
body.modal-open { overflow: hidden; }
</style>
