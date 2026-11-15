const fs=require('node:fs');
const assert=require('node:assert/strict');
const home=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.html','utf8');
const pages=fs.readFileSync('washpilot-pages.js','utf8');
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));

const signinLinks=home.split('href="/signin"').length-1;
assert.ok(signinLinks>=2,'Desktop and mobile homepage navigation should both use /signin.');
assert.ok(!home.includes('href="/login"'),'Homepage must not send sign-in clicks to /login.');

const redirect=(source,destination)=>config.redirects.some(x=>x.source===source&&x.destination===destination);
const rewrite=(source,destination)=>config.rewrites.some(x=>x.source===source&&x.destination===destination);

assert.ok(redirect('/login','/signin'),'Old /login URL should redirect to the canonical sign-in route.');
assert.ok(redirect('/signin.html','/signin'),'Legacy sign-in URL should redirect to the integrated sign-in.');
assert.ok(redirect('/signup.html','/signup'),'Legacy sign-up URL should redirect to the integrated sign-up.');
assert.ok(redirect('/forgot','/signin'),'Legacy forgot-password URL should return to the unified sign-in.');
assert.ok(redirect('/forgot.html','/signin'),'Legacy forgot-password file URL should return to the unified sign-in.');
assert.ok(redirect('/dashboard.html','/dashboard'),'Legacy dashboard URL should redirect to the integrated dashboard.');
assert.ok(redirect('/pos.html','/new-wash'),'Legacy POS URL should redirect to the integrated POS.');
assert.ok(redirect('/pos','/new-wash'),'Old /pos alias should redirect to the integrated POS.');
assert.ok(redirect('/home.html','/'),'Old duplicate homepage URL should redirect to the root homepage.');
assert.ok(!redirect('/app.html','/'),'The integrated app entry must not redirect away from internal rewrites.');

assert.ok(rewrite('/signin','/app.html'),'Canonical sign-in should load the integrated application.');
assert.ok(rewrite('/signup','/app.html'),'Canonical sign-up should load the integrated application.');
assert.ok(rewrite('/dashboard','/app.html'),'Canonical dashboard should load the integrated application.');
assert.ok(rewrite('/new-wash','/app.html'),'Canonical POS should load the integrated application.');

for(const file of ['home.html','signin.html','signup.html','forgot.html','dashboard.html','pos.html']){
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
assert.ok(app.includes("if(path==='/login'||path==='/signin'){"),'Integrated app must handle its canonical sign-in route.');
assert.ok(app.includes('body.wp-login-route #publicLanding{display:none!important}'),'The duplicate in-app public homepage must stay hidden on sign-in.');
assert.ok(app.includes("if(landing){landing.hidden=true;landing.style.setProperty('display','none','important');}"),'Sign-in route must forcibly hide the secondary public landing view.');
assert.ok(app.includes("if(login){login.hidden=false;login.style.setProperty('display','grid','important');}"),'Sign-in route must show the actual login form.');


console.log('PASS: one integrated app, no standalone dashboard/POS/auth pages, canonical routes and Supabase sign-in.');
