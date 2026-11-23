import{useState}from 'react';
import{Download,FileBadge,FileText,Receipt,ScrollText}from 'lucide-react';
import{api,downloadPdf,errorMessage}from '../lib/api';
import type{IssuedDoc,Session}from '../lib/types';
import{Card,Field}from '../components/UI';
const entries=[{type:'EMPLOYMENT',title:'재직증명서',icon:FileBadge},{type:'CAREER',title:'경력증명서',icon:FileText},{type:'PAYSLIP',title:'급여명세서',icon:Receipt},{type:'WITHHOLDING',title:'원천징수영수증',icon:ScrollText}] as const;
/** 한국 시간 기준 현재 시각, 지난달(YYYY-MM): 급여명세서는 확정된 지난달이 기본 */
const kstNow=()=>new Date(Date.now()+9*3600*1000);
const lastMonthKst=()=>{const n=kstNow();return new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth()-1,1)).toISOString().slice(0,7)};
export function DocumentsPage({session,notify}:{session:Session;notify:(m:string)=>void}){
 const[employeeId,setEmployeeId]=useState(String(session.employee_id));const[month,setMonth]=useState(lastMonthKst);const[year,setYear]=useState(()=>String(kstNow().getUTCFullYear()));const isAdmin=session.roles.includes('HR_ADMIN');const[busy,setBusy]=useState('');
 async function issue(type:string){if(!employeeId||Number(employeeId)<=0)return notify('발급 대상 직원 ID를 입력해 주세요.');setBusy(type);try{
  const body={employee_id:Number(employeeId)};
  const data=type==='PAYSLIP'?await api.post<IssuedDoc>('/certificates/payslip',{...body,pay_month:month}):type==='WITHHOLDING'?await api.post<IssuedDoc>('/certificates/withholding',{...body,year:Number(year)}):await api.post<IssuedDoc>('/certificates',{...body,certificate_type:type});
  await downloadPdf(`/documents/${data.document_id}/file`,`${type}-${data.document_id}.pdf`);
  notify('문서를 발급했습니다.');
 }catch(e){notify(errorMessage(e))}finally{setBusy('')}}
 return <div className="stack"><div className="page-intro"><h1>증명서 발급</h1></div><Card title="문서 발급"><div className="filters">{isAdmin?<Field title="대상 직원 ID"><input type="number" min={1} value={employeeId} onChange={e=>setEmployeeId(e.target.value)}/></Field>:<Field title="발급 대상"><input value={`${session.employee_name} (본인)`} readOnly aria-readonly="true"/></Field>}<Field title="급여명세서 대상 월"><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></Field><Field title="원천징수 대상 연도"><input type="number" value={year} min={2000} max={2100} onChange={e=>setYear(e.target.value)}/></Field></div><div className="document-grid">{entries.map(x=>{const Icon=x.icon;return <article className="document-card" key={x.type}><span className="document-icon"><Icon size={23}/></span><div><h3>{x.title}</h3></div><button className="btn btn--secondary" onClick={()=>issue(x.type)} disabled={busy!==''}><Download size={16}/>{busy===x.type?'발급 중':'PDF 발급'}</button></article>})}</div><p className="notice">발급한 문서는 PDF로 바로 내려받습니다. 급여명세서는 급여가 확정된 달만 발급할 수 있습니다.</p></Card></div>;
}
