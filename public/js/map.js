
// ============================================
// WanderLust - Mapbox Listing Map
// ============================================

// 1. Configure Mapbox
mapboxgl.accessToken = mapToken;

const coordinates = listing.geometry.coordinates;

// Validate listing coordinates before initializing the map
if (
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    !coordinates.every(Number.isFinite)
) {
    throw new Error("Invalid listing coordinates. Expected [longitude, latitude].");
}

// 2. Initialize the map
const map = new mapboxgl.Map({
    container: "map",
    center: coordinates,
    zoom: 9,
    attributionControl: true
});

// Add navigation controls
map.addControl(
    new mapboxgl.NavigationControl(),
    "top-right"
);

// 3. Create the custom marker element
const markerElement = document.createElement("button");

markerElement.type = "button";
markerElement.className = "wanderlust-marker";
markerElement.setAttribute("aria-label", `View ${listing.title} on the map`);
markerElement.setAttribute("aria-expanded", "false");

// Normal pin and selected logo are separate elements.
// We never replace Mapbox's internal SVG.
markerElement.innerHTML = `
    <span class="marker-pin" aria-hidden="true">
        <svg viewBox="0 0 32 42" focusable="false">
            <path
                d="M16 1C7.7 1 1 7.7 1 16c0 11 15 25 15 25s15-14 15-25C31 7.7 24.3 1 16 1Z"
                fill="currentColor"
                stroke="#ffffff"
                stroke-width="2"
            />
            <circle
                cx="16"
                cy="16"
                r="5"
                fill="#ffffff"
            />
        </svg>
    </span>

    <span class="marker-logo" aria-hidden="true">
        <i class="fa-solid fa-compass-drafting"></i>
    </span>
`;

// 4. Create the popup
const popupContent = document.createElement("div");
popupContent.className = "wanderlust-popup";

const popupTitle = document.createElement("h3");
popupTitle.className = "wanderlust-popup-title";
popupTitle.textContent = listing.title;

const popupDescription = document.createElement("p");
popupDescription.className = "wanderlust-popup-description";
popupDescription.textContent =
    "Exact location will be provided after booking.";

popupContent.append(popupTitle, popupDescription);

const popup = new mapboxgl.Popup({
    offset: 24,
    closeButton: true,
    closeOnClick: true,
    maxWidth: "300px",
    className: "wanderlust-map-popup"
}).setDOMContent(popupContent);

// 5. Create and add the custom marker
const marker = new mapboxgl.Marker({
    element: markerElement,
    anchor: "bottom"
})
    .setLngLat(coordinates)
    .setPopup(popup)
    .addTo(map);

// 6. Synchronize marker appearance with popup state
function setMarkerActive(isActive) {
    markerElement.classList.toggle("is-active", isActive);
    markerElement.setAttribute("aria-expanded", String(isActive));
}

popup.on("open", () => {
    setMarkerActive(true);
});

popup.on("close", () => {
    setMarkerActive(false);
});

// 7. Keep the marker's visual state consistent when clicked
markerElement.addEventListener("click", () => {
    // Mapbox's attached popup handles opening and closing.
    // The popup events above control the marker appearance.
});

// 8. Resize the map after initialization
map.once("load", () => {
    map.resize();
});

