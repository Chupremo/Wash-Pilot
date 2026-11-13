const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const elements=new Map(['wpFacilityListingPanel','wpFacilityAddressPicker','wpFacilityAddress'].map(id=>[id,{innerHTML:'',value:''}]));
const facility={id:'facility-test',name:'Test Facility',slug:'test-facility',address:'Existing saved address',google_place_id:'saved-place',latitude:14,longitude:121};
const context={window:{washPilotBookingApi:{getMyFacility:async()=>facility}},document:{getElementById:id=>elements.get(id)},renderFacilityQr:()=>{},esc:v=>String(v??'')};vm.createContext(context);
const appStart=source.indexOf('let wpFacilityGooglePlace = null;'),appEnd=source.indexOf('async function saveFacilityListing(',appStart);
assert(appStart>=0);vm.runInContext(source.slice(appStart,appEnd),context);
const pickerStart=source.indexOf('  async function ensureGooglePlaces(){'),pickerEnd=source.indexOf('  function setAuthMode(){',pickerStart);
// Match the production private auth scope: the helper must explicitly cross its boundary.
vm.runInContext("(()=>{'use strict';const WASHPILOT_GOOGLE_MAPS_BROWSER_KEY='';let wpGoogleMapsLoaderPromise=null;"+source.slice(pickerStart,pickerEnd)+'})();',context);
(async()=>{
 assert.equal(typeof context.window.mountGoogleAddressPicker,'function');await context.loadFacilityListing();
 const markup=elements.get('wpFacilityListingPanel').innerHTML;
 assert(markup.includes('wpFacilityProfileForm'));assert(markup.includes('Save facility details'));assert(!markup.includes('Could not load facility details'));
 assert(elements.get('wpFacilityAddressPicker').innerHTML.includes('Google Maps address search is not configured'));
 assert.equal(vm.runInContext('wpFacilityGooglePlace.placeId',context),'saved-place');
 assert.equal(vm.runInContext('wpFacilityGooglePlace.formattedAddress',context),facility.address);
 console.log('PASS: address picker exported across script scope; facility form survives unavailable Google configuration; saved map state remains accessible to app save handlers.');
})().catch(err=>{console.error(err);process.exitCode=1});
