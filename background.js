/**
 * LEEKCF RATINGS - Content Script
 * Injected into Codeforces problem pages to display problem ratings.
 */

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

async function fetchProblemData(id, index) {
    let rating = null;
    let tags = null;

    try {
        const response = await fetch(`https://codeforces.com/api/problemset.problems`);
        const data = await response.json();
        
        if (data.status === "OK") {
            const problem = data.result.problems.find(p => p.contestId == id && p.index == index);
            if (problem) {
                rating = problem.rating;
                tags = problem.tags;
            }
        }
    } catch (e) {
        // Silence error to allow fallback
    }

    if (rating === null && id) {
        try {
            const response = await fetch(`https://codeforces.com/api/contest.standings?contestId=${id}`);
            const data = await response.json();
            
            if (data.status === "OK") {
                const problem = data.result.problems.find(p => p.index == index);
                if (problem) {
                    rating = problem.rating;
                    tags = problem.tags;
                }
            } else {
                rating = -1;
            }
        } catch (e) {
            rating = -1;
        }
    }

    return { rating, tags };
}

function generateHtml(id, rating, tags) {
    if (rating === -1) {
        return `
            <div class="roundbox sidebox" style="">
                <div class="roundbox-lt">&nbsp;</div>
                <div class="roundbox-rt">&nbsp;</div>
                <div class="caption titled">→ LeekCF Rating
                    <div class="top-links"></div>
                </div>
                <div>
                    <div style="margin:1em;font-size:0.8em;color: red;">
                        Codeforces API Error.
                    </div>
                </div>
                <div style="text-align:center;margin-bottom:15px">
                    <a href="https://codeforces.com/contest/${id}/standings" target="_blank"><button>Contest Standings</button></a>
                </div>
            </div>
        `;
    }

    const tagsHtml = tags ? tags.map(tag => `
        <div class="roundbox leekcf-tag leekcf-hidden" style="margin:2px; padding:0 3px 2px 3px; background-color:#f0f0f0;float:left;">
            <div class="roundbox-lt">&nbsp;</div>
            <div class="roundbox-rt">&nbsp;</div>
            <div class="roundbox-lb">&nbsp;</div>
            <div class="roundbox-rb">&nbsp;</div>
            <span class="tag-box" style="font-size:1.2rem;" title="Difficulty">${tag}</span>
        </div>
    `).join('') : '';

    if (rating === null) {
        return `
            <div class="roundbox sidebox" style="">
                <div class="roundbox-lt">&nbsp;</div>
                <div class="roundbox-rt">&nbsp;</div>
                <div class="caption titled">→ LeekCF Rating
                    <div class="top-links"></div>
                </div>
                <div style="padding: 0.5em;">
                    <div style="margin-bottom: 5px; font-size:0.8em;color: red;">
                        Rating not available for this question.
                    </div>
                    ${tagsHtml}
                    <div style="clear:both;text-align:right;font-size:1.1rem;"></div>
                </div>
                ${generateButtonsHtml(id)}
            </div>
        `;
    }

    return `
        <div class="roundbox sidebox" style="">
            <div class="roundbox-lt">&nbsp;</div>
            <div class="roundbox-rt">&nbsp;</div>
            <div class="caption titled">→ LeekCF Rating
                <div class="top-links"></div>
            </div>
            <div style="padding: 0.5em;">
                <div class="roundbox" style="margin:2px; padding:0 3px 2px 3px; background-color:#f0f0f0;float:left;">
                    <div class="roundbox-lt">&nbsp;</div>
                    <div class="roundbox-rt">&nbsp;</div>
                    <div class="roundbox-lb">&nbsp;</div>
                    <div class="roundbox-rb">&nbsp;</div>
                    <span class="tag-box" style="font-size:1.2rem;" title="Difficulty">
                        *${rating}
                    </span>
                </div>
                ${tagsHtml}
                <div style="clear:both;text-align:right;font-size:1.1rem;"></div>
            </div>
            ${generateButtonsHtml(id)}
        </div>
    `;
}

function generateButtonsHtml(id) {
    return `
        <div style="text-align:center;">
            <button type="button" class="leekcf-toggle" style="margin-bottom:3px; width: 50%;">Show All Tags</button>
        </div>
        <div style="text-align:center;">
            <a href="https://codeforces.com/contest/${id}/standings" target="_blank">
                <button style="margin-bottom:15px; margin-top: 3px; width: 50%;">Contest Standings</button>
            </a>
        </div>
    `;
}

async function init() {
    const { id, index } = parseCodeforcesUrl(window.location.href);
    const { rating, tags } = await fetchProblemData(id, index);
    
    const htmlContent = generateHtml(id, rating, tags);

    const sidebar = document.querySelector("#sidebar");
    if (!sidebar) return;

    const ratingBox = document.createElement("div");
    ratingBox.className = "leekcf-box";
    ratingBox.innerHTML = htmlContent;
    sidebar.appendChild(ratingBox);

    setupTagToggle(ratingBox);
}

function setupTagToggle(ratingBox) {
    const toggleBtn = ratingBox.querySelector(".leekcf-toggle");
    if (!toggleBtn) return;

    let tagsVisible = false;

    toggleBtn.addEventListener("click", () => {
        tagsVisible = !tagsVisible;

        // Only touch tags inside our own box, never the rest of the page
        ratingBox.querySelectorAll(".leekcf-tag").forEach((tag) => {
            tag.classList.toggle("leekcf-hidden", !tagsVisible);
        });

        toggleBtn.textContent = tagsVisible ? "Hide All Tags" : "Show All Tags";
    });
}

init();