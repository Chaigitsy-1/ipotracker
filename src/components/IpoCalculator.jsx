import React, { useState, useEffect } from 'react';
import { Calculator, AlertCircle, HelpCircle, DollarSign, Info } from 'lucide-react';

export default function IpoCalculator({ ipos }) {
  const activeIpos = ipos.filter(ipo => ipo.priceRange && ipo.lotSize);
  
  const [selectedSymbol, setSelectedSymbol] = useState(activeIpos[0]?.symbol || '');
  const [lotSize, setLotSize] = useState(activeIpos[0]?.lotSize || 1);
  const [price, setPrice] = useState(0);
  const [lots, setLots] = useState(1);
  const [category, setCategory] = useState('retail');

  // Helper to extract issue price
  function getIssuePrice(rangeStr) {
    if (!rangeStr) return 0;
    const cleaned = rangeStr.replace(/,/g, '');
    const matches = cleaned.match(/₹?\s*(\d+)\s*$/);
    return matches ? parseFloat(matches[1]) : 0;
  }

  // Update lot size and price when selected IPO changes
  useEffect(() => {
    const selectedIpo = activeIpos.find(ipo => ipo.symbol === selectedSymbol);
    if (selectedIpo) {
      setLotSize(parseInt(selectedIpo.lotSize) || 1);
      setPrice(getIssuePrice(selectedIpo.priceRange) || 0);
    }
  }, [selectedSymbol, ipos]);

  const selectedIpo = activeIpos.find(ipo => ipo.symbol === selectedSymbol);

  // Calculations
  const totalShares = lotSize * lots;
  const totalInvestment = totalShares * price;

  // GMP details
  let gmpValue = 0;
  let gmpPercent = 0;
  
  if (selectedIpo) {
    if (selectedIpo.marketData && selectedIpo.marketData.listingGain !== null) {
      gmpPercent = selectedIpo.marketData.listingGain;
      gmpValue = selectedIpo.marketData.listingPrice - getIssuePrice(selectedIpo.priceRange);
    } else if (selectedIpo.greyMarketPremium && selectedIpo.greyMarketPremium.gmpTrends && selectedIpo.greyMarketPremium.gmpTrends[0]) {
      const g = selectedIpo.greyMarketPremium.gmpTrends[0];
      gmpValue = parseInt(g.gmp.replace(/[^\d-]/g, '')) || 0;
      gmpPercent = parseFloat(g.gain.replace(/[^\d.]/g, '')) || 0;
    }
  }

  const estimatedListingPrice = price + gmpValue;
  const estimatedProfit = totalShares * gmpValue;

  // Allotment Probability calculation based on SEBI rules
  const getAllotmentStats = () => {
    if (!selectedIpo || !selectedIpo.subscriptionNumbers) {
      return { prob: 'N/A', message: 'Subscription numbers not available yet.' };
    }

    const sub = selectedIpo.subscriptionNumbers;
    let subRatio = 1;

    if (category === 'retail' && sub.retail) {
      subRatio = parseFloat(sub.retail.subscription.replace(/x/gi, '')) || 1;
    } else if (category === 'nii' && sub.nii) {
      subRatio = parseFloat(sub.nii.subscription.replace(/x/gi, '')) || 1;
    } else if (category === 'qib' && (sub.qib || sub.institutional)) {
      const q = sub.qib || sub.institutional;
      subRatio = parseFloat(q.subscription.replace(/x/gi, '')) || 1;
    } else if (sub.total) {
      subRatio = parseFloat(sub.total.subscription.replace(/x/gi, '')) || 1;
    }

    if (subRatio <= 1) {
      return { 
        prob: '100%', 
        message: `Oversubscription is ${subRatio}x. Allotment is guaranteed (subject to valid application).` 
      };
    }

    // Oversubscribed SEBI rules
    if (category === 'retail') {
      const percentage = (1 / subRatio) * 100;
      return {
        prob: `${percentage.toFixed(1)}%`,
        message: `Oversubscribed by ${subRatio}x. SEBI retail allotment rules apply (lottery of 1 lot per unique PAN). Applying for more lots does not increase allotment probability; it only blocks capital.`
      };
    } else {
      // HNI or other
      const percentage = (1 / subRatio) * 100;
      return {
        prob: `${percentage.toFixed(1)}%`,
        message: `Oversubscribed by ${subRatio}x. Lottery allotment system for minimum HNI lot size applies. Allotment is highly competitive.`
      };
    }
  };

  const allotment = getAllotmentStats();

  return (
    <div className="animate-fade-in calc-grid">
      {/* Input panel */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calculator size={18} color="var(--accent-primary)" /> Bidding Calculator
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Select IPO */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Select Stock Offering
            </label>
            <select 
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: '8px',
                backgroundColor: '#1b1d2e',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-body)',
                outline: 'none'
              }}
            >
              {activeIpos.map(ipo => (
                <option key={ipo.symbol} value={ipo.symbol}>{ipo.name} ({ipo.symbol})</option>
              ))}
            </select>
          </div>

          {/* Number of Lots */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Bid Price (₹)
              </label>
              <input 
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '8px',
                  backgroundColor: '#1b1d2e',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Number of Lots
              </label>
              <input 
                type="number"
                min="1"
                max="100"
                value={lots}
                onChange={(e) => setLots(parseInt(e.target.value) || 1)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '8px',
                  backgroundColor: '#1b1d2e',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Category selection */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Investor Category
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button"
                className={`btn ${category === 'retail' ? 'btn-primary' : ''}`}
                style={{ flexGrow: 1, fontSize: '0.75rem', padding: '0.5rem' }}
                onClick={() => setCategory('retail')}
              >
                Retail (Max ₹2 Lakhs)
              </button>
              <button 
                type="button"
                className={`btn ${category === 'nii' ? 'btn-primary' : ''}`}
                style={{ flexGrow: 1, fontSize: '0.75rem', padding: '0.5rem' }}
                onClick={() => setCategory('nii')}
              >
                HNI / NII (&gt; ₹2 Lakhs)
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <Info size={16} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
              * Lot Size for this IPO is <strong>{lotSize}</strong> shares. Bidding is allowed only in multiples of the lot size. Price is set to the upper price band by default.
            </p>
          </div>
        </div>
      </div>

      {/* Output Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: '#fff' }}>
            📊 Investment Projection
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Bid Shares</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{totalShares} shares</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Required Bidding Capital</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>₹{totalInvestment.toLocaleString('en-IN')}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Est. Grey Market Gain</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: gmpValue >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                {gmpValue >= 0 ? `+₹${gmpValue} (${gmpPercent}%)` : `₹${gmpValue} (${gmpPercent}%)`}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Expected Listing Price</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>₹{estimatedListingPrice}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.65rem', background: 'rgba(16, 185, 129, 0.05)', padding: '0.5rem', borderRadius: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-success)', fontWeight: 600 }}>Estimated Listing Profit</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-success)' }}>
                ₹{estimatedProfit.toLocaleString('en-IN')}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Allotment Probability</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-primary)', textShadow: '0 0 10px rgba(99,102,241,0.2)' }}>
                {allotment.prob}
              </span>
            </div>
          </div>
        </div>

        {/* Rule note */}
        <div style={{ marginTop: '1.5rem', padding: '0.85rem', background: 'rgba(255, 255, 255, 0.01)', borderRadius: '8px', border: '1px solid var(--border-glass)', display: 'flex', gap: '0.5rem' }}>
          <AlertCircle size={16} color="var(--accent-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            <strong>Allotment Rule:</strong> {allotment.message}
          </p>
        </div>
      </div>
    </div>
  );
}
