/**
 *
 * 网络风险概览统计
 * 数据源: task_ne JOIN risk_task JOIN risk_config
 * 返回: total, open, closed, riskTypes, neTypes
 */
const SC_TQL_UTIL = require('/EdgeSysMgrService/cs_ncd_system_config/sc_tql_util');

const start = _message.start ? _message.start : 0;
const limit = _message.limit ? _message.limit : 100;

// 三表 JOIN 基础片段
const codeSnippet = `
  from '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_task_ne' AS tn
  left join '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_task' AS task
  on tn.task_id = task.task_id
  left join '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_config' AS config
  on task.rule_id = config.rule_id
  where tn.py_res_status in (1) and config.active = 1
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
  const totalRes = SC_TQL_UTIL.queryByPrecompileTql(totalQuery, {}, start, limit).results;
  const total = totalRes.length > 0 ? totalRes[0].total_count : 0;

  // 2. 未关闭 (risk_status = '0')
  const openQuery = `select count(tn.task_ne_id) as open_count
    ${codeSnippet}
    and tn.risk_status = $!openStatus`;
  const openRes = SC_TQL_UTIL.queryByPrecompileTql(openQuery, { openStatus: '0' }, start, limit).results;
  const open = openRes.length > 0 ? openRes[0].open_count : 0;

  // 3. 已关闭 (risk_status = '1')
  const closedQuery = `select count(tn.task_ne_id) as closed_count
    ${codeSnippet}
    and tn.risk_status = $!closedStatus`;
  const closedRes = SC_TQL_UTIL.queryByPrecompileTql(closedQuery, { closedStatus: '1' }, start, limit).results;
  const closed = closedRes.length > 0 ? closedRes[0].closed_count : 0;

  // 4. 按风险类型统计 (默认取未关闭)
  const statusFilter = _message.risk_status ? _message.risk_status : '0';
  const riskTypeQuery = `select
        config.risk_type as code,
        count(tn.task_ne_id) as count
      ${codeSnippet}
      and tn.risk_status = $!statusFilter
      group by config.risk_type`;
  const riskTypeResults = SC_TQL_UTIL.queryByPrecompileTql(riskTypeQuery, { statusFilter }, start, limit).results;

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
  const neTypeResults = SC_TQL_UTIL.queryByPrecompileTql(neTypeQuery, { statusFilter }, start, limit).results;

  const neTypes = neTypeResults.map(item => ({
    name: item.name,
    count: item.count
  }));

  return {
    total: total,
    open: open,
    closed: closed,
    riskTypes: riskTypes,
    neTypes: neTypes
  };
}

return main();