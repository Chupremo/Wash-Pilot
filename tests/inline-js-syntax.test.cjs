const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
if(!scripts.length)throw new Error('No inline scripts found');
scripts.forEach((match,index)=>new vm.Script(match[1],{filename:'index.html:inline-'+(index+1)}));
new vm.Script(fs.readFileSync('washpilot-home-features.js','utf8'),{filename:'washpilot-home-features.js'});
console.log('PASS: parsed '+scripts.length+' inline JavaScript blocks and the homepage feature runtime.');
