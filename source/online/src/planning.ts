import {z} from 'zod';
import foodData from '../data/foods.json';
import sources from '../data/sources.json';
import type {Assessment} from './schemas';
const goals={fat_loss:'减脂塑形',muscle:'增肌增力',posture:'体态改善',fitness:'基础体能'};
export type Food=typeof foodData[number];
export function screen(d:Assessment){
 const bmi=d.weight/(d.height/100)**2;
 const reasons:string[]=[];
 if(d.red_flags)reasons.push('存在需及时就医的危险信号');
 if(d.age<18||d.age>65)reasons.push('年龄不在自动规划范围');
 if(Object.values(d.risks).some(x=>x!=='no'))reasons.push('运动风险为是或不确定');
 if(bmi<18.5||bmi>35)reasons.push('身体数据需要专业评估');
 if(d.target_weight&&d.target_weight/(d.height/100)**2<18.5)reasons.push('目标体重不适合自动规划');
 if(d.restrictions.trim())reasons.push('其他过敏或饮食限制需要人工核对');
 if(d.fluid_restriction==='yes')reasons.push('存在医嘱或特殊饮水限制，需要专业制定');
 return {risk:reasons.length?'review':'clear',urgent:d.red_flags,reasons,bmi:Math.round(bmi*10)/10};
}
const foodNames:Record<string,string>={'168878':'熟白米饭','171477':'熟烤鸡胸肉（去皮）','172421':'熟扁豆（不加盐）','171413':'橄榄油','169967':'熟西兰花（不加盐）','171688':'带皮苹果','173944':'香蕉'};
function food(id:string){const found=foodData.find(x=>x.id===id);if(!found||[found.kcal,found.protein_g,found.carbs_g,found.fat_g].some(x=>x===null))throw new Error('已核对的配餐食材数据缺失');return found;}
function aggregate(parts:{fdc_id:string;grams:number}[]){const totals={calories:0,protein:0,carbs:0,fat:0,water_ml:0};for(const part of parts){const f=food(part.fdc_id),s=part.grams/100;totals.calories+=f.kcal!*s;totals.protein+=f.protein_g!*s;totals.carbs+=f.carbs_g!*s;totals.fat+=f.fat_g!*s;totals.water_ml+=(f.water_g||0)*s;}return Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,Math.round(v*10)/10])) as typeof totals;}
export function mealSchedule(d:Assessment,n:{calories:number;protein:number;carbs:number;fat:number}){
 const vegan=d.preference==='vegetarian';
 const fixed=[{fdc_id:'169967',grams:400},{fdc_id:'171688',grams:300}];
 const base=aggregate(fixed),rice=food('168878'),protein=food(vegan?'172421':'171477'),oil=food('171413');
 // Solve the protein/energy equations after fixing fat energy to 30%.
 // Vegetarian legume plans use a lower protein target to avoid forcing extreme portions.
 const targetProtein=vegan?Math.min(n.protein,d.weight*1.2):n.protein;
 const remainingProtein=targetProtein-base.protein;
 const fatEnergy=(n.fat-base.fat)*oil.kcal!/100;
 const remainingEnergy=n.calories-base.calories-fatEnergy;
 const rEnergy=rice.kcal!-rice.fat_g!*oil.kcal!/100;
 const pEnergy=protein.kcal!-protein.fat_g!*oil.kcal!/100;
 const determinant=rice.protein_g!*pEnergy-protein.protein_g!*rEnergy;
 const riceHundreds=(remainingProtein*pEnergy-protein.protein_g!*remainingEnergy)/determinant;
 const proteinHundreds=(rice.protein_g!*remainingEnergy-remainingProtein*rEnergy)/determinant;
 const oilGrams=n.fat-base.fat-riceHundreds*rice.fat_g!-proteinHundreds*protein.fat_g!;
 if([riceHundreds,proteinHundreds,oilGrams].some(x=>!Number.isFinite(x)||x<=0))throw new Error('饮食约束需要营养师进一步评估');
 const parts=[...fixed,{fdc_id:rice.id,grams:Math.round(riceHundreds*100)},{fdc_id:protein.id,grams:Math.round(proteinHundreds*100)},{fdc_id:oil.id,grams:Math.round(oilGrams)}];
 const schedule=Array.from({length:7},(_,day)=>{
  const meals=Array.from({length:d.meals},(_,i)=>{
   const measured=parts.map(p=>({...p,grams:Math.floor(p.grams/d.meals)+(i<p.grams%d.meals?1:0)}));
   return {name:`第 ${i+1} 餐`,items:measured.map(p=>`${foodNames[p.fdc_id]} ${p.grams} g`),parts:measured.map(p=>({...p,name:foodNames[p.fdc_id],source_url:`https://fdc.nal.usda.gov/food-details/${p.fdc_id}/nutrients`})),totals:aggregate(measured),swap:'更换食材后营养值会变化，请重新计算。优先选择核实过敏原的等类食材；本周菜单作为定量基线，不是完整的长期膳食。'};
  });return {day:day+1,meals,totals:aggregate(parts)};
 });
 return {schedule,totals:aggregate(parts),vegetarian_note:vegan?'植物性基线未强制套用动物蛋白目标，实际蛋白质见菜单汇总；长期多样化与营养补充需专业评估。':null};
}
export function hydration(d:Assessment,foodWater:number){
 const eligible=d.fluid_restriction==='no'&&d.risks.disease==='no'&&d.risks.pregnancy==='no';
 if(!eligible)return {eligible:false,total_water_ml:null,beverage_ml:null,food_water_ml:null,unit:'mL / 日',source_id:'efsa-water',message:'尚未确认无医嘱限水、相关疾病或特殊情况，不给固定饮水数值。请按医疗团队意见确认。',exercise_note:'不要为完成打卡目标而强迫大量饮水。'};
 const total=d.sex==='male'?2500:d.sex==='female'?2000:null;
 return {eligible:true,total_water_ml:total,range_ml:total?null:[2000,2500],food_water_ml:Math.round(foodWater),beverage_ml:total?Math.max(0,Math.round((total-foodWater)/50)*50):null,unit:'mL / 日',source_id:'efsa-water',message:'EFSA 参考值是食物与所有饮料的总水，不是必须额外喝下的白水量。饮料部分根据示例菜单的水分相减，仅在实际吃法接近菜单时适用。未提供计算参数时只显示参考范围。',exercise_note:`${d.climate==='hot'?'炎热环境会增加不确定的失水；':'温和环境下'}运动 ${d.minutes} 分钟需结合口渴、出汗和实际失水调整，不用固定每公斤公式推算。医嘱限水、肾心疾病或症状不适时优先专业意见，不强迫灌水。`};
}
export function training(d:Assessment){
 const strengthSlots={1:[0],2:[0,3],3:[0,2,4],4:[0,2,4],5:[0,2,4]}[d.days]||[];
 const extra=d.days===4?[6]:d.days===5?[1,6]:[];
 const choices=[{name:'椅子深蹲',alternative:'扶墙浅蹲',equipment:'bodyweight'}, {name:'墙壁俯卧撑',alternative:'更高支撑面的俯卧撑',equipment:'bodyweight'}, {name:'臀桥',alternative:'站姿髋伸展',equipment:'bodyweight'}, {name:'鸟狗式',alternative:'仰卧交替抬腿',equipment:'bodyweight'}];
 if(d.equipment.includes('band'))choices[2]={name:'弹力带划船',alternative:'俯卧 W 抬手',equipment:'band'};
 if(d.equipment.includes('dumbbell'))choices[2]={name:'哑铃划船',alternative:'俯卧 W 抬手',equipment:'dumbbell'};
 if(d.location==='gym'&&d.equipment.includes('machines')){choices[0]={name:'器械腿举',alternative:'椅子深蹲',equipment:'machines'};choices[2]={name:'坐姿划船',alternative:'俯卧 W 抬手',equipment:'machines'};}
 const sets=d.experience==='beginner'||d.minutes<35?2:3;
 return Array.from({length:7},(_,i)=>{const strength=strengthSlots.includes(i),active=strength||extra.includes(i);return {day:i+1,title:strength?'全身力量':active?'轻松有氧与活动':'恢复日',minutes:active?d.minutes:10,intensity:d.experience==='beginner'?'RPE 5–6 / 10，保留 3–4 次余力':'RPE 6–7 / 10，保留 2–3 次余力',warmup:'预留 5 分钟轻松步行和无痛关节活动；首组先轻量练习。',cooldown:'预留 3–5 分钟慢走和呼吸恢复；余下可用时间轻松步行，不必练满。',exercises:strength?choices.slice(0,d.minutes<=20?3:4).map(e=>({...e,sets,reps:'8–12',rest:'60–90 秒'})):[]};});
}
const outputSchema=z.object({mode:z.literal('rules'),goal:z.string(),summary:z.object({age:z.number(),height:z.number(),weight:z.number(),days:z.number(),minutes:z.number(),location:z.string(),goal_key:z.string(),bmi:z.number()}),nutrition:z.object({calories:z.number().min(1500),protein:z.number().positive(),carbs:z.number().nonnegative(),fat:z.number().positive(),bmr:z.number(),tdee:z.number(),method:z.string(),guidance:z.string(),budget:z.string(),meal_count:z.number(),menu_totals:z.object({calories:z.number(),protein:z.number(),carbs:z.number(),fat:z.number(),water_ml:z.number()})}),training:z.array(z.object({day:z.number(),minutes:z.number(),title:z.string(),exercises:z.array(z.object({name:z.string(),sets:z.number(),reps:z.string(),rest:z.string(),alternative:z.string()}))})).length(7),meals:z.array(z.object({day:z.number(),meals:z.array(z.object({name:z.string(),items:z.array(z.string())}))})).length(7),safety:z.array(z.string())});
export function generate(d:Assessment){
 const safety=screen(d);if(safety.risk!=='clear')throw new Error('需要专业评估，未生成常规训练与减脂方案');
 const bmr=Math.round(10*d.weight+6.25*d.height-5*d.age+({male:5,female:-161,unspecified:-78}[d.sex]));
 const tdee=Math.round(bmr*(1.35+d.days*.03));
 const calories=Math.round(Math.max(1500,bmr,tdee*({fat_loss:.9,muscle:1.05,posture:1,fitness:1}[d.goal])));
 const protein=Math.round(d.weight*1.6),fat=Math.round(calories*.3/9),carbs=Math.round((calories-protein*4-fat*9)/4);
 const menu=mealSchedule(d,{calories,protein,carbs,fat});
 const plan={mode:'rules' as const,goal:goals[d.goal],summary:{age:d.age,height:d.height,weight:d.weight,days:d.days,minutes:d.minutes,location:d.location,goal_key:d.goal,bmi:safety.bmi},
 nutrition:{bmr,tdee,calories,protein,carbs,fat,budget:d.budget,meal_count:d.meals,method:'Mifflin–St Jeor 公式 + 假设活动系数；未提供性别计算参数时使用系数中点。不是实测代谢率。',guidance:'观察 2–4 周的体力、饥饿与趋势后调整，不承诺减重速度。宏量目标是参考，实际摄入看菜单统计。',menu_totals:menu.totals,vegetarian_note:menu.vegetarian_note},
 training:training(d),meals:menu.schedule,hydration:hydration(d,menu.totals.water_ml),recovery:{sleep:'睡眠建议结合实际作息和个人需求；记录趋势，不以打卡替代诊疗。',reported_sleep_hours:d.sleep_hours,progression:'连续两次稳定完成上限次数且无疼痛后，只增加少量次数或最小可用重量；力量日之间保留恢复。'},
 evidence:sources.filter(s=>['usda','who-activity','efsa-water','issn-protein','mifflin','who-diet'].includes(s.id)),version:'2026-10-25',
 safety:['规则驱动方案由服务端实际计算，未调用生成式 AI；不是医疗诊断或康复处方。','食品以 USDA 条目的可食部分重量为准；基线菜单使用熟米饭、熟蛋白食物、蔬菜、水果和油。','菜单仅为定量基线，不是长期唯一吃法；不覆盖全部微量营养需求。过敏须核对标签、调味与交叉接触。','本次常见过敏原通过保守食材选择过滤；未识别的限制不会被猜测处理。','出现持续疼痛、胸痛、晕厥或严重呼吸困难时停止运动并寻求医疗帮助。','体重和 BMI 不能诊断体成分、疾病或个体健康，缺失资料不会被当作正常结果。']};
 outputSchema.parse(plan);
 if(Math.abs(menu.totals.calories-calories)>Math.max(30,calories*.05))throw new Error('菜单能量校验未通过，需要进一步评估');
 const forbidden={peanut:['花生','peanut'],milk:['奶','milk'],egg:['鸡蛋','egg'],soy:['大豆','soy'],fish:['鱼','fish'],shellfish:['虾','蟹','shellfish'],wheat:['小麦','wheat'],nuts:['核桃','杏仁','almond']};
 const text=JSON.stringify(plan.meals).toLowerCase();if(d.allergies.some(a=>forbidden[a].some(x=>text.includes(x))))throw new Error('过敏原检查失败');
 return plan;
}
