import express from 'express';
import cors from 'cors';
import { initDb, dbQuery } from './database.js';
import { calculateActivityCO2, calculateBaselineQuiz, HABIT_SAVINGS } from './calculator.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize SQLite Tables on startup
initDb().catch((err) => {
  console.error('Failed to initialize database tables:', err);
});

// Helper to check user existence
async function verifyUser(userId) {
  if (!userId) return null;
  return await dbQuery.get('SELECT * FROM users WHERE id = ?', [userId]);
}

// -------------------------------------------------------------
// USER ENDPOINTS
// -------------------------------------------------------------

// Sign up / log in (finds or creates a guest username)
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username is required' });
  }
  const cleanUsername = username.trim().toLowerCase();

  try {
    let user = await dbQuery.get('SELECT * FROM users WHERE username = ?', [cleanUsername]);
    if (!user) {
      const result = await dbQuery.run('INSERT INTO users (username) VALUES (?)', [cleanUsername]);
      user = { id: result.id, username: cleanUsername, baseline_tons: 0, breakdown_json: null };
    }
    res.json(user);
  } catch (error) {
    console.error('Error in /api/users:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user profile info
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await dbQuery.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Submit/Update baseline onboarding quiz
app.post('/api/onboarding', async (req, res) => {
  const { user_id, answers } = req.body;
  
  if (!user_id || !answers) {
    return res.status(400).json({ error: 'user_id and quiz answers are required' });
  }

  try {
    const user = await verifyUser(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Calculate baseline
    const baseline = calculateBaselineQuiz(answers);

    // Save to DB
    await dbQuery.run(
      'UPDATE users SET baseline_tons = ?, breakdown_json = ? WHERE id = ?',
      [baseline.totalBaselineTons, JSON.stringify(baseline.breakdownTons), user_id]
    );

    res.json({
      message: 'Onboarding completed successfully',
      baseline_tons: baseline.totalBaselineTons,
      breakdown: baseline.breakdownTons
    });
  } catch (error) {
    console.error('Error in /api/onboarding:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// -------------------------------------------------------------
// ACTIVITY ENDPOINTS (Carbon Emitting logs)
// -------------------------------------------------------------

// Log a carbon footprint producing activity
app.post('/api/activities', async (req, res) => {
  const { user_id, date, category, activity_type, value } = req.body;

  if (!user_id || !date || !category || !activity_type || value === undefined) {
    return res.status(400).json({ error: 'Missing required activity log parameters' });
  }

  try {
    const user = await verifyUser(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Calculate carbon emissions
    const co2_kg = calculateActivityCO2(category, activity_type, value);

    const result = await dbQuery.run(
      `INSERT INTO activities (user_id, date, category, activity_type, value, co2_kg) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, date, category, activity_type, parseFloat(value), co2_kg]
    );

    res.json({
      id: result.id,
      user_id,
      date,
      category,
      activity_type,
      value,
      co2_kg
    });
  } catch (error) {
    console.error('Error in /api/activities:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user activity logs
app.get('/api/activities', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    const activities = await dbQuery.all(
      'SELECT * FROM activities WHERE user_id = ? ORDER BY date DESC, id DESC',
      [user_id]
    );
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete an activity log
app.delete('/api/activities/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.query;

  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    const activity = await dbQuery.get('SELECT * FROM activities WHERE id = ? AND user_id = ?', [id, user_id]);
    if (!activity) return res.status(404).json({ error: 'Activity not found or unauthorized' });

    await dbQuery.run('DELETE FROM activities WHERE id = ?', [id]);
    res.json({ success: true, message: 'Activity deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// -------------------------------------------------------------
// HABIT ENDPOINTS (Green action saves)
// -------------------------------------------------------------

// Log a checked green habit
app.post('/api/habits', async (req, res) => {
  const { user_id, date, habit_type } = req.body;

  if (!user_id || !date || !habit_type) {
    return res.status(400).json({ error: 'user_id, date, and habit_type are required' });
  }

  const savings = HABIT_SAVINGS[habit_type];
  if (savings === undefined) {
    return res.status(400).json({ error: 'Invalid habit type' });
  }

  try {
    const user = await verifyUser(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if user already logged this habit on the same day to avoid duplicates
    const existing = await dbQuery.get(
      'SELECT id FROM habits WHERE user_id = ? AND date = ? AND habit_type = ?',
      [user_id, date, habit_type]
    );
    if (existing) {
      return res.status(400).json({ error: 'Habit already completed for this date' });
    }

    const result = await dbQuery.run(
      'INSERT INTO habits (user_id, date, habit_type, co2_saved_kg) VALUES (?, ?, ?, ?)',
      [user_id, date, habit_type, savings]
    );

    res.json({
      id: result.id,
      user_id,
      date,
      habit_type,
      co2_saved_kg: savings
    });
  } catch (error) {
    console.error('Error in /api/habits:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user habit history
app.get('/api/habits', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    const habits = await dbQuery.all(
      'SELECT * FROM habits WHERE user_id = ? ORDER BY date DESC, id DESC',
      [user_id]
    );
    res.json(habits);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete (uncheck) a logged habit
app.delete('/api/habits/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.query;

  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    const habit = await dbQuery.get('SELECT * FROM habits WHERE id = ? AND user_id = ?', [id, user_id]);
    if (!habit) return res.status(404).json({ error: 'Habit log not found or unauthorized' });

    await dbQuery.run('DELETE FROM habits WHERE id = ?', [id]);
    res.json({ success: true, message: 'Habit uncompleted' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// -------------------------------------------------------------
// STATISTICS & INSIGHTS ENDPOINTS
// -------------------------------------------------------------

// Compile dashboard stats for the user
app.get('/api/stats', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    const user = await dbQuery.get('SELECT * FROM users WHERE id = ?', [user_id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 1. Summarize logged activities by category (All-time or last 30 days)
    const categoryLogs = await dbQuery.all(
      `SELECT category, SUM(co2_kg) as total_co2 
       FROM activities 
       WHERE user_id = ? 
       GROUP BY category`,
      [user_id]
    );

    // Format category stats
    const categoriesMap = { transportation: 0, energy: 0, food: 0, waste: 0 };
    categoryLogs.forEach(row => {
      if (row.category in categoriesMap) {
        categoriesMap[row.category] = Number(row.total_co2.toFixed(2));
      }
    });

    // 2. Summarize habit savings
    const totalSavingsRow = await dbQuery.get(
      'SELECT SUM(co2_saved_kg) as total_saved FROM habits WHERE user_id = ?',
      [user_id]
    );
    const totalSavingsKg = Number((totalSavingsRow.total_saved || 0).toFixed(2));

    // 3. Historical timeline (Sum of daily emissions in last 30 days)
    const dailyEmissions = await dbQuery.all(
      `SELECT date, SUM(co2_kg) as daily_co2
       FROM activities
       WHERE user_id = ?
       GROUP BY date
       ORDER BY date ASC
       LIMIT 30`,
      [user_id]
    );

    // 4. Historical timeline (Sum of daily savings in last 30 days)
    const dailySavings = await dbQuery.all(
      `SELECT date, SUM(co2_saved_kg) as daily_saved
       FROM habits
       WHERE user_id = ?
       GROUP BY date
       ORDER BY date ASC
       LIMIT 30`,
      [user_id]
    );

    res.json({
      baseline_tons: user.baseline_tons,
      baseline_breakdown: user.breakdown_json ? JSON.parse(user.breakdown_json) : null,
      logged_emissions_kg: categoriesMap,
      total_saved_kg: totalSavingsKg,
      daily_emissions: dailyEmissions,
      daily_savings: dailySavings
    });
  } catch (error) {
    console.error('Error in /api/stats:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Fetch smart carbon-reduction insights based on user's stats
app.get('/api/insights', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    const user = await dbQuery.get('SELECT * FROM users WHERE id = ?', [user_id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const breakdown = user.breakdown_json ? JSON.parse(user.breakdown_json) : null;
    const insights = [];

    // General welcoming tip
    insights.push({
      category: 'general',
      title: 'Adopt the 5R Rule',
      text: 'Refuse, Reduce, Reuse, Purpose, and Recycle. Eliminating waste at the source is the single best way to cut carbon footprints.'
    });

    if (breakdown) {
      const { transportation = 0, energy = 0, food = 0, waste = 0 } = breakdown;
      const total = transportation + energy + food + waste;

      if (total > 0) {
        // Transportation insight
        if ((transportation / total) > 0.35) {
          insights.push({
            category: 'transportation',
            title: 'Optimize Commutes & Flights',
            text: `Transportation makes up ${( (transportation/total)*100 ).toFixed(0)}% of your baseline footprint. Switch to public transit, carpool, or transition to electric vehicles. For vacations, consider high-speed rail instead of short-haul flights.`
          });
        }
        // Energy insight
        if ((energy / total) > 0.35) {
          insights.push({
            category: 'energy',
            title: 'Slay Standby Vampire Power',
            text: `Home energy is your dominant emission sector. Unplug chargers, use smart power strips, and adjust your thermostat by 1-2 degrees. Swapping to LED lightbulbs can save up to 75% of lighting energy.`
          });
        }
        // Diet insight
        if ((food / total) > 0.25) {
          insights.push({
            category: 'food',
            title: 'Shift Towards Plants',
            text: `Diet accounts for ${( (food/total)*100 ).toFixed(0)}% of your footprint. Shifting to vegetarian or vegan meals just 3 times a week can reduce your food carbon footprint by over 30%. Beef has a carbon cost 5x higher than poultry.`
          });
        }
        // Waste insight
        if ((waste / total) > 0.15) {
          insights.push({
            category: 'waste',
            title: 'Compost and Recycle',
            text: `Waste processing adds significant methane in landfills. Composting organic leftovers avoids landfill decay and turns waste into rich soil. Always separate paper, aluminum, and clean plastics for recycling.`
          });
        }
      }
    }

    // Default dynamic recommendations
    if (insights.length < 3) {
      insights.push({
        category: 'energy',
        title: 'Upgrade Insulation',
        text: 'Proper drafts seals around doors and windows prevent heating/cooling leaks, reducing heating bills and associated gas/electric emissions by 15%.'
      });
      insights.push({
        category: 'transportation',
        title: 'Maintain Tyres',
        text: 'Keep car tyres properly inflated to improve fuel efficiency by up to 3%. It also extends the lifespan of tyres, reducing consumption emissions.'
      });
    }

    res.json(insights);
  } catch (error) {
    console.error('Error in /api/insights:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`CarbonPulse Express Server running on http://localhost:${PORT}`);
});
