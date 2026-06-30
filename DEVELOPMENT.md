# LeekCF-Ratings Development Guide

This document explains the architecture of the extension to make future updates, debugging, and feature additions straightforward.

## 🛠 File Deep-Dive & How to Modify

### 1. The Core Logic: `background.js`
This file is broken down into four distinct phases. If you want to add a feature, find the corresponding phase:

* **Phase 1: `parseCodeforcesUrl(rawUrl)`**
    * *What it does:* Slices the current Codeforces URL to extract the `contestId` and `problemIndex` (e.g., "A", "B").
    * *Update here if:* Codeforces changes their URL routing structure in the future.
* **Phase 2: `fetchProblemData(id, index)`**
    * *What it does:* Queries the official Codeforces APIs (`problemset.problems` and `contest.standings`).
    * *Update here if:* You want to fetch extra data, like the number of people who solved the problem, or if the CF API endpoints change.
* **Phase 3: `generateHtml(id, rating, tags)`**
    * *What it does:* Takes the fetched data and constructs the HTML string. It handles three states: Error (`-1`), Missing Data (`null`), and Success.
    * *Update here if:* You want to add new buttons (like a "Hide All Tags" toggle, or custom styling to the injected sidebar).
* **Phase 4: `init()`**
    * *What it does:* Orchestrates the above functions and appends the final HTML to Codeforces' `#sidebar`.

### 2. The Popup Interface: `popup.js` & `popup.html`
* **To add a new link/button:**
    1. Add the HTML icon/button in `popup.html`.
    2. Open `popup.js` and simply add a new key-value pair to the `socialLinks` object. The event listener handles the rest automatically.
    
### 3. Styling: `background.css` & `popup.css`
* `background.css`: Currently only holds the `.hidden` class used for toggling tags. If you ever add custom themes or colors to the injected Codeforces DOM, place them here.
* `popup.css`: Controls your personal branding (MrLeeks GIF, Ubuntu font) in the extension menu.

---

## How to add new features (Examples)

**Example A: Adding a new piece of data to the UI**
1. Update `fetchProblemData` to return your new data point alongside `rating` and `tags`.
2. Update the `generateHtml` function signature to accept your new data point.
3. Inject the variable inside the template literals (`${yourVariable}`) inside `generateHtml`.

**Example B: Adding a new social link to the Popup**
Open `popup.js` and edit the dictionary:
```javascript
const socialLinks = {
    ".ri-github-fill": "[https://github.com/](https://github.com/)...",
    // Just drop the new CSS selector and URL here:
    ".ri-twitter-fill": "[https://x.com/yourhandle](https://x.com/yourhandle)"
};