import React, { useState } from 'react';

const HABIT_DEFINITIONS = [
  { id: 'meatless_day', label: '🥗 Meat-free Day', desc: 'Eat vegetarian or vegan for a whole day instead of meat.', saving: 5.0, impact: 'High Impact' },
  { id: 'public_transit_commute', label: '🚌 Transit Commuter', desc: 'Commute using bus, rail, or bike instead of driving a single-occupancy gasoline vehicle.', saving: 4.2, impact: 'High Impact' },
  { id: 'line_dry_laundry', label: '🧺 Line Dry Clothes', desc: 'Air dry laundry on a drying rack or clothesline rather than using a gas/electric tumble dryer.', saving: 1.0, impact: 'Medium Impact' },
  { id: 'shorter_shower', label: '🚿 Short shower (under 5m)', desc: 'Cut your showering time in half to save water heating energy.', saving: 0.5, impact: 'Medium Impact' },
  { id: 'composting', label: '🪱 Food Composting', desc: 'Compost food scraps to keep organic waste out of landfill decay.', saving: 0.4, impact: 'Low Impact' },
  { id: 'cold_water_wash', label: '🧼 Cold Water Wash', desc: 'Wash laundry using cold water cycle to eliminate heating draw.', saving: 0.3, impact: 'Low Impact' },
  { id: 'unplug_standby', label: '🔌 Slay Standby Vampires', desc: 'Unplug unused chargers and electronic appliances from sockets.', saving: 0.2, impact: 'Low Impact' },
  { id: 'reusable_bags', label: '🛍️ Reusable Bag Champion', desc: 'Avoid plastic checkout bags by bringing canvas alternatives.', saving: 0.1, impact: 'Low Impact' }
];

export default function Quests({ user, habits, onRefresh }) {
  const [loadingHabit, setLoadingHabit] = useState(null);
  const todayStr = new Date().toISOString().split('T')[0];

  // Find if a habit is logged for today
  const getLoggedHabit = (type) => {
    return habits.find(h => h.habit_type === type && h.date === todayStr);
  };

  const handleToggle = async (habitType) => {
    setLoadingHabit(habitType);
    const existing = getLoggedHabit(habitType);

    try {
      if (existing) {
        // Delete (uncheck)
        const response = await fetch(`http://localhost:5000/api/habits/${existing.id}?user_id=${user.id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          onRefresh();
        }
      } else {
        // Create (check)
        const response = await fetch('http://localhost:5000/api/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            date: todayStr,
            habit_type: habitType
          })
        });
        if (response.ok) {
          onRefresh();
        }
      }
    } catch (err) {
      console.error('Error toggling habit:', err);
    } finally {
      setLoadingHabit(null);
    }
  };

  // Compute stats
  const totalTodaySaved = habits
    .filter(h => h.date === todayStr)
    .reduce((sum, h) => sum + h.co2_saved_kg, 0);

  return (
    <div className="dashboard-layout animate-fade-in" style={{ gridTemplateColumns: '1.8fr 1fr' }}>
      {/* QUESTS CHECKLIST */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 className="panel-title">🌿 Daily Green Challenges</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
          Complete daily challenges below to offset carbon footprint in real-time. Actions reset at midnight.
        </p>

        <div className="quests-grid">
          {HABIT_DEFINITIONS.map(habit => {
            const logged = getLoggedHabit(habit.id);
            const isChecked = !!logged;
            return (
              <div 
                key={habit.id} 
                className={`quest-card glass-panel ${isChecked ? 'completed' : ''}`}
                style={{ 
                  borderColor: isChecked ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-glass)',
                  background: isChecked ? 'rgba(16, 185, 129, 0.05)' : 'rgba(0,0,0,0.1)'
                }}
              >
                <div className="quest-checkbox-wrapper">
                  <input 
                    type="checkbox"
                    className="quest-checkbox"
                    id={`habit-${habit.id}`}
                    checked={isChecked}
                    disabled={loadingHabit === habit.id}
                    onChange={() => handleToggle(habit.id)}
                  />
                </div>
                <div className="quest-details">
                  <label htmlFor={`habit-${habit.id}`} className="quest-title" style={{ cursor: 'pointer' }}>
                    {habit.label}
                  </label>
                  <p className="quest-desc">{habit.desc}</p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="quest-impact" style={{ 
                      color: habit.impact === 'High Impact' ? 'var(--coral)' : habit.impact === 'Medium Impact' ? 'var(--cyan)' : 'var(--emerald)',
                      background: habit.impact === 'High Impact' ? 'rgba(244,63,94,0.1)' : habit.impact === 'Medium Impact' ? 'rgba(6,182,212,0.1)' : 'rgba(16,185,129,0.1)'
                    }}>
                      {habit.impact}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      -{habit.saving.toFixed(1)} kg CO₂
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STATS BREAKDOWN SIDEBAR */}
      <div className="dashboard-sidebar">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="panel-title">🏅 Actions Ledger</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <span className="metric-label">Today's Savings</span>
            <div className="metric-value" style={{ color: 'var(--emerald)' }}>
              {totalTodaySaved.toFixed(1)} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>kg</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Keep going! An average tree absorbs ~0.06 kg CO₂ per day.
            </p>
          </div>

          <hr style={{ border: 'none', height: '1px', background: 'var(--border-glass)', margin: '20px 0' }} />

          <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px' }}>Savings History</h4>
          {habits.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textAlign: 'center', padding: '20px 0' }}>
              No green habits logged yet.
            </p>
          ) : (
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {habits.slice(0, 5).map(h => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                  <span>{h.habit_type.replace(/_/g, ' ')}</span>
                  <span style={{ color: 'var(--emerald)', fontWeight: '600' }}>-{h.co2_saved_kg.toFixed(1)} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
