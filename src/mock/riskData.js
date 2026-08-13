// Mock 数据（前端联调用，上线前删除此文件并将 api.js 中 USE_MOCK 改为 false）

const mockOverview = {
  total: 28,
  open: 18,
  closed: 10,
  riskTypes: [
    { name: '配置类', count: 7 },
    { name: '性能类', count: 5 },
    { name: '安全类', count: 6 },
  ],
  neTypes: [
    { name: 'AMF', count: 3 },
    { name: 'SMF', count: 3 },
    { name: 'UPF', count: 3 },
    { name: 'MME', count: 3 },
    { name: 'AUSF', count: 1 },
    { name: 'UDM', count: 1 },
    { name: 'PCF', count: 1 },
    { name: 'UDR', count: 1 },
    { name: 'NSSF', count: 1 },
    { name: 'NRF', count: 1 },
  ],
};

const mockRecords = [
  { id: 'TNE-001', neName: 'SH-AMF-03', neId: 'ALT-0721-156', neType: 'AMF', riskName: '网元脱管风险', riskType: '配置类', riskLevel: '高', solution: '检查NCE连接配置并恢复管理通道', riskStatus: '0', detectedAt: '2026-08-01 10:30' },
  { id: 'TNE-002', neName: 'SH-AMF-07', neId: 'ALT-0721-188', neType: 'AMF', riskName: '弱口令配置风险', riskType: '安全类', riskLevel: '高', solution: '更新高强度口令并启用定期轮换策略', riskStatus: '0', detectedAt: '2026-08-02 09:15' },
  { id: 'TNE-003', neName: 'RI-SMF-02', neId: 'ALT-0814-203', neType: 'SMF', riskName: '传输链路质量下降', riskType: '性能类', riskLevel: '中', solution: '检查光纤链路衰减并优化传输参数', riskStatus: '0', detectedAt: '2026-08-03 11:20' },
  { id: 'TNE-004', neName: 'RI-SMF-06', neId: 'ALT-0814-226', neType: 'SMF', riskName: '配置不一致风险', riskType: '配置类', riskLevel: '中', solution: '对比基线配置并同步标准模板', riskStatus: '0', detectedAt: '2026-08-04 14:45' },
  { id: 'TNE-005', neName: 'JD-UPF-01', neId: 'ALT-0912-317', neType: 'UPF', riskName: '用户面流量异常', riskType: '性能类', riskLevel: '低', solution: '复核流量趋势并调整负载均衡策略', riskStatus: '0', detectedAt: '2026-08-05 08:00' },
  { id: 'TNE-006', neName: 'JD-UPF-04', neId: 'ALT-0912-352', neType: 'UPF', riskName: '证书即将过期', riskType: '安全类', riskLevel: '中', solution: '更新网元证书并验证双向认证状态', riskStatus: '0', detectedAt: '2026-08-06 16:30' },
  { id: 'TNE-007', neName: 'NW-MME-05', neId: 'ALT-0628-419', neType: 'MME', riskName: '备份任务连续失败', riskType: '配置类', riskLevel: '低', solution: '检查备份目录容量并重新执行备份任务', riskStatus: '0', detectedAt: '2026-08-07 10:00' },
  { id: 'TNE-008', neName: 'NW-MME-08', neId: 'ALT-0628-463', neType: 'MME', riskName: '网元脱管风险', riskType: '配置类', riskLevel: '高', solution: '检查NCE连接配置并恢复管理通道', riskStatus: '0', detectedAt: '2026-07-28 09:30' },
  { id: 'TNE-009', neName: 'SH-AUSF-01', neId: 'ALT-0317-501', neType: 'AUSF', riskName: '弱口令配置风险', riskType: '安全类', riskLevel: '高', solution: '更新高强度口令并启用定期轮换策略', riskStatus: '0', detectedAt: '2026-07-29 13:15' },
  { id: 'TNE-010', neName: 'RI-UDM-02', neId: 'ALT-0522-612', neType: 'UDM', riskName: '证书即将过期', riskType: '安全类', riskLevel: '中', solution: '更新网元证书并验证双向认证状态', riskStatus: '0', detectedAt: '2026-07-30 15:45' },
  { id: 'TNE-011', neName: 'JD-PCF-03', neId: 'ALT-0408-733', neType: 'PCF', riskName: '配置不一致风险', riskType: '配置类', riskLevel: '中', solution: '对比基线配置并同步标准模板', riskStatus: '0', detectedAt: '2026-07-31 11:00' },
  { id: 'TNE-012', neName: 'NW-UDR-01', neId: 'ALT-0615-844', neType: 'UDR', riskName: '用户面流量异常', riskType: '性能类', riskLevel: '低', solution: '复核流量趋势并调整负载均衡策略', riskStatus: '0', detectedAt: '2026-08-01 14:20' },
  { id: 'TNE-013', neName: 'SH-NSSF-02', neId: 'ALT-0729-955', neType: 'NSSF', riskName: '传输链路质量下降', riskType: '性能类', riskLevel: '中', solution: '检查光纤链路衰减并优化传输参数', riskStatus: '0', detectedAt: '2026-08-02 08:45' },
  { id: 'TNE-014', neName: 'RI-NRF-01', neId: 'ALT-0811-166', neType: 'NRF', riskName: '备份任务连续失败', riskType: '配置类', riskLevel: '低', solution: '检查备份目录容量并重新执行备份任务', riskStatus: '0', detectedAt: '2026-08-03 10:30' },
  { id: 'TNE-015', neName: 'SH-AMF-03', neId: 'ALT-0721-156', neType: 'AMF', riskName: '传输链路质量下降', riskType: '性能类', riskLevel: '中', solution: '检查光纤链路衰减并优化传输参数', riskStatus: '0', detectedAt: '2026-08-04 09:00' },
  { id: 'TNE-016', neName: 'RI-SMF-02', neId: 'ALT-0814-203', neType: 'SMF', riskName: '弱口令配置风险', riskType: '安全类', riskLevel: '高', solution: '更新高强度口令并启用定期轮换策略', riskStatus: '0', detectedAt: '2026-08-05 12:15' },
  { id: 'TNE-017', neName: 'JD-UPF-01', neId: 'ALT-0912-317', neType: 'UPF', riskName: '配置不一致风险', riskType: '配置类', riskLevel: '中', solution: '对比基线配置并同步标准模板', riskStatus: '0', detectedAt: '2026-08-06 14:30' },
  { id: 'TNE-018', neName: 'NW-MME-05', neId: 'ALT-0628-419', neType: 'MME', riskName: '证书即将过期', riskType: '安全类', riskLevel: '中', solution: '更新网元证书并验证双向认证状态', riskStatus: '0', detectedAt: '2026-08-07 16:00' },
  { id: 'TNE-019', neName: 'SH-AMF-07', neId: 'ALT-0721-188', neType: 'AMF', riskName: '备份任务连续失败', riskType: '配置类', riskLevel: '低', solution: '检查备份目录容量并重新执行备份任务', riskStatus: '1', detectedAt: '2026-07-15 10:00' },
  { id: 'TNE-020', neName: 'RI-SMF-06', neId: 'ALT-0814-226', neType: 'SMF', riskName: '用户面流量异常', riskType: '性能类', riskLevel: '低', solution: '复核流量趋势并调整负载均衡策略', riskStatus: '1', detectedAt: '2026-07-16 11:30' },
  { id: 'TNE-021', neName: 'JD-UPF-04', neId: 'ALT-0912-352', neType: 'UPF', riskName: '网元脱管风险', riskType: '配置类', riskLevel: '高', solution: '检查NCE连接配置并恢复管理通道', riskStatus: '1', detectedAt: '2026-07-18 09:15' },
  { id: 'TNE-022', neName: 'NW-MME-08', neId: 'ALT-0628-463', neType: 'MME', riskName: '证书即将过期', riskType: '安全类', riskLevel: '中', solution: '更新网元证书并验证双向认证状态', riskStatus: '1', detectedAt: '2026-07-20 14:00' },
  { id: 'TNE-023', neName: 'SH-AUSF-01', neId: 'ALT-0317-501', neType: 'AUSF', riskName: '配置不一致风险', riskType: '配置类', riskLevel: '中', solution: '对比基线配置并同步标准模板', riskStatus: '1', detectedAt: '2026-07-22 08:45' },
  { id: 'TNE-024', neName: 'RI-UDM-02', neId: 'ALT-0522-612', neType: 'UDM', riskName: '传输链路质量下降', riskType: '性能类', riskLevel: '中', solution: '检查光纤链路衰减并优化传输参数', riskStatus: '1', detectedAt: '2026-07-24 13:30' },
  { id: 'TNE-025', neName: 'JD-PCF-03', neId: 'ALT-0408-733', neType: 'PCF', riskName: '弱口令配置风险', riskType: '安全类', riskLevel: '高', solution: '更新高强度口令并启用定期轮换策略', riskStatus: '1', detectedAt: '2026-07-26 10:15' },
  { id: 'TNE-026', neName: 'NW-UDR-01', neId: 'ALT-0615-844', neType: 'UDR', riskName: '备份任务连续失败', riskType: '配置类', riskLevel: '低', solution: '检查备份目录容量并重新执行备份任务', riskStatus: '1', detectedAt: '2026-07-28 15:00' },
  { id: 'TNE-027', neName: 'SH-NSSF-02', neId: 'ALT-0729-955', neType: 'NSSF', riskName: '网元脱管风险', riskType: '配置类', riskLevel: '高', solution: '检查NCE连接配置并恢复管理通道', riskStatus: '1', detectedAt: '2026-07-10 09:00' },
  { id: 'TNE-028', neName: 'RI-NRF-01', neId: 'ALT-0811-166', neType: 'NRF', riskName: '用户面流量异常', riskType: '性能类', riskLevel: '低', solution: '复核流量趋势并调整负载均衡策略', riskStatus: '1', detectedAt: '2026-07-12 11:45' },
];

function buildFilterOptions(records) {
  const neIdSet = new Set();
  const neTypeSet = new Set();
  const riskNameSet = new Set();
  const riskTypeSet = new Set();
  const riskLevelSet = new Set();

  records.forEach(r => {
    neIdSet.add(r.neId);
    neTypeSet.add(r.neType);
    riskNameSet.add(r.riskName);
    riskTypeSet.add(r.riskType);
    riskLevelSet.add(r.riskLevel);
  });

  return {
    neId: Array.from(neIdSet),
    neType: Array.from(neTypeSet),
    riskName: Array.from(riskNameSet),
    riskType: Array.from(riskTypeSet),
    riskLevel: Array.from(riskLevelSet),
  };
}

const riskStatusMap = { ALL: null, UNCLOSED: '0', CLOSED: '1' };
const riskLevelMap = { HIGH: '高', MEDIUM: '中', LOW: '低' };

function mockDetails(start, limit, risk_status, risk_type_code, ne_type_code, risk_level_code, ne_id, risk_name) {
  let scoped = mockRecords.slice();

  if (riskStatusMap[risk_status] != null) {
    scoped = scoped.filter(r => r.riskStatus === riskStatusMap[risk_status]);
  }
  if (risk_type_code) {
    scoped = scoped.filter(r => r.riskType === risk_type_code);
  }
  if (ne_type_code) {
    scoped = scoped.filter(r => r.neType === ne_type_code);
  }

  const filterOptions = buildFilterOptions(scoped);

  let filtered = scoped.slice();
  if (ne_id) filtered = filtered.filter(r => r.neId === ne_id);
  if (risk_name) filtered = filtered.filter(r => r.riskName === risk_name);
  if (risk_level_code && riskLevelMap[risk_level_code]) {
    filtered = filtered.filter(r => r.riskLevel === riskLevelMap[risk_level_code]);
  }

  filtered.sort((a, b) => (a.detectedAt < b.detectedAt ? 1 : -1));
  const totalCount = filtered.length;
  const results = filtered.slice(start, start + limit);

  return { total_count: totalCount, results, filter_options: filterOptions };
}

export { mockOverview, mockDetails };