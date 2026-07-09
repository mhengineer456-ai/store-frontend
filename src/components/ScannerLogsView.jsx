import { getBackendUrl } from '../utils/api';
import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Calendar, User, Package, Truck, ShieldAlert } from 'lucide-react';

export default function ScannerLogsView({ currencySymbol = 'R' }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  

  const fetchLogs = () => {
    setLoading(true);
    const backendUrl = getBackendUrl();
    fetch(`${backendUrl}/api/scans`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLogs(data);
        } else {
          setLogs([]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch scans logs:', err);
        setLogs([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatScanType = (type) => {
    if (type === 'gate_entry') return { text: 'Gate Entry', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)' };
    if (type === 'material_in') return { text: 'Material In', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)' };
    if (type === 'printing_gate_out') return { text: 'Printing Gate Out', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.2)' };
    if (type === 'supplier_entry') return { text: 'Supplier Entry', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)' };
    if (type === 'rgp_entry') return { text: 'RGP Issue', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.2)' };
    if (type === 'rgp_return') return { text: 'RGP Return', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.2)' };
    return { text: type || 'Unknown', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.2)' };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const pad = (num) => String(num).padStart(2, '0');
      const d = pad(date.getDate());
      const m = pad(date.getMonth() + 1);
      const y = date.getFullYear();
      const hr = pad(date.getHours());
      const min = pad(date.getMinutes());
      
      return `${d}/${m}/${y} ${hr}:${min}`;
    } catch {
      return dateStr;
    }
  };

  // Filtering Logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.lot_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.person_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.material_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || log.scan_type === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="panel" style={{ padding: '24px' }}>
      {/* Header Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>QR Scanner Database Logs</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
            Real-time scanner entries for Gate Entry, Material Receiving, and Supplier Check-ins.
          </p>
        </div>
        <button 
          onClick={fetchLogs} 
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RotateCcw size={14} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={16} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center'
          }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by Lot, Person, Material or Supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              paddingLeft: '38px',
              height: '38px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary, #ffffff)',
              color: 'var(--text-main)',
              width: '100%',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
        </div>

        {/* Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            flex: '0 1 180px',
            height: '38px',
            fontSize: '13px',
            padding: '0 28px 0 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary, #ffffff)',
            color: 'var(--text-main)',
            cursor: 'pointer',
            outline: 'none',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23475569%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
            transition: 'border-color 0.2s'
          }}
        >
          <option value="all">All Scan Types</option>
          <option value="gate_entry">Gate Entry</option>
          <option value="material_in">Material In</option>
          <option value="printing_gate_out">Printing Gate Out</option>
          <option value="supplier_entry">Supplier Entry</option>
          <option value="rgp_entry">RGP Issue</option>
          <option value="rgp_return">RGP Return</option>
        </select>
      </div>

      {/* Logs Table Area */}
      {loading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 0',
          color: 'var(--text-muted)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '3px solid var(--accent-light)',
            borderTopColor: 'var(--accent-color)',
            animation: 'spin 1s linear infinite',
            marginBottom: '12px'
          }}></div>
          <span style={{ fontSize: '13px', fontWeight: '500' }}>Fetching MySQL Scan Data...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div style={{
          padding: '48px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--border-radius-md)',
          border: '1.5px dashed var(--border-color)',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <ShieldAlert size={32} style={{ color: 'var(--text-muted)' }} />
          <div style={{ fontWeight: '700', fontSize: '14px' }}>No scan records found</div>
          <div style={{ fontSize: '12px' }}>Scanned entries will show up here automatically once submitted from QR links.</div>
        </div>
      ) : (
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="table table-striped" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '12px 8px' }}>Scan Time</th>
                <th style={{ padding: '12px 8px' }}>Lot Number</th>
                <th style={{ padding: '12px 8px' }}>Scan Type</th>
                <th style={{ padding: '12px 8px' }}>Person Name</th>
                <th style={{ padding: '12px 8px' }}>Material Name</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Quantity</th>
                <th style={{ padding: '12px 8px' }}>Supplier</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const typeStyle = formatScanType(log.scan_type);
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                    {/* Timestamp */}
                    <td style={{ padding: '12px 8px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={12} />
                        <span>{formatDate(log.scanned_at)}</span>
                      </div>
                    </td>

                    {/* Lot Number */}
                    <td style={{ padding: '12px 8px', fontWeight: '700' }}>
                      <span className="badge badge-accent">
                        {log.lot_number || 'N/A'}
                      </span>
                    </td>

                    {/* Scan Type */}
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: typeStyle.color,
                        backgroundColor: typeStyle.bg,
                        border: `1px solid ${typeStyle.border}`
                      }}>
                        {typeStyle.text}
                      </span>
                    </td>

                    {/* Person Name */}
                    <td style={{ padding: '12px 8px', fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>{log.person_name}</span>
                      </div>
                    </td>

                    {/* Material Name */}
                    <td style={{ padding: '12px 8px', color: 'var(--text-main)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.material_name}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Package size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>{log.material_name}</span>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: 'var(--accent-color)' }}>
                      {log.quantity} pcs
                    </td>

                    {/* Supplier */}
                    <td style={{ padding: '12px 8px', color: 'var(--text-main)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Truck size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>{log.supplier_name}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .badge-accent {
          background-color: var(--accent-light);
          color: var(--accent-color);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}
