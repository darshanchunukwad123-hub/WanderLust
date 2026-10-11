
const Listing = require("../models/listing.js");
const mbxGeoCoding = require("@mapbox/mapbox-sdk/services/geocoding");

const mapToken = process.env.MAP_TOKEN;

const geoCodingClient = mbxGeoCoding({
    accessToken: mapToken
});

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


// INDEX: Display listings, search results, and category filters
module.exports.index = async (req, res) => {
    const search = typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const category = typeof req.query.category === "string"
        ? req.query.category.trim()
        : "";

    const validCategory = listingCategories.includes(category)
        ? category
        : "";

    const filter = {};

    // Search by title, description, location, or country
    if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        filter.$or = [
            { title: { $regex: escapedSearch, $options: "i" } },
            { description: { $regex: escapedSearch, $options: "i" } },
            { location: { $regex: escapedSearch, $options: "i" } },
            { country: { $regex: escapedSearch, $options: "i" } }
        ];
    }

    // Apply category filter
    if (validCategory) {
        filter.category = validCategory;
    }

    const allListings = await Listing.find(filter)
        .populate("owner")
        .sort({ createdAt: -1 });

    // Redirect to the dedicated no-results page when appropriate
    if (
        allListings.length === 0 &&
        (search || validCategory)
    ) {
        const params = new URLSearchParams();

        if (search) {
            params.set("search", search);
        }

        if (validCategory) {
            params.set("category", validCategory);
        }

        return res.redirect(`/listings/no-results?${params.toString()}`);
    }

    res.render("listings/index.ejs", {
        allListings,
        search,
        selectedCategory: validCategory
    });
};


// AUTOCOMPLETE: Suggest destinations and listing titles
module.exports.suggestions = async (req, res) => {
    const query = typeof req.query.q === "string"
        ? req.query.q.trim()
        : "";

    if (query.length < 2) {
        return res.json([]);
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedQuery, "i");

    const listings = await Listing.find({
        $or: [
            { title: regex },
            { location: regex },
            { country: regex }
        ]
    })
        .select("title location country")
        .sort({ title: 1 })
        .limit(100)
        .lean();

    const destinations = new Map();
    const propertySuggestions = new Map();

    const lowerQuery = query.toLowerCase();

    for (const listing of listings) {
        const location = listing.location || "";
        const country = listing.country || "";
        const title = listing.title || "";

        const locationMatches = location.toLowerCase().includes(lowerQuery);
        const countryMatches = country.toLowerCase().includes(lowerQuery);
        const titleMatches = title.toLowerCase().includes(lowerQuery);

        // Destination suggestions
        if (location && (locationMatches || countryMatches)) {
            const label = [location, country]
                .filter(Boolean)
                .join(", ");

            if (!destinations.has(label)) {
                // Searching a country should search the country,
                // while searching a location should search the location.
                const searchTerm = locationMatches ? location : country;

                destinations.set(label, {
                    label,
                    type: "Destination",
                    url: `/listings?search=${encodeURIComponent(searchTerm)}`
                });
            }
        }

        // Individual listing suggestions
        if (titleMatches) {
            const key = `listing:${listing._id}`;

            if (!propertySuggestions.has(key)) {
                propertySuggestions.set(key, {
                    label: title,
                    detail: [location, country].filter(Boolean).join(", "),
                    type: "Listing",
                    url: `/listings?search=${encodeURIComponent(title)}`
                });
            }
        }
    }

    // Show destination suggestions first, followed by individual properties
    const results = [
        ...destinations.values(),
        ...propertySuggestions.values()
    ].slice(0, 8);

    res.json(results);
};


// NO RESULTS PAGE
module.exports.noResults = async (req, res) => {
    const search = typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const category = typeof req.query.category === "string"
        ? req.query.category.trim()
        : "";

    // Show some alternatives so the page isn't a dead end
    const suggestedListings = await Listing.find({})
        .sort({ createdAt: -1 })
        .limit(4)
        .lean();

    res.render("listings/noResults.ejs", {
        search,
        category,
        suggestedListings
    });
};


// RENDER CREATE FORM
module.exports.renderCreateForm = (req, res) => {
    res.render("listings/create.ejs");
};


// CREATE LISTING
module.exports.createNewListing = async (req, res) => {
    const { listing } = req.body;

    if (!req.file) {
        req.flash("error", "Please upload a listing image.");
        return res.redirect("/listings/add");
    }

    const response = await geoCodingClient.forwardGeocode({
        query: `${listing.location}, ${listing.country}`,
        limit: 1
    }).send();

    const feature = response.body.features[0];

    if (!feature) {
        req.flash(
            "error",
            "We couldn't find that location. Please enter a valid city or location."
        );

        return res.redirect("/listings/add");
    }

    const newListing = new Listing(listing);

    newListing.owner = req.user._id;

    newListing.image = {
        url: req.file.path,
        filename: req.file.filename
    };

    newListing.geometry = feature.geometry;

    await newListing.save();

    req.flash("success", "Your new listing has been created!");
    res.redirect("/listings");
};


// RENDER EDIT FORM
module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "The listing you requested no longer exists.");
        return res.redirect("/listings");
    }

    const ogImageUrl = listing.image?.url || "";

    res.render("listings/edit.ejs", {
        listing,
        ogImageUrl
    });
};


// UPDATE LISTING
module.exports.editListing = async (req, res) => {
    const { id } = req.params;
    const { listing } = req.body;

    const existingListing = await Listing.findById(id);

    if (!existingListing) {
        req.flash("error", "The listing you requested no longer exists.");
        return res.redirect("/listings");
    }

    Object.assign(existingListing, {
        title: listing.title,
        description: listing.description,
        price: listing.price,
        location: listing.location,
        country: listing.country,
        category: listing.category || "Trending"
    });

    if (req.file) {
        existingListing.image = {
            url: req.file.path,
            filename: req.file.filename
        };
    }

    if (
        existingListing.isModified("location") ||
        existingListing.isModified("country") ||
        !existingListing.geometry
    ) {
        const response = await geoCodingClient.forwardGeocode({
            query: `${existingListing.location}, ${existingListing.country}`,
            limit: 1
        }).send();

        const feature = response.body.features[0];

        if (!feature) {
            req.flash(
                "error",
                "We couldn't find that location. Please enter a valid city or location."
            );

            return res.redirect(`/listings/edit/${id}`);
        }

        existingListing.geometry = feature.geometry;
    }

    await existingListing.save();

    req.flash("success", "Your listing has been updated successfully!");
    res.redirect(`/listings/${id}`);
};


// DELETE LISTING
module.exports.deleteListing = async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findByIdAndDelete(id);

    if (!listing) {
        req.flash("error", "The listing you requested no longer exists.");
        return res.redirect("/listings");
    }

    req.flash("success", "Your listing has been deleted successfully!");
    res.redirect("/listings");
};


// SHOW LISTING
module.exports.showListing = async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author"
            }
        })
        .populate("owner");

    if (!listing) {
        req.flash("error", "The listing you requested no longer exists.");
        return res.redirect("/listings");
    }

    res.render("listings/show.ejs", {
        listing
    });
};