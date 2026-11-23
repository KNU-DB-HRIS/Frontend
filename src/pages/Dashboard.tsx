import {useState, type ReactNode} from 'react';
import {CalendarDays, ChevronRight, ClipboardList, UsersRound} from 'lucide-react';
import {api} from '../lib/api';
import {useRemote} from '../lib/hooks';
import type {DashboardData,Widget} from '../lib/types';
import {date,pct} from '../lib/format';
import {Empty,ErrorState,Loading,Modal} from '../components/UI';

const reasons:Record<string,string>={SOURCE_NOT_AVAILABLE:'원천 데이터 미제공',SOURCE_ERROR:'집계 오류',NON_WORKDAY:'비근무일',NO_DATA:'조회된 기록 없음'};
function show<T>(w:Widget<T>|undefined,render:(d:T)=>ReactNode):ReactNode{return w?.status==='ok'&&w.data!==null?render(w.data):<span className="unavailable">{reasons[w?.reason||'']||'데이터를 제공할 수 없습니다.'}</span>}
/** 보조 문구: 데이터가 없을 때는 값 자리의 안내와 겹치지 않게 비워 둠 */
function capt<T>(w:Widget<T>|undefined,render:(d:T)=>ReactNode):ReactNode{return w?.status==='ok'&&w.data!==null?render(w.data):null}
function DashboardMetric({label,value,caption,icon,tone}:{label:string;value:ReactNode;caption?:ReactNode;icon:ReactNode;tone:string}){return <article className="figma-metric"><div className="figma-metric-heading"><span>{label}</span><span className={'figma-metric-icon tone-'+tone}>{icon}</span></div><div className="figma-metric-value">{value}</div><div className="figma-metric-caption">{caption??null}</div></article>}
export function Dashboard({onNewEmployee: _onNewEmployee,onOpenEmployees}:{onNewEmployee?:()=>void;onOpenEmployees?:()=>void}){
 const [expanded,setExpanded]=useState<'events'|null>(null);
 const {data,error,loading,refresh}=useRemote(()=>api.get<DashboardData>('/dashboard'),[]);
 const events=useRemote(()=>expanded==='events'?api.get<{items:Array<{event_id:number;title:string;start_at:string;location:string|null}>}>('/events?page=1&size=20'):Promise.resolve(null),[expanded]);
 if(loading)return <Loading/>;if(error)return <ErrorState message={error} onRetry={refresh}/>;if(!data)return <Empty/>;
 const w=data.widgets;const head=w.monthly_headcount.status==='ok'?w.monthly_headcount.data?.items||[]:[];
 const counts=head.map(x=>x.headcount);const max=head.length?Math.max(...counts):0;const min=head.length?Math.min(...counts):0;
 const barHeight=(n:number)=>max===min?78:Math.max(22,36+((n-min)/(max-min))*56);
 return <div className="stack figma-dashboard">
   <div className="figma-greeting"><h1>대시보드</h1></div>
   <div className="figma-metrics">
    <DashboardMetric label="전체 구성원" tone="cyan" icon={<UsersRound size={21}/>} value={show(w.members,x=><>{x.total.toLocaleString()}<small>명</small></>)} caption={capt(w.members,x=><><b>{pct(x.change_rate_vs_last_month)}</b> 지난달 대비</>)}/>
    <DashboardMetric label="승인 대기" tone="pink" icon={<ClipboardList size={20}/>} value={show(w.pending_approvals,x=><>{x.count.toLocaleString()}<small>건</small></>)}/>
   </div>
   <div className="figma-dashboard-grid">
    <section className="figma-card figma-headcount"><div className="figma-card-header"><div><h2>구성원 현황</h2><p>최근 6개월 구성원 증감 추이</p></div><button className="figma-text-action" onClick={()=>onOpenEmployees?onOpenEmployees():refresh()}>상세보기 <ChevronRight size={14}/></button></div>
    <div className="figma-headcount-current">{show(w.monthly_headcount,x=><><b>{x.current.toLocaleString()}</b><span>현재 인원</span><em>{x.period_change>=0?'+':''}{x.period_change}명</em></>)}</div>
    {head.length?<div className="figma-chart" role="img" aria-label="최근 6개월 구성원 수 막대그래프">{head.map(x=><div className="figma-chart-column" key={x.month}><div className="figma-chart-bar" style={{height:`${barHeight(x.headcount)}%`}} title={`${x.month}: ${x.headcount}명`}/><small>{x.month.slice(5)}월</small></div>)}</div>:<Empty label={reasons[w.monthly_headcount.reason||'']||'월별 데이터 없음'}/>}
    </section>
    <section className="figma-card figma-events"><div className="figma-card-header"><div><h2>다가오는 일정</h2></div><button className="figma-text-action" onClick={()=>setExpanded('events')}>전체 보기</button></div>{show(w.upcoming_events,x=>x.length?<div className="figma-events-list">{x.slice(0,3).map(ev=><div className="figma-event" key={ev.event_id}><span className="figma-event-date"><b>{new Date(ev.start_at).getDate()}</b><small>{new Date(ev.start_at).getMonth()+1}월</small></span><span className="figma-event-rule"/><div><strong>{ev.title}</strong><small>{ev.all_day?'종일':new Date(ev.start_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})} · {ev.location||ev.target||'일정'}</small></div></div>)}</div>:<Empty label="예정된 일정이 없습니다."/>)}</section>
   </div>
   {expanded&&<Modal title="인사 일정 전체" onClose={()=>setExpanded(null)}>{events.loading?<Loading/>:events.error?<ErrorState message={events.error} onRetry={events.refresh}/>:events.data?.items.length?<div className="activity-list">{events.data.items.map(x=><div className="activity-row" key={x.event_id}><CalendarDays size={18}/><div><strong>{x.title}</strong><small>{date(x.start_at)} · {x.location||'위치 미정'}</small></div></div>)}</div>:<Empty/>}</Modal>}
 </div>
}
