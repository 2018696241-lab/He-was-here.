(function(root){
'use strict';
const extensions={'street-stall':'jpg','clinic-new':'jpg','plasma-new':'jpg',newspaper:'png',meadow:'png','blood-bag':'png',sunrise:'png',apparition:'png',shore:'png',avatars:'png','deity-light':'jpg','deity-dark':'jpg','relic-sale':'png','clinic-front':'png',building:'png',medicine:'png'};
function imagePath(id){return id==='blank-photo'?'assets/taptap/ui/blank-photo.svg':extensions[id]?'assets/taptap/'+id+'.'+extensions[id]:null;}
function createSources({game,data,dom,dispatch}){
 const {el,button,asset}=dom,b=(t,a,v)=>button(t,a,'',v);
 const picture=(src,alt,cls='')=>{const n=el('img');const info=root.RenZengImageAssets?.[src];if(info){n.width=info.width;n.height=info.height;}n.loading='lazy';n.decoding='async';n.src=asset(src);n.alt=alt;n.className=cls;return n;};
 function figure(d){
  const path=imagePath(d.image);if(!path)return null;
  const f=el('figure',null,'source-figure'),zoom=b('','zoom',d.id);
  zoom.setAttribute('aria-label','放大查看：'+d.title);zoom.append(picture(path,d.imageCaption||d.title));f.append(zoom);
  if(d.imageCaption)f.append(el('figcaption',d.imageCaption));
  if(d.extraImage){const extra=b('','zoom',d.id+'|extra');extra.setAttribute('aria-label','放大查看：仙枝怀慈菩萨画像');extra.className='extra-figure';extra.append(picture(imagePath(d.extraImage),'仙枝怀慈菩萨画像'));f.append(extra);}
  return f;
 }
 function text(box,d){const f=figure(d);if(f)box.append(f);for(const p of d.paragraphs)box.append(el('p',p.join('')));}
 function frame(box,site){
  box.className='source-site '+site;
  const head=el('header',null,'source-header');
  if(site==='ritual'){
   const logo=b('','site','ritual');logo.append(picture('assets/taptap/ui/clinic-wordmark.png','忠义堂'));head.append(logo,el('span','谨奉医道 · 接诊有缘'));
   head.append(b(game.state.patientLoggedIn?'患者账户':'患者登录','account','ritual'));
  }else{head.append(b('DOUDOU贴吧','site','diaries'));const search=el('form');search.id='rz-doudou-search-form';const input=el('input');input.id='rz-doudou-search';input.placeholder='搜索留存文章';input.setAttribute('aria-label','搜索留存文章');input.value=game.state.doudouQuery||'';const submit=el('button','搜索');submit.type='submit';search.append(input,submit);head.append(search,b('小船长','doudou-tab','mine'));}
  box.append(head);
  if(site==='ritual'){
   const nav=el('nav',null,'clinic-nav');
   for(const [label,tab] of [['全部','all'],['中成药','products'],['本所人员构成','staff']])nav.append(b(label,'clinic-tab',tab+'|1'));
   nav.append(b('患者账户','account','ritual'));box.append(nav);
  }
  const main=el('section',null,'source-main');
  if(site==='diaries'&&game.state.doudouLoggedIn){
   const layout=el('div',null,'doudou-layout'),aside=el('aside',null,'doudou-nav');
   aside.append(b('⌂ 首页','doudou-tab','home'),b('♙ 我的','doudou-tab','mine'),el('h3','热门区域'),el('p','美图吧'),el('p','文字吧'),el('p','奇异果音频吧'),el('p','国际赛事吧'));if(game.endingReady)aside.append(b('哥哥留给你的会话','conversation'));
   const ad=el('aside',null,'doudou-ad');ad.append(picture('assets/taptap/ui/doudou-ad.svg','旧站宣传图'),el('h3','把旧时光留在这里'),el('p','文字、照片，还有那些没有说完的话。'),el('small','旧站宣传栏'));layout.append(aside,main,ad);box.append(layout);
  }else box.append(main);
  return main;
 }
 function loginForm(box,site){
  box.className='account-login';box.append(el('h1',site==='forum'?'天坛论坛网':'忠义堂'),el('h2',site==='forum'?'账号登录':'患者账户登录'));
  const form=el('form');form.id='rz-account-form';form.dataset.site=site;
  for(const [id,label,type] of [['rz-username','账号昵称','text'],['rz-password','密码','password']]){
   const labelNode=el('label',label),input=el('input');input.id=id;input.name=id;input.type=type;input.placeholder=label;input.autocomplete='off';input.required=true;input.maxLength=type==='password'?32:60;labelNode.append(input);form.append(labelNode);
  }
  const submit=el('button','登录');submit.type='submit';form.append(submit);
  box.append(form,b(site==='forum'?'← 返回论坛':'← 返回忠义堂','site',site));
 }
 function account(box,site){
  const logged=site==='forum'?game.state.forumLoggedIn:game.state.patientLoggedIn;
  if(!logged){loginForm(box,site);return;}
  if(site==='ritual'){
   const main=frame(box,site);main.append(el('h1','刘江海 · 患者账户'));
   const record=el('section',null,'patient-summary');record.append(el('h2','净濯记录'),el('p','接受净濯者：刘江海'),el('p','患者反馈：不详'),b('查看完整记录与留存袋签','open','patient'));main.append(record);
   const list=el('section',null,'private-records');list.append(el('h2','留存附件'),b('返回天坛论坛','site','forum'));main.append(list);return;
  }
  box.className='forum account-home';
  const head=el('header',null,'forum-header');head.append(b('天坛论坛网','site','forum'),el('small','www.tiantanluntan.cn.com'));box.append(head);const search=el('form',null,'account-search');search.id='rz-search-form';const input=el('input');input.id='rz-search';input.placeholder='请输入关键词搜索';input.setAttribute('aria-label','搜索论坛');const submit=el('button','搜索');submit.type='submit';search.append(input,submit);box.append(search);
  const layout=el('div',null,'forum-layout'),aside=el('aside',null,'forum-sidebar'),main=el('section',null,'forum-content');
  aside.append(el('div',null,'profile-avatar'),el('h2','英雄本色'),el('p','旧账号资料'),el('p','最后登录：未完整留存'),b('← 返回论坛','site','forum'));
  const avatar=aside.querySelector('.profile-avatar');avatar.classList.add('has-portrait');avatar.style.backgroundImage='url("'+asset('assets/taptap/avatars.png')+'")';avatar.style.backgroundPosition=(590/1186*100)+'% '+(300/367*100)+'%';
  const drafts=el('section',null,'account-section');drafts.append(el('h2','草稿箱'),b('第七帖 · '+game.documents.get('novel7').title,'open','novel7'));
  const messages=el('section',null,'account-section');messages.append(el('h2','私信'),b('DOUDOU 官方 · 账户数据留存通知','open','doudou-message'));
  main.append(drafts,messages);layout.append(aside,main);box.append(layout);
 }
 function clinicHome(box){
  const main=frame(box,'ritual'),r=game.state.route,tab=r.tab||'all',page=r.page||1;
  if(tab==='records'){account(box,'ritual');return;}
  if(tab==='staff'){
   const people=[['李小雅','心外心内负责人，药品监督人'],['江铃涛','医药负责人，内科负责人'],['王义','外科负责人，系统维护人员'],['王闫河','内科负责人'],['曹医师','旧件归档']];
   for(const [name,role] of people.slice((page-1)*2,page*2)){const row=el('section',null,'staff-row');row.append(el('div',null,'staff-portrait'),el('h2',name),el('p',role));main.append(row);}
   const pager=el('nav',null,'source-pagination');for(let i=1;i<=3;i++){const n=b(String(i),'clinic-tab','staff|'+i);n.setAttribute('aria-current',String(i===page));pager.append(n);}main.append(pager);return;
  }
  if(tab==='all'){const about=el('section',null,'clinic-about');about.append(el('h2','【药店介绍】'),el('p','忠义堂｜谨奉医道，接诊有缘。'),el('p','地址：北京市慧根二期商业街'),b('医馆介绍','open','clinic-site'));main.append(about);}
  const shop=el('section',null,'clinic-shop');shop.append(el('h2','【药品选购】'));
  const card=b('','open','clinic-page');card.className='medicine-card';card.append(picture(imagePath('medicine'),'净濯大药'),el('h3','净濯大药'));shop.append(card);main.append(shop);
 }
 function puzzlePanel(){
  const spec=game.puzzleSpec(),grid=game.puzzleGrid(),n=spec.size,progress=game.puzzleProgress();
  const wrap=el('section',null,'grid-puzzle');wrap.append(el('h2','黑白填格','grid-title'),el('p','每行每列四黑四白，不许三连，行列排列互异。','grid-sub'));
  const workspace=el('div',null,'grid-workspace'),column=el('div',null,'grid-board-column'),board=el('div',null,'grid-board'),panel=el('div',null,'grid-panel');
  board.setAttribute('aria-label','黑白填格棋盘');board.append(el('span',null,'grid-corner'));for(let c=0;c<n;c++)board.append(el('span',String.fromCharCode(65+c),'grid-col-label'));board.append(el('span',null,'grid-corner'));
  for(let r=0;r<n;r++){
   board.append(el('span',String(r+1),'grid-row-label'));
   for(let c=0;c<n;c++){
    const fixed=['b','w'].includes(spec.cells[r][c]),value=grid[r][c],cell=el('button',value===1?'●':value===0?'○':'','grid-cell '+(value===1?'black':value===0?'white':'empty')+(fixed?' seed':''));
    if(game.puzzleIssues().some(issue=>issue.cells.some(([rr,cc])=>rr===r&&cc===c)))cell.classList.add('issue-cell');cell.type='button';cell.dataset.row=r;cell.dataset.col=c;cell.disabled=fixed||game.state.puzzleSolved;
    cell.setAttribute('aria-label',String.fromCharCode(65+c)+(r+1)+'，'+(value===1?'黑子':value===0?'白子':'空格')+(fixed?'，给定棋子':''));
    cell.addEventListener('click',()=>dispatch('grid-cell',r+'|'+c));cell.addEventListener('contextmenu',e=>{e.preventDefault();dispatch('grid-clear',r+'|'+c);});board.append(cell);
   }
   const count=grid[r].filter(v=>v===1).length;board.append(el('span',String(count),'grid-row-count'+(count===4?' done':count>4?' over':'')));
  }
  const foot=el('div',null,'grid-foot');foot.append(el('span',null,'grid-corner'));
  for(let c=0;c<n;c++){const count=grid.filter(row=>row[c]===1).length;foot.append(el('span',String(count),'grid-col-count'+(count===4?' done':count>4?' over':'')));}foot.append(el('span',null,'grid-corner'));
  column.append(board,foot);
  panel.append(el('p','已填 '+progress.filled+' / '+progress.total+' 格 · 还剩 '+progress.left+' 格','grid-progress'));
  const tools=el('div',null,'grid-tools');tools.setAttribute('aria-label','落子工具');for(const [label,value] of [['循环','cycle'],['● 黑子','black'],['○ 白子','white'],['擦除','erase']]){const btn=b(label,'grid-tool',value);btn.setAttribute('aria-pressed',String(game.state.puzzleTool===value));btn.disabled=game.state.puzzleSolved;tools.append(btn);}panel.append(tools);const history=el('div',null,'grid-tools');for(const [label,action,stack] of [['撤销','grid-undo','puzzleUndo'],['重做','grid-redo','puzzleRedo']]){const btn=b(label,action);btn.disabled=game.state.puzzleSolved||!game.state[stack].length;history.append(btn);}panel.append(history);const actions=el('div',null,'grid-actions');for(const [label,action] of [['检查','grid-check'],['清空落子','grid-reset']]){const btn=b(label,action);btn.disabled=game.state.puzzleSolved;actions.append(btn);}panel.append(actions);
  panel.append(el('p','循环模式依次落黑、白、清空；也可选择落子工具。方向键移动，B 落黑、W 落白、Delete 擦除，Ctrl+Z 撤销。金边棋子为题面，蓝边为你的落子。行末与列下数字为黑子数。','grid-instructions'));
  const message=el('p',game.state.puzzleMessage||'填好棋盘后，点击「检查」完成密保验证。','grid-message');message.setAttribute('role','status');panel.append(message);
  if(game.state.puzzleSolved)panel.append(el('div','密保验证通过，可以查看找回的密码。','grid-solved'),b('查看找回的密码','grid-answer'));
  workspace.append(column,panel);wrap.append(workspace);return wrap;
 }
 function doudouLogin(box){
  box.className='doudou-signin';box.append(el('h1','DOUDOU'));
  if(game.state.puzzleRecoveryOpen){
   const overlay=el('section',null,'puzzle-overlay');overlay.append(b('← 返回登录','recovery-close'));
   if(game.state.puzzleAnswerOpen&&game.state.puzzleSolved){const card=el('section',null,'recovered-password');card.append(el('h2','密保验证完成'),el('p','已找回账号：小船长'),el('strong',game.puzzleSpec().password),b('返回登录','recovery-close'),b('回看棋盘','grid-board'));overlay.append(card);}else overlay.append(puzzlePanel());box.append(overlay);return;
  }
  const base=el('section',null,'doudou-login-box'),qr=el('div',null,'login-qr');qr.append(el('h2','DOUDOU'),picture('assets/taptap/ui/doudou-qr.svg','留存的扫码登录图样'),el('p','扫码入口已停用，请使用账号登录'));
  const fields=el('section',null,'doudou-login-fields');fields.append(el('h2','账号登录'));const form=el('form');form.id='rz-doudou-form';
  for(const [id,label,type] of [['rz-doudou-username','账号','text'],['rz-doudou-password','密码','password']]){const l=el('label',label),input=el('input');input.id=id;input.placeholder=id.endsWith('username')?'请输入账号':label;input.type=type;input.required=true;input.autocomplete='off';input.maxLength=32;l.append(input);form.append(l);}
  const submit=el('button','登　录');submit.type='submit';form.append(submit);fields.append(form,b('忘记密码','recovery-open'),el('p',game.state.puzzleMessage||'','login-message'));base.append(qr,fields);box.append(base);
 }
 function home(box){
  if(game.state.route.site==='ritual'){clinicHome(box);return;}
  if(!game.state.doudouLoggedIn){doudouLogin(box);return;}
  const main=frame(box,'diaries'),query=game.state.doudouQuery||'';main.append(el('h1',query?'搜索：'+query:game.state.doudouTab==='mine'?'我的留存文章':'首页 · 留存动态'));
  const list=el('div',null,'doudou-feed');const docs=data.essayIds.map(id=>game.documents.get(id)).filter(d=>!query||(d.title+d.paragraphs.flat().join('')).includes(query));
  for(const d of docs){const entry=el('article',null,'essay-preview'),head=el('header',null,'feed-author');head.append(el('span','舟','feed-avatar'),el('div','小船长 · '+d.date),el('small',game.state.read.includes(d.id)?'已读':'留存文章'));entry.append(head,b(d.title,'open',d.id),el('p',d.paragraphs.slice(0,2).flat().join('')),b('阅读全文 →','open',d.id));list.append(entry);}
  if(!docs.length)list.append(el('p','未找到相关留存文章。'));main.append(list);if(game.endingReady)main.append(b('给哥哥留下回应','finish'));
 }
 function documentPage(box,d){
  if(d.pageType==='login'){account(box,'forum');return;}
  const main=frame(box,d.siteId),article=el('article',null,'source-paper '+(d.kind==='essay'?'essay-paper':''));main.append(b('← 返回目录','directory'));article.append(el('h1',d.title),el('small',d.date+' / '+d.author));text(article,d);main.append(article);
  const canResume=['ending','bonus'].includes(d.id)&&game.options.mode==='gateway';
  if(canResume){main.insertBefore(b('← 返回与哥哥的对话','resume-conversation'),article);article.append(b('返回与哥哥的对话','resume-conversation'));}
  if(d.id==='clinic-page')article.append(b('我想要报备 · 患者账户','account','ritual'));
  
  if(d.id==='novel5')article.append(b('返回论坛阅读其他帖子','site','forum'));
  if(d.kind==='essay'&&game.endingReady)article.append(b('给哥哥留下回应','finish'));
  if(d.id==='ending')article.append(game.bonusAvailable?b('阅读番外 · 留下来的小事','bonus'):el('p','还有一些关键材料没有找到。补齐调查档案后，番外会在这里开放。'));
  if(d.id==='bonus')article.append(el('p','这一回，读完了。'),b('回到文章目录','site','diaries'));
 }
 function quiz(box){
  const main=frame(box,'diaries'),q=game.state.quiz,panel=el('section',null,'brother-conversation quiz');main.append(b('← 回看文章','site','diaries'));panel.append(el('header','哥哥留给你的七个问题','brother-identity'));
  if(q.summary){
   panel.append(el('h1','本次剧情理解：'+q.summary.score+' / 100'),el('p','这些回应不会改变结局。'));
   for(const a of q.answers){const item=el('section',null,'quiz-feedback');item.append(el('h2',data.quiz[a.questionId-1].question),el('p','你：'+a.answer),el('p','哥哥：'+a.reply),el('small',a.score+' / '+data.quiz[a.questionId-1].maxScore+' 分'));panel.append(item);}panel.append(b('读完哥哥最后的留言','read-ending'));
  }else{
   if(q.answers.length){const prev=q.answers[q.answers.length-1];panel.append(el('p','哥哥：'+prev.reply,'quiz-last-reply'));}
   const question=data.quiz[q.answers.length];panel.append(el('small','第 '+(q.answers.length+1)+' / 7 问'),el('h1',question.question));
   const choices=el('div',null,'quiz-options');game.quizOptions().forEach((o,i)=>choices.append(b(String.fromCharCode(65+i)+'　'+o.text,'quiz-answer',String(i))));panel.append(choices);
  }
  main.append(panel);
 }
 function conversation(box){
  if(game.options.mode==='choice'){quiz(box);return;}
  const main=frame(box,'diaries'),c=game.state.conversation,ready=game.endingReady,enabled=game.aiEnabled;
  main.append(b('← 返回小船长的文章','site','diaries'));const panel=el('section',null,'brother-conversation'),head=el('header',null,'brother-identity');head.append(el('span','舟','brother-avatar'),el('h1','哥哥留给你的会话'),el('small','小船长 · 仅留给小周'));panel.append(head);
  const log=el('div',null,'conversation-log');log.setAttribute('role','log');log.setAttribute('aria-live','polite');
  const bubble=(who,text)=>{const row=el('div',null,'conversation-bubble '+who);row.append(el('small',who==='brother'?'哥哥':'小周'),el('p',text));log.append(row);};
  bubble('brother','小周，是哥哥。我把记得的事和没来得及说的话，留在了这里。哪天你回来，这些字也许还能替我陪你坐一会儿。');
  if(!ready)bubble('brother','先看看我留下的那几篇文章吧。不着急，我等你。');
  for(const a of c.answers){bubble('brother',game.endingQuestions[a.questionId-1]);bubble('zhou',a.answer);bubble('brother',a.reply);}
  if(ready&&enabled&&c.answers.length<7)bubble('brother',game.endingQuestions[c.answers.length]);
  if(ready&&!game.aiRequired)bubble('brother','你能找到这里，哥哥已经很高兴了。还有一段话，留在最后。慢慢看。');
  if(c.summary){
   bubble('brother',c.summary.reply);const evaluation=el('section',null,'conversation-evaluation');evaluation.append(el('h2','本次剧情理解评价：'+c.summary.score+' / 100'),el('small','理解反馈不影响结局。'));
   for(const item of c.summary.items)evaluation.append(el('p','第'+item.questionId+'题 · '+item.score+'分 ｜ '+item.feedback+'（你的回答：'+item.evidence+'）'));log.append(evaluation);for(const m of c.messages)bubble(m.role==='user'?'zhou':'brother',m.text);
  }
  panel.append(log);const actions=el('div',null,'conversation-actions');
  if(ready&&(!game.aiRequired||c.summary))actions.append(b('读完哥哥最后的留言','read-ending'));
  if(enabled&&c.summary&&c.messages.length<20&&!c.chatOpen)actions.append(b('继续和哥哥说话','chat'));
  if(game.options.mode==='gateway'&&c.localOnly)actions.append(b('返回与哥哥的对话','resume-conversation'),el('small','阅读留言不会清除对话，随时可以回来继续。'));
  if(game.options.mode==='gateway'&&!c.localOnly){
   actions.append(el('small',c.connection==='checking'?'正在连接……':enabled?'会话已连接':'连接暂不可用，保存的留言仍可阅读。'));
   const retry=b('重新连接','reconnect');retry.disabled=c.pending||c.connection==='checking';actions.append(retry);
   const local=b('先阅读哥哥留下的文字','local-ending');local.disabled=c.pending;actions.append(local);
  }
  if(ready&&enabled&&c.answers.length===7&&!c.summary){const summary=b('听听哥哥最后的回应','summarize');summary.disabled=c.pending;actions.append(summary);}
  if(c.sessionExpired)actions.append(b('重新开始对话','restart-conversation'));
  if(c.summary)actions.append(el('small','还能聊 '+Math.max(0,10-c.messages.length/2)+' 轮'));panel.append(actions);
  const chat=c.answers.length===7,active=ready&&enabled&&(!chat||c.summary&&c.chatOpen&&c.messages.length<20),form=el('form',null,'conversation-compose');form.id=chat?'rz-chat-form':'rz-ending-form';
  const input=el('textarea');input.id=chat?'rz-chat-answer':'rz-ending-answer';input.maxLength=500;input.value=c.draft;input.disabled=!active||c.pending;input.placeholder=!ready?'先读完哥哥留下的文章':!enabled?'这里留下的，是哥哥保存的文字。':'给哥哥写句话……';input.setAttribute('aria-label','给哥哥的回答');
  const submit=el('button',c.pending?'等待回应…':'发送');submit.type='submit';submit.disabled=!active||c.pending;form.append(input,submit);panel.append(form);
  if(c.error){const error=el('p',c.error,'conversation-error');error.setAttribute('role','alert');panel.append(error);}main.append(panel);
 }
 return {home,documentPage,conversation,figure,account};
}
root.RenZengSources={createSources,imagePath};
})(globalThis);
