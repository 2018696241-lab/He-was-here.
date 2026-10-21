(function(root){
'use strict';
const copy=v=>JSON.parse(JSON.stringify(v)),normalize=v=>String(v).normalize('NFKC').trim().replace(/\s+/g,'').toLowerCase();

const puzzle=root.RenZengPuzzle||(typeof require==='function'?require('./puzzle.js')&&root.RenZengPuzzle:null);
const quiz=root.RenZengQuiz||(typeof require==='function'?require('./quiz-session.js')&&root.RenZengQuiz:null);
const initial=data=>({storyId:data.id,contentVersion:data.version,began:false,route:{type:'home',site:'link'},currentDocument:null,read:[],clues:[],discovered:[],diaryUnlocked:false,completed:false,bonusRead:false,notes:'',puzzleRecoveryOpen:false,puzzleAnswerOpen:false,staffPages:[],doudouQuery:'',doudouTab:'home',puzzleTool:'cycle',puzzleUndo:[],puzzleRedo:[],restored:[],forumLoggedIn:false,patientLoggedIn:false,doudouLoggedIn:false,visited:[{type:'home',site:'link'}],quiz:quiz.create(data.quiz),history:[],scroll:{},focus:{},boardPages:{},passwordAttempts:0,searched:false,accountSeen:false,puzzleCells:null,puzzleSolved:false,puzzleAttempts:0,puzzleMessage:'',settings:{fontSize:18,reduced:false,motionMode:'system',sound:false}});
class Investigation{
 constructor(data,onEvent=()=>{},options={}){this.data=data;this.documents=new Map(data.documents.map(d=>[d.id,d]));this.clues=new Map(data.clues.map(c=>[c.id,c]));this.onEvent=onEvent;this.options=options;this.state=initial(data);this.state.conversation={answers:[],messages:[],draft:'',pending:false,error:'',chatOpen:false,started:false,localOnly:false,connection:'idle',summary:null,sessionExpired:false};}
 changed(type='change'){this.onEvent({type});this.onPersist?.();}
 has(id,s=this.state){return s.clues.includes(id);}
 get keyProgress(){const clues=this.data.clues.filter(c=>c.key);return {collected:clues.filter(c=>this.has(c.id)).length,total:clues.length};}
 get bonusAvailable(){return this.state.completed&&this.keyProgress.collected===this.keyProgress.total;}
 timeline(){return this.data.timeline.filter(r=>r.final?this.state.completed:r.clues.every(id=>this.has(id))).sort((a,b)=>a.year-b.year);}
 setNotes(v){this.state.notes=String(v).slice(0,3000);this.changed('notes');}
 setScroll(key,y,focus=''){if(Number.isFinite(y)){this.state.scroll[key]=Math.max(0,Math.min(100000,y));this.state.focus[key]=String(focus).slice(0,180);}}
 validateSettings(v){if(!v||typeof v.reduced!=='boolean'||![16,18,20,22].includes(v.fontSize))throw Error('阅读设置格式不正确。');if(v.motionMode!==undefined&&!['system','reduce','full'].includes(v.motionMode)||v.sound!==undefined&&typeof v.sound!=='boolean')throw Error('阅读设置格式不正确。');return {reduced:v.reduced,fontSize:v.fontSize,motionMode:v.motionMode||(v.reduced?'reduce':'full'),sound:v.sound===true};}
 setSettings(patch){this.state.settings=this.validateSettings({...this.state.settings,...patch});this.changed();}
 get searchEnabled(){return this.state.began&&this.state.route.site==='forum';}
 siteUnlocked(id,s=this.state){return {link:true,forum:s.read.includes('help'),ritual:s.read.includes('clinic-rumor'),diaries:s.forumLoggedIn&&s.read.includes('doudou-message')}[id]===true;}
 discoverable(d,s=this.state){
  if(!d||!this.siteUnlocked(d.siteId,s)||(d.requiresRead||[]).some(id=>!s.read.includes(id)))return false;
  if(d.access==='ending')return s.completed;
  if(d.access==='bonus')return s.completed&&this.data.clues.filter(c=>c.key).every(c=>s.clues.includes(c.id));
  if(d.access==='patient'&&!s.patientLoggedIn||d.access==='forum'&&!s.forumLoggedIn||d.access==='doudou'&&!s.doudouLoggedIn)return false;
  return !d.searchLocked||s.restored.includes(d.id);
 }
 publicForumDocuments(){return this.data.documents.filter(d=>d.siteId==='forum'&&d.access==='public'&&!d.pageType);}
 canSearch(d){return d&&d.siteId==='forum'&&this.siteUnlocked('forum')&&d.access==='public'&&d.id!=='account'&&(d.requiresRead||[]).every(id=>this.state.read.includes(id));}
 openSearchResult(id){
  const r=this.state.route;if(r.type!=='search'||!this.searchResults(r.query).ids.includes(id))return false;
  const d=this.documents.get(id);if(!this.canSearch(d))return false;
  const fresh=d.searchLocked&&!this.state.restored.includes(id);
  if(fresh)this.state.restored.push(id);
  const result=this.openDocument(id);
  if(result&&fresh)this.changed('restored');return result;
 }
 loginAccount(site,username,password){
  if(!['forum','ritual'].includes(site)||!this.siteUnlocked(site))return {ok:false,message:'此页面尚未开放。'};
  const user=String(username).normalize('NFKC').trim();
  if(!this.data.knownUsers.includes(user))return {ok:false,message:'帐号不存在'};
  if(user!=='英雄本色'||normalize(password)!==this.data.password)return {ok:false,message:'密码错误'};
  if(site==='forum'){this.state.forumLoggedIn=true;this.state.diaryUnlocked=true;}
  else this.state.patientLoggedIn=true;
  this.changed();return {ok:true,message:'登录成功'};
 }
 accountHome(site='forum'){
  if(!this.siteUnlocked(site))return false;
  this.transition({type:'account',site});this.changed();return true;
 }
 historyLabel(route){if(route.type==='home')return {link:'LINK',forum:'天坛论坛',ritual:'忠义堂',diaries:'DOUDOU'}[route.site];
  if(route.type==='document')return this.documents.get(route.id)?.title||'材料';
  if(route.type==='search')return '搜索：'+route.query;
  if(route.type==='board')return this.data.sections.find(s=>s.id===route.section)?.title||'论坛';
  if(route.type==='account')return route.site==='forum'?'论坛账号':'患者账户';
  if(route.type==='conversation')return '哥哥的会话';
  return this.data.sites.find(s=>s.id===route.site)?.title||'页面';
 }
 visitHistory(index){const route=this.state.visited[Number(index)];if(!route||!this.validView({route}))return false;this.transition(route);this.changed();return true;}
 visibleParagraphs(id){const d=this.documents.get(id);return d.paragraphs;}
 collectVisible(id,s=this.state){for(const c of this.data.clues.filter(c=>c.document===id))if(!s.clues.includes(c.id))s.clues.push(c.id);}
 snapshot(){return copy({route:this.state.route});}
 routeKey(v=this.snapshot()){return JSON.stringify(v.route);}
 transition(route,replace=false){
  if(!replace)this.state.history=[...this.state.history,this.snapshot()].slice(-100);
  if(route.type==='board')this.state.boardPages[route.section]=route.page||1;this.state.route=copy(route);this.state.currentDocument=route.type==='document'?route.id:null;
  if(!this.state.visited.some(r=>r.site===route.site))this.state.visited.push({type:'home',site:route.site});
 }
 start(){if(this.state.began)return false;this.state.began=true;this.changed();return true;}
 restart(){if(this.beforeRestart?.()===false)return false;this.options.reset?.();const settings=this.state.settings;this.state=initial(this.data);this.state.conversation={answers:[],messages:[],draft:'',pending:false,error:'',chatOpen:false,started:false,localOnly:false,connection:'idle',summary:null,sessionExpired:false};this.state.settings=settings;this.start();}
 goSite(id){if(!this.state.began||!this.siteUnlocked(id))return false;this.transition({type:'home',site:id});this.changed();return true;}
 catalog(tab='all',page=1){if(!this.state.began||!this.siteUnlocked('ritual')||!['all','products','staff','records'].includes(tab)||![1,2,3].includes(page))return false;this.transition({type:'catalog',site:'ritual',tab,page});if(tab==='staff'&&this.discoverable(this.documents.get('doctors'))){const s=this.state;s.staffPages=[...new Set([...(s.staffPages||[]),page])];if(s.staffPages.length===3&&!s.read.includes('doctors')){s.read.push('doctors');s.discovered.push('doctors');this.collectVisible('doctors');}}this.changed();return true;}
 openDocument(id){if(id==='doctors')return this.discoverable(this.documents.get(id))&&this.catalog('staff',1);const d=this.documents.get(id),s=this.state;if(!s.began||!this.discoverable(d))return false;const route={type:'document',site:d.siteId,id};if(d.siteId===s.route.site){const origin=s.route.type==='document'?s.route.returnTo:s.route;if(origin)route.returnTo=copy(origin);}this.transition(route);const fresh=!s.read.includes(id);if(fresh)s.read.push(id);if(!s.discovered.includes(id))s.discovered.push(id);this.collectVisible(id);if(id==='account')s.accountSeen=true;if(id==='bonus')s.bonusRead=true;this.changed(fresh?'recorded':'change');return true;}
 boardDocuments(section,tab){const docs=this.publicForumDocuments().filter(d=>d.section===section).sort((a,b)=>{const order=this.data.forumOrder?.[section];return order?order.indexOf(a.id)-order.indexOf(b.id):b.date.localeCompare(a.date);});return tab==='recommended'?docs.filter(d=>['ranking','street','novel1','newspaper'].includes(d.id)):docs;}
 // 分页器展示：站务公告只有原剧情帖（无残影），不显示分页；其余三板块保留 1–5 的旧站观感。
 // 第 2–5 页数据已丢失，只能停在第 1 页（见 browse 与 validView 的收口）。
 boardPageCount(section){return section==='notice'?1:5;}
 boardEntries(section,tab,page=1){if(!this.data.sections.some(s=>s.id===section)||!Number.isInteger(page)||page<1||page>this.boardPageCount(section))return [];const docs=this.boardDocuments(section,tab);const fragments=this.data.lostForumPosts?.[section]||[];return [...docs,...fragments].slice((page-1)*10,page*10);}
 browse(section,tab,page){if(tab&&!['all','recommended','latest','history','rules'].includes(tab))return false;if(!this.siteUnlocked('forum')||!this.data.sections.some(x=>x.id===section))return false;const selected=page===undefined?(this.state.boardPages[section]||1):Number(page);if(selected!==1)return false;this.state.boardPages[section]=selected;this.transition({type:'board',site:'forum',section,page:selected,...(tab?{tab}:{})});this.changed();return true;}
 openLostPost(id){const r=this.state.route;if(r.type!=='board'||!this.siteUnlocked('forum')||!this.boardEntries(r.section,r.tab,r.page||1).some(d=>d.lost&&d.id===id))return false;this.transition({type:'lost',site:'forum',id,returnTo:copy(r)});this.changed();return true;}
 searchResults(query){
  const term=normalize(query);if(!term)return {ids:[],destinations:[]};
  const ids=this.data.documents.filter(d=>this.canSearch(d)).filter(d=>{
   if(d.searchLocked)return (d.searchTerms||[]).some(t=>normalize(t)===term||(['novel4','novel5'].includes(d.id)&&term.includes(normalize(t))));
   return normalize(d.title+' '+d.author).includes(term)||(d.searchTerms||[]).some(t=>normalize(t)===term);
  }).map(d=>d.id);
  return {ids,destinations:[]};
 }
 search(query){if(!this.searchEnabled)return false;const q=String(query).trim().slice(0,60);this.state.searched=true;this.transition({type:'search',site:'forum',query:q});this.changed();return this.searchResults(q);}
 forumHome(){return this.goSite('forum');}
 directoryTarget(){const d=this.documents.get(this.state.currentDocument);if(this.state.route.returnTo)return this.state.route.returnTo;if(d?.siteId==='forum')return (d.section?{type:'board',site:'forum',section:d.section}:{type:'home',site:'forum'});return {type:'home',site:this.state.route.site};}
 returnToDirectory(){const route=this.directoryTarget();if(!this.validView({route}))return false;this.transition(route);this.changed();return true;}
 validView(v,s=this.state){
  const r=v?.route;if(!r||!this.siteUnlocked(r.site,s))return false;
  if(r.type==='document'){const d=this.documents.get(r.id);return !!d&&d.siteId===r.site&&s.read.includes(r.id)&&this.discoverable(d,s)&&(!r.returnTo||(r.returnTo.type!=='document'&&r.returnTo.site===r.site&&this.validView({route:r.returnTo},s)));}
  if(r.type==='lost')return r.site==='forum'&&r.returnTo?.type==='board'&&this.validView({route:r.returnTo},s)&&this.boardEntries(r.returnTo.section,r.returnTo.tab,r.returnTo.page||1).some(d=>d.lost&&d.id===r.id);
  if(r.type==='account')return ['forum','ritual'].includes(r.site);
  if(r.type==='catalog')return r.site==='ritual'&&['all','products','staff','records'].includes(r.tab)&&[1,2,3].includes(r.page);
  if(r.type==='conversation')return r.site==='diaries'&&s.doudouLoggedIn;
  if(r.type==='home')return true;
  if(r.site!=='forum')return false;
  return r.type==='board'?(this.data.sections.some(x=>x.id===r.section)&&Number.isInteger(r.page??1)&&(r.page??1)===1&&(!r.tab||['all','recommended','latest','history','rules'].includes(r.tab))):r.type==='search'&&typeof r.query==='string'&&r.query.length<=60;
 }
 restoreView(v){if(!this.validView(v))return false;this.transition(v.route,true);this.changed();return true;}
 goBack(){const v=this.state.history.pop();return v?this.restoreView(v):false;}
 passwordReady(){return this.siteUnlocked('forum');}
 unlockAccount(answer,username='英雄本色'){return this.loginAccount('forum',username,answer);}
 loginDoudou(){return false;}
 loginDoudouWithPassword(answer,username='小船长'){const spec=this.data.doudouPuzzle;
  if(!this.siteUnlocked('diaries'))return {ok:false,message:'私密留言还没有恢复。'};
  if(String(username).trim()!=='小船长')return {ok:false,message:'帐号不存在'};
  if(normalize(answer)!==spec.password){this.state.puzzleAttempts++;this.changed();
   return {ok:false,message:'密码错误。可以通过忘记密码进行密保验证。'};}
  this.state.doudouLoggedIn=true;this.changed();return {ok:true,message:'已登录小船长的账号。'};}
 get endingReady(){return this.state.doudouLoggedIn&&this.data.essayIds.every(id=>this.state.read.includes(id));}
 get endingQuestions(){return ['你是谁？','你知道我是谁吗？','你还记得哥哥生日是哪天吗？','小周，你的病现在怎么样了？','可以教哥哥折船吗？','你还和聚财弟弟有联系吗？','你回老宅，是想找什么吗？'];}
 get aiEnabled(){return !this.state.conversation.localOnly&&this.options.aiEnabled===true;}
 get aiRequired(){const c=this.state.conversation;return !c.localOnly&&(c.started||this.aiEnabled);}
 async checkConnection(){const s=this.state,c=s.conversation;if(c.localOnly||c.pending||c.connection==='checking'||typeof this.options.check!=='function')return false;c.connection='checking';this.changed('connection');const result=await this.options.check();if(this.state!==s||c.localOnly)return false;c.connection=result.status;this.changed('connection');return result.ready;}
 useLocalEnding(){const c=this.state.conversation;if(this.state.route.type!=='conversation'||c.pending||c.localOnly)return false;c.localOnly=true;c.chatOpen=false;c.connection='local';c.error='';this.changed();return true;}
 setConversationDraft(value){if(this.state.route.type==='conversation'&&!this.state.conversation.pending)this.state.conversation.draft=String(value);}
 openConversation(){if(!this.siteUnlocked('diaries')||!this.state.doudouLoggedIn)return false;this.transition({type:'conversation',site:'diaries'});this.changed();void this.checkConnection();return true;}
 resumeConversation(){const c=this.state.conversation;if(this.options.mode!=='gateway'||!this.endingReady||c.pending)return false;c.localOnly=false;c.connection='idle';if(c.summary&&c.messages.length<20)c.chatOpen=true;return this.openConversation();}
 startChat(){const c=this.state.conversation;if(!this.aiEnabled||!c.summary||c.messages.length>=20||typeof this.options.chat!=='function')return false;c.chatOpen=true;this.changed();return true;}
 beginEnding(){if(!this.endingReady)return false;if(['gateway','choice'].includes(this.options.mode)||this.aiRequired)return this.openConversation();return this.finish();}
 quizOptions(questionIndex=this.state.quiz.answers.length){return quiz.options(this.data.quiz,this.state.quiz,questionIndex);}
 answerQuiz(index){
  const q=this.state.quiz;if(this.options.mode!=='choice'||!this.endingReady||this.state.route.type!=='conversation'||q.summary)return false;
  const item=this.data.quiz[q.answers.length],answer=this.quizOptions()[index];if(!Number.isInteger(index)||!answer)return false;
  q.answers.push({questionId:item.id,optionId:answer.id,answer:answer.text,reply:answer.reply,score:answer.score});
  if(q.answers.length===this.data.quiz.length)q.summary={score:q.answers.reduce((n,a)=>n+a.score,0),items:copy(q.answers)};
  this.changed();return true;
 }
 // What the player actually dug up, so the ending reply can answer the person who came
 // here rather than a stranger. Ids and counters only: never free-form player text.
 endingContext(){
  const s=this.state,keys=this.data.clues.filter(c=>c.key&&s.clues.includes(c.id)).map(c=>c.id);
  const rest=s.clues.filter(id=>!keys.includes(id)).slice(-8),marks=[];
  if(s.diaryUnlocked)marks.push('diaryUnlocked');
  if(s.doudouLoggedIn)marks.push('doudouLoggedIn');
  return {read:s.read.slice(-10),clues:[...keys,...rest].slice(0,20),keys:keys.slice(0,20),progress:{read:s.read.length,total:this.data.documents.length,clues:s.clues.length,keys:keys.length,keysTotal:this.data.clues.filter(c=>c.key).length},marks};
 }
 async answerEnding(answer){const s=this.state,c=s.conversation;if(!this.aiEnabled||!this.endingReady||s.route.type!=='conversation'||c.pending||c.answers.length>=7)return false;const text=String(answer).trim();c.draft=text;if(!text||Array.from(text).length>500){c.error='请写下不超过500字的回应。';this.changed();return false;}c.started=true;c.pending=true;c.error='';this.changed();try{const result=await this.options.judge({answer:text,context:this.endingContext()});if(this.state!==s)return false;if(typeof result?.reply!=='string'||result.answered!==c.answers.length+1)throw Error('Invalid response');c.answers.push({questionId:c.answers.length+1,answer:text,reply:result.reply});c.draft='';return true;}catch(e){if(this.state===s){c.connection='unavailable';c.sessionExpired=e.code==='session_expired';c.error=c.sessionExpired?'会话已结束。可以重新开始对话，或阅读哥哥留下的文字。':e.code==='request_conflict'?'上次回应尚未确认，请保留原回答重试，或转为阅读留言。':'连接暂时中断，回答已保留。请重新连接后重试，或阅读哥哥留下的文字。';}return false;}finally{if(this.state===s){c.pending=false;this.changed();}}}
 async sendChat(answer){const s=this.state,c=s.conversation;if(!this.aiEnabled||!this.endingReady||s.route.type!=='conversation'||!c.summary||c.messages.length>=20||!c.chatOpen||c.pending||typeof this.options.chat!=='function')return false;const text=String(answer).trim();c.draft=text;if(!text||Array.from(text).length>500){c.error='请写下不超过500字的回应。';this.changed();return false;};c.pending=true;c.error='';this.changed();try{const result=await this.options.chat({message:text,context:this.endingContext()});if(this.state!==s)return false;if(typeof result?.reply!=='string'||!result.reply.trim())throw Error('Invalid chat response');c.messages.push({role:'user',text},{role:'assistant',text:result.reply.trim().slice(0,2000)});c.draft='';return true;}catch(e){if(this.state===s){c.connection='unavailable';c.sessionExpired=e.code==='session_expired';c.error=c.sessionExpired?'会话已结束。可以重新开始对话，或阅读哥哥留下的文字。':e.code==='request_conflict'?'上次回应尚未确认，请保留原回答重试，或转为阅读留言。':'连接暂时中断，回答已保留。请重新连接后重试，或阅读哥哥留下的文字。';}return false;}finally{if(this.state===s){c.pending=false;this.changed();}}}

 restartConversation(){const c=this.state.conversation;if(c.pending||!c.sessionExpired)return false;this.options.reset?.();c.answers=[];c.messages=[];c.summary=null;c.started=false;c.sessionExpired=false;c.error='';c.chatOpen=false;this.changed();void this.checkConnection();return true;}
 async summarizeEnding(){const s=this.state,c=s.conversation;if(!this.aiEnabled||!this.endingReady||c.pending||c.answers.length!==7||c.summary)return false;c.pending=true;c.error='';this.changed();try{const result=await this.options.summary(this.endingContext());if(this.state!==s)return false;if(!Number.isInteger(result.score)||result.score<0||result.score>100||!Array.isArray(result.items)||result.items.length!==7||typeof result.reply!=='string')throw Error('summary');c.summary=result;return true;}catch(e){if(this.state===s){c.sessionExpired=e.code==='session_expired';c.connection='unavailable';c.error='暂时无法收到最后的回应，可以重新连接后重试，或阅读哥哥留下的文字。';}return false;}finally{if(this.state===s){c.pending=false;this.changed();}}}
 finish(){if(!this.endingReady||(this.aiRequired&&!this.state.conversation.summary)||(this.options.mode==='choice'&&!this.state.quiz.summary))return false;if(!this.aiRequired)this.state.conversation.localOnly=true;this.state.completed=true;return this.openDocument('ending');}
 openBonus(){return this.bonusAvailable&&this.openDocument('bonus');}
 archivalClue(id){return this.has(id)?this.clues.get(id):null;}
 archivedDocument(id){return this.state.read.includes(id)?this.documents.get(id):null;}
 sourceExcerpt(id){const c=this.archivalClue(id);return c?(c.excerpt||this.documents.get(c.document).paragraphs[c.paragraph].join('')):null;}
 relatedRecords(id){const c=this.archivalClue(id);return c?this.data.relations.filter(r=>(r.from===c.document||r.to===c.document)&&[r.from,r.to].every(x=>this.state.read.includes(x))):[];}
 visitSource(id){const c=this.archivalClue(id);return c?this.openDocument(c.document):false;}

}
Object.assign(Investigation.prototype,puzzle);
function validateContent(data){
 const errors=[],docs=new Map(data.documents.map(d=>[d.id,d]));
 if(docs.size!==data.documents.length)errors.push('Duplicate document');
 for(const d of data.documents){
  if(!data.sites.some(x=>x.id===d.siteId))errors.push('Unknown site '+d.id);
  for(const id of [...d.links,...d.discovery.read])if(!docs.has(id))errors.push('Missing target '+id);
  if(d.searchLocked&&!(d.searchTerms||[]).length)errors.push('Missing search terms '+d.id);
 }
 for(const c of data.clues)if(!docs.get(c.document)?.paragraphs[c.paragraph])errors.push('Missing source '+c.id);
 for(const r of data.relations)if(!docs.has(r.from)||!docs.has(r.to))errors.push('Missing relation');
 return errors;
}
root.RenZengCore={Investigation,validateContent,normalize};if(typeof module!=='undefined')module.exports=root.RenZengCore;
})(globalThis);
