import {CalendarDays,ChevronRight,ClipboardList,Clock,FileText,MapPin,UserRound,UsersRound} from 'lucide-react';
import {api,params} from '../lib/api';
import {useRemote} from '../lib/hooks';
import type {PageId,ScheduleEvent,Session} from '../lib/types';
import {Empty,ErrorState,Loading} from '../components/UI';

const pad=(n:number)=>String(n).padStart(2,'0');
const ymd=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const when=(e:ScheduleEvent)=>`${e.start_at.slice(5,10).replace('-','.')} ${e.all_day?'종일':e.start_at.slice(11,16)}`;

/** 일반 사원 대시보드: 회사 전체 지표(GET /dashboard, 관리자 전용) 대신 내 정보, 내 결재, 다가오는 내 일정 */
export function EmployeeDashboard({session,onNavigate}:{session:Session;onNavigate:(p:PageId)=>void}){
 const from=ymd(new Date()),to=ymd(new Date(Date.now()+13*86400000));
 const events=useRemote(()=>api.get<{items:ScheduleEvent[];total:number}>('/me/events'+params({from,to,page:1,size:5})),[from,to]);
 const summary=useRemote(()=>api.get<{my_pending:number;in_progress?:number;approved:number;rejected:number;drafts:number}>('/approvals/summary'),[]);
 const metrics=summary.data?[['결재할 문서',summary.data.my_pending],['진행 중',summary.data.in_progress??0],['승인',summary.data.approved],['반려',summary.data.rejected]] as const:[];
 return <div className="stack employee-home">
  <div className="page-intro"><div><h1>대시보드</h1></div></div>
  <div className="employee-home-grid">
   <section className="surface employee-card"><div className="surface__head"><h2><UserRound size={18}/> 내 정보</h2></div>
    <dl className="employee-info"><dt>사번</dt><dd>{session.employee_no}</dd><dt>부서</dt><dd>{session.department_name}</dd><dt>직급</dt><dd>{session.position_name}</dd><dt>회사</dt><dd>{session.company?.name||'—'}</dd></dl></section>
   <section className="surface employee-card"><div className="surface__head"><h2><ClipboardList size={18}/> 내 결재</h2><button className="figma-text-action" onClick={()=>onNavigate('approvals')}>전자 문서 <ChevronRight size={14}/></button></div>
    {summary.loading?<Loading/>:summary.error?<ErrorState message={summary.error} onRetry={summary.refresh}/>:<div className="employee-metrics">{metrics.map(([label,value])=><div key={label}><span>{label}</span><strong>{value}건</strong></div>)}</div>}</section>
   <section className="surface employee-card employee-card--wide"><div className="surface__head"><h2><CalendarDays size={18}/> 다가오는 내 일정</h2><button className="figma-text-action" onClick={()=>onNavigate('schedule')}>일정 전체 <ChevronRight size={14}/></button></div>
    {events.loading?<Loading/>:events.error?<ErrorState message={events.error} onRetry={events.refresh}/>:events.data?.items.length?<ul className="employee-events">{events.data.items.map(e=><li key={e.event_id}><span className="employee-event-when"><Clock size={13}/> {when(e)}</span><strong>{e.title}</strong><span className="employee-event-meta">{e.location&&<><MapPin size={12}/> {e.location}</>}<span className={'schedule-target'+(e.scope==='COMPANY'?' is-company':'')}><UsersRound size={12}/> {e.target_label}</span></span></li>)}</ul>:<Empty label="2주 안에 예정된 일정이 없습니다."/>}</section>
   <section className="surface employee-card"><div className="surface__head"><h2><FileText size={18}/> 문서 발급</h2></div>
    <div className="employee-quick">{['재직증명서','경력증명서','급여명세서','원천징수영수증'].map(t=><button key={t} className="btn btn--secondary" onClick={()=>onNavigate('documents')}>{t}</button>)}</div></section>
  </div>
 </div>;
}
