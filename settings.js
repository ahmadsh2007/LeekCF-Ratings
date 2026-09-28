/**
 * LEEKCF RATINGS - Shared settings & storage helpers
 * Loaded by BOTH the content script (before background.js, see manifest.json)
 * and the popup (before popup.js, see popup.html).
 */

// Firefox exposes a promise-based `browser` namespace; Chrome MV3's `chrome` is promise-based too.
// The `.runtime` check guards against a page element with id="browser" leaking onto window.
const LEEKCF_EXT =
    (typeof browser !== "undefined" && browser && browser.runtime) ? browser :
    (typeof chrome !== "undefined" && chrome && chrome.runtime) ? chrome :
    null;

const LEEKCF_TAG_MODES = ["blur", "hide", "show"];

const LEEKCF_DEFAULT_SETTINGS = Object.freeze({
    tagMode: "blur",      // "blur": blurred chips, click one to reveal it
                          // "hide": tags not shown until "Show All Tags"
                          // "show": tags visible from the start
    hideRating: false,    // Conceal rating (and solved count) until clicked
    colorRating: true,    // Color the rating using Codeforces rank colors
    showSolved: true,     // Show how many people solved the problem
});

const LEEKCF_CACHE_KEY = "leekcf_problemset_v1";

/** Returns chrome.storage[name] or null if storage is unavailable (missing permission, invalidated context, etc). */
function leekcfStorageArea(name) {
    try {
        return (LEEKCF_EXT && LEEKCF_EXT.storage && LEEKCF_EXT.storage[name]) || null;
    } catch (e) {
        return null;
    }
}

/** Fills in defaults and drops anything invalid, so a corrupted value can never break the UI. */
function leekcfSanitizeSettings(raw) {
    const settings = { ...LEEKCF_DEFAULT_SETTINGS };
    if (!raw) return settings;

    if (LEEKCF_TAG_MODES.includes(raw.tagMode)) settings.tagMode = raw.tagMode;
    for (const key of ["hideRating", "colorRating", "showSolved"]) {
        if (typeof raw[key] === "boolean") settings[key] = raw[key];
    }
    return settings;
}

/** Loads settings from storage.sync, falling back to storage.local, then to defaults. Never throws. */
async function leekcfLoadSettings() {
    for (const name of ["sync", "local"]) {
        const area = leekcfStorageArea(name);
        if (!area) continue;
        try {
            const stored = await area.get(Object.keys(LEEKCF_DEFAULT_SETTINGS));
            return leekcfSanitizeSettings(stored);
        } catch (e) {
            // Try the next storage area
        }
    }
    return { ...LEEKCF_DEFAULT_SETTINGS };
}

/** Saves settings to storage.sync, falling back to storage.local. Returns true on success. */
async function leekcfSaveSettings(settings) {
    const clean = leekcfSanitizeSettings(settings);
    for (const name of ["sync", "local"]) {
        const area = leekcfStorageArea(name);
        if (!area) continue;
        try {
            await area.set(clean);
            return true;
        } catch (e) {
            // Try the next storage area
        }
    }
    return false;
}