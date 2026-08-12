function getRiskCheckNeDetails(start, limit, risk_status, risk_type_code, ne_type_code, risk_level_code, ne_id, risk_name) {
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_risk_check_ne_details',
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
  return HttpRequest.ajax({
    url: '/adc-service/web/rest/v1/services/EdgeCoreNetExpertService/cne_dash/cne_dash_risk_overview',
    method: 'post',
    data: {},
  });
}

export { getRiskCheckNeDetails, getRiskOverview };
