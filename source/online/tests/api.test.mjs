import {test} from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.FITLEAD_TEST_API||'http://127.0.0.1:8787';
const payload={goal:'fat_loss',age:28,height:175,weight:75,sex:'male',target_weight:null,experience:'beginner',days:3,minutes:40,location:'gym',equipment:['machines'],meals:3,preference:'balanced',allergies:['peanut'],restrictions:'',takeaway:false,budget:'medium',risks:Object.fromEntries(['minor','pregnancy','disease','pain','contraindication','eating_disorder'].map(k=>[k,'no'])),consent:true,fluid_restriction:'no',sleep_hours:7,climate:'mild',red_flags:false};
async function req(path,data,token='',method){const r=await fetch(base+path,{method:method||(data?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,...await r.json()};}
async function guest(){const r=await req('/api/v1/visitors',{source:'xiaohongshu',campaign:'v2_test'});assert.equal(r.status,200);return r.data.access_token;}
async function assess(token,changes={}){return req('/api/v1/assessments',{...payload,request_key:crypto.randomUUID(),...changes},token);}

test('catalog data and licensing provenance are real and searchable',async()=>{
 const h=await req('/health');assert.equal(h.data.account_storage,'Cloudflare D1');assert.equal(h.data.ai_enabled,false);assert.ok(h.data.foods>=8000);assert.ok(h.data.exercises>=800);
 const f=await req('/api/v1/catalog/foods?q=%E7%B1%B3%E9%A5%AD');assert.ok(f.data.total>0);assert.ok(f.data.items.some(x=>x.kcal!==null));assert.match(f.data.source.license,/CC0/);
 const e=await req('/api/v1/catalog/exercises?q=squat&level=beginner');assert.ok(e.data.total>0);assert.ok(e.data.items.every(x=>x.level==='beginner'));
 const invalid=await req('/api/v1/catalog/foods?page=-1');assert.equal(invalid.status,422);
 const rehabilitation=await req('/api/v1/catalog/rehabilitation');assert.ok(rehabilitation.data.items.length>=8);
});

test('healthy plan has computed meals, safe hydration and owned access',async()=>{
 const token=await guest(),a=await assess(token);assert.equal(a.data.risk,'clear');
 const g=await req('/api/v1/plans/generate',{assessment_id:a.data.id},token);assert.equal(g.status,200);
 const plan=(await req('/api/v1/plans/'+g.data.id,undefined,token)).data;assert.equal(plan.mode,'rules');assert.equal(plan.meals.length,7);assert.equal(plan.training.filter(x=>x.exercises.length).length,3);
 assert.ok(Math.abs(plan.nutrition.menu_totals.calories-plan.nutrition.calories)<30);assert.equal(plan.hydration.total_water_ml,2500);assert.ok(plan.hydration.beverage_ml<2500);assert.ok(plan.hydration.food_water_ml>0);assert.ok(plan.evidence.some(x=>x.id==='usda'));
 assert.doesNotMatch(JSON.stringify(plan.meals),/花生|peanut/i);assert.ok(plan.meals[0].meals[0].parts.every(x=>x.fdc_id));
 assert.equal((await req('/api/v1/plans/'+g.data.id,undefined,await guest())).status,404);
 assert.equal((await req('/api/v1/plans/'+g.data.id)).status,401);
 assert.equal((await req('/api/v1/plans/generate',{assessment_id:a.data.id},token)).data.id,g.data.id);
 await req('/api/v1/me',undefined,token,'DELETE');
});

test('risk, emergency symptoms, missing consent and unknown water limits are handled',async()=>{
 const token=await guest();
 for(const changes of [{risks:{...payload.risks,pain:'yes'}},{risks:{...payload.risks,pain:'unknown'}},{red_flags:true},{age:17},{target_weight:40},{restrictions:'芝麻过敏'}]){const a=await assess(token,changes);assert.equal(a.data.risk,'review');assert.equal((await req('/api/v1/plans/generate',{assessment_id:a.data.id},token)).status,409);}
 assert.equal((await assess(token,{consent:false})).status,422);assert.equal((await assess(token,{height:0})).status,422);
 const a=await assess(token,{fluid_restriction:'unknown'}),g=await req('/api/v1/plans/generate',{assessment_id:a.data.id},token),plan=(await req('/api/v1/plans/'+g.data.id,undefined,token)).data;assert.equal(plan.hydration.eligible,false);assert.equal(plan.hydration.beverage_ml,null);
 await req('/api/v1/me',undefined,token,'DELETE');
});

test('register, cross-device login, checkins, recovery, export and deletion persist privately',async()=>{
 const initial=await guest(),a=await assess(initial),g=await req('/api/v1/plans/generate',{assessment_id:a.data.id},initial);
 const username='test_'+crypto.randomUUID().slice(0,8),password='Test-only-password-42!';
 let r=await req('/api/v1/auth/register',{username,password,consent:true},initial);assert.equal(r.status,201);let token=r.data.access_token,code=r.data.recovery_code;assert.ok(code.length>=32);
 assert.equal((await req('/api/v1/plans/'+g.data.id,undefined,initial)).status,401);
 assert.equal((await req('/api/v1/account',undefined,token)).data.plans[0].id,g.data.id);
 assert.equal((await req('/api/v1/auth/login',{username,password:'wrong'})).status,401);
 r=await req('/api/v1/auth/login',{username,password});assert.equal(r.status,200);const otherSession=r.data.access_token;assert.equal((await req('/api/v1/plans/'+g.data.id,undefined,otherSession)).status,200);
 const extraSession=(await req('/api/v1/auth/login',{username,password})).data.access_token;assert.equal((await req('/api/v1/auth/logout',{},extraSession)).status,200);assert.equal((await req('/api/v1/account',undefined,extraSession)).status,401);
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const log={day,weight:74.5,water_ml:1800,sleep_hours:7.5,exercise_minutes:35,notes:'test checkin'};
 assert.equal((await req('/api/v1/account/checkins',log,token)).status,200);assert.equal((await req('/api/v1/account/checkins',{...log,water_ml:1900},token)).status,200);
 assert.equal((await req('/api/v1/account/checkins',{...log,day:'2026-02-31'},token)).status,422);
 assert.equal((await req('/api/v1/account',undefined,otherSession)).data.checkins.length,1);assert.equal((await req('/api/v1/account',undefined,otherSession)).data.checkins[0].water_ml,1900);
 const exported=(await req('/api/v1/account/export',undefined,token)).data;assert.equal(exported.plans.length,1);assert.ok(!JSON.stringify(exported).includes('password_hash'));
 const outsider=await guest();assert.equal((await req('/api/v1/account',undefined,outsider)).status,401);assert.equal((await req('/api/v1/plans/'+g.data.id,undefined,outsider)).status,404);await req('/api/v1/me',undefined,outsider,'DELETE');
 const nextPassword='Another-safe-password-43!';r=await req('/api/v1/auth/recover',{username,recovery_code:code,password:nextPassword});assert.equal(r.status,200);token=r.data.access_token;assert.equal((await req('/api/v1/account',undefined,otherSession)).status,401);
 assert.equal((await req('/api/v1/auth/recover',{username,recovery_code:code,password:nextPassword})).status,401);
 assert.equal((await req('/api/v1/me',{password:'bad'},token,'DELETE')).status,401);assert.equal((await req('/api/v1/me',{password:nextPassword},token,'DELETE')).status,200);assert.equal((await req('/api/v1/account',undefined,token)).status,401);
});

test('origin and body limits reject unsafe requests',async()=>{
 const forbidden=await fetch(base+'/api/v1/visitors',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'});assert.equal(forbidden.status,403);assert.equal(forbidden.headers.get('Access-Control-Allow-Origin'),null);
 const huge=await fetch(base+'/api/v1/visitors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaign:'x'.repeat(25000)})});assert.equal(huge.status,413);
});
