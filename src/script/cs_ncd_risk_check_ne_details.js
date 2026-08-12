/**
 *
 * 风险排查结果明细
 */
const SC_TQL_UTIL = require('/EdgeSysMgrService/cs_ncd_system_config/sc_tql_util');
const SC_DATE_UTIL = require('/EdgeSysMgrService/cs_ncd_system_config/sc_date_util');
const {useI18n} = require('/EdgeSysMgrService/cs_ncd_system_config/sc_i18n_util');
const t = useI18n(_context, _runtime, 'risk_check');
const start = _message.start ? _message.start : 0;
const limit = _message.limit ? _message.limit : 10;
const riskLevel = _message.risk_level || '';
const cardType = _message.card_type;

const startTime = _message.start_time;
const endTime = _message.end_time;
const isCn = _runtime.language === 'zh_CN';
const checkResult = _message.check_result ? _message.check_result : [];

const disposalType = isCn ? ' config.disposal_type_zh ' : ' config.disposal_type_en ';
const improvementMeasure = isCn ? ' config.improvement_measure_cn ' : ' config.improvement_measure_en ';
const productLine = isCn ? ' config.product_line_name_cn ' : ' config.product_line_name_en ';
const productName = isCn ? ' config.product_name_cn ' : ' config.product_name_en ';
const productCategoryName = isCn ? ' config.product_category_name_cn ' : ' config.product_category_name_en ';
const riskDescription = isCn ? ' config.risk_description_cn ' : ' config.risk_description_en ';
const cardTypeList = ['risk_ne_summary', 'risk_closed', 'risk_unclose', 'risk_summary'];
const ruleName = isCn ? 'config.rule_name_cn' : 'ifnull(config.rule_name_en, config.rule_name_cn)';

const zoneId = _runtime.timeZone;

const checkResultScope = [0, 1, 4];
const defaultResult = {
  total: 0,
  results: [],
};

function main() {

  if (!cardTypeList.includes(cardType)) {
    return defaultResult;
  }

  const riskTql = `select 
                    tn.task_ne_id as task_ne_id,
                    tn.ne_name as ne_name,
                    tn.ne_uid as ne_uid,
                    tn.ne_id as ne_id,
                    tn.ems_name as ems_name,
                    ${productLine} as product_line ,
                    ${productCategoryName} as product_category_name,
                    ${productName} as product_name,
                    config.ne_type as ne_type,
                    config.ict_scenario as ict_scenario,
                    ${ruleName} as risk_name,
                    config.rule_id as risk_id,
                    config.risk_level as risk_level,
                    task.task_id as task_id,
                    source as source,
                    ${disposalType} as disposal_type ,
                    ${riskDescription} as risk_description ,
                    ${improvementMeasure} as improvement_measure,
                    tn.latest_scan_time as latest_scan_time,
                    tn.py_res_status as check_result,
                    tn.risk_identification_time as risk_identification_time,
                    tn.risk_status as risk_status,
                    tn.risk_closed_time as risk_closed_time,
                    tn.risk_duration_day as risk_duration_day
                   from
                       '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_task_ne' AS tn
                       left join '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_task' AS task
                   on tn.task_id = task.task_id
                       left join '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_config' AS config
                       on  task.rule_id = config.rule_id
                   where tn.py_res_status in $check_result and 
                       ((task.task_start_time >= $!startTime
                     and task.task_start_time < $!endTime) or
                       (task.task_end_time >= $!startTime
                     and task.task_end_time < $!endTime ) )
                     and config.risk_level = $!riskLevel
                     and tn.risk_status = $!riskStatus  order by tn.risk_identification_time desc `;
  const params = {startTime, endTime};
  if ('risk_closed' === cardType) {
    params.riskStatus = '1';
  }

  if ('risk_unclose' === cardType) {
    params.riskStatus = '0';
  }

  params.riskLevel = riskLevel;

  if (checkResult && checkResult.length > 0) {
    const hasMatch = checkResult.every(v => checkResultScope.includes(v));
    if (!hasMatch) {
      return defaultResult;
    }

    params.check_result = checkResult;
  } else {
    params.check_result = checkResultScope;
  }

  const rs = SC_TQL_UTIL.queryByPrecompileTql(riskTql, params, start, limit);
  executeResult(rs);
  return rs;
}

// 处理返回的数组
function executeResult(rs) {
  const results = rs && rs.results;
  if (!Array.isArray(results) || results.length === 0) {
    return;
  }

  const sourceMap = {M: t('manual_import'), A: t('auto_syn')};
  const now = TimeUtil.getUTCString();

  results.forEach(item => {
    item.source = sourceMap[item.source] || '';
    const identTime = item.risk_identification_time;
    if (identTime) {
      const closeTime = item.risk_closed_time || now;
      item.risk_duration_day = Math.floor(
        SC_DATE_UTIL.calTimeDifference(identTime, closeTime) / 86400000
      );
      item.risk_identification_time = TimeUtil.utc2Local(identTime, zoneId);
    }

    if (item.risk_closed_time) {
      item.risk_closed_time = TimeUtil.utc2Local(item.risk_closed_time, zoneId);
    }

    if (item.latest_scan_time) {
      item.latest_scan_time = TimeUtil.utc2Local(item.latest_scan_time, zoneId);
    }

  });
}

return main();
