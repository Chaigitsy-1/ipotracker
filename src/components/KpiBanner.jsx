import React from 'react';
import { Database, Zap, Percent, Award, TrendingUp, Calendar } from 'lucide-react';

export default function KpiBanner({ ipos }) {
  const closedIpos = ipos.filter(ipo => ipo.status === 'CLOSED');
  const alertsCount = closedIpos.filter(ipo => ipo.marketData && ipo.marketData.anomalyType !== 'NONE').length;
  
  // Calculate average listing gain for IPOs with marketData
  const listedWithMarketData = closedIpos.filter(ipo => ipo.marketData && ipo.marketData.listingGain !== null);
  const totalGain = listedWithMarketData.reduce((sum, ipo) => sum + ipo.marketData.listingGain, 0);
  const avgGain = listedWithMarketData.length > 0 ? (totalGain / listedWithMarketData.length).toFixed(1) : '0';

  // Find top listing gainer
  let topGainer = null;
  listedWithMarketData.forEach(ipo => {
    if (!topGainer || ipo.marketData.listingGain > topGainer.marketData.listingGain) {
      topGainer = ipo;
    }
  });

  // Find top 1-week gainer
  let weekWinner = null;
  closedIpos.forEach(ipo => {
    if (ipo.marketData && ipo.marketData.change1w !== null) {
      if (!weekWinner || ipo.marketData.change1w > weekWinner.marketData.change1w) {
        weekWinner = ipo;
      }
    }
  });

  // Find top 1-month gainer
  let monthWinner = null;
  closedIpos.forEach(ipo => {
    if (ipo.marketData && ipo.marketData.change1m !== null) {
      if (!monthWinner || ipo.marketData.change1m > monthWinner.marketData.change1m) {
        monthWinner = ipo;
      }
    }
  });

  return (
    <div className="kpi-container animate-fade-in">
      <div className="glass-panel kpi-card">
        <div className="kpi-icon">
          <Database size={24} />
        </div>
        <div>
          <div className="kpi-label">IPOs Screened</div>
          <div className="kpi-value">{closedIpos.length}</div>
        </div>
      </div>

      <div className="glass-panel kpi-card warning">
        <div className="kpi-icon">
          <Zap size={24} />
        </div>
        <div>
          <div className="kpi-label">Screener Alerts</div>
          <div className="kpi-value">{alertsCount}</div>
        </div>
      </div>

      <div className="glass-panel kpi-card success">
        <div className="kpi-icon">
          <Percent size={24} />
        </div>
        <div>
          <div className="kpi-label">Avg. Listing Gains</div>
          <div className="kpi-value">{avgGain}%</div>
        </div>
      </div>

      <div className="glass-panel kpi-card">
        <div className="kpi-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-secondary)' }}>
          <Award size={24} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div className="kpi-label">Top Listing Gainer</div>
          <div className="kpi-value" style={{ fontSize: '1.1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {topGainer ? `${topGainer.name} (+${topGainer.marketData.listingGain}%)` : 'N/A'}
          </div>
        </div>
      </div>

      <div className="glass-panel kpi-card success">
        <div className="kpi-icon">
          <TrendingUp size={24} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div className="kpi-label">Week's Winner</div>
          <div className="kpi-value" style={{ fontSize: '1.1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {weekWinner ? `${weekWinner.symbol} (+${weekWinner.marketData.change1w}%)` : 'N/A'}
          </div>
        </div>
      </div>

      <div className="glass-panel kpi-card">
        <div className="kpi-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
          <Calendar size={24} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div className="kpi-label">Month's Winner</div>
          <div className="kpi-value" style={{ fontSize: '1.1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {monthWinner ? `${monthWinner.symbol} (+${monthWinner.marketData.change1m}%)` : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
