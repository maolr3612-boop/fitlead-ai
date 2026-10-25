import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generate,screen} from '../dist/planning-test.mjs';
const base={goal:'fat_loss',age:30,height:170,weight:70,sex:'male',target_weight:null,experience:'beginner',days:3,minutes:40,location:'home',equipment:['bodyweight'],meals:3,preference:'balanced',allergies:['peanut','milk','egg','soy','fish','shellfish','wheat','nuts'],restrictions:'',takeaway:false,budget:'medium',risks:Object.fromEntries(['minor','pregnancy','disease','pain','contraindication','eating_disorder'].map(k=>[k,'no'])),consent:true,request_key:crypto.randomUUID(),fluid_restriction:'no',sleep_hours:7,climate:'mild',red_flags:false};
test('eligible body data, goals, dietary preferences and time constraints remain valid',()=>{
 let checked=0;
 const professionalReview=new Set(['80:155:female:fat_loss:vegetarian','100:175:female:fat_loss:vegetarian']);
 for(const weight of [50,65,80,100])for(const height of [155,175,190])for(const sex of ['male','female','unspecified'])for(const goal of ['fat_loss','muscle','fitness'])for(const preference of ['balanced','vegetarian']){
  const d={...base,weight,height,sex,goal,preference};if(screen(d).risk!=='clear')continue;
  if(professionalReview.has([weight,height,sex,goal,preference].join(':'))){assert.throws(()=>generate(d),/需要营养师进一步评估/);continue;}
  const p=generate(d);assert.ok(p.nutrition.calories>=Math.max(1500,p.nutrition.bmr));assert.ok(Math.abs(p.nutrition.menu_totals.calories-p.nutrition.calories)<p.nutrition.calories*.05);assert.doesNotMatch(JSON.stringify(p.meals),/peanut|花生|鸡蛋|大豆|牛奶/);checked++;
 }
 assert.ok(checked>=100);console.log('Verified healthy combinations:',checked,'; explicitly referred constrained plant menus:',professionalReview.size);
 for(const days of [1,2,3,4,5])for(const minutes of [20,40,90]){
  const p=generate({...base,days,minutes});assert.equal(p.training.filter(x=>x.exercises.length||x.title==='轻松有氧与活动').length,days);
  const strength=p.training.filter(x=>x.exercises.length).map(x=>x.day);assert.ok(strength.every((v,i)=>i===0||v-strength[i-1]>1));
  assert.ok(p.training.every(x=>x.exercises.every(e=>e.equipment==='bodyweight')));if(minutes===20)assert.ok(p.training.every(x=>x.exercises.length<=3));
 }
});
