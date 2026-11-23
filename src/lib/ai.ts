import type{AiResponse}from './types';
import{ApiError,errorMessage}from './api';

/** HR AI 응답 → 사람이 읽을 문구 (전체 화면 HrAi와 사이드바 미니 AI가 같이 씀) */
export const AI_STATUS:Record<AiResponse['status'],{label:string;tone:string}>={
  ANSWERED:{label:'답변 완료',tone:'status--success'},
  NO_RESULT:{label:'결과 없음',tone:''},
  NEEDS_CLARIFICATION:{label:'추가 정보 필요',tone:'status--soft'},
  FAILED:{label:'답변 실패',tone:'status--danger'},
};
const FAILURE:Record<string,string>={
  SQL_GENERATION_FAILED:'이 질문은 HR AI가 조회할 수 없습니다.',
  SQL_REJECTED:'생성된 SQL이 서버 보안 규칙(허용된 테이블·열·함수)에 맞지 않아 실행하지 않았습니다. 질문을 조금 바꿔 다시 물어보세요.',
  SQL_EXECUTION_FAILED:'조회를 실행하지 못했습니다. 잠시 후 다시 시도해 주세요.',
};
const HTTP_FAILURE:Record<string,string>={
  AI_ADMIN_ONLY:'HR AI를 사용할 권한이 없습니다.',
  AI_TIMEOUT:'AI 응답이 늦어 중단했습니다. 질문을 짧게 바꿔 다시 시도해 주세요.',
  AI_UPSTREAM_ERROR:'AI 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
};
/** 상태 배지: 범위 밖 질문을 AI가 거절한 건 실패가 아니라 정상 동작 → 빨간 '답변 실패' 대신 '조회 범위 밖' */
export function aiStatus(r:AiResponse){
  if(r.status==='FAILED'&&r.error_code==='SQL_GENERATION_FAILED'&&r.answer)return {label:'조회 범위 밖',tone:'status--soft',refused:true};
  return {...(AI_STATUS[r.status]??{label:r.status,tone:''}),refused:false};
}
export function aiMessage(r:AiResponse){
  if(r.answer)return r.answer;
  if(r.status==='NO_RESULT')return '조건에 맞는 데이터가 없습니다.';
  return (r.error_code&&FAILURE[r.error_code])||'답변을 생성하지 못했습니다.';
}
/** 사이드바처럼 표를 못 보여주는 곳: 값 하나면 바로 붙이고, 여러 행이면 건수만 */
export function aiShortMessage(r:AiResponse){
  const base=aiMessage(r);
  if(r.status!=='ANSWERED')return base;
  if(r.rows.length===1&&r.columns.length===1)return `${base} → ${r.columns[0]}: ${r.rows[0][0]??'—'}`;
  return `${base} (${r.row_count}건 · 전체 화면에서 표로 확인)`;
}
export function aiErrorMessage(e:unknown){
  return e instanceof ApiError&&HTTP_FAILURE[e.code]?HTTP_FAILURE[e.code]:errorMessage(e);
}
