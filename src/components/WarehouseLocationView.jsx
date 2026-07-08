import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Search, Bell, Clock, Shield, ArrowLeftRight, 
  CheckCircle, AlertTriangle, Layers, FileText, ChevronRight, X, Plus, LogOut, ChevronDown 
} from 'lucide-react';

export default function WarehouseLocationView({ racks = [], materials = [] }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('All');
  const [selectedRack, setSelectedRack] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Dynamically calculate slot locations based on configured racks and live inventory materials
  const locations = React.useMemo(() => {
    const list = [];
    racks.forEach(rack => {
      for (let s = 1; s <= rack.shelves; s++) {
        for (let l = 1; l <= rack.levels; l++) {
          const slotNum = (s - 1) * rack.levels + l;
          const code = `${rack.code}${slotNum < 10 ? '0' + slotNum : slotNum}`;
          
          // Cross-reference with materials list.
          // A material's location is stored in its 'color' property.
          const matchedMat = materials.find(m => {
            const mLoc = String(m.color || '').toLowerCase();
            return mLoc === code.toLowerCase() || 
                   mLoc.includes(`rack ${rack.code.toLowerCase()} shelf ${s}`) ||
                   mLoc.includes(`${code.toLowerCase()} `) ||
                   mLoc.endsWith(code.toLowerCase());
          });

          let status = 'Empty';
          let qty = 0;
          let unit = 'PCS';
          let materialName = '';
          let poNumber = '';
          let lotNumber = '';
          let weight = '0 kg';
          let storeIncharge = '';
          let lastUpdated = '';

          if (matchedMat) {
            status = matchedMat.stock > 1000 ? 'Occupied' : (matchedMat.stock > 0 ? 'Picking' : 'Reserved');
            qty = matchedMat.stock;
            unit = matchedMat.unit || 'Pcs';
            materialName = matchedMat.name;
            poNumber = `PO-2026-${matchedMat.id.slice(-4)}`;
            lotNumber = `Lot 62${matchedMat.id.slice(-3)}`;
            weight = `${Math.round(matchedMat.stock * 0.05)} kg`;
            storeIncharge = 'amit';
            lastUpdated = '2026-07-07 12:00';
          }

          list.push({
            code,
            rack: rack.code,
            shelf: String(s),
            level: String(l),
            warehouse: rack.warehouse,
            status,
            qty,
            unit,
            materialName,
            poNumber,
            lotNumber,
            weight,
            storeIncharge,
            lastUpdated
          });
        }
      }
    });
    return list;
  }, [racks, materials]);

  // Extract unique warehouses and racks dynamically
  const warehouses = React.useMemo(() => {
    return ['All', ...new Set(racks.map(r => r.warehouse))];
  }, [racks]);

  const uniqueRacks = React.useMemo(() => {
    return ['All', ...new Set(racks.map(r => r.code))];
  }, [racks]);

  // Stats Card Calculations
  const stats = {
    total: locations.length,
    occupied: locations.filter(loc => loc.status === 'Occupied').length,
    empty: locations.filter(loc => loc.status === 'Empty').length,
    reserved: locations.filter(loc => loc.status === 'Reserved').length,
    picking: locations.filter(loc => loc.status === 'Picking').length,
  };

  const handleCardClick = (loc) => {
    setSelectedLocation(loc);
    setIsDrawerOpen(true);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedWarehouse('All');
    setSelectedRack('All');
    setSelectedStatus('All');
  };

  const filteredLocations = locations.filter(loc => {
    const matchesSearch = loc.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (loc.materialName && loc.materialName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesWarehouse = selectedWarehouse === 'All' || loc.warehouse === selectedWarehouse;
    const matchesRack = selectedRack === 'All' || loc.rack === selectedRack;
    const matchesStatus = selectedStatus === 'All' || loc.status === selectedStatus;
    
    return matchesSearch && matchesWarehouse && matchesRack && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Empty': return '#10B981'; // Green
      case 'Occupied': return '#EF4444'; // Red
      case 'Reserved': return '#F59E0B'; // Yellow
      case 'Picking': return '#8B5CF6'; // Purple
      default: return '#9CA3AF';
    }
  };

  return (
    <div className="animate-fade" style={{ paddingBottom: '60px', fontFamily: "'Inter', sans-serif" }}>
      {/* Filters & Actions Panel */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1, minWidth: '300px' }}>
            {/* Search Location */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search Location or Material..."
                className="form-input"
                style={{ paddingLeft: '36px', height: '36px', fontSize: '13px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Warehouse Dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                className="form-input"
                style={{ height: '36px', paddingRight: '30px', fontSize: '13px', width: '160px', cursor: 'pointer' }}
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                {warehouses.map(w => (
                  <option key={w} value={w}>{w === 'All' ? 'All Warehouses' : w}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
            </div>

            {/* Rack Dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                className="form-input"
                style={{ height: '36px', paddingRight: '30px', fontSize: '13px', width: '110px', cursor: 'pointer' }}
                value={selectedRack}
                onChange={(e) => setSelectedRack(e.target.value)}
              >
                {uniqueRacks.map(r => (
                  <option key={r} value={r}>{r === 'All' ? 'All Racks' : `Rack ${r}`}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
            </div>

            {/* Status Dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                className="form-input"
                style={{ height: '36px', paddingRight: '30px', fontSize: '13px', width: '130px', cursor: 'pointer' }}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Empty">Empty (Green)</option>
                <option value="Occupied">Occupied (Red)</option>
                <option value="Reserved">Reserved (Yellow)</option>
                <option value="Picking">Picking (Purple)</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetFilters}
              className="btn btn-secondary"
              style={{ height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              Reset
            </button>
          </div>

          {/* Legend indicator */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', fontSize: '12px', fontWeight: '600' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981' }}></span> Empty
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444' }}></span> Occupied
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span> Reserved
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#8B5CF6' }}></span> Picking
            </span>
          </div>

        </div>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Card 1: Total */}
        <div className="panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0 }}>
          <div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)' }}>{stats.total}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>Total Locations</div>
          </div>
          <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '10px', borderRadius: '12px' }}>
            <Database size={24} />
          </div>
        </div>

        {/* Card 2: Occupied */}
        <div className="panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0 }}>
          <div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#EF4444' }}>{stats.occupied}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>Occupied Slots</div>
          </div>
          <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '10px', borderRadius: '12px' }}>
            <Layers size={24} />
          </div>
        </div>

        {/* Card 3: Empty */}
        <div className="panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0 }}>
          <div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#10B981' }}>{stats.empty}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>Empty Slots</div>
          </div>
          <div style={{ backgroundColor: '#ecfdf5', color: '#10b981', padding: '10px', borderRadius: '12px' }}>
            <CheckCircle size={24} />
          </div>
        </div>

        {/* Card 4: Reserved */}
        <div className="panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0 }}>
          <div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#F59E0B' }}>{stats.reserved}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>Reserved Slots</div>
          </div>
          <div style={{ backgroundColor: '#fef3c7', color: '#f59e0b', padding: '10px', borderRadius: '12px' }}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Warehouse Map Grid */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">
            <Layers size={18} className="text-accent" />
            Rack Layout Matrix Visualizer
          </h3>
        </div>

        {filteredLocations.length > 0 ? (
          <div className="warehouse-grid-layout">
            {filteredLocations.map((loc) => (
              <motion.div
                key={loc.code}
                whileHover={{ scale: 1.05, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => handleCardClick(loc)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>
                    {loc.code}
                  </span>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(loc.status)
                  }}></span>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  {loc.qty > 0 ? `${loc.qty} ${loc.unit}` : 'Empty Slot'}
                </div>

                <div style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: getStatusColor(loc.status),
                  textTransform: 'uppercase',
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {loc.status === 'Empty' && '🟢 Free'}
                  {loc.status === 'Occupied' && '🔴 Full'}
                  {loc.status === 'Reserved' && '🟡 Reserved'}
                  {loc.status === 'Picking' && '🟣 Picking'}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--text-muted)', textAlign: 'center' }}>
            <Layers size={48} strokeWidth={1} style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '14px', fontWeight: '500' }}>No warehouse locations found matching selected filter criteria.</p>
          </div>
        )}
      </div>

      {/* Side Action Drawer using Framer Motion */}
      <AnimatePresence>
        {isDrawerOpen && selectedLocation && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#000000',
                zIndex: 9999
              }}
            />

            {/* Right Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: '420px',
                maxWidth: '90%',
                backgroundColor: '#ffffff',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.15)',
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box'
              }}
            >
              {/* Drawer Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--bg-secondary)'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {selectedLocation.warehouse}
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Location: {selectedLocation.code}
                  </h3>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  style={{
                    border: '1px solid var(--border-color)',
                    background: '#ffffff',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-main)'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                
                {/* Physical Position Specs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Rack</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', marginTop: '4px' }}>{selectedLocation.rack}</div>
                  </div>
                  <div style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Shelf</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', marginTop: '4px' }}>{selectedLocation.shelf}</div>
                  </div>
                  <div style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Level</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', marginTop: '4px' }}>{selectedLocation.level}</div>
                  </div>
                </div>

                {/* Storage Status Overview */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: `${getStatusColor(selectedLocation.status)}10`,
                  borderLeft: `4px solid ${getStatusColor(selectedLocation.status)}`,
                  marginBottom: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: getStatusColor(selectedLocation.status) }}>
                    Status: {selectedLocation.status}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '800' }}>
                    {selectedLocation.qty} {selectedLocation.unit}
                  </span>
                </div>

                {/* Material Details Block */}
                {selectedLocation.status !== 'Empty' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', margin: 0 }}>
                      STORED MATERIAL METADATA
                    </h4>
                    
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Material Name</label>
                      <div style={{ fontSize: '14px', fontWeight: '700' }}>{selectedLocation.materialName}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '2px' }}>PO Number</label>
                        <div style={{ fontSize: '13px', fontWeight: '700', fontFamily: 'monospace' }}>{selectedLocation.poNumber}</div>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Lot Number</label>
                        <div style={{ fontSize: '13px', fontWeight: '700', fontFamily: 'monospace' }}>{selectedLocation.lotNumber}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Stored Weight</label>
                        <div style={{ fontSize: '13px', fontWeight: '700' }}>{selectedLocation.weight}</div>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Store In-Charge</label>
                        <div style={{ fontSize: '13px', fontWeight: '700', textTransform: 'capitalize' }}>{selectedLocation.storeIncharge}</div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <Clock size={12} />
                      <span>Last Updated: {selectedLocation.lastUpdated}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 0', border: '1.5px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                    <Layers size={36} strokeWidth={1} style={{ marginBottom: '8px', color: '#94a3b8' }} />
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>No Material Stored</div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>This warehouse slot is currently empty and available for incoming stock.</div>
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div style={{
                padding: '20px 24px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                backgroundColor: 'var(--bg-secondary)'
              }}>
                <button 
                  className="btn" 
                  style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => alert(`Issuing material from location ${selectedLocation.code}`)}
                >
                  <Plus size={16} />
                  Issue Material
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '10px', fontSize: '13px', fontWeight: '600' }}
                    onClick={() => alert(`Receiving material at location ${selectedLocation.code}`)}
                  >
                    Receive Stock
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '10px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    onClick={() => alert(`Transferring stock from location ${selectedLocation.code}`)}
                  >
                    <ArrowLeftRight size={14} />
                    Transfer
                  </button>
                </div>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: '600', border: 'none', background: 'transparent', textDecoration: 'underline' }}
                  onClick={() => alert(`Displaying transaction log history for ${selectedLocation.code}`)}
                >
                  View Location Transaction Logs
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
