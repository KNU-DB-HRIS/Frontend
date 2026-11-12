import{useCallback,useEffect,useState,type FormEvent}from 'react';
import {ArrowRight,Search,X}from 'lucide-react';
import {api,ApiError,errorMessage,setCsrfToken,setUnauthorizedHandler}from './lib/api';
import type{LoginResponse,PageId,Session}from './lib/types';
import{Shell}from './components/Shell';
import{Dashboard}from './pages/Dashboard';
import{Employees}from './pages/Employees';
import{Payroll}from './pages/Payroll';
import{Organization}from './pages/Organization';
import{EvaluationPage}from './pages/Evaluation';
import{Approvals}from './pages/Approvals';
import{DocumentsPage}from './pages/Documents';
import{HrAi}from './pages/HrAi';
import{ErrorState,Loading,Modal}from './components/UI';
function firstPage(s:Session):PageId{return s.menus.includes('DASHBOARD')?'dashboard':'documents'}
export default function App(){
 const[session,setSession]=useState<Session|null>(null),[checking,setChecking]=useState(true),[checkError,setCheckError]=useState(''),[page,setPage]=useState<PageId>('dashboard'),[notice,setNotice]=useState(''),[initialQuery,setInitialQuery]=useState(''),[createEmployee,setCreateEmployee]=useState(false),[search,setSearch]=useState(''),[initialApproval,setInitialApproval]=useState<number|null>(null);
 const notify=useCallback((m:string)=>{setNotice(m);window.setTimeout(()=>setNotice(''),6500)},[]);
 useEffect(()=>{setUnauthorizedHandler(()=>{setSession(null);setCsrfToken(null);setSearch('');});return()=>setUnauthorizedHandler(null)},[]);
 const restore=useCallback(async()=>{setChecking(true);setCheckError('');try{const me=await api.get<Session>('/auth/me');setCsrfToken(me.csrf_token);setSession(me);setPage(firstPage(me));}catch(e){if(e instanceof ApiError&&e.status===401){setSession(null);setCsrfToken(null)}else setCheckError(`인증 상태 확인(/api/v1/auth/me) 실패: ${errorMessage(e)}`);}finally{setChecking(false)}},[]);
 useEffect(()=>{void restore()},[restore]);
 async function login(username:string,password:string){const result=await api.post<LoginResponse>('/auth/login',{username,password});setCsrfToken(result.csrf_token);const me=await api.get<Session>('/auth/me');setCsrfToken(me.csrf_token);setSession(me);setPage(firstPage(me));}
 async function logout(){try{await api.post<void>('/auth/logout');}catch(e){notify(errorMessage(e));return;}setCsrfToken(null);setSession(null);setSearch('');}
 const navigate=(p:PageId)=>{if(session&&!session.menus.includes(({dashboard:'DASHBOARD',employees:'EMPLOYEES',organization:'ORGANIZATION',payroll:'PAYROLL',evaluation:'EVALUATION',approvals:'DOCUMENTS',documents:'DOCUMENTS',ai:'AI'}as const)[p])){notify('해당 메뉴에 접근할 권한이 없습니다.');return;}setPage(p)};
 if(checking)return <div className="center-screen"><Loading/></div>;
 if(checkError)return <div className="center-screen"><ErrorState message={checkError}onRetry={restore}/></div>;
 if(!session)return <Login onLogin={login}/>;
 const view={
  dashboard:<Dashboard onNewEmployee={()=>{setCreateEmployee(true);setPage('employees')}}/>,
  employees:<Employees notify={notify} initialQuery={initialQuery} openCreate={createEmployee} onCreateHandled={()=>setCreateEmployee(false)}/> ,
  payroll:<Payroll/>,organization:<Organization notify={notify}/>,evaluation:<EvaluationPage/>,approvals:<Approvals notify={notify} initialRequestId={initialApproval} onCertificates={()=>navigate('documents')}/>,documents:<DocumentsPage session={session} notify={notify}/>,ai:<HrAi/>
 }[page];
 return <><Shell session={session}page={page}onPage={navigate}onLogout={()=>void logout()}onSearch={setSearch}>{view}</Shell>{search&&<SearchResults query={search} onClose={()=>setSearch('')} onEmployee={(q)=>{setInitialQuery(q);navigate('employees');setSearch('')}} onApproval={(id)=>{setInitialApproval(id);navigate('approvals');setSearch('')}}/>}{notice&&<div className="toast" role="status"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="메시지 닫기"><X size={18}/></button></div>}</>;
}
function Login({onLogin}:{onLogin:(u:string,p:string)=>Promise<void>}){
 const[username,setUsername]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{await onLogin(username,password)}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
 return <main className="login-screen figma-login"><div className="login-layout"><div className="login-art" aria-hidden="true"><div className="login-orb"/></div><div className="login-fields"><h1>HRIS</h1><form onSubmit={submit} className="login-form"><label><span className="sr-only">아이디</span><input autoComplete="username" required value={username} onChange={e=>setUsername(e.target.value)} placeholder="아이디"/></label><label><span className="sr-only">비밀번호</span><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호"/></label>{error&&<span className="inline-error" role="alert">{error}</span>}<button className="login-submit" type="submit" disabled={busy} aria-label="로그인">{busy?'···':<ArrowRight size={40} strokeWidth={1.6}/>}</button></form></div></div></main>

}
type SearchData={q?:string;employees?:{items:Array<{employee_id:number;name:string;employee_no?:string}>;total:number};approvals?:{items:Array<{request_id:number;title:string}>;total:number}};
function SearchResults({query,onClose,onEmployee,onApproval}:{query:string;onClose:()=>void;onEmployee:(s:string)=>void;onApproval:(id:number)=>void}){
 const[data,setData]=useState<SearchData|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let cancelled=false;setLoading(true);setError('');api.get<SearchData>('/search?q='+encodeURIComponent(query)).then(v=>{if(!cancelled)setData(v)}).catch(e=>{if(!cancelled)setError(errorMessage(e))}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true}},[query]);
 return <Modal title={`검색 결과 · ${query}`} onClose={onClose}>{loading?<Loading/>:error?<ErrorState message={error}/>:<div className="search-results"><h3>구성원</h3>{data?.employees?.items?.length?data.employees.items.map(e=><button key={e.employee_id} onClick={()=>onEmployee(e.name)}><Search size={15}/>{e.name} · {e.employee_no}</button>):<p>검색된 구성원이 없습니다.</p>}<h3>문서</h3>{data?.approvals?.items?.length?data.approvals.items.map(x=><button key={x.request_id} onClick={()=>onApproval(x.request_id)}><Search size={15}/>{x.title}</button>):<p>검색된 문서가 없습니다.</p>}</div>}</Modal>
}
