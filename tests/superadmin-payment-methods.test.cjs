const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const sources=['app.html','signin.html'].map(n=>({name:n,source:fs.readFileSync(path.join(root,n),'utf8')}));
for(const {name,source} of sources){
 assert(source.includes("const wpPremiumMethods=['GCash','BPI'];"),name+' allowed methods');
 assert(source.includes("name=\"account_number\""),name+' account number input');
 assert(source.includes("name=\"account_name\""),name+' account name input');
 assert(source.includes("name=\"qr_file\""),name+' QR upload input');
 assert(source.includes("wpPreviewBillingQr()"),name+' QR preview');
 assert(source.includes("wpSelectAdminBillingMethod(this.value)"),name+' admin dropdown');
 assert(source.includes("payment_methods"),name+' persisted method settings');
 assert(source.includes("p_method:settings.method"),name+' saving via admin RPC');
 assert(source.includes("storage.from('washpilot-billing-qr').upload("),name+' QR image storage upload');
 assert(source.includes("p_payment_method:method"),name+' selected payment method sent to backend');
 assert(source.includes("name=\"payment_method\" id=\"wpPremiumPaymentMethod\""),name+' checkout dropdown');
 assert(!source.includes("p_payment_method:'GCash'"),name+' legacy hardcoded GCash payment');
 assert(source.includes("<th>Method</th>"),name+' admin payment method report');
 const begin=source.indexOf('const wpPremiumMethods='),end=source.indexOf('async function openPlanUpgradeModal(',begin);
 assert(begin>0&&end>begin);
 const context={window:{},document:{getElementById:()=>null},esc:s=>String(s),console};
 vm.createContext(context);vm.runInContext(source.slice(begin,end),context);
 const examples={
  GCash:{account_name:'Merchant One',account_number:'09123456789',qr_image_url:'https://example.com/gcash.png',enabled:true},
  BPI:{account_name:'Merchant Two',account_number:'1234567890',qr_image_url:'https://example.com/bpi.png',enabled:true},
  Maya:{account_name:'Ignored',account_number:'09111111111',qr_image_url:'https://example.com/maya.png',enabled:true}
 };
 context.settings={payment_methods:examples};
 const json=vm.runInContext('JSON.stringify(wpPremiumAvailable(settings))',context);
 assert.equal(json,'["GCash","BPI"]',name+' only GCash and BPI available');
 examples.BPI.account_number='';
 assert.equal(vm.runInContext('wpPremiumReady(settings,"BPI")',context),false,name+' BPI needs account number');
 examples.BPI.account_number='1234567890';examples.BPI.qr_image_url='';
 assert.equal(vm.runInContext('wpPremiumReady(settings,"BPI")',context),false,name+' BPI needs QR');
 examples.BPI.qr_image_url='https://example.com/bpi.png';examples.BPI.enabled=false;
 assert.equal(vm.runInContext('wpPremiumReady(settings,"BPI")',context),false,name+' disabled method blocked');
 context.settings={payment_methods:{BPI:{enabled:true,account_name:'Saved BPI',account_number:'12345678',qr_image_url:'https://example.com/bpi-qr.png'}}};
 assert.equal(vm.runInContext('wpPremiumReady(settings,"BPI")',context),true,name+' supports existing BPI');
 assert.equal(vm.runInContext('wpPremiumReady(settings,"GCash")',context),false,name+' missing GCash blocked');
}
console.log('PASS Super Admin GCash/BPI dropdown, independent account number/name/QR fields, upload + preview, per-method availability, backend method propagation, admin history.');
