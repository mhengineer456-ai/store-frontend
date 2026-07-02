import { useState } from 'react';
import {
  FileText, CheckSquare, Layers,
  ArrowRight, TrendingUp, PieChart, Layers3, Search, Printer,
  ClipboardList, RotateCcw
} from 'lucide-react';

export default function DashboardView({
  stats,
  transactions,
  designs = [],
  onNavigate,
  currencySymbol,
  role
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const handlePrint = () => {
    document.body.classList.add('print-transactions-mode');
    window.print();
  };

  const filteredTransactions = transactions.filter(t => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      t.id.toLowerCase().includes(query) ||
      t.itemName.toLowerCase().includes(query) ||
      t.type.toLowerCase().includes(query) ||
      t.status.toLowerCase().includes(query)
    );
  });

  // Calculate distribution for the Category Pie Chart representation dynamically
  const categoryCounts = {};
  designs.forEach(d => {
    if (d.category) {
      categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
    }
  });

  const totalDesigns = designs.length || 1;
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#f97316', '#a855f7'];

  const categories = Object.keys(categoryCounts).map((name, idx) => ({
    name,
    value: Math.round((categoryCounts[name] / totalDesigns) * 100),
    color: colors[idx % colors.length]
  }));

  // fallback if no categories exist
  if (categories.length === 0) {
    categories.push({ name: 'No Designs', value: 100, color: '#6b7280' });
  }

  // SVG parameters for donut chart
  let cumulativePercent = 0;
  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };
  const getRolePanel = (role) => {
    const r = (role || '').toLowerCase();
    if (r === 'admin') return 'admin';
    if (r === 'designer' || r === 'lead designer' || r === 'pattern auditor') return 'designer';
    return 'store';
  };

  const renderFlowchart = () => {
    const panel = getRolePanel(role);
    if (panel === 'admin') {
      return (
        <div className="flowchart-container">
          <div className="flowchart-step" onClick={() => onNavigate('design')}>
            <Layers3 size={24} />
            <span>PRODUCT DESIGN</span>
          </div>
          <div className="flowchart-arrow">
            <ArrowRight size={20} />
          </div>

          <div className="flowchart-step" onClick={() => onNavigate('material_issue')}>
            <ClipboardList size={24} />
            <span>MATERIAL ISSUE</span>
          </div>
          <div className="flowchart-arrow">
            <ArrowRight size={20} />
          </div>

          <div className="flowchart-step" onClick={() => onNavigate('generate_po')}>
            <FileText size={24} />
            <span>GENERATE PO</span>
          </div>
          <div className="flowchart-arrow">
            <ArrowRight size={20} />
          </div>

          <div className="flowchart-step" onClick={() => onNavigate('material_details')}>
            <Layers size={24} />
            <span>MATERIAL DETAILS</span>
          </div>
          <div className="flowchart-arrow">
            <ArrowRight size={20} />
          </div>

          <div className="flowchart-step" onClick={() => onNavigate('reports_history')}>
            <TrendingUp size={24} />
            <span>REPORTS & HISTORY</span>
          </div>
        </div>
      );
    }

    if (panel === 'designer') {
      return (
        <div className="flowchart-container">
          <div className="flowchart-step" onClick={() => onNavigate('design')}>
            <Layers3 size={24} />
            <span>PRODUCT DESIGN</span>
          </div>
          <div className="flowchart-arrow">
            <ArrowRight size={20} />
          </div>

          <div className="flowchart-step" onClick={() => onNavigate('material_verification')}>
            <CheckSquare size={24} />
            <span>MATERIAL VERIFY</span>
          </div>
          <div className="flowchart-arrow">
            <ArrowRight size={20} />
          </div>

          <div className="flowchart-step" onClick={() => onNavigate('zip_po')}>
            <FileText size={24} />
            <span>ZIP & DOORI PO</span>
          </div>
        </div>
      );
    }

    if (panel === 'store') {
      return (
        <div className="flowchart-container">
          <div className="flowchart-step" onClick={() => onNavigate('material_details')}>
            <Layers size={24} />
            <span>MATERIAL DETAILS</span>
          </div>
          <div className="flowchart-arrow">
            <ArrowRight size={20} />
          </div>

          <div className="flowchart-step" onClick={() => onNavigate('material_issue')}>
            <ClipboardList size={24} />
            <span>MATERIAL ISSUE</span>
          </div>
          <div className="flowchart-arrow">
            <ArrowRight size={20} />
          </div>

          <div className="flowchart-step" onClick={() => onNavigate('return_material')}>
            <RotateCcw size={24} />
            <span>MATERIAL RETURN</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="animate-fade">


      {/* Procurement Process Flow */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            <Layers3 size={18} className="text-accent" />
            Procurement Process Flow
          </h2>
        </div>

        {renderFlowchart()}

      </div>

      {/* Double Column: Recent Transactions & Analytics */}
      <div className="split-view">
        {/* Left Column: Recent Transactions */}
        <div className="panel transactions-panel" style={{ marginBottom: 0 }}>
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h2 className="panel-title" style={{ margin: 0 }}>Recent Transactions</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="print-hide">
                <div style={{ position: 'relative', width: '180px' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '30px', height: '32px', fontSize: '13px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', width: '100%' }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ height: '32px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Search size={12} />
                  <span>Search</span>
                </button>
                {searchQuery && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSearchQuery('')}
                    style={{ height: '32px', padding: '0 8px' }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm print-hide"
                onClick={handlePrint}
                style={{ height: '32px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Printer size={12} />
                <span>Print</span>
              </button>
            </div>
          </div>

          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Item Name</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No recent transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.slice(0, 5).map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 'bold' }}>{t.id}</td>
                      <td>{t.itemName}</td>
                      <td>{t.type}</td>
                      <td>{t.date}</td>
                      <td>
                        <span className={`status-badge ${t.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Garment Categories Share (SVG Donut Chart) */}
        <div className="panel" style={{ marginBottom: 0 }}>
          <div className="panel-header">
            <h2 className="panel-title">
              <PieChart size={18} className="text-accent" />
              Design Distribution
            </h2>
          </div>

          <div className="chart-container-svg">
            <svg width="220" height="220" viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }}>
              {categories.map((cat, idx) => {
                const percent = cat.value / 100;
                const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                cumulativePercent += percent;
                const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                const largeArcFlag = percent > 0.5 ? 1 : 0;

                const pathData = [
                  `M ${startX} ${startY}`, // Move to starting coordinate
                  `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Draw arc to end coordinate
                  `L 0 0`, // Line back to center
                  `Z` // Close path
                ].join(' ');

                return (
                  <path
                    key={idx}
                    d={pathData}
                    fill={cat.color}
                    stroke="var(--bg-secondary)"
                    strokeWidth="0.02"
                  />
                );
              })}
              {/* Center cutout to make it a donut chart */}
              <circle cx="0" cy="0" r="0.6" fill="var(--bg-secondary)" />
            </svg>

            {/* Absolute overlay count in middle */}
            <div style={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}>
              <span style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'var(--font-family-title)' }}>
                {stats.activeDesigns}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                Designs
              </span>
            </div>
          </div>

          <div className="chart-legend">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {categories.map((cat, idx) => (
                <div key={idx} className="chart-legend-item">
                  <div className="chart-legend-color" style={{ backgroundColor: cat.color }}></div>
                  <span style={{ fontWeight: '500' }}>{cat.name} ({cat.value}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
