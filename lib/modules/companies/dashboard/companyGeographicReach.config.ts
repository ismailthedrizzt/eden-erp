export const companyGeographicReachWidgetConfig = {
  id: 'companies-geographic-trade-reach',
  title: 'Coğrafi Erişim ve Ticari Ağ',
  module: 'companies',
  permissions: [
    'companies.view',
    'geo_reach.view',
  ],
  tradePermissions: [
    'trade_reach.view',
    'account_movements.view_summary',
  ],
}
