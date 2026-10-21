(function(root){
'use strict';
function create(questions,random=Math.random){
 const orders=questions.map(q=>{
  const ids=q.options.map(o=>o.id);
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  return ids;
 });
 // An all-A perfect score is forbidden even if the random shuffle happens to produce it.
 if(questions.every((q,i)=>q.options.find(o=>o.id===orders[i][0]).score===q.maxScore)){
  const q=questions[0],j=orders[0].findIndex(id=>q.options.find(o=>o.id===id).score<q.maxScore);
  [orders[0][0],orders[0][j]]=[orders[0][j],orders[0][0]];
 }
 return {orders,answers:[],summary:null};
}
function options(questions,session,index){
 const q=questions[index];return q?session.orders[index].map(id=>q.options.find(o=>o.id===id)):[];
}
function valid(questions,session){
 return !!session&&Array.isArray(session.orders)&&session.orders.length===questions.length&&
 questions.every((q,i)=>Array.isArray(session.orders[i])&&session.orders[i].length===q.options.length&&
 new Set(session.orders[i]).size===q.options.length&&session.orders[i].every(id=>q.options.some(o=>o.id===id)))&&
 Array.isArray(session.answers)&&session.answers.length<=questions.length&&session.answers.every((a,i)=>{
 const q=questions[i],o=q.options.find(o=>o.id===a.optionId);return o&&a.questionId===q.id&&a.answer===o.text&&a.score===o.score&&a.reply===o.reply;
 })&&(session.answers.length===questions.length?
 session.summary?.score===session.answers.reduce((n,a)=>n+a.score,0):session.summary===null);
}
root.RenZengQuiz={create,options,valid};
if(typeof module!=='undefined')module.exports=root.RenZengQuiz;
})(globalThis);
