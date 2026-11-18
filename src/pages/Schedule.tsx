import {useMemo,useState,type FormEvent} from 'react';
import {ChevronLeft,ChevronRight,Clock,MapPin,Pencil,Plus,Save,Trash2,UsersRound} from 'lucide-react';
import {api,errorMessage,params} from '../lib/api';
import {useRemote} from '../lib/hooks';
import type {Department,ScheduleEvent,Session} from '../lib/types';
import {Empty,ErrorState,Field,Loading,Modal} from '../components/UI';

const pad=(n:number)=>String(n).padStart(2,'0');
const ymd=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const WEEK=['일','월','화','수','목','금','토'];
/** 서버는 KST 오프셋이 붙은 ISO 문자열을 줌: 앞 16자리(YYYY-MM-DDTHH:MM)가 곧 한국 시간 */
const dayOf=(iso:string)=>iso.slice(0,10);
const timeOf=(iso:string|null)=>iso?iso.slice(11,16):'';
function when(e:ScheduleEvent){if(e.all_day)return `${dayOf(e.start_at).replace(/-/g,'.')} 종일`;return `${dayOf(e.start_at).replace(/-/g,'.')} ${timeOf(e.start_at)}${e.end_at?`~${timeOf(e.end_at)}`:''}`}
const edited=(e:ScheduleEvent)=>new Date(e.updated_at).getTime()-new Date(e.created_at).getTime()>60000;

type Targets=Record<number,boolean>;
interface Draft{title:string;date:string;allDay:boolean;start:string;end:string;location:string;description:string;scope:'COMPANY'|'DEPARTMENTS';targets:Targets}
const blank=(date:string):Draft=>({title:'',date,allDay:false,start:'10:00',end:'11:00',location:'',description:'',scope:'COMPANY',targets:{}});
const fromEvent=(e:ScheduleEvent):Draft=>({title:e.title,date:dayOf(e.start_at),allDay:e.all_day,start:timeOf(e.start_at)||'10:00',end:timeOf(e.end_at)||'',location:e.location||'',description:e.description||'',scope:e.scope,targets:Object.fromEntries(e.targets.map(t=>[t.department_id,t.include_children]))});

export function Schedule({session,notify}:{session:Session;notify:(m:string)=>void}){
 const admin=session.roles.includes('HR_ADMIN');
 const[month,setMonth]=useState(()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)});
 const[selected,setSelected]=useState<string|null>(null),[detail,setDetail]=useState<ScheduleEvent|null>(null),[editing,setEditing]=useState<{draft:Draft;id:number|null}|null>(null);
 const from=ymd(month),to=ymd(new Date(month.getFullYear(),month.getMonth()+1,0));
 const list=useRemote(()=>api.get<{items:ScheduleEvent[]}>((admin?'/events':'/me/events')+params({from,to,page:1,size:100})),[from,to,admin]);
 const byDay=useMemo(()=>{const m:Record<string,ScheduleEvent[]>={};for(const e of list.data?.items||[])(m[dayOf(e.start_at)]??=[]).push(e);return m},[list.data]);
 const cells=useMemo(()=>{const first=new Date(month.getFullYear(),month.getMonth(),1);const start=new Date(first);start.setDate(1-first.getDay());return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d})},[month]);
 const shown=(selected?byDay[selected]:list.data?.items)||[];
 const today=ymd(new Date());
 async function remove(e:ScheduleEvent){if(!window.confirm(`'${e.title}' 일정을 삭제하시겠습니까?`))return;try{await api.delete(`/events/${e.event_id}`);notify('일정을 삭제했습니다.');setDetail(null);list.refresh();}catch(err){notify(errorMessage(err))}}
 return <div className="stack schedule-page">
  <div className="page-intro"><div><h1>일정</h1><p className="figma-subtitle">{admin?'일정을 등록하고 표시 대상을 지정합니다.':'나에게 공유된 일정입니다.'}</p></div>{admin&&<button className="btn btn--primary" onClick={()=>setEditing({draft:blank(selected||today),id:null})}><Plus size={17}/> 일정 등록</button>}</div>
  <div className="schedule-layout">
   <section className="surface schedule-calendar">
    <div className="schedule-month"><button className="icon-button" aria-label="이전 달" onClick={()=>{setMonth(new Date(month.getFullYear(),month.getMonth()-1,1));setSelected(null)}}><ChevronLeft size={18}/></button><h2>{month.getFullYear()}년 {month.getMonth()+1}월</h2><button className="icon-button" aria-label="다음 달" onClick={()=>{setMonth(new Date(month.getFullYear(),month.getMonth()+1,1));setSelected(null)}}><ChevronRight size={18}/></button><button className="btn btn--secondary schedule-today" onClick={()=>{const d=new Date();setMonth(new Date(d.getFullYear(),d.getMonth(),1));setSelected(ymd(d))}}>오늘</button></div>
    <div className="schedule-grid" role="grid" aria-label="월간 일정">{WEEK.map(w=><div key={w} className="schedule-weekday" role="columnheader">{w}</div>)}
     {cells.map(d=>{const key=ymd(d),items=byDay[key]||[],out=d.getMonth()!==month.getMonth();return <button type="button" key={key} role="gridcell" className={'schedule-cell'+(out?' is-out':'')+(key===today?' is-today':'')+(key===selected?' is-selected':'')} onClick={()=>setSelected(key===selected?null:key)} aria-label={`${d.getMonth()+1}월 ${d.getDate()}일, 일정 ${items.length}건`}><span className="schedule-date">{d.getDate()}</span>{items.slice(0,2).map(e=><span key={e.event_id} className={'schedule-chip'+(e.scope==='COMPANY'?' is-company':'')} title={e.title}>{e.all_day?'':timeOf(e.start_at)+' '}{e.title}</span>)}{items.length>2&&<span className="schedule-more">+{items.length-2}</span>}</button>})}
    </div>
   </section>
   <section className="surface schedule-list"><div className="surface__head"><h2>{selected?`${selected.replace(/-/g,'.')} 일정`:`${month.getMonth()+1}월 전체 일정`}</h2>{selected&&<button className="btn btn--secondary" onClick={()=>setSelected(null)}>월 전체 보기</button>}</div>
    {list.loading?<Loading/>:list.error?<ErrorState message={list.error} onRetry={list.refresh}/>:shown.length?<ul className="schedule-items">{shown.map(e=><li key={e.event_id}><button type="button" onClick={()=>setDetail(e)}><span className="schedule-item-when"><Clock size={14}/> {when(e)}</span><strong>{e.title}{edited(e)&&<em className="schedule-edited">수정됨</em>}</strong><span className="schedule-item-meta">{e.location&&<><MapPin size={13}/> {e.location}</>}<span className={'schedule-target'+(e.scope==='COMPANY'?' is-company':'')}><UsersRound size={13}/> {e.target_label}</span></span></button></li>)}</ul>:<Empty label={selected?'이 날짜에 일정이 없습니다.':'이번 달 일정이 없습니다.'}/>}
   </section>
  </div>
  {detail&&<Modal title="일정 상세" onClose={()=>setDetail(null)} footer={admin?<><button className="btn btn--danger" onClick={()=>void remove(detail)}><Trash2 size={15}/> 삭제</button><button className="btn btn--primary" onClick={()=>{setEditing({draft:fromEvent(detail),id:detail.event_id});setDetail(null)}}><Pencil size={15}/> 수정</button></>:undefined}>
   <div className="schedule-detail"><h3>{detail.title}{edited(detail)&&<em className="schedule-edited">수정됨</em>}</h3><p><Clock size={15}/> {when(detail)}</p>{detail.location&&<p><MapPin size={15}/> {detail.location}</p>}{detail.description&&<p className="schedule-desc">{detail.description}</p>}
    <h4>표시 대상</h4>{detail.scope==='COMPANY'?<p className="schedule-target is-company"><UsersRound size={14}/> 전사</p>:<div className="schedule-target-chips">{detail.targets.map(t=><span key={t.department_id} className={'schedule-target'+(t.is_active?'':' is-inactive')}>{t.department_name}{t.include_children?' (하위 포함)':''}{t.is_active?'':' (사용 중지)'}</span>)}</div>}</div>
  </Modal>}
  {editing&&<EventForm initial={editing.draft} id={editing.id} notify={notify} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);list.refresh()}}/>}
 </div>;
}

function EventForm({initial,id,notify,onClose,onSaved}:{initial:Draft;id:number|null;notify:(m:string)=>void;onClose:()=>void;onSaved:()=>void}){
 const[d,setD]=useState(initial),[busy,setBusy]=useState(false);
 const departments=useRemote(()=>api.get<{items:Department[]}>('/departments'),[]);
 const known=useMemo(()=>new Map((departments.data?.items||[]).map(x=>[x.department_id,x])),[departments.data]);
 const children=useMemo(()=>{const m=new Map<number|null,Department[]>();for(const x of departments.data?.items||[]){if(!x.is_active&&!(x.department_id in d.targets))continue;const p=x.parent_department_id!=null&&known.has(x.parent_department_id)?x.parent_department_id:null;m.set(p,[...(m.get(p)||[]),x])}return m},[departments.data,known,d.targets]);
 /** 상위 조직을 '하위 포함'으로 고르면 그 아래 조직은 이미 대상이라 따로 고를 필요 없음 */
 const coveredBy=(id:number):number|null=>{let p=known.get(id)?.parent_department_id??null;while(p!=null){if(d.targets[p])return p;p=known.get(p)?.parent_department_id??null}return null};
 const targetKey=d.scope==='COMPANY'?'':Object.entries(d.targets).map(([k,v])=>`${k}:${v?1:0}`).join(',');
 const audience=useRemote(()=>d.scope==='DEPARTMENTS'&&!targetKey?Promise.resolve({audience_count:0}):api.get<{audience_count:number}>('/events/audience'+params({scope:d.scope,targets:targetKey||undefined})),[d.scope,targetKey]);
 const set=<K extends keyof Draft>(k:K,v:Draft[K])=>setD(x=>({...x,[k]:v}));
 const toggle=(id:number)=>setD(x=>{const t={...x.targets};if(id in t)delete t[id];else t[id]=true;return {...x,targets:t}});
 const toggleChildren=(id:number)=>setD(x=>({...x,targets:{...x.targets,[id]:!x.targets[id]}}));
 async function save(e:FormEvent){e.preventDefault();if(busy)return;
  if(d.scope==='DEPARTMENTS'&&!Object.keys(d.targets).length){notify('표시 대상을 선택해 주세요.');return}
  if(!d.allDay&&d.end&&d.end<d.start){notify('종료 시각을 확인해 주세요.');return}
  const payload={title:d.title.trim(),description:d.description.trim()||null,location:d.location.trim()||null,all_day:d.allDay,
   start_at:`${d.date}T${d.allDay?'00:00':d.start}`,end_at:d.allDay?`${d.date}T23:59`:(d.end?`${d.date}T${d.end}`:null),
   scope:d.scope,targets:d.scope==='COMPANY'?[]:Object.entries(d.targets).map(([k,v])=>({department_id:Number(k),include_children:v}))};
  setBusy(true);try{if(id==null)await api.post('/events',payload);else await api.patch(`/events/${id}`,payload);notify(id==null?'일정을 등록했습니다.':'일정을 수정했습니다.');onSaved()}catch(err){notify(errorMessage(err))}finally{setBusy(false)}}
 const tree=(parent:number|null,depth:number):JSX.Element[]=>(children.get(parent)||[]).flatMap(x=>{const on=x.department_id in d.targets,cover=coveredBy(x.department_id);return [<div key={x.department_id} className="schedule-org" style={{paddingLeft:depth*20}}>
   <label className={'schedule-org-check'+(cover!=null?' is-covered':'')}><input type="checkbox" checked={on||cover!=null} disabled={cover!=null&&!on} onChange={()=>toggle(x.department_id)}/> {x.department_name}{!x.is_active&&<em> (사용 중지)</em>}{cover!=null&&!on&&<small> 상위 조직에 포함</small>}</label>
   {on&&(children.get(x.department_id)?.length?<label className="schedule-org-children"><input type="checkbox" checked={d.targets[x.department_id]} onChange={()=>toggleChildren(x.department_id)}/> 하위 조직 포함</label>:null)}
  </div>,...tree(x.department_id,depth+1)]});
 const picked=Object.keys(d.targets).map(Number).map(k=>`${known.get(k)?.department_name||k}${d.targets[k]&&children.get(k)?.length?'(하위 포함)':''}`);
 return <Modal title={id==null?'일정 등록':'일정 수정'} onClose={onClose} className="schedule-modal">
  <form className="schedule-form" onSubmit={save}>
   <Field title="제목 *"><input required maxLength={100} value={d.title} onChange={e=>set('title',e.target.value)}/></Field>
   <div className="schedule-form-row"><Field title="날짜 *"><input type="date" required value={d.date} onChange={e=>set('date',e.target.value)}/></Field>
    <label className="check-field schedule-allday"><input type="checkbox" checked={d.allDay} onChange={e=>set('allDay',e.target.checked)}/> 종일</label>
    {!d.allDay&&<><Field title="시작"><input type="time" required value={d.start} onChange={e=>set('start',e.target.value)}/></Field><Field title="종료"><input type="time" value={d.end} onChange={e=>set('end',e.target.value)}/></Field></>}</div>
   <Field title="장소"><input maxLength={100} value={d.location} onChange={e=>set('location',e.target.value)}/></Field>
   <Field title="설명"><textarea maxLength={1000} rows={3} value={d.description} onChange={e=>set('description',e.target.value)}/></Field>
   <fieldset className="schedule-scope"><legend>표시 대상 *</legend>
    <label><input type="radio" name="scope" checked={d.scope==='COMPANY'} onChange={()=>set('scope','COMPANY')}/> 전사</label>
    <label><input type="radio" name="scope" checked={d.scope==='DEPARTMENTS'} onChange={()=>set('scope','DEPARTMENTS')}/> 선택</label>
    {d.scope==='DEPARTMENTS'&&<div className="schedule-orgs">{departments.loading?<Loading/>:departments.error?<ErrorState message={departments.error} onRetry={departments.refresh}/>:tree(null,0)}</div>}
    <p className="schedule-audience"><UsersRound size={15}/> {d.scope==='DEPARTMENTS'&&!picked.length?'표시 대상을 선택해 주세요.':<>{d.scope==='COMPANY'?'전사':picked.join(', ')} → 표시 대상 재직자 <strong>{audience.loading?'…':audience.data?.audience_count??'—'}명</strong></>}</p>
   </fieldset>
   <div className="schedule-form-actions"><button type="button" className="btn btn--secondary" onClick={onClose}>취소</button><button type="submit" className="btn btn--primary" disabled={busy}><Save size={15}/> {busy?'저장 중':'저장'}</button></div>
  </form>
 </Modal>;
}
