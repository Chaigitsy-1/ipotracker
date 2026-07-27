import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, RefreshCw, AlertTriangle } from 'lucide-react';

export default function ReportViewer() {
  const [reportText, setReportText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [genTime, setGenTime] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError(false);
    try {
      // Fetch the generated Markdown file from public folder
      const res = await fetch('/reports/IPO_Daily_Report.md');
      if (!res.ok) throw new Error('Report file not found');
      const text = await res.text();
      setReportText(text);
      
      // Extract generation date from content if possible
      const dateMatch = text.match(/\*\*Report Generated On:\*\* ([^\n|]+)/);
      if (dateMatch) {
        setGenTime(dateMatch[1].trim());
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // Simple, robust Markdown parser to clean JSX elements
  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    let inList = false;
    let listItems = [];

    const elements = [];

    const parseInlineStyles = (lineText) => {
      // Replace bold **text** and code `text`
      let parts = [lineText];
      
      // Handle bold
      const boldRegex = /\*\*([^*]+)\*\*/g;
      let match;
      
      // We will parse simple bold and code formats
      let tempText = lineText;
      
      // A simple parsing logic
      const segments = [];
      let lastIndex = 0;
      const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
      
      while ((match = regex.exec(tempText)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
          segments.push(tempText.substring(lastIndex, match.index));
        }
        
        if (match[1].startsWith('**')) {
          // Bold
          segments.push(<strong key={match.index} style={{ color: '#fff', fontWeight: 700 }}>{match[2]}</strong>);
        } else if (match[1].startsWith('`')) {
          // Code/Badge
          const isNegative = match[3].includes('-');
          const isPositive = match[3].includes('+');
          segments.push(
            <span key={match.index} style={{ 
              fontFamily: 'monospace', 
              background: isPositive ? 'rgba(16, 185, 129, 0.15)' : isNegative ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.08)',
              color: isPositive ? 'var(--accent-success)' : isNegative ? 'var(--accent-danger)' : 'var(--text-main)',
              padding: '1px 5px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 600
            }}>
              {match[3]}
            </span>
          );
        } else {
          // Link [text](url)
          segments.push(
            <a key={match.index} href={match[5]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>
              {match[4]}
            </a>
          );
        }
        
        lastIndex = regex.lastIndex;
      }
      
      if (lastIndex < tempText.length) {
        segments.push(tempText.substring(lastIndex));
      }
      
      return segments.length > 0 ? segments : lineText;
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('# ')) {
        elements.push(<h2 key={index} style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginTop: '1.5rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>{trimmed.substring(2)}</h2>);
      } 
      else if (trimmed.startsWith('## ')) {
        elements.push(<h3 key={index} style={{ fontFamily: 'var(--font-title)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-secondary)', marginTop: '1.25rem', marginBottom: '0.5rem' }}>{trimmed.substring(3)}</h3>);
      } 
      else if (trimmed.startsWith('### ')) {
        elements.push(<h4 key={index} style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '1rem', marginBottom: '0.5rem' }}>{trimmed.substring(4)}</h4>);
      } 
      else if (trimmed.startsWith('- ')) {
        elements.push(
          <div key={index} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.4rem', paddingLeft: '0.5rem' }}>
            <span style={{ color: 'var(--accent-primary)' }}>•</span>
            <div>{parseInlineStyles(trimmed.substring(2))}</div>
          </div>
        );
      } 
      else if (trimmed.startsWith('**Report Generated On:**')) {
        // Skip metadata header line since we display it custom
        return;
      }
      else if (trimmed === '---') {
        elements.push(<hr key={index} style={{ border: 'none', borderTop: '1px solid var(--border-glass)', margin: '1.5rem 0' }} />);
      }
      else if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
        elements.push(<p key={index} style={{ fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--text-dim)', marginBottom: '0.75rem', lineHeight: 1.4 }}>{parseInlineStyles(trimmed.substring(1, trimmed.length - 1))}</p>);
      }
      else if (trimmed !== '') {
        elements.push(<p key={index} style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>{parseInlineStyles(trimmed)}</p>);
      }
    });

    return elements;
  };

  return (
    <div className="animate-fade-in">
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={20} color="var(--accent-primary)" /> Daily Market Intelligence Report
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
            Auto-generated daily scanning for FII/DII accumulation triggers and breakouts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={fetchReport} className="btn" style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 1rem', color: 'var(--text-dim)' }}>
          <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
          <p style={{ fontSize: '0.9rem' }}>Loading intelligence report...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <AlertTriangle size={48} color="var(--accent-warning)" style={{ marginBottom: '1rem', display: 'inline-block' }} />
          <h4 style={{ color: '#fff', marginBottom: '0.5rem' }}>Report Not Generated Yet</h4>
          <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
            The daily analyst report has not been generated yet. Please run the local generator script or schedule it.
          </p>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-glass)', display: 'inline-block', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'left' }}>
            node scripts/generateDailyReport.cjs
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2rem', background: 'rgba(10, 11, 18, 0.5)' }}>
          {/* Metadata info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <Calendar size={14} />
            <span>Generated:</span>
            <strong style={{ color: 'var(--text-muted)' }}>{genTime || 'Today'}</strong>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--text-dim)' }}></span>
            <span>Status:</span>
            <span className="badge badge-live" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>Ready</span>
          </div>

          <div className="report-markdown-content" style={{ display: 'flex', flexDirection: 'column' }}>
            {renderMarkdown(reportText)}
          </div>
        </div>
      )}
    </div>
  );
}
