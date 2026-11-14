const fs=require('node:fs');
const vm=require('node:vm');
const inputs=['index.html','home.html','app.html'];
let scriptCount=0;
for(const name of inputs){
  const html=fs.readFileSync(name,'utf8');
  const scripts=[...html.matchAll(/<script\\b(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)<\\/script>/gi)];
  if(!scripts.length)throw new Error('No inline scripts found in '+name);
  scripts.forEach((match,index)=>{
    new vm.Script(match[1],{filename:name+':inline-'+(index+1)});
    scriptCount++;
  });
}
new vm.Script(fs.readFileSync('washpilot-home-features.js','utf8'),{filename:'washpilot-home-features.js'});
console.log('PASS: parsed '+scriptCount+' inline JavaScript blocks across homepage, home alias and preserved application, plus the homepage feature runtime.');
