const User = require("../models/user.js");

module.exports.renderSingupForm = (req, res) => {
    res.render("./user/signup.ejs");
}

module.exports.signUpUser = async (req, res) => {
    try {
        let { username, email, password } = req.body;
        const newUser = new User({ email, username });
        let registeredUser = await User.register(newUser, password);
        console.log(registeredUser);
        req.login(registeredUser, (err) => {
            if (err) {
                next(err);
            }
            req.flash("success", "Welcome to WanderLust!");
            res.redirect("/listings");
        });

    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }

}

module.exports.renderLoginForm = (req, res) => {
    res.render("./user/login");
}

module.exports.loginUser = async (req, res) => {
    req.flash("success", "Welcome back to WanderLust!");
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
}

module.exports.logOutUser = (req, res) => {
    req.logOut((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "You successfully logged out.");
        res.redirect("/");
    });
}