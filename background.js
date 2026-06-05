var rawUrl = window.location.href;
var i = rawUrl.length-1;
var updatedUrl = rawUrl

if (i - 1 >= 0 && rawUrl[i - 1] != '/') i--

if (rawUrl[i] >= 'a' && rawUrl[i] <= 'z')
{
    updatedUrl = rawUrl.slice(0, i) + rawUrl[i].toUpperCase() + rawUrl.slice(i + 1); 
}

var url = updatedUrl;
var id;
var index;

if(url[23] == 'c'){
    var data = url.slice(31, url.length);
    var dataArray = data.split(/[\/\?]/);
    id = dataArray[0];
    index = dataArray[2];
}
else{
    var data = url.slice(42, url.length);
    var dataArray = data.split(/[\/\?]/);
    id = dataArray[0];
    index = dataArray[1];
}

const requestURL = `https://codeforces.com/api/problemset.problems`;

fetchData();

async function fetchData(){
    var rating = null;
    var tags = null;

    try{
        const response = await fetch(requestURL);
        const data = await response.json();
        const problemsList = data.result.problems;

        if(data.status == "OK"){
            for(var i = 0; i < problemsList.length; i++){
                if(problemsList[i].contestId == id && problemsList[i].index == index){
                    rating = problemsList[i].rating;
                    tags = problemsList[i].tags;
                    break;
                }
            }
        }
        else{
            rating = -1;
        }
    }
    catch(e){
        rating = -1;
    }

    var toInsert;
    if(rating == null){
        toInsert = `
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

                    `

    tags.forEach((tag) => {
        toInsert += `
                        <div class="roundbox hidden" style="margin:2px; padding:0 3px 2px 3px; background-color:#f0f0f0;float:left;">
                            <div class="roundbox-lt">&nbsp;</div>
                            <div class="roundbox-rt">&nbsp;</div>
                            <div class="roundbox-lb">&nbsp;</div>
                            <div class="roundbox-rb">&nbsp;</div>
                            <span class="tag-box" style="font-size:1.2rem;" title="Difficulty">
                                ${tag}
                            </span>
                        </div>
                    `
    });

    toInsert += `
                            <div style="clear:both;text-align:right;font-size:1.1rem;">
                            </div>
                        </div>

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
                                " 
                                style="margin-bottom:3px; width: 50%;">Show All Tags</button>
                        </div>
                        <div style="text-align:center;">
                            <a href="https://codeforces.com/contest/${id}/standings" target="_blank"><button style="margin-bottom:15px; margin-top: 3px; width: 50%;">Contest Standings</button></a>
                        </div>

                    </div>
                `
    }
    else if(rating == -1){
        toInsert = `
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
                    `
    }
    else{
        toInsert = `
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

                    `

        tags.forEach((tag) => {
            toInsert += `
                            <div class="roundbox hidden" style="margin:2px; padding:0 3px 2px 3px; background-color:#f0f0f0;float:left;">
                                <div class="roundbox-lt">&nbsp;</div>
                                <div class="roundbox-rt">&nbsp;</div>
                                <div class="roundbox-lb">&nbsp;</div>
                                <div class="roundbox-rb">&nbsp;</div>
                                <span class="tag-box" style="font-size:1.2rem;" title="Difficulty">
                                    ${tag}
                                </span>
                            </div>
                        `
        });

        toInsert += `
                                <div style="clear:both;text-align:right;font-size:1.1rem;">
                                </div>
                            </div>

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
                                                " 
                                         style="margin-bottom:3px; width: 50%;">Show All Tags</button>
                            </div>
                            <div style="text-align:center;">
                                <a href="https://codeforces.com/contest/${id}/standings" target="_blank"><button style="margin-bottom:15px; margin-top: 3px; width: 50%;">Contest Standings</button></a>
                            </div>

                        </div>
                    `
    }

    const getRatingBox = document.createElement("div");
    getRatingBox.innerHTML = toInsert;
    document.querySelector("#sidebar").appendChild(getRatingBox);
}