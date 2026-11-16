const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function classList(){const items=new Set();return{add(v){items.add(v)},remove(v){items.delete(v)},toggle(v,flag){if(flag===undefined)flag=!items.has(v);flag?items.add(v):items.delete(v);return flag},contains(v){return items.has(v)}}}
function element(){return {style:{},dataset:{},classList:classList(),setAttribute(k,v){this[k]=v},appendChild(){},remove(){},querySelector(){return null},textContent:'',value:''}}
for(const file of ['app.html','signin.html']){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 assert(source.includes('class="wp-topbar-logout"'),file+' should have explicit logout button');
 assert(!source.includes("document.querySelector('.top-actions .avatar').textContent"),file+' should not touch removed avatar');
 assert(source.includes('getClient().auth.signOut()'),file+' must keep real session sign-out');
 const start=source.indexOf('function renderNav(){',source.indexOf('function canAccessRolePage(page){'));
 const end=source.indexOf('function go(page)',start);
 assert(start>0&&end>start,file+' active renderNav implementation');
 const script=source.slice(start,end);
 assert(script.includes('const signOutButton='),file+' explicit logout target');
 const allIds=['ownerWorkspaceGroup','managementNavGroup','easyToolsGroup','platformNavGroup','sidePlan','sidePlanText'];
 for(const id of allIds)assert(source.includes('id="'+id+'"'),file+' missing required nav target '+id);
 const groups=Object.fromEntries(allIds.map(id=>[id,element()]));
 const navBtn=element();navBtn.dataset.page='dashboard';navBtn.querySelector=()=>null;
 const mobileBtn=element();mobileBtn.dataset.mobilePage='dashboard';
 const logout=element();
 const context={
  currentRole:'business',currentStaffRole:'owner',currentPage:'dashboard',viewMode:'advanced',currentPlan:'premium',
  document:{
   body:{classList:classList()},
   getElementById(id){return groups[id]||null},
   querySelector(selector){if(selector==='.top-actions .wp-topbar-logout')return this.hasLogout?logout:null;return null},
   querySelectorAll(selector){if(selector==='.nav button[data-page]')return[navBtn];if(selector==='[data-mobile-page]')return[mobileBtn];return[]},
   createElement:()=>element(),hasLogout:true
  },
  effectivePlan:()=> 'premium',allowed:()=>true,canAccessRolePage:()=>true,minPlan:()=> 'basic',planName:()=> 'Free',console
 };
 vm.createContext(context);
 vm.runInContext(script,context);
 for(const [role,staff,expected] of [['business','owner','PREMIUM PLAN'],['business','cashier','CASHIER'],['business','washer','WASHER'],['business','supervisor','SUPERVISOR'],['platform','owner','PLATFORM ADMIN']]){
  context.currentRole=role;context.currentStaffRole=staff;vm.runInContext('renderNav()',context);
  assert.equal(groups.sidePlan.textContent,expected,file+' nav for '+role+':'+staff);
  assert(logout['aria-label'].startsWith('Log out of WashPilot'),file+' logout label');
 }
 context.document.hasLogout=false;
 assert.doesNotThrow(()=>vm.runInContext('renderNav()',context),file+' should survive optional logout button missing');
 const staticIds=[...script.matchAll(/getElementById\('([^']+)'\)/g)].map(x=>x[1]);
 for(const id of staticIds.filter(id=>!['modeSwitch','planSelect'].includes(id)))assert(source.includes('id="'+id+'"'),file+' required nav reference missing id '+id);
 console.log('PASS '+file+': login-time renderNav works for owner/cashier/washer/supervisor/platform, absent avatar and optional logout, required DOM nodes present.');
}
