import express from 'express';
import mysql from 'mysql2/promise';
import session from 'express-session';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const app = express();

/* ========================================================
   SESSION SETUP
   - Keeps users logged in across pages
   - Stores data in req.session
======================================================== */
app.use(
  session({
    secret: 'superSecretKey123', // Key used to sign the session cookie
    resave: false, // Do not save session if nothing changed
    saveUninitialized: true, // Create session even if empty
  })
);

// Make session values available inside all EJS views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

/* ========================================================
   EXPRESS CONFIG
======================================================== */
app.set('view engine', 'ejs'); // Use EJS for views
app.use(express.static('public')); // Serve CSS/JS files from /public
app.use(express.urlencoded({ extended: true })); // Read POST form data

/* ========================================================
   DATABASE CONNECTION
   - Uses environment variables from .env
   - Creates a connection pool for efficiency
======================================================== */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

/* ========================================================
   AUTH MIDDLEWARE
   - Restricts routes to logged-in users only
======================================================== */
function ensureLoggedIn(req, res, next) {
  if (!req.session.authenticated) {
    return res.redirect('/login');
  }
  next();
}

/* ========================================================
   LOGIN ROUTES
======================================================== */

// Show login page
app.get('/', (req, res) => res.render('login.ejs'));
app.get('/login', (req, res) => res.render('login.ejs'));

// Handle login attempt
app.post('/loginProcess', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Look up user in database
    const sql = 'SELECT * FROM users WHERE username = ? LIMIT 1';
    const [rows] = await pool.query(sql, [username]);

    if (rows.length === 0) {
      return res.render('login.ejs', {
        loginError: 'Invalid username or password',
      });
    }

    const user = rows[0];

    // Compare password (non-hashed in this project)
    if (password !== user.password) {
      return res.render('login.ejs', {
        loginError: 'Invalid username or password',
      });
    }

    // Store login info in session
    req.session.authenticated = true;
    req.session.username = user.username;
    req.session.userId = user.userId;

    return res.redirect('/home'); // Go to dashboard
  } catch (err) {
    console.error(err);
    return res.render('login.ejs', { loginError: 'Server error' });
  }
});

/* ========================================================
   HOME DASHBOARD
   - Loads food entries
   - Loads gym logs
   - Only available if logged in
======================================================== */
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

/* ========================================================
   ADD FOOD ENTRY
   - Inserts new food into database
======================================================== */
app.post('/addFood', ensureLoggedIn, async (req, res) => {
  const {
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
    entryDate,
  } = req.body;

  const sql = `
    INSERT INTO foods
      (name, brand, calories, protein, carbs, fat,
       sodium, sugar, fiber, cholesterol, sat_fat,
       unsat_fat, entryDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    entryDate,
  ]);

  res.redirect('/home');
});

/* ========================================================
   ADD GYM LOG ENTRY
======================================================== */
app.post('/addGymLog', ensureLoggedIn, async (req, res) => {
  const { exercise, weight, reps, entryDate } = req.body;

  const sql = `
    INSERT INTO gym_logs (exercise, weight, reps, entryDate)
    VALUES (?, ?, ?, ?)
  `;

  await pool.query(sql, [exercise, weight, reps, entryDate]);
  res.redirect('/home');
});

/* ========================================================
   SIMPLE DATABASE TEST ROUTE
======================================================== */
app.get('/dbTest', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW()');
    res.send(rows);
  } catch (err) {
    res.status(500).send('Database error');
  }
});

/* ========================================================
   START THE SERVER
======================================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Website is live at port: ${PORT}`);
});
