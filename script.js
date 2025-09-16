// script.js (fixed & defensive)
const API_KEY = "523991b5"; // your OMDb API key

async function safeFetch(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Network error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Fetch failed', err);
    return null;
  }
}

function getEl(id) { return document.getElementById(id); }

/* SEARCH */
async function searchMovies() {
  const input = getEl('searchInput');
  const query = input ? input.value.trim() : '';
  if (!query) return;
  const container = getEl('movies');
  if (!container) return;
  container.innerHTML = '';
  const data = await safeFetch(`https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(query)}`);
  if (!data) { container.innerHTML = '<p style="text-align:center">Network error</p>'; return; }
  if (data.Response === "True") renderMovies(data.Search, container);
  else container.innerHTML = `<p style="text-align:center">${data.Error || 'No results found.'}</p>`;
}

/* RENDER MOVIES WITH POPUP */
function renderMovies(movies, container) {
  if (!container || !Array.isArray(movies)) return;
  movies.forEach(movie => {
    const div = document.createElement('div');
    div.className = 'movie';
    div.innerHTML = `
      <img src="${movie.Poster !== "N/A" ? movie.Poster : 'https://via.placeholder.com/200x270'}" alt="${movie.Title}">
      <h3>${movie.Title}</h3>
      <p>${movie.Year}</p>
    `;
    div.addEventListener('click', () => showDetails(movie.imdbID));
    container.appendChild(div);
  });
}

/* DETAILS MODAL */
async function showDetails(imdbID) {
  if (!imdbID) return;
  const modal = document.getElementById('movieModal');
  const modalBody = document.getElementById('modalBody');
  if (!modal || !modalBody) return;
  modalBody.innerHTML = '<p>Loading...</p>';
  modal.style.display = 'flex';
  const data = await safeFetch(`https://www.omdbapi.com/?apikey=${API_KEY}&i=${imdbID}&plot=full`);
  if (!data) { modalBody.innerHTML = '<p>Error loading details.</p>'; return; }
  if (data.Response === "True") {
    modalBody.innerHTML = `
      <span class="close-btn" onclick="closeModal()">&times;</span>
      <h2>${data.Title} (${data.Year})</h2>
      <p><strong>Genre:</strong> ${data.Genre}</p>
      <p><strong>Runtime:</strong> ${data.Runtime}</p>
      <p><strong>Director:</strong> ${data.Director}</p>
      <p><strong>Actors:</strong> ${data.Actors}</p>
      <p><strong>Plot:</strong> ${data.Plot}</p>
      <h3>Ratings:</h3>
      <ul>
        ${data.Ratings && data.Ratings.length ? data.Ratings.map(r => `<li>${r.Source}: ${r.Value}</li>`).join('') : '<li>No ratings available</li>'}
      </ul>
      <button class="favorite-btn" onclick="toggleFavorite(${JSON.stringify(data).replace(/"/g, '&quot;')})">
        ${isFavorite(data) ? 'Remove from Favorites' : 'Add to Favorites'}
      </button>
      <a href="https://www.imdb.com/title/${data.imdbID}" target="_blank" style="color:#60a5fa">View on IMDb</a>
    `;
  } else {
    modalBody.innerHTML = `<p>${data.Error || 'No details found.'}</p>`;
  }
}

function closeModal() {
  const modal = document.getElementById('movieModal');
  if (modal) modal.style.display = 'none';
}

/* RECOMMENDED */
async function loadRecommended() {
  const container = getEl('recommended');
  if (!container) return;
  container.innerHTML = '';
  const keywords = ["Avengers","Batman","Frozen","Inception","Black Panther","Spiderman"];
  for (const k of keywords) {
    const data = await safeFetch(`https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(k)}`);
    if (data && data.Response === "True") renderMovies(data.Search.slice(0,6), container);
  }
}

/* LATEST DROPS */
async function loadLatest() {
  const container = getEl('latest');
  if (!container) return;
  container.innerHTML = '';
  const year = new Date().getFullYear();
  for (const y of [year, year - 1]) {
    // using 'the' as a common search term to return many titles for that year
    const data = await safeFetch(`https://www.omdbapi.com/?apikey=${API_KEY}&s=the&y=${y}&type=movie`);
    if (data && data.Response === "True") renderMovies(data.Search.slice(0,12), container);
  }
}

/* NEWS (placeholder pulling a few items) */
async function loadNews() {
  const container = getEl('news');
  if (!container) return;
  container.innerHTML = '';
  const topics = ['Hollywood','Netflix','Marvel'];
  for (const t of topics) {
    const data = await safeFetch(`https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(t)}`);
    if (data && data.Response === "True") renderMovies(data.Search.slice(0,3), container);
  }
}

/* FAVORITES */
function toggleFavorite(movie) {
  const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  const index = favorites.findIndex(f => f.imdbID === movie.imdbID);
  if (index > -1) {
    favorites.splice(index, 1); // Remove from favorites
  } else {
    favorites.push(movie); // Add to favorites
  }
  localStorage.setItem('favorites', JSON.stringify(favorites));
  updateFavoriteButtons();
  loadFavorites();
}

function updateFavoriteButtons() {
  const favoriteButtons = document.querySelectorAll('.favorite-btn');
  favoriteButtons.forEach(button => {
    const movie = JSON.parse(button.dataset.movie);
    if (isFavorite(movie)) {
      button.textContent = 'Remove from Favorites';
      button.classList.add('favorited');
    } else {
      button.textContent = 'Add to Favorites';
      button.classList.remove('favorited');
    }
  });
}

function isFavorite(movie) {
  const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  return favorites.some(f => f.imdbID === movie.imdbID);
}

function loadFavorites() {
  const container = getEl('favorites');
  if (!container) return;
  const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  container.innerHTML = '';
  if (favorites.length > 0) {
    renderMovies(favorites, container);
  } else {
    container.innerHTML = '<p style="text-align:center">No favorites added yet.</p>';
  }
}

// Ensure favorites are loaded on the favorites page
document.addEventListener('DOMContentLoaded', () => {
  // Initialize sections
  loadLatest();
  loadRecommended();
  loadNews();

  // Hook up the search button
  const searchBtn = document.querySelector('.search-container button') || document.querySelector('button[onclick="searchMovies()"]');
  if (searchBtn) searchBtn.addEventListener('click', searchMovies);

  // Clear search button
  const clearBtn = document.querySelector('.search-container button:nth-child(2)');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const input = getEl('searchInput');
      if (input) input.value = '';
      const resultsSection = document.getElementById('searchResultsSection');
      if (resultsSection) resultsSection.style.display = 'none';
    });
  }

  // Ensure search results section is hidden initially
  const resultsSection = document.getElementById('searchResultsSection');
  if (resultsSection) {
    resultsSection.style.display = 'none';
  }

  // load favorites on favorites page
  if (getEl('favorites')) {
    loadFavorites();
  }

  // Remove any initial popup
  removeInitialPopup();
});
