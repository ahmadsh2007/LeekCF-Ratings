# LeekCF-Ratings Development Guide

This document explains the architecture of the extension to make future updates, debugging, and feature additions straightforward.

## 🛠 File Deep-Dive & How to Modify

### 1. Shared Settings: `settings.js`
Loaded by **both** the content script (listed before `background.js` in `manifest.json`) and the popup (a `<script>` before `popup.js`).

* `LEEKCF_EXT`: the browser API namespace (`browser` on Firefox, `chrome` on Chrome).
* `LEEKCF_DEFAULT_SETTINGS`: every setting and its default value. **To add a setting:** add it here, handle it in `leekcfSanitizeSettings`, add a control in `popup.html`, and wire it in `popup.js` → `setupSettings`.
* `leekcfLoadSettings()` / `leekcfSaveSettings()`: use `storage.sync`, fall back to `storage.local`, and fall back to defaults if storage is unavailable. They never throw.

### 2. The Core Logic: `background.js`
Despite its name, this is a **content script** injected into problem pages. It is split into five phases:

* **Phase 1: `parseCodeforcesUrl(rawUrl)`**
    * *What it does:* Extracts the `contestId` and problem index from the URL.
    * *Update here if:* Codeforces changes their URL routing structure.
* **Phase 2: Data (`getProblemMap`, `fetchProblemData`)**
    * *What it does:* Downloads `problemset.problems` once, compacts it to `{ "contestId-index": [rating, tags, solvedCount] }`, and caches it in `storage.local` under `LEEKCF_CACHE_KEY`.
    * *Cache rules:* refreshed every 6 hours (`CACHE_TTL_MS`), or early (after 30 minutes, `MISSING_RETRY_MS`) when the current problem is missing or unrated. If the API is down, a stale cache is used. If storage is unavailable, the API is used directly with no cache.
    * *Fallback:* problems not in the problemset are looked up via `contest.standings?count=1`.
    * *Update here if:* you need more data from the API. Add it to the compact entry array and **bump the version in `LEEKCF_CACHE_KEY`** so old caches are ignored.
* **Phase 3: Finding where to render**
    * *Native mode:* if the user has tags enabled on Codeforces, `findNativeTagsBox` finds the site's own tags box (by its `.tag-box` content, so it works in any site language). `prepareNativeBox` hides the original chips (kept in the DOM so Codeforces' scripts still work) and inserts a `.leekcf-content` container.
    * *Own mode:* otherwise `createOwnBox` adds a `.leekcf-box` sidebox (the original behaviour).
    * `restoreNativeBox` undoes everything if an error occurs, so tags are never left hidden.
* **Phase 4: Rendering (`buildContentHtml`, `createWidget`)**
    * `createWidget` owns one container and its reveal state (`ratingRevealed`, `revealedTags`, `allTagsRevealed`). It re-renders on clicks, when API data arrives, and when settings change.
    * Clicks use **one delegated listener** with `data-action` attributes (`reveal-rating`, `reveal-tag`, `toggle-tags`). **To add a clickable element:** give it a `data-action` and add a `case` in the listener's `switch`.
    * Concealed tags and ratings render fixed placeholder text. The real value isn't in the DOM until revealed, so it can't leak through the blur or Ctrl+F.
    * Never use inline `onclick` attributes. They run in the page's context and can be blocked by Codeforces' Content Security Policy.
    * API text is always passed through `escapeHtml` before going into HTML.
* **Phase 5: `init()`**
    * Loads settings, picks native/own mode, renders immediately, then updates with API data. `watchSettings` applies popup changes to open pages live.

### 3. The Popup Interface: `popup.js` & `popup.html`
* **Settings view:** the gear icon switches between the MrLeeks view and settings. Changes save immediately.
* **Access banner:** shown when the user has withheld access to codeforces.com (Chrome's "Site access: On click", or Firefox's add-on permissions page). "Allow access" calls `permissions.request`, which must stay directly inside the click handler (no `await` before it) to count as a user gesture.
* **To add a new social link:**
    1. Add the icon in `popup.html`.
    2. Add a key-value pair to `socialLinks` in `popup.js` → `setupSocialLinks`.

### 4. Styling: `background.css` & `popup.css`
* `background.css`: injected into every problem page, so **always prefix classes with `leekcf-`**. It also contains a rule that keeps Codeforces' native tags invisible until the script takes over the box, which prevents a flash of spoilers on page load.
* `popup.css`: controls your personal branding (MrLeeks GIF, Ubuntu font) and the settings view.

---

## How to add new features (Examples)

**Example A: Adding a new piece of data to the UI**
1. Add the value to the compact entry in `downloadProblemset`, and bump `LEEKCF_CACHE_KEY` (e.g. `_v2`).
2. Return it from `fetchProblemData`.
3. Render it in `buildContentHtml` (remember `escapeHtml` for text).

**Example B: Adding a new setting**
1. Add it with a default to `LEEKCF_DEFAULT_SETTINGS` and validate it in `leekcfSanitizeSettings`.
2. Add a control to the settings view in `popup.html` and include it in `fields` in `popup.js`.
3. Read `settings.yourSetting` in `buildContentHtml`. Open pages update live automatically.

**Example C: Adding a new social link to the Popup**
```javascript
const socialLinks = {
    ".ri-github-fill": "https://github.com/...",
    // Just drop the new CSS selector and URL here:
    ".ri-twitter-fill": "https://x.com/yourhandle"
};
```