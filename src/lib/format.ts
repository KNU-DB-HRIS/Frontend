export const money=(n:number|null|undefined)=>n==null?'—':new Intl.NumberFormat('ko-KR').format(n)+'원';
export const count=(n:number|null|undefined)=>n==null?'—':new Intl.NumberFormat('ko-KR').format(n)+'명';
export const pct=(n:number|null|undefined)=>n==null?'—':(n*100).toFixed(1)+'%';
export const date=(v:string|null|undefined)=>v?String(v).slice(0,10).replace(/-/g,'.'): '—';
export const stateName=(s:string|null|undefined)=>({ACTIVE:'재직',ON_LEAVE:'휴직',TERMINATED:'퇴사',IN_PROGRESS:'진행 중',APPROVED:'승인',REJECTED:'반려',DRAFT:'임시 저장',PLANNED:'예정',CLOSED:'종료',PENDING:'대기',COMPLETED:'완료',WAITING:'대기 중',NOT_STARTED:'미시작',GOAL:'목표 설정',SELF:'자기 평가',PEER:'동료 평가',LEADER:'리더 평가',FULL_TIME:'정규직',CONTRACT:'계약직',INTERN:'인턴'} as Record<string,string>)[s||'']||s||'—';
/** 인사 발령 종류 코드 → 화면 이름 */
export const ACTION_NAMES:Record<string,string>={HIRE:'입사',TRANSFER:'부서 이동',PROMOTION:'승진',JOB_CHANGE:'직무 변경',TITLE_CHANGE:'직책 변경',REASSIGNMENT:'복합 발령',TERMINATION:'퇴사'};
export const actionName=(code:string|null|undefined)=>code?ACTION_NAMES[code]||code:'—';
export const initials=(s:string)=>s.trim().slice(0,2)||'직원';
