(function(root){'use strict';
function createService(config={}){
 const mode=config.mode||'local',base=String(config.endpoint||'').replace(/\/$/,''),health=String(config.healthEndpoint||'');let ready=false,checking=null,session=null,pending=null;
 async function request(url,payload,timeout=60000){const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeout);try{const r=await fetch(url,{method:payload?'POST':'GET',cache:'no-store',...(payload?{headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}:{}),signal:abort.signal});const data=await r.json();if(!r.ok){const e=Error(data.error||'unavailable');e.code=data.error;throw e;}return data;}finally{clearTimeout(timer);}}
 const id=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join('');
 async function send(kind,answer='',context=null){
  if(mode!=='gateway'||!ready)throw Error('unavailable');
  if(!session){const r=await request(base+'/sessions',{});session=r.sessionId;}
  // The context is part of what the reply is based on, so reusing a request id under a
  // different context would return a cached answer the player never asked for.
  const ctxKey=context?JSON.stringify(context):'';
  if(pending&&(pending.kind!==kind||pending.answer!==answer||pending.ctxKey!==ctxKey)){const e=Error('request_conflict');e.code='request_conflict';throw e;}
  pending=pending||{kind,answer,ctxKey,requestId:id()};
  try{const r=await request(base+'/'+kind,{sessionId:session,requestId:pending.requestId,answer,...(context?{context}:{})},config.timeoutMs||60000);pending=null;return r;}catch(e){ready=false;throw e;}
 }
 return {mode,get aiEnabled(){return mode==='gateway'&&ready;},reset(){session=null;pending=null;},
 async check(){if(mode!=='gateway')return {status:'local',ready:false};if(!base||!health)return {status:'unconfigured',ready:false};if(checking)return checking;checking=(async()=>{try{const r=await request(health,null,3000);ready=r.service==='renzeng-brother-gateway'&&r.protocol===2&&r.ready===true&&['question','summary','chat'].every(k=>r.capabilities?.[k]);return {status:ready?'ready':'unavailable',ready};}catch(_){ready=false;return {status:'unavailable',ready:false};}finally{checking=null;}})();return checking;},
 judge:p=>send('answer',p.answer,p.context),summary:context=>send('summary','',context),chat:p=>send('chat',p.message,p.context)};
}
root.RenZengEndingService={createService};if(typeof module!=='undefined')module.exports=root.RenZengEndingService;
})(globalThis);
