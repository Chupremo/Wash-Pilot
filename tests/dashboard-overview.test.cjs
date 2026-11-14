const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const start = source.indexOf('function dashboardPage(){');
const end = source.indexOf('\nfunction paymentBreakdown(', start);
assert(start >= 0 && end > start, 'dashboard renderer exists');
const day = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const rows = [
  {id:'active', date:day, time:'12:00', plate:'ACTIVE', vehicle:'Sedan', main:'Wash', status:'Washing', financialStatus:'Unpaid', total:300},
  {id:'done', date:day, time:'11:00', plate:'DONE', vehicle:'SUV', main:'Wash', status:'Completed', financialStatus:'Paid', paymentDate:day, total:200},
  {id:'cancelled', date:day, time:'10:00', plate:'CANCELLED', status:'Cancelled', financialStatus:'Paid', paymentDate:day, total:500},
  {id:'old', date:yesterday, time:'09:00', plate:'OLD', status:'Completed', financialStatus:'Paid', paymentDate:day, total:100}
];
const context = {
  viewMode:'advanced', state:{transactions:rows, expenses:[]}, window:{},
  today:()=>day, isoAgo:n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10),
  dateKey:d=>d.toISOString().slice(0,10), isToday:t=>t.date===day,
  paidTransactionsBetween:(a,b)=>rows.filter(t=>t.financialStatus==='Paid' && t.status!=='Cancelled' && t.paymentDate>=a && t.paymentDate<=b),
  money:n=>'₱'+n, esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'),
  stat:(label,value,note)=>`<metric data-label="${label}" data-value="${value}">${note}</metric>`,
  statusPill:s=>`<status>${s}</status>`, subscriptionStatusBanner:()=>'<subscription></subscription>',
  transactionTable:list=>`<transactions>${list.map(t=>t.id).join(',')}</transactions>`,
  paymentBreakdown:()=>'<payments></payments>', planRank:()=>1, effectivePlan:()=> 'basic'
};
context.totalCollectedBetween=(a,b)=>context.paidTransactionsBetween(a,b).reduce((sum,t)=>sum+t.total,0);
vm.createContext(context);
vm.runInContext(source.slice(start,end),context);
let html=context.dashboardPage();
assert.match(html, /data-label="Sales collected" data-value="₱300"/);
assert.match(html, /data-label="Vehicles registered" data-value="2"/);
assert.match(html, /data-label="In progress" data-value="1"/);
assert.match(html, /data-label="Completed" data-value="1"/);
assert.match(html, /data-label="Average per vehicle" data-value="₱150"/);
assert.match(html, /id="wpDashboardBookingNotifications"/);
assert.match(html, /<subscription>/);
const queue=html.slice(html.indexOf('id="wpDashboardQueue"'), html.indexOf('id="wpDashboardGuide"'));
assert.match(queue, /ACTIVE/);
assert.doesNotMatch(queue, /DONE|CANCELLED|OLD|cycleStatus/);
assert.match(queue, /go\('queue'\)/);
rows.length=0;
html=context.dashboardPage();
assert.match(html, /No active washes today/);
assert.match(html, /data-label="Average per vehicle" data-value="₱0"/);
console.log('Dashboard summary, payment-date totals, active queue, navigation and empty state passed.');
