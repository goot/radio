import { featured, matchingFeatured, searchStations, secureUrl } from './stations.js?v=20261121-7';
import { readCookie, writeCookie, readFavorites, validStation, clearCookies } from './cookies.js?v=20261121-7';

const $ = id => document.getElementById(id);
const colors = ['lime', 'purple', 'orange', 'blue', 'pink', 'yellow'];
let favorites = readFavorites();
let defaultStation = readCookie('default');
if (!validStation(defaultStation)) defaultStation = null;
let selected = defaultStation || featured[0];
let view = 'discover', genre = 'All stations', results = null, loading = false;
let status = 'idle', request, timeout, generation = 0;
let playbackWanted = false;
let audio = $('audio');
const savedVolume = readCookie('volume');
let volume = typeof savedVolume === 'number' && savedVolume >= 0 && savedVolume <= 1 ? savedVolume : 0.7;
let muted = readCookie('muted') === true;
let largeText = readCookie('large_text') === true;
const deviceVolume = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[c]));
const color = station => colors.includes(station.color) ? station.color : 'lime';
const isSaved = station => favorites.some(s => s.id === station.id);
const isDefault = station => defaultStation?.id === station.id;

function notice(id, message = '') { $(id).textContent = message; $(id).hidden = !message; }
function persist(key, value) {
  const success = writeCookie(key, value);
  if (!success) notice('storage-error', 'This browser could not save the setting. Allow cookies for this site. If storage is full, remove a saved station and try again.');
  return success;
}
function artwork(station, large = false) {
  const logo = secureUrl(station.logo);
  return `<div class="artwork ${color(station)} ${large ? 'large' : ''}"><span class="art-ring"></span><span class="art-ring second"></span><span class="art-symbol">${escapeHtml(station.name.split(/\s+/).slice(0, 2).map(s => s[0]).join(''))}</span>${logo ? `<img src="${escapeHtml(logo)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<span class="art-genre">${escapeHtml(station.genre || 'Radio')}</span></div>`;
}
document.addEventListener('error', event => { if (event.target instanceof HTMLImageElement) event.target.remove(); }, true);

function renderPlayer() {
  $('station-name').textContent = selected.name;
  $('station-detail').textContent = `${selected.country || 'International'} · ${selected.genre || 'Radio'}`;
  $('station-art').innerHTML = artwork(selected, true);
  $('main-player').className = `main-player ${color(selected)}`;
  $('save-current').textContent = isSaved(selected) ? 'Saved station' : 'Save station';
  $('save-current').setAttribute('aria-label', isSaved(selected) ? `Saved station: ${selected.name}. Remove from favorites` : `Save station: ${selected.name}`);
  $('save-current').setAttribute('aria-pressed', isSaved(selected));
  $('default-current').textContent = isDefault(selected) ? 'Default station' : 'Set as default';
  $('default-current').setAttribute('aria-label', isDefault(selected) ? `Default station: ${selected.name}. Remove as default` : `Set as default: ${selected.name}`);
  $('default-current').setAttribute('aria-pressed', isDefault(selected));
  $('default-current').title = isDefault(selected) ? 'Remove the default station' : 'Play this station when you return';
  $('default-note').textContent = defaultStation ? `On return: ${defaultStation.name}. Playback starts if your browser allows it.` : 'Set a default station to play when you return.';
  const homepage = secureUrl(selected.homepage);
  $('station-site').hidden = !homepage;
  if (homepage) $('station-site').href = homepage;
  updatePlayback();
}
function updatePlayback() {
  const active = status === 'playing' || status === 'loading';
  const statusText = {idle:'Ready to play', loading:'Connecting…', playing:'Playing live', paused:'Paused', error:'Station unavailable'}[status];
  $('play-status').textContent = statusText;
  const announcement = `${selected.name}. ${statusText}`;
  if ($('playback-announcement').textContent !== announcement) $('playback-announcement').textContent = announcement;
  $('play-icon').textContent = active ? 'Ⅱ' : '▶';
  $('play-label').textContent = active ? 'Pause' : 'Play';
  $('play-button').setAttribute('aria-label', `${active ? 'Pause' : 'Play'} ${selected.name}`);
  $('main-player').classList.toggle('is-playing', status === 'playing');
  document.title = `${status === 'playing' ? selected.name + ' — ' : ''}Airwave Radio`;
  document.querySelectorAll('[data-play]').forEach(button => {
    const station = displayed()[Number(button.dataset.play)];
    const current = station?.id === selected.id;
    button.textContent = current && active ? 'Pause' : 'Play station';
    button.setAttribute('aria-label', `${current && active ? 'Pause' : 'Play station:'} ${station?.name || 'station'}`);
    button.closest('.station-card').classList.toggle('is-current', current);
  });
}
function stop(nextStatus = 'paused') {
  playbackWanted = false;
  generation++;
  clearTimeout(timeout);
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  status = nextStatus;
  updatePlayback();
}
function fail(message) {
  stop('error');
  notice('play-error', message);
}
function armTimeout(token) {
  clearTimeout(timeout);
  timeout = setTimeout(() => { if (generation === token) fail('The station did not respond. Press Play to retry, or select another station.'); }, 20000);
}
async function play(station) {
  stop();
  playbackWanted = true;
  selected = station;
  notice('play-error');
  const token = generation;
  const nextAudio = new Audio();
  nextAudio.id = 'audio';
  nextAudio.preload = 'none';
  nextAudio.setAttribute('playsinline', '');
  nextAudio.volume = volume;
  nextAudio.muted = muted;
  audio.replaceWith(nextAudio);
  audio = nextAudio;
  const current = callback => () => { if (generation === token) callback(); };
  nextAudio.addEventListener('playing', current(() => { clearTimeout(timeout); status = 'playing'; notice('play-error'); updatePlayback(); }));
  nextAudio.addEventListener('waiting', current(() => { status = 'loading'; updatePlayback(); armTimeout(token); }));
  nextAudio.addEventListener('pause', current(() => { clearTimeout(timeout); status = 'paused'; updatePlayback(); }));
  nextAudio.addEventListener('error', current(() => fail('This stream cannot play. Press Play to retry, or select another station.')));
  nextAudio.addEventListener('ended', current(() => fail('The stream ended. Press Play to reconnect.')));
  status = 'loading';
  renderPlayer();
  armTimeout(token);
  nextAudio.src = station.url;
  await startAudio(token);
}
async function startAudio(token) {
  try { await audio.play(); }
  catch (error) {
    if (generation !== token) return;
    if (error.name === 'NotAllowedError') {
      stop('idle');
      notice('play-error', 'Your browser blocked automatic audio. Press the large Play button to start this station.');
    } else fail('This stream cannot play. Press Play to retry, or select another station.');
  }
}
function resumeAudio() {
  if (document.visibilityState === 'hidden' || !playbackWanted || !audio.paused) return;
  status = 'loading';
  updatePlayback();
  armTimeout(generation);
  // Reuse the audio element that the user already permitted to play.
  startAudio(generation);
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  // A Home Screen app often resumes its existing document instead of loading again.
  setPlayerView(true, true);
  resumeAudio();
});
globalThis.addEventListener?.('pageshow', event => {
  setPlayerView(true, !!event.persisted);
  globalThis.scrollTo?.({top:0,behavior:'instant'});
  if (event.persisted) resumeAudio();
});
if (globalThis.history && 'scrollRestoration' in globalThis.history) globalThis.history.scrollRestoration = 'manual';
function togglePlay(station = selected) {
  if (station.id === selected.id && (status === 'playing' || status === 'loading')) { stop(); notice('play-error'); }
  else play(station);
}
function toggleFavorite(station) {
  if (isSaved(station)) {
    if (!persist(`station_${station.id}`, null)) return;
    favorites = favorites.filter(s => s.id !== station.id);
    if (isDefault(station) && persist('default', null)) defaultStation = null;
  } else {
    if (favorites.length >= 30) { notice('storage-error', 'You can save up to 30 stations. Remove a station before you add another.'); return; }
    if (!persist(`station_${station.id}`, station)) return;
    favorites.push(station);
  }
  renderPlayer(); renderStations();
  $('settings-status').textContent = `${station.name} ${isSaved(station) ? 'saved to' : 'removed from'} favorites.`;
}
function toggleDefault() {
  if (isDefault(selected)) { if (persist('default', null)) defaultStation = null; }
  else {
    if (!isSaved(selected)) toggleFavorite(selected);
    if (isSaved(selected) && persist('default', selected)) defaultStation = selected;
  }
  renderPlayer(); renderStations();
  $('settings-status').textContent = defaultStation ? `${defaultStation.name} is the default station.` : 'The default station was removed.';
}
function displayed() { return view === 'favorites' ? favorites : results ?? featured; }
function renderStations() {
  const focused = document.activeElement;
  const focusAction = focused?.dataset?.save !== undefined ? 'save' : 'play';
  const focusIndex = focused?.dataset?.[focusAction];
  const focusStationId = focused?.dataset?.stationId;
  $('favorite-count').textContent = favorites.length;
  $('discover').classList.toggle('active', view === 'discover');
  $('favorites').classList.toggle('active', view === 'favorites');
  $('discover').setAttribute('aria-pressed', view === 'discover');
  $('favorites').setAttribute('aria-pressed', view === 'favorites');
  $('browse-controls').hidden = view === 'favorites';
  $('list-title').textContent = view === 'favorites' ? 'Your saved stations' : results !== null ? 'Search results' : 'Featured stations';
  const countText = `${displayed().length} ${displayed().length === 1 ? 'station' : 'stations'}`;
  $('result-count').textContent = loading && view === 'discover' ? (results ? `${countText} found. Searching the directory…` : 'Searching…') : countText;
  document.querySelectorAll('[data-genre]').forEach(button => {
    button.setAttribute('aria-pressed', button.dataset.genre === genre);
    button.classList.toggle('selected', button.dataset.genre === genre);
  });
  if (loading && results === null && view === 'discover') { $('stations').innerHTML = '<div class="empty">Loading the station directory…</div>'; return; }
  if (!displayed().length) {
    $('stations').innerHTML = `<div class="empty"><h3>${view === 'favorites' ? 'No saved stations yet' : 'No stations found'}</h3><p>${view === 'favorites' ? 'Use Save station to save a station.' : 'Try another station name or genre.'}</p><button data-reset>Browse featured stations</button></div>`;
    if (focusIndex !== undefined) $('list-title').focus();
    return;
  }
  $('stations').innerHTML = displayed().map((station, index) => `<article class="station-card"><div class="card-art" aria-hidden="true">${artwork(station)}</div><div class="card-details"><h3>${escapeHtml(station.name)}</h3><p>${escapeHtml(station.country || 'International')} · ${escapeHtml(station.genre || 'Radio')}</p><div class="card-bottom"><span>${escapeHtml(station.provider || 'Radio')}</span>${isDefault(station) ? '<span class="default-badge">Default station</span>' : ''}</div></div><div class="card-actions"><button class="card-play" data-play="${index}" data-station-id="${escapeHtml(station.id)}">Play station</button><button class="favorite-button ${isSaved(station) ? 'saved' : ''}" data-save="${index}" data-station-id="${escapeHtml(station.id)}" aria-label="${isSaved(station) ? 'Saved station' : 'Save station'}: ${escapeHtml(station.name)}${isSaved(station) ? '. Remove from favorites' : ''}" aria-pressed="${isSaved(station)}">${isSaved(station) ? 'Saved' : 'Save station'}</button></div></article>`).join('');
  updatePlayback();
  if (focusIndex !== undefined) {
    const buttons = [...document.querySelectorAll(`[data-${focusAction}]`)];
    const target = buttons.find(button => button.dataset.stationId === focusStationId) || buttons[Math.min(Number(focusIndex), buttons.length - 1)];
    target?.focus({preventScroll:true});
  }
}
async function search() {
  request?.abort();
  const controller = new AbortController();
  request = controller;
  const local = matchingFeatured($('query').value.trim(), genre);
  loading = true; results = local.length ? local : null;
  notice('directory-error'); renderStations();
  try { const rows = await searchStations($('query').value.trim(), genre, controller.signal); if (!controller.signal.aborted) results = rows; }
  catch (error) { if (!controller.signal.aborted) notice('directory-error', error.message); }
  finally { if (!controller.signal.aborted) { loading = false; renderStations(); } }
}
function reset() { request?.abort(); loading = false; results = null; genre = 'All stations'; view = 'discover'; $('query').value = ''; notice('directory-error'); renderStations(); }
function updateVolume() {
  audio.volume = volume; audio.muted = muted;
  $('volume').value = Math.round(volume * 100);
  $('volume-value').textContent = `${muted ? 0 : Math.round(volume * 100)}%`;
  $('volume').setAttribute('aria-valuetext', `${Math.round(volume * 100)} percent${muted ? ', muted' : ''}`);
  $('volume-slider').hidden = deviceVolume;
  $('device-volume').hidden = !deviceVolume;
  $('mute').textContent = muted ? 'Unmute audio' : 'Mute audio';
  $('mute').setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');
  $('mute').setAttribute('aria-pressed', muted);
}
function updateTextSize() {
  document.documentElement.classList.toggle('large-text', largeText);
  $('large-text').setAttribute('aria-pressed', largeText);
}
function setPlayerView(enabled, moveFocus = false) {
  document.documentElement.classList.toggle('player-focus', enabled);
  if (moveFocus) {
    (enabled ? $('play-button') : $('focus-player')).focus({preventScroll:true});
    globalThis.scrollTo?.({top:0,behavior:'instant'});
  }
}
$('focus-player').addEventListener('click', () => setPlayerView(true, true));
$('player-settings').addEventListener('click', () => setPlayerView(false, true));
document.querySelectorAll('.back-to-player, .skip-link').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  setPlayerView(true, true);
}));
$('large-text').addEventListener('click', () => {
  largeText = !largeText;
  updateTextSize();
  persist('large_text', largeText);
  $('settings-status').textContent = largeText ? 'Larger text is on.' : 'Larger text is off.';
});
$('play-button').addEventListener('click', () => togglePlay());
$('save-current').addEventListener('click', () => toggleFavorite(selected));
$('default-current').addEventListener('click', toggleDefault);
$('search-form').addEventListener('submit', e => { e.preventDefault(); search(); });
$('discover').addEventListener('click', reset);
$('favorites').addEventListener('click', () => { view = 'favorites'; notice('directory-error'); renderStations(); });
$('genres').addEventListener('click', e => { const button = e.target.closest('[data-genre]'); if (!button) return; genre = button.dataset.genre; if (genre === 'All stations' && !$('query').value.trim()) reset(); else search(); });
$('stations').addEventListener('click', e => {
  const button = e.target.closest('button');
  if (!button) return;
  if ('reset' in button.dataset) reset();
  if ('play' in button.dataset) togglePlay(displayed()[Number(button.dataset.play)]);
  if ('save' in button.dataset) toggleFavorite(displayed()[Number(button.dataset.save)]);
});
$('volume').addEventListener('input', e => { volume = Number(e.target.value) / 100; muted = false; updateVolume(); });
$('volume').addEventListener('change', () => { persist('volume', volume); persist('muted', muted); });
$('mute').addEventListener('click', () => { muted = !muted; updateVolume(); persist('muted', muted); });
$('clear-settings').addEventListener('click', () => {
  if (!clearCookies()) { notice('storage-error', 'The browser could not remove all saved settings. Clear this site’s cookies in your browser settings.'); return; }
  favorites = []; defaultStation = null; volume = 0.7; muted = false; largeText = false;
  notice('storage-error', 'Saved settings were cleared.'); updateVolume(); updateTextSize(); renderPlayer(); renderStations();
});
$('genres').innerHTML = ['All stations','Jazz','Chill','Rock','Electronic','Classical','News'].map(g => `<button data-genre="${g}" aria-pressed="false" class="chip">${g}</button>`).join('');
updateTextSize(); renderPlayer(); renderStations(); updateVolume();
setPlayerView(true);
if (defaultStation) play(defaultStation);
