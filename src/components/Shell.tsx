import {useState, type ReactNode, type FormEvent} from 'react';
import {Bell, Building2, ChevronRight, FileText, LayoutGrid, LogOut, Menu, Search, Send, Sparkles, UsersRound, Wallet, Award, X, Home} from 'lucide-react';
import type {MenuCode, PageId, Session, AiResponse} from '../lib/types';
import {api} from '../lib/api';
import {aiErrorMessage, aiShortMessage} from '../lib/ai';

const navigation: {id:PageId;label:string;menu:MenuCode;icon:typeof LayoutGrid}[] = [
  {id:'dashboard',label:'대시보드',menu:'DASHBOARD',icon:LayoutGrid},
  {id:'employees',label:'인사 관리',menu:'EMPLOYEES',icon:UsersRound},
  {id:'payroll',label:'급여 관리',menu:'PAYROLL',icon:Wallet},
  {id:'organization',label:'조직 관리',menu:'ORGANIZATION',icon:Building2},
  {id:'evaluation',label:'평가 관리',menu:'EVALUATION',icon:Award},
  {id:'approvals',label:'전자 문서',menu:'DOCUMENTS',icon:FileText},
];

export function Shell({session,page,onPage,onLogout,onSearch,children}:{session:Session;page:PageId;onPage:(p:PageId)=>void;onLogout:()=>void;onSearch:(q:string)=>void;children:ReactNode}){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [aiQuestion,setAiQuestion]=useState('');
  const [aiBusy,setAiBusy]=useState(false);
  const [aiResult,setAiResult]=useState('안녕하세요. 인사 업무를 도와드릴게요.');
  const [userMenu,setUserMenu]=useState(false);
  const go=(id:PageId)=>{onPage(id);setOpen(false)};
  const submitSearch=(e:FormEvent)=>{e.preventDefault();if(query.trim())onSearch(query.trim())};
  async function askAI(e:FormEvent){e.preventDefault();if(!aiQuestion.trim()||aiBusy)return;setAiBusy(true);try{const r=await api.post<AiResponse>('/ai/queries',{question:aiQuestion.trim(),conversation_id:null});setAiResult(aiShortMessage(r));setAiQuestion('')}catch(e){setAiResult(aiErrorMessage(e))}finally{setAiBusy(false)}}
  return <div className="shell figma-shell">
    {open&&<button className="mobile-overlay" aria-label="메뉴 닫기" onClick={()=>setOpen(false)}/>}
    <aside className={'sidebar figma-sidebar '+(open?'sidebar--open':'')}>
      <div className="sidebar-brand figma-brand"><span className="brand-icon" aria-hidden="true"/><div><strong>HRIS</strong><small>People &amp; Culture</small></div><button className="sidebar-close" onClick={()=>setOpen(false)} aria-label="메뉴 닫기"><X size={20}/></button></div>
      <div className="sidebar-caption">WORKSPACE</div>
      <nav className="nav-menu" aria-label="주 메뉴">
        {navigation.filter(x=>session.menus.includes(x.menu)).map(({id,label,icon:Icon})=><button key={id} className={'nav-item '+((page===id||(id==='approvals'&&page==='documents'))?'nav-item--active':'')} onClick={()=>go(id)} aria-current={(page===id||(id==='approvals'&&page==='documents'))?'page':undefined}><Icon size={22} strokeWidth={1.7}/><span>{label}</span></button>)}
      </nav>
      <div className="sidebar-lower">
        {session.menus.includes('AI')&&<div className="sidebar-ai"><div className="sidebar-ai-heading"><span className="sidebar-ai-mark"><Sparkles size={15}/></span><div><strong>HR AI</strong><small><span className="online-dot"/> 온라인</small></div></div><p className="sidebar-ai-message">{aiResult}</p><form className="sidebar-ai-form" onSubmit={askAI}><input value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} aria-label="HR AI 질문" placeholder="무엇이든 물어보세요"/><button type="submit" disabled={aiBusy} title="질문 전송" aria-label="질문 전송"><Send size={15}/></button></form><button className="sidebar-ai-more" onClick={()=>go('ai')}>AI 전체 화면 열기 <ChevronRight size={13}/></button></div>}
        <div className="sidebar-user-wrap"><button className="sidebar-user figma-user" onClick={()=>setUserMenu(x=>!x)} aria-expanded={userMenu}><span className="figma-user-avatar">{session.employee_name.slice(0,2)}</span><span className="user-copy"><strong>{session.employee_name}</strong><small>{session.role_label}</small></span><ChevronRight size={18} className={userMenu?'user-chevron user-chevron--open':'user-chevron'}/></button>{userMenu&&<div className="user-dropdown"><button onClick={()=>{go(session.menus.includes('DASHBOARD')?'dashboard':'approvals');setUserMenu(false)}}><Home size={16}/> 홈으로</button><button onClick={onLogout}><LogOut size={16}/> 로그아웃</button></div>}</div>
      </div>
    </aside>
    <div className="shell-main"><header className="topbar figma-topbar"><button className="mobile-toggle icon-button" onClick={()=>setOpen(true)} aria-label="메뉴 열기"><Menu size={22}/></button><form className="search-form figma-search" onSubmit={submitSearch}><Search size={20}/><input placeholder="구성원, 결재 문서 검색" aria-label="통합 검색" value={query} onChange={e=>setQuery(e.target.value)}/></form><div className="figma-top-actions"><button className="figma-bell" type="button" title="알림 기능 준비 중" aria-label="알림 기능 준비 중" disabled><Bell size={22}/></button></div></header><main className="content figma-content" id="main-content">{children}</main></div>
  </div>
}
