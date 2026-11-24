import {useState, type ReactNode, type FormEvent} from 'react';
import {can} from '../lib/permissions';
import {Building2, CalendarDays, ChevronRight, FileText, KeyRound, LayoutGrid, LogOut, Menu, Search, Send, Sparkles, UsersRound, Wallet, Award, X} from 'lucide-react';
import type {MenuCode, PageId, Session} from '../lib/types';

const navigation: {id:PageId;label:string;menu:MenuCode;icon:typeof LayoutGrid}[] = [
  {id:'dashboard',label:'대시보드',menu:'DASHBOARD',icon:LayoutGrid},
  {id:'employees',label:'인사 관리',menu:'EMPLOYEES',icon:UsersRound},
  {id:'payroll',label:'급여 관리',menu:'PAYROLL',icon:Wallet},
  {id:'organization',label:'조직 관리',menu:'ORGANIZATION',icon:Building2},
  {id:'evaluation',label:'평가 관리',menu:'EVALUATION',icon:Award},
  {id:'approvals',label:'전자 문서',menu:'DOCUMENTS',icon:FileText},
  {id:'schedule',label:'일정',menu:'SCHEDULE',icon:CalendarDays},
];

export function Shell({session,page,onPage,onLogout,onSearch,onAskAI,onSwitchCompany,onChangePassword,children}:{session:Session;page:PageId;onPage:(p:PageId)=>void;onLogout:()=>void;onChangePassword?:()=>void;onSearch:(q:string)=>void;onAskAI:(q:string)=>void;onSwitchCompany?:(companyId:number)=>void;children:ReactNode}){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [aiQuestion,setAiQuestion]=useState('');
  const go=(id:PageId)=>{onPage(id);setOpen(false)};
  const submitSearch=(e:FormEvent)=>{e.preventDefault();if(query.trim())onSearch(query.trim())};
  /** 사이드바 질문은 AI 화면으로 넘겨서 그곳에서 조회 (결과 표, SQL까지 한 화면에서 확인) */
  const askAI=(e:FormEvent)=>{e.preventDefault();const q=aiQuestion.trim();if(!q)return;setAiQuestion('');onAskAI(q);setOpen(false)};
  return <div className="shell figma-shell">
    {open&&<button className="mobile-overlay" aria-label="메뉴 닫기" onClick={()=>setOpen(false)}/>}
    <aside className={'sidebar figma-sidebar '+(open?'sidebar--open':'')}>
      <div className="sidebar-brand figma-brand"><span className="brand-icon" aria-hidden="true"/><div><strong>HRIS</strong><small>People &amp; Culture</small></div><button className="sidebar-close" onClick={()=>setOpen(false)} aria-label="메뉴 닫기"><X size={20}/></button></div>
      <div className="sidebar-caption">WORKSPACE</div>
      <nav className="nav-menu" aria-label="주 메뉴">
        {navigation.filter(x=>session.menus.includes(x.menu)).map(({id,label,icon:Icon})=><button key={id} className={'nav-item '+((page===id||(id==='approvals'&&page==='documents'))?'nav-item--active':'')} onClick={()=>go(id)} aria-current={(page===id||(id==='approvals'&&page==='documents'))?'page':undefined}><Icon size={22} strokeWidth={1.7}/><span>{id==='evaluation'&&!can(session,'EVALUATION_READ')?'평가':label}</span></button>)}
      </nav>
      <div className="sidebar-lower">
        {session.menus.includes('AI')&&<div className="sidebar-ai"><div className="sidebar-ai-heading"><span className="sidebar-ai-mark"><Sparkles size={15}/></span><div><strong>HR AI</strong></div></div><form className="sidebar-ai-form" onSubmit={askAI}><input value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} aria-label="HR AI 질문" placeholder="무엇이든 물어보세요"/><button type="submit" disabled={!aiQuestion.trim()} title="질문 전송" aria-label="질문 전송"><Send size={15}/></button></form><button className="sidebar-ai-more" onClick={()=>go('ai')}>AI 전체 화면 열기 <ChevronRight size={13}/></button></div>}
        <div className="sidebar-user-wrap"><div className="sidebar-user figma-user"><span className="figma-user-avatar">{session.employee_name.slice(0,2)}</span><span className="user-copy"><strong>{session.employee_name}</strong><small>{session.role_label}</small></span><span className="user-actions">{onChangePassword&&<button type="button" className="sidebar-logout" onClick={onChangePassword} title="비밀번호 변경" aria-label="비밀번호 변경"><KeyRound size={17}/></button>}<button type="button" className="sidebar-logout" onClick={onLogout} title="로그아웃" aria-label="로그아웃"><LogOut size={18}/></button></span></div></div>
      </div>
    </aside>
    <div className="shell-main"><header className="topbar figma-topbar"><button className="mobile-toggle icon-button" onClick={()=>setOpen(true)} aria-label="메뉴 열기"><Menu size={22}/></button><form className="search-form figma-search" onSubmit={submitSearch}><Search size={20}/><input placeholder="구성원, 결재 문서 검색" aria-label="통합 검색" value={query} onChange={e=>setQuery(e.target.value)}/></form><div className="figma-top-actions">{(session.companies?.length??0)>1&&<label className="company-switch" title="현재 회사"><Building2 size={18}/><select aria-label="현재 회사" value={session.company.company_id} onChange={e=>onSwitchCompany?.(Number(e.target.value))}>{session.companies.map(c=><option key={c.company_id} value={c.company_id}>{c.name}{c.is_home?' (소속)':''}</option>)}</select></label>}</div></header><main className="content figma-content" id="main-content">{children}</main></div>
  </div>
}
