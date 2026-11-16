const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const files={
  home:fs.readFileSync(path.join(root,'index.html'),'utf8'),
  app:fs.readFileSync(path.join(root,'app.html'),'utf8'),
  signin:fs.readFileSync(path.join(root,'signin.html'),'utf8'),
  error:fs.readFileSync(path.join(root,'404.html'),'utf8'),
  styles:fs.readFileSync(path.join(root,'washpilot-design.css'),'utf8'),
  white:fs.readFileSync(path.join(root,'wp-management-white.svg'),'utf8'),
  navy:fs.readFileSync(path.join(root,'wp-management-navy.svg'),'utf8')
};
assert.match(files.white,/fill="#ffffff"/);
assert.match(files.navy,/fill="#011d4e"/);
for(const variant of ['white','navy']){
 assert.match(files[variant],/<svg[\s\S]+<\/svg>/);
 assert.match(files[variant],/viewBox="0 0 1200 /);
 assert.match(files[variant],/Management Solutions logo/);
}
for(const name of ['home','app','signin','error']){
 assert(!files[name].includes('washpilot-logo.svg'),'old logo references remain in '+name);
 assert(files[name].includes('wp-management-navy.svg'),name+' must reference navy');
}
assert(files.home.includes('src="/wp-management-white.svg"'),'home dark logo missing');
assert(files.app.includes('class="sidebar-brand-row"><div class="brand" aria-label="WP Management Solutions"><img class="brand-lockup" src="wp-management-white.svg"'),'sidebar logo missing');
assert(files.app.includes('class="login-brand"><img class="brand-lockup" src="wp-management-white.svg"'),'login dark logo missing');
for(const name of ['app','signin']){
 assert(files[name].includes('class="topbar-brand-icon" src="wp-management-navy.svg"'),'topbar light logo missing');
 assert(files[name].includes('class="login-mobile-brand"><img class="brand-lockup" src="wp-management-navy.svg"'),'login mobile logo missing');
 assert(files[name].includes('class="receipt-brand" src="wp-management-navy.svg"'),'receipt logo missing');
 assert(/\/washpilot-design\.css\?v=20261116-[a-z0-9-]+/.test(files[name]),'versioned branding stylesheet missing');
}
assert(files.styles.includes('/* WP Management Solutions — responsive light/dark logo rules */'));
assert(files.styles.includes('object-fit:contain!important'),'aspect-safe logo sizing missing');
assert(files.styles.includes('max-width:380px'),'small mobile logo styles missing');
console.log('PASS: both supplied logo variants, all four HTML shells, dark/light placement, responsive sizing, CSS cache updates.');
