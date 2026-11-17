// 1. Get a free API key at https://www.themoviedb.org/settings/api
const API_KEY = "YOUR_TMDB_API_KEY";

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

const $ = (sel) => document.querySelector(sel);
const grid = $("#grid"), status = $("#status"), moreBtn = $("#more"), heading = $("#heading");

const TITLES = {
  trending: "Trending This Week",
  popular: "Popular Movies",
  top_rated: "Top Rated Movies",
  upcoming: "Upcoming Movies",
};
const ENDPOINTS = {
  trending: "/trending/movie/week",
  popular: "/movie/popular",
  top_rated: "/movie/top_rated",
  upcoming: "/movie/upcoming",
};

const state = { mode: "trending", query: "", page: 1, totalPages: 1 };

// Fetch helper
async function api(path, params = {}) {
  const qs = new URLSearchParams({ api_key: API_KEY, language: "en-US", ...params });
  const res = await fetch(`${BASE}${path}?${qs}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

// Escape text so API data can't inject HTML
function esc(str = "") {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function cardHTML(m) {
  const year = (m.release_date || "").slice(0, 4) || "—";
  const poster = m.poster_path ? IMG + m.poster_path : "";
  return `
    <article class="card" data-id="${m.id}">
      <img src="${poster}" alt="${esc(m.title)} poster" loading="lazy" />
      <div class="info">
        <strong>${esc(m.title)}</strong>
        <div class="meta"><span>${year}</span><span class="rating">★ ${m.vote_average.toFixed(1)}</span></div>
      </div>
    </article>`;
}

// Load a page of movies (replace = true starts a fresh list)
async function load(replace = true) {
  if (replace) { state.page = 1; grid.innerHTML = ""; }
  status.textContent = "Loading...";
  moreBtn.hidden = true;
  try {
    const data = state.query
      ? await api("/search/movie", { query: state.query, page: state.page })
      : await api(ENDPOINTS[state.mode], { page: state.page });

    state.totalPages = data.total_pages;
    grid.insertAdjacentHTML("beforeend", data.results.map(cardHTML).join(""));
    status.textContent = grid.children.length ? "" : "No movies found.";
    moreBtn.hidden = state.page >= state.totalPages;
  } catch (err) {
    status.textContent = "Something went wrong. Check your API key and connection.";
    console.error(err);
  }
}

// Tabs
$("#tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  state.mode = btn.dataset.mode;
  state.query = "";
  $("#search").value = "";
  heading.textContent = TITLES[state.mode];
  load();
});

// Search (debounced)
let timer;
$("#search").addEventListener("input", (e) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    state.query = e.target.value.trim();
    heading.textContent = state.query ? `Results for "${state.query}"` : TITLES[state.mode];
    load();
  }, 400);
});

// Load more
moreBtn.addEventListener("click", () => { state.page++; load(false); });

// Details modal
const modal = $("#modal"), modalBody = $("#modal-body");

grid.addEventListener("click", async (e) => {
  const card = e.target.closest(".card");
  if (!card) return;
  modal.hidden = false;
  modalBody.innerHTML = "<p>Loading...</p>";
  try {
    const m = await api(`/movie/${card.dataset.id}`, { append_to_response: "videos" });
    const trailer = m.videos.results.find((v) => v.site === "YouTube" && v.type === "Trailer");
    modalBody.innerHTML = `
      <div class="detail">
        ${m.poster_path ? `<img src="${IMG + m.poster_path}" alt="" />` : ""}
        <div class="text">
          <h2>${esc(m.title)}</h2>
          <p>${(m.release_date || "").slice(0, 4)} • ${m.runtime || "?"} min • <span class="rating">★ ${m.vote_average.toFixed(1)}</span></p>
          <p>${m.genres.map((g) => esc(g.name)).join(", ")}</p>
          <p>${esc(m.overview) || "No overview available."}</p>
        </div>
      </div>
      ${trailer ? `<div class="trailer"><iframe src="https://www.youtube.com/embed/${trailer.key}" allowfullscreen></iframe></div>` : ""}`;
  } catch (err) {
    modalBody.innerHTML = "<p>Could not load details.</p>";
  }
});

function closeModal() { modal.hidden = true; modalBody.innerHTML = ""; } // clearing stops the trailer
$("#close").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// Start
load();
