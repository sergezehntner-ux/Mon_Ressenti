'use strict';
const DB='mon-ressenti-sz', STORE='records', VER=1;let db,page='home',editing=null,filter='all',returnPage='home',returnScroll=0,formData=[];const $=s=>document.querySelector(s);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const nowLocal=()=>{let d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};const dateLocal=()=>nowLocal().slice(0,10);const fmt=d=>new Date(d+'T12:00:00').toLocaleDateString('fr-CH',{day:'numeric',month:'short',year:'numeric'});const intensity=['Brûlure','Picotements','Décharges électriques','Tranchant','Élancement','Pression','Engourdissement','Autre'];const aggrav=['Toucher léger / tissu','Mouvement','Activité','Voiture','Stress','Froid','Chaleur'];const relief=['Repos','Sommeil','Froid','Chaleur','Médicament','Distraction','Autre'];const activities=['Préparer un repas','Tâches ménagères','Sortir','Voir des proches','Activité agréable','Travail / bénévolat','Repos','Sommeil paisible'];
function openDB(){return new Promise((ok,no)=>{let r=indexedDB.open(DB,VER);r.onupgradeneeded=()=>{let s=r.result.createObjectStore(STORE,{keyPath:'id'});s.createIndex('when','when')};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}function tx(mode,cb){return new Promise((ok,no)=>{let t=db.transaction(STORE,mode),s=t.objectStore(STORE);let r=cb(s);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);t.onerror=()=>no(t.error)})}const all=()=>tx('readonly',s=>s.getAll());const get=id=>tx('readonly',s=>s.get(id));const put=v=>tx('readwrite',s=>s.put(v));const del=id=>tx('readwrite',s=>s.delete(id));const uid=()=>crypto.randomUUID?crypto.randomUUID():'mr-'+Date.now()+'-'+Math.random().toString(36).slice(2);const avg=a=>a.length?(a.reduce((s,n)=>s+n,0)/a.length).toFixed(1):'—';function heading(t,sub=''){return `<h1>${t}</h1>${sub?`<p class="muted">${sub}</p>`:''}`};function buttons(page){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page))}async function show(p){page=p;buttons(p);let data=await all();formData=data;data.sort((a,b)=>b.when.localeCompare(a.when));let html=p==='home'?home(data):p==='journal'?journal(data):p==='stats'?stats(data):p==='settings'?settings():form(editing?await get(editing):null);$('#screen').innerHTML=html;wire(data);window.scrollTo(0,0)}
function dashboardCards(d){
 const groups=new Map();
 for(const x of d){const location=String(x.location||'').trim();const key=x.type==='daily'?'daily':'pain:'+location.toLocaleLowerCase('fr');if(!groups.has(key))groups.set(key,{label:x.type==='daily'?'Bilan quotidien':(location||'Sans localisation'),type:x.type,records:[]});groups.get(key).records.push(x)}
 const cards=[...groups.values()].map(g=>{const dates=[...new Set(g.records.map(x=>x.when.slice(0,10)))].sort().reverse(),current=dates[0];const previous=new Date(current+'T12:00:00');previous.setDate(previous.getDate()-1);const yesterday=[previous.getFullYear(),String(previous.getMonth()+1).padStart(2,'0'),String(previous.getDate()).padStart(2,'0')].join('-');const scores=g.records.filter(x=>x.when.slice(0,10)===current&&Number.isFinite(x.score)).map(x=>x.score),priorScores=g.records.filter(x=>x.when.slice(0,10)===yesterday&&Number.isFinite(x.score)).map(x=>x.score);const value=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null,prior=priorScores.length?priorScores.reduce((a,b)=>a+b,0)/priorScores.length:null;let symbol='—',trend='Pas de comparaison avec la veille';if(value!==null&&prior!==null){const delta=value-prior;symbol=Math.abs(delta)<0.05?'😐':((g.type==='daily'?delta>0:delta<0)?'🙂':'🫩');trend=delta>0?'Valeur en hausse depuis la veille':delta<0?'Valeur en baisse depuis la veille':'Valeur stable depuis la veille'}return {...g,current,value,symbol,trend}});
 cards.sort((a,b)=>a.type===b.type?a.label.localeCompare(b.label,'fr'):a.type==='daily'?1:-1);
 if(!cards.length)return '<div class="dashboard-no-cards">Aucun indicateur disponible.</div>';
 return `<div class="dashboard-cards" style="--count:${cards.length}" aria-label="Indicateurs par localisation">${cards.map(c=>`<div class="dashboard-card" title="${esc(c.label)} · ${esc(c.current)} · ${esc(c.trend)}"><span class="dashboard-label">${esc(c.label)}</span><span class="dashboard-value">${c.value===null?'—':c.value.toFixed(1).replace('.',',')}/10 <span class="dashboard-face">${c.symbol}</span></span></div>`).join('')}</div>`
}
function home(d){const today=dateLocal(),entries=d.filter(x=>x.when.slice(0,10)===today);return `<div class="home-screen"><section class="hero"><h1>Bonjour 👋</h1><p>Observer pour comprendre. Comprendre pour agir.</p></section><div class="card home-today"><h2>Enregistrements du jour</h2>${entries.length?entries.map(x=>item(x,true)).join(''):'<div class="empty">Aucun enregistrement aujourd’hui.</div>'}</div><div class="actions home-actions"><button class="button" data-go="new" data-type="pain">＋ Ressenti</button><button class="button secondary" data-go="new" data-type="daily">☀ Bilan du jour</button></div><section class="dashboard-bottom" aria-label="Synthèse des indicateurs">${dashboardCards(d)}</section></div>`}

function item(x){const score=Number.isFinite(x.score)?x.score+'/10':'—',dt=String(x.when||''),date=dt.slice(8,10)+'.'+dt.slice(5,7)+'.'+dt.slice(0,4),hour=/T\d{2}:\d{2}/.test(dt)?' '+dt.slice(11,16):'',label=x.type==='pain'?'Ressenti / douleur':x.type==='daily'?'Bilan quotidien / capacités':x.type,original=x.mmpOriginalFields&&typeof x.mmpOriginalFields==='object'?Object.entries(x.mmpOriginalFields).filter(([k,v])=>v!==null&&v!==undefined&&String(v).trim()).map(([k,v])=>`<div class="original"><b>${esc(k)} :</b> ${esc(v)}</div>`).join(''):'';return `<details class="entry home-entry"><summary class="home-entry-summary" title="Afficher les détails"><span class="home-entry-left"><time>${esc(date+hour)}</time><span class="home-entry-type">${label}</span></span><span class="home-entry-location">${x.type==='pain'?esc(x.location||'—'):'—'}</span><span class="home-entry-score">${score}</span></summary><div class="entry-detail">${x.note?`<p>${esc(x.note)}</p>`:''}${x.source==='mmp'?`<small class="muted">Import MMP · page ${esc(x.mmpPage||'?')} · données d'origine</small>${original}`:''}<div class="actions compact-actions"><button class="button secondary" data-edit="${esc(x.id)}">Modifier</button><button class="button secondary" data-delete="${esc(x.id)}">Supprimer</button></div></div></details>`}
function journal(d){let f=d.filter(x=>filter==='all'||x.type===filter);return heading('Journal',`${f.length} entrées · toucher une ligne pour les détails`)+`<div class="card journal-card"><div class="journal-filter"><label for="filter">Afficher</label><select id="filter"><option value="all">Tout</option><option value="pain" ${filter==='pain'?'selected':''}>Ressentis</option><option value="daily" ${filter==='daily'?'selected':''}>Bilans quotidiens</option></select></div>${f.length?f.map(item).join(''):'<div class="empty">Aucune entrée dans cette catégorie.</div>'}</div>`}
function stats(d){let p=d.filter(x=>x.type==='pain'),q=d.filter(x=>x.type==='daily');let buckets=Array.from({length:11},(_,i)=>({n:i,c:p.filter(x=>x.score===i).length}));return heading('Analyses','Indicateurs descriptifs basés sur les saisies disponibles.')+`<div class="grid"><div class="card"><small>Douleur moyenne</small><div class="metric">${avg(p.map(x=>x.score).filter(Number.isFinite))}</div><small>${p.length} observations</small></div><div class="card"><small>Capacité moyenne</small><div class="metric">${avg(q.map(x=>x.score).filter(Number.isFinite))}</div><small>${q.length} bilans</small></div></div><div class="card"><h2>Répartition des intensités</h2>${p.length?buckets.map(b=>`<div style="display:grid;grid-template-columns:26px 1fr 28px;gap:10px;align-items:center;margin:10px 0"><span>${b.n}</span><div class="bar"><i style="width:${100*b.c/p.length}%"></i></div><small>${b.c}</small></div>`).join(''):'<div class="empty">Les graphiques apparaîtront après tes premières saisies.</div>'}</div><div class="card"><h2>Rapport des ressentis personnels</h2><p class="muted">Synthèse imprimable sur deux pages, calculée localement à partir des observations. Les informations d’identité et de diagnostic sont facultatives et restent sur cet appareil.</p><div class="actions"><button class="button" id="report-open">Préparer le rapport PDF</button></div></div><p class="footnote">Une association statistique ne démontre pas une relation de cause à effet.</p>`}
function chips(name,opts,values=[]){return `<div class="chips" data-chips="${name}">${opts.map(o=>`<button type="button" class="chip ${values.includes(o)?'sel':''}" data-val="${esc(o)}" aria-pressed="${values.includes(o)}">${esc(o)}</button>`).join('')}</div>`}function scale(score){return `<div class="scale" id="scale"><button type="button" data-score="" class="${!Number.isFinite(score)?'sel':''}" aria-pressed="${!Number.isFinite(score)}" title="Non renseigné">—</button>${Array.from({length:11},(_,i)=>`<button type="button" data-score="${i}" class="${score===i?'sel':''}" aria-pressed="${score===i}">${i}</button>`).join('')}</div>`}function form(x){let type=x?.type||window.nextType||'pain';window.nextType=null;const types=[['pain','Ressenti / douleur'],['daily','Bilan quotidien / capacités'],...[...new Set(formData.map(r=>r.type).filter(t=>t!=='pain'&&t!=='daily'))].sort((a,b)=>a.localeCompare(b,'fr')).map(t=>[t,t])];if(!types.some(([v])=>v===type))types.push([type,type]);const locations=[...new Set(formData.map(r=>String(r.location||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));const custom=type!=='pain'&&type!=='daily';const painLike=type!=='daily';return heading(x?'Modifier une entrée':'Nouvelle saisie','Rapide d’abord, détails seulement si tu le souhaites.')+`<form id="entry" class="card"><div class="field"><label for="type">Type d’observation</label><select id="type">${types.map(([v,l])=>`<option value="${esc(v)}" ${v===type?'selected':''}>${esc(l)}</option>`).join('')}<option value="__other__">Autre…</option></select><input id="type-other" type="text" maxlength="100" placeholder="Nouveau type d’observation" hidden></div><div class="field"><label for="when">${painLike?'Date et heure':'Date'}</label><input id="when" type="${painLike?'datetime-local':'date'}" required value="${esc(x?.when||(painLike?nowLocal():dateLocal()))}"></div><div class="field"><label>${painLike?'Intensité du ressenti':'Capacité fonctionnelle'} : <strong id="scorelabel">${x?.score===null?'non renseigné':(x?.score??5)+'/10'}</strong></label>${x?.score===null?'<p class="muted">Score non renseigné dans MMP. Choisis une valeur seulement si tu souhaites le compléter.</p>':''}${scale(x?.score===null?null:x?.score??5)}</div>${painLike?`<div class="field"><label for="location">Localisation (facultatif)</label><select id="location"><option value="">Sans localisation</option>${locations.map(l=>`<option value="${esc(l)}" ${l===(x?.location||'')?'selected':''}>${esc(l)}</option>`).join('')}<option value="__other__">Autre…</option></select><input id="location-other" type="text" maxlength="120" placeholder="Nouvelle localisation" hidden></div><details><summary>Descriptions et facteurs (facultatif)</summary><div class="field"><label>Caractéristiques</label>${chips('features',intensity,x?.features)}</div><div class="field"><label>Facteurs aggravants</label>${chips('aggravating',aggrav,x?.aggravating)}</div><div class="field"><label>Facteurs soulageants</label>${chips('relieving',relief,x?.relieving)}</div></details>`:`<div class="field"><label>Activités significatives</label>${chips('tags',activities,x?.tags)}</div>`}<div class="field"><label for="note">Remarques (facultatif)</label><textarea id="note" placeholder="Ce que je souhaite retenir…">${esc(x?.note||'')}</textarea></div><div class="actions"><button class="button" type="submit">Enregistrer</button><button class="button secondary" type="button" id="cancel-edit">Annuler</button></div></form>`}
function settings(){return heading('Réglages','Sauvegardes et importations.')+`<div class="card"><h2>Sauvegarder et restaurer</h2><p class="muted">Sauvegarde complète JSON. La restauration fusionne par identifiant.</p><div class="actions"><button class="button" id="backup">Sauvegarder JSON</button><button class="button secondary" id="csv">Exporter CSV</button><label class="button secondary" for="restore">Importer JSON</label><input type="file" id="restore" accept=".json,application/json" hidden></div></div><div class="card"><h2>Migration MMP · transfert définitif</h2><p>Importer le fichier JSON privé préparé à partir du rapport complet du 13.10.2026. Aucun document n’est envoyé à GitHub.</p><label class="button" for="mmpfile">Choisir le fichier MMP JSON</label><input type="file" id="mmpfile" accept=".json,application/json" hidden><div id="mmp-preview" class="footnote"></div><p class="footnote">Les heures MMP disponibles sont conservées. Les notes des bilans non encore extraites du PDF restent inconnues. Les champs originaux sont conservés.</p><button class="button secondary" id="mmpclear">Effacer uniquement les imports MMP</button></div><div class="card"><h2>À propos</h2><p>Mon Ressenti · Compagnon SZ · v0.2.16</p><p class="muted">Journal personnel, pas une application médicale. Stockage local.</p></div>`}
function download(filename,content,mime){let a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type:mime}));a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}function csvEscape(x){return '"'+String(x??'').replace(/"/g,'""')+'"'}

// Rapport v0.2.16 : l'application reste en mémoire, avec ses événements et sa base locale.
let mrReportSaved=null;
window.MonRessentiShowReport=function(html){
  if(mrReportSaved)return;
  const doc=new DOMParser().parseFromString(html,'text/html');
  const style=doc.querySelector('style');
  const original=document.createDocumentFragment();
  while(document.body.firstChild)original.appendChild(document.body.firstChild);
  const appStyles=[...document.querySelectorAll('link[rel="stylesheet"]')].map(el=>({el,disabled:el.disabled}));
  appStyles.forEach(x=>x.el.disabled=true);
  const reportStyle=document.createElement('style');
  reportStyle.textContent=style?style.textContent:'';
  document.head.appendChild(reportStyle);
  const title=document.title;
  mrReportSaved={original,reportStyle,title,appStyles};
  while(doc.body.firstChild)document.body.appendChild(doc.body.firstChild);
  document.title='Rapport des ressentis personnels · v0.2.16';
  const print=document.getElementById('report-print');
  if(print)print.addEventListener('click',()=>window.MonRessentiPdf('print'));
  const dob=document.getElementById('report-dob');
  if(dob)dob.addEventListener('click',()=>{const value=prompt('Date de naissance (JJ.MM.AAAA ou AAAA-MM-JJ) :',localStorage.getItem('mr-report-dob')||'');if(value===null)return;let iso=value.trim();if(/^\d{2}\.\d{2}\.\d{4}$/.test(iso)){const [d,m,y]=iso.split('.');iso=y+'-'+m+'-'+d;}const parsed=new Date(iso+'T12:00:00');if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)||Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==iso)return alert('Date invalide.');localStorage.setItem('mr-report-dob',iso);const target=document.querySelector('.report-head p');if(target)target.textContent='Né(e) le '+iso.slice(8,10)+'.'+iso.slice(5,7)+'.'+iso.slice(0,4);});
  const pdf=document.getElementById('report-pdf');
  if(pdf)pdf.addEventListener('click',()=>window.MonRessentiPdf('download'));
  const close=document.getElementById('report-close');
  if(close)close.addEventListener('click',e=>{e.preventDefault();window.MonRessentiReturnToApp();});
  window.scrollTo(0,0);
};
window.MonRessentiReturnToApp=function(){
  const saved=mrReportSaved;
  if(!saved){window.location.href='./index.html';return;}
  document.body.replaceChildren();
  document.body.appendChild(saved.original);
  saved.reportStyle.remove();
  (saved.appStyles||[]).forEach(x=>x.el.disabled=x.disabled);
  document.title=saved.title;
  mrReportSaved=null;
  window.scrollTo(0,0);
};

// Export local : dessin Canvas 2D natif (sans SVG foreignObject, non pris en charge par Edge Android).
async function mrCreatePdf(){
 const sheets=[...document.querySelectorAll('article.sheet')];
 if(sheets.length!==2)throw Error('Le rapport doit contenir exactement deux pages.');
 const images=[];
 for(const sheet of sheets){
  const bounds=sheet.getBoundingClientRect(), w=794,h=1123,ratio=w/bounds.width;
  const canvas=document.createElement('canvas');canvas.width=1588;canvas.height=2246;
  const c=canvas.getContext('2d');if(!c)throw Error('Canvas indisponible');
  c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);
  c.setTransform(2*ratio,0,0,2*ratio,-2*ratio*bounds.left,-2*ratio*bounds.top);
  const rgb=(v,fallback='#153b52')=>v&&v!=='transparent'&&v!=='rgba(0, 0, 0, 0)'?v:fallback;
  const rect=(r,color)=>{c.fillStyle=color;c.fillRect(r.left,r.top,r.width,r.height)};
  // Dessiner les fonds et les filets des tableaux avant le texte.
  const nodes=[sheet,...sheet.querySelectorAll('*')];
  for(const el of nodes){
   if(el.closest('svg')||el.tagName==='SVG')continue;
   const st=getComputedStyle(el),r=el.getBoundingClientRect();
   if(!r.width||!r.height)continue;
   if(st.backgroundColor&&st.backgroundColor!=='rgba(0, 0, 0, 0)'&&st.backgroundColor!=='transparent')rect(r,st.backgroundColor);
   const bw=parseFloat(st.borderTopWidth)||0;
   if(bw&&st.borderTopStyle!=='none'){c.strokeStyle=st.borderTopColor;c.lineWidth=Math.min(1,bw);c.strokeRect(r.left+.4,r.top+.4,Math.max(0,r.width-.8),Math.max(0,r.height-.8))}
  }
  // SVG : reproduire lignes, courbes, barres et graduations avec les primitives Canvas.
  for(const svg of sheet.querySelectorAll('svg')){
   const r=svg.getBoundingClientRect(),vb=(svg.getAttribute('viewBox')||'0 0 730 125').split(/[ ,]+/).map(Number);
   if(!r.width||!r.height||vb.length!==4)continue;
   c.save();c.translate(r.left,r.top);c.scale(r.width/vb[2],r.height/vb[3]);c.translate(-vb[0],-vb[1]);
   for(const node of svg.querySelectorAll('line,rect,polyline,text')){
    const tag=node.tagName.toLowerCase(),stroke=node.getAttribute('stroke'),fill=node.getAttribute('fill');
    c.lineWidth=Number(node.getAttribute('stroke-width'))||1;
    if(tag==='line'){c.beginPath();c.moveTo(+node.getAttribute('x1'),+node.getAttribute('y1'));c.lineTo(+node.getAttribute('x2'),+node.getAttribute('y2'));c.strokeStyle=stroke||'#ddd';c.stroke()}
    if(tag==='rect'){c.fillStyle=fill||'#1680c6';c.fillRect(+node.getAttribute('x'),+node.getAttribute('y'),+node.getAttribute('width'),+node.getAttribute('height'))}
    if(tag==='polyline'){const pts=(node.getAttribute('points')||'').trim().split(/\s+/).map(t=>t.split(',').map(Number));c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=stroke||'#1680c6';c.lineWidth=Number(node.getAttribute('stroke-width'))||2;c.stroke()}
    if(tag==='text'){c.fillStyle=fill||'#42636d';c.font=(node.getAttribute('font-size')||11)+'px Arial';c.textAlign=node.getAttribute('text-anchor')==='end'?'right':node.getAttribute('text-anchor')==='middle'?'center':'left';c.fillText(node.textContent||'',+node.getAttribute('x'),+node.getAttribute('y'))}
   }
   c.restore();
  }
  // Reproduire le texte HTML mot par mot à sa position réelle, avec sa typographie.
  const walker=document.createTreeWalker(sheet,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const n=walker.currentNode,parent=n.parentElement;if(!parent||parent.closest('svg'))continue;
   const raw=n.textContent||'';if(!raw.trim())continue;
   const st=getComputedStyle(parent);if(st.visibility==='hidden'||st.display==='none')continue;
   const fs=parseFloat(st.fontSize)||11;
   c.font=`${st.fontWeight==='bold'||Number(st.fontWeight)>=600?'bold ':''}${fs}px ${st.fontFamily||'Arial'}`;
   c.fillStyle=rgb(st.color);c.textAlign='left';c.textBaseline='alphabetic';
   const re=/\S+/g;let match;
   while((match=re.exec(raw))){
    const range=document.createRange();range.setStart(n,match.index);range.setEnd(n,match.index+match[0].length);
    const rr=range.getBoundingClientRect();if(!rr.width||!rr.height)continue;
    c.fillText(match[0],rr.left,rr.top+rr.height*.82);
   }
  }
  c.setTransform(1,0,0,1,0,0);
  const jpeg=canvas.toDataURL('image/jpeg',.92).split(',')[1];
  const binary=atob(jpeg),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  images.push({bytes,w:canvas.width,h:canvas.height});
 }
 const encoder=new TextEncoder(),chunks=[],offsets=[0];let length=0;
 function push(b){const a=typeof b==='string'?encoder.encode(b):b;chunks.push(a);length+=a.length}
 function obj(n,body){offsets[n]=length;push(n+' 0 obj\n'+body+'\nendobj\n')}
 push('%PDF-1.4\n%PDF local\n');
 obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>');
 for(let i=0;i<2;i++){
   const base=i===0?3:6,im=images[i],name='Im'+(i+1);
   obj(base,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /'+name+' '+(base+1)+' 0 R >> >> /Contents '+(base+2)+' 0 R >>');
   offsets[base+1]=length;push((base+1)+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+im.w+' /Height '+im.h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+im.bytes.length+' >>\nstream\n');push(im.bytes);push('\nendstream\nendobj\n');
   const cmd='q 595.28 0 0 841.89 0 0 cm /'+name+' Do Q\n';
   obj(base+2,'<< /Length '+encoder.encode(cmd).length+' >>\nstream\n'+cmd+'endstream');
 }
 const xref=length;push('xref\n0 9\n0000000000 65535 f \n');
 for(let i=1;i<=8;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 push('trailer\n<< /Size 9 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
 return new Blob(chunks,{type:'application/pdf'});
}
window.MonRessentiPdf=async function(action){
 const button=document.getElementById(action==='print'?'report-print':'report-pdf');
 if(button){button.disabled=true;button.textContent='Préparation du PDF…'}
 try{
   const blob=await mrCreatePdf(),url=URL.createObjectURL(blob);
   if(action==='print'){
     // Le PDF est ouvert avec le lecteur PDF Android, qui propose Imprimer.
     const opened=window.open(url,'_blank');
     if(!opened){const a=document.createElement('a');a.href=url;a.download='Mon_Ressenti_rapport_v0.2.16.pdf';a.click();}
   }else{
     const a=document.createElement('a');a.href=url;a.download='Mon_Ressenti_rapport_v0.2.16.pdf';document.body.appendChild(a);a.click();a.remove();
   }
   setTimeout(()=>URL.revokeObjectURL(url),180000);
 }catch(err){alert('Création du PDF impossible : '+err.message)}
 finally{if(button){button.disabled=false;button.textContent=action==='print'?'Ouvrir le PDF pour imprimer':'Télécharger le PDF'}}
};

function makeStandaloneReport(){
  const sheets=[...document.querySelectorAll('article.sheet')].map(el=>el.outerHTML).join('');
  const style=mrReportSaved?.reportStyle?.textContent||'';
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mon Ressenti — Rapport v0.2.16</title><style>'+style+'</style></head><body><div class="toolbar"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button><span>Si le bouton ne réagit pas, utilise le menu Imprimer du navigateur.</span></div>'+sheets+'</body></html>';
}
window.downloadReportHtml=function(){
  const u=URL.createObjectURL(new Blob([makeStandaloneReport()],{type:'text/html;charset=utf-8'}));
  const a=document.createElement('a');a.href=u;a.download='Mon_Ressenti_rapport_v0.2.16.html';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);
};

function wire(data){if($('#report-open'))$('#report-open').onclick=()=>{const keys=['name','dob','onset','initialLocation','diagnosisDate','syndrome'];const labels=['Nom et prénom','Date de naissance (AAAA-MM-JJ)','Date(s) des premiers symptômes','Localisation(s) initiale(s)','Date(s) du diagnostic','Syndrome(s) / diagnostic(s) déclaré(s)'];let profile={};for(const key of keys)profile[key]=localStorage.getItem('mr-report-'+key)||'';let html=MonRessentiReport.make(data,profile);window.MonRessentiShowReport(html)};document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{editing=null;window.nextType=b.dataset.type||null;show(b.dataset.go)});document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{returnPage=page;returnScroll=window.scrollY;editing=b.dataset.edit;show('new')});document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(confirm('Supprimer définitivement cette entrée ?')){await del(b.dataset.delete);show(page)}});if($('#filter'))$('#filter').onchange=e=>{filter=e.target.value;show('journal')};if($('#cancel-edit'))$('#cancel-edit').onclick=async()=>{const dest=editing?returnPage:'home',scroll=returnScroll;editing=null;await show(dest);if(dest==='journal')requestAnimationFrame(()=>window.scrollTo(0,scroll))};if($('#location'))$('#location').onchange=e=>{let other=e.target.value==='__other__';$('#location-other').hidden=!other;if(other)$('#location-other').focus()};if($('#type'))$('#type').onchange=e=>{let v=e.target.value;if(v==='__other__'){let i=$('#type-other');i.hidden=false;i.focus();return}editing=null;window.nextType=v;show('new')};document.querySelectorAll('#scale button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#scale button').forEach(a=>{a.classList.toggle('sel',a===b);a.setAttribute('aria-pressed',a===b?'true':'false')});$('#scorelabel').textContent=b.dataset.score===''?'non renseigné':b.dataset.score+'/10'});document.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{b.classList.toggle('sel');b.setAttribute('aria-pressed',b.classList.contains('sel')?'true':'false')});if($('#entry'))$('#entry').onsubmit=async e=>{e.preventDefault();let old=editing?await get(editing):null,type=$('#type').value==='__other__'?$('#type-other').value.trim():$('#type').value,when=$('#when').value,score=$('#scale .sel')&&$('#scale .sel').dataset.score!==''?Number($('#scale .sel').dataset.score):null;if(!when)return alert('Date obligatoire');if(!type||type==='__other__')return alert('Indique un type d’observation');if(type.length>100)return alert('Type trop long');let loc=$('#location')?($('#location').value==='__other__'?$('#location-other').value.trim():$('#location').value.trim()):'';if($('#location')&&$('#location').value==='__other__'&&!loc)return alert('Indique une localisation');let r={id:old?.id||uid(),type,when,score,location:type!=='daily'?loc:'',note:$('#note').value.trim(),source:old?.source||'manual',createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),...(old?.source==='mmp'?{mmpPage:old.mmpPage,mmpOriginalDate:old.mmpOriginalDate,mmpOriginalFields:old.mmpOriginalFields,mmpStatus:old.mmpStatus}: {})};document.querySelectorAll('[data-chips]').forEach(g=>r[g.dataset.chips]=[...g.querySelectorAll('.sel')].map(b=>b.dataset.val));await put(r);editing=null;const dest=old?returnPage:'home',scroll=returnScroll;await show(dest);if(old&&dest==='journal')requestAnimationFrame(()=>window.scrollTo(0,scroll))};if($('#mmpfile'))$('#mmpfile').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let j=JSON.parse(await f.text());if(j.format!=='mon-ressenti-mmp-migration'||j.schemaVersion!==1||!Array.isArray(j.records))throw Error('Format MMP non reconnu');if(j.records.some(r=>!r||r.source!=='mmp'||typeof r.id!=='string'||!['pain','daily'].includes(r.type)||!/^\d{4}-\d\d-\d\d/.test(r.when)||!(r.score===null||(Number.isInteger(r.score)&&r.score>=0&&r.score<=10))))throw Error('Enregistrements invalides');let pain=j.records.filter(r=>r.type==='pain').length,daily=j.records.length-pain,unknown=j.records.filter(r=>r.score===null).length;$('#mmp-preview').textContent=`${pain} ressentis, ${daily} bilans, ${unknown} scores inconnus. Source : ${j.sourceDate||'non précisée'}.`;if(!confirm(`Importer ${j.records.length} entrées MMP ? Les imports MMP existants seront remplacés, les saisies manuelles conservées. ${unknown} scores restent inconnus.`))return;let existing=await all();let backup={format:'mon-ressenti',schemaVersion:1,exportedAt:new Date().toISOString(),records:existing};download('Mon_Ressenti_avant_import_'+dateLocal()+'.json',JSON.stringify(backup,null,2),'application/json');let t=db.transaction(STORE,'readwrite'),s=t.objectStore(STORE);existing.filter(r=>r.source==='mmp').forEach(r=>s.delete(r.id));j.records.forEach(r=>s.put(r));await new Promise((resolve,reject)=>{t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)});alert(`Import terminé : ${pain} ressentis et ${daily} bilans. Sauvegarde préalable téléchargée.`);show('home')}catch(err){alert('Import MMP refusé : '+err.message)}};if($('#mmpclear'))$('#mmpclear').onclick=async()=>{let d=(await all()).filter(r=>r.source==='mmp');if(!d.length)return alert('Aucun import MMP');if(!confirm(`Effacer les ${d.length} entrées MMP ? Les saisies manuelles resteront intactes.`))return;let t=db.transaction(STORE,'readwrite'),s=t.objectStore(STORE);d.forEach(r=>s.delete(r.id));await new Promise((resolve,reject)=>{t.oncomplete=resolve;t.onerror=()=>reject(t.error)});show('settings')};if($('#backup'))$('#backup').onclick=async()=>{let d=await all();download('Mon_Ressenti_sauvegarde_'+dateLocal()+'.json',JSON.stringify({format:'mon-ressenti',schemaVersion:1,exportedAt:new Date().toISOString(),records:d},null,2),'application/json')};if($('#csv'))$('#csv').onclick=async()=>{let d=await all(),keys=['id','type','when','score','location','features','aggravating','relieving','tags','note','source'];download('Mon_Ressenti_'+dateLocal()+'.csv','\ufeff'+keys.join(';')+'\n'+d.map(r=>keys.map(k=>csvEscape(Array.isArray(r[k])?r[k].join(' | '):r[k])).join(';')).join('\n'),'text/csv;charset=utf-8')};if($('#restore'))$('#restore').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let j=JSON.parse(await f.text());if(j.format!=='mon-ressenti'||j.schemaVersion!==1||!Array.isArray(j.records))throw Error('Format de sauvegarde non reconnu');if(j.records.some(r=>!r||typeof r.id!=='string'||typeof r.type!=='string'||!r.type.trim()||typeof r.when!=='string'||!(r.score===null||(Number.isInteger(r.score)&&r.score>=0&&r.score<=10))))throw Error('Une ou plusieurs entrées sont invalides');if(!confirm(`Importer ${j.records.length} entrées ? Les identifiants existants identiques seront remplacés.`))return;for(let r of j.records)await put(r);alert('Import terminé : '+j.records.length+' entrées traitées.');show('settings')}catch(err){alert('Import refusé : '+err.message)}}}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{editing=null;window.nextType=null;show(b.dataset.page)});(async()=>{try{db=await openDB();await show('home');if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{})}catch(e){$('#screen').innerHTML='<div class="warn">Impossible d’ouvrir le stockage local. Vérifie les autorisations du navigateur et évite la navigation privée.</div>';console.error(e)}})();
