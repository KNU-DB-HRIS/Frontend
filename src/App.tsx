import{Fragment,useCallback,useEffect,useState,type FormEvent}from 'react';
import {ArrowRight,Search,X}from 'lucide-react';
import {api,ApiError,errorMessage,setCsrfToken,setUnauthorizedHandler}from './lib/api';
import type{LoginResponse,MenuCode,PageId,Session}from './lib/types';
import{Shell}from './components/Shell';
import{Dashboard}from './pages/Dashboard';
import{Employees}from './pages/Employees';
import{Payroll}from './pages/Payroll';
import{Organization}from './pages/Organization';
import{EmployeeEvaluation,EvaluationPage}from './pages/Evaluation';
import{Approvals}from './pages/Approvals';
import{DocumentsPage}from './pages/Documents';
import{HrAi}from './pages/HrAi';
import{Schedule}from './pages/Schedule';
import{EmployeeDashboard}from './pages/EmployeeDashboard';
import{ErrorState,Loading,Modal}from './components/UI';
const MENU_OF:Record<PageId,MenuCode>={dashboard:'DASHBOARD',employees:'EMPLOYEES',organization:'ORGANIZATION',payroll:'PAYROLL',evaluation:'EVALUATION',approvals:'DOCUMENTS',documents:'DOCUMENTS',schedule:'SCHEDULE',ai:'AI'};
function firstPage(s:Session):PageId{return s.menus.includes('DASHBOARD')?'dashboard':'approvals'}
export default function App(){
 const[session,setSession]=useState<Session|null>(null),[checking,setChecking]=useState(true),[checkError,setCheckError]=useState(''),[page,setPage]=useState<PageId>('dashboard'),[notice,setNotice]=useState(''),[initialQuery,setInitialQuery]=useState(''),[aiAsk,setAiAsk]=useState<{text:string;id:number}|null>(null),[createEmployee,setCreateEmployee]=useState(false),[search,setSearch]=useState(''),[initialApproval,setInitialApproval]=useState<number|null>(null);
 const notify=useCallback((m:string)=>{setNotice(m);window.setTimeout(()=>setNotice(''),6500)},[]);
 useEffect(()=>{setUnauthorizedHandler(()=>{setSession(null);setCsrfToken(null);setSearch('');});return()=>setUnauthorizedHandler(null)},[]);
 const restore=useCallback(async()=>{setChecking(true);setCheckError('');try{const me=await api.get<Session>('/auth/me');setCsrfToken(me.csrf_token);setSession(me);setPage(firstPage(me));}catch(e){if(e instanceof ApiError&&e.status===401){setSession(null);setCsrfToken(null)}else setCheckError(`인증 상태 확인(/api/v1/auth/me) 실패: ${errorMessage(e)}`);}finally{setChecking(false)}},[]);
 useEffect(()=>{void restore()},[restore]);
 async function login(username:string,password:string){const result=await api.post<LoginResponse>('/auth/login',{username,password});setCsrfToken(result.csrf_token);const me=await api.get<Session>('/auth/me');setCsrfToken(me.csrf_token);setSession(me);setPage(firstPage(me));}
 async function logout(){try{await api.post<void>('/auth/logout');}catch(e){notify(errorMessage(e));return;}setCsrfToken(null);setSession(null);setSearch('');}
 const navigate=(p:PageId)=>{if(session&&!session.menus.includes(MENU_OF[p])){notify('해당 메뉴에 접근할 권한이 없습니다.');return;}setPage(p)};
 /** 계열사 목록이 바뀐 뒤(등록 등) 회사 전환 메뉴를 갱신 */
 const refreshSession=useCallback(async()=>{try{const me=await api.get<Session>('/auth/me');setCsrfToken(me.csrf_token);setSession(me);}catch(e){notify(errorMessage(e))}},[notify]);
 /** 현재 회사 전환: 세션이 바뀌면 본문을 새로 그려 모든 화면이 그 회사 데이터를 다시 불러옴 */
 async function switchCompany(companyId:number){try{const me=await api.post<Session>('/auth/active-company',{company_id:companyId});setCsrfToken(me.csrf_token);setSession(me);setSearch('');setInitialQuery('');setInitialApproval(null);setPage(p=>me.menus.includes(MENU_OF[p])?p:firstPage(me));notify(`${me.company.name||'선택한 회사'}(으)로 전환했습니다.`);}catch(e){notify(errorMessage(e))}}
 if(checking)return <div className="center-screen"><Loading/></div>;
 if(checkError)return <div className="center-screen"><ErrorState message={checkError}onRetry={restore}/></div>;
 if(!session)return <Login onLogin={login}/>;
 const view={
  dashboard:session.roles.includes('HR_ADMIN')?<Dashboard onNewEmployee={()=>{setCreateEmployee(true);setPage('employees')}} onOpenEmployees={()=>navigate('employees')}/>:<EmployeeDashboard session={session} onNavigate={navigate}/>,
  employees:<Employees notify={notify} initialQuery={initialQuery} openCreate={createEmployee} onCreateHandled={()=>setCreateEmployee(false)}/> ,
  payroll:<Payroll notify={notify}/>,organization:<Organization notify={notify} onCompaniesChanged={()=>void refreshSession()} onSwitchCompany={(id)=>void switchCompany(id)}/>,evaluation:session.roles.includes('HR_ADMIN')?<EvaluationPage notify={notify}/>:<EmployeeEvaluation notify={notify}/>,approvals:<Approvals notify={notify} initialRequestId={initialApproval} onCertificates={()=>navigate('documents')}/>,documents:<DocumentsPage session={session} notify={notify}/>,schedule:<Schedule session={session} notify={notify}/>,ai:<HrAi companyName={session.company?.name} initialQuestion={aiAsk} onInitialQuestionHandled={()=>setAiAsk(null)}/>
 }[page];
 return <><Shell session={session}page={page}onPage={navigate}onLogout={()=>void logout()}onAskAI={(text)=>{if(!session.menus.includes('AI'))return;setAiAsk({text,id:Date.now()});setPage('ai')}}onSearch={setSearch}onSwitchCompany={(id)=>void switchCompany(id)}><Fragment key={session.company?.company_id??0}>{view}</Fragment></Shell>{search&&<SearchResults query={search} onClose={()=>setSearch('')} onEmployee={(q)=>{setInitialQuery(q);navigate('employees');setSearch('')}} onApproval={(id)=>{setInitialApproval(id);navigate('approvals');setSearch('')}}/>}{notice&&<div className="toast" role="status"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="메시지 닫기"><X size={18}/></button></div>}</>;
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
