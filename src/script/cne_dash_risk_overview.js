/**
 *
 * 网络风险概览统计
 * 数据源: task_ne JOIN risk_task JOIN risk_config
 * 返回: total, open, closed, riskTypes, neTypes
 */
const SC_TQL_UTIL = require('/EdgeSysMgrService/cs_ncd_system_config/sc_tql_util');

const USE_MOCK = true;

const start = _message.start ? _message.start : 0;
const limit = _message.limit ? _message.limit : 100;

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

// 风险类型映射
const riskTypeMap = {
  'CONFIG': '配置类',
  'PERFORMANCE': '性能类',
  'SECURITY': '安全类',
  '配置类': '配置类',
  '性能类': '性能类',
  '安全类': '安全类'
};

function main() {
  // 1. 全量统计 (未关闭 + 已关闭)
  const totalQuery = `select count(tn.task_ne_id) as total_count
    ${codeSnippet}`;
  const totalRes = SC_TQL_UTIL.queryByPrecompileTql(totalQuery, { startTime, endTime }, start, limit).results;
  const total = totalRes.length > 0 ? totalRes[0].total_count : 0;

  // 2. 未关闭 (risk_status = '0')
  const openQuery = `select count(tn.task_ne_id) as open_count
    ${codeSnippet}
    and tn.risk_status = $!openStatus`;
  const openRes = SC_TQL_UTIL.queryByPrecompileTql(openQuery, { openStatus: '0', startTime, endTime }, start, limit).results;
  const open = openRes.length > 0 ? openRes[0].open_count : 0;

  // 3. 已关闭 (risk_status = '1')
  const closedQuery = `select count(tn.task_ne_id) as closed_count
    ${codeSnippet}
    and tn.risk_status = $!closedStatus`;
  const closedRes = SC_TQL_UTIL.queryByPrecompileTql(closedQuery, { closedStatus: '1', startTime, endTime }, start, limit).results;
  const closed = closedRes.length > 0 ? closedRes[0].closed_count : 0;

  // 4. 按风险类型统计 (默认取未关闭)
  const statusFilter = _message.risk_status ? _message.risk_status : '0';
  const riskTypeQuery = `select
        config.risk_type as code,
        count(tn.task_ne_id) as count
      ${codeSnippet}
      and tn.risk_status = $!statusFilter
      group by config.risk_type`;
  const riskTypeResults = SC_TQL_UTIL.queryByPrecompileTql(riskTypeQuery, { statusFilter, startTime, endTime }, start, limit).results;

  const riskTypes = riskTypeResults.map(item => ({
    name: riskTypeMap[item.code] || item.code,
    count: item.count
  }));

  // 5. 按网元类型统计 (默认取未关闭)
  const neTypeQuery = `select
        config.ne_type as name,
        count(tn.task_ne_id) as count
      ${codeSnippet}
      and tn.risk_status = $!statusFilter
      group by config.ne_type`;
  const neTypeResults = SC_TQL_UTIL.queryByPrecompileTql(neTypeQuery, { statusFilter, startTime, endTime }, start, limit).results;

  const neTypes = neTypeResults.map(item => ({
    name: item.name,
    count: item.count
  }));

  return {
    total: total,
    open: open,
    closed: closed,
    riskTypes: riskTypes,
    neTypes: neTypes,
    periodMonths: periodMonths
  };
}

// ===== Mock 数据（联调用，上线前将 USE_MOCK 改为 false）=====
function mockMain() {
  return {
    total: 28,
    open: 18,
    closed: 10,
    periodMonths: periodMonths,
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
}

return USE_MOCK ? mockMain() : main();