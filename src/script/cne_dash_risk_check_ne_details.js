/**
 *
 * 网络风险详情列表
 * 数据源: task_ne JOIN risk_task JOIN risk_config
 * 入参: start, limit, risk_status(ALL/UNCLOSED/CLOSED), risk_type_code, ne_type_code, risk_level_code, ne_id, risk_name
 * 返回: total_count, results, filter_options
 */
const SC_TQL_UTIL = require('/EdgeSysMgrService/cs_ncd_system_config/sc_tql_util');
const SC_DATE_UTIL = require('/EdgeSysMgrService/cs_ncd_system_config/sc_date_util');
const {useI18n} = require('/EdgeSysMgrService/cs_ncd_system_config/sc_i18n_util');
const t = useI18n(_context, _runtime, 'risk_check');

const USE_MOCK = true;

const start = _message.start ? _message.start : 0;
const limit = _message.limit ? _message.limit : 10;
const riskStatusCode = _message.risk_status || 'ALL';
const riskTypeCode = _message.risk_type_code || '';
const neTypeCode = _message.ne_type_code || '';
const riskLevelCode = _message.risk_level_code || '';
const neId = _message.ne_id || '';
const riskName = _message.risk_name || '';

// ===== 时间周期配置（mock：后续替换为读取配置表）=====
// 配置项：最近 1/2/3/4/5/6 个月，默认 3 个月
const TIME_PERIOD_OPTIONS = [1, 2, 3, 4, 5, 6];
const DEFAULT_PERIOD_MONTHS = 3;

function getConfiguredPeriodMonths() {
  const period = Number(_message.time_period) || DEFAULT_PERIOD_MONTHS;
  return TIME_PERIOD_OPTIONS.includes(period) ? period : DEFAULT_PERIOD_MONTHS;
}

// 根据月数计算 UTC 时间范围 [startTime, endTime)
function computeTimeRange(months) {
  const pad = (n) => String(n).padStart(2, '0');
  const toUtcStr = (d) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - months);
  return { startTime: toUtcStr(start), endTime: toUtcStr(now) };
}

const periodMonths = getConfiguredPeriodMonths();
const { startTime, endTime } = computeTimeRange(periodMonths);

const isCn = _runtime.language === 'zh_CN';
const zoneId = _runtime.timeZone;

// 多语言字段选择
const ruleNameCol = isCn ? 'config.rule_name_cn' : 'ifnull(config.rule_name_en, config.rule_name_cn)';
const riskTypeNameCol = isCn ? 'config.risk_type_name_cn' : 'ifnull(config.risk_type_name_en, config.risk_type_name_cn)';
const improvementMeasureCol = isCn ? 'config.improvement_measure_cn' : 'config.improvement_measure_en';
const riskDescriptionCol = isCn ? 'config.risk_description_cn' : 'config.risk_description_en';
const disposalTypeCol = isCn ? 'config.disposal_type_zh' : 'config.disposal_type_en';
const productNameCol = isCn ? 'config.product_name_cn' : 'config.product_name_en';

// 码值映射
const riskStatusMap = { 'UNCLOSED': '0', 'CLOSED': '1' };
const riskLevelDbMap = { 'HIGH': 'High', 'MEDIUM': 'Medium', 'LOW': 'Low' };
const riskLevelDisplayMap = { 'High': '高', 'Medium': '中', 'Low': '低' };
const riskStatusDisplayMap = { '0': '未关闭', '1': '已关闭' };
const sourceMap = { 'M': t('manual_import'), 'A': t('auto_syn') };

const defaultResult = {
  total_count: 0,
  results: [],
  filter_options: { neId: [], neType: [], riskName: [], riskType: [], riskLevel: [] },
};

// 三表 JOIN 基础片段（含时间范围过滤）
const codeSnippet = `
  from '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_task_ne' AS tn
  left join '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_task' AS task
  on tn.task_id = task.task_id
  left join '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_config' AS config
  on task.rule_id = config.rule_id
  where tn.py_res_status in (1) and config.active = 1
  and tn.risk_identification_time >= $!startTime
  and tn.risk_identification_time < $!endTime
`;

function main() {
  // 1. 构建范围筛选条件（影响 filter_options 和列表）
  const scopeParams = { startTime, endTime };
  let scopeWhere = '';

  if (riskStatusCode !== 'ALL' && riskStatusMap[riskStatusCode]) {
    scopeWhere += ` and tn.risk_status = $!riskStatusValue`;
    scopeParams.riskStatusValue = riskStatusMap[riskStatusCode];
  }

  if (riskTypeCode) {
    scopeWhere += ` and config.risk_type = $!riskTypeCode`;
    scopeParams.riskTypeCode = riskTypeCode;
  }

  if (neTypeCode) {
    scopeWhere += ` and config.ne_type = $!neTypeCode`;
    scopeParams.neTypeCode = neTypeCode;
  }

  // 2. 构建列筛选条件（不影响 filter_options）
  const columnParams = {};
  let columnWhere = '';

  if (neId) {
    columnWhere += ` and tn.ne_id = $!neId`;
    columnParams.neId = neId;
  }

  if (riskName) {
    columnWhere += ` and ${ruleNameCol} = $!riskName`;
    columnParams.riskName = riskName;
  }

  if (riskLevelCode && riskLevelDbMap[riskLevelCode]) {
    columnWhere += ` and config.risk_level = $!riskLevelValue`;
    columnParams.riskLevelValue = riskLevelDbMap[riskLevelCode];
  }

  // 3. 查询 filter_options（只受范围筛选影响，不受列筛选影响）
  const filterOptionsQuery = `select distinct
      tn.ne_id as ne_id,
      config.ne_type as ne_type,
      ${ruleNameCol} as risk_name,
      ${riskTypeNameCol} as risk_type,
      config.risk_level as risk_level
    ${codeSnippet}
    ${scopeWhere}`;
  const filterOptionsResult = SC_TQL_UTIL.queryByPrecompileTql(filterOptionsQuery, scopeParams, 0, 1000).results;
  const filterOptions = buildFilterOptions(filterOptionsResult);

  // 4. 查询分页列表（受范围+列筛选影响）
  const listQuery = `select
      tn.task_ne_id as task_ne_id,
      tn.ne_name as ne_name,
      tn.ne_id as ne_id,
      tn.ne_uid as ne_uid,
      config.ne_type as ne_type,
      ${ruleNameCol} as risk_name,
      config.rule_id as risk_id,
      config.risk_type as risk_type,
      ${riskTypeNameCol} as risk_type_name,
      config.risk_level as risk_level,
      ${improvementMeasureCol} as improvement_measure,
      ${riskDescriptionCol} as risk_description,
      ${disposalTypeCol} as disposal_type,
      ${productNameCol} as product_name,
      tn.risk_status as risk_status,
      tn.risk_identification_time as risk_identification_time,
      tn.risk_closed_time as risk_closed_time,
      tn.latest_scan_time as latest_scan_time,
      tn.risk_duration_day as risk_duration_day,
      task.task_id as task_id,
      source as source
    ${codeSnippet}
    ${scopeWhere}
    ${columnWhere}
    order by tn.risk_identification_time desc`;

  const listParams = Object.assign({}, scopeParams, columnParams);
  const rs = SC_TQL_UTIL.queryByPrecompileTql(listQuery, listParams, start, limit);
  executeResult(rs);

  return {
    total_count: (rs && rs.total) ? rs.total : 0,
    results: (rs && rs.results) ? rs.results.map(buildResultItem) : [],
    filter_options: filterOptions,
  };
}

// 处理原始记录的时间/来源字段
function executeResult(rs) {
  const results = rs && rs.results;
  if (!Array.isArray(results) || results.length === 0) {
    return;
  }
  const now = TimeUtil.getUTCString();
  results.forEach(item => {
    if (item.source) {
      item.source = sourceMap[item.source] || item.source;
    }
    if (item.risk_identification_time) {
      const closeTime = item.risk_closed_time || now;
      item.risk_duration_day = Math.floor(
        SC_DATE_UTIL.calTimeDifference(item.risk_identification_time, closeTime) / 86400000
      );
      item.risk_identification_time = TimeUtil.utc2Local(item.risk_identification_time, zoneId);
    }
    if (item.risk_closed_time) {
      item.risk_closed_time = TimeUtil.utc2Local(item.risk_closed_time, zoneId);
    }
    if (item.latest_scan_time) {
      item.latest_scan_time = TimeUtil.utc2Local(item.latest_scan_time, zoneId);
    }
  });
}

// 构建前端返回的单条记录
function buildResultItem(item) {
  const statusValue = item.risk_status;
  const levelValue = item.risk_level;
  return {
    id: item.task_ne_id || item.risk_id || '',
    neName: item.ne_name || '',
    neId: item.ne_id || '',
    neType: item.ne_type || '',
    riskName: item.risk_name || '',
    riskType: item.risk_type_name || '',
    riskLevel: riskLevelDisplayMap[levelValue] || levelValue || '',
    solution: item.improvement_measure || '',
    status: riskStatusDisplayMap[statusValue] || '',
    detectedAt: item.risk_identification_time || '',
  };
}

// 构建 filter_options
function buildFilterOptions(items) {
  const neIdSet = new Set();
  const neTypeSet = new Set();
  const riskNameSet = new Set();
  const riskTypeSet = new Set();
  const riskLevelSet = new Set();

  items.forEach(item => {
    if (item.ne_id) neIdSet.add(item.ne_id);
    if (item.ne_type) neTypeSet.add(item.ne_type);
    if (item.risk_name) riskNameSet.add(item.risk_name);
    if (item.risk_type) riskTypeSet.add(item.risk_type);
    if (item.risk_level) {
      const display = riskLevelDisplayMap[item.risk_level] || item.risk_level;
      riskLevelSet.add(display);
    }
  });

  const levelOrder = ['高', '中', '低'];
  return {
    neId: Array.from(neIdSet).sort(),
    neType: Array.from(neTypeSet).sort(),
    riskName: Array.from(riskNameSet).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    riskType: Array.from(riskTypeSet).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    riskLevel: levelOrder.filter(l => riskLevelSet.has(l)),
  };
}

// ===== Mock 数据（联调用，上线前将 USE_MOCK 改为 false）=====
const mockRecords = [
  { task_ne_id: 'TNE-001', ne_name: 'SH-AMF-03', ne_id: 'ALT-0721-156', ne_uid: 'U-001', ne_type: 'AMF', risk_name: '网元脱管风险', risk_type: 'CONFIG', risk_type_name: '配置类', risk_level: 'High', improvement_measure: '检查NCE连接配置并恢复管理通道', risk_status: '0', risk_identification_time: '2026-08-01 10:30' },
  { task_ne_id: 'TNE-002', ne_name: 'SH-AMF-07', ne_id: 'ALT-0721-188', ne_uid: 'U-002', ne_type: 'AMF', risk_name: '弱口令配置风险', risk_type: 'SECURITY', risk_type_name: '安全类', risk_level: 'High', improvement_measure: '更新高强度口令并启用定期轮换策略', risk_status: '0', risk_identification_time: '2026-08-02 09:15' },
  { task_ne_id: 'TNE-003', ne_name: 'RI-SMF-02', ne_id: 'ALT-0814-203', ne_uid: 'U-003', ne_type: 'SMF', risk_name: '传输链路质量下降', risk_type: 'PERFORMANCE', risk_type_name: '性能类', risk_level: 'Medium', improvement_measure: '检查光纤链路衰减并优化传输参数', risk_status: '0', risk_identification_time: '2026-08-03 11:20' },
  { task_ne_id: 'TNE-004', ne_name: 'RI-SMF-06', ne_id: 'ALT-0814-226', ne_uid: 'U-004', ne_type: 'SMF', risk_name: '配置不一致风险', risk_type: 'CONFIG', risk_type_name: '配置类', risk_level: 'Medium', improvement_measure: '对比基线配置并同步标准模板', risk_status: '0', risk_identification_time: '2026-08-04 14:45' },
  { task_ne_id: 'TNE-005', ne_name: 'JD-UPF-01', ne_id: 'ALT-0912-317', ne_uid: 'U-005', ne_type: 'UPF', risk_name: '用户面流量异常', risk_type: 'PERFORMANCE', risk_type_name: '性能类', risk_level: 'Low', improvement_measure: '复核流量趋势并调整负载均衡策略', risk_status: '0', risk_identification_time: '2026-08-05 08:00' },
  { task_ne_id: 'TNE-006', ne_name: 'JD-UPF-04', ne_id: 'ALT-0912-352', ne_uid: 'U-006', ne_type: 'UPF', risk_name: '证书即将过期', risk_type: 'SECURITY', risk_type_name: '安全类', risk_level: 'Medium', improvement_measure: '更新网元证书并验证双向认证状态', risk_status: '0', risk_identification_time: '2026-08-06 16:30' },
  { task_ne_id: 'TNE-007', ne_name: 'NW-MME-05', ne_id: 'ALT-0628-419', ne_uid: 'U-007', ne_type: 'MME', risk_name: '备份任务连续失败', risk_type: 'CONFIG', risk_type_name: '配置类', risk_level: 'Low', improvement_measure: '检查备份目录容量并重新执行备份任务', risk_status: '0', risk_identification_time: '2026-08-07 10:00' },
  { task_ne_id: 'TNE-008', ne_name: 'NW-MME-08', ne_id: 'ALT-0628-463', ne_uid: 'U-008', ne_type: 'MME', risk_name: '网元脱管风险', risk_type: 'CONFIG', risk_type_name: '配置类', risk_level: 'High', improvement_measure: '检查NCE连接配置并恢复管理通道', risk_status: '0', risk_identification_time: '2026-07-28 09:30' },
  { task_ne_id: 'TNE-009', ne_name: 'SH-AUSF-01', ne_id: 'ALT-0317-501', ne_uid: 'U-009', ne_type: 'AUSF', risk_name: '弱口令配置风险', risk_type: 'SECURITY', risk_type_name: '安全类', risk_level: 'High', improvement_measure: '更新高强度口令并启用定期轮换策略', risk_status: '0', risk_identification_time: '2026-07-29 13:15' },
  { task_ne_id: 'TNE-010', ne_name: 'RI-UDM-02', ne_id: 'ALT-0522-612', ne_uid: 'U-010', ne_type: 'UDM', risk_name: '证书即将过期', risk_type: 'SECURITY', risk_type_name: '安全类', risk_level: 'Medium', improvement_measure: '更新网元证书并验证双向认证状态', risk_status: '0', risk_identification_time: '2026-07-30 15:45' },
  { task_ne_id: 'TNE-011', ne_name: 'JD-PCF-03', ne_id: 'ALT-0408-733', ne_uid: 'U-011', ne_type: 'PCF', risk_name: '配置不一致风险', risk_type: 'CONFIG', risk_type_name: '配置类', risk_level: 'Medium', improvement_measure: '对比基线配置并同步标准模板', risk_status: '0', risk_identification_time: '2026-07-31 11:00' },
  { task_ne_id: 'TNE-012', ne_name: 'NW-UDR-01', ne_id: 'ALT-0615-844', ne_uid: 'U-012', ne_type: 'UDR', risk_name: '用户面流量异常', risk_type: 'PERFORMANCE', risk_type_name: '性能类', risk_level: 'Low', improvement_measure: '复核流量趋势并调整负载均衡策略', risk_status: '0', risk_identification_time: '2026-08-01 14:20' },
  { task_ne_id: 'TNE-013', ne_name: 'SH-NSSF-02', ne_id: 'ALT-0729-955', ne_uid: 'U-013', ne_type: 'NSSF', risk_name: '传输链路质量下降', risk_type: 'PERFORMANCE', risk_type_name: '性能类', risk_level: 'Medium', improvement_measure: '检查光纤链路衰减并优化传输参数', risk_status: '0', risk_identification_time: '2026-08-02 08:45' },
  { task_ne_id: 'TNE-014', ne_name: 'RI-NRF-01', ne_id: 'ALT-0811-166', ne_uid: 'U-014', ne_type: 'NRF', risk_name: '备份任务连续失败', risk_type: 'CONFIG', risk_type_name: '配置类', risk_level: 'Low', improvement_measure: '检查备份目录容量并重新执行备份任务', risk_status: '0', risk_identification_time: '2026-08-03 10:30' },
  { task_ne_id: 'TNE-015', ne_name: 'SH-AMF-03', ne_id: 'ALT-0721-156', ne_uid: 'U-001', ne_type: 'AMF', risk_name: '传输链路质量下降', risk_type: 'PERFORMANCE', risk_type_name: '性能类', risk_level: 'Medium', improvement_measure: '检查光纤链路衰减并优化传输参数', risk_status: '0', risk_identification_time: '2026-08-04 09:00' },
  { task_ne_id: 'TNE-016', ne_name: 'RI-SMF-02', ne_id: 'ALT-0814-203', ne_uid: 'U-003', ne_type: 'SMF', risk_name: '弱口令配置风险', risk_type: 'SECURITY', risk_type_name: '安全类', risk_level: 'High', improvement_measure: '更新高强度口令并启用定期轮换策略', risk_status: '0', risk_identification_time: '2026-08-05 12:15' },
  { task_ne_id: 'TNE-017', ne_name: 'JD-UPF-01', ne_id: 'ALT-0912-317', ne_uid: 'U-005', ne_type: 'UPF', risk_name: '配置不一致风险', risk_type: 'CONFIG', risk_type_name: '配置类', risk_level: 'Medium', improvement_measure: '对比基线配置并同步标准模板', risk_status: '0', risk_identification_time: '2026-08-06 14:30' },
  { task_ne_id: 'TNE-018', ne_name: 'NW-MME-05', ne_id: 'ALT-0628-419', ne_uid: 'U-007', ne_type: 'MME', risk_name: '证书即将过期', risk_type: 'SECURITY', risk_type_name: '安全类', risk_level: 'Medium', improvement_measure: '更新网元证书并验证双向认证状态', risk_status: '0', risk_identification_time: '2026-08-07 16:00' },
  { task_ne_id: 'TNE-019', ne_name: 'SH-AMF-07', ne_id: 'ALT-0721-188', ne_uid: 'U-002', ne_type: 'AMF', risk_name: '备份任务连续失败', risk_type: 'CONFIG', risk_type_name: '配置类', risk_level: 'Low', improvement_measure: '检查备份目录容量并重新执行备份任务', risk_status: '1', risk_identification_time: '2026-07-15 10:00' },
  { task_ne_id: 'TNE-020', ne_name: 'RI-SMF-06', ne_id: 'ALT-0814-226', ne_uid: 'U-004', ne_type: 'SMF', risk_name: '用户面流量异常', risk_type: 'PERFORMANCE', risk_type_name: '性能类', risk_level: 'Low', improvement_measure: '复核流量趋势并调整负载均衡策略', risk_status: '1', risk_identification_time: '2026-07-16 11:30' },
  { task_ne_id: 'TNE-021', ne_name: 'JD-UPF-04', ne_id: 'ALT-0912-352', ne_uid: 'U-006', ne_type: 'UPF', risk_name: '网元脱管风险', risk_type: 'CONFIG', risk_type_name: '配置类', risk_level: 'High', improvement_measure: '检查NCE连接配置并恢复管理通道', risk_status: '1', risk_identification_time: '2026-07-18 09:15' },
  { task_ne_id: 'TNE-022', ne_name: 'NW-MME-08', ne_id: 'ALT-0628-463', ne_uid: 'U-008', ne_type: 'MME', risk_name: '证书即将过期', risk_type: 'SECURITY', risk_type_name: '安全类', risk_level: 'Medium', improvement_measure: '更新网元证书并验证双向认证状态', risk_status: '1', risk_identification_time: '2026-07-20 14:00' },
  { task_ne_id: 'TNE-023', ne_name: 'SH-AUSF-01', ne_id: 'ALT-0317-501', ne_uid: 'U-009', ne_type: 'AUSF', risk_name: '配置不一致风险', risk_type: 'CONFIG', risk_type_name: '配置类', risk_level: 'Medium', improvement_measure: '对比基线配置并同步标准模板', risk_status: '1', risk_identification_time: '2026-07-22 08:45' },
  { task_ne_id: 'TNE-024', ne_name: 'RI-UDM-02', ne_id: 'ALT-0522-612', ne_uid: 'U-010', ne_type: 'UDM', risk_name: '传输链路质量下降', risk_type: 'PERFORMANCE', risk_type_name: '性能类', risk_level: 'Medium', improvement_measure: '检查光纤链路衰减并优化传输参数', risk_status: '1', risk_identification_time: '2026-07-24 13:30' },
  { task_ne_id: 'TNE-025', ne_name: 'JD-PCF-03', ne_id: 'ALT-0408-733', ne_uid: 'U-011', ne_type: 'PCF', risk_name: '弱口令配置风险', risk_type: 'SECURITY', risk_type_name: '安全类', risk_level: 'High', improvement_measure: '更新高强度口令并启用定期轮换策略', risk_status: '1', risk_identification_time: '2026-07-26 10:15' },
  { task_ne_id: 'TNE-026', ne_name: 'NW-UDR-01', ne_id: 'ALT-0615-844', ne_uid: 'U-012', ne_type: 'UDR', risk_name: '备份任务连续失败', risk_type: 'CONFIG', risk_type_name: '配置类', risk_level: 'Low', improvement_measure: '检查备份目录容量并重新执行备份任务', risk_status: '1', risk_identification_time: '2026-07-28 15:00' },
  { task_ne_id: 'TNE-027', ne_name: 'SH-NSSF-02', ne_id: 'ALT-0729-955', ne_uid: 'U-013', ne_type: 'NSSF', risk_name: '网元脱管风险', risk_type: 'CONFIG', risk_type_name: '配置类', risk_level: 'High', improvement_measure: '检查NCE连接配置并恢复管理通道', risk_status: '1', risk_identification_time: '2026-07-10 09:00' },
  { task_ne_id: 'TNE-028', ne_name: 'RI-NRF-01', ne_id: 'ALT-0811-166', ne_uid: 'U-014', ne_type: 'NRF', risk_name: '用户面流量异常', risk_type: 'PERFORMANCE', risk_type_name: '性能类', risk_level: 'Low', improvement_measure: '复核流量趋势并调整负载均衡策略', risk_status: '1', risk_identification_time: '2026-07-12 11:45' },
];

function mockMain() {
  // 1. 范围筛选（影响 filter_options 和列表）
  let scoped = mockRecords.slice();
  if (riskStatusCode !== 'ALL' && riskStatusMap[riskStatusCode]) {
    scoped = scoped.filter(r => r.risk_status === riskStatusMap[riskStatusCode]);
  }
  if (riskTypeCode) {
    scoped = scoped.filter(r => r.risk_type === riskTypeCode);
  }
  if (neTypeCode) {
    scoped = scoped.filter(r => r.ne_type === neTypeCode);
  }

  // 2. 构建 filter_options（只受范围筛选影响）
  const filterOptionsInput = scoped.map(r => ({
    ne_id: r.ne_id,
    ne_type: r.ne_type,
    risk_name: r.risk_name,
    risk_type: r.risk_type_name,
    risk_level: r.risk_level,
  }));
  const filterOptions = buildFilterOptions(filterOptionsInput);

  // 3. 列筛选（只影响列表）
  let filtered = scoped.slice();
  if (neId) {
    filtered = filtered.filter(r => r.ne_id === neId);
  }
  if (riskName) {
    filtered = filtered.filter(r => r.risk_name === riskName);
  }
  if (riskLevelCode && riskLevelDbMap[riskLevelCode]) {
    filtered = filtered.filter(r => r.risk_level === riskLevelDbMap[riskLevelCode]);
  }

  // 4. 排序 + 分页
  filtered.sort((a, b) => (a.risk_identification_time < b.risk_identification_time ? 1 : -1));
  const totalCount = filtered.length;
  const pageData = filtered.slice(start, start + limit);

  // 5. 通过 buildResultItem 构建返回
  const results = pageData.map(buildResultItem);

  return {
    total_count: totalCount,
    results: results,
    filter_options: filterOptions,
  };
}

return USE_MOCK ? mockMain() : main();
