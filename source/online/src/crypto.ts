const enc=new TextEncoder();
export const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
export async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))),x=>x.toString(16).padStart(2,'0')).join('');}
export async function passwordHash(password:string,salt:string){
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 const derived=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256);
 return Array.from(new Uint8Array(derived),x=>x.toString(16).padStart(2,'0')).join('');
}
export function equal(a:string,b:string){if(a.length!==b.length)return false;let result=0;for(let i=0;i<a.length;i++)result|=a.charCodeAt(i)^b.charCodeAt(i);return result===0;}
async function dataKey(secret:string){if(!/^[0-9a-f]{64}$/i.test(secret))throw new Error('Missing secure data key');return crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g)!,x=>parseInt(x,16)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function seal(value:unknown,owner:string,secret:string){const iv=crypto.getRandomValues(new Uint8Array(12));const body=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(owner)},await dataKey(secret),enc.encode(JSON.stringify(value)));return btoa(String.fromCharCode(...iv))+'.'+btoa(String.fromCharCode(...new Uint8Array(body)));}
export async function unseal<T>(value:string,owner:string,secret:string):Promise<T>{const [iv,body]=value.split('.');const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:Uint8Array.from(atob(iv),x=>x.charCodeAt(0)),additionalData:enc.encode(owner)},await dataKey(secret),Uint8Array.from(atob(body),x=>x.charCodeAt(0)));return JSON.parse(new TextDecoder().decode(data)) as T;}
