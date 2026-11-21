# Airwave Radio

A static radio player. It uses plain HTML, CSS, and JavaScript. It needs no framework, backend, database, account, API key, or build step.

## Use the app

1. Select a featured station, or search by station name or call letters.
2. Press **Save station** to save a station.
3. Select **Set as default** in the large player to play that station when you return.
4. Press the large **Pause** button to stop playback. Press **Play** to connect to the live stream again.

The player shows the station logo when the directory supplies one. It shows the station name and initials when a logo is unavailable.

On iPhone, the app shows one station card per row. Controls have text labels and large touch areas. Select **Larger text** to increase the text size. The app saves this setting in a cookie. Browser zoom remains available. Use **Back to player** to return to the main Play/Pause button.

On iPhone and iPad, use the device volume buttons. The app hides its volume slider on these devices. The **Mute audio** button remains available.

Search for `WMEX` with **All stations** selected to find **WMEX-LP 105.9 FM** in Rochester, New Hampshire. Matching featured stations appear before the network request finishes.

The app tries to play the default station on page load. A browser can block automatic audio until you press Play. The app cannot override this browser rule. Pause disconnects the stream. Play returns to the live broadcast.

## Run locally

From this folder, run:

```sh
python3 -m http.server 5173 --bind 127.0.0.1 --directory dist
```

Open <http://127.0.0.1:5173>. Use HTTP or HTTPS. Do not open the HTML file with a `file://` address.

## Free hosting with GitHub Pages

[GitHub Pages is free for public repositories on GitHub Free](https://docs.github.com/en/pages/getting-started-with-github-pages).

This repository includes a deployment workflow in `.github/workflows/pages.yml`. Set **Settings → Pages → Source** to **GitHub Actions**. Each push to `main` checks the app and publishes `dist/`. You can also run **Publish radio app** from the **Actions** tab.

GitHub Pages can cache files for 10 minutes. For a new release, update the `v=` values in `dist/index.html`, `dist/app.js`, and `dist/cookies.js` together. These version values prevent an old JavaScript or CSS file from being used with a new page.

To publish only the static files in a separate repository without a workflow, use these steps:

1. Create a public GitHub repository.
2. Upload the contents of `dist/` to the repository root. Include the hidden `.nojekyll` file.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select the `main` branch and `/ (root)` folder. Save the settings.
6. Open the address that GitHub provides after deployment.

No package installation or build command is necessary. Relative file paths support a repository subdirectory. You can also upload the `dist/` contents to another static HTTPS host.

## Saved settings

Cookies store favorites, the default station, volume, mute state, and the larger text setting for up to one year. Cookies use `SameSite=Lax`, a path limited to this app, and `Secure` on HTTPS. No account is needed. Settings do not move between browsers, devices, or website addresses. Clearing cookies removes the settings. Private browsing can remove them when the session ends.

The app limits its cookie data to 6 KB to avoid large request headers. It also limits favorites to 30 stations. Long station addresses can reduce this number. A message appears if storage is full or cookies are blocked. Use **Clear saved settings** to remove the app's cookies.

## Station sources and limits

- [Radio Browser](https://docs.radio-browser.info/) supplies search results. Two directory servers provide fallback. Searches have a timeout and can be cancelled.
- [SomaFM](https://somafm.com/listen/) supplies six featured streams.
- [WMEX-LP 105.9 FM](https://1059wmex.com/) in Rochester, New Hampshire, is included directly. Its provider's HTTPS stream works with this site. The directory's HTTP stream is excluded. Search results include matching featured stations, even if the directory is unavailable.
- Direct stream addresses can change. Update `dist/stations.js` if a featured stream stops working.
- The browser connects directly to station providers. Only HTTPS streams are listed. HLS streams are omitted because this app has no additional streaming library.
- A station can be unavailable or restricted by location. The app shows connection errors and permits retry.
- The app contains no tracking code. Station providers receive playback requests. Radio Browser receives searches. The app uses system fonts.

## Checks

With Node.js 22 or later:

```sh
node --test tests/radio.test.mjs
node --check dist/app.js
```

Node.js is only needed for these developer checks. Visitors do not need it.
