export type ApiErrorBody = { error?: {code?: string; message?: string; details?: Record<string,unknown>} };
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); this.name='ApiError'; }
}
const BASE=(import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/,'');
let csrfToken: string | null=null;
let unauthorizedHandler:(()=>void)|null=null;
export function setUnauthorizedHandler(callback:(()=>void)|null){unauthorizedHandler=callback;}
export function setCsrfToken(v: string|null){csrfToken=v;}
function endpoint(path:string){return `${BASE}${path.startsWith('/')?path:`/${path}`}`;}
export function params(values:Record<string,string|number|undefined|null>){const query=new URLSearchParams();Object.entries(values).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')query.set(k,String(v));});const result=query.toString();return result?`?${result}`:'';}
export async function request<T>(path:string,options:RequestInit={}):Promise<T>{
  const method=(options.method||'GET').toUpperCase();
  const headers=new Headers(options.headers);
  if(options.body&&!(options.body instanceof FormData)&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  if(!['GET','HEAD','OPTIONS'].includes(method)&&csrfToken)headers.set('X-CSRF-Token',csrfToken);
  let res:Response;
  try{res=await fetch(endpoint(path),{...options,method,headers,credentials:'include'});}catch{throw new ApiError(0,'NETWORK_ERROR','서버에 연결할 수 없습니다. 백엔드 주소와 실행 상태를 확인하세요.');}
  if(!res.ok){if(res.status===401 && !path.includes('/auth/login'))unauthorizedHandler?.();let body:ApiErrorBody={};try{body=await res.json() as ApiErrorBody;}catch{ /* response may not be JSON */ }
    throw new ApiError(res.status,body.error?.code||`HTTP_${res.status}`,body.error?.message||`요청이 실패했습니다. (HTTP ${res.status})`);
  }
  if(res.status===204)return undefined as T;
  if(res.headers.get('content-type')?.includes('application/pdf'))return await res.blob() as T;
  try{return await res.json() as T;}catch{throw new ApiError(res.status,'INVALID_JSON','서버 응답이 올바른 JSON 형식이 아닙니다.');}
}
export const api={
  get:<T>(path:string)=>request<T>(path),
  post:<T>(path:string,body?:unknown)=>request<T>(path,{method:'POST',body:body===undefined?undefined:JSON.stringify(body)}),
  patch:<T>(path:string,body:unknown)=>request<T>(path,{method:'PATCH',body:JSON.stringify(body)}),
  delete:(path:string)=>request<void>(path,{method:'DELETE'}),
  upload:<T>(path:string,formData:FormData)=>request<T>(path,{method:'POST',body:formData}),
  file:(path:string)=>request<Blob>(path),
};
export async function downloadPdf(path:string,name:string){const blob=await api.file(path);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
export function errorMessage(error:unknown){return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';}
