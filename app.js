// Your live published Google Sheets CSV Link
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR8ZNCupe7kluMFUV3MfdGz3iTqOHOL1LNH_A6yqqOlcBzPUvDkihajsOM9NdaRDnV4A8qQHnZNxAih/pub?gid=0&single=true&output=csv';

let allStartups = [];

// Initialize the app
window.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupEventListeners();
});

// Fetch Data from Google Sheets using PapaParse
function fetchData() {
    Papa.parse(SHEET_CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            allStartups = results.data;
            populateFilterOptions();
            renderDirectory(allStartups);
        },
        error: function(err) {
            document.getElementById('directory-grid').innerHTML = 
                `<div class="loading-state">Error loading data. Please double check your Google Sheets CSV link configuration.</div>`;
            console.error(err);
        }
    });
}

// Automatically populate the dropdown filters with unique values from the sheet
function populateFilterOptions() {
    const sectors = new Set();
    const cities = new Set();

    allStartups.forEach(item => {
        if (item.sector) sectors.add(item.sector.trim());
        if (item.city) cities.add(item.city.trim());
    });

    const sectorFilter = document.getElementById('sector-filter');
    const cityFilter = document.getElementById('city-filter');

    sectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector;
        option.textContent = sector;
        sectorFilter.appendChild(option);
    });

    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        cityFilter.appendChild(option);
    });
}

// Render the Startup cards to the grid container
function renderDirectory(data) {
    const grid = document.getElementById('directory-grid');
    grid.innerHTML = '';

    if (data.length === 0) {
        grid.innerHTML = '<div class="loading-state">No startups match your search criteria.</div>';
        return;
    }

    data.forEach(startup => {
        const card = document.createElement('div');
        card.className = 'startup-card';

        card.innerHTML = `
            <div>
                <div class="card-header">
                    <img class="card-logo" src="${startup.logo_url || 'https://via.placeholder.com/50'}" alt="${startup.name} logo" onerror="this.src='https://via.placeholder.com/50';">
                    <div class="card-title-area">
                        <h2>${startup.name}</h2>
                        <div class="card-badges">
                            <span class="badge badge-sector">${startup.sector}</span>
                            <span class="badge badge-stage">${startup.funding_stage}</span>
                            <span class="badge badge-city">${startup.city}</span>
                        </div>
                    </div>
                </div>
                <p class="card-description">${startup.description}</p>
                <div class="meta-info">
                    <p><strong>Founders:</strong> ${startup.founders}</p>
                    <p><strong>Total Funding:</strong> ${startup.total_funding || 'N/A'}</p>
                </div>
            </div>
            <div>
                <!-- News section with a temporary loading message -->
                <div class="news-section">
                    <div class="news-title">Latest Mention</div>
                    <div class="news-list" id="news-${startup.id}">
                        <span class="no-news">Loading mentions...</span>
                    </div>
                </div>
                <a href="${startup.website}" target="_blank" rel="noopener" class="visit-btn">Visit Website</a>
            </div>
        `;

        grid.appendChild(card);

        // Fetch dynamic news for this startup (from Phase 4 setup)
        fetchLatestNews(startup.name, startup.id);
    });
}

// Phase 4: Google News RSS Fetcher via a Free RSS to JSON Proxy
async function fetchLatestNews(startupName, startupId) {
    const newsContainer = document.getElementById(`news-${startupId}`);
    
    try {
        // 1. Create a query specific to the startup
        const searchPhrase = `${startupName} startup`;
        const rssFeedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchPhrase)}&hl=en-IN&gl=IN&ceid=IN:en`;
        
        // 2. Wrap Google News XML feed into a JSON request using a free rss2json.com tier URL
        const rss2JsonApi = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssFeedUrl)}`;
        
        const response = await fetch(rss2JsonApi);
        const data = await response.json();

        if (data.status === 'ok' && data.items && data.items.length > 0) {
            // Take the 2 most recent news articles
            const articles = data.items.slice(0, 2);
            
            newsContainer.innerHTML = articles.map(article => `
                <div class="news-item">
                    <a href="${article.link}" target="_blank" rel="noopener">${article.title}</a>
                </div>
            `).join('');
        } else {
            newsContainer.innerHTML = '<span class="no-news">No recent news mentions found.</span>';
        }
    } catch (error) {
        console.error(`Error fetching news for ${startupName}:`, error);
        newsContainer.innerHTML = '<span class="no-news">Unable to fetch current news.</span>';
    }
}

// Setup Event Listeners for search & filters
function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const sectorFilter = document.getElementById('sector-filter');
    const cityFilter = document.getElementById('city-filter');

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedSector = sectorFilter.value;
        const selectedCity = cityFilter.value;

        const filtered = allStartups.filter(startup => {
            const matchesSearch = 
                startup.name.toLowerCase().includes(searchTerm) ||
                startup.description.toLowerCase().includes(searchTerm) ||
                startup.founders.toLowerCase().includes(searchTerm);
            
            const matchesSector = !selectedSector || startup.sector === selectedSector;
            const matchesCity = !selectedCity || startup.city === selectedCity;

            return matchesSearch && matchesSector && matchesCity;
        });

        renderDirectory(filtered);
    }

    searchInput.addEventListener('input', applyFilters);
    sectorFilter.addEventListener('change', applyFilters);
    cityFilter.addEventListener('change', applyFilters);
}