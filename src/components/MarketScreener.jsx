import React, { useState } from 'react';
import { ShieldAlert, Zap, TrendingDown, Eye, ExternalLink, MessageSquare, BarChart3, Database } from 'lucide-react';

export default function MarketScreener({ ipos, onSelectIpo }) {
  const [selectedCase, setSelectedCase] = useState('case2'); // Default to Sleeper Breakout as it finds gems!

  const closedIpos = ipos.filter(ipo => ipo.marketData);

  // Filter Case 1: Hype Deflation
  const hypeDeflations = closedIpos.filter(ipo => ipo.marketData.anomalyType === 'HYPE_DEFLATION');

  // Filter Case 2: Sleeper Breakout
  const sleeperBreakouts = closedIpos.filter(ipo => ipo.marketData.anomalyType === 'SLEEPER_BREAKOUT');

  // Filter Case 3: 52-Week High Breakout
  const fiftyTwoWeekHighs = closedIpos.filter(ipo => ipo.marketData.anomalyType === 'FIFTY_TWO_WEEK_HIGH');

  const getActiveList = () => {
    if (selectedCase === 'case1') return hypeDeflations;
    if (selectedCase === 'case2') return sleeperBreakouts;
    return fiftyTwoWeekHighs;
  };

  function getIssuePrice(rangeStr) {
    if (!rangeStr) return 0;
    const cleaned = rangeStr.replace(/,/g, '');
    const matches = cleaned.match(/₹?\s*(\d+)\s*$/);
    return matches ? parseFloat(matches[1]) : 0;
  }

  return (
    <div className="animate-fade-in">
      {/* Introduction */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
          💡 Intelligent Market Screener & Anomaly Tracker
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          This screener identifies Indian stocks that have listed in the last 1-2 years and exhibit anomalies in price and volume action. Use these screens to find deep-value investment opportunities, catch sleeper breakouts, or track momentum stocks hitting new 52-Week Highs.
        </p>
      </div>

      {/* Screen Selector Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setSelectedCase('case1')}
          className="glass-panel"
          style={{ 
            padding: '1.25rem', 
            textAlign: 'left', 
            cursor: 'pointer',
            border: selectedCase === 'case1' ? '1px solid var(--accent-danger)' : '1px solid var(--border-glass)',
            background: selectedCase === 'case1' ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-card)',
            boxShadow: selectedCase === 'case1' ? 'var(--shadow-danger-glow)' : 'none',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            transition: 'var(--transition-smooth)'
          }}
        >
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '8px', 
            backgroundColor: 'rgba(239, 68, 68, 0.15)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'var(--accent-danger)' 
          }}>
            <TrendingDown size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>CASE 1</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.1rem 0' }}>
              Hype Deflation ({hypeDeflations.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Listed with hype, crashed below Issue Price.
            </span>
          </div>
        </button>

        <button 
          onClick={() => setSelectedCase('case2')}
          className="glass-panel"
          style={{ 
            padding: '1.25rem', 
            textAlign: 'left', 
            cursor: 'pointer',
            border: selectedCase === 'case2' ? '1px solid var(--accent-success)' : '1px solid var(--border-glass)',
            background: selectedCase === 'case2' ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)',
            boxShadow: selectedCase === 'case2' ? 'var(--shadow-success-glow)' : 'none',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            transition: 'var(--transition-smooth)'
          }}
        >
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '8px', 
            backgroundColor: 'rgba(16, 185, 129, 0.15)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'var(--accent-success)' 
          }}>
            <Zap size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>CASE 2</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.1rem 0' }}>
              Sleeper Breakouts ({sleeperBreakouts.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Weak listing gains, post-IPO volume/price surge.
            </span>
          </div>
        </button>

        <button 
          onClick={() => setSelectedCase('case3')}
          className="glass-panel"
          style={{ 
            padding: '1.25rem', 
            textAlign: 'left', 
            cursor: 'pointer',
            border: selectedCase === 'case3' ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
            background: selectedCase === 'case3' ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)',
            boxShadow: selectedCase === 'case3' ? 'var(--shadow-glow)' : 'none',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            transition: 'var(--transition-smooth)'
          }}
        >
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '8px', 
            backgroundColor: 'rgba(99, 102, 241, 0.15)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'var(--accent-primary)' 
          }}>
            <BarChart3 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>CASE 3</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.1rem 0' }}>
              52W High Breakouts ({fiftyTwoWeekHighs.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Trading near 52-Week High with volume breakout.
            </span>
          </div>
        </button>
      </div>

      {/* Flagged Stocks List */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {selectedCase === 'case1' ? (
            <>
              <ShieldAlert size={18} color="var(--accent-danger)" /> Flagged Hype Deflations (Value Trap / Gems?)
            </>
          ) : selectedCase === 'case2' ? (
            <>
              <Zap size={18} color="var(--accent-success)" /> Flagged Sleeper Breakouts (Institutional Buy?)
            </>
          ) : (
            <>
              <BarChart3 size={18} color="var(--accent-primary)" /> Flagged 52-Week High Breakouts (Momentum Alerts)
            </>
          )}
        </h3>

        {getActiveList().length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
            <Database size={48} style={{ marginBottom: '1rem', strokeWidth: '1.5px' }} />
            <p style={{ fontSize: '0.9rem' }}>No stocks currently flagged in this category.</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Try running the data update script to fetch latest prices!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {getActiveList().map((stock) => {
              const m = stock.marketData;
              const issue = getIssuePrice(stock.priceRange);
              
              return (
                <div 
                  key={stock.symbol} 
                  className="glass-panel animate-fade-in"
                  style={{ 
                    padding: '1.25rem', 
                    border: '1px solid var(--border-glass)',
                    background: 'rgba(255,255,255,0.01)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                >
                  {/* Title & Info Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: '#1c1e30', display: 'flex', alignItems: 'center', justify: 'center', overflow: 'hidden' }}>
                        {stock.logoUrl ? (
                          <img src={stock.logoUrl} alt={stock.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{stock.symbol.substring(0,3)}</span>
                        )}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {stock.name} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>({stock.symbol})</span>
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>{stock.type} IPO</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => onSelectIpo(stock)} 
                        className="btn"
                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                      >
                        <Eye size={12} /> View Profile
                      </button>
                      
                      {/* Deep Search Buttons */}
                      <a 
                        href={`https://www.screener.in/company/${stock.symbol}/`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn"
                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', color: 'var(--accent-success)' }}
                      >
                        Screener <ExternalLink size={10} />
                      </a>
                      <a 
                        href={`https://www.google.com/finance/quote/${stock.symbol}:NSE`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn"
                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', color: 'var(--accent-primary)' }}
                      >
                        Google Finance <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>

                  {/* Quick Technical Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Issue Price</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>₹{issue || m.listingPrice}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>52W High</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>₹{m.fiftyTwoWeekHigh} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({m.pctFrom52WHigh.toFixed(1)}%)</span></div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Current Price</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>₹{m.currentPrice}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Drawdown (Peak)</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-danger)' }}>{m.drawdown}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Volume Spike</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: m.volumeSpike > 1.5 ? 'var(--accent-success)' : 'var(--text-main)' }}>{m.volumeSpike}x</div>
                    </div>
                  </div>

                  {/* Returns row */}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>1W Chg: <strong style={{ color: m.change1w >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{m.change1w >= 0 ? '+' : ''}{m.change1w}%</strong></span>
                    <span>1M Chg: <strong style={{ color: m.change1m >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{m.change1m >= 0 ? '+' : ''}{m.change1m}%</strong></span>
                    <span>3M Chg: <strong style={{ color: m.change3m >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{m.change3m >= 0 ? '+' : ''}{m.change3m}%</strong></span>
                    {m.change6m !== null && <span>6M Chg: <strong style={{ color: m.change6m >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{m.change6m >= 0 ? '+' : ''}{m.change6m}%</strong></span>}
                  </div>

                  {/* Highlights/Triggers Detected */}
                  {m.triggers && m.triggers.length > 0 && (
                    <div style={{ borderLeft: '3px solid var(--accent-primary)', paddingLeft: '0.75rem', background: 'rgba(99, 102, 241, 0.03)', padding: '0.5rem 0.75rem', borderRadius: '0 8px 8px 0' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                        <BarChart3 size={12} /> Programmatic Triggers Detected
                      </div>
                      <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {m.triggers.map((t, index) => <li key={index}>{t}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Related News List */}
                  {m.news && m.news.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.35rem' }}>
                        <MessageSquare size={12} /> News Headlines (Trigger Audit)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {m.news.slice(0, 2).map((item, index) => (
                          <a 
                            key={index} 
                            href={item.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              fontSize: '0.78rem', 
                              color: 'var(--text-muted)', 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              textDecoration: 'none',
                              padding: '0.35rem 0.5rem',
                              background: 'rgba(255,255,255,0.01)',
                              border: '1px solid var(--border-glass)',
                              borderRadius: '4px'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-glass)'}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '80%' }}>{item.title}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{item.publisher}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
