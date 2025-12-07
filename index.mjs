import express from "express";
import mysql from "mysql2/promise";
import session from "express-session";
import bcrypt from "bcrypt";
import "dotenv/config";

const app = express();

/* ========================================================
   SESSION CONFIGURATION
   Makes req.session available & persistent across pages
======================================================== */
app.use(
  session({
    secret: "superSecretKey123", // random string
    resave: false,
    saveUninitialized: true,
  })
);

// Makes session available inside ALL EJS files as "session"
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

/* ========================================================
   EXPRESS SETTINGS
======================================================== */
app.set("view engine", "ejs");
app.use(express.static("public")); // serves CSS, JS, images
app.use(express.urlencoded({ extended: true })); // allows POST form data

/* ========================================================
   DATABASE CONNECTION POOL
   Using .env for security
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
   MIDDLEWARE: PROTECT ROUTES
   Blocks access unless logged in
======================================================== */
function ensureLoggedIn(req, res, next) {
  if (!req.session.authenticated) {
    return res.redirect("/login");
  }
  next();
}

/* ========================================================
   LOGIN ROUTES
======================================================== */

// Show login form
app.get("/", (req, res) => {
  res.render("login.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

// PROCESS LOGIN
app.post("/loginProcess", async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Check if username exists
    const sql = "SELECT * FROM users WHERE username = ? LIMIT 1";
    const [rows] = await pool.query(sql, [username]);

    if (rows.length === 0) {
      return res.render("login.ejs", { loginError: "Invalid username or password" });
    }

    const user = rows[0];

    // 2. Compare passwords (simple non-hashed version for your DB)
    if (password !== user.password) {
      return res.render("login.ejs", { loginError: "Invalid username or password" });
    }

    // 3. Store session info
    req.session.authenticated = true;
    req.session.username = user.username;
    req.session.userId = user.userId; // required for user-linked tables later

    // 4. Send to dashboard
    return res.redirect("/home");
  } catch (err) {
    console.error(err);
    return res.render("login.ejs", { loginError: "Server error" });
  }
});

/* ========================================================
   HOME (DASHBOARD)
   Loads foods + gym logs and displays them
   NOTICE HOW ENSURED LOGGEDIN IS PASSED HERE
======================================================== */
app.get("/home", ensureLoggedIn, async (req, res) => {
  try {
    // Load foods
    const [foods] = await pool.query(
      "SELECT * FROM foods ORDER BY entryDate DESC"
    );

    // Load gym logs
    const [logs] = await pool.query(
      "SELECT * FROM gym_logs ORDER BY entryDate DESC"
    );

    res.render("home.ejs", { foods, logs });
  } catch (err) {
    console.error(err);
    res.send("Error loading dashboard");
  }
});

/* ========================================================
   ADD FOOD — INSERT INTO DATABASE
======================================================== */
app.post("/addFood", ensureLoggedIn, async (req, res) => {
  const { foodName, calories, mealType, entryDate } = req.body;

  const sql = `
    INSERT INTO foods (name, calories, mealType, entryDate)
    VALUES (?, ?, ?, ?)
  `;

  await pool.query(sql, [foodName, calories, mealType, entryDate]);
  res.redirect("/home");
});

/* ========================================================
   ADD GYM LOG — INSERT INTO DATABASE
======================================================== */
app.post("/addGymLog", ensureLoggedIn, async (req, res) => {
  const { exercise, weight, reps, entryDate } = req.body;

  const sql = `
    INSERT INTO gym_logs (exercise, weight, reps, entryDate)
    VALUES (?, ?, ?, ?)
  `;

  await pool.query(sql, [exercise, weight, reps, entryDate]);
  res.redirect("/home");
});

/* ========================================================
   DEBUG: TEST DB CONNECTION
======================================================== */
app.get("/dbTest", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT NOW()");
    res.send(rows);
  } catch (err) {
    res.status(500).send("Database error");
  }
});

/* ========================================================
   START SERVER
======================================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Website is live at port: ${PORT}`);
});
