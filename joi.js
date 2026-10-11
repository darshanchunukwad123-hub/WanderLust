const Joi = require("joi");

// Categories supported by the WanderLust listing system.
const listingCategories = [
    "Trending",
    "Rooms",
    "Amazing views",
    "Iconic cities",
    "Beach",
    "Cabins",
    "OMG!",
    "Amazing pools",
    "Lakefronts",
    "Mountain cities",
    "Arctic places"
];


// ==================== LISTING VALIDATION ====================

module.exports.listingjoiSchema = Joi.object({
    listing: Joi.object({
        title: Joi.string()
            .trim()
            .required(),

        description: Joi.string()
            .trim()
            .required(),

        price: Joi.number()
            .required()
            .min(0),

        country: Joi.string()
            .trim()
            .required(),

        location: Joi.string()
            .trim()
            .required(),

        category: Joi.string()
            .valid(...listingCategories)
            .default("Trending")
            .required(),

        image: Joi.object({
            url: Joi.string().allow("", null),
            filename: Joi.string().allow("", null)
        }).allow(null)
    }).required()
});


// ==================== REVIEW VALIDATION ====================

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number()
            .required()
            .min(1)
            .max(5),

        comment: Joi.string()
            .trim()
            .required()
    }).required()
});