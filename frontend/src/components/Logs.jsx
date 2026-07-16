import React, { useState } from 'react';

const CATEGORY_MAP = {
  transportation: '🚗 Transportation',
  energy: '🔌 Home Energy',
  food: '🍔 Food & Diet',
  waste: '🗑️ Waste & Trash'
};

const TYPE_MAP = {
  driving_petrol: 'Gasoline Car (miles)',
  driving_suv: 'SUV Drive (miles)',
  driving_ev: 'Electric Car (miles)',
  public_transit: 'Bus/Train Commute (miles)',
  flight_short: 'Short-haul flight (hours)',
  flight_long: 'Long-haul flight (hours)',
  electricity_kwh: 'Electricity Use (kWh)',
  gas_therms: 'Natural Gas (therms)',
  heating_oil_gal: 'Heating Oil (gallons)',
  heavy_meat: 'Heavy Meat Meal (servings)',
  light_meat: 'Light Meat Meal (servings)',
  vegetarian: 'Vegetarian Meal (servings)',
  vegan: 'Vegan Meal (servings)',
  unsorted_bag: 'Unsorted Landfill (bags)'
};

export default function Logs({ user, activities, onRefresh }) {
  const [category, setCategory] = useState('transportation');
  const [activityType, setActivityType] = useState('driving_petrol');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const typeOptions = {
    transportation: [
      { id: 'driving_petrol', label: 'Gasoline Car (miles)' },
      { id: 'driving_suv', label: 'SUV/Truck (miles)' },
      { id: 'driving_ev', label: 'Electric Car (miles)' },
      { id: 'public_transit', label: 'Public Transit (miles)' },
      { id: 'flight_short', label: 'Short Flight (hours)' },
      { id: 'flight_long', label: 'Long Flight (hours)' }
    ],
    energy: [
      { id: 'electricity_kwh', label: 'Electricity (kWh)' },
      { id: 'gas_therms', label: 'Natural Gas (therms)' },
      { id: 'heating_oil_gal', label: 'Heating Oil (gallons)' }
    ],
    food: [
      { id: 'heavy_meat', label: 'Heavy Meat Serving' },
      { id: 'light_meat', label: 'Light Meat/Poultry Serving' },
      { id: 'vegetarian', label: 'Vegetarian Serving' },
      { id: 'vegan', label: 'Vegan Serving' }
    ],
    waste: [
      { id: 'unsorted_bag', label: 'Unsorted Trash (bags)' }
    ]
  };

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setActivityType(typeOptions[cat][0].id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value || isNaN(value) || parseFloat(value) <= 0) {
      setError('Please enter a valid numeric value greater than zero.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          date,
          category,
          activity_type: activityType,
          value: parseFloat(value)
        })
      });
      if (response.ok) {
        setValue('');
        onRefresh();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add activity log');
      }
    } catch (err) {
      setError('Could not reach backend server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this activity log?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/activities/${id}?user_id=${user.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="dashboard-layout animate-fade-in" style={{ gridTemplateColumns: '1fr 1.8fr' }}>
      {/* ADD LOG CONTAINER */}
      <div className="glass-panel" style={{ padding: '28px', height: 'fit-content' }}>
        <h3 className="panel-title">📝 Add Footprint Log</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label className="slider-label" style={{ display: 'block', marginBottom: '8px' }}>Category</label>
            <select 
              className="form-input form-select" 
              value={category} 
              onChange={e => handleCategoryChange(e.target.value)}
            >
              <option value="transportation">🚗 Transportation</option>
              <option value="energy">🔌 Home Energy</option>
              <option value="food">🍔 Diet & Food</option>
              <option value="waste">🗑️ Household Waste</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="slider-label" style={{ display: 'block', marginBottom: '8px' }}>Activity Type</label>
            <select 
              className="form-input form-select" 
              value={activityType} 
              onChange={e => setActivityType(e.target.value)}
            >
              {typeOptions[category].map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="slider-label" style={{ display: 'block', marginBottom: '8px' }}>Quantity / Value</label>
            <input 
              type="number"
              step="any"
              className="form-input"
              placeholder="e.g. 25"
              value={value}
              onChange={e => setValue(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label className="slider-label" style={{ display: 'block', marginBottom: '8px' }}>Date</label>
            <input 
              type="date"
              className="form-input"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          {error && <p style={{ color: 'var(--coral)', fontSize: '0.9rem', marginBottom: '16px' }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Log'}
          </button>
        </form>
      </div>

      {/* RECENT ACTIVITY LOGS */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 className="panel-title">📅 Activity Log History</h3>
        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>📜</span>
            No activities logged yet. Add your first commute or meal to start tracking!
          </div>
        ) : (
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Activity</th>
                  <th>Value</th>
                  <th>CO₂ Impact</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activities.map(act => (
                  <tr key={act.id} className="animate-fade-in">
                    <td style={{ whiteSpace: 'nowrap' }}>{act.date}</td>
                    <td>
                      <span className={`category-tag tag-${act.category}`}>
                        {act.category}
                      </span>
                    </td>
                    <td>{TYPE_MAP[act.activity_type] || act.activity_type}</td>
                    <td>{act.value}</td>
                    <td style={{ color: 'var(--coral)', fontWeight: '700' }}>{act.co2_kg.toFixed(1)} kg</td>
                    <td>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                        onClick={() => handleDelete(act.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
