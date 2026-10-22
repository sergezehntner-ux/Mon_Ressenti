/* Rapport descriptif local : aucun transfert réseau, aucune donnée fictive. */
(function(){
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=s=>String(s||'').slice(0,10);
const fr=s=>/^\d{4}-\d\d-\d\d$/.test(s)?s.slice(8)+'.'+s.slice(5,7)+'.'+s.slice(0,4):'—';
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const nfmt=n=>n===null?'—':n.toFixed(1).replace('.',',');
const nums=a=>a.filter(x=>Number.isFinite(x));
const colors=['#d95757','#1680c6','#119a74','#b17d21','#8859bb','#d17b35','#53788a'];
const field=(r,key)=>{const a=r[key];if(Array.isArray(a)&&a.length)return a;if(typeof a==='string'&&a.trim())return a.split(/[,;|]/).map(s=>s.trim()).filter(Boolean);if(key==='environment'){const orig=r.mmpOriginalFields||{};return [...new Set(['Environnements','Environnement'].flatMap(k=>{const v=orig[k];return Array.isArray(v)?v:typeof v==='string'?v.split(/[,;|]/):[]}).map(v=>String(v).trim()).filter(Boolean))]}return []};
function svgLines(series,minDate,maxDate){const W=730,H=240,L=42,R=12,T=12,B=35,span=Math.max(1,maxDate-minDate),plotW=W-L-R,plotH=H-T-B;let lines='';for(let i=0;i<=5;i++){let y=T+plotH-i*plotH/5;lines+=`<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="#e2ebef"/><text x="${L-7}" y="${y+4}" font-size="11" text-anchor="end" fill="#5a747b">${i*2}</text>`}series.forEach((s,j)=>{let points=s.values.map(v=>`${(L+(v.t-minDate)/span*plotW).toFixed(1)},${(T+plotH-v.v/10*plotH).toFixed(1)}`).join(' ');if(points)lines+=`<polyline fill="none" stroke="${s.color}" stroke-width="2.8" stroke-linejoin="round" points="${points}"/>`});lines+=`<text x="${L}" y="${H-8}" font-size="12" fill="#5a747b">${fr(new Date(minDate).toISOString().slice(0,10))}</text><text x="${W-R}" y="${H-8}" text-anchor="end" font-size="12" fill="#5a747b">${fr(new Date(maxDate).toISOString().slice(0,10))}</text>`;return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbes des moyennes hebdomadaires sur dix">${lines}</svg>`}
function chart(records, groups){const valid=records.filter(r=>Number.isFinite(r.score)&&/^\d{4}-\d\d-\d\d/.test(r.when));if(!valid.length)return '<p>Aucune intensité renseignée pour tracer une courbe.</p>';const times=valid.map(r=>new Date(day(r.when)+'T12:00:00').getTime()),min=Math.min(...times),max=Math.max(...times);let series=groups.map((g,i)=>{let filtered=valid.filter(g.test),days=new Map();filtered.forEach(r=>{let t=new Date(day(r.when)+'T12:00:00').getTime(),bucket=Math.floor((t-min)/604800000);if(!days.has(bucket))days.set(bucket,[]);days.get(bucket).push(r.score)});return {label:g.label,color:colors[i%colors.length],values:[...days].sort((a,b)=>a[0]-b[0]).map(([bucket,arr])=>({t:min+bucket*604800000+302400000,v:mean(arr)}))}}).filter(s=>s.values.length);return svgLines(series,min,max)+`<div class="legend">${series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join('')}</div>`}
function tableRows(groups){return groups.map(g=>{const values=nums(g.rows.map(r=>r.score)),sorted=[...g.rows].sort((a,b)=>day(a.when).localeCompare(day(b.when))),first=sorted.slice(0,Math.max(1,Math.ceil(sorted.length/4))),last=sorted.slice(-Math.max(1,Math.ceil(sorted.length/4))),early=mean(nums(first.map(r=>r.score))),recent=mean(nums(last.map(r=>r.score)));let trend=early===null||recent===null?'—':Math.abs(recent-early)<.3?'→':recent>early?'↑':'↓';return `<tr><td>${esc(g.label)}</td><td>${g.rows.length}</td><td>${nfmt(mean(values))}</td><td>${values.length?Math.min(...values):'—'}</td><td>${values.length?Math.max(...values):'—'}</td><td>${trend} ${early===null||recent===null?'Données insuffisantes':`${nfmt(early)} → ${nfmt(recent)}`}</td></tr>`}).join('')}
function hist(rows,label,color){
 const scores=nums(rows.map(r=>r.score));
 const counts=Array.from({length:11},(_,i)=>scores.filter(v=>v===i).length);
 const peak=Math.max(1,...counts),step=peak<=10?2:peak<=30?5:peak<=60?10:20;
 const ymax=Math.ceil(peak/step)*step,W=730,H=125,left=46,right=12,top=10,bottom=24;
 const usable=W-left-right,slot=usable/11,plot=H-top-bottom;
 let grid='';for(let n=0;n<=ymax;n+=step){let y=top+plot-n/ymax*plot;grid+=`<line x1="${left}" y1="${y}" x2="${W-right}" y2="${y}" stroke="#dce8eb"/><text x="${left-9}" y="${y+4}" text-anchor="end" font-size="11" fill="#42636d">${n}</text>`}
 const bars=counts.map((count,i)=>{const width=Math.min(35,slot*.68),x=left+i*slot+(slot-width)/2;const height=count/ymax*plot,y=top+plot-height;return `${count?`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}" fill="${color}" rx="1"/>`:''}<text x="${(left+(i+.5)*slot).toFixed(1)}" y="${H-5}" text-anchor="middle" font-size="11" fill="#42636d">${i}</text>`}).join('');
 return `<div class="hist"><b>${esc(label)} (${scores.length})</b><svg class="histogram" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Nombre d'observations par intensité pour ${esc(label)}"><text x="4" y="8" font-size="9" fill="#42636d">Nb</text>${grid}${bars}</svg><div class="hist-axis-label">Axe horizontal : intensité du ressenti ou qualité des capacités (0 à 10) →</div></div>`;
}
function frequencies(rows,kind){const m=new Map();rows.forEach(r=>{let vals=kind==='features'?field(r,'features'):field(r,kind);const orig=r.mmpOriginalFields||{};if(kind==='features'){Object.entries(orig).filter(([k])=>/caract[ée]ristique|sympt[oô]me/i.test(k)).forEach(([,v])=>{if(typeof v==='string')vals.push(...v.split(/[,;|]/).map(x=>x.trim()).filter(Boolean))})} [...new Set(vals)].forEach(x=>m.set(x,(m.get(x)||0)+1))});return [...m].sort((a,b)=>b[1]-a[1])}
function treatmentTable(rows,key){
 const entries=new Map();
 rows.forEach(r=>{const details=r.treatmentDetails?.[key]||{};const names=new Set([...field(r,key),...Object.keys(details)]);names.forEach(name=>{if(!name)return;let o=entries.get(name)||{total:0,better:0,same:0,worse:0,unknown:0,quantities:new Set()};o.total++;const info=details[name]||{};const e=String(info.effect||'unknown').toLowerCase();if(['better','improved','improvement','meilleure','better_after'].includes(e))o.better++;else if(['same','unchanged','nochange','aucun','neutral'].includes(e))o.same++;else if(['worse','aggravated','pire'].includes(e))o.worse++;else o.unknown++;if(info.quantity!==undefined&&info.quantity!==null&&info.quantity!=='')o.quantities.add(String(info.quantity)+' '+String(info.unit||'unité(s)'));entries.set(name,o)})});
 if(!entries.size)return '<p class="hint">Aucune donnée enregistrée dans ce groupe pour la période.</p>';
 return `<table><thead><tr><th>${key==='medications'?'Médicament':'Intervention'}</th><th>Utilisations</th><th>Amélioration</th><th>Sans changement</th><th>Aggravation</th><th>Non renseigné</th></tr></thead><tbody>${[...entries].sort((a,b)=>b[1].total-a[1].total).map(([name,o])=>`<tr><td>${esc(name)}${o.quantities.size?`<small class="hint" style="display:block">Quantité(s) : ${esc([...o.quantities].join(' ; '))}</small>`:''}</td><td>${o.total}</td><td>${o.better}</td><td>${o.same}</td><td>${o.worse}</td><td>${o.unknown}</td></tr>`).join('')}</tbody></table>`;
}
function momentTable(rows){const periods=['Matin','Midi','Soir','Nuit'],types=['Constante','Intermittente','Aiguë'];const any=rows.some(r=>r.moment&&Object.values(r.moment).some(a=>Array.isArray(a)&&a.length));if(!any)return '<p class="hint">Aucun moment renseigné pour la période.</p>';return `<table><thead><tr><th>Période</th>${types.map(t=>`<th>${t}</th>`).join('')}</tr></thead><tbody>${periods.map(p=>`<tr><td>${p}</td>${types.map(t=>`<td>${rows.filter(r=>(r.moment?.[p]||[]).includes(t)).length}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="hint">Chaque chiffre représente le nombre d’enregistrements comportant cette case cochée (par exemple, 1 = une observation « Matin / Constante »). Plusieurs cases peuvent être cochées dans un même enregistrement.</p>`}
function environmentTable(rows){const map=new Map();rows.forEach(r=>{const values=field(r,'environment');values.forEach(v=>{let a=map.get(v)||[];a.push(r);map.set(v,a)})});if(!map.size)return '<p class="hint">Aucun environnement renseigné pour la période.</p>';return `<table><thead><tr><th>Environnement</th><th>Mentions</th><th>Intensité moyenne /10</th></tr></thead><tbody>${[...map].sort((a,b)=>b[1].length-a[1].length).map(([v,a])=>`<tr><td>${esc(v)}</td><td>${a.length}</td><td>${nfmt(mean(nums(a.map(r=>r.score))))}</td></tr>`).join('')}</tbody></table><p class="hint">Association descriptive uniquement ; aucune relation de causalité déduite.</p>`}
function activityTable(rows){const groups=new Map();rows.forEach(r=>{const unique=[...new Set(field(r,'tags').map(x=>String(x).trim()).filter(Boolean))];unique.forEach(name=>{if(!groups.has(name))groups.set(name,[]);groups.get(name).push(r)})});if(!groups.size)return '<p class="hint">Aucune activité significative renseignée dans les bilans quotidiens de cette période.</p>';return `<table><thead><tr><th>Activité significative</th><th>Bilans concernés</th><th>Capacité moyenne /10</th></tr></thead><tbody>${[...groups].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0],'fr')).map(([name,items])=>`<tr><td>${esc(name)}</td><td>${items.length}</td><td>${nfmt(mean(nums(items.map(r=>r.score))))}</td></tr>`).join('')}</tbody></table><p class="hint">Associations descriptives uniquement : aucune relation de causalité n’est déduite. Les scores manquants ne sont pas pris en compte dans la moyenne.</p>`}
function make(rows,profile,mode="all"){const sorted=[...rows].filter(r=>r&&r.when).sort((a,b)=>a.when.localeCompare(b.when));const first=day(sorted[0]?.when),last=day(sorted.at(-1)?.when),pain=sorted.filter(r=>r.type!=='daily'),daily=sorted.filter(r=>r.type==='daily');const locations=[...new Set(pain.map(r=>String(r.location||'').trim()||'Sans localisation'))];const groups=[...locations.map(l=>({label:l,rows:pain.filter(r=>(String(r.location||'').trim()||'Sans localisation')===l),test:r=>r.type!=='daily'&&(String(r.location||'').trim()||'Sans localisation')===l})),{label:'Qualité des capacités (bilan quotidien)',rows:daily,test:r=>r.type==='daily'}].filter(g=>g.rows.length);const features=frequencies(pain,'features'),aggr=frequencies(pain,'aggravating'),relief=frequencies(pain,'relieving');const nDays=first&&last?Math.round((new Date(last+'T12:00:00')-new Date(first+'T12:00:00'))/86400000)+1:0;
const periodLabel=(arr)=>arr.length?`${fr(day(arr[0].when))} – ${fr(day(arr[arr.length-1].when))}`:'—';const thirdN=Math.max(1,Math.floor(pain.length/3)),thirdEarly=pain.slice(0,thirdN),thirdLate=pain.slice(-thirdN);const scored=sorted.filter(r=>Number.isFinite(r.score)),quarterN=Math.max(1,Math.ceil(scored.length/4)),quarterEarly=scored.slice(0,quarterN),quarterLate=scored.slice(-quarterN);
const symptomRows=features.slice(0,9).map(([name,count])=>{const matching=pain.filter(r=>{let orig=Object.entries(r.mmpOriginalFields||{}).filter(([k])=>/caract[ée]ristique|sympt[oô]me/i.test(k)).map(([,v])=>String(v)).join(',');return field(r,'features').includes(name)||orig.includes(name)});let early=thirdEarly,late=thirdLate,e=early.filter(r=>matching.includes(r)).length,l=late.filter(r=>matching.includes(r)).length;return `<tr><td>${esc(name)}</td><td>${count}</td><td>${e}/${early.length}</td><td>${l}/${late.length}</td><td>${e&&early.length&&late.length?`${Math.round(((l/late.length)/(e/early.length)-1)*100)} %`:'—'}</td></tr>`}).join('');
const factor=(arr,title)=>`<div class="factor"><h3>${title}</h3>${arr.length?arr.slice(0,8).map(([name,n])=>`<div class="factorrow"><span>${esc(name)}</span><b>${n}</b></div>`).join(''):'<p>Non renseigné</p>'}<small>Nombre de mentions, pas un effet causal mesuré.</small></div>`;
const displayName=profile.name.trim()||'Identité non renseignée';const dob=profile.dob?fr(profile.dob):'Non renseignée';
const reportHtml=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rapport des ressentis personnels</title><style>
@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{margin:0;color:#153b52;font-family:Arial,sans-serif;background:#e7f0f1}.toolbar{padding:12px 18px;background:#174d5b;color:white;display:flex;gap:12px;align-items:center;justify-content:center}.toolbar button{background:#d8f1ea;border:0;border-radius:7px;padding:10px 17px;font-weight:bold;cursor:pointer}.sheet{width:194mm;min-height:281mm;margin:12px auto;background:white;padding:10mm 11mm 8mm;box-shadow:0 3px 18px #2344;position:relative;break-after:page;page-break-after:always}.sheet:last-child{break-after:auto;page-break-after:auto}.report-head{display:flex;justify-content:space-between;border-bottom:2px solid #17839a;padding-bottom:8px}.report-head h1{font-size:22px;margin:0}.report-head h2{font-size:19px;margin:0}.report-head p{margin:3px 0;font-size:12px}.identity{background:#edf7f8;border-radius:8px;padding:8px 10px;margin:8px 0;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;font-size:11px}.identity b{display:block;color:#136d82;margin-bottom:4px}.identity span{white-space:pre-line}.section{margin-top:10px}.section h2{font-size:15px;margin:0 0 7px;color:#075b82}.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.tile{background:#edf7f8;padding:10px;border-radius:7px;font-size:11px}.tile strong{display:block;font-size:22px;color:#076887}.graph{width:100%;max-height:195px}.graph svg{width:100%;height:175px}.legend{display:flex;gap:20px;justify-content:center;align-items:center;flex-wrap:wrap;font-size:12px;margin-top:7px}.legend span{display:flex;align-items:center;gap:4px}.legend i{display:inline-block;width:24px;height:5px;border-radius:3px;flex:none}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#d9eff2;color:#135673;text-align:left}td,th{padding:5px;border:1px solid #d4e4e8}td:not(:first-child),th:not(:first-child){text-align:center}.histgrid{display:flex;flex-direction:column;gap:10px}.hist{flex:1;min-width:0;font-size:10px}.histbars{height:105px;display:flex;align-items:flex-end;gap:3px;border-bottom:1px solid #aac6ca}.histbars>div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:end}.histbars span{display:block;width:100%;max-width:18px}.histbars small{font-size:9px}.hist-axis-label{text-align:center;font-size:10px;color:#42636d;margin-top:1px}.histogram{display:block;width:100%;height:115px;overflow:visible}.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}.factor{border:1px solid #d7e6e8;border-radius:6px;padding:9px}.factor h3{font-size:13px;margin:0 0 7px}.factorrow{display:flex;justify-content:space-between;border-bottom:1px solid #e6eff0;padding:4px 0;font-size:11px}.factor small,.hint{font-size:10px;color:#59767d}.report-foot{position:absolute;bottom:5mm;left:11mm;right:11mm;border-top:1px solid #b5d4da;padding-top:5px;display:flex;justify-content:space-between;font-size:9px;color:#4e7280}.note{background:#eef7f6;padding:10px;font-size:11px;line-height:1.5}.sheet.second{padding-top:11mm}@media print{body{background:white}.toolbar{display:none}.sheet{margin:0;width:190mm;height:265mm;min-height:0;max-height:265mm;box-shadow:none;padding:4mm 5mm 10mm;overflow:hidden;break-inside:avoid;page-break-inside:avoid;break-after:page;page-break-after:always}.sheet:last-child{break-after:auto;page-break-after:auto}.report-foot{left:5mm;right:5mm;bottom:2mm}.section{margin-top:13px}.section h2{font-size:12px;margin-bottom:6px}.report-head h1{font-size:18px}.report-head h2{font-size:15px}.report-head p{font-size:10px}.identity{font-size:9px;gap:6px;padding:6px}.tile{padding:6px;font-size:9px}.tile strong{font-size:17px}.graph{max-height:155px}.graph svg{height:145px}table{font-size:9px}td,th{padding:3px}.histbars{height:75px}.histogram{height:94px}.factor{padding:5px}.factor h3{font-size:10px}.factorrow{padding:2px 0;font-size:9px}.factor small,.hint{font-size:8px}.note{padding:6px;font-size:9px;line-height:1.3}.note p{margin:3px 0}.sheet.second{padding-top:4mm}.sheet.second .section{margin-top:26px}.sheet.second .section:first-child{margin-top:8px}}@media screen and (max-width:1100px){.sheet{transform-origin:top left;margin:10px;width:194mm;box-shadow:none}body{overflow-x:auto}}
.interpretation{border-top:2px solid #17839a;padding-top:7px}.interpretation-disclaimer{font-size:10px;line-height:1.4;background:#eef7f6;padding:7px;border-left:3px solid #17839a;margin:5px 0}.sheet:first-of-type .note{font-size:10px}@media print{.interpretation-disclaimer{font-size:8px;padding:4px}.sheet:first-of-type .section{margin-top:8px}.sheet:first-of-type .graph svg{height:110px}.sheet:first-of-type .graph{max-height:122px}.sheet:first-of-type .identity{margin:5px 0}.sheet:first-of-type .note{font-size:8px;line-height:1.2}}

/* v0.2.49 : présentation seulement, aucun changement au moteur d’impression */
.report-head{position:relative;min-height:65px;align-items:center}
.report-head .report-logo{position:absolute;left:50%;top:0;transform:translateX(-50%);width:53px;height:53px;object-fit:contain}
.section{margin-top:20px}.section h2{margin-bottom:10px}
.sheet:first-of-type .graph,.sheet:first-of-type .graph svg{width:100%;max-height:none;height:auto}
.sheet:first-of-type .graph svg{aspect-ratio:730/240;display:block}
@media print{
 .section{margin-top:19px}.section h2{font-size:14px;margin-bottom:9px}
 .report-head h1{font-size:19px}.report-head h2{font-size:16px}.report-head p{font-size:11px}
 .report-head .report-logo{width:48px;height:48px}
 .identity{font-size:10px}.tile{font-size:10px}.tile strong{font-size:18px}
 table{font-size:10px}td,th{padding:4px}.factorrow{font-size:10px;padding:3px 0}
 .note{font-size:10px;line-height:1.4}.interpretation-disclaimer{font-size:9px;line-height:1.35}
 .sheet:first-of-type .graph,.sheet:first-of-type .graph svg{max-height:none;height:auto}
 .sheet:first-of-type .section{margin-top:15px}
 .sheet.second .section{margin-top:26px}
}

/* v0.2.49 : pied de page discret, aucun changement au déclenchement d’impression */
.report-foot{font-size:7px;padding-top:2px;bottom:3mm;line-height:1.1}
@media print{.report-foot{font-size:6px;padding-top:2px;bottom:1.5mm}}
</style></head><body><div class="toolbar"><span>Rapport calculé uniquement avec les données présentes sur cet appareil. · v0.2.49</span><button type="button" id="report-print" onclick="window.print()">Imprimer / Enregistrer en PDF</button><button id="report-close" type="button">Fermer / Retour à Mon Ressenti</button></div><article class="sheet"><div class="report-head"><img class="report-logo" src="${esc(new URL('icon-192.png',location.href).href)}" alt="Icône Mon Ressenti"><div><h1>${esc(displayName)}</h1><p>Né(e) le ${esc(dob)}</p></div><div style="text-align:right"><h2>Rapport des ressentis personnels</h2><p>${fr(first)} – ${fr(last)}</p><p>Généré le ${fr(new Date().toISOString().slice(0,10))}</p></div></div><div class="identity"><div><b>Date des premiers symptômes</b><span>${esc(profile.onset||'Non renseignée')}</span></div><div><b>Localisation initiale</b><span>${esc(profile.initialLocation||'Non renseignée')}</span></div><div><b>Date du diagnostic</b><span>${esc(profile.diagnosisDate||'Non renseignée')}</span></div><div><b>Syndrome / diagnostic déclaré</b><span>${esc(profile.syndrome||'Non renseigné')}</span></div></div><section class="section"><h2>Vue d’ensemble de la période</h2><div class="tiles"><div class="tile"><strong>${nDays}</strong>jours dans la période</div><div class="tile"><strong>${sorted.length}</strong>enregistrements</div><div class="tile"><strong>${pain.length}</strong>ressentis / observations</div><div class="tile"><strong>${daily.length}</strong>bilans quotidiens</div></div></section><section class="section"><h2>Évolution des ressentis et capacités (moyennes par semaine)</h2><div class="graph">${chart(sorted,groups)}</div></section><section class="section interpretation"><h2>Interprétation personnelle des ressentis</h2><p class="interpretation-disclaimer">Cette interprétation repose exclusivement sur les ressentis personnels consignés au cours de la période analysée. Elle décrit des observations et des tendances statistiques, sans constituer un diagnostic médical ni établir de relation de causalité.</p></section><section class="section"><h2>Évolution ressentie des symptômes</h2><div class="note">${features.length?`Les symptômes les plus souvent consignés sont : ${features.slice(0,5).map(([k,n])=>`${esc(k)} (${n} mentions)`).join(', ')}. Le tableau de la section 3 compare leur présence dans les observations des périodes ${esc(periodLabel(thirdEarly))} et ${esc(periodLabel(thirdLate))}.`:'Les données disponibles ne permettent pas de décrire l’évolution des symptômes associés.'} Les valeurs sont descriptives : les jours sans enregistrement ne sont pas considérés comme des jours sans symptômes.</div></section><section class="section"><h2>Tendances et observations personnelles</h2><div class="note">${groups.map(g=>{let r=g.rows.filter(x=>Number.isFinite(x.score)),n=Math.max(1,Math.ceil(r.length/4)),a=mean(r.slice(0,n).map(x=>x.score)),b=mean(r.slice(-n).map(x=>x.score));return `<p><b>${esc(g.label)} :</b> ${r.length} valeurs renseignées ; moyenne ${nfmt(mean(r.map(x=>x.score)))}/10. ${a===null||b===null?'Comparaison non disponible.':`Moyenne du premier quart ${nfmt(a)}/10, du dernier quart ${nfmt(b)}/10.`}</p>`}).join('')}<p>Les facteurs cités correspondent à des déclarations enregistrées ; leur influence réelle n’est pas déduite automatiquement.</p></div></section><div class="report-foot"><span>${esc(displayName)} · ${fr(first)} – ${fr(last)}</span><span>Page 1 / 6</span><span>Observations personnelles · Pas de diagnostic médical</span></div></article><article class="sheet second"><section class="section"><h2>1. Moyennes et tendances par groupe</h2><table><thead><tr><th>Groupe</th><th>Nb</th><th>Moyenne /10</th><th>Min.</th><th>Max.</th><th>Début → fin (premier/dernier quart)</th></tr></thead><tbody>${tableRows(groups)}</tbody></table></section><section class="section"><h2>2. Répartition des intensités</h2><p class="hint" style="margin:2px 0 6px">Axe vertical : nombre d’observations · Axe horizontal : intensité / qualité (0 à 10)</p><div class="histgrid">${groups.slice(0,4).map((g,i)=>hist(g.rows,g.label,colors[i])).join('')}</div></section><section class="section"><h2>1. Symptômes associés : fréquence observée</h2>${features.length?`<table><thead><tr><th>Symptôme / caractéristique</th><th>Mentions totales</th><th>${esc(periodLabel(thirdEarly))}</th><th>${esc(periodLabel(thirdLate))}</th><th>Évolution relative*</th></tr></thead><tbody>${symptomRows}</tbody></table><p class="hint">* Comparaison des proportions d’enregistrements mentionnant le symptôme, non de sa fréquence réelle par semaine. Les champs non renseignés ne sont pas interprétés comme une absence.</p>`:'<p>Aucun symptôme associé exploitable dans les champs disponibles.</p>'}</section><div class="report-foot"><span>${esc(displayName)} · ${fr(first)} – ${fr(last)}</span><span>Page 2 / 6</span><span>Observations personnelles · Pas de diagnostic médical</span></div></article><article class="sheet second"><section class="section"><h2>2. Intensités moyennes : comparaison des périodes</h2><table><thead><tr><th>Groupe</th><th>${esc(periodLabel(quarterEarly))}</th><th>${esc(periodLabel(quarterLate))}</th><th>Écart</th></tr></thead><tbody>${groups.map(g=>{let r=g.rows.filter(x=>Number.isFinite(x.score)),n=Math.max(1,Math.ceil(r.length/4)),a=mean(r.slice(0,n).map(x=>x.score)),b=mean(r.slice(-n).map(x=>x.score));return `<tr><td>${esc(g.label)}</td><td>${nfmt(a)}/10</td><td>${nfmt(b)}/10</td><td>${a===null||b===null?'—':(b-a>=0?'+':'')+nfmt(b-a)}</td></tr>`}).join('')}</tbody></table></section><section class="section"><h2>1. Facteurs mentionnés dans les observations</h2><div class="cols">${factor(aggr,'Facteurs aggravants')}${factor(relief,'Facteurs soulageants')}</div></section><div class="report-foot"><span>${esc(displayName)} · ${fr(first)} – ${fr(last)}</span><span>Page 3 / 6</span><span>Observations personnelles · Pas de diagnostic médical</span></div></article><article class="sheet second"><section class="section"><h2>2. Médicaments : effets ressentis après utilisation</h2>${treatmentTable(pain,'medications')}</section><section class="section"><h2>1. Interventions : effets ressentis après utilisation</h2>${treatmentTable(pain,'interventions')}</section><div class="report-foot"><span>${esc(displayName)} · ${fr(first)} – ${fr(last)}</span><span>Page 4 / 6</span><span>Observations personnelles · Pas de diagnostic médical</span></div></article><article class="sheet second"><section class="section"><h2>2. Moment — évolution dans la journée</h2>${momentTable(pain)}</section><section class="section"><h2>1. Environnement</h2>${environmentTable(pain)}</section><p class="hint" style="margin-top:18px">Les effets présentés correspondent exclusivement aux appréciations personnelles saisies après les utilisations. Ils ne démontrent ni efficacité médicale ni causalité. Les données anciennes sans appréciation restent « Non renseigné ».</p><div class="report-foot"><span>${esc(displayName)} · ${fr(first)} – ${fr(last)}</span><span>Page 5 / 6</span><span>Observations personnelles · Pas de diagnostic médical</span></div></article><article class="sheet second"><section class="section"><h2>Activités significatives et capacités</h2>${activityTable(daily)}</section><div class="report-foot"><span>${esc(displayName)} · ${fr(first)} – ${fr(last)}</span><span>Page 6 / 6</span><span>Observations personnelles · Pas de diagnostic médical</span></div></article><script>
function returnToApp(){
  // document.write() a remplacé la page : une navigation explicite est nécessaire.
  const target=new URL('./index.html',window.location.href);
  target.searchParams.set('retour','v0.2.35');
  window.location.replace(target.href);
}
function downloadReportHtml(){
  try {
    const clone=document.documentElement.cloneNode(true);
    const toolbar=clone.querySelector('.toolbar'); if(toolbar)toolbar.remove();
    const scripts=clone.querySelectorAll('script');scripts.forEach(el=>el.remove());
    const css=clone.querySelector('style');
    if(css)css.textContent+='\n@media screen{body{background:#fff}.sheet{box-shadow:none;margin:0 auto}}';
    const html='<!doctype html>\n'+clone.outerHTML;
    const blob=new Blob([html],{type:'text/html;charset=utf-8'});
    const a=document.createElement('a');const u=URL.createObjectURL(blob);
    a.href=u;a.download='Mon_Ressenti_rapport.html';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),60000);
  }catch(e){alert('Téléchargement impossible : '+e.message);}
}
</script></body></html>`;
// Trois éditions indépendantes à partir du même calcul local.
const doc=new DOMParser().parseFromString(reportHtml,'text/html');
const sheets=[...doc.querySelectorAll('article.sheet')];
const cover=sheets[0], details=sheets.slice(1);
const noteRows=sorted.filter(r=>typeof r.note==='string'&&r.note.trim()).reverse();
// v0.2.61 : constats reproductibles, illustrés par des enregistrements exacts.
// Aucune génération externe, aucune modification de données.
const exampleFor=(records, key, value)=>records.find(r=>field(r,key).includes(value));
const sourceExample=(r,key,value)=>{
 if(!r)return '<span class="hint">Aucun exemple disponible.</span>';
 const date=fr(day(r.when))+(String(r.when).length>10?' à '+esc(String(r.when).slice(11,16)):'');
 const raw=field(r,key).find(v=>v===value);
 const originalNote=typeof r.note==='string'&&r.note.trim()?`<div class="mr-analysis-quote">Remarque originale : « ${esc(r.note)} »</div>`:'';
 return `<div class="mr-analysis-example"><b>Exemple du ${date}${Number.isFinite(r.score)?' · '+r.score+'/10':''}</b> — ${esc(value)}${raw===undefined?'':' (champ enregistré)'}${originalNote}</div>`;
};
const analysisBlocks=[];
for(const [key,title,counts] of [
 ['features','Caractéristiques fréquemment consignées',features],
 ['aggravating','Facteurs aggravants déclarés',aggr],
 ['relieving','Facteurs soulageants déclarés',relief],
 ['symptoms','Autres symptômes associés',frequencies(pain,'symptoms')]
]){
 if(!counts.length)continue;
 const [name,count]=counts[0];
 const matching=pain.filter(r=>field(r,key).includes(name));
 const example=matching[0];
 analysisBlocks.push(`<div class="mr-analysis-item"><b>${esc(title)}</b><p>« ${esc(name)} » figure dans ${count} enregistrement(s) sur ${pain.length} ressentis consignés. Il s’agit de mentions, sans conclusion sur la cause ou la fréquence réelle.</p>${sourceExample(example,key,name)}</div>`);
}
if(daily.length){
 const valid=daily.filter(r=>Number.isFinite(r.score));
 if(valid.length){const example=valid[0];analysisBlocks.push(`<div class="mr-analysis-item"><b>Bilans quotidiens</b><p>${valid.length} bilan(s) avec une note ; moyenne ${nfmt(mean(valid.map(r=>r.score)))}/10. Cette note décrit les capacités déclarées, pas l’intensité de la douleur.</p><div class="mr-analysis-example"><b>Exemple du ${fr(day(example.when))} · ${example.score}/10</b>${example.note?.trim()?`<div class="mr-analysis-quote">Remarque originale : « ${esc(example.note)} »</div>`:''}</div></div>`)}
}
const analysisSection=doc.createElement('section');analysisSection.className='section mr-analysis';
analysisSection.innerHTML='<h2>Analyse descriptive détaillée — avec exemples réels</h2><p class="hint">Recalculée à chaque création du rapport, à partir des seuls enregistrements de la période. Les exemples reproduisent les valeurs et remarques saisies, sans embellissement, reformulation ni interprétation. Aucune causalité n’est établie.</p>'+(analysisBlocks.join('')||'<p>Données insuffisantes pour produire des constats illustrés.</p>');
// Insérer dans la partie détaillée, pas sur la page de garde.
if(details[0])details[0].insertBefore(analysisSection,details[0].querySelector('.report-foot'));
const analysisCss=doc.createElement('style');analysisCss.textContent=`.mr-analysis{font-size:10px}.mr-analysis-item{margin:7px 0;break-inside:avoid;page-break-inside:avoid}.mr-analysis-item p{margin:3px 0}.mr-analysis-example{background:#eef7f6;border-left:2px solid #17839a;padding:5px 7px;margin:3px 0;font-size:9px}.mr-analysis-quote{white-space:pre-wrap;overflow-wrap:anywhere;margin-top:3px}@media print{.mr-analysis{font-size:8px}.mr-analysis-item{margin:4px 0}.mr-analysis-example{font-size:8px;padding:3px 5px}}`;
doc.head.appendChild(analysisCss);

const factorContext=r=>[
  ['Aggravants',field(r,'aggravating')],['Soulageants',field(r,'relieving')],
  ['Inefficaces',field(r,'ineffective')]
].filter(([,v])=>v.length).map(([k,v])=>k+' : '+v.join(', ')).join(' · ');
const remarkHtml=r=>`<div class="mr-remark"><b>${esc(fr(day(r.when)))}${r.when.length>10?' · '+esc(r.when.slice(11,16)):''} · ${r.type==='daily'?'Bilan':'Ressenti'}${Number.isFinite(r.score)?' · '+r.score+'/10':''}</b><div class="mr-remark-context">${esc(factorContext(r)||'Facteurs non renseignés')}</div><div class="mr-remark-text">${esc(r.note)}</div></div>`;
const addRemarks=(sheet,items)=>{
  const section=doc.createElement('section');section.className='section mr-remarks';
  section.innerHTML='<h2>Remarques personnelles et contexte factoriel</h2><p class="hint">Textes originaux, sans reformulation ni interprétation. Contexte issu du même enregistrement.</p>'+items.map(remarkHtml).join('');
  sheet.insertBefore(section,sheet.querySelector('.report-foot'));
};
if(mode==='cover'){
  // Toutes les remarques sont ajoutées sans limitation. Le navigateur répartit
  // ensuite les blocs selon la place réellement disponible, avant impression.
  addRemarks(cover,noteRows);
  details.forEach(el=>el.remove());
}else if(mode==='detail'){
  cover.remove();
  const head=cover.querySelector('.report-head').cloneNode(true);
  details[0].insertBefore(head,details[0].firstChild);
}else{
  // La couverture du dossier complet reste volontairement limitée à une page.
  addRemarks(cover,noteRows.slice(0,1));
}
// Regrouper les petites sections du rapport, sans changer leurs contenus.
// Pages initiales : A (graphiques), B (facteurs), C (traitements),
// D (moment/environnement), E (activités). C suit B, E suit D.
const detailSheets=[...doc.querySelectorAll('article.sheet')].filter(el=>el!==cover);
if(detailSheets.length===5){
  for(const [target,source] of [[detailSheets[1],detailSheets[2]],[detailSheets[3],detailSheets[4]]]){
    const foot=target.querySelector('.report-foot');
    [...source.querySelectorAll(':scope > .section, :scope > .hint')].forEach(node=>target.insertBefore(node,foot));
    source.remove();
  }
}
const printed=[...doc.querySelectorAll('article.sheet')];
printed.forEach((sheet,i)=>{
 const foot=sheet.querySelector('.report-foot');
 if(foot){const spans=foot.querySelectorAll('span');if(spans[1])spans[1].textContent=`Page ${i+1} / ${printed.length}`;
 else foot.innerHTML=`<span>${esc(displayName)} · ${fr(first)} – ${fr(last)}</span><span>Page ${i+1} / ${printed.length}</span><span>Observations personnelles</span>`;}
});
const style=doc.querySelector('style');style.textContent+=`
/* v0.2.54 : densité des sections et remarques, sans changement d’impression */
@media print{.sheet.second .section{margin-top:12px}.sheet.second .section:first-child{margin-top:5px}.mr-remark-page .section{margin-top:6px}.mr-remark-page .mr-remarks{margin-top:5px}}

.mr-remarks{font-size:10px}.mr-remark{padding:5px 0;border-bottom:1px solid #dce8eb;break-inside:avoid}.mr-remark-context{font-size:9px;color:#52717b}.mr-remark-text{white-space:pre-wrap;overflow-wrap:anywhere}.mr-remark-page .mr-remarks{margin-top:10px}@media print{.mr-remarks{font-size:8px}.mr-remark{padding:3px 0}.mr-remark-context{font-size:7px}.mr-remark-text{font-size:8px}}
/* v0.2.54 : pied minimal, liste de remarques dense */
@media print{.report-foot{font-size:4.5px!important;line-height:1!important;padding-top:1px!important;bottom:1mm!important;border-top-width:.3px}.mr-remark-page .mr-remark{padding:2px 0}.mr-remark-page .mr-remarks{font-size:7px}.mr-remark-page .mr-remark-context{font-size:6.5px}.mr-remark-page .mr-remark-text{font-size:7px}.mr-remark-page .section{margin-top:3px!important}.mr-remark-page .hint{margin:2px 0 4px}}`;
style.textContent+=`/* v0.2.56 : remarques lisibles, une seule colonne */
.mr-remark-page .mr-remarks{column-count:1!important;line-height:1.3!important}
.mr-remark-page .mr-remark{break-inside:avoid;page-break-inside:avoid;padding:5px 0!important}
.mr-remark-page .mr-remark-context{font-size:9px!important}
.mr-remark-page .mr-remark-text{font-size:10px!important}
@media print{.mr-remarks{font-size:9px}.mr-remark-context{font-size:8px}.mr-remark-text{font-size:9px}}
`;
doc.body.setAttribute('data-mr-report-mode',mode);
const toolbar=doc.querySelector('.toolbar span');if(toolbar)toolbar.textContent='Rapport local · v0.2.61 · '+({cover:'Page de garde',detail:'Rapport',all:'Ensemble'}[mode]||'Ensemble');
return '<!doctype html>\n'+doc.documentElement.outerHTML;
}
window.MonRessentiReport={make};
})();
