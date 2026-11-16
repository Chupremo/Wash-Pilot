const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../app.html'),'utf8');
const signin=fs.readFileSync(path.join(__dirname,'../signin.html'),'utf8');
function section(content,from,to){
 const s=content.indexOf(from);assert(s>=0,'missing '+from);
 const e=content.indexOf(to,s);assert(e>s,'missing end '+to);
 return content.slice(s,e);
}
for(const source of [app,signin]){
 assert(source.includes("async startOwnerTrial(businessId)"),'API method missing');
 assert(source.includes("rpc('start_owner_premium_trial',{p_business_id:businessId})"),'secure RPC missing');
 assert(source.includes("admin_trial_enabled"),'trial state missing');
 assert(source.includes("wpTrialOfferCard()"),'trial UI missing');
 assert(source.includes("activateOwnerPremiumTrial()"),'trial click handler missing');
 assert(source.includes("7-DAY PREMIUM FREE TRIAL"),'trial badge missing');
 assert(source.includes("const rawEnd=trial?sub.trial_ends_at:"),'trial expiry should use trial end');
 const ctx={
  window:{wpRealWorkspaceActive:true,wpRealBusinessId:'business-1',
    wpRealBusiness:{status:'active'},wpRealSubscription:{
      plan_code:'basic',status:'active',trial_starts_at:null,trial_ends_at:null,admin_trial_enabled:false
    }},
  currentRole:'business',currentStaffRole:'owner',currentPlan:'basic',
  document:{getElementById:()=>null},
  normalizePlan:p=>p==='premium'?'premium':'basic',esc:String,closeModal:()=>{},renderNav:()=>{},render:()=>{},toast:()=>{},alert:()=>{},
  Date,Math
 };
 vm.createContext(ctx);
 vm.runInContext(section(source,'function wpOwnerTrialEligible(){','function subscriptionStatusBanner(){'),ctx);
 assert.equal(vm.runInContext('wpOwnerTrialEligible()',ctx),true);
 assert.match(vm.runInContext('wpTrialOfferCard()',ctx),/Start my 7-day trial/);
 ctx.window.wpRealSubscription.trial_starts_at='2026-01-01T00:00:00Z';
 assert.equal(vm.runInContext('wpOwnerTrialEligible()',ctx),false,'used trial must be blocked');
 ctx.window.wpRealSubscription.trial_starts_at=null;ctx.currentStaffRole='supervisor';
 assert.equal(vm.runInContext('wpOwnerTrialEligible()',ctx),false,'staff cannot activate');
 ctx.currentStaffRole='owner';ctx.window.wpRealSubscription.status='suspended';
 assert.equal(vm.runInContext('wpOwnerTrialEligible()',ctx),false,'suspended must be blocked');
 ctx.window.wpRealSubscription.status='trialing';ctx.window.wpRealSubscription.plan_code='premium';
 ctx.window.wpRealSubscription.trial_ends_at=new Date(Date.now()+86400000).toISOString();
 assert.equal(vm.runInContext('wpTrialPeriod()',ctx),true,'active trial');
 ctx.window.wpRealSubscription.trial_ends_at=new Date(Date.now()-86400000).toISOString();
 assert.equal(vm.runInContext('wpTrialPeriod()',ctx),false,'expired trial must not be treated as live');
 assert.equal(vm.runInContext('wpOwnerTrialEligible()',ctx),false,'expired trial cannot restart');
 const banner=section(source,'function subscriptionStatusBanner(){','function vendoPage(){');
 assert.match(banner,/wpOwnerTrialEligible\(\)/);
 assert.match(banner,/FREE TRIAL ENDED/);
 const fullDashboard=section(source,'function dashboardPage(){','function paymentBreakdown(');
 assert(fullDashboard.indexOf('$'+'{subscriptionStatusBanner()}')<fullDashboard.indexOf('wp-dashboard-main-grid'),'offer should be above main dashboard');
 const easyDashboard=section(source,'function easyDashboardPage(){','function managementHubPage(){');
 assert(easyDashboard.includes('subscriptionStatusBanner()+'),'easy dashboard should show trial offer');
}
console.log('PASS owner trial eligibility, one-time restriction, staff denial, suspended denial, active/expired trial, dashboard/billing paths and secure RPC');
