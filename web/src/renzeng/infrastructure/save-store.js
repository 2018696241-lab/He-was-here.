(function(root){
'use strict';
const KEY='renzeng.save.v1',BACKUP='renzeng.save.backup.v1';
const clone=value=>JSON.parse(JSON.stringify(value));
function checksum(state){
 const text=JSON.stringify(state);let hash=2166136261;
 for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
 return (hash>>>0).toString(16);
}
function validate(game,envelope){
 if(envelope?.schema!==1||envelope.storyId!==game.data.id||envelope.contentVersion!==game.data.version)throw Error('存档版本不匹配');
 const s=envelope.state;
 if(!s||typeof s!=='object')throw Error('存档格式损坏');
 if(envelope.checksum!==checksum(s))throw Error('存档完整性校验失败');
 for(const key of ['read','clues','discovered','restored','visited','history','staffPages','puzzleUndo','puzzleRedo'])
  if(!Array.isArray(s[key]))throw Error('存档列表损坏：'+key);
 for(const key of ['began','diaryUnlocked','completed','bonusRead','puzzleRecoveryOpen','puzzleAnswerOpen','forumLoggedIn','patientLoggedIn','doudouLoggedIn','searched','accountSeen','puzzleSolved'])
  if(typeof s[key]!=='boolean')throw Error('存档字段损坏：'+key);
 for(const key of ['notes','puzzleTool','puzzleMessage','doudouQuery','doudouTab'])
  if(typeof s[key]!=='string')throw Error('存档字段损坏：'+key);
 for(const key of ['scroll','focus','boardPages','settings','conversation'])
  if(!s[key]||typeof s[key]!=='object'||Array.isArray(s[key]))throw Error('存档字段损坏：'+key);
 if(s.currentDocument!==null&&typeof s.currentDocument!=='string')throw Error('当前材料损坏');
 if(typeof s.notes!=='string'||s.notes.length>3000)throw Error('笔记损坏');
 const docs=new Set(game.data.documents.map(d=>d.id)),clues=new Set(game.data.clues.map(c=>c.id));
 for(const key of ['read','restored','discovered'])if(s[key].some(id=>!docs.has(id)))throw Error('材料记录损坏');
 if(s.clues.some(id=>!clues.has(id))||!root.RenZengQuiz.valid(game.data.quiz,s.quiz))throw Error('调查或答题记录损坏');
 const board=value=>Array.isArray(value)&&value.length===64&&value.every(v=>[-1,0,1].includes(v))&&value.every((v,i)=>{
  const given=game.data.doudouPuzzle.cells[Math.floor(i/8)][i%8];return !['b','w'].includes(given)||v===-1;
 });
 if(s.puzzleCells!==null&&!board(s.puzzleCells))throw Error('棋盘记录损坏');
 if(!s.puzzleUndo.every(board)||!s.puzzleRedo.every(board)||s.puzzleUndo.length>100||s.puzzleRedo.length>100)throw Error('棋盘历史损坏');
 if(!s.scroll||!Object.values(s.scroll).every(v=>Number.isFinite(v)&&v>=0)||!s.focus||!s.boardPages)throw Error('页面记录损坏');
 if(!Array.isArray(s.history)||s.history.length>100||s.history.some(v=>!game.validView(v,s))||!game.validView({route:s.route},s))throw Error('页面位置损坏');
 if(!s.visited.every(route=>game.validView({route},s)))throw Error('浏览记录损坏');
 game.validateSettings(s.settings);
 if(s.puzzleSolved){
  const grid=root.RenZengPuzzle.puzzleGrid.call({data:game.data,state:s,puzzleAt:root.RenZengPuzzle.puzzleAt});
  if(!game.data.doudouPuzzle.solution.every((row,r)=>row.every((v,c)=>grid[r][c]===v)))throw Error('棋盘完成状态损坏');
 }
 if(s.completed&&(!s.quiz.summary||!s.doudouLoggedIn||!game.data.essayIds.every(id=>s.read.includes(id))))throw Error('结局状态损坏');
 return clone(s);
}
function create(game,storage,onProblem=()=>{}){
 let blocked=false,reported=false;
 const envelope=()=>({schema:1,storyId:game.data.id,contentVersion:game.data.version,state:game.state,checksum:checksum(game.state)});
 function problem(message){blocked=true;if(!reported){reported=true;onProblem(message);}}
 function restore(){
  try{
   const raw=storage.getItem(KEY);if(!raw)return {ok:true,empty:true};
   game.state=validate(game,JSON.parse(raw));return {ok:true};
  }catch(error){problem('存档未能读取，原记录已保留。'+error.message);return {ok:false};}
 }
 function save(){
  if(blocked)return false;
  try{
   const next=JSON.stringify(envelope()),previous=storage.getItem(KEY);
   if(previous===next)return true;
   // Keep only a known-valid previous snapshot, never overwrite a good backup with corrupt data.
   if(previous){validate(game,JSON.parse(previous));storage.setItem(BACKUP,previous);}
   storage.setItem(KEY,next);return true;
  }catch(error){problem('自动存档失败，原记录已保留。'+error.message);return false;}
 }
 function recover(){
  try{const raw=storage.getItem(BACKUP);if(!raw)throw Error('没有可恢复的备份');const state=validate(game,JSON.parse(raw));storage.setItem(KEY,raw);game.state=state;blocked=false;reported=false;return true;}
  catch(error){onProblem('备份未能恢复：'+error.message);return false;}
 }
 function clear(){
  try{storage.removeItem(KEY);storage.removeItem(BACKUP);blocked=false;reported=false;return true;}
  catch(error){onProblem('无法清除存档：'+error.message);return false;}
 }
 return {restore,save,recover,clear,get blocked(){return blocked;}};
}
root.RenZengSave={create,validate,checksum,KEY,BACKUP};
if(typeof module!=='undefined')module.exports=root.RenZengSave;
})(globalThis);
