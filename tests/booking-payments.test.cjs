const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
function decl(name){const marker='function '+name+'(';const start=source.lastIndexOf(marker);assert(start>=0,name);let pos=start+marker.length,depth=0,quote='',escape=false; // use the next top-level function boundary for single-line declarations in this app
 const end=source.indexOf('\nfunction ',pos);return source.slice(start,end<0?undefined:end);}
const helper=source.slice(source.indexOf('// Booking receipts stay authoritative'),source.indexOf('function ticketDateOf'));
const c={console,window:{wpRealWorkspaceActive:true,wpRealBusinessId:'business-A'},state:{transactions:[{id:'POS-1',total:50,status:'Completed',financialStatus:'Paid',payment:'Cash',date:'2026-11-13',paymentDate:'2026-11-13',addons:[]}]},currentPage:'dashboard',document:{getElementById:()=>null},render:()=>{},dateKey:d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(d),today:()=> '2026-11-13',esc:s=>String(s),money:n=>'₱'+n};
vm.createContext(c);vm.runInContext(helper+['isPaymentCollected','totalSales','paymentDateOf','paidTransactionsBetween','totalCollectedBetween','paymentBreakdown'].map(decl).join('\n'),c);
let rows=[{id:'b1',booking_code:'BOOK-1',price_php:150,payment_status:'verified',payment_verified_at:'2026-11-13T12:33:48Z',created_at:'2026-11-13T09:00:00Z',booking_date:'2026-11-15',status:'completed',payment_method:'gcash'}, {id:'b2',booking_code:'BOOK-2',price_php:180,payment_status:'verified',payment_verified_at:'2026-11-12T08:48:15Z',created_at:'2026-11-11T09:00:00Z',booking_date:'2026-11-13',status:'completed',payment_method:'bank_transfer'}, {id:'pending',price_php:900,payment_status:'awaiting_verification'}];
c.window.washPilotBookingApi={getMyBookingPayments:async()=>rows};
(async()=>{
 await c.refreshBookingPayments(true);assert.equal(c.totalCollectedBetween('2026-11-13','2026-11-13'),200);assert.equal(c.totalCollectedBetween('2026-11-12','2026-11-13'),380);assert.equal(c.totalCollectedBetween('2026-11-15','2026-11-15'),0);assert.equal(c.state.transactions.length,1);
 await c.refreshBookingPayments(true);assert.equal(c.reportTransactions().length,3);assert.equal(c.totalCollectedBetween('2026-11-13','2026-11-13'),200);
 c.state.transactions.push({id:'BOOK-1',total:150,bookingId:'b1'});assert.equal(c.reportTransactions().length,3);c.state.transactions.pop();
 assert.match(c.paymentBreakdown(c.paidTransactionsBetween('2026-11-12','2026-11-13')),/Bank transfer/);
 c.window.wpTourSandboxActive=true;assert.equal(c.reportTransactions().length,1);c.window.wpTourSandboxActive=false;
 c.window.wpRealBusinessId='business-B';assert.equal(c.reportTransactions().length,1);let release;c.window.washPilotBookingApi.getMyBookingPayments=()=>new Promise(r=>release=r);let task=c.refreshBookingPayments(true);c.window.wpRealBusinessId='business-C';release(rows);await task;assert.equal(c.reportTransactions().length,1);
 c.window.wpRealBusinessId='business-A';c.window.washPilotBookingApi.getMyBookingPayments=async()=>{throw Error('offline')};await c.refreshBookingPayments(true);assert.equal(vm.runInContext('wpBookingPayments.error',c),'offline');
 const methodStart=source.indexOf('    async getMyBookingPayments('),methodEnd=source.indexOf('    async getMyBookings(){',methodStart);
 const calls=[],batch=Array.from({length:501},(_,i)=>({id:String(i)}));const query={select(){return this},eq(k,v){calls.push([k,v]);return this},order(k){assert.equal(k,'id');return this},range(a,b){calls.push(['range',a,b]);return Promise.resolve({data:batch.slice(a,b+1),error:null})}};
 c.getClient=()=>({from:table=>{assert.equal(table,'facility_bookings');return query}});
 const api=vm.runInContext('({'+source.slice(methodStart,methodEnd)+'})',c);assert.equal((await api.getMyBookingPayments('tenant-only')).length,501);assert.equal(calls.filter(x=>x[0]==='range').length,2);assert(calls.some(x=>x[0]==='business_id'&&x[1]==='tenant-only'));assert(calls.some(x=>x[0]==='payment_status'&&x[1]==='verified'));
 console.log('PASS: verified payments join POS once; pending excluded; payment date is Manila verification date, not future service date; historical payments included; original POS untouched; tour and tenant isolation; stale requests dropped; failed reads surfaced.');
})().catch(e=>{console.error(e);process.exitCode=1});
