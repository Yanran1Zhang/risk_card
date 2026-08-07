const riskDefinitions = [
  {
    name: '网元脱管风险',
    type: '配置类',
    level: '高',
    solution: '检查NCE连接配置并恢复管理通道',
  },
  {
    name: '传输链路质量下降',
    type: '性能类',
    level: '中',
    solution: '检查光纤链路衰减并优化传输参数',
  },
  {
    name: '配置不一致风险',
    type: '配置类',
    level: '中',
    solution: '对比基线配置并同步标准模板',
  },
  {
    name: '用户面流量异常',
    type: '性能类',
    level: '低',
    solution: '复核流量趋势并调整负载均衡策略',
  },
  {
    name: '弱口令配置风险',
    type: '安全类',
    level: '高',
    solution: '更新高强度口令并启用定期轮换策略',
  },
  {
    name: '证书即将过期',
    type: '安全类',
    level: '中',
    solution: '更新网元证书并验证双向认证状态',
  },
  {
    name: '备份任务连续失败',
    type: '配置类',
    level: '低',
    solution: '检查备份目录容量并重新执行备份任务',
  },
]

const neCatalog = [
  ['SH-AMF-03', 'ALT-0721-156', 'AMF'],
  ['SH-AMF-07', 'ALT-0721-188', 'AMF'],
  ['RI-SMF-02', 'ALT-0814-203', 'SMF'],
  ['RI-SMF-06', 'ALT-0814-226', 'SMF'],
  ['JD-UPF-01', 'ALT-0912-317', 'UPF'],
  ['JD-UPF-04', 'ALT-0912-352', 'UPF'],
  ['NW-MME-05', 'ALT-0628-419', 'MME'],
  ['NW-MME-08', 'ALT-0628-463', 'MME'],
]

export const risks = Array.from({ length: 40 }, (_, index) => {
  const definition = riskDefinitions[index % riskDefinitions.length]
  const ne = neCatalog[index % neCatalog.length]
  const status = index < 24 ? '未关闭' : '已关闭'

  return {
    id: `RISK-2026-${String(index + 1).padStart(4, '0')}`,
    neName: ne[0],
    neId: ne[1],
    neType: ne[2],
    riskName: definition.name,
    riskType: definition.type,
    riskLevel: definition.level,
    solution: definition.solution,
    status,
    detectedAt: `2026-${String(8 - (index % 3)).padStart(2, '0')}-${String((index % 25) + 1).padStart(2, '0')} 10:30`,
  }
})

export const cardData = {
  title: '网络风险',
  periodLabel: '近3个月',
  total: risks.length,
  open: risks.filter((item) => item.status === '未关闭').length,
  closed: risks.filter((item) => item.status === '已关闭').length,
  riskTypes: ['配置类', '性能类', '安全类'].map((name) => ({
    name,
    count: risks.filter((item) => item.status === '未关闭' && item.riskType === name).length,
  })),
  neTypes: ['AMF', 'SMF', 'UPF', 'MME'].map((name) => ({
    name,
    count: risks.filter((item) => item.status === '未关闭' && item.neType === name).length,
  })),
}
