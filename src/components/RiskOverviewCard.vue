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
.risk-overview {
  --line: rgba(161, 193, 196, 0.14);
  --muted: #819397;
  --cyan: #22d3c5;
  --blue: #39a8ff;
  --red: #ff5468;
  --orange: #ffad4f;
  --green: #57d39a;
  --card-bg: rgba(255, 255, 255, 1);
  --label-color: rgba(98, 98, 98, 1);
  --count-color: #000000;
  --row-border: rgba(220, 220, 220, 1);
  --row-hover-border: rgba(57,168,255,.24);
  --row-hover-bg: rgba(57,168,255,.05);
  width: min(360px, 100%);
}

@media (prefers-color-scheme: dark) {
  .risk-overview {
    --card-bg: rgba(243, 243, 243, 0.1);
    --count-color: #eef6f6;
    --row-border: transparent;
  }
}

.risk-overview button { color: inherit; }
.risk-overview button:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }

.overview-state { padding: 48px 24px; text-align: center; color: var(--muted); }
.retry-button { margin-left: 12px; padding: 7px 10px; border: 1px solid rgba(34,211,197,.3); background: rgba(34,211,197,.08); color: var(--cyan); cursor: pointer; }
.retry-button:hover { background: rgba(34,211,197,.15); }

.risk-card { padding: 22px; border: 1px solid var(--line); background: var(--card-bg); box-shadow: 0 20px 50px rgba(0,0,0,.22); }
.risk-card__header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
.risk-overview .view-all { display: flex; align-items: center; gap: 2px; padding: 5px 0; border: 0; background: none; color: rgba(0, 103, 209, 1); font-size: 12px; cursor: pointer; }
.risk-overview .view-all:hover { color: #7bcaff; }

.risk-total { padding: 24px 0 22px; text-align: center; }
.risk-total__number { display: inline-flex; align-items: flex-start; gap: 2px; padding: 0 6px; border: 0; background: transparent; cursor: pointer; }
.risk-total__value { font-size: 46px; font-weight: 700; line-height: 1; }
.risk-total__number:hover .risk-total__value { color: var(--cyan); }
.risk-total__unit { font-family: "Microsoft YaHei"; font-size: 12px; font-weight: 400; line-height: 20px; letter-spacing: 0; color: var(--label-color); align-self: flex-end; }
.risk-total > p { margin: 8px 0 14px; font-family: "Microsoft YaHei"; font-size: 12px; font-weight: 400; line-height: 20px; letter-spacing: 0; color: var(--label-color); }
.risk-total > p span { color: inherit; }
.risk-total__status { display: flex; align-items: center; justify-content: center; gap: 15px; }
.status-link { border: 0; background: transparent; font-size: 12px; cursor: pointer; }
.status-link strong { margin-left: 3px; font-size: 14px; }
.risk-overview .status-link--open { color: #ff6577; }
.risk-overview .status-link--closed { color: #49d6a0; }
.status-link:hover { filter: brightness(1.25); }
.status-divider { width: 1px; height: 13px; background: var(--line); }
.risk-section { padding-top: 20px; border-top: 1px solid var(--line); }
.risk-section--ne { margin-top: 24px; }
.risk-section__title { display: flex; align-items: center; margin-bottom: 11px; }
.risk-section__title h3 { margin: 0; font-family: "Microsoft YaHei"; font-size: 12px; font-weight: 400; line-height: 20px; letter-spacing: 0; color: var(--label-color); }
.risk-section__suffix { font-family: "Microsoft YaHei"; font-size: 12px; font-weight: 400; line-height: 20px; letter-spacing: 0; color: var(--label-color); }
.type-list { display: grid; gap: 8px; }
.type-row { display: block; width: 100%; padding: 9px 7px; border: 1px solid var(--row-border); border-radius: 8px; background: transparent; text-align: left; cursor: pointer; }
.type-row:hover { border-color: var(--row-hover-border); background: var(--row-hover-bg); }
.type-row__meta { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; }
.type-row__meta strong { font-weight: 600; }
.type-row__meta > span { color: var(--count-color); font-weight: 700; }
.type-row__track { display: block; width: 100%; height: 5px; overflow: hidden; background: rgba(255,255,255,.07); }
.type-row__fill { display: block; height: 100%; background: var(--blue); box-shadow: 0 0 12px rgba(57,168,255,.45); }
.type-row__fill--2 { background: var(--orange); box-shadow: 0 0 12px rgba(255,173,79,.32); }
.type-row__fill--3 { background: var(--green); box-shadow: 0 0 12px rgba(87,211,154,.28); }
.ne-list { display: grid; gap: 8px; }
.ne-row { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 43px; padding: 0 8px; border: 1px solid var(--row-border); border-radius: 8px; background: transparent; font-size: 13px; cursor: pointer; }
.ne-row:hover { padding-left: 12px; color: var(--cyan); border-color: var(--row-hover-border); background: var(--row-hover-bg); }
.ne-row strong { color: var(--count-color); }

/* Modal styles */
.modal-backdrop {
  --line: rgba(161, 193, 196, 0.14);
  --muted: #819397;
  --cyan: #22d3c5;
  --blue: #39a8ff;
  --modal-overlay: rgba(0, 0, 0, 0.4);
  --modal-bg: #ffffff;
  --modal-panel-bg: #f5f7f8;
  --modal-th-bg: #f0f3f4;
  --modal-th-color: #4a5c5f;
  --modal-td-color: #2d3e41;
  --modal-border: rgba(0, 0, 0, 0.1);
  --modal-hover-bg: rgba(0, 103, 209, 0.04);
  --modal-text: #1a2a2c;
  --modal-muted-text: #6a7c7e;
  --modal-icon-color: #000000;
  --modal-select-bg: #ffffff;
  --modal-select-color: #2d3e41;
  --modal-page-text: #5a6c6e;
  --modal-page-active-bg: rgba(0, 103, 209, 1);
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 28px;
  background: var(--modal-overlay);
  backdrop-filter: blur(6px);
}

@media (prefers-color-scheme: dark) {
  .modal-backdrop {
    --modal-overlay: rgba(2,8,10,.76);
    --modal-bg: #0e191d;
    --modal-panel-bg: #111f23;
    --modal-th-bg: #152428;
    --modal-th-color: #a9bbbd;
    --modal-td-color: #cdd9da;
    --modal-border: rgba(161, 193, 196, 0.14);
    --modal-hover-bg: rgba(34,211,197,.035);
    --modal-text: #f0f7f7;
    --modal-muted-text: #819397;
    --modal-icon-color: #a9b8ba;
    --modal-select-bg: #0d181c;
    --modal-select-color: #cbd7d8;
    --modal-page-text: #94a7aa;
    --modal-page-active-bg: #1675a7;
  }
}

.modal-backdrop button, .modal-backdrop select { font: inherit; }
.modal-backdrop button { color: inherit; }
.modal-backdrop button:focus-visible, .modal-backdrop select:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }

.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

.detail-modal { width: min(1320px, 96vw); max-height: min(820px, 92vh); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--modal-border); background: var(--modal-bg); box-shadow: 0 30px 90px rgba(0,0,0,.2); }
.detail-modal__header { display: flex; justify-content: space-between; align-items: center; padding: 20px 26px; border-bottom: 1px solid var(--modal-border); background: var(--modal-panel-bg); }
.detail-modal__header h2 { margin: 0; font-size: 21px; color: var(--modal-text); }
.icon-button { width: 36px; height: 36px; display: grid; place-items: center; flex: 0 0 auto; padding: 0; border: 1px solid var(--modal-border); background: transparent; color: var(--modal-icon-color); cursor: pointer; }
.icon-button:hover { color: var(--modal-text); border-color: var(--modal-border); background: var(--modal-hover-bg); }
.table-shell { min-height: 0; overflow: auto; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th { position: sticky; top: 0; z-index: 2; padding: 15px 14px; border-bottom: 1px solid var(--modal-border); background: var(--modal-th-bg); color: var(--modal-th-color); font-size: 12px; text-align: left; white-space: nowrap; }
td { height: 58px; padding: 12px 14px; border-bottom: 1px solid var(--modal-border); color: var(--modal-td-color); font-size: 13px; vertical-align: middle; }
tbody tr:hover td { background: var(--modal-hover-bg); }
th:nth-child(1) { width: 6%; } th:nth-child(2) { width: 12%; } th:nth-child(3) { width: 13%; } th:nth-child(4) { width: 9%; } th:nth-child(5) { width: 16%; } th:nth-child(6) { width: 10%; } th:nth-child(7) { width: 9%; } th:nth-child(8) { width: 25%; }
.number-column, .number-cell { text-align: center; }
.number-cell { color: var(--modal-muted-text); font-variant-numeric: tabular-nums; }
.filterable-header { z-index: 4; }
.header-label { display: inline-flex; align-items: center; gap: 3px; }
.filter-button { width: 26px; height: 26px; display: inline-grid; place-items: center; padding: 0; border: 1px solid transparent; background: transparent; color: var(--modal-icon-color); cursor: pointer; }
.filter-button:hover { color: var(--modal-th-color); border-color: var(--modal-border); background: var(--modal-hover-bg); }
.filter-button--active { color: var(--cyan); border-color: rgba(34,211,197,.3); background: rgba(34,211,197,.08); }
.filter-menu { position: absolute; z-index: 20; top: calc(100% + 5px); left: 10px; width: max-content; min-width: 150px; max-width: 250px; max-height: 280px; overflow-y: auto; padding: 5px; border: 1px solid var(--modal-border); background: var(--modal-bg); box-shadow: 0 14px 36px rgba(0,0,0,.15); }
.filter-menu--wide { min-width: 210px; }
.filter-menu button { width: 100%; min-height: 34px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 9px; border: 0; background: transparent; color: var(--modal-td-color); text-align: left; white-space: nowrap; cursor: pointer; }
.filter-menu button:hover { background: var(--modal-hover-bg); color: var(--modal-text); }
.filter-menu button.active { color: var(--cyan); background: rgba(34,211,197,.08); }
.filter-menu button span { overflow: hidden; text-overflow: ellipsis; }
.mono { color: var(--modal-muted-text); font-family: "Cascadia Code", Consolas, monospace; font-size: 12px; }
.level { display: inline-flex; min-width: 30px; height: 24px; align-items: center; justify-content: center; border: 1px solid; font-weight: 700; font-size: 11px; }
.level--high { color: #ff7685; border-color: rgba(255,84,104,.34); background: rgba(255,84,104,.11); }
.level--medium { color: #ffc16e; border-color: rgba(255,173,79,.34); background: rgba(255,173,79,.1); }
.level--low { color: #49e0d4; border-color: rgba(34,211,197,.34); background: rgba(34,211,197,.1); }
.solution { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-height: 1.55; }
.empty-cell { height: 220px; color: var(--modal-muted-text); text-align: center; }
.retry-button { margin-left: 12px; padding: 7px 10px; border: 1px solid rgba(34,211,197,.3); background: rgba(34,211,197,.08); color: var(--cyan); cursor: pointer; }
.retry-button:hover { background: rgba(34,211,197,.15); }
.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 7px; padding: 16px 24px; border-top: 1px solid var(--modal-border); background: var(--modal-panel-bg); }
.pagination__total { margin-right: 5px; color: var(--modal-muted-text); font-size: 12px; }
.pagination__total strong { color: var(--modal-text); }
.pagination select { height: 34px; padding: 0 28px 0 10px; border: 1px solid var(--modal-border); background: var(--modal-select-bg); color: var(--modal-select-color); font-size: 12px; }
.page-button { min-width: 34px; height: 34px; display: grid; place-items: center; padding: 0 9px; border: 1px solid transparent; background: transparent; color: var(--modal-page-text); cursor: pointer; }
.page-button:hover:not(:disabled) { border-color: var(--modal-border); color: var(--modal-text); }
.page-button--active { color: #fff; border-color: transparent; background: var(--modal-page-active-bg); }
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
