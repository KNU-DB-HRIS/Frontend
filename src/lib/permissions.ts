import type {Session} from './types';
/** 서버 app/permissions.py의 동작 권한. 화면은 메뉴(menus)와 이 권한으로 버튼을 보이거나 숨김. 실제 차단은 서버(403) */
export type Permission='DASHBOARD_COMPANY'|'EMPLOYEE_READ'|'EMPLOYEE_CREATE'|'EMPLOYEE_UPDATE'|'EMPLOYEE_ASSIGN'|'EMPLOYEE_TERMINATE'|'EMPLOYEE_DELETE'|'ROLE_MANAGE'|'PASSWORD_RESET'|'SALARY_READ'|'SALARY_UPDATE'|'ORG_READ'|'ORG_MANAGE'|'COMPANY_MANAGE'|'EVALUATION_READ'|'APPROVAL_READ_ALL'|'DOCUMENT_ISSUE_OTHERS'|'EVENT_MANAGE'|'AI_QUERY';
export const can=(s:Pick<Session,'permissions'>|null|undefined,p:Permission)=>!!s?.permissions?.includes(p);
export const ROLE_OPTIONS:ReadonlyArray<readonly [string,string]>=[['HR_ADMIN','HR 관리자'],['HR_MANAGER','인사 담당자'],['HR_STAFF','인사 사원'],['EMPLOYEE','사원']];
