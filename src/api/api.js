import { mockOverview, mockDetails } from '../mock/riskData.js';

const USE_MOCK = true;

function getRiskCheckNeDetails(start, limit, risk_status, risk_type_code, ne_type_code, risk_level_code, ne_id, risk_name) {
  if (USE_MOCK) {
    return Promise.resolve(mockDetails(start, limit, risk_status, risk_type_code, ne_type_code, risk_level_code, ne_id, risk_name));
  }
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_cne_details',
    method: 'post',
    data: {
      start,
      limit,
      risk_status,
      risk_type_code,
      ne_type_code,
      risk_level_code,
      ne_id,
      risk_name,
    },
  });
}

function getRiskOverview() {
  if (USE_MOCK) {
    return Promise.resolve(mockOverview);
  }
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeRiskCheckService/cs_ncd_risk_check/cs_ncd_risk_check_cne_overview',
    method: 'post',
    data: {},
  });
}

export { getRiskCheckNeDetails, getRiskOverview };