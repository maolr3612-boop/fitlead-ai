import {z} from 'zod';
import exercises from '../data/exercises.json';
import foods from '../data/foods.json';
import sources from '../data/sources.json';
import rehab from '../data/rehabilitation.json';
import manifest from '../data/manifest.json';
import {assessmentSchema,registerSchema,loginSchema,recoverySchema,checkinSchema} from './schemas';
import {generate,screen} from './planning';
import {randomToken,hash,passwordHash,equal,seal,unseal} from './crypto';
type Principal={id:string;kind:'guest'|'account';username:string|null;password_hash:string|null;salt:string|null;recovery_hash:string|null;created_at:string};
type AssessmentRow={id:string;principal_id:string;encrypted:string;risk:string;created_at:string};
type PlanRow={id:string;principal_id:string;assessment_id:string;encrypted:string;created_at:string};
class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
function fail(status:number,message:string):never{throw new HttpError(status,message);}
const ok=(data:unknown=null,status=200)=>Response.json({ok:true,data,error:null},{status});
const uuid=z.object({assessment_id:z.string().uuid()}).strict();
async function body(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'请使用 JSON 提交');
 if(Number(request.headers.get('content-length')||0)>24000)fail(413,'请求内容过大');
 const reader=request.body?.getReader();if(!reader)fail(400,'缺少请求内容');
 let size=0;const chunks:Uint8Array[]=[];while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>24000){await reader.cancel();fail(413,'请求内容过大');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes)) as unknown;}catch{fail(400,'JSON 格式不正确');}
}
function token(request:Request){return request.headers.get('Authorization')?.replace(/^Bearer /,'')||'';}
async function owner(request:Request,env:Env,required=true){const value=token(request);if(!/^[a-f0-9]{64}$/.test(value)){if(required)fail(401,'请登录账号或重新开始评估');return null;}
 const principal=await env.DB.prepare('SELECT p.* FROM principals p JOIN sessions s ON s.principal_id=p.id WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(value),Date.now()).first<Principal>();if(!principal&&required)fail(401,'登录已过期，请重新登录');return principal;}
async function session(env:Env,id:string){const value=randomToken();await env.DB.prepare('INSERT INTO sessions(token_hash,principal_id,expires_at) VALUES(?,?,?)').bind(await hash(value),id,Date.now()+7*86400000).run();return value;}
async function rate(env:Env,key:string,limit:number,period=60000){const now=Date.now(),bucket=Math.floor(now/period),id=await hash(key+':'+bucket);const r=await env.DB.prepare('INSERT INTO rate_limits(key,counter,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET counter=counter+1 RETURNING counter').bind(id,now+period*2).first<{counter:number}>();if(r&&r.counter>limit)fail(429,'请求过于频繁，请稍后重试');}
function accountOnly(p:Principal|null):asserts p is Principal{if(!p||p.kind!=='account')fail(401,'请先注册或登录账号');}
function publicAccount(p:Principal){return {id:p.id,kind:p.kind,username:p.username,created_at:p.created_at};}
async function routes(request:Request,env:Env){
 const url=new URL(request.url),p=url.pathname.replace(/\/$/,''),method=request.method;
 if(method==='GET'&&['/health','/api/v1/health'].includes(p))return ok({status:'ready',service:'FitLead online',generation:'validated-rules',ai_enabled:false,imported_at:manifest.imported_at,foods:foods.length,exercises:exercises.length,account_storage:'Cloudflare D1',health_data:'AES-GCM encrypted'});
 if(method==='GET'&&p==='/api/v1/catalog/meta')return ok({...manifest,rehabilitation_topics:rehab.length,sources});
 if(method==='GET'&&p==='/api/v1/catalog/rehabilitation')return ok({items:rehab,sources});
 if(method==='GET'&&p.startsWith('/api/v1/catalog/')){
  const kind=p.split('/').pop();if(kind!=='foods'&&kind!=='exercises')fail(404,'资料类别不存在');
  const query=(url.searchParams.get('q')||'').trim().toLowerCase();if(query.length>100)fail(422,'搜索词过长');
  const page=Number(url.searchParams.get('page')||1);if(!Number.isInteger(page)||page<1||page>1000)fail(422,'页码无效');
  const equipment=(url.searchParams.get('equipment')||'').slice(0,40),level=url.searchParams.get('level')||'';
  const aliases:Record<string,string>={'鸡肉':'chicken','鸡胸':'chicken breast','米饭':'rice','苹果':'apples','香蕉':'bananas','牛奶':'milk','鸡蛋':'egg','扁豆':'lentils','西兰花':'broccoli','花生':'peanut','深蹲':'squat','卧推':'bench press','划船':'row','肩':'shoulder','哑铃':'dumbbell','背':'back','腹':'abdominal','腿':'leg','俯卧撑':'push','鱼':'fish','牛肉':'beef','燕麦':'oats'};
  const needle=aliases[query]||query;
  const matching=kind==='foods'?foods.filter(x=>(x.name.toLowerCase().includes(needle)||x.id===needle)):exercises.filter(x=>(JSON.stringify([x.name,x.primaryMuscles,x.equipment]).toLowerCase().includes(needle))&&(!equipment||x.equipment===equipment)&&(!level||x.level===level));
  return ok({items:matching.slice((page-1)*20,page*20),page,total:matching.length,page_size:20,source:kind==='foods'?sources[0]:sources[1],note:kind==='foods'?'每 100 g 可食部分；null 表示原记录未提供，不能当作 0。':'原始文本主要为英文；社区目录未经逐项医学审核。'});
 }
 if(method!=='GET')await rate(env,'global:'+(request.headers.get('CF-Connecting-IP')||'local'),180);
 if(method==='POST'&&p==='/api/v1/visitors'){
  const d=z.object({source:z.enum(['direct','douyin','xiaohongshu']).default('direct'),campaign:z.string().max(64).regex(/^[a-zA-Z0-9_-]*$/).default('')}).strict().parse(await body(request));
  const existing=await owner(request,env,false);if(existing)return ok({id:existing.id,kind:existing.kind});
  const id=crypto.randomUUID();await env.DB.batch([env.DB.prepare("INSERT INTO principals(id,kind) VALUES(?,'guest')").bind(id),env.DB.prepare('INSERT INTO attribution(principal_id,source,campaign) VALUES(?,?,?)').bind(id,d.source,d.campaign)]);return ok({id,access_token:await session(env,id),kind:'guest'});
 }
 if(method==='POST'&&['/api/v1/auth/register','/api/v1/auth/login','/api/v1/auth/recover'].includes(p)){
  await rate(env,'auth-ip:'+(request.headers.get('CF-Connecting-IP')||'local'),15,900000);
  if(p.endsWith('/register')){
   const d=registerSchema.parse(await body(request));await rate(env,'auth-name:'+d.username,8,900000);
   if(await env.DB.prepare('SELECT id FROM principals WHERE username=?').bind(d.username).first())fail(409,'账号名称不可用，请换一个');
   const guest=await owner(request,env,false);if(guest?.kind==='account')fail(409,'请先退出当前账号');
   const id=guest?.id||crypto.randomUUID(),salt=randomToken(),recovery=randomToken();
   const values=[d.username,await passwordHash(d.password,salt),salt,await hash(recovery),id];
   if(guest)await env.DB.prepare("UPDATE principals SET kind='account',username=?,password_hash=?,salt=?,recovery_hash=? WHERE id=? AND kind='guest'").bind(...values).run();
   else await env.DB.prepare("INSERT INTO principals(username,password_hash,salt,recovery_hash,id,kind) VALUES(?,?,?,?,?,'account')").bind(...values).run();
   await env.DB.prepare('DELETE FROM sessions WHERE principal_id=?').bind(id).run();
   return ok({access_token:await session(env,id),recovery_code:recovery,account:{id,kind:'account',username:d.username},message:'恢复码仅展示这一次；请离线妥善保存。当前匿名方案已归入新账号。'},201);
  }
  if(p.endsWith('/recover')){
   const d=recoverySchema.parse(await body(request));await rate(env,'auth-name:'+d.username,6,900000);
   const user=await env.DB.prepare('SELECT * FROM principals WHERE username=?').bind(d.username).first<Principal>();
   if(!user?.recovery_hash||!equal(await hash(d.recovery_code),user.recovery_hash))fail(401,'账号或恢复码不正确');
   const salt=randomToken(),recovery=randomToken();await env.DB.batch([env.DB.prepare('UPDATE principals SET password_hash=?,salt=?,recovery_hash=? WHERE id=?').bind(await passwordHash(d.password,salt),salt,await hash(recovery),user.id),env.DB.prepare('DELETE FROM sessions WHERE principal_id=?').bind(user.id)]);
   return ok({access_token:await session(env,user.id),recovery_code:recovery,account:publicAccount(user)});
  }
  const d=loginSchema.parse(await body(request));await rate(env,'auth-name:'+d.username,10,900000);
  const user=await env.DB.prepare('SELECT * FROM principals WHERE username=?').bind(d.username).first<Principal>();
  const digest=await passwordHash(d.password,user?.salt||'fitlead-nonexistent-account-salt');
  if(!user?.password_hash||!equal(digest,user.password_hash))fail(401,'账号或密码不正确');
  return ok({access_token:await session(env,user.id),account:publicAccount(user)});
 }
 const principal=await owner(request,env);if(!principal)fail(401,'请先登录或开始评估');
 if(method==='POST'&&p==='/api/v1/auth/logout'){await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(token(request))).run();return ok({signed_out:true});}
 if(method==='GET'&&p==='/api/v1/account'){accountOnly(principal);const rows=await env.DB.prepare('SELECT id,encrypted,created_at FROM plans WHERE principal_id=? ORDER BY created_at DESC LIMIT 100').bind(principal.id).all<PlanRow>();const logs=await env.DB.prepare('SELECT day,encrypted FROM checkins WHERE principal_id=? ORDER BY day DESC LIMIT 366').bind(principal.id).all<{day:string;encrypted:string}>();return ok({account:publicAccount(principal),plans:await Promise.all(rows.results.map(async r=>{const plan=await unseal<ReturnType<typeof generate>>(r.encrypted,principal.id,env.DATA_KEY);return {id:r.id,goal:plan.goal,created_at:r.created_at,summary:plan.summary,calories:plan.nutrition.calories};})),checkins:await Promise.all(logs.results.map(r=>unseal(r.encrypted,principal.id,env.DATA_KEY)))});}
 if(method==='GET'&&p==='/api/v1/account/export'){accountOnly(principal);const plans=await env.DB.prepare('SELECT id,encrypted,created_at FROM plans WHERE principal_id=?').bind(principal.id).all<PlanRow>();const assessments=await env.DB.prepare('SELECT id,encrypted,created_at FROM assessments WHERE principal_id=?').bind(principal.id).all<AssessmentRow>();const logs=await env.DB.prepare('SELECT encrypted FROM checkins WHERE principal_id=?').bind(principal.id).all<{encrypted:string}>();return ok({exported_at:new Date().toISOString(),account:publicAccount(principal),plans:await Promise.all(plans.results.map(async r=>({id:r.id,created_at:r.created_at,content:await unseal(r.encrypted,principal.id,env.DATA_KEY)}))),assessments:await Promise.all(assessments.results.map(async r=>({id:r.id,created_at:r.created_at,content:await unseal(r.encrypted,principal.id,env.DATA_KEY)}))),checkins:await Promise.all(logs.results.map(r=>unseal(r.encrypted,principal.id,env.DATA_KEY)))});}
 if(method==='POST'&&p==='/api/v1/account/checkins'){accountOnly(principal);const d=checkinSchema.parse(await body(request));await env.DB.prepare('INSERT INTO checkins(principal_id,day,encrypted) VALUES(?,?,?) ON CONFLICT(principal_id,day) DO UPDATE SET encrypted=excluded.encrypted').bind(principal.id,d.day,await seal(d,principal.id,env.DATA_KEY)).run();return ok({day:d.day,saved:true});}
 if(method==='POST'&&p==='/api/v1/events'){const d=z.object({name:z.enum(['assessment_started','consultation_opened'])}).strict().parse(await body(request));await env.DB.prepare('INSERT INTO events(id,principal_id,name) VALUES(?,?,?)').bind(crypto.randomUUID(),principal.id,d.name).run();return ok();}
 if(method==='POST'&&p==='/api/v1/assessments'){
  const d=assessmentSchema.parse(await body(request));const existing=await env.DB.prepare('SELECT id,risk FROM assessments WHERE principal_id=? AND request_key=?').bind(principal.id,d.request_key).first<{id:string;risk:string}>();if(existing)return ok(existing);
  const id=crypto.randomUUID(),safety=screen(d);await env.DB.prepare('INSERT INTO assessments(id,principal_id,request_key,encrypted,risk) VALUES(?,?,?,?,?)').bind(id,principal.id,d.request_key,await seal(d,principal.id,env.DATA_KEY),safety.risk).run();return ok({id,...safety});
 }
 if(method==='POST'&&p==='/api/v1/plans/generate'){
  const d=uuid.parse(await body(request));const a=await env.DB.prepare('SELECT * FROM assessments WHERE id=? AND principal_id=?').bind(d.assessment_id,principal.id).first<AssessmentRow>();if(!a)fail(404,'找不到你的评估');if(a.risk!=='clear')fail(409,'需要进一步专业评估，未生成常规计划');
  const existing=await env.DB.prepare('SELECT id FROM plans WHERE assessment_id=? AND principal_id=?').bind(a.id,principal.id).first<{id:string}>();if(existing)return ok(existing);
  await rate(env,'plan:'+principal.id,10,3600000);let content;try{content=generate(assessmentSchema.parse(await unseal(a.encrypted,principal.id,env.DATA_KEY)));}catch(e){fail(409,e instanceof Error?e.message:'方案安全校验未通过');}
  const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO plans(id,principal_id,assessment_id,encrypted) VALUES(?,?,?,?)').bind(id,principal.id,a.id,await seal(content,principal.id,env.DATA_KEY)).run();return ok({id});
 }
 if(method==='GET'&&/^\/api\/v1\/plans\/[a-f0-9-]{36}$/.test(p)){
  const row=await env.DB.prepare('SELECT * FROM plans WHERE id=? AND principal_id=?').bind(p.split('/').pop(),principal.id).first<PlanRow>();if(!row)fail(404,'方案不存在或不属于当前账号');return ok({id:row.id,...await unseal<ReturnType<typeof generate>>(row.encrypted,principal.id,env.DATA_KEY)});
 }
 if(method==='POST'&&p==='/api/v1/leads'){
  const d=z.object({goal:z.enum(['fat_loss','muscle','posture','fitness']),consent:z.literal(true),contact:z.string().trim().min(5).max(120).refine(x=>/^1[3-9]\d{9}$/.test(x)||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)||/^[a-zA-Z][a-zA-Z0-9_-]{5,39}$/.test(x))}).strict().parse(await body(request));const existing=await env.DB.prepare('SELECT id FROM leads WHERE principal_id=?').bind(principal.id).first<{id:string}>();const id=existing?.id||crypto.randomUUID();await env.DB.prepare('INSERT INTO leads(id,principal_id,encrypted,authorized) VALUES(?,?,?,1) ON CONFLICT(principal_id) DO UPDATE SET encrypted=excluded.encrypted,authorized=1').bind(id,principal.id,await seal(d,principal.id,env.DATA_KEY)).run();return ok({id});
 }
 if(method==='POST'&&p==='/api/v1/appointments'){
  const d=z.object({lead_id:z.string().uuid(),preferred_time:z.string().min(2).max(200)}).strict().parse(await body(request));const lead=await env.DB.prepare('SELECT id FROM leads WHERE id=? AND principal_id=? AND authorized=1').bind(d.lead_id,principal.id).first();if(!lead)fail(404,'找不到已授权咨询');const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO appointments(id,lead_id,encrypted) VALUES(?,?,?) ON CONFLICT(lead_id) DO UPDATE SET encrypted=excluded.encrypted').bind(id,d.lead_id,await seal({preferred_time:d.preferred_time},principal.id,env.DATA_KEY)).run();return ok({received:true});
 }
 if(method==='DELETE'&&p==='/api/v1/me/consent'){await env.DB.prepare('DELETE FROM leads WHERE principal_id=?').bind(principal.id).run();return ok({message:'联系授权已撤回，联系方式和预约已删除'});}
 if(method==='DELETE'&&p==='/api/v1/me'){
  if(principal.kind==='account'){const d=z.object({password:z.string().min(1).max(128)}).strict().parse(await body(request));if(!equal(await passwordHash(d.password,principal.salt!),principal.password_hash!))fail(401,'请用当前密码确认删除');}
  await env.DB.prepare('DELETE FROM principals WHERE id=?').bind(principal.id).run();return ok({deleted:true,message:'本浏览器关联的个人数据已删除；账号如已登录也已永久删除'});
 }
 if(method==='POST'&&p==='/api/v1/chat')return ok({enabled:false,reason:'在线服务采用有来源与确定性校验的规则方案；尚未启用生成式 AI。'});
 if(p.startsWith('/api/v1/admin'))fail(401,'在线管理权限尚未配置，请使用本地管理员服务');
 fail(404,'接口不存在');
}
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const origin=request.headers.get('Origin'),allowed=env.ALLOWED_ORIGINS.split(',');
  const headers:Record<string,string>={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin'};
  if(origin&&allowed.includes(origin)){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='Content-Type, Authorization';headers['Access-Control-Allow-Methods']='GET, POST, DELETE, OPTIONS';}
  if(origin&&!allowed.includes(origin))return Response.json({ok:false,data:null,error:{message:'访问来源不被允许'}},{status:403,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  let response:Response;try{if(!env.DATA_KEY)fail(503,'数据保护配置缺失，服务未开放');response=await routes(request,env);}catch(e){const status=e instanceof HttpError?e.status:e instanceof z.ZodError?422:500;const message=e instanceof HttpError?e.message:e instanceof z.ZodError?'请检查输入范围、必填项和授权选项':'服务暂时不可用，请稍后重试';response=Response.json({ok:false,data:null,error:{message}},{status});}
  const out=new Response(response.body,response);for(const [key,value] of Object.entries(headers))out.headers.set(key,value);return out;
 },
 async scheduled(_controller:ScheduledController,env:Env){await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()),env.DB.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(Date.now())]);}
} satisfies ExportedHandler<Env>;
