import express from 'express';
import mysql from 'mysql2/promise';
import session from "express-session";
import bcrypt from 'bcrypt';


const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

//for Express to get values using POST method
app.use(express.urlencoded({extended:true}));

//setting up database connection pool
const pool = mysql.createPool({
    host: "k2fqe1if4c7uowsh.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "toszv1mikaqtn04s",
    password: "m35rbj01t9klhgh8",
    database: "g4ekc2ffehhxsjqq",
    connectionLimit: 10,
    waitForConnections: true
});
//routes
app.get('/', (req, res) => {
//    res.send('Hello Express app!')
res.render("login.ejs");
});


app.get('/login', (req, res) => {
//    res.send('Hello Express app!')
res.render("login.ejs");
});

app.get('/home', (req, res) => {
//    res.send('Hello Express app!')
res.render("home.ejs");
});




app.get("/dbTest", async(req, res) => {
   try {
        const [rows] = await pool.query("SELECT CURDATE()");
        res.send(rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});//dbTest

let port = 3000
app.listen(port, ()=>{
    console.log(`Website is live at port:${port}`);
})
