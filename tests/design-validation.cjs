const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),postcss=require('postcss');
const homepage=fs.readFileSync('index.html','utf8');
const homeAlias=fs.readFileSync('home.html','utf8');
const app=fs.readFileSync('app.html','utf8');
assert.equal(homepage,homeAlias,'The root homepage must be the exact uploaded file; /home.html remains an identical alias.');
for(const token of ['WashPilot — Carwash Management Solutions & Pricing','id="scene"','id="lanes"','class="bento"','class="pricing"','class="closing"','id="dock"','three.min.js']){
  assert.ok(homepage.includes(token),'Uploaded homepage content missing: '+token);
}
for(const token of ['function applyRoute()','function dashboardPage()','function initRealAuth()','wpRouteIsWorkspace','washPilotBookingApi']){
  assert.ok(app.includes(token),'Preserved application entry is missing: '+token);
}
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
assert.ok(config.rewrites?.some(rule=>rule.source==='/:path+'&&rule.destination==='/app.html'),'Non-file application routes must fall back to app.html.');
const sharedPages=['app','dashboard','pos','signin','signup','forgot','404'];
for(const name of sharedPages){
  const html=fs.readFileSync(name+'.html','utf8');
  assert.match(html,/\/washpilot-design\.css\?v=/,'Shared app theme missing from '+name+'.html');
  for(const script of new JSDOM(html).window.document.querySelectorAll('script:not([src])')){
    new vm.Script(script.textContent,{filename:name+'.html:inline'});
  }
}
postcss.parse(fs.readFileSync('washpilot-design.css','utf8'));
console.log('PASS: exact uploaded homepage, app fallback, preserved app routes, shared app styles and CSS parsing.');

const dom=new JSDOM('<!doctype html><body><button id="trigger">Add service</button><div class="field"><label>Name</label><input></div><nav class="nav"><button data-page="dashboard" class="active">Dashboard</button></nav><div class="table-wrap"><table></table></div><div id="toast"></div><div id="modalBackdrop" style="display:none"><div class="modal" id="modal"><h2>Add service</h2><button class="close">×</button><input id="name"><button id="save">Save</button></div></div></body>',{runScripts:'outside-only',pretendToBeVisual:true});
const {window:w}=dom,d=w.document;
w.HTMLElement.prototype.getClientRects=function(){for(let e=this;e;e=e.parentElement){if(e.style.display==='none')return [];}return [{width:10,height:10}];};
w.eval(fs.readFileSync('washpilot-accessibility.js','utf8'));
const wait=()=>new Promise(r=>setTimeout(r,60));
(async()=>{
  await wait();
  assert.equal(d.querySelector('label').htmlFor,d.querySelector('.field input').id);
  assert.equal(d.querySelector('[data-page]').getAttribute('aria-current'),'page');
  assert.equal(d.querySelector('.table-wrap').tabIndex,0);
  assert.equal(d.querySelector('#toast').getAttribute('role'),'status');
  d.querySelector('#trigger').focus();d.querySelector('#modalBackdrop').style.display='block';await wait();
  assert.equal(d.querySelector('#modal').getAttribute('role'),'dialog');
  assert.equal(d.activeElement.className,'close');
  d.querySelector('#save').focus();d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(d.activeElement.className,'close');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));assert.equal(d.activeElement.id,'save');
  d.querySelector('.close').addEventListener('click',()=>{d.querySelector('#modalBackdrop').style.display='none';});
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await wait();
  assert.equal(d.activeElement.id,'trigger');
  console.log('PASS: labels, current navigation, keyboard tables, live toast and dialog keyboard accessibility.');
  dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1;});
