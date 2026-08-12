/**
 *
 * 风险排查结果统计
 */
const SC_TQL_UTIL = require('/EdgeSysMgrService/cs_ncd_system_config/sc_tql_util');
const start = _message.start ? _message.start : 0;
const limit = _message.limit ? _message.limit : 10;
const startTime = _message.start_time;
const endTime = _message.end_time;

const result = {
  risk_summary: {
    risk_count: 0,
    high_risk_count: 0,
    medium_risk_count: 0,
    low_risk_count: 0,
  },
  risk_unclose: {
    risk_count: 0,
    high_risk_count: 0,
    medium_risk_count: 0,
    low_risk_count: 0,
  },
  risk_closed: {
    risk_count: 0,
    high_risk_count: 0,
    medium_risk_count: 0,
    low_risk_count: 0,
  },
  risk_ne_summary: {
    risk_num: 0,
    high_risk_num: 0,
    medium_risk_num: 0,
    low_risk_num: 0,
  },
};

function main() {

  const codeSnippet = `
                         from '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_task_ne' AS tn
                   right join '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_task' AS task
                   on tn.task_id = task.task_id
                   left join '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_config' AS config
                   on  task.rule_id = config.rule_id
                   where tn.py_res_status in (1) and 
                       ((task.task_start_time >= $!startTime
                     and task.task_start_time < $!endTime ) or
                       (task.task_end_time >= $!startTime
                     and task.task_end_time <$!endTime ))
                      `;

  const riskTql = `select count(tn.task_ne_id) as risk_count, config.risk_level
                    ${codeSnippet}
                     and tn.risk_status = $!riskStatus
                   group by
                       config.risk_level `;

  const totalResult = SC_TQL_UTIL.queryByPrecompileTql(riskTql, {startTime, endTime}, start, limit).results;
  if (totalResult.length > 0) {
    buildClosedSummaryInfo(totalResult, 'risk_summary');
  }

  const uncloseResult = SC_TQL_UTIL.queryByPrecompileTql(riskTql, {startTime, endTime, riskStatus: '0'}, start, limit).results;
  if (uncloseResult.length > 0) {
    buildClosedSummaryInfo(uncloseResult, 'risk_unclose');
  }

  const closedResult = SC_TQL_UTIL.queryByPrecompileTql(riskTql, {startTime, endTime, riskStatus: '1'}, start, limit).results;
  if (closedResult.length > 0) {
    buildClosedSummaryInfo(closedResult, 'risk_closed');
  }

  const neQueryTql = `select count(distinct tn.ne_uid) as risk_num  ${codeSnippet} `;
  const neNumList = SC_TQL_UTIL.queryByPrecompileTql(neQueryTql, {startTime, endTime}, start, limit).results;
  if (neNumList.length > 0) {
    result.risk_ne_summary.risk_num = neNumList[0].risk_num;
    result.risk_ne_summary.high_risk_num = '--';
    result.risk_ne_summary.medium_risk_num = '--';
    result.risk_ne_summary.low_risk_num = '--';
  }

  return result;
}

// 数据为Risk Level的维度数据源来构建关闭与未关闭的汇总指标
function buildClosedSummaryInfo(summaryResult, type) {
  let totalCount = 0;
  let highTotalCount = 0;
  let mediumTotalCount = 0;
  let lowTotalCount = 0;

  summaryResult.forEach(item=>{
    totalCount = totalCount + item.risk_count || 0;

    highTotalCount = highTotalCount + (item.risk_level === 'High' ? item.risk_count : 0);
    mediumTotalCount = mediumTotalCount + (item.risk_level === 'Medium' ? item.risk_count : 0);
    lowTotalCount = lowTotalCount + (item.risk_level === 'Low' ? item.risk_count : 0);

  });
  result[type].risk_count = totalCount;
  result[type].high_risk_count = highTotalCount;
  result[type].medium_risk_count = mediumTotalCount;
  result[type].low_risk_count = lowTotalCount;
}

return main();
