import express from 'express';
import mysql from 'mysql2/promise';
import session from 'express-session';
import 'dotenv/config';

const app = express();

/* ================================================
   SESSION SETUP
   Persists login across pages
================================================ */
app.use(
  session({
    secret: 'superSecretKey123',
    resave: false,
    saveUninitialized: true,
  })
);

// Make session available in all EJS views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

/* ================================================
   EXPRESS CONFIG
================================================ */
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

/* ================================================
   DATABASE CONNECTION
================================================ */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

/* ================================================
   LOGIN PROTECTION
================================================ */
function ensureLoggedIn(req, res, next) {
  if (!req.session.authenticated) return res.redirect('/login');
  next();
}

/* ================================================
   LOGIN ROUTES
================================================ */
app.get('/', (req, res) => res.render('login.ejs'));
app.get('/login', (req, res) => res.render('login.ejs'));

app.post('/loginProcess', async (req, res) => {
  const { username, password } = req.body;

  try {
    const sql = 'SELECT * FROM users WHERE username = ? LIMIT 1';
    const [rows] = await pool.query(sql, [username]);

    if (rows.length === 0 || password !== rows[0].password) {
      return res.render('login.ejs', {
        loginError: 'Invalid username or password',
      });
    }

    const user = rows[0];

    req.session.authenticated = true;
    req.session.username = user.username;
    req.session.userId = user.userId;

    res.redirect('/home');
  } catch (err) {
    console.error(err);
    res.render('login.ejs', { loginError: 'Server error' });
  }
});

/* ================================================
   HOME DASHBOARD
================================================ */
app.get('/home', ensureLoggedIn, async (req, res) => {
  try {
    const [foods] = await pool.query(
      'SELECT * FROM foods ORDER BY entryDate DESC'
    );
    const [logs] = await pool.query(
      'SELECT * FROM gym_logs ORDER BY entryDate DESC'
    );

    res.render('home.ejs', { foods, logs });
  } catch (err) {
    console.error(err);
    res.send('Dashboard error');
  }
});

/* ================================================
   DATE FORMATTER (yyyy-mm-dd)
================================================ */
function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

/* ================================================
   ADD FOOD ENTRY
================================================ */
app.post('/addFood', ensureLoggedIn, async (req, res) => {
  let {
    name,
    brand,
    calories,
    protein,
    carbs,
    fat,
    sodium,
    sugar,
    fiber,
    cholesterol,
    sat_fat,
    unsat_fat,
    mealType,
    entryDate,
  } = req.body;

  entryDate = entryDate ? formatDate(entryDate) : formatDate(new Date());

  const sql = `
    INSERT INTO foods
      (name, brand, calories, protein, carbs, fat, sodium, sugar, fiber, cholesterol, sat_fat, unsat_fat, mealType, entryDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await pool.query(sql, [
    name,
    brand,
    calories,
    protein,
    carbs,
    fat,
    sodium,
    sugar,
    fiber,
    cholesterol,
    sat_fat,
    unsat_fat,
    mealType,
    entryDate,
  ]);

  res.redirect('/home');
});

/* ================================================
   ADD GYM LOG ENTRY
================================================ */
app.post('/addGymLog', ensureLoggedIn, async (req, res) => {
  let { exercise, weight, reps, entryDate } = req.body;

  entryDate = entryDate ? formatDate(entryDate) : formatDate(new Date());

  const sql = `
    INSERT INTO gym_logs (exercise, weight, reps, entryDate)
    VALUES (?, ?, ?, ?)
  `;

  await pool.query(sql, [exercise, weight, reps, entryDate]);
  res.redirect('/home');
});

/* ================================================
   FOOD SEARCH
   - Returns macros for foods
   - USING OPEN FOOD FACTS
================================================ */
app.get('/searchFood', ensureLoggedIn, async (req, res) => {
  const query = req.query.query;
  if (!query) return res.json([]);

  try {
    const url =
      'https://world.openfoodfacts.org/api/v2/search?' +
      'fields=product_name,nutriments&page_size=10&' +
      'search_terms=' +
      encodeURIComponent(query);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GalTrackerApp/1.0 (student-project@csumb.edu)',
      },
    });

    const data = await response.json();

    if (!data.products) return res.json([]);

    const items = data.products.map((p) => {
      const n = p.nutriments || {};

      return {
        name: p.product_name || 'Unknown food',
        calories: n['energy-kcal_100g'] || 0,
        protein: n.proteins_100g || 0,
        carbs: n.carbohydrates_100g || 0,
        fat: n.fat_100g || 0,
        sodium: n.sodium_100g || 0,
        sugar: n.sugars_100g || 0,
        fiber: n.fiber_100g || 0,
      };
    });

    res.json(items);
  } catch (err) {
    console.error('OpenFoodFacts Error:', err);
    res.json([]);
  }
});

/* ================================================
   TEST DATABASE CONNECTION
================================================ */
app.get('/dbTest', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW()');
    res.send(rows);
  } catch (err) {
    res.status(500).send('DB error');
  }
});

/* ================================================
   START SERVER
================================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Website running on port ${PORT}`));
