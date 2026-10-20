# Privacy Policy for LeekCF Rating

Last updated: 20 October 2026 (covers version 3.0.0 and later)

LeekCF Rating is a browser extension for Codeforces problem pages. It shows a problem's rating, keeps its tags hidden until you click them, and can give you hints. This page says what it stores, what it sends and where.

The short version: nothing leaves your browser except requests to Codeforces for problem data and, only if you click **Show Hints**, one request to the hints service. There are no accounts, no ads and no trackers, and I don't sell or share data.

## What stays on your device

- **Settings** (tag visibility, hidden rating, colors, solved count) are saved with the browser's extension storage. If you are signed in to the browser, it may sync them between your devices.
- **A cache of Codeforces problem data** (ratings, tags and solved counts) is saved locally so pages load fast. It is refreshed every few hours.

None of this is sent to me.

## What is sent when you open a problem

To get ratings, the extension asks the public Codeforces API (`codeforces.com/api`) for problem data. This is the same site you are already on, so Codeforces sees the request the way it sees any other from your browser. It carries no information about you beyond what any request does.

## What is sent when you click Show Hints

Nothing is sent to the hints service until you click **Show Hints**. The click sends one request to the LeekCF-Hinter API (`leekcf-hinter-api.leekcf.workers.dev`) containing:

- the contest id and problem index of the page you are on (for example `1061` and `A`), which is how the service knows which hints to return, and
- the name and version of this extension (for example `leekcf-ratings/3.0.2`), so the service can count how many requests each app makes.

That is all. No account, settings, cookies, page content or browsing history are sent.

The service is hosted on Cloudflare, so like any web request it reaches Cloudflare's servers and your IP address is visible to them. Cloudflare handles it under its own privacy policy. LeekCF-Hinter uses the address only to rate-limit requests, and keeps it in memory for a short while. It is not written to the service's logs or statistics.

For each request the service records the kind of request, the response status, the app name and version, and how long it took. It keeps daily totals per app. It does not know who you are and does not link requests to a person.

## What I don't do

- I don't collect your name, email, location, Codeforces handle, submissions or solutions.
- I don't track which problems you read, or how you use the extension, apart from the hints request described above.
- I don't sell or transfer data to third parties, and I don't use it for anything other than showing you the hints you asked for and counting usage.
- I don't use remote code. Everything the extension runs is in the package you installed. Hint text from the service is only displayed, never executed.

## Hints are AI-generated

The hints are written by an AI and may be wrong. They are an aid, not an authority.

## Changes

If the extension ever sends something new, this page will be updated first and the "last updated" date above will change. The full history is in the [repository](https://github.com/ahmadsh2007/LeekCF-Ratings/commits/main/PRIVACY.md).

## Contact

Questions or concerns: open an issue at https://github.com/ahmadsh2007/LeekCF-Ratings/issues.
