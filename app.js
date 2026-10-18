'use strict';
(function(){
var doc=document,body=doc.body;
function $(id){return doc.getElementById(id)}

/* ---------- storage keys ---------- */
var KS='calc_s',KI='calc_i',KH='calc_h',KL='calc_lock',KG='guide_seen_v1';

/* ---------- model ---------- */
var D=[{k:'w',n:'נשים'},{k:'m',n:'גברים'},{k:'k',n:'ילדים'}],DK=['w','m','k'];
var DEF={storePct:30,dollyCap:3,shoeMode:'cartons',
 lol:{w:90,m:80,k:100},bar:{w:60,m:50,k:60},shoeLol:{w:5,m:5,k:5},shoeItems:{w:60,m:60,k:60},
 ipp:{w:600,m:600,k:600},pctC:{w:null,m:null,k:null},pctS:{w:null,m:null,k:null}};
var GROUPS=['lol','bar','shoeLol','shoeItems','ipp','pctC','pctS'];
var IKEY=/^(date|(c|h|f|t|sc|si|st)_(w|m|k))$/;
var SKEY=/^(storePct|dollyCap|(lol|bar|shoeLol|shoeItems|ipp|pctC|pctS)\.(w|m|k))$/;
var NUMSTR=/^-?(\d+\.?\d*|\.\d+)?(e[+-]?\d+)?$/i;
var HOP=Object.prototype.hasOwnProperty;
function has(o,k){return HOP.call(o,k)}
function isObj(o){return o!==null&&typeof o==='object'&&!Array.isArray(o)}
function isNum(v){return typeof v==='number'&&isFinite(v)}
function clone(o){return JSON.parse(JSON.stringify(o))}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return '&#'+c.charCodeAt(0)+';'})}
function readJSON(k){try{var v=localStorage.getItem(k);return v==null?null:JSON.parse(v)}catch(e){return null}}
function cleanStr(v,max){return typeof v==='string'&&v.length<=max?v.replace(/[\u0000-\u001f\u007f]/g,''):null}

/* ---------- validation of everything read from localStorage (own keys only, closed schema) ---------- */
function okN(v){return v===null||isNum(v)}
function sanS(o){var r=clone(DEF);if(!isObj(o))return r;
 ['storePct','dollyCap'].forEach(function(k){if(has(o,k)&&okN(o[k]))r[k]=o[k]});
 if(has(o,'shoeMode')&&(o.shoeMode==='cartons'||o.shoeMode==='items'))r.shoeMode=o.shoeMode;
 GROUPS.forEach(function(g){var x=has(o,g)?o[g]:null;if(!isObj(x))return;DK.forEach(function(k){if(has(x,k)&&okN(x[k]))r[g][k]=x[k]})});
 return r}
function sanI(o){var r={};if(!isObj(o))return r;
 Object.keys(o).forEach(function(k){if(!IKEY.test(k))return;var v=o[k];
  if(k==='date'){v=cleanStr(v,40);if(v!==null)r.date=v}
  else if(typeof v==='string'&&v.length<=24&&NUMSTR.test(v))r[k]=v;
  else if(isNum(v))r[k]=v});
 return r}
function nArr(a,n){if(!Array.isArray(a)||a.length!==n)return null;for(var j=0;j<n;j++)if(!isNum(a[j]))return null;return a.slice()}
function sanR(R){if(!isObj(R)||!isObj(R.c)||!isObj(R.s))return null;
 var o={c:{},s:{},ct:nArr(R.ct,8),st:nArr(R.st,2),shoeMode:R.shoeMode==='items'?'items':'cartons'};if(!o.ct||!o.st)return null;
 for(var j=0;j<3;j++){var k=DK[j],c=has(R.c,k)?R.c[k]:null,s=has(R.s,k)?R.s[k]:null;
  if(!isObj(c)||!isObj(s))return null;
  var cv=nArr(c.v,8),sv=nArr(s.v,2);
  if(!cv||!sv||!isNum(c.cartons)||!isNum(c.hang)||!isNum(c.fold)||!isNum(c.total)||!isNum(c.pct)||!isNum(s.n)||!isNum(s.pct))return null;
  o.c[k]={cartons:c.cartons,hang:c.hang,fold:c.fold,total:c.total,pct:c.pct,v:cv};o.s[k]={n:s.n,pct:s.pct,v:sv}}
 return o}
function sanH(a){var r=[];if(!Array.isArray(a))return r;
 a.slice(0,2000).forEach(function(x){if(!isObj(x))return;
  var s=sanS(has(x,'S')?x.S:null),i=sanI(has(x,'I')?x.I:null),d=cleanStr(has(x,'date')?x.date:null,40);
  r.push({id:isNum(x.id)?x.id:0,date:d===null?'':d,I:i,S:s,R:sanR(has(x,'R')?x.R:null)||compute(s,i)})});
 return r}

var S=sanS(readJSON(KS)),I=sanI(readJSON(KI)),H=[];
function today(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function save(){try{localStorage.setItem(KS,JSON.stringify(S));localStorage.setItem(KI,JSON.stringify(I));localStorage.setItem(KH,JSON.stringify(H))}catch(e){alert('שגיאת שמירה')}}

/* ---------- calculations (unchanged) ---------- */
function part(n,pct,cap){n=+n||0;cap=+cap||0;if(!n||!cap)return 0;return Math.ceil(n*pct/(100*cap)-1e-9)}
function cd(n,cap){n=+n||0;cap=+cap||0;return n&&cap?Math.ceil(n/cap-1e-9):0}
function ppl(n,p){n=+n||0;p=+p||0;return n>0&&p>0?Math.max(1,Math.floor(n/p)):0}
function split(t,h,f){if(!t)return [0,0];if(t==1)return h>=f?[1,0]:[0,1];var s=h+f,a=t*h/s,b=t*f/s,x=Math.floor(a),y=Math.floor(b),r=t-x-y;while(r-->0){if(a-x>b-y||(a-x==b-y&&h>=f))x++;else y++}if(h>0&&!x){x=1;y--}if(f>0&&!y){y=1;x--}return [x,y]}
function pct(kind,k,s){s=s||S;var o=s[kind]&&s[kind][k];return Math.min(100,Math.max(0,(o===null||o===''||o===undefined)?+s.storePct:+o))}
var CL=['דולי','בארות ליקוט','לול ליקוט','באפר תלייה','באפר קיפול','כוח אדם'],SL=['לול ליקוט','לול באפר'],CLX=CL.concat(['כ״א תלייה','כ״א קיפול']);
function compute(s,i){var R={c:{},s:{},ct:[0,0,0,0,0,0,0,0],st:[0,0],shoeMode:s.shoeMode};
 D.forEach(function(d){var k=d.k,c=+i['c_'+k]||0,h=+i['h_'+k]||0,f=+i['f_'+k]||0,sp=pct('pctC',k,s),wp=100-sp;
  var v=[cd(c,s.dollyCap),part(h,sp,s.bar[k]),part(f,sp,s.lol[k]),part(h,wp,s.bar[k]),part(f,wp,s.lol[k]),ppl(h+f,s.ipp[k])];v=v.concat(split(v[5],h,f));
  R.c[k]={cartons:c,hang:h,fold:f,total:+i['t_'+k]||0,pct:sp,v:v};v.forEach(function(x,j){R.ct[j]+=x});
  var it=s.shoeMode=='items',n=+(it?i['si_'+k]:i['sc_'+k])||0,cap=it?s.shoeItems[k]:s.shoeLol[k],p2=pct('pctS',k,s);
  var w=[part(n,p2,cap),part(n,100-p2,cap)];R.s[k]={n:n,pct:p2,v:w};w.forEach(function(x,j){R.st[j]+=x})});
 return R}
H=sanH(readJSON(KH));

/* ---------- rendering (all stored values escaped) ---------- */
function inp(id,l){return '<label>'+l+'<input type="number" inputmode="numeric" min="0" data-i="'+id+'" value="'+(I[id]==null?'':esc(I[id]))+'"></label>'}
function outs(id,ls){return '<div class="outs">'+ls.map(function(l,j){return '<div class="o"><b id="'+id+j+'">0</b><span>'+l+'</span></div>'}).join('')+'</div>'}
function rows(fn){var r='';D.forEach(function(d){r+=fn(d)});return r}
function srow(l,p,ph){return '<div class="row">'+l+'<input type="number" data-s="'+p+'"'+(ph?' placeholder="'+esc(ph)+'"':'')+'></div>'}
function build(){
 var it=S.shoeMode=='items';
 $('pc').innerHTML=rows(function(d){return '<div class="dept d'+d.k+'"><div class="dh">'+d.n+'</div><div class="ins">'+inp('c_'+d.k,'קרטונים')+inp('h_'+d.k,'פריטי תלייה')+inp('f_'+d.k,'פריטי קיפול')+'</div><div class="ref" id="ref'+d.k+'"></div>'+outs('oc'+d.k,CL)+'</div>'})
  +'<div class="total"><div class="dh">סה״כ</div>'+outs('oct',CL)+'</div><button type="button" class="btn clr">ניקוי נתונים</button>';
 $('ps').innerHTML=rows(function(d){return '<div class="dept shoe d'+d.k+'"><div class="dh">'+d.n+'</div><div class="ins">'+inp((it?'si_':'sc_')+d.k,it?'כמות פריטים':'קרטונים')+(it?'<label>פריטים ללול<input type="number" inputmode="numeric" min="0" data-s="shoeItems.'+d.k+'" value="'+(S.shoeItems[d.k]==null?'':esc(S.shoeItems[d.k]))+'"></label>':'')+'</div><div class="ref" id="sref'+d.k+'"></div>'+outs('os'+d.k,SL)+'</div>'})
  +'<div class="total shoe"><div class="dh">סה״כ</div>'+outs('ost',SL)+'</div><button type="button" class="btn clr">ניקוי נתונים</button>';
 $('dacc').innerHTML=rows(function(d){return '<details><summary>'+d.n+'</summary><div class="acc"><div class="sub2">ביגוד</div>'+srow('אחוז חנות','pctC.'+d.k,S.storePct)+srow('פריטים ללול (קיפול)','lol.'+d.k)+srow('פריטים לבר (תלייה)','bar.'+d.k)+srow('פריטים לאדם','ipp.'+d.k)+'<div class="sub2">נעליים</div>'+srow('אחוז חנות','pctS.'+d.k,S.storePct)+'</div></details>'});
 $('ss').innerHTML=rows(function(d){return '<div class="sub2">'+d.n+'</div>'+srow('קרטונים ללול','shoeLol.'+d.k)+srow('פריטים ללול','shoeItems.'+d.k)});
 doc.querySelectorAll('[data-s]').forEach(function(e){var v=getS(e.dataset.s);e.value=v==null?'':v});
 doc.querySelectorAll('#mode button').forEach(function(b){b.classList.toggle('on',b.dataset.m==S.shoeMode)});
 if(!I.date)I.date=today();$('date').value=I.date;
 calc()}
function getS(p){var a=p.split('.');return a.length>1?S[a[0]][a[1]]:S[p]}
function setS(p,v){var a=p.split('.');if(a.length>1)S[a[0]][a[1]]=v;else S[p]=v}
function pplTxt(id,v,h,f){var e=$(id+'5').nextElementSibling;var t='כוח אדם';if(v[5])t+='<br>תלייה '+(+v[6]||0)+' · קיפול '+(+v[7]||0);if(v[5]==1&&h!=null)t+='<br>בעיקר '+(h>=f?'תלייה':'קיפול');e.innerHTML=t;e.title='כוח אדם: '+v[5]+' (תלייה '+(v[6]||0)+' · קיפול '+(v[7]||0)+')'}
function calc(){var R=compute(S,I);$('wh').value=100-Math.min(100,Math.max(0,+S.storePct||0));
 D.forEach(function(d){var k=d.k,c=R.c[k];c.v.slice(0,6).forEach(function(x,j){$('oc'+k+j).textContent=x});pplTxt('oc'+k,c.v,c.hang,c.fold);
  R.s[k].v.forEach(function(x,j){$('os'+k+j).textContent=x});
  var r='';if(c.total){var sum=c.hang+c.fold;r='סה״כ פריטים לפי צפי: '+esc(c.total);if((c.hang||c.fold)&&sum!=c.total)r+=' · <span class="warn">תלייה+קיפול = '+esc(sum)+' (פער '+esc(sum-c.total)+')</span>'}
  if(c.pct!=+S.storePct)r+=(r?' · ':'')+'חנות '+esc(c.pct)+'%';$('ref'+k).innerHTML=r;
  var st=I['st_'+k],r2=st&&S.shoeMode=='cartons'?'סה״כ פריטים לפי צפי: '+esc(st):'';if(R.s[k].pct!=+S.storePct)r2+=(r2?' · ':'')+'חנות '+esc(R.s[k].pct)+'%';$('sref'+k).innerHTML=r2});
 R.ct.slice(0,6).forEach(function(x,j){$('oct'+j).textContent=x});pplTxt('oct',R.ct);
 R.st.forEach(function(x,j){$('ost'+j).textContent=x});
 save();return R}

/* ---------- events (delegated; no inline handlers) ---------- */
doc.addEventListener('input',function(e){var t=e.target,d=t.dataset;if(!d)return;
 if(d.i&&IKEY.test(d.i)&&d.i!=='date'){I[d.i]=t.value;calc()}
 else if(d.s&&SKEY.test(d.s)){var o=/^pct[CS]\./.test(d.s);setS(d.s,t.value===''?(o?null:0):+t.value);doc.querySelectorAll('[data-s="'+d.s+'"]').forEach(function(x){if(x!==t)x.value=t.value});calc()}});
$('date').addEventListener('change',function(){I.date=$('date').value;save()});
doc.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('button');if(!t||t.closest('#guide,#lock,#lkBox,#hl'))return;var d=t.dataset;
 if(t.classList.contains('clr')){if(confirm('לנקות את כל הנתונים?')){I={date:I.date};build()}return}
 if(d.m){S.shoeMode=d.m==='items'?'items':'cartons';build();return}
 if(d.p){go(+d.p);return}
 if(d.go==='hist'){show('hist');return}
 if(d.nav){body.classList.remove('menu');go(+d.nav);return}
 if(d.close==='hist'){body.classList.remove('hist');return}
 switch(t.id){
  case 'burger':body.classList.add('menu');break;
  case 'xclose':body.classList.remove('menu');break;
  case 'reset':if(confirm('לאפס הגדרות?')){S=clone(DEF);build()}break;
  case 'bSave':saveShipment();break}});
$('veil').addEventListener('click',function(){body.classList.remove('menu')});
function show(s){body.classList.remove('menu','hist');body.classList.add(s);if(s=='hist')renderHist()}
function go(p){var pg=$('pager');pg.scrollTo({left:-p*pg.clientWidth,behavior:'smooth'})}
function upd(){var pg=$('pager'),p=Math.round(Math.abs(pg.scrollLeft)/pg.clientWidth);$('ind').style.right=(p*50)+'%';
 doc.querySelectorAll('.tabs button').forEach(function(b){b.classList.toggle('on',+b.dataset.p==p)})}
$('pager').addEventListener('scroll',upd);

/* ---------- history ---------- */
function saveShipment(){var d=prompt('תאריך המשלוח',I.date||today());if(d===null)return;d=cleanStr(d,40)||today();
 H.unshift({id:Date.now(),date:d,I:clone(I),S:clone(S),R:compute(S,I)});save();alert('המשלוח נשמר')}
function tables(R){var h='<table><tr><th>מחלקה</th><th>קרטונים</th><th>תלייה</th><th>קיפול</th>'+CLX.map(function(l){return '<th>'+l+'</th>'}).join('')+'</tr>';
 D.forEach(function(d){var c=R.c[d.k];h+='<tr><td>'+d.n+'</td><td>'+esc(c.cartons)+'</td><td>'+esc(c.hang)+'</td><td>'+esc(c.fold)+'</td>'+[0,1,2,3,4,5,6,7].map(function(j){return '<td>'+esc(c.v[j]||0)+'</td>'}).join('')+'</tr>'});
 var t=[0,0,0];D.forEach(function(d){t[0]+=R.c[d.k].cartons;t[1]+=R.c[d.k].hang;t[2]+=R.c[d.k].fold});
 h+='<tr class="tot"><td>סה״כ</td>'+t.concat([0,1,2,3,4,5,6,7].map(function(j){return R.ct[j]||0})).map(function(x){return '<td>'+esc(x)+'</td>'}).join('')+'</tr></table>';
 var it=R.shoeMode=='items';h+='<h3>נעליים</h3><table><tr><th>מחלקה</th><th>'+(it?'פריטים':'קרטונים')+'</th><th>לול ליקוט</th><th>לול באפר</th></tr>';
 var n=0;D.forEach(function(d){var s=R.s[d.k];n+=s.n;h+='<tr><td>'+d.n+'</td><td>'+esc(s.n)+'</td><td>'+esc(s.v[0])+'</td><td>'+esc(s.v[1])+'</td></tr>'});
 return h+'<tr class="tot"><td>סה״כ</td><td>'+esc(n)+'</td><td>'+esc(R.st[0])+'</td><td>'+esc(R.st[1])+'</td></tr></table>'}
function renderHist(){$('hl').innerHTML=H.length?H.map(function(x,i){var R=x.R;return '<div class="hi" id="h'+i+'"><div class="t"><span>'+esc(x.date)+'</span><span>קרטונים '+esc(D.reduce(function(a,d){return a+R.c[d.k].cartons},0))+' · דולי '+esc(R.ct[0])+'</span></div><div class="acts"><button type="button" class="lnk" data-hv="'+i+'">צפייה</button><button type="button" class="lnk" data-hl="'+i+'">טעינה</button><button type="button" class="lnk" data-hd="'+i+'">מחיקה</button></div><div class="det"><h3>ביגוד</h3>'+tables(R)+'</div></div>'}).join(''):'<p class="note empty">אין משלוחים שמורים.</p>'}
$('hl').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var d=b.dataset,i;
 if(d.hv!=null){i=+d.hv;var el=$('h'+i);if(el)el.classList.toggle('open')}
 else if(d.hl!=null){i=+d.hl;if(H[i]&&confirm('לטעון משלוח זה? הנתונים הנוכחיים יוחלפו')){var x=H[i];I=sanI(clone(x.I));I.date=x.date;S=sanS(clone(x.S));build();body.classList.remove('hist')}}
 else if(d.hd!=null){i=+d.hd;if(H[i]&&confirm('למחוק?')){H.splice(i,1);save();renderHist()}}});

/* ---------- modal layering: lock > guide > app ---------- */
var BG=['header','#pager','#veil','#drawer','#hist'];
function setInert(q,on){var e=doc.querySelector(q);if(!e)return;e.inert=on;if(on)e.setAttribute('aria-hidden','true');else e.removeAttribute('aria-hidden')}
function lockShown(){return !$('lock').hidden}
function syncInert(){var lk=lockShown(),g=body.classList.contains('guide');BG.forEach(function(q){setInert(q,lk||g)});setInert('#guide',lk)}

/* ---------- first-run guide ---------- */
var G=$('guide'),gtr=$('gTr'),gvp=$('gVp'),gdots=$('gDots'),gprev=$('gPrev'),gnext=$('gNext'),gnum=$('gNum'),gpanel=$('gPanel'),
 cards=gtr.children,N=cards.length,cur=0,ret=null;
$('gTot').textContent=N;
for(var j=0;j<N;j++){var b=doc.createElement('button');b.type='button';b.dataset.gd=j;b.setAttribute('aria-label','כרטיס '+(j+1)+' מתוך '+N);b.appendChild(doc.createElement('i'));gdots.appendChild(b)}
function guideSeen(){try{return !!localStorage.getItem(KG)}catch(e){return false}}
function markSeen(){try{localStorage.setItem(KG,'1')}catch(e){}}
function to(i){cur=Math.max(0,Math.min(N-1,i));gtr.style.transform='translateX('+(cur*100)+'%)';gnum.textContent=cur+1;
 for(var j=0;j<N;j++){cards[j].setAttribute('aria-hidden',j!=cur);if(j==cur)gdots.children[j].setAttribute('aria-current','step');else gdots.children[j].removeAttribute('aria-current')}
 gprev.hidden=cur==0;gnext.textContent=cur==N-1?'בואו נתחיל':'הבא';
 if(doc.activeElement===gprev&&gprev.hidden)gnext.focus()}
function openGuide(){ret=doc.activeElement;body.classList.remove('menu','hist');body.classList.add('guide');syncInert();to(0);gnext.focus()}
function closeGuide(){body.classList.remove('guide');syncInert();markSeen();
 var r=ret;if(!r||r===body||!r.isConnected||r.offsetParent===null||($('drawer').contains(r)&&!body.classList.contains('menu')))r=$('burger');
 try{r.focus()}catch(e){}}
gnext.addEventListener('click',function(){if(cur==N-1)closeGuide();else to(cur+1)});
gprev.addEventListener('click',function(){to(cur-1)});
$('gSkip').addEventListener('click',closeGuide);
gdots.addEventListener('click',function(e){var b=e.target.closest('[data-gd]');if(b)to(+b.dataset.gd)});
$('gAgain').addEventListener('click',function(){body.classList.remove('menu');openGuide()});
G.addEventListener('keydown',function(e){
 if(e.key=='Escape'){e.preventDefault();closeGuide();return}
 if(e.key=='ArrowLeft'||e.key=='ArrowRight'){e.preventDefault();to(cur+((e.key=='ArrowLeft')==(doc.dir!='ltr')?1:-1));return}
 if(e.key=='Tab'){var f=[].filter.call(G.querySelectorAll('button'),function(b){return !b.hidden&&b.offsetParent!==null});if(!f.length)return;
  var a=f[0],z=f[f.length-1];if(e.shiftKey&&(doc.activeElement===a||doc.activeElement===gpanel)){e.preventDefault();z.focus()}else if(!e.shiftKey&&doc.activeElement===z){e.preventDefault();a.focus()}else if(!G.contains(doc.activeElement)){e.preventDefault();a.focus()}}});
doc.addEventListener('focusin',function(e){if(body.classList.contains('guide')&&!lockShown()&&!G.contains(e.target))gnext.focus()});
/* swipe: RTL — next card sits to the left, so dragging right moves forward */
var x0=null,y0=0,dx=0,drag=false;
gvp.addEventListener('pointerdown',function(e){if(e.pointerType=='mouse'&&e.button)return;x0=e.clientX;y0=e.clientY;dx=0;drag=false});
gvp.addEventListener('pointermove',function(e){if(x0==null)return;dx=e.clientX-x0;var dy=e.clientY-y0;
 if(!drag&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){drag=true;gtr.style.transition='none';try{gvp.setPointerCapture(e.pointerId)}catch(_){}}
 if(drag){var d=dx;if((cur==0&&d<0)||(cur==N-1&&d>0))d/=3;gtr.style.transform='translateX(calc('+(cur*100)+'% + '+d+'px))'}});
function gEnd(){if(x0==null)return;x0=null;gtr.style.transition='';if(drag){var w=gvp.clientWidth||1;if(Math.abs(dx)>Math.min(60,w*.18))to(cur+(dx>0?1:-1));else to(cur)}drag=false}
gvp.addEventListener('pointerup',gEnd);gvp.addEventListener('pointercancel',gEnd);
to(0);

/* ---------- optional app lock: PIN as salted PBKDF2 hash + optional WebAuthn platform authenticator ---------- */
var PIN_ITER=310000,AFTERS=[0,1,5,15,60],AFT_TXT={0:'מיד',1:'אחרי דקה',5:'אחרי 5 דקות',15:'אחרי 15 דקות',60:'אחרי שעה'};
var TE=new TextEncoder(),B64RE=/^[A-Za-z0-9+\/]+={0,2}$/;
var B64={e:function(b){var u=new Uint8Array(b),s='';for(var i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)},d:function(s){return Uint8Array.from(atob(s),function(c){return c.charCodeAt(0)})}};
var cryptoOK=!!(window.crypto&&crypto.subtle&&window.isSecureContext!==false);
var lkT=0,bgAt=0,started=false;
function vB64(s,max){return typeof s==='string'&&s.length>0&&s.length<=max&&B64RE.test(s)}
function isInt(v,a,b){return isNum(v)&&Math.floor(v)===v&&v>=a&&v<=b}
function getLock(){var o=readJSON(KL);if(!isObj(o)||o.on!==1||!vB64(o.salt,64)||!vB64(o.hash,64))return null;
 return {on:1,salt:o.salt,hash:o.hash,it:isInt(o.it,100000,5000000)?o.it:PIN_ITER,after:AFTERS.indexOf(o.after)>=0?o.after:0,
  cred:vB64(o.cred,1400)?o.cred:null,fails:isInt(o.fails,0,1e6)?o.fails:0,until:isNum(o.until)&&o.until>0?Math.min(o.until,Date.now()+900000):0}}
function setLock(o){try{if(o)localStorage.setItem(KL,JSON.stringify(o));else localStorage.removeItem(KL)}catch(e){}}
function okPin(p){return /^[0-9]{4,6}$/.test(p)}
function pinHash(pin,salt,it){return crypto.subtle.importKey('raw',TE.encode(pin),'PBKDF2',false,['deriveBits']).then(function(k){return crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:B64.d(salt),iterations:it},k,256)}).then(B64.e)}
function sameStr(a,b){if(a.length!==b.length)return false;var r=0;for(var i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}
function checkPin(pin){var o=getLock();if(!o)return Promise.resolve(true);return pinHash(pin,o.salt,o.it).then(function(h){return sameStr(h,o.hash)})}
function newPinRec(p){var salt=B64.e(crypto.getRandomValues(new Uint8Array(16)));return pinHash(p,salt,PIN_ITER).then(function(h){return {salt:salt,hash:h,it:PIN_ITER}})}
function bioAvail(){try{if(!location.hostname||!window.PublicKeyCredential||!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)return Promise.resolve(false);return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(function(a){return !!a},function(){return false})}catch(e){return Promise.resolve(false)}}
function failDelay(o){o.fails=(o.fails||0)+1;if(o.fails>=3)o.until=Date.now()+Math.min(5*Math.pow(2,o.fails-3),900)*1000}
function waitTxt(s){return 'יותר מדי ניסיונות שגויים. אפשר לנסות שוב בעוד '+s+' שניות.'}
function wrongTxt(n){return n>0?'קוד שגוי. נותרו '+n+' ניסיונות לפני השהיה.':'קוד שגוי.'}

/* lock screen */
function wipeDom(){['pc','ps','hl','dacc','ss'].forEach(function(id){$(id).innerHTML=''});$('date').value='';body.classList.remove('menu','hist')}
function lockNow(){var o=getLock();if(!o||lockShown())return;
 wipeDom();doc.documentElement.classList.remove('pb');
 var lk=$('lock');lk.hidden=false;$('lockPin').value='';$('lockMsg').textContent='';$('lockForgot').hidden=true;$('lockForgotBtn').setAttribute('aria-expanded','false');
 $('lockBio').hidden=true;bioAvail().then(function(a){$('lockBio').hidden=!(a&&o.cred)});
 syncInert();lockTick();setTimeout(function(){if(!$('lockPin').disabled)$('lockPin').focus()},40)}
function unlockDone(){var o=getLock();if(o){o.fails=0;o.until=0;setLock(o)}clearTimeout(lkT);bgAt=0;$('lock').hidden=true;$('lockPin').value='';syncInert();ready()}
function lockTick(){var o=getLock();clearTimeout(lkT);if(!o)return;var w=Math.ceil(((o.until||0)-Date.now())/1000),b=$('lockGo'),p=$('lockPin');
 if(w>0){b.disabled=true;p.disabled=true;$('lockMsg').textContent=waitTxt(w);lkT=setTimeout(lockTick,1000)}
 else if(b.disabled){b.disabled=false;p.disabled=false;$('lockMsg').textContent='';p.focus()}}
var busy=false;
function tryUnlock(){var o=getLock();if(!o){unlockDone();return}if(busy)return;if((o.until||0)>Date.now()){lockTick();return}var pin=$('lockPin').value;
 if(!okPin(pin)){$('lockMsg').textContent='צריך להזין קוד של 4–6 ספרות.';$('lockPin').focus();return}
 if(!cryptoOK){$('lockMsg').textContent='הדפדפן הזה לא תומך בבדיקת הקוד.';return}
 var b=$('lockGo');busy=true;b.disabled=true;b.textContent='בודק…';
 checkPin(pin).then(function(ok){busy=false;b.textContent='פתיחה';b.disabled=false;if(ok){unlockDone();return}
  failDelay(o);setLock(o);$('lockPin').value='';if(o.fails>=3)lockTick();else{$('lockMsg').textContent=wrongTxt(3-o.fails);$('lockPin').focus()}},
 function(){busy=false;b.textContent='פתיחה';b.disabled=false;$('lockMsg').textContent='שגיאה בבדיקת הקוד. נסו שוב.'})}
function bioUnlock(){var o=getLock();if(!o||!o.cred)return;
 navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id:B64.d(o.cred)}],userVerification:'required',timeout:60000}})
 .then(function(c){if(c)unlockDone();else throw 0}).catch(function(){$('lockMsg').textContent='הזיהוי לא הצליח. אפשר להזין את הקוד.';$('lockPin').focus()})}
function wipeAll(){[KS,KI,KH,KL,KG].forEach(function(k){try{localStorage.removeItem(k)}catch(e){}})}
$('lockGo').addEventListener('click',tryUnlock);
$('lockPin').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();tryUnlock()}});
$('lockBio').addEventListener('click',bioUnlock);
$('lockForgotBtn').addEventListener('click',function(){var f=$('lockForgot'),o=f.hidden;f.hidden=!o;this.setAttribute('aria-expanded',String(o));if(o)$('lockErase').focus()});
$('lockErase').addEventListener('click',function(){if(!confirm('למחוק את כל הנתונים של המחשבון במכשיר הזה? אי אפשר לבטל את הפעולה.'))return;wipeAll();location.reload()});
$('lock').addEventListener('keydown',function(e){if(e.key==='Escape')e.preventDefault()});
doc.addEventListener('visibilitychange',function(){var o=getLock();if(!o)return;
 if(doc.hidden){if(lockShown())return;bgAt=Date.now();if(!(o.after>0))lockNow();else doc.documentElement.classList.add('pb')}
 else{doc.documentElement.classList.remove('pb');if(bgAt&&Date.now()-bgAt>=(o.after||0)*60000)lockNow();bgAt=0}});

/* lock settings (inside the settings drawer) */
function pinField(id,label){return '<label class="lf" for="'+id+'">'+label+'</label><input class="pin" id="'+id+'" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off">'}
function afterSel(v){return '<fieldset class="aft"><legend class="lf">נעילה אחרי יציאה מהאפליקציה</legend>'+AFTERS.map(function(m){return '<label><input type="radio" name="lkAfter" value="'+m+'"'+(m===v?' checked':'')+'><span>'+AFT_TXT[m]+'</span></label>'}).join('')+'</fieldset>'}
function afterVal(){var r=doc.querySelector('#lkBox input[name="lkAfter"]:checked'),v=r?+r.value:0;return AFTERS.indexOf(v)>=0?v:0}
function focusId(id){var e=id==='lkAfter'?doc.querySelector('#lkBox input[name="lkAfter"]:checked'):$(id);if(e)e.focus()}
function lkMsg(m,ok,f){var e=$('lkMsg');if(!e)return;e.textContent=m;e.classList.toggle('ok',!!ok);if(f)focusId(f)}
function renderLock(msg,ok,f){var o=getLock(),bx=$('lkBox');
 if(!cryptoOK){bx.innerHTML='<p class="note">הנעילה לא זמינה בדפדפן הזה (נדרש חיבור מאובטח).</p>';return}
 bx.innerHTML=o?
  '<p class="note"><b>הנעילה פעילה.</b> הקוד נשמר רק כגיבוב מוצפן במכשיר הזה. הנעילה היא מסך פרטיות ולא הצפנה של הנתונים.</p>'+afterSel(o.after)+
  '<div id="bioBox"></div><div class="sub2">שינוי או ביטול הקוד</div>'+pinField('lkCur','הקוד הנוכחי')+pinField('lkP1','קוד חדש (4–6 ספרות)')+pinField('lkP2','הקלדה חוזרת של הקוד החדש')+
  '<p class="lkmsg" id="lkMsg" role="alert"></p><button type="button" class="btn" id="lkChange">שינוי קוד</button><button type="button" class="btn ghost danger" id="lkOff">ביטול הנעילה</button><button type="button" class="btn ghost" id="lkNow">נעילה עכשיו</button>'
 :'<p class="note">הנעילה כבויה. אפשר לנעול את המחשבון בקוד של 4–6 ספרות, ובמכשירים תומכים גם ב-Face ID. אם שוכחים את הקוד, האפשרות היחידה היא למחוק את הנתונים במכשיר.</p>'+
  pinField('lkP1','קוד חדש (4–6 ספרות)')+pinField('lkP2','הקלדה חוזרת של הקוד')+afterSel(1)+'<p class="lkmsg" id="lkMsg" role="alert"></p><button type="button" class="btn" id="lkOn">הפעלת נעילה</button>';
 if(msg)lkMsg(msg,ok);
 if(f)focusId(f);
 if(o)bioAvail().then(function(a){var b=$('bioBox');if(!b)return;
  b.innerHTML=!a?'<p class="note">Face ID לא זמין בדפדפן או במכשיר הזה. הנעילה עובדת עם הקוד.</p>':o.cred?'<p class="note">פתיחה עם Face ID פעילה. הקוד תמיד נשאר כגיבוי.</p><button type="button" class="btn ghost" id="bioOff">ביטול Face ID</button>':'<button type="button" class="btn ghost" id="bioOn">הפעלת Face ID</button>'})}
function verifyCur(){var o=getLock();if(!o)return Promise.resolve(false);if((o.until||0)>Date.now()){lkMsg(waitTxt(Math.ceil((o.until-Date.now())/1000)));return Promise.resolve(false)}
 var c=$('lkCur').value;if(!okPin(c)){lkMsg('צריך להזין את הקוד הנוכחי.',false,'lkCur');return Promise.resolve(false)}
 return checkPin(c).then(function(ok){var o2=getLock();if(!o2)return false;if(ok){o2.fails=0;o2.until=0;setLock(o2);return true}failDelay(o2);setLock(o2);
  if(o2.fails>=3)lkMsg(waitTxt(Math.ceil((o2.until-Date.now())/1000)),false,'lkCur');else lkMsg(wrongTxt(3-o2.fails),false,'lkCur');$('lkCur').value='';return false})}
function lkOn(btn){var p1=$('lkP1').value,p2=$('lkP2').value;if(!okPin(p1))return lkMsg('הקוד צריך להיות 4–6 ספרות.',false,'lkP1');if(p1!==p2)return lkMsg('הקודים לא תואמים.',false,'lkP2');
 var af=afterVal();btn.disabled=true;
 newPinRec(p1).then(function(r){setLock({on:1,salt:r.salt,hash:r.hash,it:r.it,after:af,cred:null,fails:0,until:0});renderLock('הנעילה הופעלה.',true,'lkAfter')},function(){btn.disabled=false;lkMsg('שגיאה. הנעילה לא הופעלה.')})}
function lkChange(){var p1=$('lkP1').value,p2=$('lkP2').value;if(!okPin(p1))return lkMsg('הקוד החדש צריך להיות 4–6 ספרות.',false,'lkP1');if(p1!==p2)return lkMsg('הקודים החדשים לא תואמים.',false,'lkP2');
 verifyCur().then(function(ok){if(!ok)return;return newPinRec(p1).then(function(r){var o=getLock();if(!o)return;o.salt=r.salt;o.hash=r.hash;o.it=r.it;setLock(o);renderLock('הקוד שונה.',true,'lkChange')})})}
function lkOff(){verifyCur().then(function(ok){if(!ok)return;setLock(null);renderLock('הנעילה בוטלה.',true,'lkOn')})}
function bioOn(){var o=getLock();if(!o)return;
 navigator.credentials.create({publicKey:{rp:{name:'קבלת סחורה'},user:{id:crypto.getRandomValues(new Uint8Array(16)),name:'local',displayName:'קבלת סחורה'},challenge:crypto.getRandomValues(new Uint8Array(32)),
  pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'discouraged'},attestation:'none',timeout:60000}})
 .then(function(c){var o2=getLock();if(!o2||!c)throw 0;o2.cred=B64.e(c.rawId);setLock(o2);renderLock('Face ID הופעל.',true,'lkAfter')})
 .catch(function(){lkMsg('לא הצלחנו להפעיל Face ID.')})}
function bioOff(){var o=getLock();if(!o)return;o.cred=null;setLock(o);renderLock('Face ID בוטל.',true,'lkAfter')}
$('lkBox').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
 switch(b.id){case 'lkOn':lkOn(b);break;case 'lkChange':lkChange();break;case 'lkOff':lkOff();break;
  case 'lkNow':body.classList.remove('menu');lockNow();break;case 'bioOn':bioOn();break;case 'bioOff':bioOff();break}});
$('lkBox').addEventListener('change',function(e){if(e.target.name!=='lkAfter')return;var o=getLock();if(!o)return;o.after=afterVal();setLock(o);lkMsg('נשמר.',true)});
$('lkDet').addEventListener('toggle',function(){if(this.open)renderLock()});

/* ---------- boot ---------- */
function ready(){build();if(!started){started=true;if(!guideSeen())openGuide()}}
if(getLock())lockNow();else ready();
renderLock();

/* offline support: only when installed as a site (manifest present), same-origin worker */
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)&&doc.querySelector('link[rel="manifest"]'))
 window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).catch(function(){})});
})();
