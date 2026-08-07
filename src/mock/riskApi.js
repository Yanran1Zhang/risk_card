import { risks } from './riskData.js'

const statusMap = {
  ALL: '',
  UNCLOSED: '未关闭',
  CLOSED: '已关闭',
}

const riskTypeMap = {
  CONFIG: '配置类',
  PERFORMANCE: '性能类',
  SECURITY: '安全类',
}

const riskLevelMap = {
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
}

const resolveValue = (value, dictionary = {}) => (
  Object.prototype.hasOwnProperty.call(dictionary, value) ? dictionary[value] : (value || '')
)

const buildFilterOptions = (items) => ({
  neId: [...new Set(items.map((item) => item.neId))].sort(),
  neType: [...new Set(items.map((item) => item.neType))].sort(),
  riskName: [...new Set(items.map((item) => item.riskName))].sort((a, b) => a.localeCompare(b, 'zh-CN')),
  riskType: [...new Set(items.map((item) => item.riskType))].sort((a, b) => a.localeCompare(b, 'zh-CN')),
  riskLevel: ['高', '中', '低'].filter((level) => items.some((item) => item.riskLevel === level)),
})

// Mock of cs_ncd_risk_check_ne_details. Replace this function with the real POST request when the backend is available.
export const fetchRiskDetails = (params) => new Promise((resolve) => {
  const status = resolveValue(params.risk_status, statusMap)
  const riskType = resolveValue(params.risk_type_code, riskTypeMap)
  const neType = params.ne_type_code || ''
  const riskLevel = resolveValue(params.risk_level_code, riskLevelMap)

  const contextItems = risks.filter((item) => (
    (!status || item.status === status)
    && (!riskType || item.riskType === riskType)
    && (!neType || item.neType === neType)
  ))

  const matchedItems = contextItems.filter((item) => (
    (!params.ne_id || item.neId === params.ne_id)
    && (!params.ne_name || item.neName.includes(params.ne_name))
    && (!params.risk_name || item.riskName === params.risk_name)
    && (!riskLevel || item.riskLevel === riskLevel)
  ))

  const start = Math.max(0, Number(params.start) || 0)
  const limit = Math.max(1, Number(params.limit) || 15)

  window.setTimeout(() => {
    resolve({
      results: matchedItems.slice(start, start + limit),
      total_count: matchedItems.length,
      filter_options: buildFilterOptions(contextItems),
    })
  }, 180)
})
