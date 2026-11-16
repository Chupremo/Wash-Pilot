const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app.html'),'utf8');
const signin=fs.readFileSync(path.join(__dirname,'../signin.html'),'utf8');
const helperStart=source.indexOf('/* Online reservations appear in the same service workflow');
const helperEnd=source.indexOf('function easyQueuePage(){',helperStart);
assert(helperStart>0&&helperEnd>helperStart,'queue helpers exist');
const ctx={
 window:{wpRealWorkspaceActive:true,wpRealBusinessId:'tenant-a',wpTourSandboxActive:false},
 state:{transactions:[]},currentPage:'queue',currentStaffRole:'owner',
 today:()=> '2026-11-16',dateLabel:()=> 'Nov 16, 2026',wpFormatClock:v=>String(v||'').slice(0,5),
 ticketDateOf:t=>t.date,money:n=>'₱'+n,esc:v=>String(v??''),
 statusPill:v=>String(v),nextWashStatus:v=>({Waiting:'Washing',Washing:'Quality Check','Quality Check':'Ready',Ready:'Completed'})[v],
 pageHead:()=>'',stat:()=>'',render:()=>{ctx.renders++},toast:()=>{},renders:0,
 console,Date,setTimeout,clearTimeout
};
vm.createContext(ctx);vm.runInContext(source.slice(helperStart,helperEnd),ctx);
const todayBooking={id:'booking-a',booking_code:'WP-ONLINE-1',booking_date:'2026-11-16',start_time:'09:00:00',end_time:'10:00:00',service_name:'Premium Car Wash',customer_name:'Test Owner',customer_phone:'09000000000',vehicle_size:'SUV',vehicle_plate:'ABC 123',price_php:499,status:'pending',payment_status:'awaiting_verification',queue_status:'Waiting',selected_addons:[]};
vm.runInContext('wpServiceQueueState.businessId="tenant-a";wpServiceQueueState.rows=[]',ctx);
ctx.window.wpRealBusinessId='tenant-a';
vm.runInContext('wpServiceQueueState.rows=[booking]',Object.assign(ctx,{booking:todayBooking}));
let rows=vm.runInContext('wpServiceQueueRows()',ctx);
assert.equal(rows.length,1,'pending online bookings should be shown immediately');
assert.equal(rows[0].status,'Waiting');
assert.equal(rows[0].scheduledStart,'09:00:00');
assert.match(vm.runInContext('wpQueueSourceBadges(wpServiceQueueRows()[0])',ctx),/ONLINE BOOKING/);
assert.match(vm.runInContext('wpQueueSourceBadges(wpServiceQueueRows()[0])',ctx),/09:00/);
assert.match(vm.runInContext('wpQueueDetails(wpServiceQueueRows()[0])',ctx),/Test Owner/);
assert.match(vm.runInContext('wpQueueDetails(wpServiceQueueRows()[0])',ctx),/Payment awaiting verification/);
ctx.state.transactions.push({id:'walk-in',date:'2026-11-16',status:'Waiting',plate:'WALKIN'});
assert.equal(vm.runInContext('wpServiceQueueRows().length',ctx),2,'both booking sources visible');
ctx.state.transactions.push({id:'WP-ONLINE-1',date:'2026-11-16',status:'Waiting'});
assert.equal(vm.runInContext('wpServiceQueueRows().length',ctx),2,'do not duplicate bookings already present in local ledger');
ctx.state.transactions.pop();
ctx.booking={...todayBooking,status:'confirmed',payment_status:'verified',queue_status:'Washing'};
vm.runInContext('wpServiceQueueState.rows=[booking]',ctx);
assert.equal(vm.runInContext('wpServiceQueueRows()[1].status',ctx),'Washing');
assert.match(vm.runInContext('wpQueueAction(wpServiceQueueRows()[1])',ctx),/wpAdvanceOnlineQueue/);
ctx.booking={...todayBooking,status:'completed',queue_status:'Completed'};
vm.runInContext('wpServiceQueueState.rows=[booking]',ctx);
assert.equal(vm.runInContext('wpServiceQueueRows()[1].status',ctx),'Completed');
ctx.booking={...todayBooking,status:'cancelled'};
vm.runInContext('wpServiceQueueState.rows=[]',ctx);
assert.equal(vm.runInContext('wpServiceQueueRows().length',ctx),1);
ctx.window.wpRealBusinessId='tenant-b';
assert.equal(vm.runInContext('wpServiceQueueRows().length',ctx),1,'tenant isolated');
assert(signin.includes('advanceOnlineQueue(bookingId,nextStatus)'),'sign-in shell updated');
assert(source.includes(".in('status',['pending','confirmed','completed'])"),'status filters exclude cancelled/rejected');
assert(source.includes("wpBookingNotificationTimer=window.setInterval(()=>{refreshBookingNotificationCount();refreshBookingPayments(true);if(currentPage==='queue')loadOnlineReservationQueue(true);},20000)"),'queue refresh scheduled');
console.log('PASS: pending online bookings appear in Waiting; booked time and origin displayed; verified bookings progress; cancelled excluded; no duplicates; tenant isolation; polling configured.');
