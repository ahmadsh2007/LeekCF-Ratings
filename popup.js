/**
 * LEEKCF RATINGS - Popup
 * Loaded after settings.js (see popup.html).
 */

const HOST_ORIGINS = ["*://codeforces.com/*"];

const $ = (selector) => document.querySelector(selector);

document.addEventListener("DOMContentLoaded", () => {
    setupSocialLinks();
    setupViewToggle();
    setupAccessBanner();
    setupSettings();
});

function setupSocialLinks() {
    const socialLinks = {
        ".ri-github-fill": "https://github.com/ahmadsh2007/LeekCF-Ratings",
        ".ri-linkedin-box-fill": "https://www.linkedin.com/in/ahmadshatnawi",
        ".ri-mail-fill": "mailto:shatnawiahmad07@gmail.com"
    };

    for (const [selector, url] of Object.entries(socialLinks)) {
        const element = $(selector);
        if (element) {
            element.addEventListener("click", () => {
                window.open(url, '_blank').focus();
            });
        }
    }
}

function setupViewToggle() {
    const button = $("#settings-toggle");
    const icon = button.querySelector("i");
    const mainView = $("#main-view");
    const settingsView = $("#settings-view");

    button.addEventListener("click", () => {
        const opening = settingsView.classList.contains("hidden");
        settingsView.classList.toggle("hidden", !opening);
        mainView.classList.toggle("hidden", opening);
        icon.className = opening ? "ri-close-line" : "ri-settings-3-line";
        button.title = opening ? "Close settings" : "Settings";
        button.setAttribute("aria-label", button.title);
    });
}

/**
 * Site access can be withheld by the user: Chrome's "Site access: On click", or
 * Firefox's per-extension permissions page. Without it, the content script never runs.
 */
async function setupAccessBanner() {
    const permissions = LEEKCF_EXT && LEEKCF_EXT.permissions;
    if (!permissions) return;

    const banner = $("#access-banner");
    const text = $("#access-text");
    const grantButton = $("#grant-access");

    let granted = true;
    try {
        granted = await permissions.contains({ origins: HOST_ORIGINS });
    } catch (e) {
        // If we can't check, assume granted rather than showing a false warning
    }
    banner.classList.toggle("hidden", granted);

    grantButton.addEventListener("click", () => {
        // request() must run directly inside the click (user gesture): no await before it
        permissions.request({ origins: HOST_ORIGINS })
            .then((ok) => {
                if (ok) {
                    text.textContent = "Access allowed. Reload any open Codeforces tabs.";
                    grantButton.classList.add("hidden");
                } else {
                    text.textContent = "Access wasn't allowed. Ratings won't show until it is.";
                }
            })
            .catch(() => {
                text.textContent = "Couldn't request access. Allow it from the browser's extension settings.";
            });
    });
}

async function setupSettings() {
    const fields = {
        tagMode: $("#setting-tag-mode"),
        hideRating: $("#setting-hide-rating"),
        colorRating: $("#setting-color-rating"),
        showSolved: $("#setting-show-solved"),
    };
    const refreshButton = $("#refresh-cache");
    const status = $("#settings-status");
    let statusTimer = null;

    function showStatus(message, isError = false) {
        status.textContent = message;
        status.classList.toggle("error", isError);
        clearTimeout(statusTimer);
        if (!isError) statusTimer = setTimeout(() => { status.textContent = ""; }, 2500);
    }

    if (!leekcfStorageArea("sync") && !leekcfStorageArea("local")) {
        Object.values(fields).forEach((el) => { el.disabled = true; });
        refreshButton.disabled = true;
        showStatus("Settings can't be saved: browser storage is unavailable. Defaults are in use.", true);
        return;
    }

    const settings = await leekcfLoadSettings();
    fields.tagMode.value = settings.tagMode;
    fields.hideRating.checked = settings.hideRating;
    fields.colorRating.checked = settings.colorRating;
    fields.showSolved.checked = settings.showSolved;

    async function save() {
        const saved = await leekcfSaveSettings({
            tagMode: fields.tagMode.value,
            hideRating: fields.hideRating.checked,
            colorRating: fields.colorRating.checked,
            showSolved: fields.showSolved.checked,
        });
        if (saved) showStatus("Saved. Open problem pages update automatically.");
        else showStatus("Couldn't save settings.", true);
    }

    Object.values(fields).forEach((el) => el.addEventListener("change", save));

    refreshButton.addEventListener("click", async () => {
        const local = leekcfStorageArea("local");
        try {
            await local.remove(LEEKCF_CACHE_KEY);
            showStatus("Problem data cleared. It reloads on the next problem page.");
        } catch (e) {
            showStatus("Couldn't clear problem data.", true);
        }
    });
}