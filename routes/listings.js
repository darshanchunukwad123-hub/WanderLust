
const express = require("express");
const router = express.Router();

const wrapAsync = require("../utils/wrapAsync.js");

const {
    isLoggedIn,
    isOwner,
    validateListing
} = require("../middleware.js");

const listingController = require("../controllers/listings.js");

const multer = require("multer");
const { storage } = require("../cloudConfig.js");

const upload = multer({ storage });


// INDEX
router.get(
    "/",
    wrapAsync(listingController.index)
);


// AUTOCOMPLETE SUGGESTIONS
router.get(
    "/suggestions",
    wrapAsync(listingController.suggestions)
);


// NO RESULTS PAGE
router.get(
    "/no-results",
    wrapAsync(listingController.noResults)
);


// RENDER CREATE FORM
router.get(
    "/add",
    isLoggedIn,
    listingController.renderCreateForm
);


// CREATE LISTING
router.post(
    "/create",
    isLoggedIn,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.createNewListing)
);


// DELETE LISTING
router.delete(
    "/delete/:id",
    isLoggedIn,
    isOwner,
    wrapAsync(listingController.deleteListing)
);


// RENDER EDIT FORM
router.get(
    "/edit/:id",
    isLoggedIn,
    isOwner,
    wrapAsync(listingController.renderEditForm)
);


// UPDATE LISTING AND SHOW LISTING
router.route("/:id")

    .patch(
        isLoggedIn,
        isOwner,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(listingController.editListing)
    )

    .get(
        wrapAsync(listingController.showListing)
    );


module.exports = router;