const fs=require('node:fs');
const assert=require('node:assert/strict');
const home=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.html','utf8');
const signin=fs.readFileSync('signin.html','utf8');
const pages=fs.readFileSync('washpilot-pages.js','utf8');
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));

const loginLinks=home.split('href="/login"').length-1;
assert.ok(loginLinks>=2,'Desktop and mobile homepage navigation should both use /login.');
assert.ok(!home.includes('href="/signin"'),'Homepage should use the canonical /login route, not the old /signin alias.');

const redirect=(source,destination)=>config.redirects.some(x=>x.source===source&&x.destination===destination);
const rewrite=(source,destination)=>config.rewrites.some(x=>x.source===source&&x.destination===destination);

assert.ok(redirect('/login','/signin'),'Old /login URL should redirect to the canonical sign-in route.');
assert.ok(!redirect('/signin.html','/signin'),'The dedicated sign-in HTML must not redirect back to /signin or it creates a rewrite loop.');
assert.ok(redirect('/signup.html','/signup'),'Legacy sign-up URL should redirect to the integrated sign-up.');
assert.ok(redirect('/forgot','/signin'),'Legacy forgot-password URL should return to the unified sign-in.');
assert.ok(redirect('/forgot.html','/signin'),'Legacy forgot-password file URL should return to the unified sign-in.');
assert.ok(redirect('/dashboard.html','/dashboard'),'Legacy dashboard URL should redirect to the integrated dashboard.');
assert.ok(redirect('/pos.html','/new-wash'),'Legacy POS URL should redirect to the integrated POS.');
assert.ok(redirect('/pos','/new-wash'),'Old /pos alias should redirect to the integrated POS.');
assert.ok(redirect('/home.html','/'),'Old duplicate homepage URL should redirect to the root homepage.');
assert.ok(!redirect('/app.html','/'),'The integrated app entry must not redirect away from internal rewrites.');

assert.ok(rewrite('/login','/signin.html'),'Canonical /login must serve the dedicated login-only document.');
assert.ok(!rewrite('/signin','/signin.html'),'The old /signin alias must redirect instead of creating a second rewrite path.');
assert.ok(rewrite('/signup','/app.html'),'Canonical sign-up should load the integrated application.');
assert.ok(rewrite('/dashboard','/app.html'),'Canonical dashboard should load the integrated application.');
assert.ok(rewrite('/new-wash','/app.html'),'Canonical POS should load the integrated application.');

for(const file of ['home.html','signup.html','forgot.html','dashboard.html','pos.html']){
  assert.equal(fs.existsSync(file),false,'Legacy standalone page must not be deployed at the root: '+file);
}

for(const id of ['publicLanding','loginScreen','washpilotApp']){
  assert.equal((app.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'Integrated app must contain exactly one '+id+' region.');
}
assert.equal((app.match(/data-page="dashboard"/g)||[]).length,1,'Integrated app must have only one dashboard navigation item.');
assert.equal((app.match(/data-page="newwash"/g)||[]).length,1,'Integrated app must have only one POS navigation item.');
assert.ok(app.includes("dashboard:'/dashboard'"),'Dashboard must use its canonical route.');
assert.ok(app.includes("newwash:'/new-wash'"),'POS must use its canonical route.');
assert.ok(app.includes('auth.signInWithPassword({email,password})'),'Unified sign-in must authenticate through Supabase.');
assert.ok(app.includes('function dashboardPage(){'),'Dashboard must remain inside the integrated application.');
assert.ok(app.includes('function newWashPage(){'),'POS must remain inside the integrated application.');
assert.ok(pages.includes(": '/dashboard';"),'Authenticated users must be sent to the integrated dashboard.');
assert.ok(!pages.includes("'/dashboard.html'"),'Shared page helper must not route users to the standalone dashboard.');
assert.equal((signin.match(/<section class="wp-public" id="publicLanding"/g)||[]).length,0,'Dedicated sign-in document must not contain the second public landing page.');
assert.equal((signin.match(/id="loginScreen"/g)||[]).length,1,'Dedicated sign-in document must contain exactly one login screen.');
assert.equal((signin.match(/id="washpilotApp"/g)||[]).length,1,'Dedicated sign-in document must keep the integrated app available after authentication.');
assert.ok(signin.includes('auth.signInWithPassword({email,password})'),'Dedicated sign-in document must retain real Supabase authentication.');
assert.ok(signin.includes('href="/" data-full-navigation="true">← Back to website</a>'),'Dedicated sign-in page must return directly to the canonical homepage.');
assert.ok(signin.includes("anchor.hasAttribute('data-full-navigation')"),'The sign-in back link must bypass the SPA router and load the real homepage document.');
assert.ok(app.includes("if(path==='/login'||path==='/signin'){"),'Integrated app must handle its canonical sign-in route.');
assert.ok(app.includes('html.wp-auth-route #publicLanding,'),'The auth-only route CSS must be independent of late body route initialization.');
assert.ok(app.includes("document.documentElement.classList.add('wp-auth-route');"),'Sign-in must establish its auth-only marker.');
assert.ok(app.includes('<script id="wp-auth-route-boot">'),'Sign-in route must set the auth-only marker before the embedded public landing is parsed.');
assert.ok(app.indexOf('<script id="wp-auth-route-boot">')<app.indexOf('<section class="wp-public" id="publicLanding"'),'Early auth route guard must precede the secondary public landing.');
assert.ok(app.includes("document.documentElement.classList.remove('wp-auth-route');"),'Public routes must clear the auth-only marker when navigating away from sign-in.');
assert.ok(app.includes('const authRoute=!!(window.wpRouteIsWorkspace||window.wpRouteIsLogin);'),'The no-session initializer must identify sign-in and protected app routes before showing public content.');
assert.ok(app.includes("if(authRoute){")&&app.includes("if(authRoute&&typeof window.wpShowLoginForRoute==='function')"),'Unauthenticated protected routes must show login without reopening the embedded landing page.');
assert.ok(app.includes("if(landing){landing.hidden=true;landing.style.setProperty('display','none','important');}"),'Sign-in route must forcibly hide the secondary public landing view.');
assert.ok(app.includes("if(login){login.hidden=false;login.style.setProperty('display','grid','important');}"),'Sign-in route must show the actual login form.');


console.log('PASS: one integrated app, no standalone dashboard/POS/auth pages, canonical routes and Supabase sign-in.');
