'use strict';
const DB='mon-ressenti-sz', STORE='records', VER=1;let db,page='home',editing=null,filter='all',returnPage='home',returnScroll=0,formData=[],journalQuery='';const $=s=>document.querySelector(s);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const nowLocal=()=>{let d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};const dateLocal=()=>nowLocal().slice(0,10);const fmt=d=>new Date(d+'T12:00:00').toLocaleDateString('fr-CH',{day:'numeric',month:'short',year:'numeric'});const intensity=['Brûlure','Picotements','Décharges électriques','Tranchant','Élancement','Pression','Engourdissement','Autre'];const aggrav=['Toucher léger / tissu','Mouvement','Activité','Voiture','Stress','Froid','Chaleur'];const relief=['Repos','Sommeil','Froid','Chaleur','Médicament','Distraction','Autre'];const activities=['Préparer un repas','Tâches ménagères','Sortir','Voir des proches','Activité agréable','Travail / bénévolat','Repos','Sommeil paisible'];
function openDB(){return new Promise((ok,no)=>{let r=indexedDB.open(DB,VER);r.onupgradeneeded=()=>{let s=r.result.createObjectStore(STORE,{keyPath:'id'});s.createIndex('when','when')};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}function tx(mode,cb){return new Promise((ok,no)=>{let t=db.transaction(STORE,mode),s=t.objectStore(STORE);let r=cb(s);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);t.onerror=()=>no(t.error)})}const all=()=>tx('readonly',s=>s.getAll());const get=id=>tx('readonly',s=>s.get(id));const put=v=>tx('readwrite',s=>s.put(v));const del=id=>tx('readwrite',s=>s.delete(id));const uid=()=>crypto.randomUUID?crypto.randomUUID():'mr-'+Date.now()+'-'+Math.random().toString(36).slice(2);const avg=a=>a.length?(a.reduce((s,n)=>s+n,0)/a.length).toFixed(1):'—';function heading(t,sub=''){return `<h1>${t}</h1>${sub?`<p class="muted">${sub}</p>`:''}`};function buttons(page){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page))}async function show(p){page=p;buttons(p);let data=await all();formData=data;data.sort((a,b)=>b.when.localeCompare(a.when));let html=p==='home'?home(data):p==='journal'?journal(data):p==='stats'?stats(data):p==='settings'?settings():form(editing?await get(editing):null);$('#screen').innerHTML=html;wire(data);window.scrollTo(0,0)}
function dashboardCards(d){
 const groups=new Map();
 for(const x of d){const location=String(x.location||'').trim();const key=x.type==='daily'?'daily':'pain:'+location.toLocaleLowerCase('fr');if(!groups.has(key))groups.set(key,{label:x.type==='daily'?'Bilan quotidien':(location||'Sans localisation'),type:x.type,records:[]});groups.get(key).records.push(x)}
 const cards=[...groups.values()].map(g=>{
  // Chiffre : moyenne de toute la période, sans restriction de date.
  const allScores=g.records.filter(x=>Number.isFinite(x.score)).map(x=>x.score);
  const value=allScores.length?allScores.reduce((a,b)=>a+b,0)/allScores.length:null;
  // Petite tête : évolution d'aujourd'hui par rapport à hier uniquement.
  const today=dateLocal();
  const d=new Date(today+'T12:00:00');d.setDate(d.getDate()-1);
  const yesterday=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const todayScores=g.records.filter(x=>x.when.slice(0,10)===today&&Number.isFinite(x.score)).map(x=>x.score);
  const yesterdayScores=g.records.filter(x=>x.when.slice(0,10)===yesterday&&Number.isFinite(x.score)).map(x=>x.score);
  const todayAvg=todayScores.length?todayScores.reduce((a,b)=>a+b,0)/todayScores.length:null;
  const yesterdayAvg=yesterdayScores.length?yesterdayScores.reduce((a,b)=>a+b,0)/yesterdayScores.length:null;
  let symbol='—',trend='Comparaison aujourd’hui / hier indisponible (valeur manquante)';
  if(todayAvg!==null&&yesterdayAvg!==null){
   const delta=todayAvg-yesterdayAvg;
   symbol=Math.abs(delta)<0.000001?'😐':((g.type==='daily'?delta>0:delta<0)?'🙂':'🙁');
   trend=delta>0?'Aujourd’hui : hausse par rapport à hier':delta<0?'Aujourd’hui : baisse par rapport à hier':'Aujourd’hui : stable par rapport à hier';
  }
  return {...g,current:today,value,symbol,trend};
 });
 cards.sort((a,b)=>a.type===b.type?a.label.localeCompare(b.label,'fr'):a.type==='daily'?1:-1);
 if(!cards.length)return '<div class="dashboard-no-cards">Aucun indicateur disponible.</div>';
 return `<div class="dashboard-cards" style="--count:${cards.length}" aria-label="Indicateurs par localisation">${cards.map(c=>`<div class="dashboard-card" title="${esc(c.label)} · Moyenne globale · ${esc(c.trend)}"><span class="dashboard-label">${esc(c.label)}</span><span class="dashboard-value">${c.value===null?'—':c.value.toFixed(1).replace('.',',')}/10 <span class="dashboard-face">${c.symbol}</span></span></div>`).join('')}</div>`
}
function home(d){const today=dateLocal(),entries=d.filter(x=>x.when.slice(0,10)===today);return `<div class="home-screen"><section class="hero"><h1>Bonjour 👋</h1><p>Observer pour comprendre. Comprendre pour agir.</p></section><div class="card home-today"><h2>Enregistrements du jour</h2>${entries.length?entries.map(x=>item(x,true)).join(''):'<div class="empty">Aucun enregistrement aujourd’hui.</div>'}</div><div class="actions home-actions"><button class="button" data-go="new" data-type="pain">＋ Ressenti</button><button class="button secondary" data-go="new" data-type="daily">☀ Bilan du jour</button></div><section class="dashboard-bottom" aria-label="Synthèse des indicateurs">${dashboardCards(d)}</section></div>`}

function mrTreatmentSummary(x){
 const d=x.treatmentDetails;if(!d)return '';
 const label={better:'Amélioration',same:'Aucun changement',worse:'Aggravation',unknown:'Non évalué'};
 const lines=['medications','interventions'].flatMap(k=>Object.entries(d[k]||{}).map(([name,v])=>`<div class="original"><b>${k==='medications'?'Médicament':'Intervention'} :</b> ${esc(name)}${v.quantity?' · Quantité : '+esc(v.quantity)+' '+esc(v.unit||'unité(s)'):''}${v.dose?' · Précision : '+esc(v.dose):''} · Effet : ${esc(label[v.effect]||'Non évalué')}</div>`));
 return lines.join('');
}
function item(x){const score=Number.isFinite(x.score)?x.score+'/10':'—',dt=String(x.when||''),date=dt.slice(8,10)+'.'+dt.slice(5,7)+'.'+dt.slice(0,4),hour=/T\d{2}:\d{2}/.test(dt)?' '+dt.slice(11,16):'',label=x.type==='pain'?'Ressenti / douleur':x.type==='daily'?'Bilan quotidien / capacités':x.type,original=x.mmpOriginalFields&&typeof x.mmpOriginalFields==='object'?Object.entries(x.mmpOriginalFields).filter(([k,v])=>v!==null&&v!==undefined&&String(v).trim()).map(([k,v])=>`<div class="original"><b>${esc(k)} :</b> ${esc(v)}</div>`).join(''):'';return `<details class="entry home-entry"><summary class="home-entry-summary" title="Afficher les détails"><span class="home-entry-left"><time>${esc(date+hour)}</time><span class="home-entry-type">${label}</span></span><span class="home-entry-location">${x.type==='pain'?esc(x.location||'—'):'—'}</span><span class="home-entry-score">${score}</span></summary><div class="entry-detail">${x.note?`<p>${esc(x.note)}</p>`:''}${x.source==='mmp'?`<small class="muted">Import MMP · page ${esc(x.mmpPage||'?')} · données d'origine</small>${original}`:''}${mrTreatmentSummary(x)}<div class="actions compact-actions"><button class="button secondary" data-edit="${esc(x.id)}">Modifier</button><button class="button secondary" data-delete="${esc(x.id)}">Supprimer</button></div></div></details>`}
function journal(d){
 const q=journalQuery.trim().toLocaleLowerCase('fr');
 const matches=x=>!q||JSON.stringify(x).toLocaleLowerCase('fr').includes(q);
 const f=d.filter(x=>(filter==='all'||x.type===filter)&&matches(x));
 return heading('Journal',`${f.length} résultat(s) sur ${d.length} enregistrements · toucher une ligne pour les détails`)+`<div class="card journal-card"><div class="journal-filter"><label for="filter">Afficher</label><select id="filter"><option value="all">Tout</option><option value="pain" ${filter==='pain'?'selected':''}>Ressentis</option><option value="daily" ${filter==='daily'?'selected':''}>Bilans quotidiens</option></select></div><label for="journal-search">Rechercher un terme dans le journal</label><input id="journal-search" type="search" autocomplete="off" placeholder="Ex. Neurodol, Élancement…" value="${esc(journalQuery)}"><div id="journal-results">${f.length?f.map(item).join(''):'<div class="empty">Aucun enregistrement correspondant.</div>'}</div></div>`;
}
function stats(d){
 let p=d.filter(x=>x.type==='pain'),q=d.filter(x=>x.type==='daily');
 let buckets=Array.from({length:11},(_,i)=>({n:i,c:p.filter(x=>x.score===i).length}));
 let max=Math.max(1,...buckets.map(x=>x.c));
 return `<div class="mr-analysis-compact"><div class="mr-analysis-top"><h1>Analyses</h1><span>Indicateurs descriptifs · ${p.length+q.length} saisies</span></div>
 <div class="mr-metrics"><div class="mr-metric"><span>Douleur moyenne</span><strong>${avg(p.map(x=>x.score).filter(Number.isFinite))}</strong><small>${p.length} observations</small></div><div class="mr-metric"><span>Capacité moyenne</span><strong>${avg(q.map(x=>x.score).filter(Number.isFinite))}</strong><small>${q.length} bilans</small></div></div>
 <div class="mr-analysis-chart"><h2>Répartition des intensités <small>Intensité 0–10 · nombre d’observations</small></h2>
 <div class="mr-compact-bars">${buckets.map(b=>`<div class="mr-bar-col"><b>${b.c||''}</b><div class="mr-bar-track"><i style="height:${100*b.c/max}%"></i></div><small>${b.n}</small></div>`).join('')}</div></div>
 <div class="mr-analysis-report"><div><strong>Rapport des ressentis personnels</strong><small>2 pages A4 · calcul local · impression Android</small></div><button class="button" id="report-open">Préparer / Imprimer</button></div>
 <p class="mr-analysis-disclaimer">Une association statistique ne démontre pas une relation de cause à effet.</p></div>`;
}

// Groupes à deux niveaux : libellés historiques conservés, aucune migration destructive.
const MR_LOCATIONS=['Poignet (droite)','Main (droite)','Poitrine','Abdomen','Articulations','Bras','Bras (droit)','Bras (gauche)','Cou','Dos','Dos (basse)','Dos (haute)','Dos (moyenne)','Épaule (droite)','Épaule (gauche)','Épaules','Genou (droit)','Genou (gauche)','Genoux','Hanche (droite)','Hanche (gauche)','Hanches','Jambe (droite)','Jambe (gauche)','Jambes','Main (gauche)','Mains','Pelvis','Pied (droit)','Pied (gauche)','Pieds','Testicules','Tête','Tête (droite)','Tête (gauche)'];
const MR_GROUPS={
 locations:{title:'Endroits — localisation de la douleur',key:'locations',options:MR_LOCATIONS},
 symptoms:{title:'Autres symptômes associés',key:'symptoms',options:['Gonflement de la main','Grande fatigue','Sentiment de gant serré','Maux des yeux','Maux de tête','Cauchemar','Anxiété','Dépression','Nausée','Respiration Irrégulière','Vertiges','Confusion mentale','Constipation','Démangeaison','Déshydratation','Diarrhée','Évanouissement','Fièvre','Hallucination','Insomnie','Léthargie','Perte de Conscience','Pouls Irrégulier','Saignement',"Sautes d’humeur",'Somnolence','Vomissement']},
 features:{title:'Caractéristiques',key:'features',options:['Brûlure','Décharges Électriques','Douloureuse','Élancement','Lancinante','Picotements','Sourde','Tranchante','Ardeur','Crampes','Engourdissementa','Fourmillements','Froid intense','Froid intérieur','Lourdeur','Martèlement','Pincement','Pression','Rigidité','Tirante']},
 aggravating:{title:'Facteurs aggravants',key:'aggravating',options:['Travaux administratifs','Travaux manuels','Ergothérapie','Voiture','Danse','Tâche ménagère/cuisiner','Hypoglycémie','Marcher','Toucher léger / Contact avec du tissu','Climat','Défécation','Être assis','Être debout','Exercice','Fumer','Humeur négative','Inactivité','Manque de sommeil','Nourriture','Physiothérapie','Sommeil','Stress','TENS (Neurostimulation électrique transcutanée)','Uriner']},
 medications:{title:'Médicaments',key:'medications',options:[]},
 interventions:{title:'Interventions',key:'interventions',options:['Chaleur','Défécation','Distraction','Étirage','Exercice','Glace','Inactivité','Massage','Nourriture',"Parler avec quelqu’un",'Physiothérapie',"Rafraîchissement par l’eau froide",'Repositionnement','Se reposer','Sommeil','TENS (Neurostimulation électrique transcutanée)','Uriner']},
 activities:{title:'Activités significatives',key:'tags',options:['Session ergothérapie','Consultation médicale','Des commissions',"J’ai communiqué avec des personnes encourageantes en ligne ou par texto","J’ai dormi paisiblement","J’ai fait de l’exercice","J’ai fait une activité agréable","J’ai passé du temps avec mes amis ou ma famille","J’ai passé du temps avec mon animal de compagnie","J’ai préparé un repas","J’ai pris un bain / une douche","J’ai travaillé / étudié / fait du bénévolat","Je me suis amusé(e) à l’extérieur","Je me suis reposé(e) et détendu(e)",'Tâches ménagères','Aller au lit et en sortir par moi-même',"J’ai appris quelque chose de nouveau","J’ai approfondi ma vie spirituelle","J’ai assisté à un événement communautaire / groupe de soutien"]},
 environment:{title:'Environnement',key:'environment',options:['Restaurant/Sortie','Consultation médicale','Danse','Ergothérapie','École','Être Dehors','Faire du shopping','Lit','Maison','Travail','Voiture']}
};

const mrSort=arr=>[...new Set(arr.filter(Boolean))].sort((x,y)=>x.localeCompare(y,'fr',{sensitivity:'base'}));
// Lecture seule des champs historiques MMP : leurs intitulés sont conservés tels quels.
const MR_LEGACY_FIELDS={locations:['Endroit','Endroits'],symptoms:['Autres symptômes associés'],features:['Caractéristiques'],aggravating:['Facteurs Aggravants'],medications:['Médicaments'],interventions:['Interventions'],environment:['Environnements','Environnement'],tags:['Activités Significatives','Activités significatives']};
function mrHistoricalValues(r,key){
 const values=[];
 const add=v=>{if(Array.isArray(v))v.forEach(add);else if(typeof v==='string'&&v.trim())values.push(v.trim())};
 add(r[key]);
 if(key==='locations')add(r.location);
 const original=r.mmpOriginalFields||{};
 for(const field of MR_LEGACY_FIELDS[key]||[]){const v=original[field];if(typeof v==='string')v.split(/[,;\n]+/).forEach(add);else add(v)}
 return values;
}

function mrGroupHtml(key,selected=[],details={}){
 const g=MR_GROUPS[key],used=mrSort(formData.flatMap(r=>mrHistoricalValues(r,key)).concat(selected||[]));
 const proposals=mrSort(g.options.filter(x=>!used.includes(x)));
 return `<details class="mr-factor" data-factor="${key}"><summary>${esc(g.title)} <small class="mr-count">${selected.length?'('+selected.length+')':''}</small></summary><div class="mr-factor-body"><div class="mr-factor-primary"><p class="muted">Déjà utilisés</p>${used.map(v=>mrChoice(v,selected)+(key==='medications'||key==='interventions'?mrEffectHtml(key,v,details):'')).join('')}<button type="button" class="button secondary mr-more">Autre…</button><button type="button" class="button secondary mr-close">Retour</button></div><div class="mr-factor-secondary" hidden><p class="muted">Autres propositions</p>${proposals.map(v=>mrChoice(v,selected)+(key==='medications'||key==='interventions'?mrEffectHtml(key,v,details):'')).join('')}<button type="button" class="button secondary mr-add">Autre…</button><button type="button" class="button secondary mr-back">Retour</button></div><div class="mr-factor-new" hidden><label>Nouvelle valeur <input class="mr-new-input" maxlength="120" placeholder="Nouvelle proposition"></label><button type="button" class="button mr-confirm">Ajouter</button><button type="button" class="button secondary mr-new-back">Retour</button></div></div></details>`;
}
// Effets déclarés : ne pas confondre utilisation, efficacité et absence d'évaluation.
const MR_EFFECTS=[['unknown','Non évalué'],['better','Amélioration'],['same','Aucun changement'],['worse','Aggravation']];
function mrEffectHtml(key,value,details={}){
 const info=details?.[value]||{};
 return `<div class="mr-effect-detail" data-effect-for="${esc(value)}" ${details?.[value]?'':'hidden'}><div class="mr-effect-heading">${esc(value)} — résultat observé</div>${key==='medications'?`<div class="mr-med-quantity"><label>Quantité prise <input class="mr-quantity" type="number" min="0" step="any" inputmode="decimal" value="${esc(info.quantity??'')}" placeholder="Ex. 2"></label><label>Unité <select class="mr-unit">${['comprimé(s)','dragée(s)','gélule(s)','patch(s)','ml','goutte(s)','sachet(s)','dose(s)','autre'].map(u=>`<option value="${u}" ${(info.unit||'comprimé(s)')===u?'selected':''}>${u}</option>`).join('')}</select></label></div><label>Précision (facultatif) <input class="mr-dose" value="${esc(info.dose||'')}" maxlength="80" placeholder="Ex. prise fractionnée"></label>`:''}<label>Effet ressenti <select class="mr-effect-select">${MR_EFFECTS.map(([v,label])=>`<option value="${v}" ${info.effect===v?'selected':''}>${label}</option>`).join('')}</select></label></div>`;
}
function mrChoice(v,selected){return `<label class="mr-choice"><input type="checkbox" value="${esc(v)}" ${selected.includes(v)?'checked':''}> ${esc(v)}</label>`}
function mrMomentHtml(moment={}){return `<details class="mr-factor"><summary>Moment — évolution dans la journée</summary><div class="mr-moment"><div class="mr-moment-header"><span>Période</span><span>Constante</span><span>Intermittente</span><span>Aiguë</span></div>${['Matin','Midi','Soir','Nuit'].map(p=>`<div class="mr-moment-row"><strong>${p}</strong>${['Constante','Intermittente','Aiguë'].map(t=>`<label title="${p} : ${t}"><input type="checkbox" data-period="${p}" value="${t}" ${(moment[p]||[]).includes(t)?'checked':''}><span class="sr-only">${p} ${t}</span></label>`).join('')}</div>`).join('')}</div></details>`}
function mrExtraHtml(x){
 const old=x||{},groups=Object.keys(MR_GROUPS);
 const customs=mrSort([...formData.flatMap(r=>Object.keys(r.customGroups||{})),...Object.keys(old.customGroups||{})]);
 return `<div class="mr-factor-list">${mrGroupHtml('locations',old.locations|| (old.location?[old.location]:[]))}${groups.filter(k=>!['locations','medications','interventions','environment'].includes(k)).map(k=>mrGroupHtml(k,old[k]||[])).join('')}${mrGroupHtml('medications',old.medications||[],old.treatmentDetails?.medications||{})}${mrGroupHtml('interventions',old.interventions||[],old.treatmentDetails?.interventions||{})}${mrMomentHtml(old.moment||{})}${mrGroupHtml('environment',old.environment||[])}<div id="mr-custom-groups">${customs.map(k=>mrCustomHtml(k,old.customGroups?.[k]||[])).join('')}</div><div class="mr-factor"><button type="button" class="button secondary" id="mr-add-group">Autres… (ajouter un groupe)</button></div></div>`;
}
function mrCustomHtml(name,selected=[]){const used=mrSort(formData.flatMap(r=>r.customGroups?.[name]||[]).concat(selected));return `<details class="mr-factor" data-custom="${esc(name)}"><summary>${esc(name)}</summary><div class="mr-factor-body"><div class="mr-factor-primary"><p class="muted">Déjà utilisés</p>${used.map(v=>mrChoice(v,selected)).join('')}<button type="button" class="button secondary mr-more">Autre…</button><button type="button" class="button secondary mr-close">Retour</button></div><div class="mr-factor-secondary" hidden><button type="button" class="button secondary mr-add">Autre…</button><button type="button" class="button secondary mr-back">Retour</button></div><div class="mr-factor-new" hidden><label>Nouvelle valeur <input class="mr-new-input" maxlength="120"></label><button type="button" class="button mr-confirm">Ajouter</button><button type="button" class="button secondary mr-new-back">Retour</button></div></div></details>`}
function mrWire(){
 document.querySelectorAll('.mr-factor').forEach(g=>{
  const primary=g.querySelector('.mr-factor-primary'),secondary=g.querySelector('.mr-factor-secondary'),creation=g.querySelector('.mr-factor-new');if(!primary)return;
  const switchTo=(s)=>{primary.hidden=s!=='primary';secondary.hidden=s!=='secondary';creation.hidden=s!=='new'};g.addEventListener('toggle',()=>{if(!g.open)switchTo('primary')});
  g.querySelector('.mr-more').onclick=()=>switchTo('secondary');g.querySelector('.mr-close').onclick=()=>{g.open=false;switchTo('primary')};g.querySelector('.mr-back').onclick=()=>{g.open=false;switchTo('primary')};g.querySelector('.mr-add').onclick=()=>{switchTo('new');g.querySelector('.mr-new-input').focus()};g.querySelector('.mr-new-back').onclick=()=>{g.open=false;switchTo('primary')};
  if(['medications','interventions'].includes(g.dataset.factor)){
   const sync=()=>g.querySelectorAll('.mr-choice input').forEach(c=>{const box=c.closest('.mr-choice').nextElementSibling;if(box?.classList.contains('mr-effect-detail'))box.hidden=!c.checked});
   g.addEventListener('change',e=>{if(e.target.matches('.mr-choice input'))sync()});sync();
  }
  g.querySelector('.mr-confirm').onclick=()=>{const i=g.querySelector('.mr-new-input'),value=i.value.trim();if(!value)return;const existing=[...g.querySelectorAll('.mr-choice input')].find(el=>el.value.toLocaleLowerCase('fr')===value.toLocaleLowerCase('fr'));if(existing){existing.checked=true;switchTo('primary');g.open=false;return}const el=document.createElement('label');el.className='mr-choice';const check=document.createElement('input');check.type='checkbox';check.value=value;check.checked=true;el.append(check,document.createTextNode(' '+value));primary.insertBefore(el,g.querySelector('.mr-more'));
  if(['medications','interventions'].includes(g.dataset.factor)){const template=document.createElement('div');template.innerHTML=mrEffectHtml(g.dataset.factor,value);const detail=template.firstElementChild;detail.hidden=false;primary.insertBefore(detail,g.querySelector('.mr-more'))}i.value='';switchTo('primary');g.open=false};
 });
 const add=document.getElementById('mr-add-group');if(add)add.onclick=()=>{const n=prompt('Nom du nouveau groupe :')?.trim();if(!n)return;const container=document.getElementById('mr-custom-groups');if([...container.querySelectorAll('[data-custom]')].some(g=>g.dataset.custom.toLocaleLowerCase('fr')===n.toLocaleLowerCase('fr')))return alert('Ce groupe existe déjà.');container.insertAdjacentHTML('beforeend',mrCustomHtml(n));mrWire()};
}

function chips(name,opts,values=[]){return `<div class="chips" data-chips="${name}">${opts.map(o=>`<button type="button" class="chip ${values.includes(o)?'sel':''}" data-val="${esc(o)}" aria-pressed="${values.includes(o)}">${esc(o)}</button>`).join('')}</div>`}function scale(score){return `<div class="scale" id="scale">${Array.from({length:11},(_,i)=>`<button type="button" data-score="${i}" class="${score===i?'sel':''}" aria-pressed="${score===i}">${i}</button>`).join('')}</div>`}function form(x){let type=x?.type||window.nextType||'pain';window.nextType=null;const types=[['pain','Ressenti / douleur'],['daily','Bilan quotidien / capacités'],...[...new Set(formData.map(r=>r.type).filter(t=>t!=='pain'&&t!=='daily'))].sort((a,b)=>a.localeCompare(b,'fr')).map(t=>[t,t])];if(!types.some(([v])=>v===type))types.push([type,type]);const locations=mrSort([...MR_LOCATIONS,...formData.map(r=>String(r.location||'').trim()).filter(Boolean)]);const custom=type!=='pain'&&type!=='daily';const painLike=type!=='daily';return `<div class="mr-entry-heading"><h1>${x?'Modifier une entrée':'Nouvelle saisie'}</h1><span>Rapide d’abord, détails seulement si tu le souhaites.</span></div><form id="entry" class="card"><div class="mr-entry-top"><div class="field"><label for="type">Type d’enregistrement</label><select id="type">${types.map(([v,l])=>`<option value="${esc(v)}" ${v===type?'selected':''}>${esc(l)}</option>`).join('')}<option value="__other__">Autre…</option></select><input id="type-other" type="text" maxlength="100" placeholder="Nouveau type d’enregistrement" hidden></div><div class="field"><label for="when">${painLike?'Date et heure':'Date'}</label><input id="when" type="${painLike?'datetime-local':'date'}" required value="${esc(x?.when||(painLike?nowLocal():dateLocal()))}"></div></div><div class="field mr-score-field"><label>${painLike?'Intensité du ressenti':'Capacité fonctionnelle'}</label>${x?.score===null?'<p class="muted">Score non renseigné dans MMP. Choisis une valeur seulement si tu souhaites le compléter.</p>':''}${scale(x?.score===null?null:x?.score??5)}</div>${painLike?`${mrExtraHtml(x)}`:`<div class="mr-factor-list">${mrGroupHtml('activities',x?.tags||[])}</div>`}<div class="field"><label for="note">Remarques (facultatif)</label><textarea id="note" placeholder="Ce que je souhaite retenir…">${esc(x?.note||'')}</textarea></div><div class="actions"><button class="button" type="submit">Enregistrer</button><button class="button secondary" type="button" id="cancel-edit">Annuler</button></div></form>`}
// Gestion collective : ne modifie jamais les notes libres ni les métadonnées de provenance.
function mrFactorValues(data,key){return mrSort(data.flatMap(r=>mrHistoricalValues(r,key)).concat(MR_GROUPS[key].options))}
function mrReplaceFactor(record,key,source,target){
 const r={...record};let changed=false;
 const replaceArray=a=>{if(!Array.isArray(a))return a;let out=a.map(v=>v===source?(changed=true,target):v).filter(v=>v!==null);return [...new Set(out)]};
 r[key]=replaceArray(r[key]);
 if(key==='locations'&&r.location===source){r.location=target||'';changed=true}
 // Les champs importés historiques participent aussi à la recherche et aux listes.
 if(r.mmpOriginalFields){const original={...r.mmpOriginalFields};for(const field of MR_LEGACY_FIELDS[key]||[]){let v=original[field];if(typeof v==='string'){let parts=v.split(/([,;\n]+)/);let hit=false;parts=parts.map(part=>{if(part.trim()===source){hit=true;return target||''}return part});if(hit){changed=true;original[field]=parts.join('').replace(/^[,;\n\s]+|[,;\n\s]+$/g,'')}}else if(Array.isArray(v)){let n=replaceArray(v);if(v.some(item=>item===source))original[field]=n}}r.mmpOriginalFields=original}
 if(changed)r.updatedAt=new Date().toISOString();return {record:r,changed};
}
function mrWireFactorManager(data){
 const group=$('#factor-group'),source=$('#factor-source'),action=$('#factor-action'),target=$('#factor-target'),wrap=$('#factor-target-wrap'),feedback=$('#factor-feedback');if(!group)return;
 const fill=()=>{const values=mrSort(data.flatMap(r=>mrHistoricalValues(r,group.value)));source.innerHTML=values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');updateTarget()};
 const updateTarget=()=>{wrap.hidden=action.value==='delete';if(action.value==='rename'){target.outerHTML;wrap.innerHTML='<label for="factor-new-name">Nouveau nom</label><input id="factor-new-name" maxlength="120" placeholder="Nouveau nom du facteur">'}else{wrap.innerHTML='<label for="factor-target">Facteur de destination</label><select id="factor-target"></select>';const t=$('#factor-target');t.innerHTML=mrFactorValues(data,group.value).filter(v=>v!==source.value).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}};
 group.onchange=fill;source.onchange=updateTarget;action.onchange=updateTarget;fill();
 $('#factor-apply').onclick=async()=>{
  const key=group.value,old=source.value,mode=action.value,dest=mode==='delete'?null:mode==='rename'?($('#factor-new-name')?.value||'').trim():$('#factor-target')?.value;
  if(!old)return alert('Choisis un facteur.');if(mode!=='delete'&&(!dest||dest===old))return alert('Choisis un autre nom ou une destination.');
  const modifications=data.map(r=>mrReplaceFactor(r,key,old,dest));const affected=modifications.filter(x=>x.changed);
  if(!affected.length)return alert('Aucun enregistrement ne contient ce facteur.');
  const verb=mode==='delete'?'Supprimer':mode==='rename'?'Renommer':'Fusionner';
  if(!confirm(`${verb} « ${old} » ${dest?'vers « '+dest+' » ':''} dans ${affected.length} enregistrement(s) ? Une sauvegarde complète sera téléchargée avant modification.`))return;
  download('Mon_Ressenti_avant_correction_'+dateLocal()+'.json',JSON.stringify({format:'mon-ressenti',schemaVersion:1,exportedAt:new Date().toISOString(),records:data},null,2),'application/json');
  const t=db.transaction(STORE,'readwrite'),store=t.objectStore(STORE);affected.forEach(x=>store.put(x.record));
  try{await new Promise((resolve,reject)=>{t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)});feedback.textContent=`${affected.length} enregistrement(s) mis à jour. Sauvegarde préalable téléchargée.`;setTimeout(()=>show('settings'),600)}catch(e){alert('Modification interrompue : '+e.message)}
 };
}
function settings(){return heading('Réglages','Sauvegardes et importations.')+`<div class="card"><h2>Sauvegarder et restaurer</h2><p class="muted">Sauvegarde complète JSON. La restauration fusionne par identifiant.</p><div class="actions"><button class="button" id="backup">Sauvegarder JSON</button><button class="button secondary" id="csv">Exporter CSV</button><label class="button secondary" for="restore">Importer JSON</label><input type="file" id="restore" accept=".json,application/json" hidden></div></div><div class="card"><h2>Migration MMP · transfert définitif</h2><p>Importer le fichier JSON privé préparé à partir du rapport complet du 13.10.2026. Aucun document n’est envoyé à GitHub.</p><label class="button" for="mmpfile">Choisir le fichier MMP JSON</label><input type="file" id="mmpfile" accept=".json,application/json" hidden><div id="mmp-preview" class="footnote"></div><p class="footnote">Les heures MMP disponibles sont conservées. Les notes des bilans non encore extraites du PDF restent inconnues. Les champs originaux sont conservés.</p><button class="button secondary" id="mmpclear">Effacer uniquement les imports MMP</button></div><div class="card"><h2>Gestion des facteurs</h2><p class="muted">Renommer, fusionner ou supprimer un terme dans tous les enregistrements. Une sauvegarde JSON est téléchargée avant toute modification.</p><label for="factor-group">Groupe</label><select id="factor-group">${Object.entries(MR_GROUPS).map(([k,g])=>`<option value="${k}">${esc(g.title)}</option>`).join('')}</select><label for="factor-source">Facteur à modifier</label><select id="factor-source"></select><label for="factor-action">Opération</label><select id="factor-action"><option value="merge">Fusionner avec un autre facteur</option><option value="rename">Renommer</option><option value="delete">Supprimer le facteur</option></select><div id="factor-target-wrap"><label for="factor-target">Facteur de destination</label><select id="factor-target"></select></div><button class="button" type="button" id="factor-apply">Appliquer aux enregistrements</button><p class="muted" id="factor-feedback"></p></div><div class="card"><h2>À propos</h2><p>Mon Ressenti · Observer pour comprendre. Comprendre pour agir. Agir pour mieux vivre. · v0.2.41</p><p class="muted">Journal personnel, pas une application médicale. Stockage local.</p></div>`}
function download(filename,content,mime){let a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type:mime}));a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}function csvEscape(x){return '"'+String(x??'').replace(/"/g,'""')+'"'}

// Rapport v0.2.41 : l'application reste en mémoire, avec ses événements et sa base locale.
let mrReportSaved=null;
window.MonRessentiShowReport=function(html){
  if(mrReportSaved)return;
  const doc=new DOMParser().parseFromString(html,'text/html');
  const style=doc.querySelector('style');
  const original=document.createDocumentFragment();
  while(document.body.firstChild)original.appendChild(document.body.firstChild);
  const reportStyle=document.createElement('style');
  reportStyle.textContent=style?style.textContent:'';
  document.head.appendChild(reportStyle);
  const title=document.title;
  mrReportSaved={original,reportStyle,title};
  while(doc.body.firstChild)document.body.appendChild(doc.body.firstChild);
  document.title='Rapport des ressentis personnels · v0.2.41';
  // Diagnostic local, sans stockage ni transfert de données.
  const printButton=document.getElementById('report-print');
  if(printButton){
    printButton.removeAttribute('onclick');
    printButton.addEventListener('click',function(e){
      e.preventDefault();
      const lines=[];
      const stamp=()=>new Date().toLocaleTimeString('fr-CH');
      const add=(v)=>{lines.push(stamp()+' — '+v);showResult();};
      const showResult=()=>{
        let panel=document.getElementById('mr-print-diagnostic');
        if(!panel){
          panel=document.createElement('div');panel.id='mr-print-diagnostic';
          panel.style.cssText='position:fixed;z-index:2147483647;bottom:12px;left:12px;right:12px;background:#fff;color:#123;padding:14px;border:3px solid #187a85;border-radius:10px;box-shadow:0 2px 25px #0006;font:15px system-ui;max-height:55vh;overflow:auto';
          panel.innerHTML='<strong>Diagnostic impression · v0.2.41</strong><p style="font-size:12px">Test indépendant du rapport : une page de texte neutre, sans donnée personnelle.</p><pre id="mr-print-log" style="white-space:pre-wrap;font:13px system-ui"></pre><button type="button" id="mr-print-minimal" style="padding:9px;margin-right:8px">Tester impression simple</button><button type="button" id="mr-print-dismiss" style="padding:9px">Fermer le diagnostic</button>';
          panel.querySelector('#mr-print-minimal').onclick=()=>{
            add('Test simple : clic reçu, création d’une feuille neutre');
            // Conserve les deux feuilles et le rapport : seul le rendu imprimé est temporairement remplacé.
            const test=document.createElement('div');test.id='mr-print-minimal-sheet';
            test.textContent='TEST IMPRESSION — MON RESSENTI v0.2.41';
            test.style.cssText='display:none';
            const css=document.createElement('style');
            css.textContent='@media print{body > :not(#mr-print-minimal-sheet){display:none!important}#mr-print-minimal-sheet{display:block!important;position:static!important;font:22px Arial,sans-serif!important;margin:20mm!important;color:#000!important}}';
            document.head.appendChild(css);document.body.appendChild(test);
            let done=false;
            const cleanup=()=>{if(done)return;done=true;css.remove();test.remove();};
            window.addEventListener('afterprint',()=>{add('Test simple : afterprint reçu');cleanup();},{once:true});
            try{add('Test simple : appel direct de window.print()');window.print();add('Test simple : window.print() terminé');}
            catch(err){add('Test simple : erreur '+err.message);}
            setTimeout(()=>{cleanup();add('Test simple : contrôle terminé (aperçu visible ou non ?)');},3000);
          };
          document.body.appendChild(panel);
          panel.querySelector('#mr-print-dismiss').onclick=()=>panel.remove();
        }
        panel.querySelector('#mr-print-log').textContent=lines.join('\n');
      };
      add('Clic reçu sur le bouton du rapport');
      add('window.print : '+typeof window.print);
      add('Contexte : '+(window.matchMedia('(display-mode: standalone)').matches?'PWA autonome':'navigateur / autre'));
      add('Document : '+document.readyState+' ; feuilles A4 : '+document.querySelectorAll('.sheet').length);
      let before=false,after=false;
      const onBefore=()=>{before=true;add('Événement beforeprint reçu');};
      const onAfter=()=>{after=true;add('Événement afterprint reçu');};
      window.addEventListener('beforeprint',onBefore,{once:true});
      window.addEventListener('afterprint',onAfter,{once:true});
      try{add('Appel de window.print()');window.print();add('window.print() a rendu la main');}
      catch(err){add('ERREUR : '+err.name+' : '+err.message);}
      setTimeout(()=>add('Après 2 secondes : beforeprint='+before+' ; afterprint='+after),2000);
    });
  }
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
  document.title=saved.title;
  mrReportSaved=null;
  window.scrollTo(0,0);
};

function wire(data){
  mrWire();
  const rootTest=document.getElementById('print-root-test');
  if(rootTest)rootTest.onclick=()=>{
    const result=document.getElementById('print-root-result');
    const lines=[];
    const log=t=>{lines.push(new Date().toLocaleTimeString('fr-CH')+' — '+t);result.textContent=lines.join('\n');result.style.whiteSpace='pre-line';};
    log('Clic reçu dans Réglages');
    log('Contexte : '+(window.matchMedia('(display-mode: standalone)').matches?'PWA autonome':'navigateur / autre'));
    log('window.print : '+typeof window.print);
    let before=false,after=false;
    window.addEventListener('beforeprint',()=>{before=true;log('beforeprint reçu')},{once:true});
    window.addEventListener('afterprint',()=>{after=true;log('afterprint reçu')},{once:true});
    // Ne remplace ni la page ni le rapport : le CSS print temporaire masque
    // le reste de l'application et affiche uniquement une phrase neutre.
    const test=document.createElement('div');test.id='mr-root-print-test';
    test.textContent='Test impression Mon Ressenti v0.2.41 — page neutre.';
    const style=document.createElement('style');
    style.textContent='@media screen {#mr-root-print-test{display:none}} @media print {body > *:not(#mr-root-print-test){display:none!important} #mr-root-print-test{display:block!important;position:static!important;color:black!important;background:white!important;font:18pt Arial,sans-serif!important;padding:20mm!important}}';
    document.body.append(test,style);
    try{log('Appel direct de window.print() depuis Réglages');window.print();log('window.print() a rendu la main');}
    catch(err){log('ERREUR : '+err.name+' : '+err.message);}
    setTimeout(()=>{log('Bilan : beforeprint='+before+' ; afterprint='+after);test.remove();style.remove()},2500);
  };
  const cacheCheck=document.getElementById('cache-check');
  if(cacheCheck)cacheCheck.onclick=async()=>{
    const result=document.getElementById('cache-result');
    cacheCheck.disabled=true;
    result.textContent='Vérification des fichiers en ligne…';
    try{
      // Les données IndexedDB et localStorage ne sont jamais touchées.
      if(!navigator.onLine)throw Error('Appareil hors connexion. Réessaie avec Internet.');
      const paths=['./index.html','./app.js','./report.js','./sw.js'];
      for(const path of paths){
        const response=await fetch(path+'?diagnostic=0.2.37-'+Date.now(),{cache:'no-store'});
        if(!response.ok)throw Error(path+' : HTTP '+response.status);
        const content=await response.text();
        if(!content.includes('0.2.37'))throw Error(path+' : le serveur ne fournit pas la v0.2.41');
      }
      result.textContent='Les quatre fichiers v0.2.41 sont accessibles. Actualisation du cache…';
      if('caches' in window){
        const names=await caches.keys();
        await Promise.all(names.filter(name=>name.startsWith('mon-ressenti-')).map(name=>caches.delete(name)));
      }
      if('serviceWorker' in navigator){
        const registration=await navigator.serviceWorker.getRegistration();
        if(registration)await registration.update();
      }
      // Rechargement après contrôle réseau ; aucune suppression de données personnelles.
      location.replace('./index.html?actualisation=0.2.37-'+Date.now());
    }catch(error){
      result.textContent='Actualisation interrompue : '+error.message+'. Aucune donnée personnelle modifiée.';
      cacheCheck.disabled=false;
    }
  };
if($('#report-open'))$('#report-open').onclick=()=>{const keys=['name','dob','onset','initialLocation','diagnosisDate','syndrome'];const labels=['Nom et prénom','Date de naissance (AAAA-MM-JJ)','Date(s) des premiers symptômes','Localisation(s) initiale(s)','Date(s) du diagnostic','Syndrome(s) / diagnostic(s) déclaré(s)'];let profile={};for(const key of keys)profile[key]=localStorage.getItem('mr-report-'+key)||'';if(!profile.dob)profile.dob=localStorage.getItem('mr-report-dob')||'';let html=MonRessentiReport.make(data,profile);window.MonRessentiShowReport(html);/* Semainier Ma Santé : préparer puis imprimer après rendu */setTimeout(()=>{if(mrReportSaved)window.print()},100)};document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{editing=null;window.nextType=b.dataset.type||null;show(b.dataset.go)});document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{returnPage=page;returnScroll=window.scrollY;editing=b.dataset.edit;show('new')});document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(confirm('Supprimer définitivement cette entrée ?')){await del(b.dataset.delete);show(page)}});if($('#filter'))$('#filter').onchange=e=>{filter=e.target.value;show('journal')};if($('#journal-search'))$('#journal-search').oninput=e=>{journalQuery=e.target.value;const q=journalQuery.trim().toLocaleLowerCase('fr');const matches=x=>!q||JSON.stringify(x).toLocaleLowerCase('fr').includes(q);const found=data.filter(x=>(filter==='all'||x.type===filter)&&matches(x));$('#journal-results').innerHTML=found.length?found.map(item).join(''):'<div class="empty">Aucun enregistrement correspondant.</div>';document.querySelectorAll('#journal-results [data-edit]').forEach(b=>b.onclick=()=>{returnPage='journal';returnScroll=window.scrollY;editing=b.dataset.edit;show('new')});document.querySelectorAll('#journal-results [data-delete]').forEach(b=>b.onclick=async()=>{if(confirm('Supprimer définitivement cette entrée ?')){await del(b.dataset.delete);show('journal')}})};mrWireFactorManager(data);if($('#cancel-edit'))$('#cancel-edit').onclick=async()=>{const dest=editing?returnPage:'home',scroll=returnScroll;editing=null;await show(dest);if(dest==='journal')requestAnimationFrame(()=>window.scrollTo(0,scroll))};if($('#location'))$('#location').onchange=e=>{let other=e.target.value==='__other__';$('#location-other').hidden=!other;if(other)$('#location-other').focus()};if($('#type'))$('#type').onchange=e=>{let v=e.target.value;if(v==='__other__'){let i=$('#type-other');i.hidden=false;i.focus();return}editing=null;window.nextType=v;show('new')};document.querySelectorAll('#scale button').forEach(b=>b.onclick=()=>{const was=b.classList.contains('sel');document.querySelectorAll('#scale button').forEach(a=>{const on=a===b&&!was;a.classList.toggle('sel',on);a.setAttribute('aria-pressed',on?'true':'false')})});document.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{b.classList.toggle('sel');b.setAttribute('aria-pressed',b.classList.contains('sel')?'true':'false')});if($('#entry'))$('#entry').onsubmit=async e=>{e.preventDefault();let old=editing?await get(editing):null,type=$('#type').value==='__other__'?$('#type-other').value.trim():$('#type').value,when=$('#when').value,score=$('#scale .sel')&&$('#scale .sel').dataset.score!==''?Number($('#scale .sel').dataset.score):null;if(!when)return alert('Date obligatoire');if(!type||type==='__other__')return alert('Indique un type d’enregistrement');if(type.length>100)return alert('Type trop long');let loc=$('#location')?($('#location').value==='__other__'?$('#location-other').value.trim():$('#location').value.trim()):'';if($('#location')&&$('#location').value==='__other__'&&!loc)return alert('Indique une localisation');let r={...(old||{}),id:old?.id||uid(),type,when,score,location:type!=='daily'?loc:'',note:$('#note').value.trim(),source:old?.source||'manual',createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),...(old?.source==='mmp'?{mmpPage:old.mmpPage,mmpOriginalDate:old.mmpOriginalDate,mmpOriginalFields:old.mmpOriginalFields,mmpStatus:old.mmpStatus}: {})};document.querySelectorAll('[data-chips]').forEach(g=>r[g.dataset.chips]=[...g.querySelectorAll('.sel')].map(b=>b.dataset.val));
 if(type!=='daily'){
  document.querySelectorAll('[data-factor]').forEach(g=>r[g.dataset.factor==='activities'?'tags':g.dataset.factor]=[...g.querySelectorAll('.mr-choice input:checked')].map(i=>i.value));
  r.treatmentDetails={medications:{},interventions:{}};
  for(const key of ['medications','interventions']){
   const group=document.querySelector(`[data-factor="${key}"]`);
   group?.querySelectorAll('.mr-choice input:checked').forEach(c=>{
    const panel=c.closest('.mr-choice').nextElementSibling;
    if(!panel?.classList.contains('mr-effect-detail'))return;
    const effect=panel.querySelector('.mr-effect-select')?.value||'unknown';
    const dose=key==='medications'?(panel.querySelector('.mr-dose')?.value||'').trim():'';
    const quantityText=key==='medications'?(panel.querySelector('.mr-quantity')?.value||'').trim():'';const quantity=quantityText!==''?Number(quantityText):null;const unit=key==='medications'?(panel.querySelector('.mr-unit')?.value||''):'';r.treatmentDetails[key][c.value]={effect,...(dose?{dose}:{}),...(quantity!==null&&Number.isFinite(quantity)&&quantity>=0?{quantity,unit}:{})};
   });
  }
  r.location=r.locations?.[0]||'';
  r.moment={};document.querySelectorAll('[data-period]:checked').forEach(i=>(r.moment[i.dataset.period]??=[]).push(i.value));
  r.customGroups={};document.querySelectorAll('[data-custom]').forEach(g=>r.customGroups[g.dataset.custom]=[...g.querySelectorAll('.mr-choice input:checked')].map(i=>i.value));
 }
 await put(r);editing=null;const dest=old?returnPage:'home',scroll=returnScroll;await show(dest);if(old&&dest==='journal')requestAnimationFrame(()=>window.scrollTo(0,scroll))};if($('#mmpfile'))$('#mmpfile').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let j=JSON.parse(await f.text());if(j.format!=='mon-ressenti-mmp-migration'||j.schemaVersion!==1||!Array.isArray(j.records))throw Error('Format MMP non reconnu');if(j.records.some(r=>!r||r.source!=='mmp'||typeof r.id!=='string'||!['pain','daily'].includes(r.type)||!/^\d{4}-\d\d-\d\d/.test(r.when)||!(r.score===null||(Number.isInteger(r.score)&&r.score>=0&&r.score<=10))))throw Error('Enregistrements invalides');let pain=j.records.filter(r=>r.type==='pain').length,daily=j.records.length-pain,unknown=j.records.filter(r=>r.score===null).length;$('#mmp-preview').textContent=`${pain} ressentis, ${daily} bilans, ${unknown} scores inconnus. Source : ${j.sourceDate||'non précisée'}.`;if(!confirm(`Importer ${j.records.length} entrées MMP ? Les imports MMP existants seront remplacés, les saisies manuelles conservées. ${unknown} scores restent inconnus.`))return;let existing=await all();let backup={format:'mon-ressenti',schemaVersion:1,exportedAt:new Date().toISOString(),records:existing};download('Mon_Ressenti_avant_import_'+dateLocal()+'.json',JSON.stringify(backup,null,2),'application/json');let t=db.transaction(STORE,'readwrite'),s=t.objectStore(STORE);existing.filter(r=>r.source==='mmp').forEach(r=>s.delete(r.id));j.records.forEach(r=>s.put(r));await new Promise((resolve,reject)=>{t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)});alert(`Import terminé : ${pain} ressentis et ${daily} bilans. Sauvegarde préalable téléchargée.`);show('home')}catch(err){alert('Import MMP refusé : '+err.message)}};if($('#mmpclear'))$('#mmpclear').onclick=async()=>{let d=(await all()).filter(r=>r.source==='mmp');if(!d.length)return alert('Aucun import MMP');if(!confirm(`Effacer les ${d.length} entrées MMP ? Les saisies manuelles resteront intactes.`))return;let t=db.transaction(STORE,'readwrite'),s=t.objectStore(STORE);d.forEach(r=>s.delete(r.id));await new Promise((resolve,reject)=>{t.oncomplete=resolve;t.onerror=()=>reject(t.error)});show('settings')};if($('#backup'))$('#backup').onclick=async()=>{let d=await all();download('Mon_Ressenti_sauvegarde_'+dateLocal()+'.json',JSON.stringify({format:'mon-ressenti',schemaVersion:1,exportedAt:new Date().toISOString(),records:d},null,2),'application/json')};if($('#csv'))$('#csv').onclick=async()=>{let d=await all(),keys=['id','type','when','score','location','features','symptoms','aggravating','medications','interventions','moment','environment','customGroups','relieving','tags','note','source'];download('Mon_Ressenti_'+dateLocal()+'.csv','\ufeff'+keys.join(';')+'\n'+d.map(r=>keys.map(k=>csvEscape(Array.isArray(r[k])?r[k].join(' | '):(r[k]&&typeof r[k]==='object'?JSON.stringify(r[k]):r[k]))).join(';')).join('\n'),'text/csv;charset=utf-8')};if($('#restore'))$('#restore').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let j=JSON.parse(await f.text());if(j.format!=='mon-ressenti'||j.schemaVersion!==1||!Array.isArray(j.records))throw Error('Format de sauvegarde non reconnu');if(j.records.some(r=>!r||typeof r.id!=='string'||typeof r.type!=='string'||!r.type.trim()||typeof r.when!=='string'||!(r.score===null||(Number.isInteger(r.score)&&r.score>=0&&r.score<=10))))throw Error('Une ou plusieurs entrées sont invalides');if(!confirm(`Importer ${j.records.length} entrées ? Les identifiants existants identiques seront remplacés.`))return;for(let r of j.records)await put(r);alert('Import terminé : '+j.records.length+' entrées traitées.');show('settings')}catch(err){alert('Import refusé : '+err.message)}}}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{editing=null;window.nextType=null;show(b.dataset.page)});(async()=>{try{db=await openDB();await show('home');if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js?v=0.2.49',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{})}catch(e){$('#screen').innerHTML='<div class="warn">Impossible d’ouvrir le stockage local. Vérifie les autorisations du navigateur et évite la navigation privée.</div>';console.error(e)}})();
