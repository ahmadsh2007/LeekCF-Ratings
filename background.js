/**
 * LEEKCF RATINGS - Content Script
 * Injected into Codeforces problem pages to display problem ratings.
 *
 * Loaded after settings.js (see manifest.json), which provides:
 * LEEKCF_EXT, LEEKCF_DEFAULT_SETTINGS, LEEKCF_CACHE_KEY, leekcfStorageArea(), leekcfLoadSettings().
 */

const CACHE_TTL_MS = 1 * 60 * 60 * 1000;   // Refresh the cached problemset every hour
const MISSING_RETRY_MS = 10 * 60 * 1000;   // Refresh early if this problem is missing/unrated and cache is 10+ min old

/* ================================================================
 * Phase 1: URL parsing
 * ================================================================ */

function parseCodeforcesUrl(rawUrl) {
    let i = rawUrl.length - 1;
    let updatedUrl = rawUrl;

    if (i - 1 >= 0 && rawUrl[i - 1] !== '/') i--;

    if (rawUrl[i] >= 'a' && rawUrl[i] <= 'z') {
        updatedUrl = rawUrl.slice(0, i) + rawUrl[i].toUpperCase() + rawUrl.slice(i + 1); 
    }

    let id, index;

    // Check if URL is a contest format (index 23 is 'c' in "https://codeforces.com/contest/...")
    if (updatedUrl[23] === 'c') {
        const data = updatedUrl.slice(31, updatedUrl.length);
        const dataArray = data.split(/[\/\?]/);
        id = dataArray[0];
        index = dataArray[2];
    } else {
        // Problemset format ("https://codeforces.com/problemset/...")
        const data = updatedUrl.slice(42, updatedUrl.length);
        const dataArray = data.split(/[\/\?]/);
        id = dataArray[0];
        index = dataArray[1];
    }

    return { id, index };
}

/* ================================================================
 * Phase 2: Data (local cache + Codeforces API)
 * ================================================================ */

async function readCache() {
    const local = leekcfStorageArea("local");
    if (!local) return null;
    try {
        const stored = await local.get(LEEKCF_CACHE_KEY);
        const cache = stored[LEEKCF_CACHE_KEY];
        return cache && typeof cache.time === "number" && cache.map ? cache : null;
    } catch (e) {
        return null; // Storage blocked or extension context invalidated: work without a cache
    }
}

async function writeCache(map) {
    const local = leekcfStorageArea("local");
    if (!local) return;
    try {
        await local.set({ [LEEKCF_CACHE_KEY]: { time: Date.now(), map } });
    } catch (e) {
        // Quota exceeded or storage unavailable: skip caching, the data is still used for this page
    }
}

/**
 * Downloads the full problemset once and compacts it into
 * { "contestId-index": [rating, tags, solvedCount] } to keep the cache small.
 */
async function downloadProblemset() {
    const response = await fetch("https://codeforces.com/api/problemset.problems");
    const data = await response.json();
    if (data.status !== "OK") throw new Error(data.comment || "Codeforces API error");

    const map = {};
    for (const p of data.result.problems) {
        map[`${p.contestId}-${p.index}`] = [p.rating ?? null, p.tags || [], null];
    }
    for (const s of data.result.problemStatistics) {
        const entry = map[`${s.contestId}-${s.index}`];
        if (entry) entry[2] = s.solvedCount;
    }
    return map;
}

/** Returns the problem map, from cache when fresh, otherwise from the API. Returns null if nothing is available. */
async function getProblemMap(id, index) {
    const cache = await readCache();
    const age = cache ? Date.now() - cache.time : Infinity;
    const entry = cache ? cache.map[`${id}-${index}`] : null;

    const isStale = age > CACHE_TTL_MS;
    // New problems get added (and rated) after contests end, so a miss triggers an early refresh
    const isMissing = (!entry || entry[0] === null) && age > MISSING_RETRY_MS;

    if (cache && !isStale && !isMissing) return cache.map;

    try {
        const map = await downloadProblemset();
        await writeCache(map);
        return map;
    } catch (e) {
        return cache ? cache.map : null; // A stale cache is better than nothing when the API is down
    }
}

async function fetchProblemData(id, index) {
    const map = await getProblemMap(id, index);
    const entry = map ? map[`${id}-${index}`] : null;

    if (entry) {
        return { rating: entry[0], tags: entry[1], solvedCount: entry[2], apiError: false };
    }

    // Not in the problemset (e.g. a contest that just ended): ask the contest itself.
    // count=1 skips downloading every participant row.
    if (id) {
        try {
            const response = await fetch(`https://codeforces.com/api/contest.standings?contestId=${encodeURIComponent(id)}&from=1&count=1`);
            const data = await response.json();

            if (data.status === "OK") {
                const problem = data.result.problems.find(p => p.index == index);
                return {
                    rating: problem ? problem.rating ?? null : null,
                    tags: problem ? problem.tags || [] : [],
                    solvedCount: null,
                    apiError: false,
                };
            }
        } catch (e) {
            rating = -1;
        }
    }

    // Only an error if we couldn't reach the API at all; otherwise the problem simply has no data
    return { rating: null, tags: [], solvedCount: null, apiError: map === null };
}

/* ================================================================
 * Phase 3: Finding where to render
 *   - Native mode: Codeforces' own "Problem tags" box exists (tags enabled in CF settings),
 *     so we take it over instead of adding a duplicate box.
 *   - Own mode: no native box, so we add our own box (the original behaviour).
 * ================================================================ */

/** Finds Codeforces' tags box by its content (works in any site language), not by its caption text. */
function findNativeTagsBox(sidebar) {
    for (const box of sidebar.querySelectorAll(".sidebox")) {
        if (!box.classList.contains("leekcf-box") && box.querySelector(".tag-box")) return box;
    }
    return null;
}

/** Reads rating and tags from the native box. Native tags are kept as-is, so they stay in the site's language. */
function readNativeData(box) {
    let rating = null;
    const tags = [];
    const tagElements = [];

    box.querySelectorAll(".tag-box").forEach((span) => {
        const text = span.textContent.trim();

        // The chip is the small roundbox around the span; never let this resolve to the sidebox itself
        let chip = span.parentElement ? span.parentElement.closest(".roundbox") : null;
        if (!chip || chip === box) chip = span;
        tagElements.push(chip);

        const ratingMatch = text.match(/^\*(\d+)$/);
        if (ratingMatch) rating = Number(ratingMatch[1]);
        else if (text) tags.push(text);
    });

    return { rating, tags, tagElements };
}

/** Hides the native chips (kept in the DOM so Codeforces' own scripts keep working) and adds our container. */
function prepareNativeBox(box, tagElements) {
    box.classList.add("leekcf-native");
    tagElements.forEach((el) => el.classList.add("leekcf-hidden"));

    const container = document.createElement("div");
    container.className = "leekcf-content";
    const anchor = tagElements[0];
    anchor.parentNode.insertBefore(container, anchor);

    const caption = box.querySelector(".caption");
    if (caption && !caption.querySelector(".leekcf-badge")) {
        const badge = document.createElement("span");
        badge.className = "leekcf-badge";
        badge.textContent = "LeekCF";
        caption.insertBefore(badge, caption.querySelector(".top-links"));
    }

    return container;
}

/** Undoes prepareNativeBox, used if something fails so the user is never left without tags. */
function restoreNativeBox(box) {
    box.querySelectorAll(".leekcf-content, .leekcf-badge").forEach((el) => el.remove());
    box.querySelectorAll(".leekcf-hidden").forEach((el) => el.classList.remove("leekcf-hidden"));
    box.classList.add("leekcf-native");
}

function createOwnBox(sidebar) {
    const box = document.createElement("div");
    box.className = "roundbox sidebox leekcf-box";
    box.innerHTML = `
        <div class="roundbox-lt">&nbsp;</div>
        <div class="roundbox-rt">&nbsp;</div>
        <div class="caption titled">→ LeekCF Rating
            <div class="top-links"></div>
        </div>
        <div class="leekcf-content"></div>
    `;
    sidebar.appendChild(box);
    return box.querySelector(".leekcf-content");
}

/* ================================================================
 * Phase 4: Rendering
 * ================================================================ */

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
}

/** Codeforces rank colors. */
function ratingColor(rating) {
    if (rating < 1200) return "#808080"; // Newbie: gray
    if (rating < 1400) return "#008000"; // Pupil: green
    if (rating < 1600) return "#03a89e"; // Specialist: cyan
    if (rating < 1900) return "#0000ff"; // Expert: blue
    if (rating < 2100) return "#aa00aa"; // Candidate Master: violet
    if (rating < 2400) return "#ff8c00"; // Master / International Master: orange
    return "#ff0000";                    // Grandmaster and above: red
}

const CHIP_CORNERS = `
    <div class="roundbox-lt">&nbsp;</div>
    <div class="roundbox-rt">&nbsp;</div>
    <div class="roundbox-lb">&nbsp;</div>
    <div class="roundbox-rb">&nbsp;</div>
`;

function chipHtml(text, { title = "", action = "", index = null, concealed = false, color = "" } = {}) {
    const classes = "roundbox leekcf-chip" + (concealed ? " leekcf-concealed" : "");
    const actionAttr = action ? ` data-action="${action}"` : "";
    const indexAttr = index !== null ? ` data-index="${index}"` : "";
    const style = color ? ` style="color:${color};font-weight:bold;"` : "";
    return `
        <div class="${classes}"${actionAttr}${indexAttr} title="${escapeHtml(title)}">
            ${CHIP_CORNERS}
            <span class="tag-box"${style}>${escapeHtml(text)}</span>
        </div>
    `;
}

function isTagVisible(state, i) {
    return state.allTagsRevealed || state.revealedTags.has(i);
}

function areAllTagsVisible(state, tags) {
    return tags.every((_, i) => isTagVisible(state, i));
}

function solvedHtml(data, settings, state) {
    if (!settings.showSolved || data.solvedCount == null) return "";

    // The solved count hints at difficulty, so it stays hidden together with the rating.
    // The placeholder is fixed text, so nothing leaks through the blur or Ctrl+F.
    if (settings.hideRating && !state.ratingRevealed) {
        return `
            <div class="leekcf-solved">Solved by
                <span class="leekcf-concealed leekcf-inline" data-action="reveal-rating" title="Click to reveal">00000</span>
            </div>
        `;
    }
    return `<div class="leekcf-solved">Solved by ${data.solvedCount.toLocaleString("en-US")}</div>`;
}

function buttonsHtml(contestId, toggleLabel) {
    const toggle = toggleLabel
        ? `<button type="button" class="leekcf-toggle" data-action="toggle-tags">${toggleLabel}</button>`
        : "";
    const standings = contestId
        ? `<a href="https://codeforces.com/contest/${encodeURIComponent(contestId)}/standings" target="_blank" rel="noopener"><button type="button">Contest Standings</button></a>`
        : "";
    return `<div class="leekcf-buttons">${toggle}${standings}</div>`;
}

function buildContentHtml(data, settings, state, contestId) {
    if (data.loading && !data.native) {
        return `<div class="leekcf-message">Loading problem data…</div>`;
    }

    if (data.apiError) {
        return `
            <div class="leekcf-message leekcf-error">Codeforces API Error.</div>
            ${buttonsHtml(contestId, null)}
        `;
    }

    const tags = data.tags || [];
    const chips = [];

    if (data.rating != null) {
        if (settings.hideRating && !state.ratingRevealed) {
            chips.push(chipHtml("*????", { title: "Click to reveal the rating", action: "reveal-rating", concealed: true }));
        } else {
            const color = settings.colorRating ? ratingColor(data.rating) : "";
            chips.push(chipHtml(`*${data.rating}`, { title: "Difficulty", color }));
        }
    }

    tags.forEach((tag, i) => {
        if (isTagVisible(state, i)) {
            chips.push(chipHtml(tag, { title: tag }));
        } else if (settings.tagMode !== "hide") {
            // Fixed placeholder text: the real tag is not in the DOM until revealed
            chips.push(chipHtml("hidden tag", { title: "Click to reveal this tag", action: "reveal-tag", index: i, concealed: true }));
        }
    });

    const message = data.rating == null
        ? `<div class="leekcf-message leekcf-error">Rating not available for this problem.</div>`
        : "";

    const toggleLabel = tags.length
        ? (areAllTagsVisible(state, tags) ? "Hide All Tags" : "Show All Tags")
        : null;

    return `
        ${message}
        <div class="leekcf-chips">${chips.join("")}</div>
        ${solvedHtml(data, settings, state)}
        ${buttonsHtml(contestId, toggleLabel)}
    `;
}

/** Owns one container: keeps the reveal state and re-renders on clicks, data updates, and settings changes. */
function createWidget(container, contestId, initialSettings, initialData) {
    let settings = initialSettings;
    let data = initialData;
    let state;

    function resetState() {
        state = {
            ratingRevealed: false,
            revealedTags: new Set(),
            allTagsRevealed: settings.tagMode === "show",
        };
    }

    function render() {
        container.innerHTML = buildContentHtml(data, settings, state, contestId);
    }

    // One delegated listener, attached once, survives every re-render
    container.addEventListener("click", (event) => {
        const target = event.target.closest("[data-action]");
        if (!target || !container.contains(target)) return;

        switch (target.dataset.action) {
            case "reveal-rating":
                state.ratingRevealed = true;
                break;
            case "reveal-tag":
                state.revealedTags.add(Number(target.dataset.index));
                break;
            case "toggle-tags":
                if (areAllTagsVisible(state, data.tags || [])) {
                    state.allTagsRevealed = false;
                    state.revealedTags.clear();
                } else {
                    state.allTagsRevealed = true;
                }
                break;
            default:
                return;
        }
        render();
    });

    resetState();
    render();

    return {
        setSettings(newSettings) {
            settings = newSettings;
            resetState();
            render();
        },
        setData(newData) {
            data = newData; // Reveal state is kept, so clicks made while loading aren't undone
            render();
        },
    };
}

/** Applies settings changes from the popup live, without reloading the page. */
function watchSettings(widget) {
    try {
        LEEKCF_EXT.storage.onChanged.addListener((changes) => {
            const touchesSettings = Object.keys(changes).some((key) => key in LEEKCF_DEFAULT_SETTINGS);
            if (touchesSettings) leekcfLoadSettings().then((s) => widget.setSettings(s));
        });
    } catch (e) {
        // Storage events unavailable: settings still apply on the next page load
    }
}

/* ================================================================
 * Phase 5: Orchestration
 * ================================================================ */

async function init() {
    const sidebar = document.querySelector("#sidebar");
    if (!sidebar) return;

    const { id, index } = parseCodeforcesUrl(window.location.href);
    const nativeBox = findNativeTagsBox(sidebar);

    try {
        const settings = await leekcfLoadSettings();
        let container, data;

        if (nativeBox) {
            // Native mode renders instantly from the page; API data (solved count) is added when it arrives
            const native = readNativeData(nativeBox);
            container = prepareNativeBox(nativeBox, native.tagElements);
            data = { rating: native.rating, tags: native.tags, solvedCount: null, native: true, loading: true };
        } else {
            container = createOwnBox(sidebar);
            data = { loading: true };
        }

        const widget = createWidget(container, id, settings, data);
        watchSettings(widget);

        const api = await fetchProblemData(id, index);

        if (nativeBox) {
            widget.setData({
                rating: data.rating ?? api.rating,
                tags: data.tags.length ? data.tags : api.tags, // Prefer the page's (localized) tags
                solvedCount: api.solvedCount,
                native: true,
                loading: false,
            });
        } else {
            widget.setData(api);
        }
    } catch (e) {
        // Never leave the user with hidden, unusable tags
        if (nativeBox) restoreNativeBox(nativeBox);
    }
}

init();