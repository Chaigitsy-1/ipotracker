import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import KpiBanner from './components/KpiBanner';
import IpoCard from './components/IpoCard';
import IpoDetailModal from './components/IpoDetailModal';
import MarketScreener from './components/MarketScreener';
import IpoCalculator from './components/IpoCalculator';
import ReportViewer from './components/ReportViewer';

// Load our pre-compiled local JSON data
import localMarketData from './data/ipoMarketData.json';
import localDataCache from './data/ipoDataCache.json';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('MAINBOARD');
  const [currentPage, setCurrentPage] = useState(1);
  const [timeframeFilter, setTimeframeFilter] = useState('ALL');
  const [sortCol, setSortCol] = useState('listingDate');
  const [sortDir, setSortDir] = useState('desc');
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Watchlist stored in localstorage
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('ipo_watchlist');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedIpo, setSelectedIpo] = useState(null);
  
  // Combine databases with fallback logic
  const [ipos, setIpos] = useState([]);
  const [dataState, setDataState] = useState({
    isLive: false,
    loading: false,
    lastUpdated: 'N/A'
  });

  // Load initial data
  useEffect(() => {
    if (localMarketData && localMarketData.data && localMarketData.data.length > 0) {
      const closedData = localMarketData.data.filter(ipo => ipo.status === 'CLOSED');
      setIpos(closedData);
      setDataState({
        isLive: true,
        loading: false,
        lastUpdated: localMarketData.lastUpdated || 'Calculated Recently'
      });
    } else {
      // Fallback to static pre-seeded cache
      const backupData = (localDataCache.data || localDataCache || []).filter(ipo => ipo.status === 'CLOSED');
      setIpos(backupData);
      setDataState({
        isLive: false,
        loading: false,
        lastUpdated: 'July 2026 Cache'
      });
    }
  }, []);

  // Save watchlist on change
  useEffect(() => {
    localStorage.setItem('ipo_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Reset page number on filter/tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, timeframeFilter, sortCol, sortDir, activeTab]);

  const handleSortClick = (col) => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const handleToggleWatchlist = (symbol) => {
    setWatchlist(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol) 
        : [...prev, symbol]
    );
  };

  // Attempt to re-fetch live listings from Upvaly API
  const handleRefresh = async () => {
    setDataState(prev => ({ ...prev, loading: true }));
    try {
      console.log('Fetching live updates from Upvaly API...');
      const res = await fetch('https://finapi.upvaly.com/api/ipo');
      if (!res.ok) throw new Error('API fetch failed');
      const json = await res.json();
      if (json && json.status === 'success' && Array.isArray(json.data)) {
        // Map any existing marketData calculations from our local database to the freshly fetched list
        const updatedList = json.data
          .filter(ipo => ipo.status === 'CLOSED')
          .map(freshIpo => {
            const matched = ipos.find(i => i.symbol === freshIpo.symbol);
            return {
              ...freshIpo,
              marketData: matched ? matched.marketData : null
            };
          });

        setIpos(updatedList);
        const localTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        setDataState({
          isLive: true,
          loading: false,
          lastUpdated: `Live API Refreshed: ${localTime}`
        });
      }
    } catch (err) {
      console.warn('API refresh failed (likely CORS or Offline). Keep current data.', err.message);
      alert('Could not refresh live listings from Upvaly FinAPI due to CORS restrictions or Network error. Using local database cache.');
      setDataState(prev => ({ ...prev, loading: false }));
    }
  };

  // Filters logic
  const filteredIpos = ipos.filter(ipo => {
    const matchesSearch = ipo.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ipo.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'ALL' || 
                        (typeFilter === 'MAINBOARD' && ipo.type === 'Mainboard') || 
                        (typeFilter === 'SME' && ipo.type === 'SME');

    const matchesWatchlist = activeTab !== 'watchlist' || watchlist.includes(ipo.symbol);

    // Timeframe filter relative to baseline date 2026-07-27
    let matchesTimeframe = true;
    if (timeframeFilter !== 'ALL' && ipo.schedule && ipo.schedule.listingDate) {
      const listingDate = new Date(ipo.schedule.listingDate);
      const today = new Date('2026-07-27');
      let cutoff = new Date('2024-07-27'); // default 2 years

      if (timeframeFilter === '1W') {
        cutoff = new Date(today);
        cutoff.setDate(today.getDate() - 7);
      } else if (timeframeFilter === '3M') {
        cutoff = new Date(today);
        cutoff.setMonth(today.getMonth() - 3);
      } else if (timeframeFilter === '6M') {
        cutoff = new Date(today);
        cutoff.setMonth(today.getMonth() - 6);
      } else if (timeframeFilter === '1Y') {
        cutoff = new Date(today);
        cutoff.setFullYear(today.getFullYear() - 1);
      } else if (timeframeFilter === '1.5Y') {
        cutoff = new Date(today);
        cutoff.setMonth(today.getMonth() - 18);
      }
      
      matchesTimeframe = listingDate >= cutoff;
    }

    return matchesSearch && matchesType && matchesWatchlist && matchesTimeframe;
  });

  // Sort logic
  const sortedIpos = [...filteredIpos].sort((a, b) => {
    let valA, valB;
    
    if (sortCol === 'listingDate') {
      valA = a.schedule && a.schedule.listingDate ? new Date(a.schedule.listingDate).getTime() : 0;
      valB = b.schedule && b.schedule.listingDate ? new Date(b.schedule.listingDate).getTime() : 0;
    } else if (sortCol === 'symbol') {
      valA = a.symbol || '';
      valB = b.symbol || '';
    } else if (sortCol === 'listingGain') {
      valA = a.marketData && a.marketData.listingGain !== null ? a.marketData.listingGain : -9999;
      valB = b.marketData && b.marketData.listingGain !== null ? b.marketData.listingGain : -9999;
    } else if (sortCol === 'vsIssue') {
      valA = a.marketData && a.marketData.vsIssue !== null ? a.marketData.vsIssue : 9999;
      valB = b.marketData && b.marketData.vsIssue !== null ? b.marketData.vsIssue : 9999;
    } else if (sortCol === 'vsListing') {
      valA = a.marketData && a.marketData.vsListing !== null ? a.marketData.vsListing : 9999;
      valB = b.marketData && b.marketData.vsListing !== null ? b.marketData.vsListing : 9999;
    } else if (sortCol === 'currentPrice') {
      valA = a.marketData && a.marketData.currentPrice !== null ? a.marketData.currentPrice : -9999;
      valB = b.marketData && b.marketData.currentPrice !== null ? b.marketData.currentPrice : -9999;
    } else if (sortCol === 'change1w') {
      valA = a.marketData && a.marketData.change1w !== null ? a.marketData.change1w : -9999;
      valB = b.marketData && b.marketData.change1w !== null ? b.marketData.change1w : -9999;
    } else if (sortCol === 'change1m') {
      valA = a.marketData && a.marketData.change1m !== null ? a.marketData.change1m : -9999;
      valB = b.marketData && b.marketData.change1m !== null ? b.marketData.change1m : -9999;
    } else if (sortCol === 'change3m') {
      valA = a.marketData && a.marketData.change3m !== null ? a.marketData.change3m : -9999;
      valB = b.marketData && b.marketData.change3m !== null ? b.marketData.change3m : -9999;
    } else if (sortCol === 'change6m') {
      valA = a.marketData && a.marketData.change6m !== null ? a.marketData.change6m : -9999;
      valB = b.marketData && b.marketData.change6m !== null ? b.marketData.change6m : -9999;
    } else if (sortCol === 'change1y') {
      valA = a.marketData && a.marketData.change1y !== null ? a.marketData.change1y : -9999;
      valB = b.marketData && b.marketData.change1y !== null ? b.marketData.change1y : -9999;
    } else if (sortCol === 'volumeSpike') {
      valA = a.marketData && a.marketData.volumeSpike !== null ? a.marketData.volumeSpike : -9999;
      valB = b.marketData && b.marketData.volumeSpike !== null ? b.marketData.volumeSpike : -9999;
    } else if (sortCol === 'pctFrom52WHigh') {
      valA = a.marketData && a.marketData.pctFrom52WHigh !== null ? a.marketData.pctFrom52WHigh : -9999;
      valB = b.marketData && b.marketData.pctFrom52WHigh !== null ? b.marketData.pctFrom52WHigh : -9999;
    } else {
      return 0;
    }

    if (valA === valB) return 0;
    
    // String comparisons
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    
    // Numeric/Date comparisons
    if (sortDir === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });

  // Pagination variables
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedIpos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredIpos.length / itemsPerPage);

  return (
    <div className="app-container">
      {/* Top Navigation & Header */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        watchlistCount={watchlist.length} 
        dataState={dataState}
        onRefresh={handleRefresh}
      />

      {/* KPI statistics banner */}
      <KpiBanner ipos={ipos} />

      {/* Primary Dashboard Views */}
      {activeTab === 'dashboard' || activeTab === 'watchlist' ? (
        <div className="animate-fade-in">
          
          {/* Filters Bar */}
          <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexGrow: 1, flexWrap: 'wrap' }}>
              
              {/* Search */}
              <input 
                type="text" 
                placeholder="Search by company or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  flexGrow: 1, 
                  minWidth: '220px', 
                  padding: '0.65rem 1rem', 
                  borderRadius: '8px', 
                  backgroundColor: '#1b1d2e', 
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-body)',
                  outline: 'none'
                }}
              />

              {/* Type Filter */}
              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ 
                  padding: '0.65rem 1.25rem', 
                  borderRadius: '8px', 
                  backgroundColor: '#1b1d2e', 
                  border: '1px solid var(--border-glass)', 
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-body)',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Types</option>
                <option value="MAINBOARD">Mainboard Stocks</option>
                <option value="SME">SME Stocks</option>
              </select>

              {/* Timeframe Filter */}
              <select 
                value={timeframeFilter}
                onChange={(e) => setTimeframeFilter(e.target.value)}
                style={{ 
                  padding: '0.65rem 1.25rem', 
                  borderRadius: '8px', 
                  backgroundColor: '#1b1d2e', 
                  border: '1px solid var(--border-glass)', 
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-body)',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Listings (2 Years)</option>
                <option value="1W">Last 1 Week</option>
                <option value="3M">Last 3 Months</option>
                <option value="6M">Last 6 Months</option>
                <option value="1Y">Last 1 Year</option>
                <option value="1.5Y">Last 1.5 Years</option>
              </select>

              {/* Sort By */}
              <select 
                value={`${sortCol}-${sortDir}`}
                onChange={(e) => {
                  const [col, dir] = e.target.value.split('-');
                  setSortCol(col);
                  setSortDir(dir);
                }}
                style={{ 
                  padding: '0.65rem 1.25rem', 
                  borderRadius: '8px', 
                  backgroundColor: '#1b1d2e', 
                  border: '1px solid var(--border-glass)', 
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-body)',
                  outline: 'none'
                }}
              >
                <option value="listingDate-desc">Newest Listing</option>
                <option value="listingDate-asc">Oldest Listing</option>
                <option value="listingGain-desc">Highest Listing Gain</option>
                <option value="vsIssue-asc">Near/Below Issue Price</option>
                <option value="vsListing-asc">Near/Below Listing Price</option>
                <option value="pctFrom52WHigh-desc">Near/At 52-Week High</option>
                <option value="change1w-desc">Highest 1-Week Return</option>
                <option value="change1m-desc">Highest 1-Month Return</option>
                <option value="change3m-desc">Highest 3-Month Return</option>
                <option value="change6m-desc">Highest 6-Month Return</option>
                <option value="change1y-desc">Highest 1-Year Return</option>
                <option value="volumeSpike-desc">Highest Volume Spike</option>
              </select>

             </div>
            
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {filteredIpos.length} Stocks
            </div>
          </div>

          {/* Quick Ranks & Presets Bar */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Leaderboards:</span>
            <button 
              className="btn" 
              onClick={() => { setSortCol('change1w'); setSortDir('desc'); }}
              style={{ 
                fontSize: '0.75rem', 
                padding: '0.4rem 0.8rem', 
                background: sortCol === 'change1w' && sortDir === 'desc' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
                borderColor: sortCol === 'change1w' && sortDir === 'desc' ? 'var(--accent-primary)' : 'var(--border-glass)'
              }}
            >
              🏆 Weekly Winners
            </button>
            <button 
              className="btn" 
              onClick={() => { setSortCol('change1m'); setSortDir('desc'); }}
              style={{ 
                fontSize: '0.75rem', 
                padding: '0.4rem 0.8rem', 
                background: sortCol === 'change1m' && sortDir === 'desc' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
                borderColor: sortCol === 'change1m' && sortDir === 'desc' ? 'var(--accent-primary)' : 'var(--border-glass)'
              }}
            >
              📅 Monthly Winners
            </button>
            <button 
              className="btn" 
              onClick={() => { setSortCol('pctFrom52WHigh'); setSortDir('desc'); }}
              style={{ 
                fontSize: '0.75rem', 
                padding: '0.4rem 0.8rem', 
                background: sortCol === 'pctFrom52WHigh' && sortDir === 'desc' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
                borderColor: sortCol === 'pctFrom52WHigh' && sortDir === 'desc' ? 'var(--accent-primary)' : 'var(--border-glass)'
              }}
            >
              🔥 52W High Breakouts
            </button>
            <button 
              className="btn" 
              onClick={() => { setSortCol('vsIssue'); setSortDir('asc'); }}
              style={{ 
                fontSize: '0.75rem', 
                padding: '0.4rem 0.8rem', 
                background: sortCol === 'vsIssue' && sortDir === 'asc' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
                borderColor: sortCol === 'vsIssue' && sortDir === 'asc' ? 'var(--accent-primary)' : 'var(--border-glass)'
              }}
            >
              💎 Near IPO Price
            </button>
          </div>

          {/* Table Leaderboard */}
          {filteredIpos.length === 0 ? (
            <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
              <p style={{ fontSize: '1rem', fontWeight: 500 }}>No IPO stocks match the chosen filters.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Try modifying your search or check your Watchlist filter.</p>
            </div>
          ) : (
            <>
              <div className="table-container animate-fade-in" style={{ marginTop: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                      <th style={{ width: '50px', textAlign: 'center' }}>★</th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortClick('symbol')}>
                        Symbol & Company Name {sortCol === 'symbol' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                      </th>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortClick('listingDate')}>
                        Listing Date {sortCol === 'listingDate' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                      </th>
                      <th style={{ textAlign: 'right' }}>Issue Price</th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortClick('listingGain')}>
                        Listing Gain {sortCol === 'listingGain' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortClick('vsIssue')}>
                        Vs. Issue {sortCol === 'vsIssue' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortClick('vsListing')}>
                        Vs. Listing {sortCol === 'vsListing' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortClick('currentPrice')}>
                        Current Price {sortCol === 'currentPrice' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortClick('change1w')}>
                        1W % {sortCol === 'change1w' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortClick('change1m')}>
                        1M % {sortCol === 'change1m' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortClick('change3m')}>
                        3M % {sortCol === 'change3m' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortClick('change6m')}>
                        6M % {sortCol === 'change6m' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortClick('change1y')}>
                        1Y % {sortCol === 'change1y' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortClick('pctFrom52WHigh')}>
                        52W High {sortCol === 'pctFrom52WHigh' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                      </th>
                      <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSortClick('volumeSpike')}>
                        Vol Spike {sortCol === 'volumeSpike' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((ipo, index) => {
                      const m = ipo.marketData || {};
                      const hasData = ipo.marketData !== null;
                      const isFav = watchlist.includes(ipo.symbol);
                      const rank = indexOfFirstItem + index + 1;
                      return (
                        <tr 
                          key={ipo.symbol}
                          onClick={() => setSelectedIpo(ipo)}
                          style={{ cursor: 'pointer' }}
                          className="table-row-hover"
                        >
                          <td 
                            style={{ textAlign: 'center', padding: '0.75rem 0.5rem', fontWeight: 700, color: rank <= 3 ? 'var(--accent-warning)' : 'var(--text-muted)', fontSize: '0.85rem' }}
                          >
                            {rank}
                          </td>
                          <td 
                            style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleWatchlist(ipo.symbol);
                            }}
                          >
                            <span style={{ color: isFav ? 'var(--accent-primary)' : 'var(--text-dim)', fontSize: '1.1rem', cursor: 'pointer' }}>
                              {isFav ? '★' : '☆'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{ipo.symbol}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                              {ipo.name}
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-main)', fontSize: '0.85rem' }}>
                            {ipo.schedule && ipo.schedule.listingDate ? ipo.schedule.listingDate : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-main)', fontWeight: 500, fontSize: '0.85rem' }}>
                            {ipo.priceRange && ipo.priceRange !== 'N/A' ? ipo.priceRange : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem', color: hasData ? (m.listingGain >= 0 ? 'var(--status-success)' : 'var(--status-danger)') : 'var(--text-muted)' }}>
                            {hasData ? `${m.listingGain >= 0 ? '+' : ''}${m.listingGain}%` : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem', color: hasData ? (m.vsIssue >= 0 ? 'var(--status-success)' : 'var(--status-danger)') : 'var(--text-muted)' }}>
                            {hasData ? `${m.vsIssue >= 0 ? '+' : ''}${m.vsIssue}%` : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem', color: hasData ? (m.vsListing >= 0 ? 'var(--status-success)' : 'var(--status-danger)') : 'var(--text-muted)' }}>
                            {hasData ? `${m.vsListing >= 0 ? '+' : ''}${m.vsListing}%` : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.85rem' }}>
                            {hasData ? `₹${m.currentPrice}` : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem', color: hasData && m.change1w !== null ? (m.change1w >= 0 ? 'var(--status-success)' : 'var(--status-danger)') : 'var(--text-muted)' }}>
                            {hasData && m.change1w !== null ? `${m.change1w >= 0 ? '+' : ''}${m.change1w}%` : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem', color: hasData && m.change1m !== null ? (m.change1m >= 0 ? 'var(--status-success)' : 'var(--status-danger)') : 'var(--text-muted)' }}>
                            {hasData && m.change1m !== null ? `${m.change1m >= 0 ? '+' : ''}${m.change1m}%` : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem', color: hasData && m.change3m !== null ? (m.change3m >= 0 ? 'var(--status-success)' : 'var(--status-danger)') : 'var(--text-muted)' }}>
                            {hasData && m.change3m !== null ? `${m.change3m >= 0 ? '+' : ''}${m.change3m}%` : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem', color: hasData && m.change6m !== null ? (m.change6m >= 0 ? 'var(--status-success)' : 'var(--status-danger)') : 'var(--text-muted)' }}>
                            {hasData && m.change6m !== null ? `${m.change6m >= 0 ? '+' : ''}${m.change6m}%` : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem', color: hasData && m.change1y !== null ? (m.change1y >= 0 ? 'var(--status-success)' : 'var(--status-danger)') : 'var(--text-muted)' }}>
                            {hasData && m.change1y !== null ? `${m.change1y >= 0 ? '+' : ''}${m.change1y}%` : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem', color: hasData ? (m.pctFrom52WHigh >= -5 ? 'var(--status-success)' : 'var(--text-main)') : 'var(--text-muted)' }}>
                            {hasData && m.pctFrom52WHigh !== undefined ? `${m.pctFrom52WHigh.toFixed(1)}%` : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: hasData ? (m.volumeSpike > 1.5 ? 'var(--status-warning)' : 'var(--text-main)') : 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>
                            {hasData ? `${m.volumeSpike}x` : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer / Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Rows per page:</span>
                  <select 
                    value={itemsPerPage === filteredIpos.length ? 'ALL' : itemsPerPage}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'ALL') {
                        setItemsPerPage(filteredIpos.length);
                      } else {
                        setItemsPerPage(Number(val));
                      }
                      setCurrentPage(1);
                    }}
                    style={{ 
                      padding: '0.35rem 0.75rem', 
                      borderRadius: '6px', 
                      backgroundColor: '#1b1d2e', 
                      border: '1px solid var(--border-glass)', 
                      color: 'var(--text-main)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="25">25 rows</option>
                    <option value="50">50 rows</option>
                    <option value="100">100 rows</option>
                    <option value="ALL">All rows (view all at once)</option>
                  </select>
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                    <button 
                      className="btn" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                    </span>
                    <button 
                      className="btn" 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      ) : activeTab === 'screener' ? (
        <MarketScreener ipos={ipos} onSelectIpo={setSelectedIpo} />
      ) : activeTab === 'calculator' ? (
        <IpoCalculator ipos={ipos} />
      ) : activeTab === 'report' ? (
        <ReportViewer />
      ) : null}

      {/* Details Slide-Over Panel */}
      {selectedIpo && (
        <IpoDetailModal 
          ipo={selectedIpo}
          onClose={() => setSelectedIpo(null)}
          isWatchlist={watchlist.includes(selectedIpo.symbol)}
          onToggleWatchlist={handleToggleWatchlist}
        />
      )}
    </div>
  );
}
