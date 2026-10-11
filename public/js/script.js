

(() => {
    'use strict';

    // =========================================
    // BOOTSTRAP FORM VALIDATION
    // =========================================

    const forms = document.querySelectorAll('.needs-validation');

    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }

            form.classList.add('was-validated');
        }, false);
    });


    // =========================================
    // DESTINATION AUTOCOMPLETE
    // =========================================

    const searchInput = document.getElementById('destinationSearchInput');
    const suggestionsBox = document.getElementById('destinationSuggestions');
    const searchForm = document.getElementById('destinationSearchForm');

    if (!searchInput || !suggestionsBox || !searchForm) {
        return;
    }

    let debounceTimer;
    let activeRequest;
    let activeIndex = -1;
    let requestNumber = 0;

    function hideSuggestions() {
        suggestionsBox.style.display = 'none';
        searchInput.setAttribute('aria-expanded', 'false');
        searchInput.removeAttribute('aria-activedescendant');
        activeIndex = -1;
    }

    function showSuggestions() {
        suggestionsBox.style.display = 'block';
        searchInput.setAttribute('aria-expanded', 'true');
    }

    function showMessage(message) {
        suggestionsBox.replaceChildren();

        const item = document.createElement('div');

        item.className = 'list-group-item text-muted';
        item.textContent = message;

        suggestionsBox.appendChild(item);

        activeIndex = -1;
        showSuggestions();
    }

    function getSuggestionItems() {
        return Array.from(
            suggestionsBox.querySelectorAll('a[role="option"]')
        );
    }

    function setActiveSuggestion(index) {
        const items = getSuggestionItems();

        if (!items.length) {
            activeIndex = -1;
            return;
        }

        activeIndex = Math.max(0, Math.min(index, items.length - 1));

        items.forEach((item, itemIndex) => {
            const isActive = itemIndex === activeIndex;

            item.classList.toggle('active', isActive);
            item.setAttribute('aria-selected', String(isActive));
        });

        items[activeIndex].scrollIntoView({
            block: 'nearest'
        });

        searchInput.setAttribute(
            'aria-activedescendant',
            items[activeIndex].id
        );
    }

    function renderSuggestions(suggestions) {
        suggestionsBox.replaceChildren();
        activeIndex = -1;

        if (!suggestions.length) {
            showMessage('No destinations found.');
            return;
        }

        suggestions.forEach((suggestion, index) => {
            const link = document.createElement('a');

            link.href = suggestion.url;
            link.className = 'list-group-item list-group-item-action';
            link.setAttribute('role', 'option');
            link.setAttribute('aria-selected', 'false');
            link.id = `destination-suggestion-${index}`;

            // Suggestion title
            const title = document.createElement('div');
            title.className = 'd-flex justify-content-between align-items-center gap-2';

            const label = document.createElement('span');
            label.textContent = suggestion.label;

            const badge = document.createElement('span');
            badge.className = 'badge bg-light text-dark border';
            badge.textContent = suggestion.type || 'Destination';

            title.append(label, badge);
            link.appendChild(title);

            // Additional location details for listing suggestions
            if (suggestion.detail) {
                const detail = document.createElement('small');

                detail.className = 'text-muted d-block mt-1';
                detail.textContent = suggestion.detail;

                link.appendChild(detail);
            }

            // Keyboard and mouse navigation
            link.addEventListener('mouseenter', () => {
                setActiveSuggestion(index);
            });

            suggestionsBox.appendChild(link);
        });

        showSuggestions();
    }

    async function fetchSuggestions(query) {
        if (activeRequest) {
            activeRequest.abort();
        }

        const controller = new AbortController();
        activeRequest = controller;

        const currentRequest = ++requestNumber;

        showMessage('Searching destinations...');

        try {
            // Keep this URL free of spaces
            const url = '/listings/suggestions?q=' + encodeURIComponent(query);

            const response = await fetch(url, {
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const suggestions = await response.json();

            // Ignore stale results
            if (
                currentRequest !== requestNumber ||
                searchInput.value.trim() !== query
            ) {
                return;
            }

            renderSuggestions(
                Array.isArray(suggestions) ? suggestions : []
            );

        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }

            console.error('Autocomplete error:', error);

            if (currentRequest === requestNumber) {
                showMessage('Unable to load suggestions. Please try again.');
            }
        }
    }

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);

        if (activeRequest) {
            activeRequest.abort();
        }

        const query = searchInput.value.trim();

        if (query.length < 2) {
            requestNumber++;
            suggestionsBox.replaceChildren();
            hideSuggestions();
            return;
        }

        debounceTimer = setTimeout(() => {
            fetchSuggestions(query);
        }, 250);
    });

    // Keyboard navigation
    searchInput.addEventListener('keydown', event => {
        const items = getSuggestionItems();

        if (event.key === 'ArrowDown' && items.length) {
            event.preventDefault();

            if (suggestionsBox.style.display === 'none') {
                showSuggestions();
            }

            setActiveSuggestion(
                activeIndex === -1 ? 0 : activeIndex + 1
            );
        }

        if (event.key === 'ArrowUp' && items.length) {
            event.preventDefault();

            setActiveSuggestion(
                activeIndex === -1 ? items.length - 1 : activeIndex - 1
            );
        }

        if (event.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
            event.preventDefault();
            window.location.href = items[activeIndex].href;
        }

        if (event.key === 'Escape') {
            clearTimeout(debounceTimer);

            if (activeRequest) {
                activeRequest.abort();
            }

            hideSuggestions();
        }
    });

    // Close when clicking outside
    document.addEventListener('click', event => {
        if (
            !searchForm.contains(event.target) &&
            !suggestionsBox.contains(event.target)
        ) {
            hideSuggestions();
        }
    });

    // Close after submitting a normal search
    searchForm.addEventListener('submit', () => {
        hideSuggestions();
    });


    // =========================================
    // CATEGORY FILTERS
    // =========================================

    // Preserve the search query when a category is selected.
    // These elements are present on the listings page only.

    document.querySelectorAll('#filters .filter').forEach(filter => {
        filter.style.cursor = 'pointer';

        filter.addEventListener('click', () => {
            const categoryElement = filter.querySelector('p');

            if (!categoryElement) {
                return;
            }

            const category = categoryElement.textContent.trim();
            const params = new URLSearchParams(window.location.search);

            params.set('category', category);

            window.location.href = '/listings?' + params.toString();
        });
    });

})();