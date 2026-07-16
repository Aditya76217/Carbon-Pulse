import React, { useState, useEffect } from 'react';

export default function Dashboard({ user, stats, onRefresh }) {
  const [tickerSaved, setTickerSaved] = useState(stats.total_saved_kg);
  const [quickCategory, setQuickCategory] = useState('transportation');
  const [quickType, setQuickType] = useState('driving_petrol');
  const [quickValue, setQuickValue] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-ticking micro-animation for green action savings
  useEffect(() => {
    setTickerSaved(stats.total_saved_kg);
    
    // Simulate real-time continuous environmental improvement if user has completed green actions
    if (stats.total_saved_kg > 0) {
      const interval = setInterval(() => {
        setTickerSaved(prev => prev + 0.00012);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [stats.total_saved_kg]);

  // Log choices helper
  const quickLogConfigs = {
    transportation: [
      { id: 'driving_petrol', label: 'Gasoline Car (Miles)', defaultVal: 15, max: 200, unit: 'miles' },
      { id: 'driving_suv', label: 'SUV Drive (Miles)', defaultVal: 15, max: 200, unit: 'miles' },
      { id: 'driving_ev', label: 'Electric Car (Miles)', defaultVal: 20, max: 200, unit: 'miles' },
      { id: 'public_transit', label: 'Bus or Train (Miles)', defaultVal: 10, max: 150, unit: 'miles' },
      { id: 'flight_short', label: 'Short Flight (Hours)', defaultVal: 2, max: 12, unit: 'hrs' },
    ],
    energy: [
      { id: 'electricity_kwh', label: 'Electricity (kWh)', defaultVal: 25, max: 250, unit: 'kWh' },
      { id: 'gas_therms', label: 'Natural Gas (Therms)', defaultVal: 3, max: 50, unit: 'therms' },
      { id: 'heating_oil_gal', label: 'Heating Oil (Gallons)', defaultVal: 5, max: 50, unit: 'gallons' },
    ],
    food: [
      { id: 'heavy_meat', label: 'Red Meat serving (Meals)', defaultVal: 1, max: 5, unit: 'servings' },
      { id: 'light_meat', label: 'Chicken/Pork serving (Meals)', defaultVal: 1, max: 5, unit: 'servings' },
      { id: 'vegetarian', label: 'Vegetarian Meal (Meals)', defaultVal: 1, max: 5, unit: 'servings' },
      { id: 'vegan', label: 'Vegan Meal (Meals)', defaultVal: 1, max: 5, unit: 'servings' },
    ],
    waste: [
      { id: 'unsorted_bag', label: 'Unsorted Trash (Bags)', defaultVal: 1, max: 5, unit: 'bags' },
    ]
  };

  // Adjust default input value when category or type changes
  useEffect(() => {
    const list = quickLogConfigs[quickCategory];
    if (list && list.length > 0) {
      // Find if current type is in the list, else set to first
      const matches = list.find(o => o.id === quickType);
      if (!matches) {
        setQuickType(list[0].id);
        setQuickValue(list[0].defaultVal);
      }
    }
  }, [quickCategory]);

  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    const today = new Date().toISOString().split('T')[0];

    try {
      const response = await fetch('http://localhost:5000/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          date: today,
          category: quickCategory,
          activity_type: quickType,
          value: parseFloat(quickValue)
        })
      });
      if (response.ok) {
        setSuccessMsg('Log added successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Compute stats calculations
  const breakdown = stats.logged_emissions_kg || { transportation: 0, energy: 0, food: 0, waste: 0 };
  const totalLoggedCO2 = breakdown.transportation + breakdown.energy + breakdown.food + breakdown.waste;
  
  // Prorated goal (let's say a baseline divided by 365 represents a daily budget)
  // Let's say user has been tracking for 1 day, or estimate a monthly budget:
  // Baseline is in Tons/year. Total monthly budget = (Baseline Tons * 1000) / 12 (in kg).
  const monthlyBudgetKg = Number(((stats.baseline_tons * 1000) / 12).toFixed(1));
  const loggedPercentage = monthlyBudgetKg > 0 ? Math.min(100, (totalLoggedCO2 / monthlyBudgetKg) * 100) : 0;

  // Segment colors for bars
  const colors = {
    transportation: 'var(--cyan)',
    energy: 'var(--emerald)',
    food: 'var(--purple)',
    waste: 'var(--coral)'
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      {/* LEFT MAIN AREA */}
      <div className="dashboard-main">
        {/* METRICS ROW */}
        <div className="metrics-row">
          <div className="metric-card glass-panel emerald">
            <span className="metric-label">Saved CO2</span>
            <div className="metric-value" style={{ color: 'var(--emerald)' }}>
              {tickerSaved.toFixed(3)}
            </div>
            <span className="metric-unit">kg CO2 saved</span>
            <div className="metric-subtext" style={{ marginTop: '8px' }}>
              ⚡ Eco habits active counter
            </div>
          </div>

          <div className="metric-card glass-panel coral">
            <span className="metric-label">Logged Footprint</span>
            <div className="metric-value" style={{ color: 'var(--coral)' }}>
              {totalLoggedCO2.toFixed(1)}
            </div>
            <span className="metric-unit">kg CO2e emissions</span>
            <div className="metric-subtext" style={{ marginTop: '8px' }}>
              📅 This month's direct logs
            </div>
          </div>

          <div className="metric-card glass-panel cyan">
            <span className="metric-label">Baseline Budget</span>
            <div className="metric-value" style={{ color: 'var(--cyan)' }}>
              {stats.baseline_tons.toFixed(1)}
            </div>
            <span className="metric-unit">Metric Tons / Year</span>
            <div className="metric-subtext" style={{ marginTop: '8px' }}>
              🎯 Target: Under {(stats.baseline_tons * 0.8).toFixed(1)} Tons
            </div>
          </div>
        </div>

        {/* CARBON BUDGET GAUGE & CHART */}
        <div className="chart-panel glass-panel">
          <div className="chart-header">
            <h3 className="chart-title">Current Month Carbon Budget Tracker</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Target Budget: <strong>{monthlyBudgetKg} kg CO2</strong>
            </span>
          </div>

          {/* Budget Gauge */}
          <div style={{ position: 'relative', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${loggedPercentage}%`, 
                background: `linear-gradient(90deg, var(--emerald) 0%, ${loggedPercentage > 80 ? 'var(--coral)' : 'var(--cyan)'} 100%)`, 
                borderRadius: '8px',
                transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            ></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '32px' }}>
            <span>Logged: {totalLoggedCO2.toFixed(1)} kg CO2 ({loggedPercentage.toFixed(0)}%)</span>
            <span>Budget remaining: {Math.max(0, monthlyBudgetKg - totalLoggedCO2).toFixed(1)} kg CO2</span>
          </div>

          {/* CATEGORY DISTRIBUTION BAR */}
          <h3 className="chart-title" style={{ marginBottom: '16px' }}>Category Breakdown (Logged)</h3>
          {totalLoggedCO2 === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              No activities logged this month. Use the panel on the right to log your first activity!
            </div>
          ) : (
            <div>
              <div style={{ height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', overflow: 'hidden', marginBottom: '20px' }}>
                {Object.keys(breakdown).map(cat => {
                  const val = breakdown[cat];
                  if (val === 0) return null;
                  const percent = (val / totalLoggedCO2) * 100;
                  return (
                    <div 
                      key={cat}
                      style={{ 
                        width: `${percent}%`, 
                        backgroundColor: colors[cat],
                        height: '100%',
                        transition: 'width 0.5s'
                      }}
                      title={`${cat}: ${val} kg (${percent.toFixed(0)}%)`}
                    ></div>
                  );
                })}
              </div>

              {/* Legend Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                {Object.keys(breakdown).map(cat => {
                  const val = breakdown[cat];
                  const percent = totalLoggedCO2 > 0 ? ((val / totalLoggedCO2) * 100).toFixed(0) : 0;
                  return (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: colors[cat] }}></span>
                      <span style={{ fontSize: '0.85rem', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                        {cat} ({percent}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR QUICK LOGS */}
      <div className="dashboard-sidebar">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="panel-title">⚡ Quick Carbon Logger</h3>
          <form onSubmit={handleQuickSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label className="slider-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Category</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['transportation', 'energy', 'food', 'waste'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`btn ${quickCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px 4px', fontSize: '0.75rem', justifyContent: 'center' }}
                    onClick={() => setQuickCategory(cat)}
                  >
                    {cat === 'transportation' ? '🚗' : cat === 'energy' ? '🔌' : cat === 'food' ? '🍔' : '🗑️'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="slider-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Activity Type</label>
              <select 
                className="form-input form-select" 
                value={quickType} 
                onChange={e => {
                  setQuickType(e.target.value);
                  const matched = quickLogConfigs[quickCategory].find(o => o.id === e.target.value);
                  if (matched) setQuickValue(matched.defaultVal);
                }}
              >
                {quickLogConfigs[quickCategory].map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            {(() => {
              const currentConfig = quickLogConfigs[quickCategory].find(o => o.id === quickType);
              if (!currentConfig) return null;
              return (
                <div style={{ marginBottom: '24px' }}>
                  <div className="slider-header">
                    <span className="slider-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Amount Spent/Logged</span>
                    <span className="slider-value">
                      {quickValue} {currentConfig.unit}
                    </span>
                  </div>
                  <input 
                    type="range"
                    min="1"
                    max={currentConfig.max}
                    step={currentConfig.unit === 'hrs' ? 0.5 : 1}
                    className="range-input"
                    value={quickValue}
                    onChange={e => setQuickValue(Number(e.target.value))}
                  />
                </div>
              );
            })()}

            {successMsg && <p style={{ color: 'var(--emerald)', fontSize: '0.9rem', marginBottom: '12px', textAlign: 'center' }}>{successMsg}</p>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
              {submitting ? 'Logging...' : 'Log Activity'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
