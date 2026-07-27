import React from 'react';
import { TrendingUp, Star, LayoutDashboard, AlertCircle, Calculator, FileText, RefreshCw } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, watchlistCount, dataState, onRefresh }) {
  return (
    <header className="glass-panel animate-fade-in" style={{ padding: '1.25rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <TrendingUp size={24} />
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            IPO SCOUT
          </h1>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Indian Mainboard & SME Screener
          </span>
        </div>
      </div>

      <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : ''}`}
        >
          <LayoutDashboard size={16} />
          IPO Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('screener')}
          className={`btn ${activeTab === 'screener' ? 'btn-primary' : ''}`}
        >
          <AlertCircle size={16} />
          Market Screener
        </button>
        <button 
          onClick={() => setActiveTab('calculator')}
          className={`btn ${activeTab === 'calculator' ? 'btn-primary' : ''}`}
        >
          <Calculator size={16} />
          Calculator
        </button>
        <button 
          onClick={() => setActiveTab('report')}
          className={`btn ${activeTab === 'report' ? 'btn-primary' : ''}`}
        >
          <FileText size={16} />
          Daily Report
        </button>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Data Sync Status Badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: dataState.isLive ? 'var(--accent-success)' : 'var(--accent-warning)',
              display: 'inline-block',
              boxShadow: dataState.isLive ? '0 0 8px var(--accent-success)' : '0 0 8px var(--accent-warning)'
            }}></span>
            <span style={{ color: dataState.isLive ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
              {dataState.isLive ? 'Live API Connected' : 'Local Static Cache'}
            </span>
          </div>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>
            Updated: {dataState.lastUpdated || 'N/A'}
          </span>
        </div>

        <button 
          onClick={onRefresh}
          className="btn"
          title="Force update stock prices"
          style={{ padding: '0.6rem', minWidth: '40px', justifyContent: 'center' }}
        >
          <RefreshCw size={16} className={dataState.loading ? 'animate-spin' : ''} />
        </button>

        <button 
          onClick={() => setActiveTab('watchlist')}
          className={`btn ${activeTab === 'watchlist' ? 'btn-primary' : ''}`}
          style={{ gap: '0.5rem', minWidth: '100px' }}
        >
          <Star size={16} fill={activeTab === 'watchlist' ? '#fff' : 'transparent'} />
          Watchlist
          <span style={{ 
            background: activeTab === 'watchlist' ? 'rgba(255,255,255,0.2)' : 'rgba(99,102,241,0.2)',
            color: activeTab === 'watchlist' ? '#fff' : 'var(--accent-primary)',
            padding: '1px 6px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            {watchlistCount}
          </span>
        </button>
      </div>
    </header>
  );
}

// Add styled CSS in JS variables support
const var_text_muted = '#9ca3af';
const var_text_dim = '#6b7280';
const var_accent_success = '#10b981';
const var_accent_warning = '#f59e0b';
const var_accent_primary = '#6366f1';
