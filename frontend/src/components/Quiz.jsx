import React, { useState } from 'react';

const DIET_OPTIONS = [
  { id: 'heavy_meat', label: 'Heavy Meat Eater', desc: 'Frequent beef, pork, or lamb meals', icon: '🥩' },
  { id: 'light_meat', label: 'Low Meat/Poultry', desc: 'Mainly chicken, fish, or light meat', icon: '🍗' },
  { id: 'vegetarian', label: 'Vegetarian', desc: 'No meat, includes dairy and eggs', icon: '🧀' },
  { id: 'vegan', label: 'Vegan', desc: 'Strictly plant-based diet', icon: '🌱' },
];

const CAR_OPTIONS = [
  { id: 'petrol', label: 'Petrol/Diesel Car', desc: 'Standard internal combustion engine', icon: '🚗' },
  { id: 'suv', label: 'SUV/Truck', desc: 'Large gasoline-powered utility vehicle', icon: '🛻' },
  { id: 'ev', label: 'Electric Vehicle (EV)', desc: 'Battery electric or plug-in hybrid', icon: '⚡' },
  { id: 'none', label: 'No Car', desc: 'Rely solely on walking, biking or transit', icon: '🚲' }
];

export default function Quiz({ onQuizComplete }) {
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0); // 0 = Username, 1 = Transport, 2 = Energy, 3 = Diet, 4 = Waste
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Quiz Form State
  const [carType, setCarType] = useState('petrol');
  const [carMilesPerWeek, setCarMilesPerWeek] = useState(100);
  const [transitMilesPerWeek, setTransitMilesPerWeek] = useState(20);
  const [flightHoursPerYear, setFlightHoursPerYear] = useState(5);

  const [electricityKwhPerMonth, setElectricityKwhPerMonth] = useState(250);
  const [heatingType, setHeatingType] = useState('gas');
  const [heatingUsagePerMonth, setHeatingUsagePerMonth] = useState(15); // therms or gallons

  const [dietType, setDietType] = useState('light_meat');

  const [wasteBagsPerWeek, setWasteBagsPerWeek] = useState(2);
  const [recycles, setRecycles] = useState(true);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data);
        if (data.baseline_tons > 0) {
          // If user already completed quiz before, skip to complete
          onQuizComplete(data);
        } else {
          setStep(1); // Go to quiz step 1
        }
      } else {
        setError(data.error || 'Failed to authenticate');
      }
    } catch (err) {
      setError('Could not connect to backend. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizSubmit = async () => {
    setLoading(true);
    setError('');
    const answers = {
      carType,
      carMilesPerWeek,
      transitMilesPerWeek,
      flightHoursPerYear,
      electricityKwhPerMonth,
      heatingType,
      heatingUsagePerMonth,
      dietType,
      wasteBagsPerWeek,
      recycles
    };

    try {
      const response = await fetch('http://localhost:5000/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, answers })
      });
      const data = await response.json();
      if (response.ok) {
        onQuizComplete({ ...user, baseline_tons: data.baseline_tons, breakdown_json: JSON.stringify(data.breakdown) });
      } else {
        setError(data.error || 'Failed to submit onboarding quiz');
      }
    } catch (err) {
      setError('Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  if (step === 0) {
    return (
      <div className="quiz-container glass-panel animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="logo-icon" style={{ margin: '0 auto 16px auto', width: '48px', height: '48px', fontSize: '1.75rem' }}>🌍</div>
          <h2 className="quiz-step-title" style={{ fontSize: '2.2rem' }}>Welcome to CarbonPulse</h2>
          <p className="quiz-step-desc">Enter your username to track, log, and work towards carbon neutrality.</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label className="slider-label" style={{ display: 'block', marginBottom: '8px' }}>Username</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. green_warrior"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          {error && <p style={{ color: 'var(--coral)', fontSize: '0.9rem', marginBottom: '16px' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Entering...' : 'Get Started'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="quiz-container glass-panel animate-fade-in">
      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${(step / 4) * 100}%` }}></div>
      </div>

      {step === 1 && (
        <div className="animate-fade-in">
          <h3 className="quiz-step-title">1. Transportation</h3>
          <p className="quiz-step-desc">Travel is one of the highest contributors to household carbon. Let's calculate your average annual commuting habits.</p>
          
          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Car Type</span>
            </div>
            <div className="quiz-options-grid">
              {CAR_OPTIONS.map(opt => (
                <div 
                  key={opt.id}
                  className={`quiz-option-card ${carType === opt.id ? 'selected' : ''}`}
                  onClick={() => setCarType(opt.id)}
                >
                  <span className="quiz-option-icon">{opt.icon}</span>
                  <div className="quiz-option-title">{opt.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {carType !== 'none' && (
            <div className="slider-group animate-fade-in">
              <div className="slider-header">
                <span className="slider-label">Weekly Car Mileage</span>
                <span className="slider-value">{carMilesPerWeek} miles</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="500" 
                step="10" 
                className="range-input" 
                value={carMilesPerWeek}
                onChange={e => setCarMilesPerWeek(Number(e.target.value))}
              />
            </div>
          )}

          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Weekly Public Transit Use (Bus/Train)</span>
              <span className="slider-value">{transitMilesPerWeek} miles</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="200" 
              step="5" 
              className="range-input" 
              value={transitMilesPerWeek}
              onChange={e => setTransitMilesPerWeek(Number(e.target.value))}
            />
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Annual Flight Duration</span>
              <span className="slider-value">{flightHoursPerYear} hours</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="2" 
              className="range-input" 
              value={flightHoursPerYear}
              onChange={e => setFlightHoursPerYear(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-fade-in">
          <h3 className="quiz-step-title">2. Home Energy</h3>
          <p className="quiz-step-desc">Heating, cooling, and electricity use fossil fuels behind the scenes. Estimates your average monthly bills.</p>

          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Monthly Electricity Usage</span>
              <span className="slider-value">{electricityKwhPerMonth} kWh</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1500" 
              step="50" 
              className="range-input" 
              value={electricityKwhPerMonth}
              onChange={e => setElectricityKwhPerMonth(Number(e.target.value))}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Average US household uses ~890 kWh per month.</p>
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Heating Source</span>
            </div>
            <select className="form-input form-select" value={heatingType} onChange={e => setHeatingType(e.target.value)}>
              <option value="gas">Natural Gas (therms)</option>
              <option value="oil">Heating Oil (gallons)</option>
              <option value="electric">Electric Heat (computed in electricity)</option>
              <option value="none">No Heating / Heat Pump</option>
            </select>
          </div>

          {(heatingType === 'gas' || heatingType === 'oil') && (
            <div className="slider-group animate-fade-in">
              <div className="slider-header">
                <span className="slider-label">Average Monthly Heating Fuel</span>
                <span className="slider-value">
                  {heatingUsagePerMonth} {heatingType === 'gas' ? 'therms' : 'gallons'}
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5" 
                className="range-input" 
                value={heatingUsagePerMonth}
                onChange={e => setHeatingUsagePerMonth(Number(e.target.value))}
              />
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="animate-fade-in">
          <h3 className="quiz-step-title">3. Dietary Preferences</h3>
          <p className="quiz-step-desc">Agriculture accounts for 10-15% of global emissions. Animal farming, specifically beef, has a massive carbon footprint.</p>

          <div className="slider-group">
            <div className="quiz-options-grid" style={{ gridTemplateColumns: '1fr' }}>
              {DIET_OPTIONS.map(opt => (
                <div 
                  key={opt.id}
                  className={`quiz-option-card ${dietType === opt.id ? 'selected' : ''}`}
                  onClick={() => setDietType(opt.id)}
                  style={{ display: 'flex', alignItems: 'center', textAlign: 'left', gap: '16px', padding: '16px' }}
                >
                  <span className="quiz-option-icon" style={{ fontSize: '2.2rem', marginBottom: 0 }}>{opt.icon}</span>
                  <div>
                    <div className="quiz-option-title">{opt.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="animate-fade-in">
          <h3 className="quiz-step-title">4. Household Waste</h3>
          <p className="quiz-step-desc">Landfills generate methane, a greenhouse gas 28x more potent than CO2. Recycling significantly mitigates this impact.</p>

          <div className="slider-group">
            <div className="slider-header">
              <span className="slider-label">Weekly Trash Output</span>
              <span className="slider-value">{wasteBagsPerWeek} bags (approx 30L each)</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="10" 
              step="1" 
              className="range-input" 
              value={wasteBagsPerWeek}
              onChange={e => setWasteBagsPerWeek(Number(e.target.value))}
            />
          </div>

          <div className="quest-card glass-panel" style={{ border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.1)' }}>
            <div className="quest-checkbox-wrapper">
              <input 
                type="checkbox" 
                id="recycle_quiz" 
                className="quest-checkbox" 
                checked={recycles} 
                onChange={e => setRecycles(e.target.checked)}
              />
            </div>
            <div className="quest-details">
              <label htmlFor="recycle_quiz" className="quest-title" style={{ cursor: 'pointer' }}>Recycle Glass, Cans, Paper & Plastics</label>
              <div className="quest-desc" style={{ marginBottom: 0 }}>Recycling shifts waste away from landfills and lowers resource extraction footprint.</div>
            </div>
          </div>
        </div>
      )}

      {error && <p style={{ color: 'var(--coral)', fontSize: '0.9rem', marginTop: '16px' }}>{error}</p>}

      <div className="quiz-navigation">
        {step > 1 ? (
          <button className="btn btn-secondary" onClick={prevStep} disabled={loading}>
            Back
          </button>
        ) : (
          <div></div>
        )}

        {step < 4 ? (
          <button className="btn btn-primary" onClick={nextStep}>
            Next Step
          </button>
        ) : (
          <button className="btn btn-primary" onClick={handleQuizSubmit} disabled={loading}>
            {loading ? 'Calculating...' : 'Calculate My Baseline'}
          </button>
        )}
      </div>
    </div>
  );
}
