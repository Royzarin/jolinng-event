/* ================= Jo City : viewers en direct (Firebase) =================
   - Lynn (hôte) ouvre la partie aux viewers depuis « Réglages de Lynn » : un code à 4 caractères s'affiche sur le jeu.
   - Les viewers vont sur jolinng-event.fr/jo-city/, entrent pseudo + code + couleur de chat, et rejoignent le monde de Lynn.
   - Chaque viewer joue son chat sur sa propre machine ; les paliers, le chrono et la difficulté suivent la partie de Lynn.
   - Lynn (donc le live) voit tous les chats ; chaque viewer voit son chat et Lynn.
   Données : rooms/city-XXXX/state (partie), /lynn (position de Lynn), /p/<id> (position de chaque chat). */
(function(){
const CFG={apiKey:"AIzaSyAvhkSelGSbm9RB5r4Zd7zvn_9kmHverEQ",authDomain:"jolinng-event.firebaseapp.com",databaseURL:"https://jolinng-event-default-rtdb.europe-west1.firebasedatabase.app",projectId:"jolinng-event",storageBucket:"jolinng-event.firebasestorage.app",messagingSenderId:"457590429836",appId:"1:457590429836:web:4c9781aa4d14fef99e83a9"};
const CATS=['orange','bleu','blanc','rose','vert','noir'],MAX=50,HZ=6;
function db(){if(!window.firebase)return null;try{if(!firebase.apps.length)firebase.initializeApp(CFG);return firebase.database()}catch(e){return null}}
const clean=s=>String(s||'').replace(/[<>]/g,'').trim().slice(0,16);
const roomRef=code=>db().ref('rooms/city-'+code.toLowerCase());

/* ---------- Page « choisis ton monde » : formulaire pour rejoindre ---------- */
const form=document.getElementById('joinForm');
if(form){
  const err=document.getElementById('jErr');let cat='orange';
  document.querySelectorAll('.catpick').forEach(b=>b.onclick=()=>{cat=b.dataset.cat;document.querySelectorAll('.catpick').forEach(x=>x.classList.toggle('on',x===b))});
  try{const o=JSON.parse(localStorage.getItem('jcJoin')||'null');if(o){document.getElementById('jName').value=o.name||'';if(CATS.includes(o.cat)){cat=o.cat;document.querySelectorAll('.catpick').forEach(x=>x.classList.toggle('on',x.dataset.cat===cat))}}}catch(e){}
  form.onsubmit=async e=>{
    e.preventDefault();err.textContent='';
    const name=clean(document.getElementById('jName').value),code=document.getElementById('jCode').value.trim().toUpperCase();
    if(!name){err.textContent='Choisis un pseudo.';return}
    if(!/^[A-Z0-9]{4}$/.test(code)){err.textContent='Le code fait 4 caractères (il est affiché sur le live).';return}
    if(!db()){err.textContent='Connexion impossible, réessaie dans un instant.';return}
    err.textContent='Connexion…';
    try{
      const st=(await roomRef(code).child('state').once('value')).val();
      if(!st||!st.w){err.textContent='Code introuvable : vérifie le code affiché sur le live.';return}
      const n=(await roomRef(code).child('p').once('value')).numChildren();
      if(n>=MAX){err.textContent='La partie est complète (50 chats maximum).';return}
      const me={name,cat,code};try{localStorage.setItem('jcJoin',JSON.stringify({name,cat}));sessionStorage.setItem('jcMe',JSON.stringify(me))}catch(_){}
      location.href=(st.w==='pire-stream'?'pire-stream/':'ville/')+'?rejoindre='+code;
    }catch(_){err.textContent='Connexion impossible, réessaie dans un instant.'}
  };
  return;
}

/* ---------- Page d'un monde ---------- */
if(typeof game==='undefined')return;
const WORLD=location.pathname.includes('pire-stream')?'pire-stream':'ville';
let me=null;try{me=JSON.parse(sessionStorage.getItem('jcMe')||'null')}catch(e){}
const qs=new URLSearchParams(location.search).get('rejoindre');
if(!qs||!me||me.code!==qs.toUpperCase())me=null;
const VIEWER=!!me;

/* chat (ou Lynn) dessiné à une position donnée, avec son pseudo */
function drawOther(sk,cx,by,face,run,air,vy,speed,t,label,alpha){
  const S=skin(sk),ok=k=>S[k]&&S[k].im.complete&&S[k].im.naturalWidth>0;
  if(!(ok('walk')&&ok('idle')&&ok('up')&&ok('air')&&ok('down')))return;
  let k,f;
  if(air){k=vy<-4?'up':vy>3.5?'down':'air';const s=S[k];f=k==='up'?Math.max(0,Math.min(s.n-1,Math.floor((12.6+vy)/2.2))):Math.floor(t/5)%s.n}
  else if(speed>.6){k='walk';f=Math.floor(run*.55)%S.walk.n}
  else{k='idle';f=Math.floor(t/6)%S.idle.n}
  const s=S[k],w=s.im.naturalWidth/s.n,h=s.im.naturalHeight,dw=w/2,dh=h/2,fl=(sk==='lynn'&&k!=='walk')?-1:1;
  ctx.save();ctx.globalAlpha=alpha==null?1:alpha;ctx.translate(cx,by+2);ctx.scale(face*fl,1);ctx.drawImage(s.im,f*w,0,w,h,-dw/2,-dh,dw,dh);ctx.restore();
  if(label){ctx.save();ctx.font='14px "Gochi Hand","Comic Sans MS",cursive';const tw=ctx.measureText(label).width+12,y=by-dh-8;
    ctx.globalAlpha=Math.min(1,(alpha==null?1:alpha)+.1);ctx.fillStyle='rgba(255,251,233,.92)';ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(cx-tw/2,y-15,tw,19,8);ctx.fill();ctx.stroke();
    ctx.fillStyle='#111';ctx.textAlign='center';ctx.fillText(label,cx,y);ctx.restore()}
}
const posOf=()=>({x:Math.round(P.x+P.w/2),y:Math.round(P.y+P.h),f:P.face,a:P.onG?0:1,s:Math.round(Math.abs(P.vx)*10)/10,vy:Math.round(P.vy*10)/10});
function smooth(o,d){if(o.dx==null){o.dx=d.x;o.dy=d.y}o.tx=d.x;o.ty=d.y;o.f=d.f;o.a=d.a;o.s=d.s;o.vy=d.vy}
function stepSmooth(o){if(o.dx==null)return;const jump=Math.abs(o.tx-o.dx)>400;o.dx=jump?o.tx:o.dx+(o.tx-o.dx)*.3;o.dy=jump?o.ty:o.dy+(o.ty-o.dy)*.3;o.run=(o.run||0)+(o.s||0)*.09}

/* ================= HÔTE (Lynn) ================= */
if(!VIEWER){
  let code=null,ref=null,others={},gen=0,sendT=null,lastState='',live=false,err='';
  const panel=document.querySelector('.panel');
  const box=document.createElement('div');box.className='slbox';box.style.background='#fff3c2';
  box.innerHTML='<h3 style="margin:0 0 6px">Viewers : rejoindre la partie avec un code</h3><div class="row"><button class="don" id="mpOpen">Ouvrir la partie aux viewers</button><button id="mpNew">Nouveau code</button><button id="mpClose">Fermer</button><span id="mpState">Fermé</span></div><p class="note" style="margin:6px 0 0">Le code s\'affiche en bas à droite du jeu, visible sur le live. Les viewers vont sur jolinng-event.fr/jo-city/, cliquent sur « Rejoindre », entrent leur pseudo, le code et choisissent la couleur de leur chat (50 maximum). Ils jouent leur chat chez eux ; les paliers, le chrono et la difficulté suivent ta partie. Si tu changes de monde, garde le même code : les viewers te suivent.</p>';
  if(panel)panel.insertBefore(box,panel.firstChild);
  const stEl=()=>document.getElementById('mpState');
  function status(){if(!stEl())return;stEl().style.color=err?'#d11':'';stEl().textContent=err?err:!code?'Fermé':!live?`Connexion… (code ${code})`:`Ouvert · code ${code} · ${Object.keys(others).length} chat${Object.keys(others).length>1?'s':''}`}
  function newCode(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c='';for(let i=0;i<4;i++)c+=A[Math.floor(Math.random()*A.length)];return c}
  async function open(c){
    await close(true);code=c;live=false;err='';try{localStorage.setItem('jcHostCode',code)}catch(e){}status();
    if(!db()){err='Connexion à Firebase impossible (internet coupé ?)';status();return}
    ref=roomRef(code);
    const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),8000));
    try{await Promise.race([Promise.all([ref.child('state').set(stateObj()),ref.child('lynn').set(posOf())]),timeout])}
    catch(e){ref=null;err=String(e&&e.message).includes('timeout')?'Firebase ne répond pas : vérifie internet, puis réessaie.':'Refusé par Firebase : publie les nouvelles règles (fichier firebase-rules.json), puis réessaie.';status();return}
    live=true;
    ref.child('state').onDisconnect().remove();ref.child('lynn').onDisconnect().remove();
    const P_=ref.child('p');
    P_.on('child_added',s=>{const d=s.val()||{};const o=others[s.key]={n:clean(d.n)||'Chat',c:CATS.includes(d.c)?d.c:'orange',k:d.k};smooth(o,d);status()});
    P_.on('child_changed',s=>{const d=s.val()||{},o=others[s.key];if(!o)return;smooth(o,d);o.k=d.k});
    P_.on('child_removed',s=>{delete others[s.key];status()});
    sendT=setInterval(tick,1000/HZ);status();
  }
  async function close(keepCode){
    clearInterval(sendT);sendT=null;
    if(ref){try{ref.child('p').off();await ref.child('state').onDisconnect().cancel();await ref.child('lynn').onDisconnect().cancel();await ref.remove()}catch(e){}}
    ref=null;others={};live=false;err='';if(!keepCode){code=null;try{localStorage.removeItem('jcHostCode')}catch(e){}}status();
  }
  function stateObj(){
    return{w:WORLD,st:game.started?1:0,win:game.win?1:0,lost:game.lost?1:0,lvl:LEVEL,left:Math.round(game.left),stage:game.stage,gen,
      d:gates.map(g=>g.done?1:0).join(''),r:gates.map(g=>g.revealed===false?0:1).join(''),
      al:game.alert?{w:clean(game.alert.who),a:game.alert.amount,id:game.alertId||0}:null};
  }
  function tick(){
    if(!ref)return;
    ref.child('lynn').set(posOf()).catch(()=>{});
    const s=stateObj(),j=JSON.stringify({...s,left:Math.floor(s.left/30)});
    if(j!==lastState||game.t%60<10){lastState=j;ref.child('state').set(s).catch(()=>{})}
  }
  document.getElementById('mpOpen').onclick=()=>{let c=null;try{c=localStorage.getItem('jcHostCode')}catch(e){}open(c||newCode())};
  document.getElementById('mpNew').onclick=()=>open(newCode());
  document.getElementById('mpClose').onclick=()=>close(false);
  // si la partie était ouverte avant (changement de monde ou rechargement), on la rouvre avec le même code
  try{if(localStorage.getItem('jcHostCode'))setTimeout(()=>open(localStorage.getItem('jcHostCode')),600)}catch(e){}
  // compteur de parties (R) et identifiant des alertes de don
  const _build=buildLevel;buildLevel=function(){_build.apply(this,arguments);gen++};
  const _donate=donate;donate=function(a,w){game.alertId=(game.alertId||0)+1;return _donate.apply(this,arguments)};
  // dessin des chats des viewers derrière Lynn
  const _hero=drawHero;drawHero=function(){
    const t=game.t;for(const id in others){const o=others[id];stepSmooth(o);if(o.dx==null)continue;if(Math.abs(o.dx-(cam.x+W/2))>W)continue;drawOther(o.c,o.dx,o.dy,o.f||1,o.run||0,!!o.a,o.vy||0,o.s||0,t,o.n,o.k?.35:.92)}
    return _hero.apply(this,arguments);
  };
  // code affiché sur le jeu (visible sur le live)
  const _render=render;render=function(){
    _render.apply(this,arguments);if(!code)return;
    ctx.save();const n=Object.keys(others).length,t1=`CODE : ${code}`,t2=err?'code inactif : voir le menu ☰':!live?'connexion…':`jolinng-event.fr/jo-city · ${n} chat${n>1?'s':''}`;
    ctx.font='30px "Caveat Brush","Comic Sans MS",cursive';const w1=ctx.measureText(t1).width;ctx.font='14px "Gochi Hand","Comic Sans MS",cursive';const bw=Math.max(w1,ctx.measureText(t2).width)+28;
    const x=W-bw-14,y=H-120;ctx.fillStyle=err?'#ff8a8a':'#ffdf00';ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(x,y,bw,58,10);ctx.fill();ctx.stroke();
    ctx.fillStyle='#111';ctx.textAlign='center';ctx.font='30px "Caveat Brush","Comic Sans MS",cursive';ctx.fillText(t1,x+bw/2,y+30);ctx.font='14px "Gochi Hand","Comic Sans MS",cursive';ctx.fillText(t2,x+bw/2,y+50);ctx.restore();
  };
  addEventListener('beforeunload',()=>{if(ref){try{ref.child('p').off()}catch(e){}}});
  return;
}

/* ================= VIEWER (un chat) ================= */
const ref=roomRef(me.code),myRef=ref.child('p').push();
let host=null,seen=false,lastName='',lynn={},gen=null,lastAlert=0,hostLeft=null,joinedAt=Date.now(),ko=false;
document.title='Jo City · '+me.name;
// pas de réglages pour les viewers
document.querySelectorAll('.panel,#gearBtn,.slbox').forEach(el=>el.style.display='none');
const top=document.querySelector('.top p');if(top)top.textContent=`Tu joues ton chat (${me.name}) dans la partie de Lynn. Flèches ou Q/D pour bouger, Espace pour sauter. Les dons du live débloquent la route !`;
// les viewers ont leurs propres vies et ne peuvent pas relancer la partie
for(const k in LEVELS)LEVELS[k].lynnLives=LEVELS[k].viewerLives;
game.lives=LEVELS[LEVEL].lynnLives;
setSkin(CATS.includes(me.cat)?me.cat:'orange');
addEventListener('keydown',e=>{if(e.code==='KeyR'||e.code==='KeyT'){e.stopImmediatePropagation()}},true);
myRef.onDisconnect().remove();
const send=()=>{const p=posOf();myRef.set({n:me.name,c:me.cat,...p,k:ko?1:0}).catch(()=>{})};
// plus de vies : le chat devient fantôme et la caméra suit Lynn (pas d'écran « perdu »)
const _lose=loseLife;loseLife=function(force){if(ko)return;if((P.inv>0&&!force)||game.win||game.lost)return;if(game.lives<=1){game.lives=0;ko=true;P.inv=1e9;if(window.SFX)SFX.lose();toast('K.O. ! Tu regardes Lynn finir la partie.');return}return _lose.apply(this,arguments)};
setInterval(send,1000/HZ);send();
ref.child('lynn').on('value',s=>{const d=s.val();if(d)smooth(lynn,d)});
ref.child('state').on('value',s=>{
  const d=s.val();
  if(!d){if(seen)toast('Lynn a fermé la partie.');host=null;return}
  seen=true;
  if(d.w&&d.w!==WORLD){location.href='../'+(d.w==='pire-stream'?'pire-stream/':'ville/')+'?rejoindre='+me.code;return}
  if(d.lvl&&LEVELS[d.lvl]&&LEVEL!==d.lvl){LEVEL=d.lvl;if(!d.st)game.lives=LEVELS[LEVEL].lynnLives}
  if(gen!==null&&d.gen!==gen){buildLevel();setSkin(me.cat);ko=false;toast('Lynn relance la partie !')}
  gen=d.gen;host=d;hostLeft=d.left;
  if(d.al&&d.al.id&&d.al.id!==lastAlert){if(lastAlert||Date.now()-joinedAt>3000){game.alert={who:d.al.w,amount:d.al.a};game.alertT=200;lastName=d.al.w;if(window.SFX)SFX.coin()}lastAlert=d.al.id}
});
// avant chaque image : on recopie l'état de la partie de Lynn
const _step=step;step=function(){
  game.started=true; // l'écran de départ classique est remplacé par celui des viewers
  if(!host||!host.st){if(typeof keys!=='undefined')for(const k in keys)keys[k]=false;game.t++;return}
  if(host){
    if(hostLeft!=null){if(game.started&&!game.win&&!game.lost)hostLeft=Math.max(3,hostLeft-1);game.left=hostLeft}
    gates.forEach((g,i)=>{if(host.r[i]==='1')g.revealed=true;if(host.d[i]==='1'&&!g.done){g.revealed=true;try{unlock(g,lastName||'la commu')}catch(e){g.done=true;if(g.solid)g.solid.dead=true}}});
    while(game.stage<host.stage)game.stage++;
    if(host.win&&!game.win){game.win=true;game.winT=0;if(typeof celebrate==='function')celebrate('BRAVO !')}
    if(host.lost&&!game.lost){game.lost=true;game.lostT=0;game.lostWhy='time'}
  }
  return _step.apply(this,arguments);
};
// Lynn dessinée devant les décors, le chat du viewer par-dessus
const _hero=drawHero;drawHero=function(){
  stepSmooth(lynn);if(lynn.dx!=null)drawOther('lynn',lynn.dx,lynn.dy,lynn.f||1,lynn.run||0,!!lynn.a,lynn.vy||0,lynn.s||0,game.t,'Lynn',.95);
  if(ko)return;
  _hero.apply(this,arguments);
  ctx.save();ctx.font='14px "Gochi Hand","Comic Sans MS",cursive';const tw=ctx.measureText(me.name).width+12,cx=P.x+P.w/2,y=P.y-26;ctx.fillStyle='#ffdf00';ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(cx-tw/2,y-15,tw,19,8);ctx.fill();ctx.stroke();ctx.fillStyle='#111';ctx.textAlign='center';ctx.fillText(me.name,cx,y);ctx.restore();
};
// écrans propres aux viewers
const _render=render;render=function(){
  game.started=true;
  // K.O. : la caméra suit Lynn
  if(ko&&lynn.dx!=null)cam.x=Math.max(-300,lynn.dx-W*.38);
  _render.apply(this,arguments);
  ctx.save();ctx.textAlign='center';
  const box=(t1,t2,col)=>{ctx.fillStyle='rgba(13,26,38,.6)';ctx.fillRect(0,0,W,H);ctx.font='64px "Caveat Brush","Comic Sans MS",cursive';ctx.lineWidth=8;ctx.strokeStyle='#111';ctx.strokeText(t1,W/2,H/2-10);ctx.fillStyle=col;ctx.fillText(t1,W/2,H/2-10);ctx.font='22px "Gochi Hand","Comic Sans MS",cursive';ctx.fillStyle='#fff';ctx.fillText(t2,W/2,H/2+30)};
  if(!host)box('CONNEXION…',`Code ${me.code} · si ça dure, vérifie le code sur le live`,'#ffdf00');
  else if(!host.st)box('PRÊT·E !',`Tu es ${me.name}. Attends que Lynn lance la partie…`,'#ffdf00');
  else if(ko&&!host.lost&&!host.win){ctx.font='26px "Caveat Brush","Comic Sans MS",cursive';ctx.lineWidth=6;ctx.strokeStyle='#111';ctx.strokeText('K.O. ! Tu regardes Lynn finir la partie',W/2,H-80);ctx.fillStyle='#ffdf00';ctx.fillText('K.O. ! Tu regardes Lynn finir la partie',W/2,H-80)}
  ctx.restore();
};
addEventListener('beforeunload',()=>{try{myRef.remove()}catch(e){}});
})();
