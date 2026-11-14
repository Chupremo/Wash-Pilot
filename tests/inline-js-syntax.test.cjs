const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
if(!scripts.length)throw new Error('No inline scripts found');
scripts.forEach((match,index)=>new vm.Script(match[1],{filename:'index.html:inline-'+(index+1)}));
new vm.Script(fs.readFileSync('washpilot-home-features.js','utf8'),{filename:'washpilot-home-features.js'});
console.log('PASS: parsed '+scripts.length+' inline JavaScript blocks and the homepage feature runtime.');
const homeRoute=html.slice(html.indexOf('function showPublicPage(slug){'),html.indexOf('function showLoginRoute(){'));
if(!homeRoute||!homeRoute.includes("const homeExcludedViews=new Set(['wp-business-directory','wp-booking-public-view'])")||!homeRoute.includes("el.style.display=homeExcludedViews.has(el.id)?'none':'';")){
 throw new Error('Homepage route visibility must show all homepage sections and exclude only directory/booking views.');
}
for(const id of ['wp-home-hero','wp-home-demo','wp-features','wp-how','wp-pricing','wp-about','wp-faq','wp-contact']){
 if(!html.includes('id="'+id+'"'))throw new Error('Missing homepage section id: '+id);
}
console.log('PASS: all uploaded homepage sections remain visible on the home route.');

