import React, { useState } from 'react';
import { X, Calendar, MapPin, DollarSign, Activity, ShieldAlert, Award, FileText, CheckCircle, HelpCircle, ExternalLink } from 'lucide-react';

export default function IpoDetailModal({ ipo, onClose, onToggleWatchlist, isWatchlist }) {
  const [activeTab, setActiveTab] = useState('overview');
  if (!ipo) return null;

  const { name, symbol, type, status, priceRange, lotSize, schedule, subscriptionNumbers, greyMarketPremium, aboutCompany, strengths, risks, utilizationOfProceeds, drhpLink, rhpLink, marketData, exchanges } = ipo;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Helper to extract issue price
  function getIssuePrice(rangeStr) {
    if (!rangeStr) return 0;
    const cleaned = rangeStr.replace(/,/g, '');
    const matches = cleaned.match(/₹?\s*(\d+)\s*$/);
    return matches ? parseFloat(matches[1]) : 0;
  }
  const issuePrice = getIssuePrice(priceRange);

  // Timeline Step Generator
  const renderTimeline = () => {
    if (!schedule) return <p style={{ color: 'var(--text-muted)' }}>Timeline schedule details not available.</p>;

    const currentDate = new Date('2026-07-27'); // Baseline current date

    const steps = [
      { label: 'Offer Starts', date: schedule.startDate, key: 'startDate' },
      { label: 'Offer Ends', date: schedule.endDate, key: 'endDate' },
      { label: 'Allotment Finalization', date: schedule.allotmentFinalization, key: 'allotmentFinalization' },
      { label: 'Refund Initiation', date: schedule.refundInitiation, key: 'refundInitiation' },
      { label: 'Demat Credit', date: schedule.shareCredit, key: 'shareCredit' },
      { label: 'Listing Date', date: schedule.listingDate, key: 'listingDate' }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
        {steps.map((step, idx) => {
          const stepDate = step.date ? new Date(step.date) : null;
          let isPassed = false;
          let isCurrent = false;

          if (stepDate) {
            isPassed = currentDate > stepDate;
            // Check if current date matches step date
            isCurrent = currentDate.toDateString() === stepDate.toDateString();
          }

          return (
            <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  border: `2px solid ${isPassed ? 'var(--accent-success)' : isCurrent ? 'var(--accent-primary)' : 'var(--text-dim)'}`,
                  backgroundColor: isPassed ? 'var(--accent-success)' : isCurrent ? 'var(--bg-dark)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isCurrent ? '0 0 10px var(--accent-primary)' : 'none',
                  color: isPassed ? '#fff' : isCurrent ? 'var(--accent-primary)' : 'var(--text-dim)',
                  zIndex: 2
                }}>
                  {isPassed ? <CheckCircle size={14} style={{ color: '#fff' }} /> : <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{idx + 1}</span>}
                </div>
                {idx < steps.length - 1 && (
                  <div style={{ 
                    width: '2px', 
                    height: '40px', 
                    backgroundColor: isPassed ? 'var(--accent-success)' : 'var(--border-glass)',
                    marginTop: '4px',
                    marginBottom: '4px'
                  }}></div>
                )}
              </div>
              <div style={{ flexGrow: 1, paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h4 style={{ 
                    fontSize: '0.95rem', 
                    fontWeight: 600, 
                    color: isPassed ? 'var(--text-main)' : isCurrent ? 'var(--accent-primary)' : 'var(--text-muted)' 
                  }}>
                    {step.label}
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: isCurrent ? 'var(--accent-primary)' : 'var(--text-dim)', fontWeight: isCurrent ? 700 : 500 }}>
                    {formatDate(step.date)}
                  </span>
                </div>
                {isCurrent && (
                  <span className="badge badge-live" style={{ fontSize: '0.65rem', padding: '1px 6px', marginTop: '0.25rem' }}>
                    Happening Today
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Custom SVG Chart for GMP
  const renderGmpChart = () => {
    let trends = [];
    if (marketData && marketData.listingGain !== null && marketData.listingPrice) {
      // Create a mock listing trend if already listed
      trends = [
        { date: 'Issue', value: issuePrice },
        { date: 'List', value: marketData.listingPrice },
        { date: 'Current', value: marketData.currentPrice }
      ];
    } else if (greyMarketPremium && greyMarketPremium.gmpTrends && greyMarketPremium.gmpTrends.length > 0) {
      // Parse greyMarketPremium trends
      trends = [...greyMarketPremium.gmpTrends]
        .reverse()
        .map(t => {
          const val = parseInt(t.gmp.replace(/[^\d-]/g, ''));
          return {
            date: t.date,
            value: isNaN(val) ? 0 : val
          };
        });
    }

    if (trends.length < 2) {
      return (
        <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--border-glass)' }}>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Insufficient historical GMP trend data to render chart.</p>
        </div>
      );
    }

    const values = trends.map(t => t.value);
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, 10);
    const valRange = maxVal - minVal;

    const width = 450;
    const height = 150;
    const padding = 20;

    const getX = (index) => padding + (index * (width - 2 * padding)) / (trends.length - 1);
    const getY = (val) => height - padding - ((val - minVal) * (height - 2 * padding)) / valRange;

    // Build SVG Path
    let d = `M ${getX(0)} ${getY(trends[0].value)}`;
    for (let i = 1; i < trends.length; i++) {
      d += ` L ${getX(i)} ${getY(trends[i].value)}`;
    }

    // Path for gradient fill
    const dFill = `${d} L ${getX(trends.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;

    return (
      <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '1.5rem' }}>
        <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>
          {marketData && marketData.currentPrice ? 'Listing Price Progression (₹)' : 'Grey Market Premium (GMP) Trend (₹)'}
        </h4>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', maxHeight: '180px' }}>
            <defs>
              <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1={padding} y1={getY(minVal)} x2={width - padding} y2={getY(minVal)} stroke="var(--border-glass)" strokeDasharray="2" />
            <line x1={padding} y1={getY(maxVal)} x2={width - padding} y2={getY(maxVal)} stroke="var(--border-glass)" strokeDasharray="2" />
            <line x1={padding} y1={getY((maxVal + minVal) / 2)} x2={width - padding} y2={getY((maxVal + minVal) / 2)} stroke="var(--border-glass)" strokeDasharray="2" />

            {/* Area Path */}
            <path d={dFill} fill="url(#chartGlow)" />

            {/* Line Path */}
            <path d={d} fill="none" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Reference Dots & Labels */}
            {trends.map((t, idx) => (
              <g key={idx}>
                <circle cx={getX(idx)} cy={getY(t.value)} r="4" fill="var(--text-main)" stroke="var(--accent-primary)" strokeWidth="2" />
                <text 
                  x={getX(idx)} 
                  y={getY(t.value) - 8} 
                  fill="var(--text-main)" 
                  fontSize="8" 
                  fontWeight="600"
                  textAnchor="middle"
                >
                  ₹{t.value}
                </text>
                <text 
                  x={getX(idx)} 
                  y={height - 2} 
                  fill="var(--text-dim)" 
                  fontSize="8" 
                  textAnchor="middle"
                >
                  {t.date}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ width: '85%' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span className="badge" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-secondary)' }}>
                {type}
              </span>
              <span className="badge badge-closed">
                {exchanges || 'BSE, NSE'}
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {name}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, marginTop: '0.1rem' }}>
              Symbol: <strong style={{ color: 'var(--text-main)' }}>{symbol}</strong>
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="modal-tabs">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            Key Dates
          </button>
          <button 
            className={`tab-btn ${activeTab === 'procons' ? 'active' : ''}`}
            onClick={() => setActiveTab('procons')}
          >
            Analysis (Strengths/Risks)
          </button>
          <button 
            className={`tab-btn ${activeTab === 'gmp' ? 'active' : ''}`}
            onClick={() => setActiveTab('gmp')}
          >
            GMP & Subscription
          </button>
          {marketData && marketData.news && marketData.news.length > 0 && (
            <button 
              className={`tab-btn ${activeTab === 'news' ? 'active' : ''}`}
              onClick={() => setActiveTab('news')}
            >
              Related News
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="tab-content" style={{ overflowY: 'auto', paddingRight: '0.25rem' }}>
          
          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 700 }}>
                  About the Company
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6, textAlign: 'justify' }}>
                  {aboutCompany || 'No overview available for this company.'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Issue Size</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                    {ipo.issueSize && ipo.issueSize.totalIssueSize ? `₹${ipo.issueSize.totalIssueSize} Cr` : 'N/A'}
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>Fresh Issue / OFS</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.35rem' }}>
                    Fresh: {ipo.issueSize && ipo.issueSize.freshIssue ? `₹${ipo.issueSize.freshIssue} Cr` : 'N/A'}<br/>
                    OFS: {ipo.issueSize && ipo.issueSize.offerForSale ? `₹${ipo.issueSize.offerForSale} Cr` : 'N/A'}
                  </div>
                </div>
              </div>

              {utilizationOfProceeds && Object.values(utilizationOfProceeds).some(v => v !== null) && (
                <div>
                  <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Utilization of Proceeds
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {Object.entries(utilizationOfProceeds).map(([key, val]) => {
                      if (!val) return null;
                      return (
                        <div key={key} style={{ fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            <span style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                            <span style={{ fontWeight: 600 }}>{val}</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border-glass)', borderRadius: '2px' }}>
                            <div style={{ width: val.includes('%') ? val.match(/\d+%/)[0] : '50%', height: '100%', backgroundColor: 'var(--accent-primary)', borderRadius: '2px' }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* RHP Downloads */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                {drhpLink && drhpLink !== '#' && (
                  <a href={drhpLink} target="_blank" rel="noopener noreferrer" className="btn" style={{ flexGrow: 1, fontSize: '0.8rem', justifyContent: 'center' }}>
                    <FileText size={14} />
                    Download DRHP
                    <ExternalLink size={12} />
                  </a>
                )}
                {rhpLink && rhpLink !== '#' && (
                  <a href={rhpLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flexGrow: 1, fontSize: '0.8rem', justifyContent: 'center' }}>
                    <FileText size={14} />
                    Download RHP
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Timeline */}
          {activeTab === 'timeline' && (
            <div className="animate-fade-in">
              <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1rem', fontWeight: 700 }}>
                IPO Bidding & Listing Schedule
              </h4>
              {renderTimeline()}
            </div>
          )}

          {/* Tab 3: Strengths/Risks */}
          {activeTab === 'procons' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: 'var(--accent-success)', marginBottom: '0.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Award size={18} /> Strengths & Merits
                </h4>
                {strengths && strengths.length > 0 ? (
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {strengths.map((str, idx) => <li key={idx}>{str}</li>)}
                  </ul>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Strengths details not verified in prospectus.</p>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem' }}>
                <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: 'var(--accent-danger)', marginBottom: '0.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldAlert size={18} /> Key Business Risks
                </h4>
                {risks && risks.length > 0 ? (
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {risks.map((risk, idx) => <li key={idx}>{risk}</li>)}
                  </ul>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Risks details not verified in prospectus.</p>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: GMP & Subscriptions */}
          {activeTab === 'gmp' && (
            <div className="animate-fade-in">
              {renderGmpChart()}

              <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.75rem', fontWeight: 700 }}>
                Subscription Figures
              </h4>
              {subscriptionNumbers ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Reserved (Cr)</th>
                        <th>Applied (Cr)</th>
                        <th>Subscription Ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptionNumbers.qib && (
                        <tr>
                          <td><strong>QIB</strong> (Institutional)</td>
                          <td>{subscriptionNumbers.qib.reserved || 'N/A'}</td>
                          <td>{subscriptionNumbers.qib.applied || 'N/A'}</td>
                          <td style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{subscriptionNumbers.qib.subscription || 'N/A'}</td>
                        </tr>
                      )}
                      {subscriptionNumbers.institutional && !subscriptionNumbers.qib && (
                        <tr>
                          <td><strong>QIB</strong> (Institutional)</td>
                          <td>{subscriptionNumbers.institutional.reserved || 'N/A'}</td>
                          <td>{subscriptionNumbers.institutional.applied || 'N/A'}</td>
                          <td style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{subscriptionNumbers.institutional.subscription || 'N/A'}</td>
                        </tr>
                      )}
                      {subscriptionNumbers.nii && (
                        <tr>
                          <td><strong>NII / HNI</strong></td>
                          <td>{subscriptionNumbers.nii.reserved || 'N/A'}</td>
                          <td>{subscriptionNumbers.nii.applied || 'N/A'}</td>
                          <td style={{ color: 'var(--accent-secondary)', fontWeight: 700 }}>{subscriptionNumbers.nii.subscription || 'N/A'}</td>
                        </tr>
                      )}
                      {subscriptionNumbers.retail && (
                        <tr>
                          <td><strong>Retail Investors</strong></td>
                          <td>{subscriptionNumbers.retail.reserved || 'N/A'}</td>
                          <td>{subscriptionNumbers.retail.applied || 'N/A'}</td>
                          <td style={{ color: 'var(--accent-success)', fontWeight: 700 }}>{subscriptionNumbers.retail.subscription || 'N/A'}</td>
                        </tr>
                      )}
                      {subscriptionNumbers.total && (
                        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <td><strong>Total Subscription</strong></td>
                          <td>{subscriptionNumbers.total.reserved || 'N/A'}</td>
                          <td>{subscriptionNumbers.total.applied || 'N/A'}</td>
                          <td style={{ color: 'var(--accent-warning)', fontWeight: 800 }}>{subscriptionNumbers.total.subscription || 'N/A'}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Subscription figures are not updated yet.</p>
              )}

              {/* Allotment Registrars links */}
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.1)' }}>
                <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <HelpCircle size={14} color="var(--accent-primary)" /> Check Allotment Status Official Portals
                </h5>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  IPO allotment is finalized by the designated registrar. Click the buttons below to check your status directly on their portal:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <a href="https://linkintime.co.in/initial_offer/public-issues.html" target="_blank" rel="noopener noreferrer" className="btn" style={{ flexGrow: 1, fontSize: '0.75rem', padding: '0.5rem', justifyContent: 'center' }}>
                    Link Intime Portal <ExternalLink size={10} />
                  </a>
                  <a href="https://kosmic.kfintech.com/ipostatus/" target="_blank" rel="noopener noreferrer" className="btn" style={{ flexGrow: 1, fontSize: '0.75rem', padding: '0.5rem', justifyContent: 'center' }}>
                    KFintech Portal <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: News Feed */}
          {activeTab === 'news' && marketData && marketData.news && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.25rem', fontWeight: 700 }}>
                Recent News & Developments
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                Flagging news headlines for block deals, promoter activities, or earnings releases.
              </p>
              {marketData.news.map((item, idx) => (
                <a 
                  key={idx} 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="glass-panel" 
                  style={{ 
                    padding: '0.85rem', 
                    display: 'block', 
                    textDecoration: 'none', 
                    color: 'inherit',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    transition: 'var(--transition-smooth)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-glass)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                    <span>{item.publisher}</span>
                    <span>{new Date(item.time * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.4 }}>
                    {item.title}
                  </h5>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
