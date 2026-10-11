const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

// Categories available in the WanderLust filter bar.
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

const listingSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        image: {
            url: {
                type: String,
                default: ""
            },
            filename: {
                type: String,
                default: ""
            }
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        location: {
            type: String,
            required: true,
            trim: true
        },

        country: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            enum: listingCategories,
            default: "Trending",
            required: true
        },

        reviews: [
            {
                type: Schema.Types.ObjectId,
                ref: "Review"
            }
        ],

        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },

        geometry: {
            type: {
                type: String,
                enum: ["Point"],
                required: true
            },

            coordinates: {
                type: [Number],
                required: true
            }
        }
    },
    {
        timestamps: true
    }
);


// Delete associated reviews when a listing is deleted.
listingSchema.post("findOneAndDelete", async (listing) => {
    if (listing && listing.reviews.length > 0) {
        await Review.deleteMany({
            _id: {
                $in: listing.reviews
            }
        });
    }
});


const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;