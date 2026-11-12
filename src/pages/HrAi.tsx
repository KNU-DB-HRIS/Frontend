import{useRef,useState,type FormEvent}from 'react';
import{ArrowUp,Bot,Database,Sparkles,ShieldCheck,Code2,Loader2}from 'lucide-react';
import{api}from '../lib/api';
import{aiErrorMessage,aiMessage,aiStatus}from '../lib/ai';
import type{AiResponse}from '../lib/types';
import{Empty}from '../components/UI';
const examples=['부서별 재직 인원 알려줘','올해 입사한 직원은 몇 명이야?','장기근속자 명단 보여줘'];
export function HrAi(){const[input,setInput]=useState(''),[asked,setAsked]=useState(''),[result,setResult]=useState<AiResponse|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);const inputRef=useRef<HTMLInputElement>(null);
 async function ask(question:string){const q=question.trim();if(!q||loading)return;setInput('');setAsked(q);setLoading(true);setError('');setResult(null);try{const data=await api.post<AiResponse>('/ai/queries',{question:q});setResult(data);if(data.status==='NEEDS_CLARIFICATION')inputRef.current?.focus();}catch(e){setError(aiErrorMessage(e));}finally{setLoading(false)}}
 function submit(e:FormEvent){e.preventDefault();void ask(input)}
 const status=result?aiStatus(result):null;
 return <div className="ai-page"><div className="ai-intro"><div className="ai-logo"><Bot size={30}/></div><span className="eyebrow">HR INTELLIGENCE</span><h1>어떤 인사 정보가 궁금하신가요?</h1><p>질문은 서버에서 검증된 읽기 전용 SQL로 조회됩니다.</p></div>
 {!result&&!loading&&!error&&<div className="suggestions">{examples.map(x=><button key={x} onClick={()=>ask(x)}><Database size={18}/>{x}</button>)}</div>}
 {loading&&<div className="ai-result ai-loading" role="status"><Loader2 size={18} className="ai-spin"/><span>“{asked}” · SQL을 만들고 조회하는 중…</span></div>}
 {error&&<div className="ai-result"><div className="ai-question">질문 · {asked}</div><div className="inline-error" role="alert">{error}</div></div>}
 {result&&status&&<div className="ai-result"><div className="ai-question">질문 · {asked}</div><div className="ai-result-title"><Sparkles size={20}/><strong>HR AI 응답</strong><span className={`status ${status.tone}`}>{status.label}</span></div><p>{aiMessage(result)}</p>
  {result.status==='NEEDS_CLARIFICATION'&&<div className="notice">질문에 이름·부서·기간 같은 조건을 더해서 다시 물어보세요.</div>}
  {result.status==='ANSWERED'||result.status==='NO_RESULT'?<>{result.rows.length>0?<div className="table-scroll"><table className="table"><thead><tr>{result.columns.map((x,i)=><th key={i}>{x}</th>)}</tr></thead><tbody>{result.rows.map((row,i)=><tr key={i}>{row.map((value,j)=><td key={j}>{value==null?'—':String(value)}</td>)}</tr>)}</tbody></table></div>:<Empty label="조건에 맞는 데이터가 없습니다."/>}<small>{result.row_count}건{result.truncated?' · 200건까지만 표시':''}</small></>:null}
  {result.sql&&<details className="ai-sql"><summary><Code2 size={14}/> 실행된 SQL 보기</summary><pre>{result.sql}</pre><small>회사 범위 조건과 행 수 제한은 서버가 자동으로 붙인 것입니다.</small></details>}
  {result.status==='FAILED'&&!status.refused&&result.error_code&&<small className="ai-code">오류 코드 {result.error_code}</small>}
 </div>}
 <form className="ai-input" onSubmit={submit}><Sparkles size={18}/><input ref={inputRef} aria-label="인사 데이터 질문" placeholder={result?.status==='NEEDS_CLARIFICATION'?'조건을 더해서 다시 질문하세요':'궁금한 인사 현황을 입력하세요'} value={input} onChange={e=>setInput(e.target.value)} maxLength={500}/><button disabled={loading||!input.trim()} type="submit" aria-label="질문 보내기"><ArrowUp size={20}/></button></form><div className="ai-footnote"><ShieldCheck size={15}/> 급여·연락처·평가는 조회하지 않습니다. 생성된 SQL은 서버가 검증한 뒤 읽기 전용 계정으로만 실행합니다.</div></div>
}
