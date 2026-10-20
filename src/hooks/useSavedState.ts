import { useCallback, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

const PREFIX='nihongo-mate-view-v1:'
export function clearSavedViews(){
  try{Object.keys(localStorage).filter(key=>key.startsWith(PREFIX)).forEach(key=>localStorage.removeItem(key))}catch{}
}
export function useSavedState<T>(name:string,initial:T,validate?:(raw:unknown)=>raw is T):[T,Dispatch<SetStateAction<T>>]{
  const key=PREFIX+name
  const [value,setValue]=useState<T>(()=>{
    try{const text=localStorage.getItem(key);if(!text)return initial;const saved:unknown=JSON.parse(text);return validate?!validate(saved)?initial:saved:saved!==null&&typeof saved===typeof initial?saved as T:initial}catch{return initial}
  })
  const current=useRef(value);current.current=value
  const update=useCallback<Dispatch<SetStateAction<T>>>(action=>{
    const next=typeof action==='function'?(action as (previous:T)=>T)(current.current):action
    current.current=next
    try{localStorage.setItem(key,JSON.stringify(next))}catch{}
    setValue(next)
  },[key])
  return [value,update]
}
