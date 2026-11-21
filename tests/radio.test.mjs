import test from 'node:test';
import assert from 'node:assert/strict';
import { featured, matchingFeatured, normalizeStations, searchStations, secureUrl } from '../dist/stations.js';

test('station results reject unsafe streams and remove duplicate streams', () => {
  const row = { stationuuid:'one', name:' KEXP ', url_resolved:'https://example.com/radio', favicon:'javascript:alert(1)' };
  assert.deepEqual(normalizeStations([row, {...row,stationuuid:'two'}, {...row,url_resolved:'http://example.com'}, {...row,url_resolved:'https://example.com/hls',hls:1}]).map(s => [s.name,s.logo]), [['KEXP','']]);
  assert.equal(secureUrl('https://user:password@example.com'), '');
});

test('directory falls back to another server and encodes station names', async () => {
  const oldFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async url => { calls.push(url); if (calls.length === 1) throw new Error('offline'); return {ok:true,json:async()=>[{stationuuid:'test',name:'A&B',url_resolved:'https://example.com/live'}]}; };
  try {
    const result = await searchStations('A&B','Jazz',new AbortController().signal);
    assert.equal(result.length,1);
    assert.equal(calls.length,2);
    assert.notEqual(new URL(calls[0]).hostname,new URL(calls[1]).hostname);
    assert.equal(new URL(calls[1]).searchParams.get('name'),'A&B');
    assert.equal(new URL(calls[1]).searchParams.get('tag'),'jazz');
  } finally { globalThis.fetch = oldFetch; }
});

test('cancelled searches do not retry', async () => {
  const oldFetch = globalThis.fetch;
  const controller = new AbortController();
  let calls = 0;
  globalThis.fetch = async () => { calls++; controller.abort(); throw new DOMException('Aborted','AbortError'); };
  try { await assert.rejects(searchStations('test','All stations',controller.signal)); assert.equal(calls,1); }
  finally { globalThis.fetch = oldFetch; }
});

test('WMEX search uses its secure direct stream when the directory is empty or unavailable', async () => {
  assert.equal(matchingFeatured(' WMEX ', 'All stations')[0].id, 'wmex-lp-1059');
  const oldFetch = globalThis.fetch;
  try {
    for (const unavailable of [false, true]) {
      globalThis.fetch = async () => {
        if (unavailable) throw new Error('offline');
        return {ok:true,json:async()=>[]};
      };
      const stations = await searchStations('WMEX','All stations',new AbortController().signal);
      assert.equal(stations.length,1);
      assert.equal(stations[0].country,'Rochester, New Hampshire');
      assert.equal(stations[0].url,'https://broadcast.shoutcheap.com/proxy/rochest1/stream');
    }
    globalThis.fetch = async () => ({ok:true,json:async()=>[]});
    assert.equal((await searchStations('WMEX','Jazz',new AbortController().signal)).length,0);
  } finally { globalThis.fetch = oldFetch; }
});

test('cookies restore multiple stations, default, and volume; clear preserves unrelated cookies', async () => {
  const jar = new Map([['unrelated','keep']]);
  globalThis.location = new URL('https://example.com/radio/');
  globalThis.document = {
    get cookie() { return [...jar].map(([k,v]) => `${k}=${v}`).join('; '); },
    set cookie(value) { const [pair] = value.split(';'); const split = pair.indexOf('='); const key = pair.slice(0,split); if (value.includes('Max-Age=0;')) jar.delete(key); else jar.set(key,pair.slice(split+1)); }
  };
  const {writeCookie,readCookie,readFavorites,clearCookies} = await import('../dist/cookies.js');
  assert.equal(writeCookie('station_groovesalad',featured[0]),true);
  assert.equal(writeCookie('station_dronezone',featured[1]),true);
  assert.equal(writeCookie('default',featured[1]),true);
  assert.equal(writeCookie('volume',0.4),true);
  assert.equal(readFavorites().length,2);
  assert.equal(readCookie('default').id,'dronezone');
  assert.equal(readCookie('volume'),0.4);
  jar.set('airwave_station_broken','%bad');
  assert.equal(readFavorites().length,2);
  assert.equal(writeCookie('too_large','x'.repeat(4000)),false);
  assert.equal(clearCookies(),true);
  assert.equal(readFavorites().length,0);
  assert.equal(readCookie('default'),null);
  assert.equal(jar.get('unrelated'),'keep');
});

test('iPhone settings restore, autoplay recovers, and WMEX appears before the network responds', async () => {
  const jar = new Map([['airwave_default',encodeURIComponent(JSON.stringify(featured[1]))],['airwave_volume','0.4'],['airwave_large_text','true']]);
  const elements = new Map();
  const rootClasses = new Set();
  Object.defineProperty(globalThis, 'navigator', {configurable:true,value:{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5}});
  function element(id) { if (!elements.has(id)) elements.set(id,{id,textContent:'',innerHTML:'',hidden:false,value:'',dataset:{},classList:{toggle(){}},listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(name,value){this[name]=value;},removeAttribute(){},pause(){},load(){},replaceWith(next){elements.set(id,next);}}); return elements.get(id); }
  globalThis.document = {documentElement:{classList:{toggle(name,on){if(on) rootClasses.add(name);else rootClasses.delete(name);}}},getElementById:element,querySelectorAll:()=>[],addEventListener(){},get cookie(){return [...jar].map(([k,v])=>`${k}=${v}`).join('; ');},set cookie(value){ const pair=value.split(';')[0];const i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1)); }};
  let playedUrl;
  globalThis.Audio = class {constructor(){Object.assign(this,element('new-audio'));} async play(){playedUrl=this.src;throw new DOMException('Blocked','NotAllowedError');}};
  await import('../dist/app.js');
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(playedUrl,featured[1].url);
  assert.equal(element('station-name').textContent,'Drone Zone');
  assert.equal(element('play-label').textContent,'Play');
  assert.match(element('play-error').textContent,/Press the large Play button/);
  assert.equal(rootClasses.has('player-focus'),true,'blocked autoplay must not exit Player view');
  assert.equal(element('volume-value').textContent,'40%');
  assert.equal(element('volume-slider').hidden,true);
  assert.equal(element('device-volume').hidden,false);
  assert.equal(rootClasses.has('large-text'),true);
  element('large-text').listeners.click();
  assert.equal(rootClasses.has('large-text'),false);
  assert.equal(jar.get('airwave_large_text'),'false');
  element('large-text').listeners.click();
  assert.equal(jar.get('airwave_large_text'),'true');
  assert.equal(element('play-button')['aria-label'],'Play Drone Zone');
  const oldFetch = globalThis.fetch;
  let resolveFetch;
  globalThis.fetch = () => new Promise(resolve => {resolveFetch = resolve;});
  try {
    element('query').value = 'WMEX';
    element('search-form').listeners.submit({preventDefault(){}});
    assert.match(element('stations').innerHTML,/WMEX-LP 105\.9 FM/);
    assert.match(element('result-count').textContent,/Searching the directory/);
    resolveFetch({ok:true,json:async()=>[]});
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.match(element('stations').innerHTML,/WMEX-LP 105\.9 FM/);
    assert.equal(element('result-count').textContent,'1 station');
  } finally { globalThis.fetch = oldFetch; }
});
