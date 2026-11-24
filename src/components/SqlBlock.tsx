import type{ReactNode}from 'react';

const KEYWORDS=new Set(('SELECT FROM WHERE AND OR NOT IN IS NULL AS ON JOIN LEFT RIGHT INNER OUTER CROSS GROUP BY ORDER HAVING LIMIT '+
  'DISTINCT ASC DESC CASE WHEN THEN ELSE END BETWEEN LIKE EXISTS UNION ALL INTERVAL WITH XOR').split(' '));
const FUNCTIONS=new Set('COUNT SUM AVG MIN MAX YEAR MONTH DAY DATE DATEDIFF TIMESTAMPDIFF CURRENT_DATE CURDATE COALESCE IFNULL ROUND CONCAT LOWER UPPER TRIM'.split(' '));
const TOKEN=/('(?:[^'\\]|\\.)*'|`[^`]*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g;
/** 실행된 SQL을 읽기 쉽게: 서버가 절마다 줄바꿈한 SQL(display_sql)에 키워드, 함수, 문자열, 숫자, 별칭 색만 입힘 (HTML 주입 없이 React 요소로) */
export function SqlBlock({sql}:{sql:string}){
  const lines=sql.split('\n');
  return <pre className="sql-block" aria-label="SQL">{lines.map((line,i)=><span key={i} className="sql-line">{highlight(line)}{i<lines.length-1?'\n':''}</span>)}</pre>;
}
function highlight(line:string){
  const out:ReactNode[]=[];let last=0;let m:RegExpExecArray|null;TOKEN.lastIndex=0;
  while((m=TOKEN.exec(line))){
    if(m.index>last)out.push(line.slice(last,m.index));
    const t=m[0],u=t.toUpperCase();
    const cls=t.startsWith("'")?'sql-str':t.startsWith('`')?'sql-alias':/^\d/.test(t)?'sql-num':KEYWORDS.has(u)?'sql-kw':FUNCTIONS.has(u)?'sql-fn':'';
    out.push(cls?<span key={m.index} className={cls}>{t}</span>:t);last=m.index+t.length;
  }
  if(last<line.length)out.push(line.slice(last));
  return out;
}
