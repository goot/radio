import test from 'node:test';
import assert from 'node:assert/strict';
import { featured } from '../dist/stations.js';

test('startup opens Player view without an orientation requirement and plays the saved default; resume keeps a user pause', async () => {
  const station = featured.find(s => s.id === 'wmex-lp-1059');
  const jar = new Map([['airwave_default', encodeURIComponent(JSON.stringify(station))]]);
  const rootClasses = new Set();
  const elements = new Map();
  const documentListeners = new Map();
  const windowListeners = new Map();
  let focus;
  let plays = 0;
  globalThis.location = new URL('https://example.com/radio/');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5}});
  globalThis.addEventListener = (name, fn) => windowListeners.set(name,fn);
  globalThis.scrollTo = () => {};
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      id, textContent:'', innerHTML:'', hidden:false, value:'', dataset:{}, listeners:{},
      classList:{toggle(){}}, setAttribute(name,value){this[name]=value;},
      addEventListener(name,fn){this.listeners[name]=fn;},
      focus(){focus=id;}, removeAttribute(){}, pause(){}, load(){},
      replaceWith(next){elements.set(id,next);},
    });
    return elements.get(id);
  }
  globalThis.document = {
    visibilityState:'visible',
    documentElement:{classList:{toggle(name,on){if(on) rootClasses.add(name); else rootClasses.delete(name);}}},
    getElementById:element, querySelectorAll:()=>[],
    addEventListener(name,fn){documentListeners.set(name,fn);},
    get cookie(){return [...jar].map(([k,v])=>`${k}=${v}`).join('; ');},
  };
  globalThis.Audio = class {
    constructor(){this.listeners={};this.paused=true;}
    addEventListener(name,fn){this.listeners[name]=fn;}
    setAttribute(name,value){this[name]=value;}
    removeAttribute(name){delete this[name];}
    load(){}
    replaceWith(next){elements.set('audio',next);}
    pause(){this.paused=true;this.listeners.pause?.();}
    async play(){plays++;this.paused=false;this.listeners.playing?.();}
  };
  await import('../dist/app.js');
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(plays,1,'startup must call play without a click');
  assert.equal(element('audio').src,station.url);
  assert.equal(element('play-label').textContent,'Pause');
  assert.equal(rootClasses.has('player-focus'),true);

  element('player-settings').listeners.click();
  assert.equal(rootClasses.has('player-focus'),false);
  assert.equal(focus,'focus-player');
  element('focus-player').listeners.click();
  assert.equal(rootClasses.has('player-focus'),true);
  assert.equal(focus,'play-button');
  assert.equal(plays,1,'changing views must not restart the stream');

  const activeAudio = element('audio');
  activeAudio.paused=true;
  document.visibilityState='hidden';
  documentListeners.get('visibilitychange')();
  assert.equal(plays,1);
  document.visibilityState='visible';
  documentListeners.get('visibilitychange')();
  assert.equal(plays,2);
  assert.equal(element('audio'),activeAudio,'resume must reuse the permitted audio element');

  element('play-button').listeners.click();
  assert.equal(element('play-label').textContent,'Play');
  documentListeners.get('visibilitychange')();
  windowListeners.get('pageshow')({persisted:true});
  assert.equal(plays,2,'manual pause must prevent foreground and page-cache resume');
});
