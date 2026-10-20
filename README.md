Download Links [ [ Chrome Web Store ](https://chromewebstore.google.com/detail/leekcf-rating/fnkoldggbbjmndapidpegfpkkokboklp) | [ Firefox Addons Store ](https://addons.mozilla.org/en-US/firefox/addon/leekcf-rating) ]

Get rating for Codeforces problems even with problem tags off.
This Codeforces Get Rating extension helps users to just view the problem rating without seeing the other tags. If you are stuck on a problem, you can reveal tags one at a time (they're blurred until clicked) or all at once with the Show All Tags button. The extension also includes a shortcut to go to the Contest Standings directly.

This extension is very helpful while practicing problems on Codeforces as it helps you to know the rating of the problem without explicitly knowing the tags associated with it.

Features:
- Rating colored by Codeforces rank (gray, green, cyan, blue, violet, orange, red).
- Number of people who solved the problem.
- Per-tag reveal: click a blurred tag to see just that one.
- Optional hidden rating for fully blind practice, revealed on click.
- Works whether Codeforces' own tags are on or off. If they're on, the extension takes over the site's tags box instead of adding a second one.
- Progressive hints (new in 3.0): click **Show Hints** to get AI-written hints one at a time, gentlest first, ending with the full solution. They come from [LeekCF-Hinter](https://github.com/ahmadsh2007/LeekCF-Hinter), an early MVP that covers only some problems and only after their contest is over. Hints can be wrong.
- Problem data is cached locally, so pages load fast after the first visit.

How to use : 
1. Install the extension.
2. Open any Codeforces problem and it will show the problem rating.
3. Click the extension icon, then the gear icon, to change settings (tag visibility, hidden rating, colors, solved count). Changes apply to open pages immediately.

If the popup says it needs access to codeforces.com, click **Allow access** and reload your Codeforces tabs.

*NOTE* If the Codeforces API is down, the extension uses previously cached data when available.

*PRIVACY* Nothing is sent to the hints service unless you click **Show Hints**. That click requests the hints for the problem you are on, which means sending its contest id and problem index (for example `1061` and `A`) to the LeekCF-Hinter API. As with any web request, the host (Cloudflare) also sees your IP address; LeekCF-Hinter itself does not log addresses. No account, settings or browsing history are sent.

*NOTE* The extension does not work with problems that do not have a problem rating.

Download Links [ [ Chrome Web Store ](https://chromewebstore.google.com/detail/leekcf-rating/fnkoldggbbjmndapidpegfpkkokboklp) | [ Firefox Addons Store ](https://addons.mozilla.org/en-US/firefox/addon/leekcf-rating) ]

## IMPORTANT:
This **Repo is a fork** of [ cf-getrating-extension ](https://github.com/importlogic/cf-getrating-extension).  
I tried to fix an **API problem** by submitting an **PR**, but since the creator seems **inactive**, I fixed it myself.