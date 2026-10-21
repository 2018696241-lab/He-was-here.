(() => {
'use strict';
let client,store;
const game = new RenZengCore.Investigation(RenZengData, event => client?.handleEvent(event), RenZengEndingService.createService(RenZengEndingConfig));
const errors = RenZengCore.validateContent(RenZengData);
if (errors.length) throw new Error(errors.join('; '));
function saveProblem(message){
 let panel=document.getElementById('save-problem');
 if(!panel){panel=document.createElement('section');panel.id='save-problem';panel.className='save-problem';panel.setAttribute('role','alert');document.body.prepend(panel);}
 panel.replaceChildren();
 const text=document.createElement('p');text.textContent=message;panel.append(text);
 for(const [label,action] of [
  ['恢复上次备份',()=>{if(store?.recover())location.reload();}],
  ['清除损坏存档并重开',()=>{if(confirm('确认清除本机存档？此操作无法撤销。')&&store?.clear())location.reload();}],
  ['暂时游玩（不保存）',()=>panel.remove()]
 ]){const button=document.createElement('button');button.textContent=label;button.onclick=action;panel.append(button);}
}
if(RenZengEndingConfig.autosave){
 try{store=RenZengSave.create(game,localStorage,saveProblem);store.restore();game.onPersist=()=>store.save();game.beforeRestart=()=>store.clear();}
 catch(error){saveProblem('本机存储不可用，当前进度不会保存。');}
}
client = RenZengClient.createClient({game, data:RenZengData, dom:ArchiveDom.createDom(document), createViews:RenZengViews.createViews, effects:RenZengEffects.createEffects(()=>game.state.settings)});
globalThis.RenZengPlatform={
 back:()=>client.androidBack(),
 save:()=>{client.rememberScroll();return store?.save()??true;}
};
window.addEventListener('pagehide',()=>RenZengPlatform.save());
document.addEventListener('visibilitychange',()=>{if(document.hidden)RenZengPlatform.save();});
client.start();
if(game.options.mode==='gateway')void game.checkConnection();
})();
