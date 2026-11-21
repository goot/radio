# Airwave Radio: instructions and conversation context

This file records the project state from 20 November 2026, US/Central time
(21 November UTC). Read it before continuing work.

## User communication instructions

Always use ASD-STE100 Simplified Technical English for English messages to the
user and text written on the user's behalf. Use another style only when the user
explicitly requests it for a task.

- Use short, direct sentences. Give each sentence one main idea.
- Use active voice and simple verb forms. Give instructions in the imperative form.
- Use the same term for the same thing.
- Explain unfamiliar technical terms and abbreviations when first used.
- Put actions in their required sequence.
- Use short paragraphs. Avoid idioms, vague wording, and unnecessary words.
- Preserve code, commands, identifiers, URLs, interface labels, and quotations.
- Use permitted technical nouns and technical verbs when necessary.
- Review messages against these rules before sending them.
- The official rules and dictionary take precedence over this summary.
- Do not claim a formal check against the complete standard unless one was done.

Official reference: https://www.asd-ste100.org/

The user prefers action to repeated requests for approval. Existing authorization
includes the public GitHub repository and publication of app updates to GitHub
Pages. Follow the current tool permission requirements. Do not create a new
hosting project or ask again whether this repository can be public.

## Active project and hosting

- Workspace: `/home/goot/git/radio`.
- **Active Git checkout: `/home/goot/git/radio/github-pages`.**
- Repository: https://github.com/goot/radio
- Branch: `main`.
- Git remote `origin`: `https://github.com/goot/radio.git`.
- Public site: https://goot.github.io/radio/
- Latest dedicated launch page:
  https://goot.github.io/radio/player.html?v=20261121-7
- Latest release identifier: `20261121-7`. Visible label: **Version 7**.
- Latest published commit: `dbc263074cbb1bf0c534db35b644ddb2b781b90c`.
- Latest verified successful deployment run: `44863500026`.
- The active checkout was clean after this publication.

The sibling folder `/home/goot/git/radio/airwave` is an older copy. Do not edit it
for the live site. Its ZIP file is also old. An early attempt registered a private
Sites project and saved its source. It was not published. The user later selected
GitHub Pages. Continue with GitHub Pages, not the earlier Sites project.

The workspace root is not the active Git repository. Run Git commands from
`github-pages`. This tracked `AGENTS.md` is in the active checkout. A workspace
copy also exists at `/home/goot/git/radio/AGENTS.md`. Keep the tracked file current
when project requirements or the unresolved issue change.

## Current user requirements

The user first requested React with Vite and a .NET backend if necessary. The user
then explicitly changed the requirements to a simple static site for free hosting.
The current app uses **plain HTML, CSS, and JavaScript**. It has no React dependency,
backend, database, account, or login. Do not restore the earlier React design.
If the user later requests a backend, their stated preference is .NET Core.

Required behavior:

- Select and stream live radio stations.
- Save multiple favorite stations in browser cookies.
- Save a default station. Attempt to play it automatically when the app starts.
- Remember volume, mute, and larger-text settings in cookies.
- Show the station name or call letters and its logo prominently.
- Provide a very large Play/Pause button.
- Support an iPhone user with impaired vision. Use large text, high contrast,
  large touch areas, and useful screen reader labels.
- Fill the available screen with the player in landscape orientation.
- **Start in Player view on all screen sizes.**
- Keep **Stations & settings** available to open station selection and settings.
- Support an iPhone Home Screen shortcut with a clear radio icon.
- Keep the app on free GitHub Pages hosting.

The user specifically wants **WMEX-LP 105.9 FM, Rochester, New Hampshire**.

## Unresolved issue: iPhone Home Screen startup

This is the main issue to continue investigating. Do not report it as confirmed
fixed on the user's device.

The user created an iPhone Home Screen shortcut. They enter Player view, start
audio, force-close the app by swiping it out of the app switcher, and reopen it.
They report that it opens with **Discover/Favorites and the station search**.
They confirmed that this is the browsing view, not merely Safari toolbar chrome.
They also reported that automatic audio was blocked.

Several code changes were published before the last report:

1. Version 4 added a screen-sized landscape player and playback resume handling.
2. Version 5 made Player view the default in both HTML and JavaScript.
3. Version 6 restored Player view on `pageshow` and when the page becomes visible.
   It also disabled browser scroll restoration and returned the player to the top.

These changes passed code tests, but the user still reported the issue. The
browser automation service was unavailable, and no actual iPhone or VoiceOver
verification was performed. The tests use a simulated DOM and audio element.
Do not confuse these tests with an actual browser or device test.

The published files were fetched and compared with local files. They matched.
GitHub Pages returned `Cache-Control: max-age=600`. An old cached page or an old
installed launch address is a **possible explanation**, not a confirmed cause.
There is no service worker in this app.

### Latest intervention: Version 7

- Added a dedicated `player.html` launch page.
- Changed the manifest `start_url` to `./player.html?v=20261121-7`.
- Kept manifest `id` and `scope` as `./`.
- Added **Version 7** below the Airwave name in Player view and in the footer.
- Added a **Reload app** link in the footer.
- Added an assertion that blocked autoplay does not exit Player view.
- Published and verified the new page and manifest against the local release.

The last instructions sent to the user were:

1. Open https://goot.github.io/radio/player.html?v=20261121-7 in Safari.
2. Confirm **Version 7** below the Airwave name.
3. Add that page to the Home Screen.
4. Close and reopen the new shortcut.
5. Keep the old shortcut until the new one works.

The user was told that a new installation might require selecting the default
station again. They were asked to report whether **Version 7** appears if the new
shortcut still opens the browsing view. **No result from that check has arrived.**

Next steps:

- Obtain that result before making another speculative lifecycle change.
- If Version 7 is absent, investigate the installed URL or cached release.
- If Version 7 is present but browsing view appears, obtain device evidence and
  inspect what changes `player-focus`. A screenshot can help distinguish the UI.
- Preserve saved stations and settings. Do not casually tell the user to clear
  cookies or delete the old app before a replacement works.
- Be explicit about what was tested and what remains unverified.

## Automatic audio: known limitation

The app calls `play(defaultStation)` on startup when a valid default cookie exists.
It does not wait for a click before that attempt.

Safari can reject audible playback with `NotAllowedError`. Home Screen installation
does not remove this restriction. Website code cannot guarantee automatic audible
playback on iPhone. Do not promise to bypass the browser restriction, and do not
silently start muted audio as if it satisfied the user's request.

When audio is blocked, the current code shows a message and leaves Player view
active. The user explicitly asked whether this block could exit Player view.
The answer for the current code is **no**, and a test now checks that case.

Playback resume uses the existing audio element. A pause made with the app's
Pause button remains paused when the app returns to the foreground. Pause
disconnects the live stream; Play reconnects to the live broadcast.

References checked during this work:

- https://webkit.org/blog/6784/new-video-policies-for-ios/
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/start_url

## Code map

Paths below are relative to `github-pages`.

- `dist/index.html`: source HTML. Starts with `class="player-focus"` on `<html>`.
- `dist/player.html`: generated copy of `index.html`. Git ignores this file.
  **Do not edit it directly.**
- `scripts/prepare-site.mjs`: copies `index.html` to `player.html`.
- `dist/app.js`: UI, playback, search display, saved settings, and lifecycle events.
- `dist/stations.js`: featured stations, secure URL validation, Radio Browser search.
- `dist/cookies.js`: cookie storage and validation.
- `dist/style.css`: responsive layout, larger text, and Player view styles.
- `dist/manifest.webmanifest`: Home Screen identity, launch URL, and icons.
- `dist/icons/airwave.svg`: editable radio icon. Green radio on a dark background.
- `dist/icons/apple-touch-icon.png`: opaque 180×180 iPhone icon.
- Other PNG icons: 32×32, 192×192, and 512×512.
- `tests/radio.test.mjs`: six tests for station filtering, directory fallback,
  cancellation, WMEX, cookies, blocked playback, larger text, and immediate results.
- `tests/player.test.mjs`: startup, Player view controls, resume, and paused state.
- `.github/workflows/pages.yml`: checks, launch-page preparation, and publication.
- `README.md`: operation, hosting, storage, limitations, and local commands.

Player view is controlled by the `player-focus` class on the root HTML element.
`setPlayerView(false, true)` should be called only by **Stations & settings**.
Startup, page restore, and foreground handling set Player view to true.
Rotating the device does not change the selected view. CSS changes the layout.

## Stations and storage

Featured stations include six SomaFM stations plus WMEX.

WMEX details:

- Station ID: `wmex-lp-1059`.
- Name: `WMEX-LP 105.9 FM`.
- Location: `Rochester, New Hampshire`.
- Website: https://1059wmex.com/
- Verified HTTPS stream:
  https://broadcast.shoutcheap.com/proxy/rochest1/stream
- Its Radio Browser entry resolved to an HTTP stream, which this app excludes.
  The direct HTTPS entry corrects that omission.

The app combines matching featured stations with Radio Browser results. Local
matches appear before the network request finishes. Search `WMEX` with **All
stations** selected. Genre filters can exclude the station. External search has
two server choices, cancellation, timeouts, and featured-station fallback.
Only HTTPS streams are accepted. HLS streams are excluded.

Cookies use prefix `airwave_` and the current app directory as their path.
They expire after one year, use `SameSite=Lax`, and use `Secure` on HTTPS.
The app limits its cookies to about 6 KB and at most 30 favorite stations.
Long stream addresses can reduce the number that fits.

Keys include `station_<id>`, `default`, `volume`, `muted`, and `large_text`.
There is no account synchronization. Do not replace cookie storage with a login
service or backend without a new user request.

## Accessibility and iPhone behavior

- System fonts. Default text is 18px at standard browser settings.
- **Larger text** increases the root size and is saved in a cookie.
- Main controls are at least 56px high. Player view uses a much larger button.
- Station names wrap instead of being cut off.
- Station controls have visible text labels and accessible names.
- Search, settings, and playback changes have status messages.
- Focus is preserved when station results are regenerated where possible.
- Landscape Player view hides secondary controls behind **Stations & settings**.
- Large text may require vertical scrolling; do not clip controls to force a fit.
- iPhone/iPad use device volume buttons. The unsupported software volume slider
  is hidden on those devices. The app still provides mute control.
- Main text and control colors passed numerical contrast checks. No full
  accessibility certification or real-device audit was performed.

## Verification and publication

Run from `/home/goot/git/radio/github-pages`:

```sh
node scripts/prepare-site.mjs
node --test tests/*.test.mjs
node --check dist/app.js
node --check dist/stations.js
node --check dist/cookies.js
git diff --check
```

To see each individual test in this environment, run:

```sh
node tests/player.test.mjs
node tests/radio.test.mjs
```

All seven tests passed for Version 7. The deployment workflow also passed.

Local preview:

```sh
python3 -m http.server 5173 --bind 127.0.0.1 --directory dist
```

The prior environment required network permission for the preview server, HTTP
checks, and GitHub commands. Use the current tools' permission mechanism.
The browser tool repeatedly reported that its access host was unavailable.
Do not claim visual browser checks were completed.

For publication:

1. Inspect the current Git status. Preserve unrelated user edits.
2. Update release values consistently when assets change. Current asset imports
   and CSS/script URLs use `v=20261121-7`.
3. If changing the launch release, also update the manifest URL, `start_url`,
   visible version labels, `data-release`, reload link, and README link.
4. Prepare the launch page and run the relevant checks.
5. Commit and push `main` to `origin`.
6. Check the **Publish radio app** workflow. Pushes publish `dist/` automatically.
7. Confirm a successful deployment. Fetch the relevant public files and compare
   them with the local release. This verifies publication, not iPhone behavior.

Useful commands:

```sh
git push origin main
gh run list --repo goot/radio --limit 3 --json databaseId,status,conclusion,headSha
gh run watch <run-id> --repo goot/radio --exit-status --interval 10
```

The first workflow-list request after a push can return the preceding run.
Check its full commit SHA before assuming it is the new publication.

GitHub Actions reported a Node 20 deprecation warning in official Pages actions.
Those actions ran under Node 24 and deployments succeeded. This warning has not
blocked publication.

Never write credentials, tokens, or GitHub authentication data to this file or
to the repository.
