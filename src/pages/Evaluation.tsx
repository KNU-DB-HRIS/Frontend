import {useEffect,useState,type FormEvent} from 'react';
import {Check,Clock3,Search,UsersRound,ChartNoAxesCombined} from 'lucide-react';
import {api,errorMessage,params} from '../lib/api';
import {useDebounced,useRemote} from '../lib/hooks';
import type {EvaluationPeriod,EvaluationSummary,EvaluationTask,EvaluationTasks,Paged,Participant} from '../lib/types';
import {date,pct} from '../lib/format';
import {Avatar,Empty,ErrorState,Field,Loading,Modal,Pager,Status} from '../components/UI';

const labels:Record<string,string>={NOT_STARTED:'미제출',GOAL:'목표 설정',SELF:'자기 평가',PEER:'동료 평가',LEADER:'리더 평가',COMPLETED:'평가 완료'};
function EvaluationKpi({title,value,desc,icon,tone}:{title:string;value:string;desc?:string;icon:React.ReactNode;tone:string}){return <article className="figma-eval-kpi"><span>{title}</span><span className={'figma-eval-kpi-icon tone-'+tone}>{icon}</span><strong>{value}</strong>{desc&&<small>{desc}</small>}</article>}
const STAGE_LABEL:Record<string,string>={GOAL:'목표 설정',SELF:'자기 평가',PEER:'동료 평가',LEADER:'리더 평가'};
const whom=(t:EvaluationTask)=>t.stage==='GOAL'||t.stage==='SELF'?'본인':`${t.target.name} · ${t.target.department_name}`;
/** EVAL-04 단계 평가 제출. 목표 설정은 목표 내용만, 나머지는 점수(0~100) 필수 */
function StageForm({task,notify,onClose,onSaved}:{task:EvaluationTask;notify:(m:string)=>void;onClose:()=>void;onSaved:()=>void}){
 const goal=task.stage==='GOAL';const[score,setScore]=useState('');const[comment,setComment]=useState('');const[busy,setBusy]=useState(false);
 async function save(e:FormEvent){e.preventDefault();if(busy)return;setBusy(true);try{await api.post(`/evaluations/${task.evaluation_id}/stage-records`,{stage:task.stage,...(goal?{}:{score:Number(score)}),comment:comment.trim()||null});notify('평가를 제출했습니다.');onSaved()}catch(err){notify(errorMessage(err))}finally{setBusy(false)}}
 return <Modal title={`${STAGE_LABEL[task.stage]} · ${goal||task.stage==='SELF'?'본인':task.target.name}`} onClose={onClose} footer={<><button className="btn btn--secondary" onClick={onClose}>취소</button><button className="btn btn--primary" form="stage-form" type="submit" disabled={busy}>제출</button></>}>
  <form id="stage-form" className="form-grid stage-form" onSubmit={save}>
   {!goal&&<Field title="점수 (0~100)"><input type="number" required min={0} max={100} step={1} inputMode="numeric" value={score} onChange={e=>setScore(e.target.value)}/></Field>}
   <Field title={goal?'목표':'의견'}><textarea required={goal} maxLength={500} rows={4} value={comment} onChange={e=>setComment(e.target.value)}/></Field>
   <p className="notice">제출한 평가는 수정할 수 없습니다.</p>
  </form>
 </Modal>;
}
/** EVAL-05 내가 할 평가. compact(관리자 화면)는 할 일이 있을 때만 보임 */
function MyEvaluations({notify,compact=false,onSubmitted}:{notify:(m:string)=>void;compact?:boolean;onSubmitted?:()=>void}){
 const tasks=useRemote(()=>api.get<EvaluationTasks>('/me/evaluation-tasks'),[]);
 const[open,setOpen]=useState<EvaluationTask|null>(null);
 if(compact&&!tasks.data?.items.length)return null;
 return <>
  <section className="surface my-evals"><div className="surface__head"><h2>내가 할 평가{tasks.data?<small>{tasks.data.total}건</small>:null}</h2></div>
   {tasks.loading?<Loading/>:tasks.error?<ErrorState message={tasks.error} onRetry={tasks.refresh}/>:tasks.data?.items.length?<ul className="my-eval-list">{tasks.data.items.map(t=><li key={`${t.evaluation_id}-${t.stage}`}><div><strong>{STAGE_LABEL[t.stage]}</strong><span>{whom(t)}</span><small>{t.period_title} · {date(t.end_date)}까지</small></div><button className="btn btn--primary" onClick={()=>setOpen(t)}>평가하기</button></li>)}</ul>:<Empty label="지금 할 평가가 없습니다."/>}
  </section>
  {!compact&&<section className="surface my-evals"><div className="surface__head"><h2>제출한 평가</h2></div>
   {tasks.data?.submitted.length?<ul className="my-eval-list">{tasks.data.submitted.map(t=><li key={`${t.evaluation_id}-${t.stage}`}><div><strong>{STAGE_LABEL[t.stage]}</strong><span>{whom(t)}</span><small>{date(t.submitted_at)} 제출{t.score!=null?` · ${t.score}점`:''}</small></div></li>)}</ul>:tasks.loading?null:<Empty label="제출한 평가가 없습니다."/>}
  </section>}
  {open&&<StageForm task={open} notify={notify} onClose={()=>setOpen(null)} onSaved={()=>{setOpen(null);tasks.refresh();onSubmitted?.()}}/>}
 </>;
}
/** 일반 사원의 평가 메뉴: 내가 할 평가와 제출한 평가 (회차 현황은 관리자 전용) */
export function EmployeeEvaluation({notify}:{notify:(m:string)=>void}){return <div className="stack"><div className="page-intro"><div><h1>평가</h1></div></div><MyEvaluations notify={notify}/></div>}
export function EvaluationPage({notify}:{notify:(m:string)=>void}){
 const[periodId,setPeriodId]=useState<number|null>(null),[q,setQ]=useState(''),[status,setStatus]=useState(''),[grade,setGrade]=useState(''),[page,setPage]=useState(1);const query=useDebounced(q);
 const periods=useRemote(()=>api.get<{items:EvaluationPeriod[];total:number}>('/evaluation-periods'),[]);
 useEffect(()=>{if(periods.data?.items.length&&periodId===null){const x=periods.data.items.find(v=>v.status==='IN_PROGRESS')||periods.data.items[0];setPeriodId(x.period_id)}},[periods.data,periodId]);
 const summary=useRemote(()=>periodId===null?Promise.resolve(null):api.get<EvaluationSummary>(`/evaluation-periods/${periodId}/summary`),[periodId]);
 const participants=useRemote(()=>periodId===null?Promise.resolve(null):api.get<Paged<Participant>>(`/evaluation-periods/${periodId}/participants`+params({q:query,status,grade,page,size:20})),[periodId,query,status,grade,page]);
 const s=summary.data;
 const distribution=s?(Array.isArray(s.grade_distribution)?s.grade_distribution:Object.entries(s.grade_distribution).map(([grade,count])=>({grade,count}))):[];
 const distributionTotal=distribution.reduce((acc,x)=>acc+x.count,0);
 const stageNames=['목표 설정','자기 평가','동료 평가','리더 평가'];
 return <div className="stack figma-evaluation"><div className="page-intro"><div><h1>평가 관리</h1></div><select className="period-picker" value={periodId??''} aria-label="평가 회차 선택" onChange={e=>{setPeriodId(Number(e.target.value));setPage(1)}}>{periods.data?.items.map(p=><option key={p.period_id} value={p.period_id}>{p.title}</option>)}</select></div>
 <MyEvaluations notify={notify} compact onSubmitted={()=>{summary.refresh();participants.refresh()}}/>
 {periods.loading?<Loading/>:periods.error?<ErrorState message={periods.error} onRetry={periods.refresh}/>:!periods.data?.items.length?<Empty label="등록된 평가 회차가 없습니다."/>:summary.loading?<Loading/>:summary.error?<ErrorState message={summary.error} onRetry={summary.refresh}/>:!s?<Empty/>:<>
 <div className="figma-eval-kpis"><EvaluationKpi title="평가 대상자" value={s.target_count+'명'} icon={<UsersRound size={19}/>} tone="cyan"/><EvaluationKpi title="평가 진행률" value={pct(s.progress_rate)} icon={<ChartNoAxesCombined size={19}/>} tone="purple"/><EvaluationKpi title="평가 완료" value={s.completed_count+'명'} icon={<Check size={19}/>} tone="mint"/><EvaluationKpi title="미제출" value={s.not_submitted_count+'명'} icon={<Clock3 size={19}/>} tone="orange"/></div>
 <div className="figma-eval-overviews"><section className="figma-eval-progress"><div className="figma-eval-section-header"><div><h2>{s.title}</h2><small>{date(s.start_date)} — {date(s.end_date)}</small></div><Status value={s.status}/></div><div className="figma-eval-progress-inner"><div className="progress-ring" style={{'--progress':`${Math.min(100,Math.max(0,s.progress_rate*100))}%`} as React.CSSProperties}><div><strong>{pct(s.progress_rate)}</strong><small>전체 진행률</small></div></div><ol className="figma-eval-stages">{stageNames.map((name,i)=>{const stage=s.stages?.[i];return <li key={i} className={i===0?'stage-done':i===1?'stage-current':''}><span>{i===0?<Check size={16}/>:i+1}</span><div><strong>{stage?.label||name}</strong><small>{stage?.completed_count!=null?stage.completed_count+'명 완료':stage?.count!=null?stage.count+'명':''}</small></div></li>})}</ol></div></section>
 <section className="figma-eval-distribution"><div className="figma-eval-section-header"><div><h2>예상 등급 분포</h2></div></div><div className="figma-grade-bars">{(['S','A','B','C','D']as const).map(gradeKey=>{const item=distribution.find(x=>x.grade===gradeKey);const c=item?.count??0;const part=distributionTotal?c/distributionTotal:0;return <div className="figma-grade-row" key={gradeKey}><strong>{gradeKey}</strong><div><span style={{width:(part*100)+'%'}}/></div><small>{c}명</small><small>{distributionTotal?Math.round(part*100):0}%</small></div>})}</div><div className="figma-grade-note">등급 분포는 등록된 평가 결과를 기준으로 집계합니다.</div></section></div>
 <section className="figma-eval-participants"><div className="figma-eval-participants-head"><h2>평가 대상자 <small>{participants.data?.total!=null?participants.data.total+'명':'—'}</small></h2><div className="filters"><label className="search-box"><Search size={16}/><input value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} placeholder="이름 또는 부서 검색"/></label><select aria-label="평가 상태" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="">전체 상태</option>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><select aria-label="평가 등급" value={grade} onChange={e=>{setGrade(e.target.value);setPage(1)}}><option value="">전체 등급</option>{['S','A','B','C','D'].map(x=><option key={x} value={x}>{x}</option>)}</select></div></div>
 {participants.loading?<Loading/>:participants.error?<ErrorState message={participants.error} onRetry={participants.refresh}/>:participants.data?.items.length?<div className="table-scroll"><table className="table"><thead><tr><th>구성원</th><th>소속</th><th>진행률</th><th>평가 등급</th><th>상태</th></tr></thead><tbody>{participants.data.items.map(x=><tr key={x.evaluation_id}><td><div className="person"><Avatar name={x.name}/><strong>{x.name}</strong></div></td><td>{x.department_name}</td><td><div className="inline-progress"><div><span style={{width:`${x.progress_rate*100}%`}}/></div><strong>{pct(x.progress_rate)}</strong></div></td><td>{x.grade||'—'}</td><td><Status value={x.status}/></td></tr>)}</tbody></table></div>:<Empty/>}
 {participants.data&&<Pager page={participants.data.page}size={participants.data.size}total={participants.data.total}onPage={setPage}/>}</section></>}
 </div>;
}
