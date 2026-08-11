<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, ChevronLeft, ChevronRight, Funnel, X } from 'lucide-vue-next'
import { fetchRiskDetails } from '../mock/riskApi.js'

const props = defineProps({
  open: Boolean,
  filter: {
    type: Object,
    default: () => ({ kind: 'all' }),
  },
})

const emit = defineEmits(['close'])
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

  if (props.filter.kind === 'status') params.risk_status = props.filter.value === '未关闭' ? 'UNCLOSED' : 'CLOSED'
  if (props.filter.kind === 'riskType') {
    params.risk_status = 'UNCLOSED'
    params.risk_type_code = props.filter.value
  }
  if (props.filter.kind === 'neType') {
    params.risk_status = 'UNCLOSED'
    params.ne_type_code = props.filter.value
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
    const response = await fetchRiskDetails(requestParams())
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
  if (!props.open || event.key !== 'Escape') return
  if (openFilter.value) closeFilterMenu()
  else emit('close')
}

watch(page, () => {
  if (props.open) loadDetails()
})

watch(pageSize, () => {
  if (page.value === 1 && props.open) loadDetails()
  else page.value = 1
})

watch(columnFilters, () => {
  if (props.open) loadDetails()
}, { deep: true })

watch(() => props.filter, () => {
  resetTableState()
  if (props.open) loadDetails()
}, { deep: true })

watch(() => props.open, (isOpen) => {
  document.body.classList.toggle('modal-open', isOpen)
  if (isOpen) {
    resetTableState()
    loadDetails()
  } else {
    resetTableState()
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('click', closeFilterMenu)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('click', closeFilterMenu)
  document.body.classList.remove('modal-open')
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-backdrop" role="presentation" @mousedown.self="emit('close')">
        <section class="detail-modal" role="dialog" aria-modal="true" aria-label="网络风险详情" :data-loading="loading">
          <header class="detail-modal__header">
            <h2>网络风险详情</h2>
            <button class="icon-button" type="button" aria-label="关闭详情弹窗" title="关闭" @click="emit('close')">
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
</template>
