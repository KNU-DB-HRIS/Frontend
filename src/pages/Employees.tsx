import {useEffect,useState,type FormEvent}from 'react';
import {Plus,Search,Pencil,Trash2,Send,UserX,X,SlidersHorizontal}from 'lucide-react';
import {api,errorMessage,params}from '../lib/api';
import {useDebounced,useRemote}from '../lib/hooks';
import type {Paged,EmployeeSummary,EmployeeDetail,Assignment,Department,Position,Job,JobTitle,Session} from '../lib/types';
import {can,ROLE_OPTIONS} from '../lib/permissions';
import{actionName,date,stateName}from '../lib/format';
import{Avatar,Card,Empty,ErrorState,Field,LabelValue,Loading,Modal,Pager,Status}from '../components/UI';
type Lookup<T>={items:T[];total:number};
type Props={session:Session;notify:(message:string)=>void;initialQuery?:string;openCreate?:boolean;onCreateHandled?:()=>void};
export function Employees({session,notify,initialQuery='',openCreate=false,onCreateHandled}:Props){
 const allow={create:can(session,'EMPLOYEE_CREATE'),update:can(session,'EMPLOYEE_UPDATE'),assign:can(session,'EMPLOYEE_ASSIGN'),terminate:can(session,'EMPLOYEE_TERMINATE'),remove:can(session,'EMPLOYEE_DELETE'),role:can(session,'ROLE_MANAGE')};
 const [roleCode,setRoleCode]=useState('');
 const [autoSelected,setAutoSelected]=useState(false);
 const [showFilters,setShowFilters]=useState(true);
 const [q,setQ]=useState(initialQuery),[department,setDepartment]=useState(''),[status,setStatus]=useState(''),[page,setPage]=useState(1),[selected,setSelected]=useState<number|null>(null),[dialog,setDialog]=useState<'create'|'edit'|'assignment'|'termination'|null>(null),[busy,setBusy]=useState(false),[temporaryPassword,setTemporaryPassword]=useState<string|null>(null);
 const search=useDebounced(q);
 useEffect(()=>{setQ(initialQuery);setPage(1);},[initialQuery]);
 useEffect(()=>{if(openCreate){setDialog('create');onCreateHandled?.()}},[openCreate]);
 const list=useRemote(()=>api.get<Paged<EmployeeSummary>>('/employees'+params({q:search,department_id:department,employment_status:status,page,size:20})),[search,department,status,page]);
 const detail=useRemote(()=>selected===null?Promise.resolve(null):api.get<EmployeeDetail>(`/employees/${selected}`),[selected]);
 const history=useRemote(()=>selected===null?Promise.resolve(null):api.get<Paged<Assignment>>(`/employees/${selected}/assignments`),[selected]);
 useEffect(()=>{if(!autoSelected&&selected===null&&list.data?.items.length&&dialog===null&&!temporaryPassword){setSelected(list.data.items[0].employee_id);setAutoSelected(true)}},[list.data,selected,dialog,temporaryPassword,autoSelected]);
 const departments=useRemote(()=>api.get<Lookup<Department>>('/departments'),[]);
 const positions=useRemote(()=>api.get<Lookup<Position>>('/positions'),[]);
 const titles=useRemote(()=>api.get<Lookup<JobTitle>>('/job-titles'),[]);
 const jobs=useRemote(()=>api.get<Lookup<Job>>('/jobs'),[]);
 const [form,setForm]=useState<Record<string,string|boolean>>({});
 const edit=(kind:'create'|'edit'|'assignment'|'termination')=>{if(kind==='create')setSelected(null);
  setForm(kind==='edit'&&detail.data?{name:detail.data.name,email:detail.data.email,phone:detail.data.phone||'',birth_date:detail.data.birth_date||'',employment_type:detail.data.employment_type,address:detail.data.address||'',education:detail.data.education||''}:
  kind==='create'?{employment_type:'FULL_TIME',hire_date:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}),grant_access:false}:
  kind==='assignment'?{action_type:'TRANSFER',effective_date:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'})}:{termination_date:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'})});
  setDialog(kind);
 };
 const field=(name:string)=>(form[name]??'') as string;
 const set=(name:string,v:string|boolean)=>setForm(f=>({...f,[name]:v}));
 async function save(e:FormEvent){e.preventDefault();if(!dialog||busy)return;setBusy(true);try{
  if(dialog==='create'){
   if(!field('department_id')||!field('position_id')||!field('job_id')){notify('부서, 직급, 직무를 선택해야 합니다.');setBusy(false);return;}
   const payload={...form,birth_date:field('birth_date')||null,department_id:Number(field('department_id')),position_id:Number(field('position_id')),job_id:field('job_id')?Number(field('job_id')):null,job_title_id:field('job_title_id')?Number(field('job_title_id')):null};
   const created=await api.post<{employee_id:number;temporary_password?:string|null}>('/employees',payload);
   setSelected(created.employee_id);if(created.temporary_password)setTemporaryPassword(created.temporary_password);notify('직원이 등록되었습니다.');
  }else if(selected!=null){
   if(dialog==='edit'){await api.patch(`/employees/${selected}`,form);notify('직원 정보가 수정되었습니다.');}
   if(dialog==='assignment'){const payload:Record<string,unknown>={...form};for(const k of ['to_department_id','to_position_id','to_job_id','to_job_title_id']){if(field(k))payload[k]=Number(field(k));else delete payload[k];}await api.post(`/employees/${selected}/assignments`,payload);notify('인사 발령이 등록되었습니다.');}
   if(dialog==='termination'){await api.post(`/employees/${selected}/termination`,form);notify('퇴사 처리되었습니다.');}
  }
  setDialog(null);list.refresh();detail.refresh();history.refresh();
 }catch(err){notify(errorMessage(err));}finally{setBusy(false)} }
 useEffect(()=>{setRoleCode('')},[selected]);
 async function changeRole(){if(selected==null||!roleCode||busy)return;const label=ROLE_OPTIONS.find(([c])=>c===roleCode)?.[1]||roleCode;if(!window.confirm(`역할을 '${label}'(으)로 바꾸시겠습니까?`))return;setBusy(true);try{await api.put(`/employees/${selected}/role`,{role_code:roleCode});notify('역할을 변경했습니다.');setRoleCode('');detail.refresh();}catch(err){notify(errorMessage(err));}finally{setBusy(false);}}
 async function remove(){if(selected==null)return;if(!window.confirm('이력 없는 오등록 직원만 삭제할 수 있습니다. 삭제하시겠습니까?'))return;try{await api.delete(`/employees/${selected}`);notify('삭제되었습니다.');setSelected(null);list.refresh();}catch(err){notify(errorMessage(err));}}
 return <div className="stack figma-people-page"><div className="page-intro"><div><h1>인사 관리</h1></div>{allow.create&&<button className="btn btn--primary" onClick={()=>edit('create')}><Plus size={17}/> 직원 등록</button>}</div>
 <div className="records-layout"><div className="records-list"><Card title="구성원 목록"><div className="filters"><label className="search-box"><Search size={17}/><input placeholder="이름, 사번, 부서명 검색" value={q} onChange={e=>{setQ(e.target.value);setPage(1)}}/></label><select className={showFilters?'':'filter-collapsed'} aria-label="부서 필터" value={department} onChange={e=>{setDepartment(e.target.value);setPage(1)}}><option value="">전체 부서</option>{departments.data?.items.map(d=><option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}</select><select className={showFilters?'':'filter-collapsed'} aria-label="재직 상태 필터" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="">전체 상태</option><option value="ACTIVE">재직</option><option value="ON_LEAVE">휴직</option><option value="TERMINATED">퇴사</option></select><button className="filter-icon" title="필터 표시 전환" type="button" aria-expanded={showFilters} aria-label="필터 표시 전환" onClick={()=>setShowFilters(v=>!v)}><SlidersHorizontal size={17}/></button></div>
 {list.loading?<Loading/>:list.error?<ErrorState message={list.error} onRetry={list.refresh}/>:!list.data?.items.length?<Empty/>:<div className="table-scroll"><table className="table"><thead><tr><th className="check-col"><input type="checkbox" aria-label="전체 선택" disabled/></th><th>사번</th><th>이름</th><th>부서</th><th>직급</th><th>상태</th><th>입사일</th></tr></thead><tbody>{list.data.items.map(e=><tr key={e.employee_id} onClick={()=>setSelected(e.employee_id)} className={selected===e.employee_id?'selected-row':''}><td><input type="checkbox" aria-label={`${e.name} 선택`} checked={selected===e.employee_id} onChange={()=>setSelected(e.employee_id)} onClick={ev=>ev.stopPropagation()}/></td><td>{e.employee_no}</td><td><div className="person"><Avatar name={e.name}/><strong>{e.name}</strong></div></td><td>{e.department_name}</td><td>{e.position_name}</td><td><Status value={e.employment_status}/></td><td>{date(e.hire_date)}</td></tr>)}</tbody></table></div>}
 {list.data&&<Pager page={list.data.page}total={list.data.total}size={list.data.size} onPage={setPage}/>}</Card></div>
 {selected!==null&&!dialog&&!temporaryPassword&&<aside className="record-panel"><button className="record-close" onClick={()=>setSelected(null)} aria-label="상세 닫기"><X size={17}/></button>{(allow.update||allow.assign||allow.remove)&&<div className="record-actions">{allow.update&&<button className="btn btn--primary" onClick={()=>edit('edit')} disabled={!detail.data}><Pencil size={16}/> 정보 수정</button>}{allow.assign&&<button className="btn btn--secondary" onClick={()=>edit('assignment')} disabled={!detail.data}><Send size={16}/> 인사발령</button>}{allow.remove&&<button className="btn btn--danger btn-square" aria-label="삭제" onClick={remove}><Trash2 size={16}/></button>}</div>}
 {detail.loading?<Loading/>:detail.error?<ErrorState message={detail.error} onRetry={detail.refresh}/>:detail.data&&<><div className="detail-profile"><Avatar name={detail.data.name}/><div><h3>{detail.data.name}</h3><span>{detail.data.employee_no} · {detail.data.department_name} · {detail.data.position_name}</span></div><Status value={detail.data.employment_status}/></div><div className="kv-grid"><LabelValue name="직무" value={detail.data.job_name}/><LabelValue name="직책" value={detail.data.job_title_name}/><LabelValue name="이메일" value={detail.data.email}/><LabelValue name="연락처" value={detail.data.phone}/><LabelValue name="입사일" value={date(detail.data.hire_date)}/><LabelValue name="고용 형태" value={stateName(detail.data.employment_type)}/></div>{detail.data.account&&<div className="record-role"><span>계정 역할</span>{allow.role&&detail.data.account.user_id!==session.user_id&&detail.data.employment_status!=='TERMINATED'?<div><select aria-label="계정 역할" value={roleCode||detail.data.account.role_code||''} onChange={e=>setRoleCode(e.target.value)}>{ROLE_OPTIONS.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select><button className="btn btn--secondary" disabled={busy||!roleCode||roleCode===detail.data.account.role_code} onClick={()=>void changeRole()}>변경</button></div>:<strong>{detail.data.account.role_name||'—'}</strong>}</div>}{allow.terminate&&<div className="record-termination"><button className="link-btn" onClick={()=>edit('termination')}><UserX size={15}/> 퇴사 처리</button></div>}<h3 className="subheading">최근 인사 이력</h3>{history.loading?<Loading/>:history.error?<ErrorState message={history.error}/>:history.data?.items.length?<div className="history-list">{history.data.items.map((a,i)=><div key={a.assignment_id||i}><strong>{date(a.effective_date)} · {actionName(a.action_type)}</strong><small>{a.to_department_name||''} {a.to_position_name||''} {a.reason||''}</small></div>)}</div>:<Empty label="인사 발령 이력이 없습니다."/>}</>}
 </aside>}
 </div>
 {temporaryPassword&&<Modal title="초기 로그인 정보" onClose={()=>setTemporaryPassword(null)} footer={<button className="btn btn--primary" onClick={()=>setTemporaryPassword(null)}>확인</button>}><p className="notice">임시 비밀번호는 등록 직후 1회만 제공됩니다. 안전하게 전달하세요.</p><div className="secret-output">{temporaryPassword}</div></Modal>}
 {dialog&&<Modal className={dialog==='create'?'employee-register-modal':undefined} title={{create:'직원 등록',edit:'정보 수정',assignment:'인사 발령',termination:'퇴사 처리'}[dialog]} onClose={()=>setDialog(null)} footer={<><button className="btn btn--secondary" onClick={()=>setDialog(null)}>취소</button><button className="btn btn--primary" form="emp-form" type="submit" disabled={busy}>{busy?'처리 중...':'저장'}</button></>}><form id="emp-form" onSubmit={save} className="form-grid">
 {dialog==='create'&&<div className="employee-register-body">
   <div className="employee-register-hero"><span className="employee-register-photo"><Plus size={24}/></span><div className="employee-register-number"><span>사번</span><strong>자동 생성</strong><small>등록 완료 후 부여됩니다.</small></div></div>
   <section className="employee-register-section"><div className="employee-register-section-title"><h3>기본 정보</h3><small>필수 항목 *</small></div><div className="form-grid">
     <Field title="이름 *"><input required maxLength={50} value={field('name')} onChange={e=>set('name',e.target.value)}/></Field>
     <Field title="이메일 *"><input type="email" required maxLength={100} value={field('email')} onChange={e=>set('email',e.target.value)}/></Field>
     <Field title="휴대전화 *"><input required maxLength={20} value={field('phone')} onChange={e=>set('phone',e.target.value)}/></Field>
     <Field title="생년월일"><input type="date" value={field('birth_date')} onChange={e=>set('birth_date',e.target.value)}/></Field>
   </div></section>
   <section className="employee-register-section"><h3>소속 및 직무</h3><div className="form-grid employee-register-three">
     <LookupField title="소속 부서 *" name="department_id" value={field('department_id')} onChange={set} options={departments.data?.items.map(x=>({id:x.department_id,label:x.department_name}))||[]}/>
     <LookupField title="직급 *" name="position_id" value={field('position_id')} onChange={set} options={positions.data?.items.map(x=>({id:x.position_id,label:x.position_name}))||[]}/>
     <LookupField title="직무 *" name="job_id" value={field('job_id')} onChange={set} options={jobs.data?.items.map(x=>({id:x.job_id,label:x.job_name}))||[]}/>
     <LookupField title="직책" name="job_title_id" value={field('job_title_id')} onChange={set} options={titles.data?.items.map(x=>({id:x.job_title_id,label:x.job_title_name}))||[]}/>
   </div></section>
   <section className="employee-register-section"><h3>입사 정보</h3><div className="form-grid">
     <Field title="입사일 *"><input type="date" required value={field('hire_date')} onChange={e=>set('hire_date',e.target.value)}/></Field>
     <Field title="고용 형태 *"><select required value={field('employment_type')} onChange={e=>set('employment_type',e.target.value)}><option value="FULL_TIME">정규직</option><option value="CONTRACT">계약직</option><option value="INTERN">인턴</option></select></Field>
   </div></section>
   <section className="employee-register-section"><label className="employee-register-access"><span><strong>HRIS 접속 권한</strong><small>등록 후 계정이 생성되며 최초 임시 비밀번호는 1회만 표시됩니다.</small></span><input type="checkbox" checked={Boolean(form.grant_access)} onChange={e=>set('grant_access',e.target.checked)}/></label>{form.grant_access&&<div className="employee-register-username"><Field title="로그인 아이디 *"><input required maxLength={50} value={field('username')} onChange={e=>set('username',e.target.value)}/></Field></div>}</section>
 </div>}
 {dialog==='edit'&&<>{['name','email','phone','birth_date','address','education'].map(k=><Field title={{name:'이름',email:'이메일',phone:'연락처',birth_date:'생년월일',address:'주소',education:'학력'}[k]||k} key={k}><input type={k==='email'?'email':k==='birth_date'?'date':'text'} value={field(k)} onChange={e=>set(k,e.target.value)}/></Field>)}<Field title="고용 형태"><select value={field('employment_type')} onChange={e=>set('employment_type',e.target.value)}><option value="FULL_TIME">정규직</option><option value="CONTRACT">계약직</option><option value="INTERN">인턴</option></select></Field></>}
 {dialog==='assignment'&&<><Field title="발령 종류"><select value={field('action_type')} onChange={e=>set('action_type',e.target.value)}>{['TRANSFER','PROMOTION','JOB_CHANGE','TITLE_CHANGE','REASSIGNMENT'].map(v=><option key={v} value={v}>{actionName(v)}</option>)}</select></Field><Field title="발령일"><input type="date" required value={field('effective_date')} onChange={e=>set('effective_date',e.target.value)}/></Field><LookupField title="변경 부서" name="to_department_id" value={field('to_department_id')} onChange={set} options={departments.data?.items.map(x=>({id:x.department_id,label:x.department_name}))||[]}/><LookupField title="변경 직급" name="to_position_id" value={field('to_position_id')} onChange={set} options={positions.data?.items.map(x=>({id:x.position_id,label:x.position_name}))||[]}/><LookupField title="변경 직무" name="to_job_id" value={field('to_job_id')} onChange={set} options={jobs.data?.items.map(x=>({id:x.job_id,label:x.job_name}))||[]}/><LookupField title="변경 직책" name="to_job_title_id" value={field('to_job_title_id')} onChange={set} options={titles.data?.items.map(x=>({id:x.job_title_id,label:x.job_title_name}))||[]}/><Field title="사유"><textarea required value={field('reason')} onChange={e=>set('reason',e.target.value)}/></Field></>}
 {dialog==='termination'&&<><Field title="퇴사일"><input type="date" required value={field('termination_date')} onChange={e=>set('termination_date',e.target.value)}/></Field><Field title="사유"><textarea required value={field('reason')} onChange={e=>set('reason',e.target.value)}/></Field></>}
 </form></Modal>}
 </div>
}
function LookupField({title,name,value,onChange,options}:{title:string;name:string;value:string;onChange:(name:string,val:string)=>void;options:Array<{id:number;label:string}>}){return <Field title={title}><select value={value} onChange={e=>onChange(name,e.target.value)}><option value="">선택</option>{options.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>}
