const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingjoiSchema, reviewSchema } = require("./joi.js");


/* =========================================
   1. AUTHENTICATION
========================================= */

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        if (req.method === "GET") {
            req.session.redirectUrl = req.originalUrl;
        }

        req.flash("error", "You must be logged in to continue.");
        return res.redirect("/login");
    }

    next();
};


/* =========================================
   2. LISTING VALIDATION
========================================= */

module.exports.validateListing = (req, res, next) => {
    const { error, value } = listingjoiSchema.validate(req.body, {
        abortEarly: false,
        convert: true
    });

    if (error) {
        const errorMessage = error.details
            .map((detail) => detail.message)
            .join(", ");

        throw new ExpressError(400, errorMessage);
    }

    // Apply Joi defaults and normalized values.
    req.body = value;

    next();
};


/* =========================================
   3. REVIEW VALIDATION
========================================= */

module.exports.validateReview = (req, res, next) => {
    const { error, value } = reviewSchema.validate(req.body, {
        abortEarly: false,
        convert: true
    });

    if (error) {
        const errorMessage = error.details
            .map((detail) => detail.message)
            .join(", ");

        throw new ExpressError(400, errorMessage);
    }

    req.body = value;

    next();
};


/* =========================================
   4. PRESERVE REDIRECT URL
========================================= */

module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }

    next();
};


/* =========================================
   5. LISTING OWNERSHIP
========================================= */

module.exports.isOwner = async (req, res, next) => {
    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "The listing you requested no longer exists.");
        return res.redirect("/listings");
    }

    if (
        !res.locals.currUser ||
        !listing.owner ||
        listing.owner.toString() !== res.locals.currUser._id.toString()
    ) {
        req.flash("error", "You do not have permission to modify this listing.");
        return res.redirect(`/listings/${id}`);
    }

    next();
};


/* =========================================
   6. REVIEW AUTHORSHIP
========================================= */

module.exports.isReviewAuthor = async (req, res, next) => {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);

    if (!review) {
        req.flash("error", "The review you requested no longer exists.");
        return res.redirect("/listings");
    }

    if (
        !res.locals.currUser ||
        !review.author ||
        review.author.toString() !== res.locals.currUser._id.toString()
    ) {
        req.flash("error", "You do not have permission to modify this review.");
        return res.redirect("/listings");
    }

    next();
};