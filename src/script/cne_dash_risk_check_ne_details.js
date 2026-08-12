/**
 *
 * 网络风险详情列表
 * 数据源: /EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_config
 * 入参: filter (open/risk_type/ne_type), value, risk_status, start, limit
 */
const SC_TQL_UTIL = require('/EdgeSysMgrService/cs_ncd_system_config/sc_tql_util');
const start = _message.start ? _message.start : 0;
const limit = _message.limit ? _message.limit : 10;
const filter = _message.filter || '';
const value = _message.value || '';
const riskStatus = _message.risk_status || '';
const isCn = _runtime.language === 'zh_CN';

const defaultResult = {
  total: 0,
  results: [],
};

function main() {
  // 根据卡片类型构建查询条件
  let whereClause = `where active = 1`;
  let params = {};

  // 风险状态筛选
  if (riskStatus) {
    whereClause += ` and risk_status = $!riskStatus`;
    params.riskStatus = riskStatus;
  } else {
    // 默认查询未关闭的风险
    whereClause += ` and risk_status = '0'`;
  }

  // 根据 filter 类型和 value 增加筛选条件
  if (filter === 'risk_type' && value) {
    whereClause += ` and risk_type = $!filterValue`;
    params.filterValue = value;
  } else if (filter === 'ne_type' && value) {
    whereClause += ` and ne_type = $!filterValue`;
    params.filterValue = value;
  } else if (filter === 'open') {
    // open 表示全部未关闭的风险，已在默认 where 条件中处理
  }

  // 构建查询SQL，选择详情页所需字段
  const neName = isCn ? `product_name_cn as ne_name` : `product_name_en as ne_name`;
  const riskName = isCn ? `rule_name_cn as risk_name` : `ifnull(rule_name_en, rule_name_cn) as risk_name`;
  const riskDesc = isCn ? `risk_description_cn as risk_description` : `risk_description_en as risk_description`;
  const disposalType = isCn ? `disposal_type_zh as disposal_type` : `disposal_type_en as disposal_type`;
  const improvement = isCn ? `improvement_measure_cn as improvement_measure` : `improvement_measure_en as improvement_measure`;

  const riskTql = `select 
        id,
        ne_type,
        ${neName},
        ${riskName},
        rule_id,
        risk_type,
        risk_level,
        ${riskDesc},
        ${disposalType},
        ${improvement},
        risk_status,
        critical_risk,
        source,
        publish_time,
        update_time
      from '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_config' 
      ${whereClause}
      order by update_time desc`;

  const rs = SC_TQL_UTIL.queryByPrecompileTql(riskTql, params, start, limit);
  
  // 处理返回结果
  const results = rs && rs.results ? rs.results : [];
  
  // 转换字段以匹配前端需要的结构
  const processedResults = results.map(item => ({
    id: item.id,
    task_ne_id: item.id,
    ne_name: item.ne_name,
    ne_type: item.ne_type,
    ne_uid: item.id,
    ne_id: item.id,
    ems_name: '--', // 字段中无此数据，设为默认值
    product_line: isCn ? '' : '', // 可根据需要扩展
    product_category_name: isCn ? '' : '',
    product_name: item.ne_name,
    risk_name: item.risk_name,
    risk_id: item.rule_id,
    risk_level: item.risk_level,
    task_id: '', // 字段中无此数据
    source: item.source,
    disposal_type: item.disposal_type,
    risk_description: item.risk_description,
    improvement_measure: item.improvement_measure,
    latest_scan_time: item.update_time,
    check_result: item.risk_status === '1' ? 1 : 4, // 假设 1 为已解决，4 为未解决
    risk_identification_time: item.publish_time,
    risk_status: item.risk_status,
    risk_closed_time: item.risk_status === '1' ? item.update_time : null,
    risk_duration_day: calcDuration(item.publish_time, item.update_time, item.risk_status)
  }));

  return {
    total: rs.total || processedResults.length,
    results: processedResults
  };
}

// 计算风险持续天数
function calcDuration(startTime, endTime, status) {
  if (!startTime) return 0;
  
  const start = new Date(startTime).getTime();
  const end = status === '1' && endTime ? new Date(endTime).getTime() : new Date().getTime();
  
  const durationMs = end - start;
  if (isNaN(durationMs) || durationMs < 0) return 0;
  
  return Math.floor(durationMs / (1000 * 60 * 60 * 24));
}

return main();