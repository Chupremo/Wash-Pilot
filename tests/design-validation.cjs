const fs=require('node:fs'), cp=require('node:child_process'), assert=require('node:assert/strict'), vm=require('node:vm');
const {JSDOM}=require('jsdom'), postcss=require('postcss');
const root=require('node:path').resolve(__dirname,'..'); process.chdir(root);
const names=['index','home','signin','signup','forgot','dashboard','pos','404'];
for(const name of names){
 const before=cp.execFileSync('git',['show','51cdaf3b37304104b27a17ed04b1cb9572cd952c:'+name+'.html'],{encoding:'utf8'});
 const after=fs.readFileSync(name+'.html','utf8');
 const restored=after.replace(/<link rel="stylesheet" href="\/washpilot-design\.css\?v=[^"]+">\n/,'').replace(/<script src="\/washpilot-accessibility\.js\?v=[^"]+" defer><\/script>\n/,'').replace(/<body class="wp-page-[a-z]+">/,'<body>');
 assert.equal(restored,before,name+': all existing content, scripts, routes and handlers preserved exactly');
 const dom=new JSDOM(after);
 for(const script of dom.window.document.querySelectorAll('script:not([src])')) new vm.Script(script.textContent);
 dom.window.close();
}
postcss.parse(fs.readFileSync('washpilot-design.css','utf8'));
const theme=fs.readFileSync('washpilot-design.css','utf8');
for(const token of ['--navy:#081d37','--blue:#ffbd2e','--bg:#edf3f7','--line:#dce6ef','--font:Inter']){
 assert.ok(theme.includes(token),'shared sandbox design token missing: '+token);
}
for(const name of names){
 const html=fs.readFileSync(name+'.html','utf8');
 assert.match(html,/\/washpilot-design\.css\?v=20261115-sandbox-sync/,'shared theme is missing or stale on '+name);
}
console.log('PASS: sandbox visual tokens and shared stylesheet are referenced by all 8 production entry pages.');

console.log('PASS: all 8 HTML documents retain original contents byte-for-byte after removing design hooks; inline JS and shared CSS parse.');
const dom=new JSDOM(`<!doctype html><body><button id="trigger">Add service</button><div class="field"><label>Name</label><input></div><nav class="nav"><button data-page="dashboard" class="active">Dashboard</button></nav><div class="table-wrap"><table></table></div><div id="toast"></div><div id="modalBackdrop" style="display:none"><div class="modal" id="modal"><h2>Add service</h2><button class="close">×</button><input id="name"><button id="save">Save</button></div></div></body>`,{runScripts:'outside-only',pretendToBeVisual:true});
const {window:w}=dom,d=w.document;
w.HTMLElement.prototype.getClientRects=function(){for(let e=this;e;e=e.parentElement){if(e.style.display==='none')return []}return [{width:10,height:10}]};
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
 d.querySelector('.close').addEventListener('click',()=>{d.querySelector('#modalBackdrop').style.display='none'});
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await wait();
 assert.equal(d.activeElement.id,'trigger');
 console.log('PASS: generated labels, current navigation, keyboard-scrollable tables, live toast, dialog name/focus trap/Escape/focus restoration.');
 dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});
