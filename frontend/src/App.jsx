import React, { useState, useEffect } from 'react';
import Quiz from './components/Quiz';
import Dashboard from './components/Dashboard';
import Logs from './components/Logs';
import Quests from './components/Quests';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, logs, quests, insights
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [habits, setHabits] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  // Check localStorage for saved session
  useEffect(() => {
    const savedUser = localStorage.getItem('carbon_pulse_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('carbon_pulse_user');
      }
    }
  }, []);

  // Fetch all user statistics and logs when user changes
  const fetchAllData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch stats
      const statsRes = await fetch(`http://localhost:5000/api/stats?user_id=${user.id}`);
      const statsData = await statsRes.json();

      // 2. Fetch activities
      const actRes = await fetch(`http://localhost:5000/api/activities?user_id=${user.id}`);
      const actData = await actRes.json();

      // 3. Fetch habits
      const habitsRes = await fetch(`http://localhost:5000/api/habits?user_id=${user.id}`);
      const habitsData = await habitsRes.json();

      // 4. Fetch insights
      const insightsRes = await fetch(`http://localhost:5000/api/insights?user_id=${user.id}`);
      const insightsData = await insightsRes.json();

      if (statsRes.ok) setStats(statsData);
      if (actRes.ok) setActivities(actData);
      if (habitsRes.ok) setHabits(habitsData);
      if (insightsRes.ok) setInsights(insightsData);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const handleQuizComplete = (userData) => {
    setUser(userData);
    localStorage.setItem('carbon_pulse_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem('carbon_pulse_user');
    setUser(null);
    setStats(null);
    setActivities([]);
    setHabits([]);
    setInsights([]);
  };

  // If user is not logged in / has not calculated baseline
  if (!user || !stats) {
    return <Quiz onQuizComplete={handleQuizComplete} />;
  }

  return (
    <div className="app-wrapper">
      {/* GLOWING HEADER */}
      <header className="main-header glass-panel">
        <div className="logo-container">
          <span className="logo-icon">🌿</span>
          <h1 className="logo-text">CarbonPulse</h1>
        </div>

        <nav className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`nav-tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            Emissions Log
          </button>
          <button 
            className={`nav-tab ${activeTab === 'quests' ? 'active' : ''}`}
            onClick={() => setActiveTab('quests')}
          >
            Green Actions
          </button>
          <button 
            className={`nav-tab ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            Reduction Tips
          </button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="user-badge">
            {user.username}
          </div>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* CORE VIEWPORT */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', fontSize: '1.2rem', color: 'var(--emerald)' }}>
          Syncing eco-metrics...
        </div>
      )}

      {!loading && activeTab === 'dashboard' && (
        <Dashboard user={user} stats={stats} onRefresh={fetchAllData} />
      )}

      {!loading && activeTab === 'logs' && (
        <Logs user={user} activities={activities} onRefresh={fetchAllData} />
      )}

      {!loading && activeTab === 'quests' && (
        <Quests user={user} habits={habits} onRefresh={fetchAllData} />
      )}

      {!loading && activeTab === 'insights' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
          <h3 className="panel-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💡 Personalized Footprint Reduction Roadmap</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '32px' }}>
            Based on your baseline profile and logged activities, here are tailored, actionable tips to reduce emissions.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {insights.map((insight, idx) => (
              <div 
                key={idx} 
                className={`insight-card ${insight.category}`}
                style={{ padding: '20px', borderRadius: '8px' }}
              >
                <h4 className="insight-title" style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  {insight.category === 'transportation' ? '🚗' : insight.category === 'energy' ? '🔌' : insight.category === 'food' ? '🍔' : insight.category === 'waste' ? '🗑️' : '🌟'} {insight.title}
                </h4>
                <p className="insight-text" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>
                  {insight.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
