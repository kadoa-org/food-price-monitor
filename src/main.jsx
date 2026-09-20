import React,{useEffect,useState} from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import App,{Loading} from './App';
import {BASE,pageKey} from './model.mjs';
import './styles.css';
const root=document.getElementById('root');const key=pageKey(window.location.pathname);
const embedded=document.getElementById('page-data');const initial=embedded?JSON.parse(embedded.textContent):null;
function Client(){const [state,setState]=useState({page:null,error:false});useEffect(()=>{if(!key){setState({page:null,error:true});return;}const controller=new AbortController();fetch(`${BASE}/data/${key}.json`,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).then(page=>setState({page,error:false})).catch(e=>{if(e.name!=='AbortError')setState({page:null,error:true});});return()=>controller.abort();},[]);return state.page?<App page={state.page}/>:<Loading error={state.error}/>;}
if(initial?.key===key&&root.hasChildNodes())hydrateRoot(root,<App page={initial}/>);else createRoot(root).render(<Client/>);
