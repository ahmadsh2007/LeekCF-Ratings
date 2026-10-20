/**
 * LEEKCF RATINGS - Math bridge
 * Runs in the PAGE's JavaScript world (manifest.json: "world": "MAIN"), unlike background.js, which runs in the
 * extension's isolated world and cannot see the page's MathJax. background.js fires a "leekcf-typeset" event after
 * rendering revealed hints, and this script has Codeforces' own MathJax draw the formulas.
 *
 * Each formula is a <span class="leekcf-math"> holding "$tex$". It is rewritten to the delimiters the page's MathJax
 * is configured with (Codeforces uses $$$...$$$), so this never hardcodes them. If MathJax or its configuration
 * can't be found, the span is left alone and the user just sees the readable $tex$ text.
 */
(function () {
    const DONE = "data-leekcf-typeset";

    function inlineDelimiters(mathJax) {
        const v2 = mathJax.Hub && mathJax.Hub.config && mathJax.Hub.config.tex2jax && mathJax.Hub.config.tex2jax.inlineMath;
        const v3 = mathJax.config && mathJax.config.tex && mathJax.config.tex.inlineMath;
        const pair = (v2 || v3 || [])[0];
        return Array.isArray(pair) && pair.length === 2 ? pair : null;
    }

    function typesetPending() {
        try {
            const mathJax = window.MathJax;
            if (!mathJax) return;
            const delimiters = inlineDelimiters(mathJax);
            if (!delimiters) return;

            const pending = Array.from(document.querySelectorAll(".leekcf-math")).filter((node) => !node.hasAttribute(DONE));
            for (const node of pending) {
                node.setAttribute(DONE, "1");
                // textContent, never innerHTML: the formula came from an API, so it must stay plain text
                node.textContent = delimiters[0] + node.textContent.slice(1, -1) + delimiters[1];
                if (typeof mathJax.typesetPromise === "function") mathJax.typesetPromise([node]).catch(() => {});
                else if (mathJax.Hub && mathJax.Hub.Queue) mathJax.Hub.Queue(["Typeset", mathJax.Hub, node]);
            }
        } catch (e) {
            // Never let a typesetting problem reach the page
        }
    }

    document.addEventListener("leekcf-typeset", typesetPending);
})();
