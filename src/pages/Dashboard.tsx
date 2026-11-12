import {useState, type ReactNode} from 'react';
import {Activity, CalendarDays, ChevronRight, CircleCheck, ClipboardList, TrendingUp, UsersRound, UserRoundCheck, BriefcaseBusiness} from 'lucide-react';
import {api} from '../lib/api';
import {useRemote} from '../lib/hooks';
import type {DashboardData,Widget} from '../lib/types';
import {date,pct} from '../lib/format';
import {Empty,ErrorState,Loading,Modal} from '../components/UI';

const reasons:Record<string,string>={SOURCE_NOT_AVAILABLE:'원천 데이터 미제공',SOURCE_ERROR:'집계 오류',NON_WORKDAY:'비근무일',NO_DATA:'조회된 기록 없음'};
function show<T>(w:Widget<T>|undefined,render:(d:T)=>ReactNode):ReactNode{return w?.status==='ok'&&w.data!==null?render(w.data):<span className="unavailable">{reasons[w?.reason||'']||'데이터를 제공할 수 없습니다.'}</span>}
function ActionText({action,count}:{action:string;count:number}){const messages:Record<string,string>={EMPLOYEE_CREATED:`신규 구성원 ${count}명이 합류했어요`,LEAVE_APPROVED:`휴가 신청 ${count}건이 승인되었어요`,PAYSLIP_GENERATED:`급여 명세서 ${count}건이 생성되었어요`};return <>{messages[action]||`${action} · ${count}건`}</>}
function DashboardMetric({label,value,caption,icon,tone}:{label:string;value:ReactNode;caption:ReactNode;icon:ReactNode;tone:string}){return <article className="figma-metric"><div className="figma-metric-heading"><span>{label}</span><span className={'figma-metric-icon tone-'+tone}>{icon}</span></div><div className="figma-metric-value">{value}</div><div className="figma-metric-caption">{caption}</div></article>}
export function Dashboard({onNewEmployee: _onNewEmployee}:{onNewEmployee?:()=>void}){
 const [expanded,setExpanded]=useState<'events'|'activities'|null>(null);
 const {data,error,loading,refresh}=useRemote(()=>api.get<DashboardData>('/dashboard'),[]);
 const events=useRemote(()=>expanded==='events'?api.get<{items:Array<{event_id:number;title:string;start_at:string;location:string|null}>}>('/events?page=1&size=20'):Promise.resolve(null),[expanded]);
 const activities=useRemote(()=>expanded==='activities'?api.get<{items:Array<{action:string;category:string;count:number;latest_at:string}>}>('/activities?page=1&size=20'):Promise.resolve(null),[expanded]);
 if(loading)return <Loading/>;if(error)return <ErrorState message={error} onRetry={refresh}/>;if(!data)return <Empty/>;
 const w=data.widgets;const head=w.monthly_headcount.status==='ok'?w.monthly_headcount.data?.items||[]:[];
 const counts=head.map(x=>x.headcount);const max=head.length?Math.max(...counts):0;const min=head.length?Math.min(...counts):0;
 const barHeight=(n:number)=>max===min?78:Math.max(22,36+((n-min)/(max-min))*56);
 return <div className="stack figma-dashboard">
   <div className="figma-greeting"><h1>좋은 하루를 보내세요</h1><p>오늘의 조직현황과 일정을 한눈에 확인하세요.</p></div>
   <div className="figma-metrics">
    <DashboardMetric label="전체 구성원" tone="cyan" icon={<UsersRound size={21}/>} value={show(w.members,x=><>{x.total.toLocaleString()}<small>명</small></>)} caption={show(w.members,x=><><b>{pct(x.change_rate_vs_last_month)}</b> 지난달 대비</>)}/>
    <DashboardMetric label="오늘 출근" tone="purple" icon={<UserRoundCheck size={20}/>} value={show(w.attendance_today,x=><>{x.present.toLocaleString()}<small>명</small></>)} caption={show(w.attendance_today,x=><><b>{pct(x.present_ratio_of_members)}</b> 전체 구성원</>)}/>
    <DashboardMetric label="휴가 중" tone="orange" icon={<CalendarDays size={20}/>} value={show(w.attendance_today,x=><>{x.on_leave.toLocaleString()}<small>명</small></>)} caption="오늘 휴가 사용"/>
    <DashboardMetric label="승인 대기" tone="pink" icon={<ClipboardList size={20}/>} value={show(w.pending_approvals,x=><>{x.count.toLocaleString()}<small>건</small></>)} caption="확인 필요 · 결재 요청"/>
   </div>
   <div className="figma-dashboard-grid">
    <section className="figma-card figma-headcount"><div className="figma-card-header"><div><h2>구성원 현황</h2><p>최근 6개월 구성원 증감 추이</p></div><button className="figma-text-action" onClick={refresh}>상세보기 <ChevronRight size={14}/></button></div>
    <div className="figma-headcount-current">{show(w.monthly_headcount,x=><><b>{x.current.toLocaleString()}</b><span>현재 인원</span><em>{x.period_change>=0?'+':''}{x.period_change}명</em></>)}</div>
    {head.length?<div className="figma-chart" role="img" aria-label="최근 6개월 구성원 수 막대그래프">{head.map(x=><div className="figma-chart-column" key={x.month}><div className="figma-chart-bar" style={{height:`${barHeight(x.headcount)}%`}} title={`${x.month}: ${x.headcount}명`}/><small>{x.month.slice(5)}월</small></div>)}</div>:<Empty label={reasons[w.monthly_headcount.reason||'']||'월별 데이터 없음'}/>}
    </section>
    <section className="figma-card figma-events"><div className="figma-card-header"><div><h2>오늘의 일정</h2><p>예정된 주요 인사 일정</p></div><button className="figma-text-action" onClick={()=>setExpanded('events')}>전체 보기</button></div>{show(w.upcoming_events,x=>x.length?<div className="figma-events-list">{x.slice(0,3).map(ev=><div className="figma-event" key={ev.event_id}><span className="figma-event-date"><b>{new Date(ev.start_at).getDate()}</b><small>{new Date(ev.start_at).getMonth()+1}월</small></span><span className="figma-event-rule"/><div><strong>{ev.title}</strong><small>{ev.all_day?'종일':new Date(ev.start_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})} · {ev.location||ev.target||'일정'}</small></div><ChevronRight size={16}/></div>)}</div>:<Empty label="예정된 일정이 없습니다."/>)}</section>
    <section className="figma-card figma-activities"><div className="figma-card-header"><div><h2>최근 활동</h2><p>구성원 운영 및 문서 처리 현황</p></div><button className="figma-text-action" onClick={()=>setExpanded('activities')}>모두 확인</button></div>{show(w.recent_activities,x=>x.length?<div className="figma-activity-items">{x.slice(0,3).map((a,i)=><div className="figma-activity" key={`${a.action}-${i}`}><span className={'figma-activity-icon tone-'+(['cyan','mint','purple'][i%3])}>{i===0?<UsersRound size={19}/>:i===1?<CircleCheck size={19}/>:<ClipboardList size={19}/>}</span><div><strong><ActionText action={a.action} count={a.count}/></strong><small>{date(a.latest_at)} · {a.category}</small></div><ChevronRight size={16}/></div>)}</div>:<Empty label="최근 활동이 없습니다."/>)}</section>
    <section className="figma-card figma-month-summary"><div className="figma-summary-header"><span className="figma-summary-icon"><BriefcaseBusiness size={21}/></span><small>이번 달 인사 요약</small><h2>우리 팀은 꾸준히<br/>성장하고 있어요.</h2></div><div className="figma-summary-stats"><div>{show(w.month_summary,x=><><strong>{x.new_hires}</strong><small>신규 입사</small></>)}</div><div>{show(w.month_summary,x=><><strong>{x.transfers}</strong><small>부서 이동</small></>)}</div><div>{show(w.month_summary,x=><><strong>{pct(x.attendance_rate)}</strong><small>출근율</small></>)}</div></div></section>
   </div>
   {expanded&&<Modal title={expanded==='events'?'인사 일정 전체':'최근 활동 전체'} onClose={()=>setExpanded(null)}>{expanded==='events'?(events.loading?<Loading/>:events.error?<ErrorState message={events.error} onRetry={events.refresh}/>:events.data?.items.length?<div className="activity-list">{events.data.items.map(x=><div className="activity-row" key={x.event_id}><CalendarDays size={18}/><div><strong>{x.title}</strong><small>{date(x.start_at)} · {x.location||'위치 미정'}</small></div></div>)}</div>:<Empty/>):(activities.loading?<Loading/>:activities.error?<ErrorState message={activities.error} onRetry={activities.refresh}/>:activities.data?.items.length?<div className="activity-list">{activities.data.items.map((x,i)=><div className="activity-row" key={i}><Activity size={17}/><div><strong><ActionText action={x.action} count={x.count}/></strong><small>{date(x.latest_at)}</small></div></div>)}</div>:<Empty/>)}</Modal>}
 </div>
}
