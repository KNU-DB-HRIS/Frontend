import{useState,type FormEvent}from 'react';
import{KeyRound,LogOut}from 'lucide-react';
import{api,errorMessage}from '../lib/api';
import type{Session}from '../lib/types';
import{Modal}from './UI';

const MIN=12;
/** 화면에서 먼저 막는 규칙 (서버도 같은 규칙으로 다시 검사: 12~128자, 아이디 포함 금지, 지금 비밀번호와 다르게) */
function problem(username:string,current:string,next:string,confirm:string){
  if(!current)return '지금 비밀번호를 입력하세요.';
  if(next.length<MIN)return `새 비밀번호는 ${MIN}자 이상이어야 합니다.`;
  if(next.length>128)return '새 비밀번호는 128자 이하여야 합니다.';
  if(next.trim()!==next)return '새 비밀번호 앞뒤에 공백을 넣을 수 없습니다.';
  if(username&&next.toLowerCase().includes(username.toLowerCase()))return '새 비밀번호에 아이디를 넣을 수 없습니다.';
  if(next===current)return '새 비밀번호는 지금 비밀번호와 달라야 합니다.';
  if(next!==confirm)return '새 비밀번호 확인이 일치하지 않습니다.';
  return '';
}
function Fields({username,onDone,submitLabel}:{username:string;onDone:(me:Session)=>void;submitLabel:string}){
  const[current,setCurrent]=useState(''),[next,setNext]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(e:FormEvent){e.preventDefault();const p=problem(username,current,next,confirm);if(p){setError(p);return;}setBusy(true);setError('');
    try{const me=await api.post<Session>('/auth/password',{current_password:current,new_password:next});onDone(me);}catch(err){setError(errorMessage(err));}finally{setBusy(false);}}
  return <form className="password-form" onSubmit={submit}>
    <label><span>지금 비밀번호</span><input type="password" autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)} required/></label>
    <label><span>새 비밀번호</span><input type="password" autoComplete="new-password" value={next} onChange={e=>setNext(e.target.value)} minLength={MIN} maxLength={128} required/></label>
    <label><span>새 비밀번호 확인</span><input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label>
    <small className="password-rule">{MIN}자 이상, 아이디는 넣을 수 없습니다. 바꾸면 다른 기기에 로그인된 세션은 끊깁니다.</small>
    {error&&<div className="inline-error" role="alert">{error}</div>}
    <button className="btn btn--primary" type="submit" disabled={busy}>{busy?'변경 중…':submitLabel}</button>
  </form>;
}
/** 임시 비밀번호(첫 로그인, 관리자 초기화 직후): 새 비밀번호를 정하기 전에는 다른 화면을 쓸 수 없음 */
export function ForcedPasswordChange({session,onDone,onLogout}:{session:Session;onDone:(me:Session)=>void;onLogout:()=>void}){
  return <main className="center-screen password-screen"><section className="password-card" aria-labelledby="password-title">
    <div className="password-icon"><KeyRound size={26}/></div>
    <h1 id="password-title">새 비밀번호를 정해 주세요</h1>
    <p>{session.employee_name}님은 임시 비밀번호로 로그인했습니다. 새 비밀번호로 바꾼 뒤 HRIS를 사용할 수 있습니다.</p>
    <Fields username={session.username} onDone={onDone} submitLabel="비밀번호 변경하고 시작"/>
    <button type="button" className="link-btn password-logout" onClick={onLogout}><LogOut size={15}/> 로그아웃</button>
  </section></main>;
}
/** 스스로 바꾸기 (사이드바 열쇠 버튼) */
export function PasswordChangeModal({session,onDone,onClose}:{session:Session;onDone:(me:Session)=>void;onClose:()=>void}){
  return <Modal title="비밀번호 변경" onClose={onClose}><Fields username={session.username} onDone={onDone} submitLabel="변경"/></Modal>;
}
