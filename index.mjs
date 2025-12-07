import express from 'express';
import mysql from 'mysql2/promise';
import session from 'express-session';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const app = express();

/* ============================================
   SESSION SETUP
============================================ */
app.use(
  session({
    secret: 'superSecretKey123',
    resave: false,
    saveUninitialized: true,
  })
);

// Make session available to all EJS templates
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

/* ============================================
   EXPRESS SETUP
============================================ */
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Needed for API insert from JS

/* ============================================
   DATABASE CONNECTION
============================================ */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

/* ============================================
   LOGIN GUARD
============================================ */
function ensureLoggedIn(req, res, next) {
  if (!req.session.authenticated) return res.redirect('/login');
  next();
}

/* ============================================
   LOGIN ROUTES
============================================ */
app.get('/', (req, res) => res.render('login.ejs'));
app.get('/login', (req, res) => res.render('login.ejs'));

app.post('/loginProcess', async (req, res) => {
  const { username, password } = req.body;

  try {
    const sql = 'SELECT * FROM users WHERE username = ? LIMIT 1';
    const [rows] = await pool.query(sql, [username]);

    if (rows.length === 0)
      return res.render('login.ejs', {
        loginError: 'Invalid username or password',
      });

    const user = rows[0];

    if (password !== user.password)
      return res.render('login.ejs', {
        loginError: 'Invalid username or password',
      });

    req.session.authenticated = true;
    req.session.username = user.username;
    req.session.userId = user.userId;

    return res.redirect('/home');
  } catch (err) {
    console.error(err);
    return res.render('login.ejs', { loginError: 'Server error' });
  }
});

/* ============================================
   HOME DASHBOARD
============================================ */
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
    res.send('Error loading dashboard');
  }
});

/* ============================================
   DATE HANDLER
============================================ */
function formatDateSQL(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/* ============================================
   ADD FOOD (Manual Form)
============================================ */
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

  entryDate = entryDate ? formatDateSQL(entryDate) : formatDateSQL(new Date());

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

/* ============================================
   ADD GYM LOG
============================================ */
app.post('/addGymLog', ensureLoggedIn, async (req, res) => {
  let { exercise, weight, reps, entryDate } = req.body;

  entryDate = entryDate ? formatDateSQL(entryDate) : formatDateSQL(new Date());

  const sql = `
    INSERT INTO gym_logs (exercise, weight, reps, entryDate)
    VALUES (?, ?, ?, ?)
  `;

  await pool.query(sql, [exercise, weight, reps, entryDate]);
  res.redirect('/home');
});

/* ============================================
   SEARCH FOOD — OPENFOODFACTS API
============================================ */
app.get('/searchFood', async (req, res) => {
  const query = req.query.query;
  if (!query) return res.json([]);

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      query
    )}&search_simple=1&json=1`;

    const apiResponse = await fetch(url);
    const data = await apiResponse.json();

    if (!data.products) return res.json([]);

    const results = data.products
      .filter((p) => p.product_name)
      .slice(0, 10)
      .map((p) => ({
        name: p.product_name || 'Unknown',
        calories: p.nutriments['energy-kcal_100g'] || 0,
        protein: p.nutriments.proteins_100g || 0,
        carbs: p.nutriments.carbohydrates_100g || 0,
        fat: p.nutriments.fat_100g || 0,
        sodium: p.nutriments.sodium_100g || 0,
        mealType: 'Snack',
        entryDate: formatDateSQL(new Date()),
      }));

    res.json(results);
  } catch (err) {
    console.error('API Error:', err);
    res.json([]);
  }
});

/* ============================================
   INSERT FOOD FROM SEARCH CLICK (AJAX)
============================================ */
app.post('/addFoodFromSearch', ensureLoggedIn, async (req, res) => {
  let food = req.body;

  const sql = `
    INSERT INTO foods (name, calories, protein, carbs, fat, sodium, mealType, entryDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await pool.query(sql, [
    food.name,
    food.calories,
    food.protein,
    food.carbs,
    food.fat,
    food.sodium,
    food.mealType || 'Snack',
    food.entryDate || formatDateSQL(new Date()),
  ]);

  res.json({ success: true });
});

/* ============================================
   DB TEST ROUTE
============================================ */
app.get('/dbTest', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW()');
    res.send(rows);
  } catch (err) {
    res.status(500).send('Database error');
  }
});

/* ============================================
   START SERVER
============================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Website running on port ${PORT}`));
