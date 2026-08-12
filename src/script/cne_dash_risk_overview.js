/**
 *
 * 网络风险概览统计
 * 数据源: /EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_config
 * 返回: 风险总数、未关闭/已关闭、按风险类型统计、按网元类型统计
 */
const SC_TQL_UTIL = require('/EdgeSysMgrService/cs_ncd_system_config/sc_tql_util');
const start = _message.start ? _message.start : 0;
const limit = _message.limit ? _message.limit : 100;

const result = {
  totals: {
    total: 0,
    open: 0,
    closed: 0,
  },
  risk_type: [],
  ne_type: [],
};

function main() {
  // 1. 查询全量风险总数
  const totalQuery = `select count(id) as total_count 
    from '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_config' 
    where active = 1`;
  const totalRes = SC_TQL_UTIL.queryByPrecompileTql(totalQuery, {}, start, limit).results;
  result.totals.total = totalRes.length > 0 ? totalRes[0].total_count : 0;

  // 2. 查询未关闭风险数 (risk_status = '0')
  const openQuery = `select count(id) as open_count 
    from '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_config' 
    where active = 1 and risk_status = '0'`;
  const openRes = SC_TQL_UTIL.queryByPrecompileTql(openQuery, {}, start, limit).results;
  result.totals.open = openRes.length > 0 ? openRes[0].open_count : 0;

  // 3. 查询已关闭风险数 (risk_status = '1')
  const closedQuery = `select count(id) as closed_count 
    from '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_config' 
    where active = 1 and risk_status = '1'`;
  const closedRes = SC_TQL_UTIL.queryByPrecompileTql(closedQuery, {}, start, limit).results;
  result.totals.closed = closedRes.length > 0 ? closedRes[0].closed_count : 0;

  // 4. 按风险类型统计 (默认取未关闭风险，若需全部可传 risk_status 参数)
  const riskTypeStatus = _message.risk_status ? _message.risk_status : '0';
  const riskTypeQuery = `select 
        risk_type as code, 
        count(id) as count 
      from '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_config' 
      where active = 1 and risk_status = $!riskTypeStatus 
      group by risk_type`;
  const riskTypeResults = SC_TQL_UTIL.queryByPrecompileTql(riskTypeQuery, {riskTypeStatus}, start, limit).results;
  
  // 风险类型映射
  const riskTypeMap = {
    'CONFIG': '配置类',
    'PERFORMANCE': '性能类',
    'SECURITY': '安全类',
    '配置类': '配置类',
    '性能类': '性能类',
    '安全类': '安全类'
  };
  
  result.risk_type = riskTypeResults.map(item => ({
    code: item.code,
    label: riskTypeMap[item.code] || item.code,
    count: item.count
  }));

  // 5. 按网元类型统计 (默认取未关闭风险)
  const neTypeQuery = `select 
        ne_type as code, 
        count(id) as count 
      from '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_config' 
      where active = 1 and risk_status = $!riskTypeStatus 
      group by ne_type`;
  const neTypeResults = SC_TQL_UTIL.queryByPrecompileTql(neTypeQuery, {riskTypeStatus}, start, limit).results;
  
  // 网元类型映射
  const neTypeMap = {
    'AMF': 'AMF',
    'SMF': 'SMF',
    'UPF': 'UPF',
    'MME': 'MME',
    'AUSF': 'AUSF',
    'UDM': 'UDM',
    'PCF': 'PCF',
    'UDR': 'UDR',
    'NSSF': 'NSSF',
    'NRF': 'NRF'
  };
  
  result.ne_type = neTypeResults.map(item => ({
    code: item.code,
    label: neTypeMap[item.code] || item.code,
    count: item.count
  }));

  return result;
}

return main();