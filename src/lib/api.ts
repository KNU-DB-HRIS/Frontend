import {ERROR_MESSAGES, FIELD_LABELS} from './errors';
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
/** 서버 오류 코드 → 사용자 문구. 서버가 코드 문자열만 message로 보내도(예: EMAIL_DUPLICATE) 화면에는 한국어로 표시 */
export function describeError(code:string,serverMessage?:string,details?:Record<string,unknown>){
  if(code==='VALIDATION_ERROR'){
    const field=typeof details?.field==='string'?details.field:'';
    if(field==='comment')return '반려할 때는 결재 의견(반려 사유)을 입력해 주세요.';
    const label=FIELD_LABELS[field]||field;
    return label?`입력값을 확인해 주세요. (항목: ${label})`:ERROR_MESSAGES.VALIDATION_ERROR;
  }
  if(ERROR_MESSAGES[code])return ERROR_MESSAGES[code];
  if(serverMessage&&serverMessage!==code&&!/^[A-Z][A-Z0-9_]+$/.test(serverMessage))return serverMessage;
  return '';
}
export async function request<T>(path:string,options:RequestInit={}):Promise<T>{
  const method=(options.method||'GET').toUpperCase();
  const headers=new Headers(options.headers);
  if(options.body&&!(options.body instanceof FormData)&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  if(!['GET','HEAD','OPTIONS'].includes(method)&&csrfToken)headers.set('X-CSRF-Token',csrfToken);
  let res:Response;
  try{res=await fetch(endpoint(path),{...options,method,headers,credentials:'include'});}catch{throw new ApiError(0,'NETWORK_ERROR',ERROR_MESSAGES.NETWORK_ERROR);}
  if(!res.ok){if(res.status===401 && !path.includes('/auth/login'))unauthorizedHandler?.();let body:ApiErrorBody={};try{body=await res.json() as ApiErrorBody;}catch{ /* response may not be JSON */ }
    const code=body.error?.code||`HTTP_${res.status}`;
    throw new ApiError(res.status,code,describeError(code,body.error?.message,body.error?.details)||`요청을 처리하지 못했습니다. (HTTP ${res.status})`);
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
