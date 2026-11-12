import {useCallback,useEffect,useState} from 'react';
import {errorMessage} from './api';
/** deps가 바뀌면 다시 불러옴. 응답은 그 응답을 요청한 deps(+revision)에만 보여 줌.
 *  전에는 deps가 바뀐 직후 첫 렌더에서 이전 deps의 데이터를 새 조건으로 그렸음
 *  (예: 조직관리 탭 전환 시 부서 데이터를 직급 화면으로 그려 key 중복 경고·빈 항목이 깜빡임) */
export function useRemote<T>(loader:()=>Promise<T>, deps:readonly unknown[]){
  const [revision,setRevision]=useState(0);
  const key=JSON.stringify([revision,...deps]);
  const [state,setState]=useState<{key:string|null;data:T|null;error:string}>({key:null,data:null,error:''});
  const refresh=useCallback(()=>setRevision(v=>v+1),[]);
  useEffect(()=>{let cancelled=false;loader().then(v=>{if(!cancelled)setState({key,data:v,error:''});}).catch(e=>{if(!cancelled)setState({key,data:null,error:errorMessage(e)});});return()=>{cancelled=true;};},[key]);
  const current=state.key===key;
  return {data:current?state.data:null,error:current?state.error:'',loading:!current,refresh};
}
export function useDebounced(value:string,delay=320){const [debounced,setDebounced]=useState(value);useEffect(()=>{const id=window.setTimeout(()=>setDebounced(value),delay);return()=>window.clearTimeout(id);},[value,delay]);return debounced;}
