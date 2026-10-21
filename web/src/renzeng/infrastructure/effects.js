(function(root){
'use strict';
// This adapter belongs only to 人曾在此; the shared game's effects stay untouched.
function createEffects(getSettings){
 let audio;
 const reduced=()=>{const s=getSettings();return s.motionMode==='reduce'||s.motionMode==='system'&&!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches||!s.motionMode&&s.reduced;};
 function click(){
  if(!getSettings().sound)return;
  try{const Context=root.AudioContext||root.webkitAudioContext;if(!Context)return;audio=audio||new Context();if(audio.state==='suspended')audio.resume().catch(()=>{});const tone=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;tone.type='sine';tone.frequency.value=390;gain.gain.setValueAtTime(.018,now);gain.gain.exponentialRampToValueAtTime(.001,now+.055);tone.connect(gain);gain.connect(audio.destination);tone.start();tone.stop(now+.06);}catch(_){}
 }
 function result(){if(reduced())return;const reader=document.getElementById('rz-reader');reader?.animate?.([{outlineColor:'transparent'},{outlineColor:'#a78658'},{outlineColor:'transparent'}],{duration:380});try{root.navigator?.vibrate?.(12);}catch(_){} }
 function unsettle(node){if(reduced()||document.hidden)return;node?.animate?.([{filter:'brightness(1)',transform:'translateX(0)'},{filter:'brightness(1.3)',transform:'translateX(-2px)',offset:.3},{filter:'brightness(1)',transform:'translateX(1px)',offset:.6},{filter:'brightness(1)',transform:'translateX(0)'}],{duration:420,easing:'ease-out'});try{root.navigator?.vibrate?.([18,45,12]);}catch(_){} }
 return {click,result,reduced,unsettle};
}
root.RenZengEffects={createEffects};
})(globalThis);
