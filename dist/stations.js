export const featured = [
  { id: 'groovesalad', name: 'Groove Salad', genre: 'Chill', detail: 'Ambient sounds and downtempo beats.', color: 'lime', country: 'United States' },
  { id: 'dronezone', name: 'Drone Zone', genre: 'Ambient', detail: 'Slow sounds for quiet moments.', color: 'purple', country: 'United States' },
  { id: 'indiepop', name: 'Indie Pop Rocks!', genre: 'Indie', detail: 'Independent music, old and new.', color: 'orange', country: 'United States' },
  { id: 'secretagent', name: 'Secret Agent', genre: 'Electronic', detail: 'Electronic music and lounge sounds.', color: 'blue', country: 'United States' },
  { id: 'deepspaceone', name: 'Deep Space One', genre: 'Ambient', detail: 'Ambient and experimental music.', color: 'pink', country: 'United States' },
  { id: 'bootliquor', name: 'Boot Liquor', genre: 'Country', detail: 'Americana, roots, and country music.', color: 'yellow', country: 'United States' },
].map(s => ({ ...s, url: `https://ice6.somafm.com/${s.id}-128-mp3`, homepage: `https://somafm.com/${s.id}/`, provider: 'SomaFM' }));

// The directory resolves WMEX's playlist to HTTP. Use the provider's verified HTTPS stream.
featured.push({
  id: 'wmex-lp-1059',
  name: 'WMEX-LP 105.9 FM',
  genre: 'Oldies',
  country: 'Rochester, New Hampshire',
  color: 'blue',
  url: 'https://broadcast.shoutcheap.com/proxy/rochest1/stream',
  homepage: 'https://1059wmex.com/',
  logo: 'https://img1.wsimg.com/isteam/ip/fd2ab2f7-88f9-4450-aac5-a0b05f494bbc/WMEX%20LOGO%20W-80S.PNG',
  provider: 'WMEX',
});

export function secureUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; }
  catch { return ''; }
}

export function normalizeStations(rows) {
  const seen = new Set();
  return rows.flatMap((s, i) => {
    const url = secureUrl(s.url_resolved || s.url);
    if (!url || !s.stationuuid || !s.name?.trim() || s.hls || seen.has(url)) return [];
    seen.add(url);
    return [{ id: s.stationuuid, name: s.name.trim(), url, logo: secureUrl(s.favicon), homepage: secureUrl(s.homepage), country: s.country || s.countrycode || 'International', genre: s.tags?.split(',').filter(Boolean)[0] || 'Radio', detail: s.language || 'Live radio', provider: 'Radio Browser', color: ['lime', 'purple', 'orange', 'blue', 'pink', 'yellow'][i % 6] }];
  });
}

export function matchingFeatured(query, genre) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return featured.filter(station => {
    const text = `${station.name} ${station.country} ${station.genre}`.toLowerCase();
    return terms.every(term => text.includes(term)) && (genre === 'All stations' || station.genre.toLowerCase() === genre.toLowerCase());
  });
}

export async function searchStations(query, genre, signal) {
  signal.throwIfAborted();
  const local = matchingFeatured(query, genre);
  const params = new URLSearchParams({ name: query, hidebroken: 'true', order: 'votes', reverse: 'true', limit: '100', is_https: 'true' });
  if (genre !== 'All stations') params.set('tag', genre.toLowerCase());
  const servers = ['https://de1.api.radio-browser.info', 'https://nl1.api.radio-browser.info'];
  if (Math.random() > 0.5) servers.reverse();
  for (const server of servers) {
    try {
      const response = await fetch(`${server}/json/stations/search?${params}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(9000)]) });
      if (!response.ok) throw new Error('Directory request failed');
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Invalid station list');
      const seenUrls = new Set(local.map(station => station.url));
      return [...local, ...normalizeStations(rows).filter(station => !seenUrls.has(station.url))];
    } catch (error) { if (signal.aborted) throw error; }
  }
  if (local.length) return local;
  throw new Error('The station directory is unavailable. Try again, or play a featured station.');
}

