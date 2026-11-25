/* Musique d'ambiance douce (composition originale, générée en direct, aucun fichier audio).
   Ambiance « petit village tranquille » : piano doux, marimba, basse ronde, petits charleys.
   Utilisation : ChillMusic.set(true/false), ChillMusic.toggle(), ChillMusic.on
   Elle démarre au premier clic ou à la première touche (règle des navigateurs). */
(function(){
  const KEY='jolinngMusic';
  let on=true;try{on=localStorage.getItem(KEY)!=='0'}catch(e){}
  let ac=null,master=null,timer=null,nextT=0,step=0,loop=0,noiseBuf=null;
  const BPM=88,S16=60/BPM/4,AHEAD=.25;
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  // 8 mesures : Fa, Rém, Solm, Do, Fa, Rém, Sib, Do (accords 7e)
  const CH=[[53,57,60,64],[50,53,57,60],[55,58,62,65],[48,52,55,58],[53,57,60,64],[50,53,57,60],[46,50,53,57],[48,52,55,58]];
  const BASS=[41,38,43,36,41,38,34,36];
  const MEL=[
    [[0,69,3],[3,72,1],[4,76,4],[10,74,2],[12,72,4]],
    [[0,74,3],[3,72,1],[4,69,4],[10,65,2],[12,69,4]],
    [[0,70,2],[2,74,2],[4,77,4],[8,76,2],[10,74,2],[12,70,4]],
    [[0,72,6],[8,67,2],[10,70,2],[12,76,4]],
    [[0,77,3],[3,76,1],[4,72,4],[10,69,2],[12,72,4]],
    [[0,74,2],[2,72,2],[4,69,2],[6,65,2],[8,67,4],[12,69,4]],
    [[0,70,3],[3,69,1],[4,65,4],[10,67,2],[12,69,2],[14,70,2]],
    [[0,72,8],[12,67,4]]
  ];
  function init(){
    if(ac)return true;
    try{ac=new (window.AudioContext||window.webkitAudioContext)()}catch(e){return false}
    const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3000;
    master=ac.createGain();master.gain.value=0;
    const dl=ac.createDelay(1),fb=ac.createGain(),wet=ac.createGain();dl.delayTime.value=S16*6;fb.gain.value=.28;wet.gain.value=.22;
    master.connect(lp);lp.connect(ac.destination);lp.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(wet);wet.connect(ac.destination);
    const b=ac.createBuffer(1,ac.sampleRate*.1,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;noiseBuf=b;
    return true;
  }
  function voice(type,f,t,len,vol,att,dec){
    const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=f;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.exponentialRampToValueAtTime(Math.max(.0001,vol*.25),t+att+dec);g.gain.exponentialRampToValueAtTime(.0001,t+len+.25);
    o.connect(g).connect(master);o.start(t);o.stop(t+len+.3);
  }
  function piano(m,t,len,vol){voice('sine',mtof(m),t,len,vol,.012,.5);voice('triangle',mtof(m)*2,t,len*.6,vol*.18,.008,.25)}
  function marimba(m,t,len,vol){voice('triangle',mtof(m),t,Math.min(len,.6),vol,.004,.35);voice('sine',mtof(m)*4,t,.12,vol*.12,.002,.08)}
  function bass(m,t,len){voice('sine',mtof(m),t,len,.32,.01,.3)}
  function hat(t,vol){const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuf;f.type='highpass';f.frequency.value=7500;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+.05);s.connect(f).connect(g).connect(master);s.start(t);s.stop(t+.06)}
  function schedule(st,t){
    const bar=Math.floor(st/16)%8,s=st%16,ch=CH[bar];
    if(s===0||s===6||s===10)ch.forEach((m,i)=>piano(m,t+i*.012,s===0?S16*5:S16*3,s===0?.075:.05));
    if(s===0)bass(BASS[bar],t,S16*6);if(s===8)bass(BASS[bar]+7,t,S16*3);if(s===12)bass(BASS[bar],t,S16*3);
    if(s%2===0)hat(t,s%4===2?.05:.025);
    const quiet=loop%3===2; // une boucle sur trois : petites notes égrenées au lieu de la mélodie
    if(!quiet){for(const [p,m,l] of MEL[bar])if(p===s)marimba(m,t,l*S16,.16)}
    else if(s%4===0){const n=ch[(s/4+bar)%4]+12;marimba(n,t,S16*2,.08)}
  }
  function pump(){
    while(nextT<ac.currentTime+AHEAD){schedule(step,nextT);step++;if(step%128===0)loop++;nextT+=S16}
  }
  function play(){
    if(!init())return;if(ac.state==='suspended')ac.resume();
    if(timer)return;
    nextT=ac.currentTime+.08;step=0;
    master.gain.cancelScheduledValues(ac.currentTime);master.gain.setValueAtTime(master.gain.value,ac.currentTime);master.gain.linearRampToValueAtTime(.55,ac.currentTime+1.5);
    timer=setInterval(pump,40);pump();
  }
  function pause(){
    if(!ac||!timer)return;clearInterval(timer);timer=null;
    master.gain.cancelScheduledValues(ac.currentTime);master.gain.setValueAtTime(master.gain.value,ac.currentTime);master.gain.linearRampToValueAtTime(0,ac.currentTime+.4);
  }
  let armed=false;
  function arm(){if(armed)return;armed=true;const go=()=>{if(on)play()};document.addEventListener('pointerdown',go,{once:true});document.addEventListener('keydown',go,{once:true})}
  arm();
  window.ChillMusic={
    get on(){return on},
    set(v){on=!!v;try{localStorage.setItem(KEY,on?'1':'0')}catch(e){}on?play():pause();document.dispatchEvent(new CustomEvent('chillmusic',{detail:on}))},
    toggle(){this.set(!on);return on}
  };
})();
