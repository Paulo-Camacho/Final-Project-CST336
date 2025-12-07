import express from 'express';
import mysql from 'mysql2/promise';
import session from 'express-session';
import bcrypt from 'bcrypt';
import "dotenv/config"; // Enviroment values

const app = express();


/////////////// This is middleware for express-session
app.use(
  session({
    secret: "superSecretKey123",
    resave: false,
    saveUninitialized: true,
  })
);

// Make session available in all EJS templates
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});
//////////////////////////////////////////////////

app.set('view engine', 'ejs');
app.use(express.static('public'));

//for Express to get values using POST method
app.use(express.urlencoded({ extended: true }));

//setting up database connection pool
const pool = mysql.createPool({
  /// NOTICE THIS NAMING CONVENTION TO RETRIEVE THE DATA FROM THE .env file that we made next to index.mjs
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 10,
  waitForConnections: true,
});
// ROUTES
app.get('/', (req, res) => {
  //    res.send('Hello Express app!')
  res.render('login.ejs');
});

app.get('/login', (req, res) => {
  res.render('login.ejs');
});

app.post('/loginProcess', async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Look up user
    const sql = 'SELECT * FROM users WHERE username = ? LIMIT 1';
    const [rows] = await pool.query(sql, [username]);

    if (rows.length === 0) {
      return res.render('login.ejs', {
        loginError: 'Invalid username or password',
      });
    }

    const user = rows[0];

    // 2. Check password
    if (password !== user.password) {
      return res.render('login.ejs', {
        loginError: 'Invalid username or password',
      });
    }

    // 3. SUCCESS — set session
    req.session.authenticated = true;
    req.session.username = user.username;

    // 4. Redirect to home
    return res.redirect('/home');
  } catch (err) {
    console.error(err);
    return res.render('login.ejs', { loginError: 'Server error' });
  }
});


// MIDDLEWARE
function ensureLoggedIn(req, res, next) {
  if (!req.session.authenticated) {
    return res.redirect('/login');
  }
  next();
}


// Passing ensuredLoggedIn middleware to make sure user is logged in during the session
app.get('/home' , ensureLoggedIn, (req, res) => {
  //    res.send('Hello Express app!')
  res.render('home.ejs');
});

app.get('/dbTest', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT CURDATE()');
    res.send(rows);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Database error!');
  }
}); //dbTest

let port = 3000;
app.listen(port, () => {
  console.log(`Website is live at port:${port}`);
});
