import {useState,type FormEvent}from 'react';
import {Building2,Plus,Save,Trash2,UsersRound,Award,BriefcaseBusiness,Network,UserRound,ChevronRight,Search,Info}from 'lucide-react';
import {api,errorMessage,params}from '../lib/api';
import{useRemote}from '../lib/hooks';
import type{Company,Department,Job,JobTitle,Position}from '../lib/types';
import{count,pct}from '../lib/format';
import{Card,Empty,ErrorState,Loading,Pager}from '../components/UI';
const sections=[
 {key:'departments',title:'부서',id:'department_id',name:'department_name',code:'department_code',fields:[['department_name','부서명'],['department_code','부서 코드'],['parent_department_id','상위부서 ID'],['manager_employee_id','부서장 직원 ID'],['description','설명']]},
 {key:'positions',title:'직급',id:'position_id',name:'position_name',code:'position_code',fields:[['position_name','직급명'],['position_code','직급 코드'],['level','단계'],['min_tenure_months','최소 체류 개월'],['description','설명']]},
 {key:'job-titles',title:'직책',id:'job_title_id',name:'job_title_name',code:'job_title_code',fields:[['job_title_name','직책명'],['job_title_code','직책 코드'],['description','설명']]},
 {key:'jobs',title:'직무',id:'job_id',name:'job_name',code:'job_code',fields:[['job_name','직무명'],['job_code','직무 코드'],['job_family','직군'],['job_category','직무 분류'],['description','설명']]}
] as const;
interface Headcounts{summary:{total:number;total_change_vs_last_month:number;active:number;active_rate:number|null;on_leave:number;on_leave_rate:number|null;new_hires_this_month:number;new_hires_change_vs_last_month:number};items:Array<{department_id:number;department_name:string;manager_name:string|null;total:number;active:number;on_leave:number;new_hires:number;active_rate:number|null}>;page:number;size:number;total:number;}
type Entity=Record<string,unknown>;
export function Organization({notify}:{notify:(m:string)=>void}){
 const[companyView,setCompanyView]=useState(true);
 const[selectedId,setSelectedId]=useState<number|null>(null);
 const[section,setSection]=useState('departments'),[people,setPeople]=useState(false),[page,setPage]=useState(1),[q,setQ]=useState(''),[activeOnly,setActiveOnly]=useState(true),[open,setOpen]=useState(false),[editId,setEditId]=useState<number|null>(null),[values,setValues]=useState<Record<string,string>>({});
 const company=useRemote(()=>api.get<Company>('/company'),[]);const [companyEdit,setCompanyEdit]=useState(false);const [companyValues,setCompanyValues]=useState<Record<string,string>>({});
 const list=useRemote(()=>api.get<{items:Entity[];total:number}>(`/${section}`),[section]);
 const employeeOptions=useRemote(()=>api.get<{items:Array<{employee_id:number;name:string}>}>('/employees?page=1&size=100'),[]);
 const counts=useRemote(()=>api.get<Headcounts>('/organization/headcounts'+params({q:people?q:undefined,page,size:20})),[people,q,page]);
 const spec=sections.find(s=>s.key===section)!;
 const fields: ReadonlyArray<readonly [string,string]>=spec.fields;
 const records=list.data?.items.filter(x=>(!activeOnly||x.is_active!==false)&&(`${String(x[spec.name]??'')} ${String(x[spec.code]??'')}`).toLowerCase().includes(q.toLowerCase()))||[];
 const selectedItem=records.find(item=>Number(item[spec.id])===selectedId)??records[0];
 function editor(item?:Entity){setSelectedId(item?Number(item[spec.id]):null);setEditId(item?Number(item[spec.id]):null);setValues(Object.fromEntries(fields.map(([field])=>[field,item?.[field]==null?'':String(item[field])] )));setOpen(true);}
 async function save(e:FormEvent){e.preventDefault();const payload:Record<string,unknown>={};for(const[field]of fields){const value=values[field]??'';payload[field]=['parent_department_id','manager_employee_id'].includes(field)?value?Number(value):null:['level','min_tenure_months'].includes(field)?Number(value||0):value;}try{if(editId==null)await api.post(`/${section}`,payload);else await api.patch(`/${section}/${editId}`,payload);notify('조직 정보가 저장되었습니다.');setOpen(false);list.refresh();counts.refresh();}catch(e){notify(errorMessage(e));}}
 async function deactivateSelected(id:number){if(!Number.isInteger(id)||id<1)return;if(!window.confirm('해당 기준정보를 사용 중지하시겠습니까? 현재 참조 중이면 서버가 오류를 반환합니다.'))return;try{await api.delete(`/${section}/${id}`);notify('사용 중지되었습니다.');setSelectedId(null);setOpen(false);list.refresh();counts.refresh();}catch(e){notify(errorMessage(e));}}
 async function uploadLogo(file:File){const data=new FormData();data.append('file',file);try{await api.upload<{logo_url:string}>('/company/logo',data);notify('회사 로고가 등록되었습니다.');company.refresh();}catch(e){notify(errorMessage(e));}}
 async function saveCompany(e:FormEvent){e.preventDefault();try{await api.patch('/company',companyValues);notify('회사 정보가 변경되었습니다.');setCompanyEdit(false);company.refresh();}catch(err){notify(errorMessage(err));}}
 return <div className="stack figma-organization"><div className="org-action-grid">{[
  {key:'company',label:'회사 기본정보',desc:'회사 정보를 등록하고 수정할 수 있습니다.',icon:Building2},
  {key:'departments',label:'부서 관리',desc:'부서를 등록하고 수정할 수 있습니다.',icon:Network},
  {key:'positions',label:'직급 관리',desc:'직급을 등록하고 수정할 수 있습니다.',icon:Award},
  {key:'job-titles',label:'직책 관리',desc:'직책을 등록하고 수정할 수 있습니다.',icon:UserRound},
  {key:'jobs',label:'직무 관리',desc:'직무를 등록하고 수정할 수 있습니다.',icon:BriefcaseBusiness},
 ].map(x=>{const Icon=x.icon;return <button className="org-action" key={x.key} onClick={()=>{setCompanyView(x.key==='company');setPeople(false);if(x.key!=='company')setSection(x.key);setSelectedId(null);setOpen(false);setQ('');}}><span className="org-action-icon"><Icon size={21}/></span><span><strong>{x.label}</strong><small>{x.desc}</small></span><ChevronRight size={16}/></button>})}</div>
 <div className="org-action-secondary"><button onClick={()=>{setCompanyView(false);setSection('departments');setPeople(false)}}><UserRound size={20}/> 부서장 지정</button><button onClick={()=>{setCompanyView(false);setPeople(true);setPage(1)}}><UsersRound size={20}/> 조직별 인원조회</button><button onClick={()=>{setCompanyView(false);setPeople(false);setSection('departments')}}><Trash2 size={20}/> 부서 사용 중지</button></div>
 <div className="tabs org-tabs"><button className={companyView?'active':''} onClick={()=>{setCompanyView(true);setPeople(false)}}>회사 기본정보</button>{sections.map(x=><button key={x.key} className={!companyView&&!people&&section===x.key?'active':''} onClick={()=>{setCompanyView(false);setPeople(false);setSection(x.key);setSelectedId(null);setOpen(false);setQ('')}}>{x.title} 관리</button>)}<button className={!companyView&&people?'active':''} onClick={()=>{setCompanyView(false);setPeople(true);setPage(1)}}>조직별 인원조회</button></div>
 {companyView&&<div className="org-company-layout"><section className="surface org-company-form"><div className="surface__head"><h2><Building2 size={18}/> 회사 기본정보</h2><button className="btn btn--secondary" onClick={()=>{if(company.data)setCompanyValues(Object.fromEntries(Object.entries(company.data).filter(([k])=>k!=='company_id').map(([k,v])=>[k,v==null?'':String(v)])));setCompanyEdit(v=>!v)}}>{companyEdit?'편집 취소':'수정하기'}</button></div>
 {company.loading?<Loading/>:company.error?<ErrorState message={company.error} onRetry={company.refresh}/>:company.data?<form id="inline-company-form" className="org-company-fields" onSubmit={saveCompany}>{([
  ['name','회사명'],['business_number','사업자등록번호'],['ceo_name','대표자명'],['founded_date','설립일'],['address','회사주소'],['phone','연락처'],['email','이메일'],['homepage','홈페이지'],['industry','업종']
 ] as const).map(([k,label])=><label className="org-company-field" key={k}><span>{label}</span><input disabled={!companyEdit} type={k==='founded_date'?'date':k==='email'?'email':'text'} value={companyEdit?(companyValues[k]??''):(company.data?.[k]??'')} onChange={e=>setCompanyValues(v=>({...v,[k]:e.target.value}))}/></label>)}<div className="org-company-field"><span>회사 로고</span><label className="company-logo-picker">{company.data.logo_url?<img src={company.data.logo_url} alt="등록된 회사 로고"/>:<Building2 size={23}/>}<span>이미지 변경</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)void uploadLogo(f);e.target.value=''}}/></label></div>{companyEdit&&<div className="org-company-buttons"><button type="button" className="btn btn--secondary" onClick={()=>setCompanyEdit(false)}>취소</button><button type="submit" className="btn btn--primary"><Save size={15}/> 저장</button></div>}</form>:<Empty/>}
 </section><section className="surface org-company-preview"><div className="surface__head"><h2>회사 정보 미리보기</h2></div>{company.data?<div className="org-preview-inner"><div className="org-preview-brand"><span><Building2 size={33}/></span><div><h3>{company.data.name}</h3><small>{company.data.name_en||''}</small></div></div>{([['대표자명',company.data.ceo_name],['설립일',company.data.founded_date],['사업자등록번호',company.data.business_number],['주소',company.data.address],['연락처',company.data.phone],['이메일',company.data.email],['홈페이지',company.data.homepage]] as const).map(([label,value])=><div className="org-preview-row" key={label}><span>{label}</span><strong>{value||'—'}</strong></div>)}</div>:<Empty/>}</section></div>}
 {!companyView && (!people ? <section className="org-master" aria-label={`${spec.title} 관리`}>
   <div className="org-master-top">
     <div><h2>{`${spec.title} 목록`}</h2><p>{spec.title} 정보를 조회하고 관리합니다.</p></div>
     <button type="button" className="btn btn--primary" onClick={()=>editor()}><Plus size={17}/> {spec.title} 추가</button>
   </div>
   <div className="org-master-split">
     <section className="org-master-list" aria-label={`${spec.title} 목록`}>
       <label className="org-master-search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={`${spec.title}명 또는 코드 검색`} aria-label={`${spec.title} 검색`}/></label>
       <div className="org-master-list-meta"><span>전체 {records.length}개</span><label><input type="checkbox" checked={activeOnly} onChange={e=>setActiveOnly(e.target.checked)}/> 사용 중인 항목만</label></div>
       {list.loading ? <Loading/> : list.error ? <ErrorState message={list.error} onRetry={list.refresh}/> : records.length ? <div className="org-master-items">{records.map((item,index)=><button key={String(item[spec.id])} type="button" className={'org-master-item '+(!open && selectedItem && Number(item[spec.id])===Number(selectedItem[spec.id])?'selected':'')} onClick={()=>{setSelectedId(Number(item[spec.id]));setEditId(null);setOpen(false)}}>
         <span className="org-master-number">{String(index+1).padStart(2,'0')}</span><span className="org-master-item-body"><strong>{String(item[spec.name]??'—')}</strong><small>{String(item[spec.code]??'—')}{item.description?' · '+String(item.description):''}</small></span><span className="org-master-headcount">{item.headcount==null?'':count(Number(item.headcount))}</span><ChevronRight size={16}/>
       </button>)}</div>:<Empty/>}
       <div className="org-master-tip"><Info size={16}/> 항목을 선택하면 상세 정보를 확인할 수 있습니다.</div>
     </section>
     <section className="org-master-detail" aria-label={`${spec.title} 상세 정보`}>
       {open || selectedItem ? <>
         <div className="org-master-detail-top"><span className="org-master-detail-icon"><Network size={22}/></span><div><small>{open && editId===null?'신규 등록':String((open?records.find(x=>Number(x[spec.id])===editId):selectedItem)?.[spec.code]??'')}</small><h3>{open&&editId===null?`새 ${spec.title}`:String((open?records.find(x=>Number(x[spec.id])===editId):selectedItem)?.[spec.name]??spec.title)}</h3></div>{!open&&<button className="btn btn--secondary org-master-edit" onClick={()=>editor(selectedItem)}>수정하기</button>}</div>
         <form className="org-master-form" id="org-master-form" onSubmit={save}>
           <h4>기본 정보 <small>{open?'필수 정보를 입력해주세요.':'현재 등록된 정보입니다.'}</small></h4>
           <div className="org-master-fields">
             {fields.map(([field,title])=>{const raw=open?(values[field]??''):(selectedItem?.[field]==null?'':String(selectedItem[field]));const required=field===spec.name||field===spec.code;
               return <label key={field} className={'org-master-field '+(field==='description'?'org-master-field--wide':'')}><span>{title}{required&&<b> *</b>}</span>
                 {field==='description'?<textarea value={raw} disabled={!open} rows={2} onChange={e=>setValues(v=>({...v,[field]:e.target.value}))}/>:
                  field==='parent_department_id'?<select disabled={!open} value={raw} onChange={e=>setValues(v=>({...v,[field]:e.target.value}))}><option value="">최상위 부서</option>{(list.data?.items||[]).filter(x=>Number(x[spec.id])!==editId).map(x=><option value={Number(x.department_id)} key={Number(x.department_id)}>{String(x.department_name)}</option>)}</select>:
                  field==='manager_employee_id'?<select disabled={!open} value={raw} onChange={e=>setValues(v=>({...v,[field]:e.target.value}))}><option value="">부서장 미지정</option>{(employeeOptions.data?.items||[]).map(x=><option key={x.employee_id} value={x.employee_id}>{x.name}</option>)}</select>:
                  <input type={field.includes('_id')||field==='level'||field==='min_tenure_months'?'number':'text'} disabled={!open} required={required} min={field==='level'||field==='min_tenure_months'?0:undefined} value={raw} onChange={e=>setValues(v=>({...v,[field]:e.target.value}))}/>
                 }</label>})}
           </div>
           {!open&&<div className="org-master-information"><h4>운영 정보</h4><div><span>현재 인원</span><strong>{selectedItem?.headcount==null?'—':count(Number(selectedItem.headcount))}</strong></div><div><span>사용 여부</span><strong>{selectedItem?.is_active===false?'사용 중지':'사용 중'}</strong></div></div>}
           <div className="org-master-actions">
             {open ? <><button type="button" className="btn btn--secondary" onClick={()=>setOpen(false)}>취소</button><button className="btn btn--primary" type="submit"><Save size={16}/> {editId===null?'등록하기':'변경사항 저장'}</button></>:
             <><button type="button" className="btn btn--danger" disabled={selectedItem?.is_active===false} onClick={()=>{void deactivateSelected(Number(selectedItem?.[spec.id]));}}><Trash2 size={15}/> 사용 중지</button><button type="button" className="btn btn--primary" onClick={()=>editor(selectedItem)}><Save size={15}/> 수정하기</button></>}
           </div>
         </form>
       </> : <Empty label="왼쪽 목록에서 항목을 선택하거나 새 항목을 추가하세요."/>}
     </section>
   </div>
 </section> : <Card title="조직별 인원조회">
   <div className="org-headcount-kpis">{counts.data&&[
     ['전체 인원',count(counts.data.summary.total),'전월 대비 '+(counts.data.summary.total_change_vs_last_month>=0?'+':'')+count(counts.data.summary.total_change_vs_last_month)],
     ['재직 인원',count(counts.data.summary.active),'재직률 '+pct(counts.data.summary.active_rate)],
     ['휴직 인원',count(counts.data.summary.on_leave),'전체의 '+pct(counts.data.summary.on_leave_rate)],
     ['이번 달 입사',count(counts.data.summary.new_hires_this_month),'전월 대비 '+(counts.data.summary.new_hires_change_vs_last_month>=0?'+':'')+count(counts.data.summary.new_hires_change_vs_last_month)]
   ].map(([label,value,note])=><div className="org-headcount-kpi" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div>
   <div className="filters org-headcount-filters"><input className="filter-input" placeholder="부서 또는 부서장 검색" value={q} onChange={e=>{setQ(e.target.value);setPage(1)}}/></div>
   {counts.loading?<Loading/>:counts.error?<ErrorState message={counts.error} onRetry={counts.refresh}/>:counts.data?<><div className="table-scroll"><table className="table org-headcount-table"><thead><tr><th>조직명</th><th>부서장</th><th>전체</th><th>재직</th><th>휴직</th><th>신규 입사</th><th>재직 비율</th></tr></thead><tbody>{counts.data.items.map(x=><tr key={x.department_id}><td className="strong">{x.department_name}</td><td>{x.manager_name||'미지정'}</td><td>{x.total}명</td><td>{x.active}명</td><td>{x.on_leave}명</td><td>+{x.new_hires}명</td><td><span className="org-headcount-rate"><i><b style={{width:x.active_rate===null?'0%':`${Math.max(0,Math.min(100,x.active_rate*100))}%`}}/></i>{pct(x.active_rate)}</span></td></tr>)}</tbody></table></div><Pager page={counts.data.page}size={counts.data.size}total={counts.data.total}onPage={setPage}/></>:<Empty/>}
 </Card>)}

 </div>}
export type OrganizationModels=Department|Position|Job|JobTitle;
