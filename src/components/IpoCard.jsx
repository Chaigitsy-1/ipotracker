import React from 'react';
import { Star, Calendar, IndianRupee, Layers, Users, TrendingUp } from 'lucide-react';

export default function IpoCard({ ipo, isWatchlist, onToggleWatchlist, onClick }) {
  const { name, symbol, type, status, priceRange, lotSize, schedule, subscriptionNumbers, greyMarketPremium, marketData } = ipo;

  // Format date strings
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  // Get status badge class and label
  const getStatusLabel = () => {
    switch (status) {
      case 'LIVE': return <span className="badge badge-live">Live Bidding</span>;
      case 'UPCOMING': return <span className="badge badge-upcoming">Upcoming</span>;
      case 'CLOSED':
        // If listing date is in the past, it's listed
        const isListed = marketData && marketData.currentPrice;
        return isListed ? 
          <span className="badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(99,102,241,0.25)' }}>Listed</span> : 
          <span className="badge badge-closed">Bidding Closed</span>;
      default: return <span className="badge badge-closed">{status}</span>;
    }
  };

  // Get GMP tag
  const getGmpText = () => {
    if (marketData && marketData.listingGain !== null) {
      return `₹${(marketData.listingPrice - getIssuePrice(priceRange)).toFixed(0)} (${marketData.listingGain >= 0 ? '+' : ''}${marketData.listingGain}%)`;
    }
    if (greyMarketPremium && greyMarketPremium.gmpTrends && greyMarketPremium.gmpTrends[0]) {
      const g = greyMarketPremium.gmpTrends[0];
      return `${g.gmp} (${g.gain})`;
    }
    return 'N/A';
  };

  // Helper to extract issue price
  function getIssuePrice(rangeStr) {
    if (!rangeStr) return 0;
    const cleaned = rangeStr.replace(/,/g, '');
    const matches = cleaned.match(/₹?\s*(\d+)\s*$/);
    return matches ? parseFloat(matches[1]) : 0;
  }

  const issuePrice = getIssuePrice(priceRange);
  const totalSubscription = subscriptionNumbers && subscriptionNumbers.total ? subscriptionNumbers.total.subscription : null;

  return (
    <div 
      className="glass-panel animate-fade-in" 
      style={{ 
        padding: '1.25rem', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between', 
        position: 'relative', 
        cursor: 'pointer',
        height: '100%',
        minHeight: '260px'
      }}
      onClick={onClick}
    >
      {/* Top Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '85%' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '8px', 
              backgroundColor: '#1b1d2e', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              {ipo.logoUrl ? (
                <img src={ipo.logoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&auto=format&fit=crop&q=60`;
                }} />
              ) : (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {symbol.substring(0, 3)}
                </span>
              )}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.05rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {name}
              </h3>
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginTop: '0.1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>{symbol}</span>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--text-dim)' }}></span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>{type}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist(symbol);
            }}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: isWatchlist ? 'var(--accent-warning)' : 'var(--text-dim)',
              padding: '4px'
            }}
          >
            <Star size={18} fill={isWatchlist ? 'var(--accent-warning)' : 'transparent'} />
          </button>
        </div>

        {/* Status indicator row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.75rem 0' }}>
          {getStatusLabel()}
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={12} />
            {schedule ? `${formatDate(schedule.startDate)} - ${formatDate(schedule.endDate)}` : 'N/A'}
          </span>
        </div>

        {/* Detailed Stats */}
        <div style={{ 
          background: 'rgba(255,255,255,0.02)', 
          borderRadius: '8px', 
          padding: '0.75rem', 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '0.75rem',
          margin: '0.75rem 0'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <IndianRupee size={10} /> Price Band
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.1rem' }}>
              {priceRange}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <Layers size={10} /> Lot Size
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.1rem' }}>
              {lotSize} shares {issuePrice > 0 ? `(₹${(issuePrice * lotSize).toLocaleString()})` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription and GMP Row */}
      <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
          {totalSubscription && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Users size={14} color="var(--accent-primary)" />
              <span style={{ color: 'var(--text-muted)' }}>Subscribed:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{totalSubscription}</span>
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto' }}>
            <TrendingUp size={14} color="var(--accent-success)" />
            <span style={{ color: 'var(--text-muted)' }}>GMP:</span>
            <span style={{ 
              fontWeight: 700, 
              color: getGmpText().includes('-') ? 'var(--accent-danger)' : 'var(--accent-success)'
            }}>
              {getGmpText()}
            </span>
          </div>
        </div>

        {/* Current price if listed */}
        {marketData && marketData.currentPrice && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginTop: '0.5rem', background: 'rgba(99, 102, 241, 0.05)', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>LTP: <strong style={{ color: 'var(--text-main)' }}>₹{marketData.currentPrice}</strong></span>
            <span style={{ 
              fontWeight: 600, 
              fontSize: '0.75rem',
              color: marketData.change1m >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'
            }}>
              1M: {marketData.change1m >= 0 ? '+' : ''}{marketData.change1m ? `${marketData.change1m}%` : 'N/A'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
