import{useState}from 'react';
import{useRemote}from '../lib/hooks';
import{date}from '../lib/format';
import{Download,FileBadge,FileText,Receipt,ScrollText}from 'lucide-react';
import{can}from '../lib/permissions';
import{api,downloadPdf,errorMessage,params}from '../lib/api';
import type{DocumentRow,IssuedDoc,Paged,Session}from '../lib/types';
type Person={employee_id:number;employee_no:string;name:string;department_name:string;employment_status:string};
import{Card,Empty,ErrorState,Field,Loading,Pager}from '../components/UI';
const entries=[{type:'EMPLOYMENT',title:'재직증명서',icon:FileBadge},{type:'CAREER',title:'경력증명서',icon:FileText},{type:'PAYSLIP',title:'급여명세서',icon:Receipt},{type:'WITHHOLDING',title:'원천징수영수증',icon:ScrollText}] as const;
const DOC_NAMES:Record<string,string>=Object.fromEntries(entries.map(x=>[x.type,x.title]));
/** 한국 시간 기준 현재 시각, 지난달(YYYY-MM): 급여명세서는 확정된 지난달이 기본 */
const kstNow=()=>new Date(Date.now()+9*3600*1000);
const lastMonthKst=()=>{const n=kstNow();return new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth()-1,1)).toISOString().slice(0,7)};
const SALARY_DOCS=['PAYSLIP','WITHHOLDING'];
export function DocumentsPage({session,notify}:{session:Session;notify:(m:string)=>void}){
 const[employeeId,setEmployeeId]=useState(String(session.employee_id));const[month,setMonth]=useState(lastMonthKst);const[year,setYear]=useState(()=>String(kstNow().getUTCFullYear()));const isAdmin=can(session,'DOCUMENT_ISSUE_OTHERS');const salaryDocs=can(session,'SALARY_READ');const otherTarget=Number(employeeId)!==session.employee_id;const[busy,setBusy]=useState('');
 const people=useRemote(()=>isAdmin?api.get<Paged<Person>>('/employees'+params({page:1,size:100})):Promise.resolve(null),[isAdmin]);
 const[docPage,setDocPage]=useState(1);
 const docs=useRemote(()=>api.get<Paged<DocumentRow>>('/documents'+params({page:docPage,size:10})),[docPage]);
 async function download(x:DocumentRow){try{await downloadPdf(`/documents/${x.document_id}/file`,x.file_name)}catch(e){notify(errorMessage(e))}}
 async function issue(type:string){if(!employeeId||Number(employeeId)<=0)return notify('발급 대상을 선택해 주세요.');if(otherTarget&&!salaryDocs&&SALARY_DOCS.includes(type))return notify('다른 직원의 급여 문서는 급여 권한이 있어야 발급할 수 있습니다.');setBusy(type);try{
  const body={employee_id:Number(employeeId)};
  const data=type==='PAYSLIP'?await api.post<IssuedDoc>('/certificates/payslip',{...body,pay_month:month}):type==='WITHHOLDING'?await api.post<IssuedDoc>('/certificates/withholding',{...body,year:Number(year)}):await api.post<IssuedDoc>('/certificates',{...body,certificate_type:type});
  await downloadPdf(`/documents/${data.document_id}/file`,`${type}-${data.document_id}.pdf`);
  notify('문서를 발급했습니다.');docs.refresh();
 }catch(e){notify(errorMessage(e))}finally{setBusy('')}}
 return <div className="stack"><div className="page-intro"><h1>증명서 발급</h1></div><Card title="문서 발급"><div className="filters">{isAdmin?<Field title="발급 대상"><select aria-label="발급 대상" value={employeeId} onChange={e=>setEmployeeId(e.target.value)}>{!people.data&&<option value={employeeId}>{session.employee_name} (본인)</option>}{people.data?.items.map(p=><option key={p.employee_id} value={p.employee_id}>{p.name} · {p.department_name} · {p.employee_no}{p.employee_id===session.employee_id?' (본인)':p.employment_status==='TERMINATED'?' (퇴사)':p.employment_status==='ON_LEAVE'?' (휴직)':''}</option>)}</select></Field>:<Field title="발급 대상"><input value={`${session.employee_name} (본인)`} readOnly aria-readonly="true"/></Field>}<Field title="급여명세서 대상 월"><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></Field><Field title="원천징수 대상 연도"><input type="number" value={year} min={2000} max={2100} onChange={e=>setYear(e.target.value)}/></Field></div><div className="document-grid">{entries.map(x=>{const Icon=x.icon;return <article className="document-card" key={x.type}><span className="document-icon"><Icon size={23}/></span><div><h3>{x.title}</h3></div><button className="btn btn--secondary" onClick={()=>issue(x.type)} disabled={busy!==''||(otherTarget&&!salaryDocs&&SALARY_DOCS.includes(x.type))}><Download size={16}/>{busy===x.type?'발급 중':'PDF 발급'}</button></article>})}</div><p className="notice">발급한 문서는 PDF로 바로 내려받습니다. 급여명세서는 급여가 확정된 달만 발급할 수 있습니다.{isAdmin&&!salaryDocs?' 다른 직원의 급여명세서와 원천징수영수증은 발급할 수 없습니다.':''}</p></Card>
 <Card title="발급 내역">{docs.loading?<Loading/>:docs.error?<ErrorState message={docs.error} onRetry={docs.refresh}/>:docs.data?.items.length?<div className="table-scroll"><table className="table"><thead><tr><th>발급일</th><th>문서</th>{isAdmin&&<th>대상</th>}<th>발급자</th><th></th></tr></thead><tbody>{docs.data.items.map(x=><tr key={x.document_id}><td>{date(x.issued_at)} {x.issued_at.slice(11,16)}</td><td className="strong">{DOC_NAMES[x.document_type]||x.document_type}</td>{isAdmin&&<td>{x.employee_name}</td>}<td>{x.issued_by_name||'—'}</td><td><button className="link-btn" onClick={()=>void download(x)}><Download size={14}/> 내려받기</button></td></tr>)}</tbody></table></div>:<Empty label="발급한 문서가 없습니다."/>}{docs.data&&docs.data.total>docs.data.size&&<Pager page={docs.data.page} size={docs.data.size} total={docs.data.total} onPage={setDocPage}/>}</Card></div>;
}
