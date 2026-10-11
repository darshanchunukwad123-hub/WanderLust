const dns = require("node:dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../.env")
});

const mongoose = require("mongoose");
const initData = require("./data.js");

const Listing = require("../models/listing.js");
const User = require("../models/user.js");

const MONGO_URL =
    process.env.ATLASDB_URL ||
    process.env.MONGO_URL ||
    process.env.MONGO_URI;

const categories = [
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

function getCategory(listing) {
    const text =
        `${listing.title} ${listing.description} ${listing.location} `
            .toLowerCase();

    if (/beach|coast|island|ocean|sea\b/.test(text)) {
        return "Beach";
    }

    if (/cabin|forest|woods|treehouse/.test(text)) {
        return "Cabins";
    }

    if (/pool|swimming/.test(text)) {
        return "Amazing pools";
    }

    if (/lake|lakeside/.test(text)) {
        return "Lakefronts";
    }

    if (/mountain|hilltop|hillside|ski/.test(text)) {
        return "Mountain cities";
    }

    if (/arctic|alaska|igloo|snow|ice/.test(text)) {
        return "Arctic places";
    }

    if (/view|panorama|panoramic/.test(text)) {
        return "Amazing views";
    }

    if (/room|apartment|suite|loft|penthouse/.test(text)) {
        return "Rooms";
    }

    if (/city|downtown|tokyo|new york|boston|miami/.test(text)) {
        return "Iconic cities";
    }

    return "Trending";
}

async function getCoordinates(location, country) {
    const token = process.env.MAP_TOKEN;

    if (!token) {
        throw new Error(
            "MAP_TOKEN is missing from your root .env file."
        );
    }

    const place = encodeURIComponent(`${location}, ${country} `);

    const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${place}.json` +
        `?access_token=${token}&limit=1`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Mapbox request failed for ${location}, ${country}. ` +
            `Status: ${response.status}`
        );
    }

    const result = await response.json();

    if (!result.features || result.features.length === 0) {
        throw new Error(
            `No coordinates found for ${location}, ${country}.`
        );
    }

    return result.features[0].center;
}

async function initDb() {
    if (!MONGO_URL) {
        throw new Error(
            "MongoDB URL not found. Add ATLASDB_URL or MONGO_URL " +
            "to the .env file in your project root."
        );
    }

    await mongoose.connect(MONGO_URL);

    console.log("Connected to MongoDB!");

    const owner = process.env.SEED_OWNER_ID
        ? await User.findById(process.env.SEED_OWNER_ID)
        : await User.findOne();

    if (!owner) {
        throw new Error(
            "No user found in this database. Register an account first, " +
            "or set SEED_OWNER_ID to an existing user's ID."
        );
    }

    let added = 0;
    let skipped = 0;

    for (const obj of initData.data) {
        const existingListing = await Listing.findOne({
            title: obj.title,
            location: obj.location,
            country: obj.country
        });

        if (existingListing) {
            skipped++;
            continue;
        }

        const coordinates = await getCoordinates(
            obj.location,
            obj.country
        );

        const listingData = {
            ...obj,
            owner: owner._id,
            category: obj.category || getCategory(obj),
            geometry: {
                type: "Point",
                coordinates: coordinates
            }
        };

        await Listing.create(listingData);

        added++;

        console.log(`Added: ${obj.title}`);
    }

    console.log("\nSeeding completed!");
    console.log(`Listings added: ${added}`);
    console.log(`Listings skipped: ${skipped}`);
}

initDb()
    .catch((err) => {
        console.error("Seeding failed:", err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });

