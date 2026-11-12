import{useState}from 'react';
import{Download,FileBadge,FileText,Receipt,ScrollText}from 'lucide-react';
import{api,downloadPdf,errorMessage}from '../lib/api';
import type{IssuedDoc,Session}from '../lib/types';
import{Card,Field}from '../components/UI';
const entries=[{type:'EMPLOYMENT',title:'재직증명서',description:'현재 재직 사실을 증명합니다.',icon:FileBadge},{type:'CAREER',title:'경력증명서',description:'재직 및 인사 이력을 증명합니다.',icon:FileText},{type:'PAYSLIP',title:'급여명세서',description:'확정된 월별 급여 명세를 발급합니다.',icon:Receipt},{type:'WITHHOLDING',title:'원천징수영수증',description:'연간 원천징수 내역을 확인합니다.',icon:ScrollText}] as const;
export function DocumentsPage({session,notify}:{session:Session;notify:(m:string)=>void}){
 const[employeeId,setEmployeeId]=useState(String(session.employee_id));const[month,setMonth]=useState(new Date().toISOString().slice(0,7));const[year,setYear]=useState(String(new Date().getFullYear()));const[busy,setBusy]=useState('');
 async function issue(type:string){if(!employeeId||Number(employeeId)<=0)return notify('발급 대상 직원 ID를 입력해 주세요.');setBusy(type);try{
  const body={employee_id:Number(employeeId)};
  const data=type==='PAYSLIP'?await api.post<IssuedDoc>('/certificates/payslip',{...body,pay_month:month}):type==='WITHHOLDING'?await api.post<IssuedDoc>('/certificates/withholding',{...body,year:Number(year)}):await api.post<IssuedDoc>('/certificates',{...body,certificate_type:type});
  await downloadPdf(`/documents/${data.document_id}/file`,`${type}-${data.document_id}.pdf`);
  notify('서버에서 문서를 발급하고 PDF를 내려받았습니다.');
 }catch(e){notify(errorMessage(e))}finally{setBusy('')}}
 return <div className="stack"><div className="page-intro"><h1>증명서·문서</h1></div><Card title="문서 발급"><div className="filters"><Field title="대상 직원 ID"><input type="number" min={1} value={employeeId} readOnly={!session.roles.includes('HR_ADMIN')} onChange={e=>setEmployeeId(e.target.value)}/></Field><Field title="급여명세서 대상 월"><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></Field><Field title="원천징수 대상 연도"><input type="number" value={year} min={2000} max={2100} onChange={e=>setYear(e.target.value)}/></Field></div><div className="document-grid">{entries.map(x=>{const Icon=x.icon;return <article className="document-card" key={x.type}><span className="document-icon"><Icon size={23}/></span><div><h3>{x.title}</h3><p>{x.description}</p></div><button className="btn btn--secondary" onClick={()=>issue(x.type)} disabled={busy!==''}><Download size={16}/>{busy===x.type?'발급 중':'PDF 발급'}</button></article>})}</div><p className="notice">이 문서는 서버에서 발급된 PDF만 제공합니다. 문서 이력 목록은 현재 명세에 조회 API가 없어 표시하지 않습니다.</p></Card></div>;
}
