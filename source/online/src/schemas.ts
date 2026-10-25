import {z} from 'zod';
export const risksSchema=z.object({minor:z.enum(['yes','no','unknown']),pregnancy:z.enum(['yes','no','unknown']),disease:z.enum(['yes','no','unknown']),pain:z.enum(['yes','no','unknown']),contraindication:z.enum(['yes','no','unknown']),eating_disorder:z.enum(['yes','no','unknown'])}).strict();
export const assessmentSchema=z.object({
 goal:z.enum(['fat_loss','muscle','posture','fitness']),age:z.number().int().min(1).max(100),height:z.number().min(120).max(230),weight:z.number().min(35).max(250),
 sex:z.enum(['female','male','unspecified']),target_weight:z.number().min(35).max(250).nullable().default(null),
 experience:z.enum(['beginner','intermediate','advanced']),days:z.number().int().min(1).max(5),minutes:z.number().int().min(20).max(90),location:z.enum(['home','gym']),
 equipment:z.array(z.enum(['bodyweight','dumbbell','band','machines'])).max(4),meals:z.number().int().min(2).max(5),preference:z.enum(['balanced','vegetarian']),
 allergies:z.array(z.enum(['peanut','milk','egg','soy','fish','shellfish','wheat','nuts'])).max(8),restrictions:z.string().trim().max(300),takeaway:z.boolean(),budget:z.enum(['low','medium','high']),
 risks:risksSchema,consent:z.literal(true),request_key:z.string().uuid(),
 waist:z.number().min(40).max(200).nullable().optional(),sleep_hours:z.number().min(0).max(16).default(7),
 fluid_restriction:z.enum(['yes','no','unknown']).default('unknown'),climate:z.enum(['mild','hot']).default('mild'),
 red_flags:z.boolean().default(false)
}).strict();
export type Assessment=z.infer<typeof assessmentSchema>;
export const username=z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/,'账号需为 3–32 位小写字母、数字或下划线');
export const password=z.string().min(12,'密码至少 12 位').max(128,'密码最多 128 位');
export const registerSchema=z.object({username,password,consent:z.literal(true)}).strict();
export const loginSchema=z.object({username,password:z.string().min(1).max(128)}).strict();
export const recoverySchema=z.object({username,recovery_code:z.string().min(20).max(100),password}).strict();
export const checkinSchema=z.object({day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),weight:z.number().min(35).max(250).nullable(),water_ml:z.number().int().min(0).max(10000),sleep_hours:z.number().min(0).max(16),exercise_minutes:z.number().int().min(0).max(300),notes:z.string().trim().max(500)}).strict().refine(d=>{const date=new Date(d.day+'T12:00:00Z');return !Number.isNaN(date.valueOf())&&date.toISOString().startsWith(d.day)&&d.day<=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());},'日期无效或晚于今天');
