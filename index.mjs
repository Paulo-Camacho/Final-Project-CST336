import express from "express";
import mysql from "mysql2/promise";
import session from "express-session";
import "dotenv/config";

const app = express();

/* ================================
   SESSION SETUP
================================ */
app.use(
  session({
    secret: "superSecretKey123",
    resave: false,
    saveUninitialized: true,
  })
);

// Make session available in all EJS files
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

/* ================================
   APP + DATABASE CONFIG
================================ */
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// DB connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 10,
});

/* ================================
   ROUTES — LOGIN
================================ */
app.get("/", (req, res) => {
  res.render("login.ejs", { loginError: null });
});

app.get("/login", (req, res) => {
  res.render("login.ejs", { loginError: null });
});

app.post("/loginProcess", async (req, res) => {
  const { username, password } = req.body;

  try {
    const sql = "SELECT * FROM users WHERE username = ? LIMIT 1";
    const [rows] = await pool.query(sql, [username]);

    if (rows.length === 0) {
      return res.render("login.ejs", {
        loginError: "Invalid username or password",
      });
    }

    const user = rows[0];

    if (password !== user.password) {
      return res.render("login.ejs", {
        loginError: "Invalid username or password",
      });
    }

    // SUCCESS!
    req.session.authenticated = true;
    req.session.userId = user.userId;
    req.session.username = user.username;

    return res.redirect("/home");
  } catch (err) {
    console.error(err);
    return res.render("login.ejs", { loginError: "Server error" });
  }
});

/* ================================
   ROUTES — HOME DASHBOARD
================================ */
app.get("/home", async (req, res) => {
  if (!req.session.authenticated) return res.redirect("/login");

  try {
    // Get foods
    const [foods] = await pool.query(
      "SELECT * FROM foods WHERE userId = ? ORDER BY createdAt DESC",
      [req.session.userId]
    );

    // Get gym logs
    const [logs] = await pool.query(
      "SELECT * FROM gym_logs WHERE userId = ? ORDER BY createdAt DESC",
      [req.session.userId]
    );

    res.render("home.ejs", { foods, logs });
  } catch (err) {
    console.error(err);
    res.send("Database error loading dashboard.");
  }
});

/* ================================
   ADD FOOD
================================ */
app.post("/addFood", async (req, res) => {
  if (!req.session.authenticated) return res.redirect("/login");

  const { name, calories, protein, carbs, fat } = req.body;

  try {
    const sql = `
      INSERT INTO foods (userId, name, calories, protein, carbs, fat)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await pool.query(sql, [
      req.session.userId,
      name,
      calories || null,
      protein || null,
      carbs || null,
      fat || null,
    ]);

    res.redirect("/home");
  } catch (err) {
    console.error(err);
    res.send("Error adding food.");
  }
});

/* ================================
   ADD GYM LOG
================================ */
app.post("/addGymLog", async (req, res) => {
  if (!req.session.authenticated) return res.redirect("/login");

  const { exercise, weight, reps } = req.body;

  try {
    const sql = `
      INSERT INTO gym_logs (userId, exercise, weight, reps)
      VALUES (?, ?, ?, ?)
    `;

    await pool.query(sql, [
      req.session.userId,
      exercise,
      weight || null,
      reps || null,
    ]);

    res.redirect("/home");
  } catch (err) {
    console.error(err);
    res.send("Error adding gym log.");
  }
});

/* ================================
   START SERVER
================================ */
let port = 3000;
app.listen(port, () => {
  console.log(`Website is live at port ${port}`);
});
