import { secureUrl } from './stations.js?v=20261121-5';

export const cookiePrefix = 'airwave_';
const cookiePath = new URL('.', location.href).pathname;
function entries() {
  try { return document.cookie.split(';').map(s => s.trim().split(/=(.*)/s)).filter(([name]) => name.startsWith(cookiePrefix)); }
  catch { return []; }
}
export function readCookie(name) {
  try { return JSON.parse(decodeURIComponent(entries().find(([key]) => key === cookiePrefix + name)?.[1] || 'null')); }
  catch { return null; }
}
export function writeCookie(name, value) {
  try {
    const encoded = value === null ? '' : encodeURIComponent(JSON.stringify(value));
    if (encoded.length + name.length > 3700) return false;
    const otherSize = entries().filter(([key]) => key !== cookiePrefix + name).reduce((size, [key, data]) => size + key.length + data.length + 2, 0);
    if (value !== null && otherSize + encoded.length + name.length + cookiePrefix.length > 6000) return false;
    document.cookie = `${cookiePrefix}${name}=${encoded}; Path=${cookiePath}; Max-Age=${value === null ? 0 : 31536000}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    return value === null ? readCookie(name) === null : JSON.stringify(readCookie(name)) === JSON.stringify(value);
  } catch { return false; }
}
export function validStation(s) {
  return s && typeof s.id === 'string' && /^[a-zA-Z0-9-]+$/.test(s.id) && typeof s.name === 'string' && s.name.length > 0 && !!secureUrl(s.url);
}
export function readFavorites() {
  return entries().filter(([name]) => name.startsWith(cookiePrefix + 'station_')).map(([name]) => readCookie(name.slice(cookiePrefix.length))).filter(validStation);
}
export function clearCookies() {
  let success = true;
  for (const [name] of entries()) if (!writeCookie(name.slice(cookiePrefix.length), null)) success = false;
  return success;
}
