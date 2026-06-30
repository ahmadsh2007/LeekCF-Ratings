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

// --- 2. DATA FETCHING ---
async function fetchProblemData(id, index) {
    let rating = null;
    let tags = null;

    // Attempt 1: Fetch from general problemset API
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

    // Attempt 2: Fallback to contest standings API if rating is still null
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
                rating = -1; // API Error indicator
            }
        } catch (e) {
            rating = -1; // API Error indicator
        }
    }

    return { rating, tags };
}

// --- 3. UI GENERATION ---
function generateHtml(id, rating, tags) {
    // Scenario A: API Error
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

    // Prepare tags HTML
    const tagsHtml = tags ? tags.map(tag => `
        <div class="roundbox hidden" style="margin:2px; padding:0 3px 2px 3px; background-color:#f0f0f0;float:left;">
            <div class="roundbox-lt">&nbsp;</div>
            <div class="roundbox-rt">&nbsp;</div>
            <div class="roundbox-lb">&nbsp;</div>
            <div class="roundbox-rb">&nbsp;</div>
            <span class="tag-box" style="font-size:1.2rem;" title="Difficulty">${tag}</span>
        </div>
    `).join('') : '';

    // Scenario B: Rating not available
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

    // Scenario C: Rating found successfully
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
    // Reusable button snippet to prevent code duplication
    return `
        <div style="text-align:center;">
            <button onclick="
                if (this.innerText === 'Show All Tags') {
                    document.querySelectorAll('.hidden').forEach((item) => {
                        item.dataset.leekTag = 'true'; 
                        item.classList.remove('hidden');
                    });
                    this.innerText = 'Hide All Tags';
                } else {
                    document.querySelectorAll('[data-leek-tag=true]').forEach((item) => {
                        item.classList.add('hidden');
                    });
                    this.innerText = 'Show All Tags';
                }
            " style="margin-bottom:3px; width: 50%;">Show All Tags</button>
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
    
    const getRatingBox = document.createElement("div");
    getRatingBox.innerHTML = htmlContent;
    document.querySelector("#sidebar").appendChild(getRatingBox);
}

init();