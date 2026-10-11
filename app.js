// ==================== ENVIRONMENT VARIABLES ====================

if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}


// ==================== DNS CONFIGURATION ====================

const dns = require("node:dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);


// ==================== IMPORTS ====================

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const flash = require("connect-flash");

const passport = require("passport");
const LocalStrategy = require("passport-local");

const ExpressError = require("./utils/ExpressError.js");

const listingRouter = require("./routes/listings.js");
const reviewRouter = require("./routes/reviews.js");
const userRouter = require("./routes/user.js");

const User = require("./models/user.js");


// ==================== APP CONFIGURATION ====================

const app = express();

const port = process.env.PORT || 3012;

app.engine("ejs", ejsMate);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));

app.use(methodOverride("_method"));

app.use(cookieParser());


// ==================== ENVIRONMENT VALIDATION ====================

const MONGO_URL = process.env.ATLASDB_URL;
const SESSION_SECRET = process.env.SECRET;

if (!MONGO_URL) {
    throw new Error("ATLASDB_URL is missing from environment variables.");
}

if (!SESSION_SECRET) {
    throw new Error("SECRET is missing from environment variables.");
}


// ==================== MONGODB SESSION STORE ====================

const mongoStore = MongoStore.create({
    mongoUrl: MONGO_URL,

    crypto: {
        secret: SESSION_SECRET
    },

    touchAfter: 24 * 3600
});

mongoStore.on("error", (err) => {
    console.error("Error in MongoDB session store:", err);
});


// ==================== EXPRESS SESSION ====================

if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

const sessionCount = session({
    store: mongoStore,

    secret: SESSION_SECRET,

    resave: false,

    saveUninitialized: true,

    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }
});

app.use(sessionCount);


// ==================== FLASH MESSAGES ====================

app.use(flash());


// ==================== PASSPORT AUTHENTICATION ====================

app.use(passport.initialize());

app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());

passport.deserializeUser(User.deserializeUser());


// ==================== RESPONSE LOCALS ====================

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;

    next();
});


// ==================== HOME ROUTE ====================

app.get("/", (req, res) => {
    res.render("listings/home.ejs");
});


// ==================== APPLICATION ROUTES ====================

app.use("/listings", listingRouter);

app.use("/listings/reviews", reviewRouter);

app.use("/", userRouter);


// ==================== 404 ERROR HANDLER ====================

app.all("/{*splat}", (req, res, next) => {
    next(new ExpressError(404, "Page not found!"));
});


// ==================== GLOBAL ERROR HANDLER ====================

app.use((err, req, res, next) => {
    const {
        statusCode = 500,
        message = "Something went wrong!"
    } = err;

    res.status(statusCode).render("listings/error.ejs", {
        message
    });
});


// ==================== DATABASE CONNECTION ====================

async function main() {
    await mongoose.connect(MONGO_URL);

    console.log("Connection Successful!");

    app.listen(port, () => {
        console.log("Welcome to the port:", port);
    });
}

main().catch((err) => {
    console.error("Failed to start the application:", err);
});