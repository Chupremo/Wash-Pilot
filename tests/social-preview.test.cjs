const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'..'),imagePath=path.join(dir,'washpilot-social-preview.png');
assert(fs.existsSync(imagePath),'social image must be included in deployment, not just referenced in metadata');
const bytes=fs.readFileSync(imagePath);
assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Facebook social image must be a real PNG');
assert.equal(bytes.readUInt32BE(16),1200,'image width 1200');
assert.equal(bytes.readUInt32BE(20),630,'image height 630');
assert(bytes.length>12000,'image should be a real rendered banner, not a tiny placeholder');
assert(bytes.length<8000000,'image should stay under 8 MB');
const expectations={
 'index.html':{url:'https://washpilot.shop/',title:'Digital POS &amp; Online Booking for Carwash Businesses'},
 'app.html':{url:'https://washpilot.shop/signup',title:'Free Carwash POS &amp; 7-Day Premium Trial'},
 'signin.html':{url:'https://washpilot.shop/login',title:'Log In to Your Carwash Dashboard'}
};
for(const [name,expected] of Object.entries(expectations)){
 const html=fs.readFileSync(path.join(dir,name),'utf8');
 const head=html.slice(0,html.indexOf('</head>'));
 assert(head.includes('<meta property="og:site_name" content="WashPilot Management Solutions">'),name+': site name');
 assert(head.includes('<meta property="og:url" content="'+expected.url+'">'),name+': correct URL');
 assert(head.includes(expected.title),name+': unique title');
 for(const prop of ['og:type','og:title','og:description','og:image','og:image:secure_url','og:image:width','og:image:height','og:image:alt']){
  assert(head.includes('property="'+prop+'"'),name+': missing '+prop);
 }
 assert(head.includes('<meta property="og:image" content="https://washpilot.shop/washpilot-social-preview.png?v=20261116">'),name+': same public image URL');
 assert(head.includes('<meta property="og:image:width" content="1200">'),name+': correct width');
 assert(head.includes('<meta property="og:image:height" content="630">'),name+': correct height');
 assert(head.includes('<meta name="twitter:card" content="summary_large_image">'),name+': large Twitter card');
 assert(head.includes('<meta name="twitter:image" content="https://washpilot.shop/washpilot-social-preview.png?v=20261116">'),name+': twitter image');
 assert(head.includes('<link rel="canonical" href="'+expected.url+'">'),name+': canonical URL');
 const metaDesc=[...head.matchAll(/<meta name="description"/g)];assert.equal(metaDesc.length,1,name+': only one page description');
 assert(head.indexOf('property="og:image"')<head.indexOf('<style>')||!head.includes('<style>'),name+': tags available before client JS');
}
const config=JSON.parse(fs.readFileSync(path.join(dir,'vercel.json'),'utf8'));
assert(config.rewrites.some(r=>r.source==='/signup'&&r.destination==='/app.html'),'/signup must serve its metadata on Vercel');
const worker=fs.readFileSync(path.join(dir,'worker.mjs'),'utf8');
assert(worker.includes('"/signup"'),'/signup must serve app.html through Cloudflare worker');
console.log('PASS social preview: real 1200x630 PNG, canonical homepage/signup/login OG+Twitter tags, absolute HTTPS image URL, deployed site routes.');
