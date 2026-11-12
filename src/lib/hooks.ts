import {useCallback,useEffect,useState} from 'react';
import {errorMessage} from './api';
export function useRemote<T>(loader:()=>Promise<T>, deps:readonly unknown[]){
  const [data,setData]=useState<T|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [revision,setRevision]=useState(0);
  const refresh=useCallback(()=>setRevision(v=>v+1),[]);
  useEffect(()=>{let cancelled=false;setLoading(true);setError('');setData(null);loader().then(v=>{if(!cancelled)setData(v);}).catch(e=>{if(!cancelled)setError(errorMessage(e));}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[revision,...deps]);
  return {data,error,loading,refresh};
}
export function useDebounced(value:string,delay=320){const [debounced,setDebounced]=useState(value);useEffect(()=>{const id=window.setTimeout(()=>setDebounced(value),delay);return()=>window.clearTimeout(id);},[value,delay]);return debounced;}
