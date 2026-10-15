// Minimal CDP driver: open a page, run setup JS, wait, screenshot. Usage: node shoot.mjs <out.png> <url> <width> <height> <waitMs> <js>
import {spawn} from 'node:child_process';
import fs from 'node:fs';
const [out,url,w,h,wait,js]=process.argv.slice(2);
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--remote-debugging-port=9333','--user-data-dir='+process.env.TMPDIR+'/cdp-profile-'+process.pid,'--hide-scrollbars','--no-first-run','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let target;
for(let i=0;i<50&&!target;i++){await sleep(200);try{const list=await (await fetch('http://127.0.0.1:9333/json')).json();target=list.find(t=>t.type==='page');}catch{}}
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const pending=new Map();const events=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}else events.push(m);};
const send=(method,params={})=>new Promise(r=>{const i=++id;pending.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
await send('Page.enable');await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:+w,height:+h,deviceScaleFactor:1,mobile:+w<600});
await send('Page.navigate',{url});await sleep(1200);
if(js){const r=await send('Runtime.evaluate',{expression:js,awaitPromise:true});if(r.result?.exceptionDetails)console.error(JSON.stringify(r.result.exceptionDetails));}
await sleep(+wait);
const errs=events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Runtime.consoleAPICalled'&&e.params.type==='error'));
if(errs.length)console.error('PAGE ERRORS',JSON.stringify(errs).slice(0,800));
const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
fs.writeFileSync(out,Buffer.from(shot.result.data,'base64'));
ws.close();chrome.kill();console.log('saved',out);
