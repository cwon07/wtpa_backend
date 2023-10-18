// IMPORT DEPENDENCIES
require("dotenv").config();
const { PORT = 8000, DATABASE_URL } = process.env
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken")

// DATABASE CONNECTION
mongoose.connect(DATABASE_URL);
mongoose.connection
    .on("open", () => console.log("You are connected to mongoose"))
    .on("close", () => console.log("You are disconnected from mongoose"))
    .on("error", (error) => console.log(error));

// MODELS
const eventSchema = new mongoose.Schema({
    title: String,
    desc: String,
    imageUrl: String,
    date: String,
    time: String,
    location: String,
    rsvpDate: String,
    contactInfo: String,
    guests: String
});

const Events = mongoose.model("Events", eventSchema);

const rsvpSchema = new mongoose.Schema({
    name: String,
    adult: Number,
    children: Number
});

const Rsvp = mongoose.model("Rsvp", rsvpSchema);

const accountSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const Account = mongoose.model("Account", accountSchema);

// MIDDLEWARE
if(process.env.NODE_ENV === "production"){
    app.use(
        cors({
            origin: "https://wtpa-afd8c.web.app",
            credentials: true,
        })
    );
} else {
    app.use(
        cors({
            origin: "http://localhost:3000",
            credentials: true,
        })
    );
}

app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// CUSTOM AUTH MIDDLEWARE FUNDTION
async function authCheck(req, res, next){
    if(req.cookies.token){
        const payload = await jwt.verify(req.cookies.token, process.env.SECRET)
        req.payload = payload;
        next();
    } else {
        res.status(400).json({ error: "You are not authorized"});
    }
}

// ROUTES

// Index - GET - /events 
app.get("/events", authCheck, async (req, res) => {
    try {
        const events = await Events.find({});
        res.json(events);
    } catch (error) {
        res.status(400).json({error});
    }
});

// Create - POST - /events
app.post("/events", authCheck, async (req, res) => {
    try {
        const event = await Events.create(req.body);
        personalbar.username = req.payload.username;
        res.json(event);
    } catch (error) {
        res.status(400).json({error});
    }
});

// Show - GET - /events/:id
app.get("events/:id", async (req, res) => {
    try {
        const event = await Events.findById(req.params.id);
        res.json(event);
    } catch (error) {
        res.status(400).json({ error });
    }
});

// Update - PUT - /events/:id
app.put("events/:id", async (req, res) => {
    try {
        const event = await Events.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });
        res.json(event);
    } catch (error) {
        res.status(400).json({ error });
    }
});

// Destroy - DELETE - /events/:id
app.delete("events/:id", async (req, res) => {
    try {
        const event = await Events.findByIdAndDelete(req.params.id)
        res.status(204).json(event)
    } catch(error) {
        res.status(400).json({error})
    }
})

// Show - GET - /rsvp
app.get("/rsvp", async (req, res) => {
    try {
        const rsvp = await Rsvp.find({});
        res.json(rsvp);
    } catch (error) {
        res.status(400).json({ error });
    }
})

// AUTH ROUTES

// Show - GET - /account
app.get("/account", async (req, res) => {
    try {
        const account = await Account.find({});
        res.json(account);
    } catch (error) {
        res.status(400).json({ error });
    }
})

// /signup - POST
app.post("/signup", async (req, res) => {
    try {
        let { username, password } = req.body;
        password = await bcrypt.hash(password, await bcrypt.genSalt(10));
        const user = await User.create({ username, password });
        res.json(user);
    } catch(error) {
        res.status(400).json({error})
    }
})

// /login - POST
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        console.log(user)
        if (!user) {
            throw new Error("No user with that username found");
        }
        console.log(password, user)
        const passwordCheck = await bcrypt.compare(password, user.password);
        if (!passwordCheck) {
            throw new Error("Password does not match the record");
        }
        const token = jwt.sign({ username: user.username }, process.env.SECRET);
        if(process.env.NODE_ENV === "production"){
            res.cookie("token", token, {
                httpOnly: true,
                path: "/",
                secure: true,
                sameSite: "none",
                masAge: 3600000
            });
        } else {
            res.cookie("token", token, {
                httpOnly: true,
                path: "/",
                domain: "localhost",
                secure: false,
                sameSite: "lax",
                maxAge: 3600000
            })
        }
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// /cookietest - GET
app.get("/cookietest", (req, res) => {
    res.json(req.cookies);
})

// /logout - GET
app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "You have been logged out"});
})


// LISTENER

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
