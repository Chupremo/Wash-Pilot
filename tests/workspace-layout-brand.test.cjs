const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

assert.ok(fs.statSync(path.join(__dirname,'../washpilot-brand.png')).size>1000,'Full WashPilot wordmark asset must exist');
assert.ok(fs.statSync(path.join(__dirname,'../washpilot-logo.svg')).size>100,'WashPilot icon asset must exist');
for(const file of ['app.html','signin.html']){
 const html=read(file);
 assert.match(html,/<div class="sidebar-brand-row">[\s\S]{0,250}src="\/washpilot-brand\.png"/,'Sidebar must use WashPilot wordmark in '+file);
 assert.match(html,/<div class="login-brand"><img class="brand-lockup" src="\/washpilot-brand\.png"/,'Login hero must use the wordmark in '+file);
 assert.doesNotMatch(html,/\b(?:src|href)="washpilot-logo\.svg"/,'Brand asset URLs must not break on nested routes in '+file);
 assert.match(html,/href="\/washpilot-logo\.svg"/,'Icon must resolve from root in '+file);
 assert.match(html,/washpilot-design\.css\?v=20261116-fullheight-brand/,'Style version must bypass browser cache in '+file);
 assert.match(html,/id="washpilotApp"/,'Workspace shell must remain in '+file);
}
const css=read('washpilot-design.css');
assert.match(css,/@media\(min-width:761px\)\{\s*body\.wp-page-app #washpilotApp:not\(\.auth-hidden\)/,'Full-page layout must be desktop-only');
assert.match(css,/body\.wp-page-app #washpilotApp > \.sidebar\{[\s\S]*?max-height:none!important;[\s\S]*?overflow:visible!important;/,'Sidebar cannot stop at viewport height');
assert.match(css,/body\.wp-page-app #washpilotApp > \.main\{[\s\S]*?max-height:none!important;[\s\S]*?overflow:visible!important;/,'Dashboard must be full-height');
assert.match(css,/body\.wp-page-app #washpilotApp \.sidebar-brand-row \.brand \.brand-lockup\{[\s\S]*?background:transparent!important;/,'Sidebar wordmark cannot be covered by a white fill');
assert.match(css,/@media\(max-width:760px\)\{\s*body\.wp-page-app #washpilotApp \.topbar-brand-icon\{/,'Mobile header icon must be visible');
console.log('PASS: full-page scrolling, full sidebar wordmark, corrected absolute asset paths and mobile branding.');
