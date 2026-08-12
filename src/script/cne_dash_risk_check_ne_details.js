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

const start = _message.start ? _message.start : 0;
const limit = _message.limit ? _message.limit : 10;
const riskStatusCode = _message.risk_status || 'ALL';
const riskTypeCode = _message.risk_type_code || '';
const neTypeCode = _message.ne_type_code || '';
const riskLevelCode = _message.risk_level_code || '';
const neId = _message.ne_id || '';
const riskName = _message.risk_name || '';

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

// 三表 JOIN 基础片段
const codeSnippet = `
  from '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_task_ne' AS tn
  left join '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_task' AS task
  on tn.task_id = task.task_id
  left join '/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_risk_config' AS config
  on task.rule_id = config.rule_id
  where tn.py_res_status in (1) and config.active = 1
`;

function main() {
  // 1. 构建范围筛选条件（影响 filter_options 和列表）
  const scopeParams = {};
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

return main();
