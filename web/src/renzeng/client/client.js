(function(root){
'use strict';
function createClient({game,data,dom,createViews,effects}){
 const {$,el,button,asset}=dom,b=(text,action,value)=>button(text,action,'',value),ui={clueRoom:false,clueTab:'clues',effects};
 // perform is hoisted above this call, so the sources module can be handed the same
// dispatcher. Without it the password field's Enter handler had nothing to call.
 const views=createViews({game,data,dom,ui,dispatch:perform}),modal=$('#rz-modal');let booting=true,restoring=false,navigating=false,modalName='',previousFocus=null,toastTimer,composing=false,frame=0,sequence=0,restoreFrame=0,restoreTicket=0;
 function message(text){clearTimeout(toastTimer);$('#rz-message').textContent=text;toastTimer=setTimeout(()=>{$('#rz-message').textContent='';},3200);}
 ui.notify=message;
 function handleEvent(e){if(booting||e.type==='connection'&&game.state.route.type!=='conversation')return;if(!navigating){if(e.type!=='notes')views.render();}if(e.type==='recorded')message('已计入调查档案');if(e.type==='restored')message('回忆逐渐涌现，部分数据恢复了');}
 function focusToken(){const node=document.activeElement;return node?.dataset.action?node.dataset.action+'|'+(node.dataset.value||''):'';}
 function rememberScroll(){if(game.state.began&&!restoring&&!ui.clueRoom){game.setScroll(game.routeKey(),window.scrollY,focusToken());for(const name of ['social-article','comments-scroll','social-detail','social-detail-scroll']){const panel=document.querySelector('.'+name);if(panel)game.setScroll(game.routeKey()+'|panel:'+name,panel.scrollTop);}}}
 function historyState(){return {renzeng:true,seq:sequence,view:game.snapshot(),archive:ui.clueRoom,tab:ui.clueTab};}
 function sync(push=false){try{if(push){sequence++;history.pushState(historyState(),'');}else history.replaceState(historyState(),'');}catch(_){} }
 function restoreScroll(y){
  cancelAnimationFrame(restoreFrame);const ticket=++restoreTicket;restoring=true;
  const key=game.routeKey(),offset=y??game.state.scroll[key]??game.state.scroll[game.state.currentDocument]??0;
  restoreFrame=requestAnimationFrame(()=>{
   if(ticket!==restoreTicket)return;
   const token=game.state.focus[key],target=token?[...document.querySelectorAll('[data-action]')].find(n=>n.dataset.action+'|'+(n.dataset.value||'')===token):null;
   // A late navigation frame must not steal focus after the player has begun typing.
   const typing=document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');
   if(!typing){(target||document.querySelector('.social-close')||$('#rz-reader')).focus({preventScroll:true});window.scrollTo(0,offset);}
   for(const name of ['social-article','comments-scroll','social-detail','social-detail-scroll']){const panel=document.querySelector('.'+name);if(panel)panel.scrollTop=game.state.scroll[key+'|panel:'+name]||0;}
   restoreFrame=requestAnimationFrame(()=>{if(ticket===restoreTicket){restoring=false;restoreFrame=0;}});
  });
 }
 function navigate(fn){rememberScroll();const before=game.routeKey();let result;navigating=true;try{result=fn();}finally{navigating=false;}if(result===false){message('此页面尚未留存或尚未解锁。');return;}ui.clueRoom=false;views.render();if(before!==game.routeKey())sync(true);restoreScroll();}
 function closeModal(){if(!modal.open)return;modal.close();modal.classList.remove('source-zoom-dialog');modalName='';if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
 function openModal(name){if(!modal.open)previousFocus=document.activeElement;modalName=name;const body=$('#rz-modal-body');body.replaceChildren();const titles={menu:'电脑菜单',settings:'阅读设置','forum-rules':'阅读手册',restart:'开始新的调查？',};$('#rz-modal-title').textContent=titles[name];
 if(name==='menu'){const list=el('nav',null,'menu-list');for(const [label,act]of [['调查档案','clue-room'],['阅读手册','forum-rules'],['重新开始','restart'],['字号与动态效果','settings']])list.append(b(label,act));body.append(list);}
 if(name==='settings'){const label=el('label','正文字号 '),select=el('select');select.id='rz-font';for(const size of [16,18,20,22]){const o=el('option',size+'px');o.value=size;o.selected=game.state.settings.fontSize===size;select.append(o);}label.append(select);const reduce=el('label'),input=el('input');input.id='rz-reduced';input.type='checkbox';input.checked=effects?.reduced()??game.state.settings.reduced;reduce.append(input,document.createTextNode(' 减少动态效果'));const sound=el('label'),soundInput=el('input');soundInput.type='checkbox';soundInput.id='rz-sound';soundInput.checked=game.state.settings.sound;sound.append(soundInput,document.createTextNode(' 点击音（默认关闭）'));body.append(label,reduce,b('动态效果跟随系统','motion-system'),sound);}
 if(name==='forum-rules'){const rules=data.forumRules.filter(r=>r.id==='collect'?true:r.id==='search'?game.state.searched:game.state.accountSeen);if(!rules.length)body.append(el('p','打开网页或文件即可阅读。'));for(const r of rules)body.append(el('h3',r.title),el('p',r.body));}
 if(name==='restart')body.append(el('p','重新开始会清空本次阅读进度与笔记，字号设置保留。'),b('确认重新开始','confirm-restart'));
 if(name==='grid-reset'){$('#rz-modal-title').textContent='清空自己的落子？';body.append(el('p','给定棋子会保留，清空后可以撤销。'),b('取消','close'),b('确认清空','confirm-grid-reset'));}if(!modal.open)modal.showModal();
 }
 function openArchive(push=true){rememberScroll();ui.returnScroll=window.scrollY;ui.returnFocus=focusToken();ui.clueRoom=true;ui.clueTab='clues';views.render();if(push)sync(true);window.scrollTo(0,0);$('#rz-clue-detail').focus({preventScroll:true});}
 function leaveArchive(push=true){ui.clueRoom=false;views.render();if(push)sync(true);restoreScroll(ui.returnScroll);}
 function perform(action,value){const gridAction=action.startsWith('grid-'),scroll=window.scrollY;switch(action){
 case 'motion-system':game.setSettings({motionMode:'system',reduced:false});openModal('settings');break;
 case 'start':navigate(()=>game.start());break;
 case 'missing':message('部分数据暂时缺失');break;
 case 'search-open':navigate(()=>game.openSearchResult(value));break;
 case 'account':navigate(()=>game.accountHome(value||'forum'));break;
 case 'visit-history':document.querySelector('.sites-menu').open=false;navigate(()=>game.visitHistory(value));break;
 case 'quiz-answer':navigate(()=>game.answerQuiz(Number(value)));window.scrollTo(0,0);break;
 case 'open':navigate(()=>game.openDocument(value));break;
 case 'site':document.querySelector('.sites-menu').open=false;navigate(()=>game.goSite(value));break;
 case 'forward':history.forward();break;
 case 'board-tab':navigate(()=>game.browse(...value.split('|'),1));break;
 case 'clinic-tab':{const [tab,page]=value.split('|');navigate(()=>game.catalog(tab,Number(page)||1));break;}
 case 'lost-post':navigate(()=>game.openLostPost(value));break;
 case 'lost-toast':message('相关数据已经完全丢失');break;
 case 'board-page':{const r=game.state.route;navigate(()=>game.browse(r.section,r.tab,Number(value)));break;}
 case 'section':navigate(()=>game.browse(value));break;
 case 'forum-home':navigate(()=>game.forumHome());break;
 case 'directory':navigate(()=>game.returnToDirectory());break;
 case 'clue-room':closeModal();if(game.state.began)openArchive();break;
 case 'leave-clue-room':leaveArchive();break;
 case 'clue-tab':ui.clueTab=value;views.renderClues();sync();break;
 case 'select-clue':ui.sourceClue=null;ui.selectedClue=value;views.renderClues();$('#rz-clue-detail').focus({preventScroll:true});break;
 case 'source':ui.sourceClue=value;views.renderClueDetail(value);$('#rz-source-excerpt').classList.add('highlight');$('#rz-source-excerpt').scrollIntoView({block:'center'});break;
 case 'visit-source':navigate(()=>game.visitSource(value));break;
 case 'reconnect':void game.checkConnection();break;
 case 'local-ending':navigate(()=>game.useLocalEnding());break;
 case 'resume-conversation':navigate(()=>game.resumeConversation());break;
 case 'summarize':void game.summarizeEnding();break;
 case 'restart-conversation':game.restartConversation();break;
 case 'conversation':navigate(()=>game.openConversation());break;
 case 'chat':navigate(()=>game.startChat());break;
 case 'read-ending':navigate(()=>game.finish());break;
 case 'finish':navigate(()=>game.beginEnding());break;
 case 'doudou-login':{const field=$('#rz-doudou-password'),username=$('#rz-doudou-username')?.value||'',result=game.loginDoudouWithPassword(field?field.value:'',username);game.state.puzzleMessage=result.message;views.render();if(!result.ok){$('#rz-doudou-username').value=username;$('#rz-doudou-password').focus();}message(result.message);sync();break;}
 case 'recovery-open':game.state.puzzleRecoveryOpen=true;game.state.puzzleMessage='';views.render();window.scrollTo(0,0);break;
 case 'recovery-close':game.state.puzzleRecoveryOpen=false;game.state.puzzleMessage='';views.render();$('#rz-doudou-username')?.focus();window.scrollTo(0,0);break;
 case 'doudou-tab':game.state.doudouTab=value;game.state.doudouQuery='';navigate(()=>game.goSite('diaries'));break;
 case 'grid-cell':case 'grid-clear':{const [row,col]=value.split('|').map(Number);if(action==='grid-cell')game.togglePuzzle(row,col);else game.clearPuzzleStone(row,col);game.state.puzzleMessage='';views.render();document.querySelector('[data-row="'+row+'"][data-col="'+col+'"]')?.focus({preventScroll:true});break;}
 case 'grid-tool':game.setPuzzleTool(value);views.render();document.querySelector('[data-action=grid-tool][data-value='+value+']')?.focus({preventScroll:true});break;
 case 'grid-undo':game.undoPuzzle();views.render();break;
 case 'grid-redo':game.redoPuzzle();views.render();break;
 case 'grid-check':{const r=game.puzzleCheck();game.state.puzzleMessage=r.ok?'密保验证通过。':r.message;views.render();break;}
 case 'grid-reset':openModal('grid-reset');break;
 case 'confirm-grid-reset':closeModal();game.resetPuzzle();game.state.puzzleMessage='已经清空你自己落的子。';views.render();break;
 case 'grid-answer':game.state.puzzleAnswerOpen=true;views.render();$('#rz-doudou-password')?.focus({preventScroll:true});break;
 case 'grid-board':game.state.puzzleAnswerOpen=false;views.render();break;
 case 'zoom':{const [id,extra]=value.split('|'),d=game.archivedDocument(id),path=d&&root.RenZengSources.imagePath(extra==='extra'?d.extraImage:d.image);if(!path)break;openModal('image');modal.classList.add('source-zoom-dialog');$('#rz-modal-title').textContent=d.title;const image=el('img');image.src=asset(root.RenZengImageAssets?.[path]?.full||path);image.alt=d.imageCaption||d.title;image.className='source-zoom';$('#rz-modal-body').append(image);break;}
 case 'bonus':navigate(()=>game.openBonus());break;
 case 'back':if(modal.open)closeModal();else if(sequence>0)history.back();else if(ui.clueRoom)leaveArchive(false);else navigate(()=>game.goBack());break;
 case 'menu':case 'settings':case 'forum-rules':case 'restart':openModal(action);break;
 case 'close':closeModal();break;
 case 'confirm-restart':closeModal();ui.clueRoom=false;ui.selectedClue=null;ui.sourceClue=null;game.restart();views.render();sequence=0;sync();restoreScroll(0);break;
 }if(gridAction)window.scrollTo(0,scroll);game.onPersist?.();}
 document.addEventListener('click',e=>{if(e.target.closest('.inert'))return;const n=e.target.closest('[data-action]');if(e.target.closest('button')&&!e.target.closest('button').disabled)effects?.click();if(n&&!n.disabled)perform(n.dataset.action,n.dataset.value);});
 document.addEventListener('keydown',e=>{const cell=e.target.closest('.grid-cell');if(!cell||modal.open)return;const row=Number(cell.dataset.row),col=Number(cell.dataset.col);if(e.ctrlKey&&(e.key.toLowerCase()==='z'||e.key.toLowerCase()==='y')){e.preventDefault();perform(e.shiftKey||e.key.toLowerCase()==='y'?'grid-redo':'grid-undo');document.querySelector('[data-row="'+row+'"][data-col="'+col+'"]')?.focus({preventScroll:true});return;}const delta={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]}[e.key];if(delta){e.preventDefault();let r=row+delta[0],c=col+delta[1];while(r>=0&&r<8&&c>=0&&c<8){const target=document.querySelector('[data-row="'+r+'"][data-col="'+c+'"]');if(target&&!target.disabled){target.focus({preventScroll:true});break;}r+=delta[0];c+=delta[1];}return;}const v={b:1,w:0,Delete:-1,Backspace:-1}[e.key.length===1?e.key.toLowerCase():e.key];if(v!==undefined){e.preventDefault();const y=window.scrollY;game.applyPuzzleCell(row,col,v);views.render();document.querySelector('[data-row="'+row+'"][data-col="'+col+'"]')?.focus({preventScroll:true});window.scrollTo(0,y);}});
 document.addEventListener('keydown',e=>{const sheet=document.querySelector('.social-detail');if(e.key!=='Tab'||!sheet||modal.open)return;const nodes=[...sheet.querySelectorAll('button:not(:disabled),input,textarea,[tabindex="0"]')],first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||!sheet.contains(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||!sheet.contains(document.activeElement))){e.preventDefault();first?.focus();}});
 document.addEventListener('scroll',e=>{if(e.target.matches?.('.social-article,.comments-scroll,.social-detail,.social-detail-scroll')){rememberScroll();}},{capture:true,passive:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.open&&game.state.currentDocument==='help'){e.preventDefault();perform('back');}});
 document.addEventListener('compositionstart',()=>{composing=true;});document.addEventListener('compositionend',()=>{composing=false;});
 document.addEventListener('submit',async e=>{if(!['rz-doudou-search-form','rz-search-form','rz-account-form','rz-doudou-form','rz-ending-form','rz-chat-form'].includes(e.target.id))return;e.preventDefault();if(composing)return;if(e.target.id==='rz-doudou-search-form'){game.state.doudouQuery=$('#rz-doudou-search').value.trim();navigate(()=>game.goSite('diaries'));return;}if(e.target.id==='rz-account-form'){const result=game.loginAccount(e.target.dataset.site,$('#rz-username').value,$('#rz-password').value);message(result.message);if(result.ok)navigate(()=>game.accountHome(e.target.dataset.site));return;}if(e.target.id==='rz-doudou-form'){perform('doudou-login');return;}if(e.target.id==='rz-chat-form'){await game.sendChat($('#rz-chat-answer').value);sync();return;}if(e.target.id==='rz-ending-form'){await game.answerEnding($('#rz-ending-answer').value);sync(true);restoreScroll();return;}if(e.target.id==='rz-search-form'){const query=$('#rz-search').value;navigate(()=>game.search(query));}});
 document.addEventListener('input',e=>{if(['rz-ending-answer','rz-chat-answer'].includes(e.target.id))game.setConversationDraft(e.target.value);if(e.target.id==='rz-notes')game.setNotes(e.target.value);});
 document.addEventListener('change',e=>{if(e.target.id==='rz-font')game.setSettings({fontSize:Number(e.target.value)});if(e.target.id==='rz-reduced')game.setSettings({reduced:e.target.checked,motionMode:e.target.checked?'reduce':'full'});if(e.target.id==='rz-sound')game.setSettings({sound:e.target.checked});});
 modal.addEventListener('cancel',e=>{e.preventDefault();closeModal();});
 window.addEventListener('popstate',e=>{if(!e.state?.renzeng)return;rememberScroll();closeModal();sequence=e.state.seq||0;if(game.restoreView(e.state.view)){ui.clueRoom=!!e.state.archive;ui.clueTab=e.state.tab||'clues';views.render();if(ui.clueRoom)window.scrollTo(0,0);else restoreScroll();}});
 window.addEventListener('scroll',()=>{if(frame||restoring||ui.clueRoom||modal.open)return;frame=requestAnimationFrame(()=>{frame=0;rememberScroll();});},{passive:true});
 window.addEventListener('pagehide',()=>{rememberScroll();});document.addEventListener('visibilitychange',()=>{if(document.hidden){rememberScroll();}});
 const motionQuery=window.matchMedia?.('(prefers-reduced-motion: reduce)');motionQuery?.addEventListener('change',()=>{if(game.state.settings.motionMode==='system')views.render();});
 function start(){history.scrollRestoration='manual';booting=false;game.start();views.render();sync();restoreScroll();}
 function androidBack(){
  rememberScroll();
  if(modal.open){closeModal();return true;}
  if(document.querySelector('.sites-menu')?.open){document.querySelector('.sites-menu').open=false;return true;}
  if(ui.clueRoom){leaveArchive(false);return true;}
  if(game.state.puzzleRecoveryOpen){perform(game.state.puzzleAnswerOpen?'grid-board':'recovery-close');return true;}
  if(game.state.history.length){navigate(()=>game.goBack());sync();return true;}
  return false;
 }
 return {start,handleEvent,androidBack,rememberScroll};
}
root.RenZengClient={createClient};
})(globalThis);




