"use strict";
/* Golden QA - Starkist Label Inspection (tablet-first PWA front-end) */

const YN = ["","Yes","No","N/A"];
/* option sets (QA spec) */
const PASS_FAIL = ["","Pass","Fail"];
const CORRECT = ["","Correct","Incorrect"];
const WITHIN_TOL = ["","Within tolerance","Fail"];
const PROCEED = ["","Proceed","Fail"];
const INK_SCUFF = ["","Pass - no ink transfer","<5% ink transfer",">5% ink transfer","Fail >10% ink transfer"];
const DISPOSITION = ["","Re-work","Dump"];
const HANDOVER = ["","Communicated","N/A"];
/* Stage-4 hourly QC check columns (label + dropdown options; no opts = free text) */
const HOURLY_COLS = [
  {k:"Barcode",opts:CORRECT},{k:"Product Code"},{k:"Label Width (mm)"},{k:"Label Height (mm)"},
  {k:"Print Quality",opts:PASS_FAIL},{k:"Cutting Quality",opts:PASS_FAIL},{k:"Physical Appearance",opts:["","Flat","Curl"]},
  {k:"Label Orientation in Bundle",opts:CORRECT},{k:"Bundle Quantity",opts:PASS_FAIL},{k:"Shrink Wrap Quality",opts:["","Tight","Loose"]},
  {k:"Outer Labels Verified",opts:CORRECT},{k:"Comments"}
];
/* Stage-1 job-running QC test columns */
const RUN_COLS = [
  {k:"text",label:"Text Verification",opts:PASS_FAIL},{k:"colour",label:"Colour vs Reference",opts:PASS_FAIL},
  {k:"registration",label:"Print Registration",opts:WITHIN_TOL},{k:"inkAdhesion",label:"Ink Adhesion (3M Tape)",opts:PASS_FAIL},
  {k:"gs1",label:"GS1 Barcode"},{k:"cofFilmMetal",label:"COF (Film-Metal)"},{k:"cofFilmFilm",label:"COF (Film-Film)"},
  {k:"inkScuffing",label:"Ink Scuffing @250",opts:INK_SCUFF},{k:"comments",label:"Comments"}
];
/* Stage-3 in-process check columns */
const PROC_COLS = [
  {k:"time",label:"Time Checked"},{k:"sheetSize",label:"Sheet Cutting Size L×W (mm)"},{k:"repeatVariation",label:"Repeat Variation from Eyemark"},
  {k:"printQuality",label:"Print Quality"},{k:"varnishPosition",label:"Varnish Position"},{k:"barcode",label:"Barcode Verification"},
  {k:"sheetAppearance",label:"Sheet Appearance"},{k:"sheetStackQuality",label:"Sheet Stack Quality"},{k:"comments",label:"Comments"}
];
const WASTE_COLS = [
  {k:"setup",label:"Set-up"},{k:"printDefects",label:"Print Defects"},{k:"coreWinding",label:"Core Winding"},
  {k:"webBreak",label:"Web Break"},{k:"jobChange",label:"Job-change"},{k:"mechanical",label:"Mechanical"}
];
const ROLES = ["QA Officer","Supervisor","Quality Manager","Administrator"];
const NAV = [
  { group:"Overview", items:[ {v:"dashboard",label:"Dashboard",icon:"dashboard"}, {v:"exec",label:"Executive",icon:"exec",mgr:true} ]},
  { group:"Inspection", items:[
    {v:"new",label:"New Job",icon:"plus"},
    {v:"entry",label:"Data Entry",icon:"edit"},
    {v:"lookup",label:"Job Lookup",icon:"search"}
  ]},
  { group:"Quality", items:[ {v:"capa",label:"CAPA",icon:"capa"}, {v:"ncr",label:"NCR",icon:"ncr"}, {v:"equip",label:"Equipment",icon:"equip"}, {v:"spc",label:"SPC",icon:"spc"} ]},
  { group:"Reports", items:[ {v:"reports",label:"Reports",icon:"chart"}, {v:"suppliers",label:"Suppliers",icon:"truck"} ]},
  { group:"Settings", items:[
    {v:"templates",label:"Templates",icon:"template",mgr:true},
    {v:"team",label:"Team & Access",icon:"users",mgr:true},
    {v:"audit",label:"Audit Trail",icon:"audit",mgr:true},
    {v:"integrations",label:"Integrations",icon:"plug",mgr:true},
    {v:"settings",label:"Settings",icon:"gear",mgr:true},
    {v:"account",label:"My Account",icon:"user"}
  ]}
];
const ICONS = {
  dashboard:"M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  plus:"M12 5v14M5 12h14",
  edit:"M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z",
  search:"M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.35-4.35",
  chart:"M4 20V10M10 20V4M16 20v-7M3 20h18",
  users:"M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  audit:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6",
  gear:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  user:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  capa:"M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-5 9 2 2 4-4",
  exec:"M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 12l3.5-2.2",
  equip:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  plug:"M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 3.9M15.4 6.6 8.6 10.5",
  spc:"M3 3v18h18M7 15l3-4 3 3 4-6",
  truck:"M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  ncr:"M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  template:"M8 3H5a2 2 0 0 0-2 2v3M3 16v3a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M7 8h10M7 12h10M7 16h6"
};
function ic(n){ return `<svg class="nav-ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[n]||''}"/></svg>`; }
const STAGES = [
  {key:"stage1",no:1,name:"Printing",form:"F-040-A / F-016-E / F-027-A"},
  {key:"stage2",no:2,name:"Reel Inspection",form:"F-021"},
  {key:"stage3",no:3,name:"Sheeting / Slitting",form:"PRD002"},
  {key:"stage4",no:4,name:"Finishing & Release",form:"F-038-A"}
];

let TOKEN = localStorage.getItem("gqa_token") || null;
let ME = null, MD = null;
let CUR = { view:"dashboard", jobNo:null, stage:"stage1" };
let CHARTS = {};

/* ---------- helpers ---------- */
const $ = (s,r=document)=>r.querySelector(s);
const app = ()=>$("#app");
function esc(v){ return v==null?"":String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
/* JS-string-safe + HTML-attribute-safe: for values placed inside '...' within a double-quoted onclick=""  */
function jsq(v){ return esc(String(v==null?"":v).replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/\r?\n/g,"\\n")); }
function toast(m){ const t=$("#toast"); t.textContent=m; t.classList.add("show"); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),2300); }
function statusPill(s){ const m={"New":"grey","In Progress":"amber","Released":"green","Hold":"red","Rejected":"red"}; return `<span class="pill ${m[s]||'grey'}">${esc(s)}</span>`; }
function mlabel(m){ return MD&&MD.machines&&MD.machines[m]?MD.machines[m].label:m; }
function isMgrRole(){ return !!ME && ["Supervisor","Quality Manager","Administrator"].includes(ME.role); }
function capaSevPill(s){ const m={Low:"grey",Medium:"blue",High:"amber",Critical:"red"}; return `<span class="pill ${m[s]||'grey'}">${esc(s)}</span>`; }
function capaStatusPill(s){ const m={Open:"amber","In Progress":"blue",Closed:"green"}; return `<span class="pill ${m[s]||'grey'}">${esc(s)}</span>`; }

/* ---------- offline-aware API ---------- */
function setNet(){ const d=$("#netdot"); if(!d)return; if(navigator.onLine){ d.classList.remove("off"); d.title="online"; } else { d.classList.add("off"); d.title="offline - changes queued"; } }
window.addEventListener("online", ()=>{ setNet(); flushQueue(); });
window.addEventListener("offline", setNet);
function queueGet(){ try{ return JSON.parse(localStorage.getItem("gqa_queue")||"[]"); }catch(e){ return []; } }
function queueSet(q){ localStorage.setItem("gqa_queue", JSON.stringify(q)); updateQueueBadge(); }
function updateQueueBadge(){ const b=$("#qbadge"); if(!b)return; const n=queueGet().length; if(n>0){ b.textContent="⤿ "+n+" to sync"; b.classList.remove("hidden"); } else { b.classList.add("hidden"); } }
async function flushQueue(){
  let q=queueGet(); if(!q.length) return; const keep=[]; let synced=0, rejected=0;
  for(const item of q){
    try{
      const r=await fetch(item.path,{method:item.method,headers:hdrs(),body:JSON.stringify(item.body)});
      if(r.ok){ synced++; }
      else if(r.status>=400 && r.status<500 && r.status!==401){ rejected++; const j=await r.json().catch(()=>({})); toast("A queued change was rejected: "+(j.error||("HTTP "+r.status))); } // client error won't succeed on retry — drop it
      else { keep.push(item); } // 401 / 5xx / network — keep and retry later
    }catch(e){ keep.push(item); }
  }
  queueSet(keep);
  if(synced && !rejected && !keep.length) toast("Offline changes synced.");
  else if(synced) toast(synced+" offline change(s) synced.");
  if((synced||rejected) && CUR.view) render();
}
function hdrs(){ return { "Content-Type":"application/json", "x-token":TOKEN||"" }; }
async function api(path, opts={}){
  const method=opts.method||"GET";
  try{
    const r=await fetch(path,{method,headers:hdrs(),body:opts.body?JSON.stringify(opts.body):undefined});
    if(r.status===401 && !path.startsWith("/api/login")){ logout(); throw new Error("Session expired"); }
    const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.error||("HTTP "+r.status));
    if(method==="GET" && path.startsWith("/api/jobs")) localStorage.setItem("gqa_cache_"+path, JSON.stringify(j));
    return j;
  }catch(e){
    if(method==="GET"){ const c=localStorage.getItem("gqa_cache_"+path); if(c){ toast("Offline - showing cached data"); return JSON.parse(c); } }
    if(method!=="GET" && opts.queueable){ const q=queueGet(); q.push({path,method,body:opts.body}); queueSet(q); toast("Offline - change queued for sync"); return opts.optimistic||{queued:true}; }
    throw e;
  }
}

/* ---------- auth ---------- */
async function boot(){
  setNet();
  if(TOKEN){ try{ const r=await api("/api/me"); ME=r.user; MD=await api("/api/masterdata"); showApp(); return; }catch(e){ TOKEN=null; } }
  showLogin();
}
async function showLogin(){
  $("#login").classList.remove("hidden"); $("#appwrap").classList.add("hidden");
  const u=$("#loginUser"), p=$("#loginPass");
  if(u) u.value=""; if(p) p.value="";
  $("#pwLogin").onclick=doLogin;
  $("#ssoLogin").onclick=doSso;
  if(u) u.onkeydown=(e)=>{ if(e.key==="Enter"){ e.preventDefault(); if(p) p.focus(); } };
  if(p) p.onkeydown=(e)=>{ if(e.key==="Enter"){ e.preventDefault(); doLogin(); } };
  if(u) u.focus();
}
async function doLogin(){
  const username=$("#loginUser").value.trim(), password=$("#loginPass").value;
  if(!username||!password){ toast("Enter your username and password"); return; }
  try{ const r=await api("/api/login",{method:"POST",body:{username,password}}); TOKEN=r.token; localStorage.setItem("gqa_token",TOKEN); ME=r.user; MD=await api("/api/masterdata"); showApp(); }
  catch(e){ toast(e.message||"Login failed"); }
}
async function doSso(){
  let cfg=null; try{ cfg=await (await fetch("/api/config")).json(); }catch(e){}
  const sso=(cfg&&cfg.sso)||{};
  if(sso.enabled && sso.clientId && sso.tenantId){ // real Microsoft Entra ID via MSAL.js
    try{
      await ensureMsal();
      const msalApp=new msal.PublicClientApplication({ auth:{ clientId:sso.clientId, authority:"https://login.microsoftonline.com/"+sso.tenantId, redirectUri:window.location.origin } });
      if(msalApp.initialize) await msalApp.initialize();
      const res=await msalApp.loginPopup({ scopes:["openid","profile","email"] });
      const r=await api("/api/login",{method:"POST",body:{mode:"sso",idToken:res.idToken}});
      TOKEN=r.token; localStorage.setItem("gqa_token",TOKEN); ME=r.user; MD=await api("/api/masterdata"); showApp();
    }catch(e){ toast(e.message||"Microsoft sign-in failed"); }
    return;
  }
  const email=prompt("Microsoft 365 sign-in (demo). Enter your golden.com.fj email:","sameer@golden.com.fj"); // demo fallback (Entra not configured)
  if(!email) return;
  try{ const r=await api("/api/login",{method:"POST",body:{mode:"sso",email}}); TOKEN=r.token; localStorage.setItem("gqa_token",TOKEN); ME=r.user; MD=await api("/api/masterdata"); showApp(); }
  catch(e){ toast(e.message||"SSO not recognised"); }
}
function ensureMsal(){ return new Promise((resolve,reject)=>{ if(window.msal)return resolve(); const s=document.createElement("script"); s.src="https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js"; s.onload=()=>resolve(); s.onerror=()=>reject(new Error("Could not load Microsoft sign-in (offline?)")); document.head.appendChild(s); }); }
function logout(){ TOKEN=null; localStorage.removeItem("gqa_token"); ME=null; showLogin(); }
function showApp(){
  $("#login").classList.add("hidden"); $("#appwrap").classList.remove("hidden");
  $("#whoName").textContent=ME.name; $("#whoRole").textContent=ME.role;
  buildSidebar();
  $("#logoutBtn").onclick=logout;
  $("#sidebar").onclick=(e)=>{ const b=e.target.closest("button[data-view]"); if(b) go(b.dataset.view); };
  $("#navToggle").onclick=()=>{ $("#sidebar").classList.toggle("open"); $("#scrim").classList.toggle("show"); };
  $("#scrim").onclick=closeNav;
  const qb=$("#qbadge"); if(qb) qb.onclick=()=>{ if(queueGet().length){ toast("Syncing queued changes…"); flushQueue(); } };
  updateQueueBadge();
  go("dashboard");
}
function buildSidebar(){
  const isMgr=["Supervisor","Quality Manager","Administrator"].includes(ME.role);
  $("#sidebar").innerHTML=NAV.map(g=>{
    const items=g.items.filter(it=>!it.mgr||isMgr).map(it=>`<button class="nav-item" data-view="${it.v}">${ic(it.icon)}<span>${esc(it.label)}</span></button>`).join("");
    return items ? (g.group?`<div class="nav-group-label">${esc(g.group)}</div>`:"")+items : "";
  }).join("");
}
function closeNav(){ const s=$("#sidebar"); if(s)s.classList.remove("open"); const c=$("#scrim"); if(c)c.classList.remove("show"); }
function go(view,opts={}){ CUR.view=view; if(opts.jobNo!==undefined)CUR.jobNo=opts.jobNo; if(opts.stage)CUR.stage=opts.stage;
  document.querySelectorAll('#sidebar button[data-view]').forEach(b=>b.classList.toggle("active",b.dataset.view===view)); closeNav(); render(); }
function render(){ const v=CUR.view;
  if(v==="dashboard")dashboard(); else if(v==="new")newJob(); else if(v==="entry")entry(); else if(v==="lookup")lookup();
  else if(v==="exec")execDashboard(); else if(v==="capa")capaPage(); else if(v==="ncr")ncrPage(); else if(v==="equip")equipmentPage(); else if(v==="spc")spcPage(); else if(v==="reports")reports(); else if(v==="suppliers")suppliersPage(); else if(v==="team")team(); else if(v==="audit")auditTrail(); else if(v==="integrations")integrationsPage(); else if(v==="templates")templatesPage(); else if(v==="settings")settings(); else if(v==="account")myAccount();
  else dashboard(); }

/* ---------- dashboard ---------- */
async function dashboard(){
  app().innerHTML=`<div class="empty">Loading…</div>`;
  let jobs; try{ jobs=await api("/api/jobs"); }catch(e){ app().innerHTML=`<div class="card"><div class="empty">Could not load jobs — ${esc(e.message)}</div></div>`; return; }
  window._dashJobs=jobs;
  const cnt=s=>jobs.filter(j=>j.status===s).length;
  const machineOpts=[...new Set(jobs.map(j=>j.machine))].map(m=>`<option value="${esc(m)}">${esc(mlabel(m))}</option>`).join("");
  app().innerHTML=`
    <div class="stats">
      <div class="stat"><div class="n">${jobs.length}</div><div class="l">Total Jobs</div></div>
      <div class="stat"><div class="n">${cnt('In Progress')}</div><div class="l">In Progress</div></div>
      <div class="stat"><div class="n">${cnt('Released')}</div><div class="l">Released</div></div>
      <div class="stat"><div class="n">${cnt('Hold')+cnt('Rejected')}</div><div class="l">Hold / Reject</div></div>
    </div>
    <div class="card"><h2>Active &amp; Recent Jobs</h2><p class="sub">Each Starkist job tracked through all four stages by one Job #.</p>
    <div class="grid g4 no-print" style="margin-bottom:14px">
      <div class="field"><label>Search</label><input id="dq" placeholder="Job #, product, customer" oninput="renderJobRows()"></div>
      <div class="field"><label>Status</label><select id="dstatus" onchange="renderJobRows()"><option value="">All statuses</option><option>New</option><option>In Progress</option><option>Released</option><option>Hold</option><option>Rejected</option></select></div>
      <div class="field"><label>Machine</label><select id="dmachine" onchange="renderJobRows()"><option value="">All machines</option>${machineOpts}</select></div>
      <div class="field"><label>Export</label><button class="btn ghost" onclick="exportCsv()">⤓ Export CSV</button></div>
    </div>
    ${jobs.length?`<div style="overflow-x:auto"><table><thead><tr><th>Job #</th><th>Product</th><th>Machine</th><th>Progress</th><th>Status</th><th></th></tr></thead><tbody id="jobtbody"></tbody></table></div><div class="empty hidden" id="jobempty" style="padding:18px">No jobs match the filter.</div>`:`<div class="empty">No jobs yet.</div>`}
    <div class="row-actions"><button class="btn gold" onclick="go('new')">+ New Job</button><button class="btn ghost" onclick="go('lookup')">Look up a Job #</button></div></div>`;
  if(jobs.length) renderJobRows();
}
function jobRow(j){
  const segs=[1,2,3,4].map((n,i)=>`<div class="seg ${j.completed>=n?'done':(i===j.completed?'cur':'')}"></div>`).join("");
  return `<tr><td><b>${esc(j.jobNo)}</b></td><td>${esc(j.product||"")}<div style="font-size:12px;color:var(--muted)">${esc(j.customer||"")}</div></td>
    <td><span class="tag-machine">${esc(mlabel(j.machine))}</span></td>
    <td style="min-width:150px"><div class="progress">${segs}</div><div style="font-size:12px;color:var(--muted)">${j.completed} of 4</div></td>
    <td>${statusPill(j.status)}</td><td><button class="btn ghost sm" onclick="go('entry',{jobNo:'${jsq(j.jobNo)}'})">Open</button></td></tr>`;
}
function renderJobRows(){
  const q=(val("dq")||"").toLowerCase().trim(), st=val("dstatus"), mc=val("dmachine");
  let list=(window._dashJobs||[]);
  if(q) list=list.filter(j=>((j.jobNo||"")+" "+(j.product||"")+" "+(j.customer||"")).toLowerCase().includes(q));
  if(st) list=list.filter(j=>j.status===st);
  if(mc) list=list.filter(j=>j.machine===mc);
  const tb=$("#jobtbody"); if(!tb)return; tb.innerHTML=list.map(jobRow).join("");
  const e=$("#jobempty"); if(e)e.classList.toggle("hidden",!!list.length);
}
async function exportCsv(){
  try{ const r=await fetch("/api/export/jobs.csv",{headers:hdrs()}); if(!r.ok) throw new Error("HTTP "+r.status);
    const blob=await r.blob(); const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="golden-qa-jobs.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); toast("CSV exported"); }
  catch(e){ toast("Export failed — are you online?"); }
}
async function exportXls(){
  try{ const r=await fetch("/api/export/workbook.xls",{headers:hdrs()}); if(!r.ok) throw new Error("HTTP "+r.status);
    const blob=await r.blob(); const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="golden-qa-report.xls"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); toast("Excel report exported"); }
  catch(e){ toast("Export failed — are you online?"); }
}

/* ---------- new job ---------- */
function newJob(){
  const ptOpts=(MD.productTypes||[]).map(p=>`<option>${esc(p)}</option>`).join("");
  const opts=Object.keys(MD.machines).map(m=>`<option value="${m}">${esc(MD.machines[m].label)} (${MD.machines[m].form})</option>`).join("");
  app().innerHTML=`<div class="card"><h2>Start a New Job</h2><p class="sub">Pick the Product Type and enter the Job #. Scan the barcode (📷) to capture it.</p>
    <div class="grid g2">
      <div class="field"><label>Product Type <span class="req">*</span></label><select id="f_productType"><option value="">— Select —</option>${ptOpts}</select></div>
      <div class="field"><label>Job # <span class="req">*</span></label>
        <div style="display:flex;gap:8px"><input id="f_jobNo" placeholder="e.g. SK-24821"><button class="btn ghost sm" onclick="scanBarcode('f_jobNo')" title="Scan">📷</button></div></div>
      <div class="field"><label>Printing Press <span class="req">*</span></label><select id="f_machine"><option value="">— Select —</option>${opts}</select></div>
      <div class="field"><label>Product / Item Code</label><input id="f_itemCode" placeholder="e.g. SK-142-WR"></div>
      <div class="field"><label>Customer</label><input id="f_customer" value="StarKist"></div>
      <div class="field"><label>Product / Item</label><input id="f_product" placeholder="Label description"></div>
    </div>
    <div class="field" style="margin-top:12px"><label>Product Description</label><textarea id="f_desc"></textarea></div>
    <div class="row-actions"><button class="btn gold" onclick="createJob()">Create Job &amp; Begin Stage 1</button><button class="btn ghost" onclick="go('dashboard')">Cancel</button></div></div>`;
}
async function createJob(){
  const productType=$("#f_productType").value, machine=$("#f_machine").value, jobNo=$("#f_jobNo").value.trim();
  if(!productType){toast("Select a product type");return;} if(!jobNo){toast("Enter a Job #");return;} if(!machine){toast("Select a printing press");return;}
  try{ const job=await api("/api/jobs",{method:"POST",body:{jobNo,machine,productType,itemCode:$("#f_itemCode").value.trim(),customer:$("#f_customer").value.trim(),product:$("#f_product").value.trim(),description:$("#f_desc").value.trim()}});
    toast("Job "+jobNo+" created"); go("entry",{jobNo,stage:"stage1"}); }
  catch(e){ toast(e.message); }
}

/* ---------- data entry ---------- */
let JOB=null;
async function entry(){
  if(!CUR.jobNo){ const jobs=await api("/api/jobs");
    app().innerHTML=`<div class="card"><h2>Data Entry</h2><p class="sub">Choose a job.</p>${jobs.length?`<div class="field" style="max-width:460px"><label>Select Job #</label><select onchange="if(this.value)go('entry',{jobNo:this.value})"><option value="">— Select —</option>${jobs.map(j=>`<option value="${esc(j.jobNo)}">${esc(j.jobNo)} — ${esc(j.product||'')}</option>`).join("")}</select></div>`:`<div class="empty">No jobs. <button class="btn gold" onclick="go('new')">+ New Job</button></div>`}</div>`; return; }
  JOB=await api("/api/jobs/"+encodeURIComponent(CUR.jobNo));
  const done=n=>JOB["stage"+n]&&JOB["stage"+n]._done; const c=[1,2,3,4].filter(done).length;
  const bar=STAGES.map(s=>`<button class="${CUR.stage===s.key?'active':''}" onclick="go('entry',{jobNo:'${jsq(JOB.jobNo)}',stage:'${s.key}'})"><div class="s-no">Stage ${s.no} · ${esc(s.form)}</div><div class="s-nm">${esc(s.name)}</div><div class="s-st">${done(s.no)?'<span class="pill green">Complete</span>':'<span class="pill grey">Pending</span>'}</div></button>`).join("");
  const canHold=["Supervisor","Quality Manager","Administrator"].includes(ME.role);
  const canDelete=["Quality Manager","Administrator"].includes(ME.role);
  app().innerHTML=`<div class="card">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div><h2 style="margin:0">Job ${esc(JOB.jobNo)} ${statusPill(JOB.statusOverride|| (c===0?'New':(c<4?'In Progress':'Released')))}</h2>
      <p class="sub" style="margin:4px 0 0">${esc(JOB.product||'—')} · <span class="tag-machine">${esc(mlabel(JOB.machine))}</span> · ${esc(JOB.customer||'')}${JOB.templateApplied?` · <span title="Stage 1 pre-filled from this template">Template: ${esc(JOB.templateApplied)}</span>`:''}</p></div>
      <div style="margin-left:auto" class="no-print"><button class="btn ghost sm" onclick="go('lookup',{jobNo:'${jsq(JOB.jobNo)}'})">Summary</button> ${canHold?`<button class="btn ghost sm" onclick="editJobModal()">Edit details</button>`:''} <button class="btn ghost sm" onclick="cloneJobModal()">Clone</button> ${canHold?`<button class="btn ghost sm" onclick="raiseCapaFor('${jsq(JOB.jobNo)}')">Raise CAPA</button>`:''} ${canHold&&JOB.statusOverride?`<button class="btn ghost sm" onclick="releaseJob('${jsq(JOB.jobNo)}')">Clear hold</button>`:''} ${canHold?`<button class="btn danger sm" onclick="holdJob('${jsq(JOB.jobNo)}')">Hold</button>`:''} ${canDelete?`<button class="btn danger sm" onclick="deleteJob('${jsq(JOB.jobNo)}')">Delete</button>`:''}</div>
    </div>
    <div class="banner">Progress: ${c} of 4 stages complete. Complete in sequence.</div>
    <div class="stagebar">${bar}</div><div id="stageform"></div></div>`;
  stageForm(CUR.stage);
}
async function holdJob(no){ const reason=prompt("Reason for placing on hold?"); if(reason===null)return; await api("/api/jobs/"+encodeURIComponent(no)+"/hold",{method:"POST",body:{reason}}); toast("Job on hold"); entry(); }
async function releaseJob(no){ if(!confirm("Clear the hold on "+no+"? It returns to its automatic status (Released once all 4 stages are complete).")) return; try{ await api("/api/jobs/"+encodeURIComponent(no)+"/release",{method:"POST",body:{}}); toast("Hold cleared"); entry(); }catch(e){ toast(e.message); } }
function editJobModal(){ const machines=MD.machines||{}; const canMachine=[1,2,3,4].every(n=>!(JOB["stage"+n]&&JOB["stage"+n]._done));
  $("#modalRoot").innerHTML=`<div class="modal-bg"><div class="modal"><h2>Edit ${esc(JOB.jobNo)}</h2>
    <div class="field"><label>Customer</label><input id="ej_customer" value="${esc(JOB.customer||'')}"></div>
    <div class="field"><label>Product / Item</label><input id="ej_product" value="${esc(JOB.product||'')}"></div>
    <div class="field"><label>Description</label><textarea id="ej_desc">${esc(JOB.description||'')}</textarea></div>
    ${canMachine?`<div class="field"><label>Machine</label><select id="ej_machine">${Object.keys(machines).map(m=>`<option value="${esc(m)}" ${m===JOB.machine?'selected':''}>${esc(machines[m].label)} (${esc(machines[m].form)})</option>`).join("")}</select></div>`:`<p class="sub">Machine can't be changed once a stage is recorded.</p>`}
    <div class="row-actions"><button class="btn gold" onclick="saveJobMeta()">Save</button><button class="btn ghost" onclick="closeModal()">Cancel</button></div></div></div>`;
}
async function saveJobMeta(){ const body={ customer:val("ej_customer"), product:val("ej_product"), description:val("ej_desc") }; const m=document.getElementById("ej_machine"); if(m)body.machine=m.value;
  try{ await api("/api/jobs/"+encodeURIComponent(JOB.jobNo),{method:"PUT",body}); closeModal(); toast("Job details updated"); entry(); }catch(e){ toast(e.message); }
}
function cloneJobModal(){ $("#modalRoot").innerHTML=`<div class="modal-bg"><div class="modal"><h2>Clone ${esc(JOB.jobNo)}</h2><p class="sub">Creates a new job with the same customer, product and machine, and empty stages.</p>
  <div class="field"><label>New Job # <span class="req">*</span></label><input id="cl_jobNo" placeholder="e.g. ${esc(JOB.jobNo)}-R2"></div>
  <div class="row-actions"><button class="btn gold" onclick="doCloneJob()">Create copy</button><button class="btn ghost" onclick="closeModal()">Cancel</button></div></div></div>`;
}
async function doCloneJob(){ const jobNo=val("cl_jobNo").trim(); if(!jobNo){ toast("Enter a new Job #"); return; }
  try{ const job=await api("/api/jobs/"+encodeURIComponent(JOB.jobNo)+"/clone",{method:"POST",body:{jobNo}}); closeModal(); toast("Cloned to "+job.jobNo); go("entry",{jobNo:job.jobNo,stage:"stage1"}); }catch(e){ toast(e.message); }
}
async function deleteJob(no){ if(!confirm("Delete job "+no+" and all its stage data? This cannot be undone.")) return;
  try{ await api("/api/jobs/"+encodeURIComponent(no),{method:"DELETE"}); toast("Job "+no+" deleted"); go("dashboard"); }catch(e){ toast(e.message); }
}

function fT(id,l,v,ph){ return `<div class="field"><label>${l}</label><input id="${id}" value="${esc(v)}" placeholder="${esc(ph||'')}"></div>`; }
function fA(id,l,v){ return `<div class="field"><label>${l}</label><textarea id="${id}">${esc(v)}</textarea></div>`; }
function fS(id,l,v,opts){ return `<div class="field"><label>${l}</label><select id="${id}">${opts.map(o=>`<option ${o===v?'selected':''}>${esc(o)}</option>`).join("")}</select></div>`; }
function val(id){ const e=document.getElementById(id); return e?e.value:""; }

function stageForm(key){ const d=JOB[key]||{}; const h=$("#stageform");
  if(key==="stage1")h.innerHTML=s1(d); if(key==="stage2")h.innerHTML=s2(d); if(key==="stage3")h.innerHTML=s3(d); if(key==="stage4")h.innerHTML=s4(d);
  if(key==="stage1")setTimeout(s1flags,0); if(key==="stage4")setTimeout(startHourly,0);
}
/* tolerance checks */
function tolFlag(field,v){ const t=MD.tolerances||{}; v=parseFloat(v);
  if(field==="cof"){ if(isNaN(v))return""; const ok=v>=t.cofMin&&v<=t.cofMax; return `<div class="flag ${ok?'ok':'bad'}">${ok?'✓ within '+t.cofMin+'–'+t.cofMax:'✗ out of range ('+t.cofMin+'–'+t.cofMax+')'}</div>`; }
  if(field==="reg"){ if(isNaN(v))return""; const ok=v<=t.registrationMaxMm; return `<div class="flag ${ok?'ok':'bad'}">${ok?'✓ ≤ '+t.registrationMaxMm+'mm':'✗ exceeds '+t.registrationMaxMm+'mm'}</div>`; }
  return "";
}
function s1flags(){ const e=document.getElementById("s1_setupCofFilmMetal"); if(e)e.oninput=()=>{ const f=document.getElementById("s1_setupCofFilmMetal_f"); if(f)f.innerHTML=tolFlag("cof",e.value); }; }

function s1(d){
  const mc=MD.machines[JOB.machine]||{label:JOB.machine,stationGroups:[]};
  const groups=(mc.stationGroups||[]).map(g=>({title:g.title||"Stations",stations:g.stations||[],cols:g.cols||[]}));
  let stations=(d.stations&&d.stations.length)?d.stations:[];
  if(!stations.length){ groups.forEach((g,gi)=>g.stations.forEach(n=>{ const o={group:gi,name:String(n)}; g.cols.forEach(c=>o[c.key]=""); stations.push(o); })); }
  window._st=stations;
  const stationTables=groups.map((g,gi)=>{
    const head=`<tr><th>Station</th>${g.cols.map(c=>`<th>${esc(c.label)}</th>`).join("")}</tr>`;
    const rows=stations.map((s,i)=>({s,i})).filter(x=>(x.s.group||0)===gi).map(({s,i})=>`<tr><td><b>${esc(s.name)}</b></td>${g.cols.map(c=>`<td><input data-st="${i}" data-f="${esc(c.key)}" value="${esc(s[c.key]||'')}"></td>`).join("")}</tr>`).join("");
    return `<h4 style="margin:14px 0 6px">${esc(g.title)}</h4><div style="overflow-x:auto"><table><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  }).join("")||`<p class="sub">No print stations defined for this press.</p>`;
  window._materials=(d.materials&&d.materials.length)?d.materials:[{}];
  window._runs=(d.runningTests&&d.runningTests.length)?d.runningTests:[{roll:"1"}];
  const MAT_COLS=[{k:"materialType",label:"Material Type"},{k:"gauge",label:"Gauge/Thickness (µ)"},{k:"grammage",label:"Grammage GSM"},{k:"dyne",label:"Dyne Level"},{k:"supplier",label:"Supplier"},{k:"batch",label:"Batch#"}];
  const runCols=[{k:"roll",label:"Roll#"}].concat(RUN_COLS);
  return `<h3>Stage 1 — Printing</h3><div class="grid g4">${fT("s1_pressLabel","Printing Press",mc.label||JOB.machine)}${fT("s1_operator","Operator",d.operator)}${fT("s1_qaOfficer","QA Officer",d.qaOfficer)}${fT("s1_supervisor","Production Supervisor",d.supervisor)}</div>
  <h3>Job Details</h3><div class="grid g4">${fT("s1_date","Date",d.date||JOB.created)}${fT("s1_jobNo","Job #",JOB.jobNo)}${fT("s1_productDescription","Product Description",d.productDescription||JOB.product)}${fS("s1_proceed","Proceed With Job",d.proceed||"",YN)}</div>
  <h3>Material</h3>${repTable("_materials",MAT_COLS,"+ Add raw material")}
  <h3>Print Stations (${esc(mc.label||JOB.machine)})</h3>${stationTables}
  <h3>Machine Settings</h3><div class="grid g4">${fT("s1_unwinderTension","Unwinder Tension (N)",d.unwinderTension)}${fT("s1_infeedTension","In-Feed Tension (N)",d.infeedTension)}${fT("s1_outfeedTension","Out-Feed Tension (N)",d.outfeedTension)}${fT("s1_rewindTension","Rewind Tension (N)",d.rewindTension)}${fT("s1_machineSpeed","Speed (mpm)",d.machineSpeed)}${fT("s1_corona1","Corona 1 (W·min/m²)",d.corona1)}${fT("s1_corona2","Corona 2 (W·min/m²)",d.corona2)}${fT("s1_corona3","Corona 3 (W·min/m²)",d.corona3)}${fT("s1_corona4","Corona 4 (W·min/m²)",d.corona4)}</div>
  <h3>QC — Job Set-Up Tests</h3><div class="grid g4">
    ${fS("s1_setupText","Text Verification",d.setupText||"",PASS_FAIL)}${fS("s1_setupColour","Colour vs Reference Standard",d.setupColour||"",PASS_FAIL)}${fS("s1_setupRegistration","Print Registration",d.setupRegistration||"",WITHIN_TOL)}${fS("s1_setupInkAdhesion","Ink Adhesion (3M Tape)",d.setupInkAdhesion||"",PASS_FAIL)}
    ${fT("s1_setupGs1","GS1 Barcode Verification",d.setupGs1)}
    <div class="field"><label>COF (Film to Metal)</label><input id="s1_setupCofFilmMetal" value="${esc(d.setupCofFilmMetal||'')}"><div id="s1_setupCofFilmMetal_f">${tolFlag("cof",d.setupCofFilmMetal)}</div></div>
    ${fT("s1_setupCofFilmFilm","COF (Film to Film)",d.setupCofFilmFilm)}${fT("s1_setupInkScuffing","Ink Scuffing @250 strokes/4lbs",d.setupInkScuffing)}</div>
  <h3>QC — Status of Approval</h3><div class="grid g3">${fS("s1_approvalQa","QA Officer",d.approvalQa||"",PROCEED)}${fS("s1_approvalOperator","Operator",d.approvalOperator||"",PROCEED)}${fS("s1_approvalSupervisor","Supervisor",d.approvalSupervisor||"",PROCEED)}</div>
  ${fA("s1_comments","Comments",d.comments)}
  <h3>QC — Job Running Quality Control Tests</h3>${repTable("_runs",runCols,"+ Add roll")}
  ${photoBlock(d)}${saveBar("stage1")}`;
}
function s2(d){ const rows=(d.rows&&d.rows.length)?d.rows:[{roll:"1",totalMeters:"",wasteIn:"",wasteOut:"",defect:"",weightKg:"",sign:""}]; window._rows=rows;
  const defOpts=(MD.defectTypes||[]).map(x=>`<option>${esc(x)}</option>`).join("");
  const body=rows.map((x,i)=>`<tr><td><input data-rw="${i}" data-f="roll" value="${esc(x.roll)}" style="width:54px"></td><td><input data-rw="${i}" data-f="totalMeters" value="${esc(x.totalMeters)}"></td><td><input data-rw="${i}" data-f="wasteIn" value="${esc(x.wasteIn)}"></td><td><input data-rw="${i}" data-f="wasteOut" value="${esc(x.wasteOut)}"></td><td><input list="defl" data-rw="${i}" data-f="defect" value="${esc(x.defect)}"></td><td><input data-rw="${i}" data-f="weightKg" value="${esc(x.weightKg)}"></td><td><input data-rw="${i}" data-f="sign" value="${esc(x.sign)}"></td><td><button class="btn danger sm" onclick="rwDel(${i})">×</button></td></tr>`).join("");
  return `<datalist id="defl">${defOpts}</datalist><h3>Reel Inspection Header (F-021)</h3><div class="grid g4">${fT("s2_date","Date",d.date||JOB.created)}${fT("s2_machineName","Machine Name",d.machineName)}${fT("s2_shift","Shift",d.shift)}${fT("s2_qaOfficer","QA Officer",d.qaOfficer)}${fT("s2_operator","Operator",d.operator)}${fT("s2_avtRef","AVT Report Ref",d.avtRef)}</div>
  <div class="row-actions"><button class="btn ghost sm" onclick="avtImportInline()">⤓ Import AVT report (CSV)</button></div>
  <h3>Defect &amp; Waste Log (per roll)</h3><div style="overflow-x:auto"><table><thead><tr><th>Roll</th><th>Total m</th><th>Waste In</th><th>Waste Out</th><th>Defect</th><th>Kg</th><th>Sign</th><th></th></tr></thead><tbody id="s2body">${body}</tbody></table></div>
  <div class="row-actions"><button class="btn ghost sm" onclick="rwAdd()">+ Add row</button></div>${fA("s2_remarks","Remarks",d.remarks)}${photoBlock(d)}${saveBar("stage2")}`;
}
function s3(d){
  window._proc=(d.inProcessChecks&&d.inProcessChecks.length)?d.inProcessChecks:[{}];
  window._prod=(d.productionSummary&&d.productionSummary.length)?d.productionSummary:[{roll:"1"}];
  window._waste=(d.wasteRows&&d.wasteRows.length)?d.wasteRows:[{}];
  const prodCols=[{k:"roll",label:"Roll #"},{k:"source",label:"Printing Source",opts:["","BOBST","NILPETER","FLEXO450"]},{k:"inputMeters",label:"Input Meters"},{k:"outputMeters",label:"Output Meters"},{k:"sheets",label:"# Sheets Produced"},{k:"pallet",label:"Pallet #"},{k:"comments",label:"Comments"}];
  const totMeters=window._prod.reduce((a,r)=>a+(parseFloat(r.outputMeters)||0),0);
  const totSheets=window._prod.reduce((a,r)=>a+(parseFloat(r.sheets)||0),0);
  const totSetup=window._waste.reduce((a,r)=>a+(parseFloat(r.setup)||0),0);
  const totRun=window._waste.reduce((a,r)=>a+["printDefects","coreWinding","webBreak","jobChange","mechanical"].reduce((x,k)=>x+(parseFloat(r[k])||0),0),0);
  return `<h3>Job Run</h3><div class="grid g4">${fT("s3_date","Date",d.date||JOB.created)}${fT("s3_customerItem","Customer / Item",d.customerItem||(JOB.customer+" / "+(JOB.product||"")))}${fT("s3_startTime","Start Time",d.startTime,"hh:mm")}${fT("s3_finishTime","Finish Time",d.finishTime,"hh:mm")}</div>
  <h3>Infeed Roll</h3><div class="grid g4">${fT("s3_infeedRoll","Roll #",d.infeedRoll)}${fT("s3_infeedMaterial","Material",d.infeedMaterial)}${fT("s3_infeedReelSize","Reel Size",d.infeedReelSize)}${fT("s3_infeedGrammage","Grammage",d.infeedGrammage)}${fT("s3_infeedCuttingRepeat","Cutting Repeat",d.infeedCuttingRepeat)}</div>
  <h3>Quality in Process Checks</h3>${repTable("_proc",PROC_COLS,"+ Add row")}
  <h3>Production Summary</h3>${repTable("_prod",prodCols,"+ Add row")}
  <div class="grid g2"><div class="field"><label>Total Meters Produced</label><input value="${esc(round2(totMeters))}" disabled></div><div class="field"><label>Total Sheets Produced</label><input value="${esc(totSheets)}" disabled></div></div>
  <h3>Production Waste Summary (kg)</h3>${repTable("_waste",WASTE_COLS,"+ Add row")}
  <div class="grid g2"><div class="field"><label>Total Setup Waste (kg)</label><input value="${esc(round2(totSetup))}" disabled></div><div class="field"><label>Total Running Waste (kg)</label><input value="${esc(round2(totRun))}" disabled></div></div>
  <h3>Downtime Analysis (min/hrs)</h3><div class="grid g4">${fT("s3_dtMaterial","Material",d.dtMaterial)}${fT("s3_dtWinding","Winding",d.dtWinding)}${fT("s3_dtReelDamage","Reel Damage",d.dtReelDamage)}${fT("s3_dtMechanical","Mechanical",d.dtMechanical)}${fT("s3_dtElectrical","Electrical",d.dtElectrical)}</div>
  <h3>Sign-off</h3><div class="grid g3">${fT("s3_operatorName","Operator",d.operatorName)}${fT("s3_qaOfficer","QA Officer",d.qaOfficer)}${fT("s3_supervisor","Production Supervisor",d.supervisor)}</div>
  ${fA("s3_comments","Comments",d.comments)}${photoBlock(d)}${saveBar("stage3")}`;
}
let hourlyTimer=null;
function s4(d){ const checks=(d.checks&&d.checks.length)?d.checks:[{time:"",vals:{}}]; window._checks=checks;
  const head=`<tr><th>Time</th>${HOURLY_COLS.map(c=>`<th>${esc(c.k)}</th>`).join("")}<th></th></tr>`;
  const body=checks.map((c,i)=>`<tr><td><input data-ck="${i}" data-time="1" value="${esc(c.time)}" placeholder="hh:mm" style="width:78px"></td>${HOURLY_COLS.map(col=>{ const v=(c.vals&&c.vals[col.k])||""; return col.opts?`<td><select data-ck="${i}" data-p="${esc(col.k)}">${col.opts.map(o=>`<option ${o===v?'selected':''}>${esc(o)}</option>`).join("")}</select></td>`:`<td><input data-ck="${i}" data-p="${esc(col.k)}" value="${esc(v)}" style="min-width:120px"></td>`; }).join("")}<td><button class="btn danger sm" onclick="ckDel(${i})">×</button></td></tr>`).join("");
  return `<div class="banner warn" id="hourlyBanner">Hourly checks are mandatory. <span id="hourlyMsg"></span></div>
  <h3>Inspection &amp; Packing Header</h3><div class="grid g4">${fT("s4_date","Date",d.date||JOB.created)}${fT("s4_productItem","Product / Item",d.productItem||JOB.product)}${fT("s4_shift","Shift",d.shift)}${fT("s4_shiftStartFinish","Shift Start & Finish",d.shiftStartFinish)}${fT("s4_labelWidth","Label Width (mm)",d.labelWidth)}${fT("s4_labelLength","Label Length (mm)",d.labelLength)}${fT("s4_labelThickness","Label Thickness",d.labelThickness)}</div>
  <h3>Hourly QC Checks</h3><div style="overflow-x:auto"><table><thead>${head}</thead><tbody id="s4body">${body}</tbody></table></div>
  <div class="row-actions"><button class="btn gold sm" onclick="ckAdd(true)">+ Add hourly check (now)</button></div>
  <h3>Line Clearance</h3><div class="grid g4">${fT("s4_quantityOnHold","Quantity On-Hold",d.quantityOnHold)}${fT("s4_reasonForRejection","Reason for Rejection",d.reasonForRejection)}${fS("s4_disposition","Disposition",d.disposition||"",DISPOSITION)}${fS("s4_unwantedMaterialsRemoved","Unwanted Materials Removed",d.unwantedMaterialsRemoved||"",YN)}</div>
  <div class="grid g2">${fS("s4_nextShiftQaHandover","Next Shift QA Handover",d.nextShiftQaHandover||"",HANDOVER)}</div>
  <h3>Signature</h3><div id="sigWrap"></div>${photoBlock(d)}${saveBar("stage4")}`;
}
function startHourly(){ renderSig(); if(hourlyTimer)clearInterval(hourlyTimer); const tick=()=>{ const cks=(window._checks||[]).filter(c=>c.time); const msg=$("#hourlyMsg"); const ban=$("#hourlyBanner"); if(!msg)return;
  if(!cks.length){ msg.textContent="No check recorded yet this shift."; return; }
  const last=cks.map(c=>c.time).sort().slice(-1)[0]; const now=new Date(); const [hh,mm]=last.split(":").map(Number); const lastD=new Date(now); lastD.setHours(hh,mm||0,0,0); let mins=Math.round((now-lastD)/60000); if(mins<0)mins+=1440;
  const left=60-mins; if(left<=0){ ban.classList.add("warn"); msg.innerHTML=`<b style="color:var(--red)">Overdue by ${Math.abs(left)} min — record an hourly check now.</b>`; } else { msg.innerHTML=`Last check ${esc(last)}. Next due in <span class="countdown">${left} min</span>.`; } };
  tick(); hourlyTimer=setInterval(tick,15000); }

/* repeating-row helpers */
function round2(n){ return Math.round((parseFloat(n)||0)*100)/100; }
function collectSt(){ document.querySelectorAll('#stageform input[data-st]').forEach(i=>{ const x=window._st[+i.dataset.st]; if(x)x[i.dataset.f]=i.value; }); }
function collectRw(){ document.querySelectorAll('#s2body input[data-rw]').forEach(i=>{ const x=window._rows[+i.dataset.rw]; if(x)x[i.dataset.f]=i.value; }); }
function rwAdd(){ syncStage("stage2"); window._rows.push({roll:String(window._rows.length+1),totalMeters:"",wasteIn:"",wasteOut:"",defect:"",weightKg:"",sign:""}); stageForm("stage2"); }
function rwDel(i){ syncStage("stage2"); window._rows.splice(i,1); if(!window._rows.length)window._rows.push({roll:"1"}); stageForm("stage2"); }
function collectCk(){ document.querySelectorAll('#s4body tr').forEach(tr=>{ const t=tr.querySelector('input[data-time]'); if(!t)return; const i=+t.dataset.ck; if(!window._checks[i])return; window._checks[i].time=t.value; window._checks[i].vals=window._checks[i].vals||{}; tr.querySelectorAll('[data-p]').forEach(s=>{ window._checks[i].vals[s.dataset.p]=s.value; }); }); }
function ckAdd(now){ syncStage("stage4"); const t=now?new Date().toTimeString().slice(0,5):""; window._checks.push({time:t,vals:{}}); stageForm("stage4"); }
function ckDel(i){ syncStage("stage4"); window._checks.splice(i,1); if(!window._checks.length)window._checks.push({time:"",vals:{}}); stageForm("stage4"); }

/* generic repeating table bound to a window array (e.g. _materials, _runs, _proc, _prod, _waste) */
const ARR_STAGE={ _materials:"stage1", _runs:"stage1", _proc:"stage3", _prod:"stage3", _waste:"stage3" };
function cellField(arrKey,i,c){ const r=window[arrKey][i]||{}; const v=r[c.k]||""; const a=`data-arr="${arrKey}" data-i="${i}" data-f="${esc(c.k)}"`;
  return c.opts?`<td><select ${a}>${c.opts.map(o=>`<option ${o===v?'selected':''}>${esc(o)}</option>`).join("")}</select></td>`:`<td><input ${a} value="${esc(v)}" style="min-width:110px"></td>`; }
function collectArr(arrKey){ document.querySelectorAll('[data-arr="'+arrKey+'"]').forEach(el=>{ const x=window[arrKey][+el.dataset.i]; if(x)x[el.dataset.f]=el.value; }); }
function rowAdd(arrKey){ const st=ARR_STAGE[arrKey]; syncStage(st); window[arrKey].push({}); stageForm(st); }
function rowDel(arrKey,i){ const st=ARR_STAGE[arrKey]; syncStage(st); window[arrKey].splice(i,1); if(!window[arrKey].length)window[arrKey].push({}); stageForm(st); }
function repTable(arrKey,cols,addLabel){
  const head=`<tr>${cols.map(c=>`<th>${esc(c.label||c.k)}</th>`).join("")}<th></th></tr>`;
  const body=window[arrKey].map((r,i)=>`<tr>${cols.map(c=>cellField(arrKey,i,c)).join("")}<td><button class="btn danger sm" onclick="rowDel('${arrKey}',${i})">×</button></td></tr>`).join("");
  return `<div style="overflow-x:auto"><table><thead>${head}</thead><tbody>${body}</tbody></table></div><div class="row-actions"><button class="btn ghost sm" onclick="rowAdd('${arrKey}')">${esc(addLabel||'+ Add row')}</button></div>`;
}

/* photos */
function photoBlock(d){ const photos=d.photos||[]; window._photos=photos.slice(); return `<h3>Photos</h3><div class="row-actions"><label class="btn ghost sm" style="cursor:pointer">📷 Add photo<input type="file" accept="image/*" capture="environment" style="display:none" onchange="addPhoto(event)"></label></div><div class="thumbs" id="thumbs">${photos.map(u=>`<img src="${esc(u)}">`).join("")}</div>`; }
async function addPhoto(ev){ const f=ev.target.files[0]; if(!f)return; const dataUrl=await new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(f); });
  try{ const res=await api("/api/upload",{method:"POST",body:{dataUrl,name:f.name}}); window._photos.push(res.url); $("#thumbs").innerHTML+=`<img src="${esc(res.url)}">`; toast("Photo added"); }catch(e){ toast("Upload failed (offline?)"); } }

/* signature pad */
function renderSig(){ const w=$("#sigWrap"); if(!w)return; w.innerHTML=`<canvas class="sig" id="sig"></canvas><div class="row-actions"><button class="btn ghost sm" onclick="sigClear()">Clear</button><button class="btn ghost sm" onclick="sigSave()">Save signature</button><span id="sigState" style="align-self:center;color:var(--muted);font-size:13px">${JOB.stage4&&JOB.stage4.signature?'✓ signature on file':''}</span></div>`;
  const c=$("#sig"); c.width=c.offsetWidth; c.height=170; const ctx=c.getContext("2d"); ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.strokeStyle="#0e2a47"; let drawing=false,last=null;
  const pos=e=>{ const r=c.getBoundingClientRect(); const t=e.touches?e.touches[0]:e; return {x:t.clientX-r.left,y:t.clientY-r.top}; };
  const start=e=>{ drawing=true; last=pos(e); e.preventDefault(); }; const move=e=>{ if(!drawing)return; const p=pos(e); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last=p; e.preventDefault(); }; const end=()=>drawing=false;
  c.onpointerdown=start; c.onpointermove=move; c.onpointerup=end; c.onpointerleave=end; window._sigCanvas=c; }
function sigClear(){ const c=window._sigCanvas; if(c)c.getContext("2d").clearRect(0,0,c.width,c.height); }
async function sigSave(){ const c=window._sigCanvas; if(!c)return; const dataUrl=c.toDataURL("image/png"); try{ const r=await api("/api/upload",{method:"POST",body:{dataUrl,name:"sig.png"}}); window._sig=r.url; $("#sigState").textContent="✓ signature captured"; toast("Signature saved"); }catch(e){ toast("Save failed"); } }

/* save */
function saveBar(stage){ return `<div class="row-actions no-print" style="margin-top:18px;border-top:1px solid var(--line);padding-top:16px"><button class="btn" onclick="saveStage('${stage}',false)">Save Draft</button><button class="btn gold" onclick="saveStage('${stage}',true)">Save &amp; Mark Complete</button><button class="btn ghost" onclick="go('entry',{jobNo:'${jsq(JOB.jobNo)}'})">Back</button></div>`; }
/* required-field check when marking a stage complete (mirrors server validateComplete) */
function validateStageData(stage,d){
  const reqs={
    stage1:[["date","Date"],["qaOfficer","QA Officer"],["proceed","Proceed With Job"]],
    stage2:[["date","Date"],["qaOfficer","QA Officer"]],
    stage3:[["date","Date"],["operatorName","Operator"],["startTime","Start Time"],["finishTime","Finish Time"]],
    stage4:[["date","Date"]]
  };
  const miss=[]; (reqs[stage]||[]).forEach(([k,l])=>{ if(!String(d[k]||"").trim()) miss.push(l); });
  if(stage==="stage1" && !((d.materials||[]).some(m=>String((m&&m.materialType)||"").trim()))) miss.push("Material Type");
  if(stage==="stage2" && !((d.rows||[]).some(r=>String(r.totalMeters||"").trim()||String(r.defect||"").trim()))) miss.push("At least one reel row");
  if(stage==="stage4"){ if(!((d.checks||[]).some(c=>String(c.time||"").trim()))) miss.push("At least one hourly check"); if(!d.signature) miss.push("Signature"); }
  return miss;
}
/* Collect the live form state for a stage from the DOM + window arrays (no _done flag). */
function collectStageData(stage){ let data={};
  if(stage==="stage1"){ collectSt(); collectArr("_materials"); collectArr("_runs"); data.stations=window._st; data.materials=window._materials; data.runningTests=window._runs; ["date","productDescription","proceed","operator","qaOfficer","supervisor","unwinderTension","infeedTension","outfeedTension","rewindTension","machineSpeed","corona1","corona2","corona3","corona4","setupText","setupColour","setupRegistration","setupInkAdhesion","setupGs1","setupCofFilmMetal","setupCofFilmFilm","setupInkScuffing","approvalQa","approvalOperator","approvalSupervisor","comments"].forEach(k=>data[k]=val("s1_"+k)); }
  else if(stage==="stage2"){ collectRw(); data.rows=window._rows; ["date","machineName","shift","qaOfficer","operator","avtRef","remarks"].forEach(k=>data[k]=val("s2_"+k)); }
  else if(stage==="stage3"){ collectArr("_proc"); collectArr("_prod"); collectArr("_waste"); data.inProcessChecks=window._proc; data.productionSummary=window._prod; data.wasteRows=window._waste; ["date","customerItem","startTime","finishTime","infeedRoll","infeedMaterial","infeedReelSize","infeedGrammage","infeedCuttingRepeat","dtMaterial","dtWinding","dtReelDamage","dtMechanical","dtElectrical","operatorName","qaOfficer","supervisor","comments"].forEach(k=>data[k]=val("s3_"+k)); }
  else if(stage==="stage4"){ collectCk(); data.checks=window._checks; ["date","productItem","shift","shiftStartFinish","labelWidth","labelLength","labelThickness","quantityOnHold","reasonForRejection","disposition","unwantedMaterialsRemoved","nextShiftQaHandover"].forEach(k=>data[k]=val("s4_"+k)); data.signature=window._sig||(JOB.stage4&&JOB.stage4.signature)||""; }
  data.photos=window._photos||[];
  return data;
}
/* Persist live form state into JOB[stage] so a repeating-table re-render keeps sibling fields. */
function syncStage(stage){ if(!JOB||!stage)return; JOB[stage]=Object.assign(JOB[stage]||{}, collectStageData(stage)); }
async function saveStage(stage,done){ let data=collectStageData(stage); data._done=done;
  if(done){
    const n=Number(stage.slice(-1));
    for(let k=1;k<n;k++){ if(!(JOB["stage"+k]&&JOB["stage"+k]._done)){ toast("Complete Stage "+k+" before marking Stage "+n+" complete"); return; } }
    const miss=validateStageData(stage,data);
    if(miss.length){ toast("Can't complete — missing: "+miss.join(", ")); return; }
  }
  try{ await api("/api/jobs/"+encodeURIComponent(JOB.jobNo)+"/stage/"+stage.slice(-1),{method:"PUT",body:{data},queueable:true,optimistic:{}}); toast(done?"Stage complete":"Draft saved"); go("entry",{jobNo:JOB.jobNo,stage}); }
  catch(e){ toast(e.message); }
}

/* barcode scan */
async function scanBarcode(targetId){
  const root=$("#modalRoot"); root.innerHTML=`<div class="modal-bg"><div class="modal"><h2>Scan Job # Barcode</h2><div class="scanbox"><video id="scanvid" playsinline></video></div><p class="sub" id="scanmsg">Point the camera at the barcode…</p><div class="row-actions"><button class="btn ghost" onclick="closeModal()">Cancel</button></div></div></div>`;
  if(!('BarcodeDetector' in window)){ $("#scanmsg").innerHTML="Barcode scanning isn't supported on this device/browser. Please type the Job # manually."; return; }
  try{ const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}); const v=$("#scanvid"); v.srcObject=stream; await v.play(); const det=new window.BarcodeDetector();
    window._scanInt=setInterval(async()=>{ try{ const codes=await det.detect(v); if(codes&&codes.length){ const code=codes[0].rawValue; document.getElementById(targetId).value=code; stream.getTracks().forEach(t=>t.stop()); closeModal(); toast("Scanned: "+code); } }catch(e){} },400); window._scanStream=stream; }
  catch(e){ $("#scanmsg").innerHTML="Camera not available. Enter the Job # manually."; }
}
function closeModal(){ if(window._scanInt)clearInterval(window._scanInt); if(window._scanStream)window._scanStream.getTracks().forEach(t=>t.stop()); $("#modalRoot").innerHTML=""; }

/* AVT inline import into stage 2 */
function avtImportInline(){ const root=$("#modalRoot"); root.innerHTML=`<div class="modal-bg"><div class="modal"><h2>Import AVT Report (CSV)</h2><p class="sub">Headers: Roll, TotalMeters, WasteIn, WasteOut, Defect, WeightKg</p><textarea id="avtcsv" style="min-height:150px" placeholder="Roll,TotalMeters,WasteIn,WasteOut,Defect,WeightKg&#10;1,5000,40,35,Hickey,1.1"></textarea><div class="row-actions"><button class="btn gold" onclick="avtDo()">Import rows</button><button class="btn ghost" onclick="closeModal()">Cancel</button></div></div></div>`; }
async function avtDo(){ const csv=$("#avtcsv").value; try{ const r=await api("/api/avt-import",{method:"POST",body:{csv}}); if(r.error){toast(r.error);return;} collectRw(); window._rows=(window._rows||[]).filter(x=>x.totalMeters||x.defect).concat(r.rows); if(!window._rows.length)window._rows=r.rows; closeModal(); stageForm("stage2"); toast("Imported "+r.count+" rows"); }catch(e){ toast(e.message); } }

/* lookup */
async function lookup(){
  const pre=CUR.jobNo||"";
  app().innerHTML=`<div class="card no-print"><h2>Job # Lookup</h2><p class="sub">Type or scan a Job # for the full cross-stage record.</p><div style="display:flex;gap:10px;max-width:560px"><input id="lk" placeholder="Job #" value="${esc(pre)}" style="font-size:19px"><button class="btn ghost" onclick="scanBarcode('lk')">📷</button><button class="btn gold" onclick="doLook()">Search</button></div></div><div id="lkr"></div>`;
  const lk=$("#lk"); if(lk){ lk.onkeydown=(e)=>{ if(e.key==="Enter"){ e.preventDefault(); doLook(); } }; if(!pre) lk.focus(); }
  if(pre)doLook();
}
async function doLook(){ const no=$("#lk").value.trim(); const host=$("#lkr"); if(!no){host.innerHTML="";return;}
  let j; try{ j=await api("/api/jobs/"+encodeURIComponent(no)); }catch(e){ host.innerHTML=`<div class="card"><div class="empty">No job found for <b>${esc(no)}</b>.</div></div>`; return; }
  const done=n=>j["stage"+n]&&j["stage"+n]._done; const c=[1,2,3,4].filter(done).length;
  const kv=(l,v)=>`<div><span>${l}</span><b>${esc(v||"—")}</b></div>`;
  const kvb=ps=>`<div class="kv">${ps.map(p=>kv(p[0],p[1])).join("")}</div>`;
  const sBox=(n,nm,dn,inner)=>`<div class="summary-stage"><div class="head">Stage ${n} · ${esc(nm)} ${dn?'<span class="pill green">Complete</span>':'<span class="pill grey">Pending</span>'}</div><div class="body">${dn?inner:'<div class="empty" style="padding:16px">Not yet recorded.</div>'}</div></div>`;
  const matOf=s1=>((s1.materials&&s1.materials.length)?(s1.materials[0]||{}).materialType:s1.materialType)||"";
  const a=j.stage1||{}; let s1h=""; if(a._done){ s1h=kvb([["Date",a.date],["QA Officer",a.qaOfficer],["Operator",a.operator],["Proceed",a.proceed],["Material",matOf(a)],["Speed",a.machineSpeed],["Setup GS1",a.setupGs1],["COF f-m",a.setupCofFilmMetal]])+((a.materials&&a.materials.length)?`<h4>Materials</h4><div style="overflow-x:auto"><table><thead><tr><th>Material</th><th>Gauge</th><th>GSM</th><th>Dyne</th><th>Supplier</th><th>Batch#</th></tr></thead><tbody>${a.materials.map(m=>`<tr><td>${esc(m.materialType)}</td><td>${esc(m.gauge)}</td><td>${esc(m.grammage)}</td><td>${esc(m.dyne)}</td><td>${esc(m.supplier)}</td><td>${esc(m.batch)}</td></tr>`).join("")}</tbody></table></div>`:"")+((a.stations&&a.stations.length)?`<h4>Print Stations</h4><div style="overflow-x:auto"><table><thead><tr><th>Station</th><th>Ink Type</th><th>Ink Batch#</th></tr></thead><tbody>${a.stations.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.inkType||s.ink||"")}</td><td>${esc(s.inkBatch||s.batch||"")}</td></tr>`).join("")}</tbody></table></div>`:"")+photosView(a); }
  const b=j.stage2||{}; let s2h=""; if(b._done){ s2h=kvb([["Date",b.date],["Machine",b.machineName],["Shift",b.shift],["QAO",b.qaOfficer],["AVT Ref",b.avtRef]])+`<h4>Defect & Waste Log</h4><div style="overflow-x:auto"><table><thead><tr><th>Roll</th><th>Total m</th><th>Waste In</th><th>Waste Out</th><th>Defect</th><th>Kg</th></tr></thead><tbody>${(b.rows||[]).filter(x=>x.roll||x.defect).map(x=>`<tr><td>${esc(x.roll)}</td><td>${esc(x.totalMeters)}</td><td>${esc(x.wasteIn)}</td><td>${esc(x.wasteOut)}</td><td>${esc(x.defect)}</td><td>${esc(x.weightKg)}</td></tr>`).join("")||'<tr><td colspan=6>—</td></tr>'}</tbody></table></div>`+photosView(b); }
  const e=j.stage3||{}; let s3h=""; if(e._done){ const ps=e.productionSummary||e.rolls||[]; s3h=kvb([["Date",e.date],["Operator",e.operatorName],["QA Officer",e.qaOfficer],["Start",e.startTime],["Finish",e.finishTime],["Infeed Material",e.infeedMaterial]])+`<h4>Production Summary</h4><div style="overflow-x:auto"><table><thead><tr><th>Roll</th><th>Source</th><th>Input m</th><th>Output m</th><th># Sheets</th><th>Pallet</th></tr></thead><tbody>${ps.map(r=>`<tr><td>${esc(r.roll||r.no||"")}</td><td>${esc(r.source||"")}</td><td>${esc(r.inputMeters||"")}</td><td>${esc(r.outputMeters||r.totalSheets||"")}</td><td>${esc(r.sheets||"")}</td><td>${esc(r.pallet||"")}</td></tr>`).join("")||'<tr><td colspan=6>—</td></tr>'}</tbody></table></div>`+photosView(e); }
  const f=j.stage4||{}; let s4h=""; if(f._done){ const pillVal=v=>(v==="Pass"||v==="Correct"||v==="Tight"||v==="Flat")?'<span class="pill green">'+esc(v)+'</span>':(v==="Fail"||v==="Incorrect"||v==="Loose"||v==="Curl")?'<span class="pill red">'+esc(v)+'</span>':esc(v||"—"); const hdr=`<tr><th>Time</th>${HOURLY_COLS.map(col=>`<th title="${esc(col.k)}">${esc(col.k.split(" ")[0])}</th>`).join("")}</tr>`; const cr=(f.checks||[]).filter(c=>c.time).map(c=>`<tr><td><b>${esc(c.time)}</b></td>${HOURLY_COLS.map(col=>`<td>${pillVal(c.vals&&c.vals[col.k])}</td>`).join("")}</tr>`).join("")||`<tr><td colspan=${HOURLY_COLS.length+1}>No checks</td></tr>`; s4h=kvb([["Date",f.date],["Shift",f.shift],["Label W×L",(f.labelWidth||"?")+" × "+(f.labelLength||"?")],["Qty On-Hold",f.quantityOnHold],["Disposition",f.disposition],["Handover",f.nextShiftQaHandover]])+`<h4>Hourly Checks</h4><div style="overflow-x:auto"><table><thead>${hdr}</thead><tbody>${cr}</tbody></table></div>`+(f.signature?`<h4>Signature</h4><img src="${esc(f.signature)}" style="max-height:90px;border:1px solid var(--line);border-radius:8px">`:"")+photosView(f); }
  host.innerHTML=`<div class="card"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><h2 style="margin:0">${esc(j.jobNo)} ${statusPill(j.statusOverride||(c===0?'New':(c<4?'In Progress':'Released')))}</h2><span class="tag-machine">${esc(mlabel(j.machine))}</span><div style="margin-left:auto" class="no-print"><button class="btn ghost sm" onclick="go('entry',{jobNo:'${jsq(j.jobNo)}'})">Edit</button> <button class="btn gold sm" onclick="window.print()">📄 SQF PDF</button></div></div><p class="sub">${esc(j.product||'—')} · ${esc(j.customer||'')} · Created ${esc(j.created)} · ${c} of 4 complete</p>${sBox(1,"Printing",a._done,s1h)}${sBox(2,"Reel Inspection",b._done,s2h)}${sBox(3,"Sheeting / Slitting",e._done,s3h)}${sBox(4,"Finishing & Release",f._done,s4h)}<p class="sub" style="margin-top:10px">Golden Manufacturers Pte Ltd · QA in-process record · printed ${new Date().toLocaleString()}</p></div>`;
}
function photosView(s){ return (s.photos&&s.photos.length)?`<h4>Photos</h4><div class="thumbs">${s.photos.map(u=>`<img src="${esc(u)}">`).join("")}</div>`:""; }

/* reports */
async function reports(){
  const isMgr=isMgrRole();
  app().innerHTML=`<div class="card"><h2>Reports</h2><p class="sub">Live quality analytics from recorded inspection data.</p>
    <div class="grid g4 no-print" style="margin-bottom:6px">
      <div class="field"><label>From</label><input id="rp_from" type="date" onchange="loadAnalytics()"></div>
      <div class="field"><label>To</label><input id="rp_to" type="date" onchange="loadAnalytics()"></div>
      <div class="field"><label>Shift</label><select id="rp_shift" onchange="loadAnalytics()"><option value="">All shifts</option><option>Day</option><option>Night</option></select></div>
      <div class="field"><label>&nbsp;</label><button class="btn ghost" onclick="rpClear()">Clear filters</button></div>
    </div>
    <div class="row-actions no-print"><button class="btn ghost" onclick="exportCsv()">⤓ Export CSV</button><button class="btn ghost" onclick="exportXls()">⤓ Export Excel</button>${isMgr?`<button class="btn ghost" onclick="sendDigest()">✉ Email digest to managers</button>`:''}</div>
    <div class="stats" id="kpis"></div>
    <h3>Quality trend (by job date)</h3><canvas id="cTrend" height="200"></canvas>
    <div class="grid g2"><div><h3>Defects by type (Kg)</h3><canvas id="cDef" height="220"></canvas></div><div><h3>Waste by machine (Kg)</h3><canvas id="cWaste" height="220"></canvas></div></div>
    <div class="grid g2"><div><h3>Down-time analysis (hrs)</h3><canvas id="cDt" height="220"></canvas></div><div><h3>First-pass yield</h3><canvas id="cFpy" height="220"></canvas></div></div></div>`;
  loadAnalytics();
}
function rpClear(){ ["rp_from","rp_to"].forEach(id=>{ const e=document.getElementById(id); if(e)e.value=""; }); const s=document.getElementById("rp_shift"); if(s)s.value=""; loadAnalytics(); }
async function loadAnalytics(){
  const qs=new URLSearchParams(); const f=val("rp_from"), t=val("rp_to"), sh=val("rp_shift");
  if(f)qs.set("from",f); if(t)qs.set("to",t); if(sh)qs.set("shift",sh);
  let a; try{ a=await api("/api/analytics"+(qs.toString()?("?"+qs.toString()):"")); }catch(e){ toast(e.message); return; }
  const k=$("#kpis"); if(k) k.innerHTML=`<div class="stat"><div class="n">${a.kpis.total}</div><div class="l">Jobs</div></div><div class="stat"><div class="n">${a.kpis.released}</div><div class="l">Released</div></div><div class="stat"><div class="n">${a.kpis.rejectedJobs}</div><div class="l">Hold / Reject</div></div><div class="stat"><div class="n">${a.kpis.firstPassYield}%</div><div class="l">First-Pass Yield</div></div><div class="stat" style="cursor:pointer" onclick="go('capa')" title="View CAPAs"><div class="n">${a.kpis.openCapas||0}</div><div class="l">Open CAPAs</div></div>`;
  if(!window.Chart){ toast("Charts need internet (Chart.js) the first time"); return; }
  Object.values(CHARTS).forEach(c=>{try{c.destroy()}catch(e){}}); CHARTS={};
  const tr=a.trend||[];
  CHARTS.trend=new Chart($("#cTrend"),{type:"line",data:{labels:tr.map(d=>d.date),datasets:[{label:"Jobs",data:tr.map(d=>d.jobs),borderColor:"#0e2a47",backgroundColor:"rgba(14,42,71,.08)",tension:.3,fill:true},{label:"Released",data:tr.map(d=>d.released),borderColor:"#15803d",tension:.3},{label:"Hold/Reject",data:tr.map(d=>d.held),borderColor:"#b91c1c",tension:.3}]},options:{plugins:{legend:{position:"bottom"}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});
  const defE=Object.entries(a.defects).sort((x,y)=>y[1]-x[1]);
  CHARTS.def=new Chart($("#cDef"),{type:"bar",data:{labels:defE.map(d=>d[0]),datasets:[{label:"Kg",data:defE.map(d=>d[1]),backgroundColor:"#d4a017"}]},options:{plugins:{legend:{display:false}}}});
  const wE=Object.entries(a.wasteByMachine);
  CHARTS.waste=new Chart($("#cWaste"),{type:"bar",data:{labels:wE.map(d=>mlabel(d[0])),datasets:[{label:"Kg",data:wE.map(d=>d[1]),backgroundColor:"#0e2a47"}]},options:{plugins:{legend:{display:false}}}});
  const dtE=Object.entries(a.downtime).filter(d=>d[1]>0);
  CHARTS.dt=new Chart($("#cDt"),{type:"doughnut",data:{labels:dtE.map(d=>d[0]),datasets:[{data:dtE.map(d=>d[1]),backgroundColor:["#0e2a47","#16395f","#d4a017","#b45309","#15803d","#1d4ed8","#b91c1c"]}]}});
  CHARTS.fpy=new Chart($("#cFpy"),{type:"doughnut",data:{labels:["Released","Other"],datasets:[{data:[a.kpis.firstPassYield,100-a.kpis.firstPassYield],backgroundColor:["#15803d","#e8edf3"]}]},options:{circumference:180,rotation:270}});
}

async function sendDigest(){ try{ const r=await api("/api/digest/send",{method:"POST"}); if(r.ok) toast("Digest emailed to managers"); else toast("Digest "+(r.teams?"sent to Teams":"not sent")+(r.error&&r.error!=="email disabled"?" — "+r.error:" (configure SMTP/Teams in Admin)")); }catch(e){ toast(e.message); } }

/* CAPA — corrective & preventive actions */
async function capaPage(){
  const canManage=isMgrRole();
  app().innerHTML=`<div class="empty">Loading…</div>`;
  let capas=[]; try{ capas=await api("/api/capas"); }catch(e){ app().innerHTML=`<div class="card"><div class="empty">Could not load CAPAs — ${esc(e.message)}</div></div>`; return; }
  window._capas=capas;
  const open=capas.filter(c=>c.status!=='Closed').length;
  app().innerHTML=`<div class="card"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div><h2 style="margin:0">CAPA — Corrective &amp; Preventive Actions</h2><p class="sub" style="margin:4px 0 0">Track and close quality events. ${open} open of ${capas.length}.</p></div>
      <div style="margin-left:auto" class="no-print">${canManage?`<button class="btn gold" onclick="capaModal()">+ Raise CAPA</button>`:''}</div></div>
    <div class="grid g3 no-print" style="margin:4px 0 14px">
      <div class="field"><label>Status</label><select id="cq_status" onchange="renderCapaRows()"><option value="">All</option><option>Open</option><option>In Progress</option><option>Closed</option></select></div>
      <div class="field"><label>Search</label><input id="cq_q" placeholder="Job #, title, owner" oninput="renderCapaRows()"></div>
    </div>
    ${capas.length?`<div style="overflow-x:auto"><table><thead><tr><th>CAPA</th><th>Job</th><th>Title</th><th>Severity</th><th>Owner</th><th>Due</th><th>Status</th>${canManage?'<th class="no-print"></th>':''}</tr></thead><tbody id="capabody"></tbody></table></div><div class="empty hidden" id="capaempty" style="padding:18px">No CAPAs match the filter.</div>`:`<div class="empty">No CAPAs yet.${canManage?' Raise one when a job is held or a defect recurs.':''}</div>`}</div>`;
  if(capas.length) renderCapaRows();
}
function renderCapaRows(){
  const canManage=isMgrRole(); const today=new Date().toISOString().slice(0,10);
  const st=val("cq_status"), q=(val("cq_q")||"").toLowerCase().trim();
  let list=(window._capas||[]);
  if(st) list=list.filter(c=>c.status===st);
  if(q) list=list.filter(c=>((c.jobNo||"")+" "+(c.title||"")+" "+(c.owner||"")).toLowerCase().includes(q));
  const tb=$("#capabody"); if(!tb)return;
  tb.innerHTML=list.map(c=>{ const overdue=c.status!=='Closed'&&c.dueDate&&c.dueDate<today;
    return `<tr><td><b>${esc(c.id)}</b></td><td>${c.jobNo?`<button class="btn ghost sm" onclick="go('lookup',{jobNo:'${jsq(c.jobNo)}'})">${esc(c.jobNo)}</button>`:'—'}</td><td>${esc(c.title)}</td><td>${capaSevPill(c.severity)}</td><td>${esc(c.owner||'—')}</td><td>${c.dueDate?(overdue?`<span class="flag bad">${esc(c.dueDate)} ⚠</span>`:esc(c.dueDate)):'—'}</td><td>${capaStatusPill(c.status)}</td>${canManage?`<td class="no-print"><button class="btn ghost sm" onclick="capaModal('${jsq(c.id)}')">Open</button></td>`:''}</tr>`;
  }).join("");
  const e=$("#capaempty"); if(e)e.classList.toggle("hidden",!!list.length);
}
function capaModal(id, prefill){
  const c=id?(window._capas||[]).find(x=>x.id===id):null; const p=prefill||{};
  const curSev=c?c.severity:(p.severity||'Medium');
  const sevOpts=["Low","Medium","High","Critical"].map(s=>`<option ${curSev===s?'selected':''}>${s}</option>`).join("");
  const stOpts=["Open","In Progress","Closed"].map(s=>`<option ${c&&c.status===s?'selected':''}>${s}</option>`).join("");
  $("#modalRoot").innerHTML=`<div class="modal-bg"><div class="modal"><h2>${c?esc(c.id):'Raise CAPA'}</h2>
    <div class="grid g2">
      <div class="field"><label>Job # (optional)</label><input id="ca_jobNo" value="${esc(c?c.jobNo:(p.jobNo||''))}"></div>
      <div class="field"><label>Severity</label><select id="ca_sev">${sevOpts}</select></div>
    </div>
    <div class="field"><label>Title <span class="req">*</span></label><input id="ca_title" value="${esc(c?c.title:(p.title||''))}" placeholder="Short description of the issue"></div>
    <div class="field"><label>Source</label><input id="ca_source" value="${esc(c?c.source:(p.source||''))}" placeholder="e.g. Reel Inspection (F-021), customer complaint"></div>
    <div class="field"><label>Root cause</label><textarea id="ca_root">${esc(c?c.rootCause:'')}</textarea></div>
    <div class="field"><label>Corrective action</label><textarea id="ca_corr">${esc(c?c.correctiveAction:'')}</textarea></div>
    <div class="field"><label>Preventive action</label><textarea id="ca_prev">${esc(c?c.preventiveAction:'')}</textarea></div>
    <div class="grid g3">
      <div class="field"><label>Owner</label><input id="ca_owner" value="${esc(c?c.owner:'')}" placeholder="who's responsible"></div>
      <div class="field"><label>Due date</label><input id="ca_due" type="date" value="${esc(c?c.dueDate:'')}"></div>
      ${c?`<div class="field"><label>Status</label><select id="ca_status">${stOpts}</select></div>`:''}
      ${c?`<div class="field"><label>Effectiveness</label><select id="ca_eff">${["","Pending","Verified","Not effective"].map(o=>`<option value="${o}" ${c.effectiveness===o?'selected':''}>${o||'(not set)'}</option>`).join("")}</select></div>`:''}
    </div>
    ${c&&c.closedAt?`<p class="sub">Closed by ${esc(c.closedBy)} on ${esc(c.closedAt.slice(0,10))}.${c.verifiedAt?(' Effectiveness '+esc(c.effectiveness)+' by '+esc(c.verifiedBy)+' on '+esc(c.verifiedAt.slice(0,10))+'.'):''}</p>`:''}
    <div class="row-actions"><button class="btn gold" onclick="saveCapa(${c?`'${jsq(c.id)}'`:'null'})">Save</button><button class="btn ghost" onclick="closeModal()">Cancel</button></div></div></div>`;
}
async function saveCapa(id){
  const body={ jobNo:val("ca_jobNo").trim(), severity:val("ca_sev"), title:val("ca_title").trim(), source:val("ca_source").trim(),
    rootCause:val("ca_root"), correctiveAction:val("ca_corr"), preventiveAction:val("ca_prev"), owner:val("ca_owner").trim(), dueDate:val("ca_due") };
  if(!body.title){ toast("A CAPA title is required"); return; }
  const stSel=document.getElementById("ca_status"); if(stSel) body.status=stSel.value;
  const effSel=document.getElementById("ca_eff"); if(effSel) body.effectiveness=effSel.value;
  try{ if(id) await api("/api/capas/"+encodeURIComponent(id),{method:"PUT",body}); else await api("/api/capas",{method:"POST",body});
    closeModal(); toast("CAPA saved"); capaPage();
  }catch(e){ toast(e.message); }
}
function raiseCapaFor(no){ const ov=JOB&&JOB.statusOverride; capaModal(null,{ jobNo:no, severity:(ov==='Hold'||ov==='Rejected')?'High':'Medium', source:ov?('Job '+ov):'In-process inspection' }); }

/* NCR — non-conformance reports */
function ncrStatusPill(s){ return `<span class="pill ${s==='Closed'?'green':'amber'}">${esc(s)}</span>`; }
async function ncrPage(){
  const canManage=isMgrRole();
  app().innerHTML=`<div class="empty">Loading…</div>`;
  let list=[]; try{ list=await api("/api/ncrs"); }catch(e){ app().innerHTML=`<div class="card"><div class="empty">Could not load NCRs — ${esc(e.message)}</div></div>`; return; }
  window._ncrs=list;
  const open=list.filter(n=>n.status!=='Closed').length;
  app().innerHTML=`<div class="card"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div><h2 style="margin:0">Non-Conformance Reports</h2><p class="sub" style="margin:4px 0 0">${open} open of ${list.length}. Promote an NCR to a CAPA to drive corrective action.</p></div>
      <div style="margin-left:auto" class="no-print">${canManage?`<button class="btn gold" onclick="ncrModal()">+ Raise NCR</button>`:''}</div></div>
    <div class="grid g3 no-print" style="margin:4px 0 14px"><div class="field"><label>Status</label><select id="nc_status" onchange="renderNcrRows()"><option value="">All</option><option>Open</option><option>Closed</option></select></div><div class="field"><label>Search</label><input id="nc_q" placeholder="NCR #, job, text" oninput="renderNcrRows()"></div></div>
    ${list.length?`<div style="overflow-x:auto"><table><thead><tr><th>NCR</th><th>Job</th><th>Date</th><th>Description</th><th>Disposition</th><th>Severity</th><th>CAPA</th><th>Status</th>${canManage?'<th class="no-print"></th>':''}</tr></thead><tbody id="ncbody"></tbody></table></div><div class="empty hidden" id="ncempty" style="padding:18px">No NCRs match the filter.</div>`:`<div class="empty">No NCRs yet.${canManage?' Raise one when an inspection finds a nonconformance.':''}</div>`}</div>`;
  if(list.length) renderNcrRows();
}
function renderNcrRows(){
  const canManage=isMgrRole(); const st=val("nc_status"), q=(val("nc_q")||"").toLowerCase().trim();
  let list=(window._ncrs||[]);
  if(st) list=list.filter(n=>n.status===st);
  if(q) list=list.filter(n=>((n.id||"")+" "+(n.jobNo||"")+" "+(n.description||"")).toLowerCase().includes(q));
  const tb=$("#ncbody"); if(!tb)return;
  tb.innerHTML=list.map(n=>`<tr><td><b>${esc(n.id)}</b></td><td>${n.jobNo?`<button class="btn ghost sm" onclick="go('lookup',{jobNo:'${jsq(n.jobNo)}'})">${esc(n.jobNo)}</button>`:'—'}</td><td>${esc(n.date)}</td><td>${esc(n.description)}</td><td>${esc(n.disposition)}</td><td>${capaSevPill(n.severity)}</td><td>${n.capaId?`<button class="btn ghost sm" onclick="go('capa')">${esc(n.capaId)}</button>`:(canManage?`<button class="btn ghost sm" onclick="promoteNcr('${jsq(n.id)}')">Raise CAPA</button>`:'—')}</td><td>${ncrStatusPill(n.status)}</td>${canManage?`<td class="no-print"><button class="btn ghost sm" onclick="ncrModal('${jsq(n.id)}')">Edit</button></td>`:''}</tr>`).join("");
  const e=$("#ncempty"); if(e)e.classList.toggle("hidden",!!list.length);
}
function ncrModal(id){
  const n=id?(window._ncrs||[]).find(x=>x.id===id):null;
  const dispOpts=["Use as is","Rework","Reject","Return to supplier","Scrap"].map(d=>`<option ${n&&n.disposition===d?'selected':''}>${d}</option>`).join("");
  const sevOpts=["Low","Medium","High","Critical"].map(s=>`<option ${(n?n.severity:'Medium')===s?'selected':''}>${s}</option>`).join("");
  const stOpts=["Open","Closed"].map(s=>`<option ${n&&n.status===s?'selected':''}>${s}</option>`).join("");
  $("#modalRoot").innerHTML=`<div class="modal-bg"><div class="modal"><h2>${n?esc(n.id):'Raise NCR'}</h2>
    <div class="grid g2"><div class="field"><label>Job #</label><input id="nc_job" value="${esc(n?n.jobNo:'')}"></div><div class="field"><label>Date</label><input id="nc_date" type="date" value="${esc(n?n.date:new Date().toISOString().slice(0,10))}"></div></div>
    <div class="field"><label>Description <span class="req">*</span></label><textarea id="nc_desc">${esc(n?n.description:'')}</textarea></div>
    <div class="grid g3"><div class="field"><label>Disposition</label><select id="nc_disp">${dispOpts}</select></div><div class="field"><label>Severity</label><select id="nc_sev">${sevOpts}</select></div>${n?`<div class="field"><label>Status</label><select id="nc_st">${stOpts}</select></div>`:''}</div>
    <div class="row-actions"><button class="btn gold" onclick="saveNcr(${n?`'${jsq(n.id)}'`:'null'})">Save</button>${n&&!n.capaId?`<button class="btn ghost" onclick="promoteNcr('${jsq(n.id)}')">Raise CAPA</button>`:''}<button class="btn ghost" onclick="closeModal()">Cancel</button></div></div></div>`;
}
async function saveNcr(id){ const body={ jobNo:val("nc_job").trim(), date:val("nc_date"), description:val("nc_desc").trim(), disposition:val("nc_disp"), severity:val("nc_sev") };
  if(!body.description){ toast("A description is required"); return; }
  const st=document.getElementById("nc_st"); if(st) body.status=st.value;
  try{ if(id) await api("/api/ncrs/"+encodeURIComponent(id),{method:"PUT",body}); else await api("/api/ncrs",{method:"POST",body}); closeModal(); toast("NCR saved"); ncrPage(); }catch(e){ toast(e.message); }
}
async function promoteNcr(id){ if(!confirm("Create a CAPA linked to this NCR?")) return; try{ const r=await api("/api/ncrs/"+encodeURIComponent(id)+"/capa",{method:"POST"}); closeModal(); toast("Created "+r.capa.id); go("capa"); }catch(e){ toast(e.message); } }

/* equipment & calibration register */
function equipStatusPill(s){ const m={'OK':'green','Due soon':'amber','Overdue':'red','Retired':'grey','Unscheduled':'grey'}; return `<span class="pill ${m[s]||'grey'}">${esc(s)}</span>`; }
async function equipmentPage(){
  const canManage=isMgrRole();
  app().innerHTML=`<div class="empty">Loading…</div>`;
  let list=[]; try{ list=await api("/api/equipment"); }catch(e){ app().innerHTML=`<div class="card"><div class="empty">Could not load equipment — ${esc(e.message)}</div></div>`; return; }
  window._equip=list;
  const overdue=list.filter(e=>e.calStatus==='Overdue').length, dueSoon=list.filter(e=>e.calStatus==='Due soon').length;
  app().innerHTML=`<div class="card"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div><h2 style="margin:0">Equipment &amp; Calibration</h2><p class="sub" style="margin:4px 0 0">${list.length} items · ${overdue} overdue · ${dueSoon} due soon.</p></div>
      <div style="margin-left:auto" class="no-print">${canManage?`<button class="btn gold" onclick="equipModal()">+ Add equipment</button>`:''}</div></div>
    <div class="grid g3 no-print" style="margin:4px 0 14px">
      <div class="field"><label>Status</label><select id="eq_status" onchange="renderEquipRows()"><option value="">All</option><option>OK</option><option>Due soon</option><option>Overdue</option><option>Retired</option><option>Unscheduled</option></select></div>
      <div class="field"><label>Search</label><input id="eq_q" placeholder="Name, type, machine, owner" oninput="renderEquipRows()"></div>
    </div>
    ${list.length?`<div style="overflow-x:auto"><table><thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Machine</th><th>Last cal.</th><th>Next due</th><th>Status</th>${canManage?'<th class="no-print"></th>':''}</tr></thead><tbody id="eqbody"></tbody></table></div><div class="empty hidden" id="eqempty" style="padding:18px">No equipment matches the filter.</div>`:`<div class="empty">No equipment registered yet.${canManage?' Add gauges, verifiers, anilox rolls and machines to track calibration.':''}</div>`}</div>`;
  if(list.length) renderEquipRows();
}
function renderEquipRows(){
  const canManage=isMgrRole(); const st=val("eq_status"), q=(val("eq_q")||"").toLowerCase().trim();
  let list=(window._equip||[]);
  if(st) list=list.filter(e=>e.calStatus===st);
  if(q) list=list.filter(e=>((e.id||"")+" "+(e.name||"")+" "+(e.type||"")+" "+(e.machine||"")+" "+(e.owner||"")).toLowerCase().includes(q));
  const tb=$("#eqbody"); if(!tb)return;
  tb.innerHTML=list.map(e=>{ const overdue=e.calStatus==='Overdue', soon=e.calStatus==='Due soon';
    const due=e.nextDue?`${esc(e.nextDue)}${e.daysToDue!=null?` <span style="color:var(--muted);font-size:12px">(${e.daysToDue<0?Math.abs(e.daysToDue)+'d ago':'in '+e.daysToDue+'d'})</span>`:''}`:'—';
    return `<tr><td><b>${esc(e.id)}</b></td><td>${esc(e.name)}</td><td>${esc(e.type)}</td><td>${e.machine?`<span class="tag-machine">${esc(mlabel(e.machine))}</span>`:'—'}</td><td>${esc(e.calibratedOn||'—')}</td><td class="${overdue?'flag bad':(soon?'flag':'')}">${due}</td><td>${equipStatusPill(e.calStatus)}</td>${canManage?`<td class="no-print"><button class="btn gold sm" onclick="calibrateModal('${jsq(e.id)}')">Calibrate</button> <button class="btn ghost sm" onclick="equipModal('${jsq(e.id)}')">Edit</button></td>`:''}</tr>`;
  }).join("");
  const em=$("#eqempty"); if(em)em.classList.toggle("hidden",!!list.length);
}
function equipModal(id){
  const e=id?(window._equip||[]).find(x=>x.id===id):null;
  const typeOpts=["Machine","Anilox","Gauge","Verifier","Scale","Other"].map(t=>`<option ${e&&e.type===t?'selected':''}>${t}</option>`).join("");
  const machineOpts=`<option value="">— none —</option>`+Object.keys((MD&&MD.machines)||{}).map(m=>`<option value="${esc(m)}" ${e&&e.machine===m?'selected':''}>${esc(MD.machines[m].label)}</option>`).join("");
  $("#modalRoot").innerHTML=`<div class="modal-bg"><div class="modal"><h2>${e?esc(e.id):'Add equipment'}</h2>
    <div class="field"><label>Name <span class="req">*</span></label><input id="eq_name" value="${esc(e?e.name:'')}" placeholder="e.g. GS1 Barcode Verifier"></div>
    <div class="grid g2">
      <div class="field"><label>Type</label><select id="eq_type">${typeOpts}</select></div>
      <div class="field"><label>Asset / serial</label><input id="eq_ident" value="${esc(e?e.identifier:'')}"></div>
      <div class="field"><label>Machine (optional)</label><select id="eq_machine">${machineOpts}</select></div>
      <div class="field"><label>Location</label><input id="eq_loc" value="${esc(e?e.location:'')}"></div>
      <div class="field"><label>Last calibrated</label><input id="eq_calon" type="date" value="${esc(e?e.calibratedOn:'')}"></div>
      <div class="field"><label>Interval (days)</label><input id="eq_interval" type="number" min="0" value="${esc(e?e.calibrationIntervalDays:'365')}"></div>
      <div class="field"><label>Owner</label><input id="eq_owner" value="${esc(e?e.owner:'')}"></div>
      ${e?`<div class="field"><label>Status</label><select id="eq_active"><option value="true" ${e.active!==false?'selected':''}>Active</option><option value="false" ${e.active===false?'selected':''}>Retired</option></select></div>`:''}
    </div>
    <div class="field"><label>Notes</label><textarea id="eq_notes">${esc(e?e.notes:'')}</textarea></div>
    <div class="row-actions"><button class="btn gold" onclick="saveEquip(${e?`'${jsq(e.id)}'`:'null'})">Save</button><button class="btn ghost" onclick="closeModal()">Cancel</button></div></div></div>`;
}
async function saveEquip(id){
  const body={ name:val("eq_name").trim(), type:val("eq_type"), identifier:val("eq_ident").trim(), machine:val("eq_machine"), location:val("eq_loc").trim(), calibratedOn:val("eq_calon"), calibrationIntervalDays:Number(val("eq_interval"))||0, owner:val("eq_owner").trim(), notes:val("eq_notes") };
  if(!body.name){ toast("Equipment name is required"); return; }
  const act=document.getElementById("eq_active"); if(act) body.active=(act.value==='true');
  try{ if(id) await api("/api/equipment/"+encodeURIComponent(id),{method:"PUT",body}); else await api("/api/equipment",{method:"POST",body});
    closeModal(); toast("Equipment saved"); equipmentPage();
  }catch(e){ toast(e.message); }
}
function calibrateModal(id){ const e=(window._equip||[]).find(x=>x.id===id); if(!e)return;
  $("#modalRoot").innerHTML=`<div class="modal-bg"><div class="modal"><h2>Record calibration</h2><p class="sub">${esc(e.id)} · ${esc(e.name)}</p>
    <div class="grid g3">
      <div class="field"><label>Date</label><input id="cal_on" type="date" value="${esc(new Date().toISOString().slice(0,10))}"></div>
      <div class="field"><label>Result</label><select id="cal_result"><option>Pass</option><option>Pass (adjusted)</option><option>Fail</option></select></div>
      <div class="field"><label>Interval (days)</label><input id="cal_interval" type="number" min="0" value="${esc(e.calibrationIntervalDays||365)}"></div>
    </div>
    <div class="field"><label>Notes</label><textarea id="cal_notes" placeholder="Standard used, as-found reading, technician…"></textarea></div>
    <div class="row-actions"><button class="btn gold" onclick="doCalibrate('${jsq(e.id)}')">Save calibration</button><button class="btn ghost" onclick="closeModal()">Cancel</button></div></div></div>`;
}
async function doCalibrate(id){ const body={ on:val("cal_on"), result:val("cal_result"), intervalDays:Number(val("cal_interval"))||undefined, notes:val("cal_notes") };
  try{ await api("/api/equipment/"+encodeURIComponent(id)+"/calibrate",{method:"POST",body}); closeModal(); toast("Calibration recorded"); equipmentPage(); }catch(e){ toast(e.message); }
}

/* executive dashboard (RAG vs targets) */
async function execDashboard(){
  app().innerHTML=`<div class="empty">Loading…</div>`;
  let d; try{ d=await api("/api/exec"); }catch(e){ app().innerHTML=`<div class="card"><div class="empty">Could not load — ${esc(e.message)}</div></div>`; return; }
  const ragCard=k=>`<div class="stat rag-${esc(k.rag)}"><div class="n">${esc(k.value)}${k.unit==='%'?'%':''}</div><div class="l">${esc(k.label)}</div><div class="rag-target">target ${k.dir==='min'?'≥':'≤'} ${esc(k.target)}${k.unit==='%'?'%':''}</div></div>`;
  const listCard=(title,items,render,empty)=>`<div class="card" style="margin-bottom:0"><h3 style="margin-top:0">${title}</h3>${items.length?items.map(render).join(""):`<p class="sub">${empty}</p>`}</div>`;
  app().innerHTML=`<div class="card"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0">Executive Overview</h2><p class="sub" style="margin:4px 0 0">${esc(d.org)} · live KPIs vs targets · ${esc(new Date(d.generated).toLocaleString())}</p></div><div style="margin-left:auto" class="no-print"><button class="btn ghost sm" onclick="go('settings')">Edit targets</button> <button class="btn gold sm" onclick="window.print()">📄 Print / PDF</button></div></div>
      <div class="stats" style="margin-bottom:0">${d.kpis.map(ragCard).join("")}</div></div>
    <div class="grid g2">
      ${listCard('Overdue CAPAs', d.lists.overdueCapas, c=>`<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b>${esc(c.id)}</b> ${capaSevPill(c.severity)} — ${esc(c.title)} <span class="flag bad">due ${esc(c.dueDate)}</span></div>`, 'None overdue. 👍')}
      ${listCard('Overdue calibrations', d.lists.overdueCal, e=>`<div style="padding:8px 0;border-bottom:1px solid var(--line)"><b>${esc(e.name)}</b> <span class="flag bad">due ${esc(e.nextDue)} (${Math.abs(e.days)}d ago)</span></div>`, 'All equipment in calibration. 👍')}
    </div>
    <div class="grid g2" style="margin-top:18px">
      ${listCard('Calibrations due soon', d.lists.dueSoonCal, e=>`<div style="padding:8px 0;border-bottom:1px solid var(--line)">${esc(e.name)} <span class="flag">due ${esc(e.nextDue)} (in ${esc(e.days)}d)</span></div>`, 'Nothing due in the next 2 weeks.')}
      ${listCard('Jobs on hold / rejected', d.lists.holds, h=>`<div style="padding:8px 0;border-bottom:1px solid var(--line)"><button class="btn ghost sm" onclick="go('lookup',{jobNo:'${jsq(h.jobNo)}'})">${esc(h.jobNo)}</button> ${statusPill(h.status)} ${esc(h.product||'')}</div>`, 'No jobs on hold or rejected.')}
    </div>`;
}

/* integrations: API keys, webhooks, metrics (Administrator) */
async function integrationsPage(){
  if(ME.role!=='Administrator'){ app().innerHTML=`<div class="card"><h2>Integrations</h2><p class="sub">Only an Administrator can manage API keys and webhooks.</p></div>`; return; }
  app().innerHTML=`<div class="empty">Loading…</div>`;
  let keys=[], wh={events:[],hooks:[]};
  try{ keys=await api("/api/admin/apikeys"); }catch(e){}
  try{ wh=await api("/api/admin/webhooks"); }catch(e){}
  window._wh=wh; const base=location.origin;
  const keyRows=keys.map(k=>`<tr><td><b>${esc(k.name)}</b></td><td><code>gqa_${esc(k.prefix)}_…</code></td><td>${esc((k.scopes||[]).join(', '))}</td><td>${esc(k.lastUsed?k.lastUsed.replace('T',' ').slice(0,16):'never')}</td><td class="no-print"><button class="btn danger sm" onclick="revokeKey('${jsq(k.id)}')">Revoke</button></td></tr>`).join("");
  const hookRows=(wh.hooks||[]).map(h=>`<tr><td style="word-break:break-all">${esc(h.url)}</td><td>${esc((h.events&&h.events.length)?h.events.join(', '):'all')}</td><td>${esc(h.lastStatus||'—')}</td><td class="no-print"><button class="btn danger sm" onclick="delHook('${jsq(h.id)}')">Delete</button></td></tr>`).join("");
  app().innerHTML=`<div class="card"><h2>Integrations</h2><p class="sub">Read-only REST API keys, outbound webhooks, and metrics for BI / monitoring.</p>
    <h3>API keys <button class="btn gold sm no-print" style="margin-left:8px" onclick="createKey()">+ New key</button></h3>
    <p class="sub">Send as header <code>x-api-key: gqa_…</code> on GET endpoints. Keys are read-only and scoped to operational data.</p>
    <div style="overflow-x:auto"><table><thead><tr><th>Name</th><th>Key</th><th>Scopes</th><th>Last used</th><th class="no-print"></th></tr></thead><tbody>${keyRows||`<tr><td colspan="5" style="color:var(--muted)">No keys yet.</td></tr>`}</tbody></table></div>
    <h3>Webhooks <button class="btn gold sm no-print" style="margin-left:8px" onclick="addHook()">+ Add webhook</button></h3>
    <p class="sub">POST signed JSON (HMAC-SHA256 in <code>X-GQA-Signature</code>) on: ${esc((wh.events||[]).join(', '))||'—'}.</p>
    <div style="overflow-x:auto"><table><thead><tr><th>URL</th><th>Events</th><th>Last delivery</th><th class="no-print"></th></tr></thead><tbody>${hookRows||`<tr><td colspan="4" style="color:var(--muted)">No webhooks yet.</td></tr>`}</tbody></table></div>
    <h3>Metrics &amp; API</h3><p class="sub">Prometheus metrics at <code>${esc(base)}/metrics</code> (set <code>METRICS_TOKEN</code> to require a bearer token).</p>
    <pre style="background:#f4f7fb;padding:10px;border-radius:8px;font-size:12px;overflow-x:auto">curl -H "x-api-key: gqa_…" ${esc(base)}/api/jobs
curl -H "x-api-key: gqa_…" ${esc(base)}/api/analytics</pre></div>`;
}
async function createKey(){ const name=prompt("Name this API key (e.g. 'Power BI reader'):"); if(!name)return;
  try{ const r=await api("/api/admin/apikeys",{method:"POST",body:{name}});
    $("#modalRoot").innerHTML=`<div class="modal-bg"><div class="modal"><h2>API key created</h2><div class="banner warn">Copy this key now — it is shown only once and cannot be retrieved later.</div><pre style="background:#f4f7fb;padding:12px;border-radius:8px;font-size:13px;word-break:break-all;white-space:pre-wrap">${esc(r.key)}</pre><div class="row-actions"><button class="btn gold" onclick="closeModal();integrationsPage()">Done</button></div></div></div>`;
  }catch(e){ toast(e.message); } }
async function revokeKey(id){ if(!confirm("Revoke this API key? Apps using it will stop working.")) return; try{ await api("/api/admin/apikeys/"+encodeURIComponent(id),{method:"DELETE"}); toast("Key revoked"); integrationsPage(); }catch(e){ toast(e.message); } }
function addHook(){ const events=(window._wh&&window._wh.events)||[];
  $("#modalRoot").innerHTML=`<div class="modal-bg"><div class="modal"><h2>Add webhook</h2>
    <div class="field"><label>Payload URL <span class="req">*</span></label><input id="wh_url" placeholder="https://example.com/hook"></div>
    <div class="field"><label>Secret (optional — signs the payload)</label><input id="wh_secret"></div>
    <div class="field"><label>Events</label><div style="display:flex;flex-direction:column;gap:6px">${events.map(e=>`<label style="text-transform:none;font-weight:600"><input type="checkbox" class="wh_ev" value="${esc(e)}" style="width:auto;min-height:0;margin-right:8px">${esc(e)}</label>`).join("")}</div><p class="sub" style="margin-top:6px">Leave all unticked to receive every event.</p></div>
    <div class="row-actions"><button class="btn gold" onclick="saveHook()">Add</button><button class="btn ghost" onclick="closeModal()">Cancel</button></div></div></div>`;
}
async function saveHook(){ const url=val("wh_url").trim(); if(!/^https?:\/\//i.test(url)){ toast("Enter a valid http(s) URL"); return; }
  const events=[...document.querySelectorAll('.wh_ev:checked')].map(c=>c.value);
  try{ await api("/api/admin/webhooks",{method:"POST",body:{url,secret:val("wh_secret"),events}}); closeModal(); toast("Webhook added"); integrationsPage(); }catch(e){ toast(e.message); } }
async function delHook(id){ if(!confirm("Delete this webhook?")) return; try{ await api("/api/admin/webhooks/"+encodeURIComponent(id),{method:"DELETE"}); toast("Webhook deleted"); integrationsPage(); }catch(e){ toast(e.message); } }

/* SPC — statistical process control */
async function spcPage(){
  app().innerHTML=`<div class="card"><h2>SPC — Statistical Process Control</h2><p class="sub">Control chart and process capability (Cp/Cpk) for an in-process variable.</p>
    <div class="grid g4 no-print"><div class="field"><label>Parameter</label><select id="spc_param" onchange="loadSpc()"><option value="cof">COF (film to metal)</option><option value="registration">Print registration (mm)</option></select></div></div>
    <div class="stats" id="spc_kpis"></div>
    <div id="spc_viol"></div>
    <canvas id="cSpc" height="240"></canvas></div>`;
  loadSpc();
}
async function loadSpc(){
  const param=val("spc_param")||"cof"; let d; try{ d=await api("/api/spc?param="+encodeURIComponent(param)); }catch(e){ toast(e.message); return; }
  const cpkRag=d.cpk!=null?(d.cpk>=1.33?'rag-green':(d.cpk>=1?'rag-amber':'rag-red')):'';
  $("#spc_kpis").innerHTML=`<div class="stat"><div class="n">${esc(d.n)}</div><div class="l">Samples</div></div><div class="stat"><div class="n">${esc(d.mean)}</div><div class="l">Mean</div></div><div class="stat"><div class="n">${d.cp==null?'—':esc(d.cp)}</div><div class="l">Cp</div></div><div class="stat ${cpkRag}"><div class="n">${d.cpk==null?'—':esc(d.cpk)}</div><div class="l">Cpk</div></div>`;
  $("#spc_viol").innerHTML = d.n<2?`<div class="banner">Need at least 2 samples for control limits. Record more ${esc(d.label)} readings in Stage 1.</div>`:(d.violations.length?`<div class="banner warn">Out-of-limit points: ${d.violations.map(esc).join(', ')}</div>`:`<div class="banner" style="background:var(--green-bg);border-color:#aee0bf;color:var(--green)">All ${esc(d.n)} points within control &amp; spec limits.</div>`);
  if(!window.Chart){ toast("Charts need internet (Chart.js)"); return; }
  Object.values(CHARTS).forEach(c=>{try{c.destroy()}catch(e){}}); CHARTS={};
  const labels=d.points.map(p=>p.jobNo); const line=v=>labels.map(()=>v);
  const ds=[{label:d.label,data:d.points.map(p=>p.value),borderColor:"#0e2a47",backgroundColor:"#0e2a47",pointRadius:4,tension:0},
    {label:"Mean",data:line(d.mean),borderColor:"#15803d",borderDash:[6,4],pointRadius:0},
    {label:"UCL",data:line(d.ucl),borderColor:"#b91c1c",borderDash:[4,4],pointRadius:0},
    {label:"LCL",data:line(d.lcl),borderColor:"#b91c1c",borderDash:[4,4],pointRadius:0}];
  if(d.usl!=null) ds.push({label:"USL",data:line(d.usl),borderColor:"#b45309",pointRadius:0});
  if(d.lsl!=null) ds.push({label:"LSL",data:line(d.lsl),borderColor:"#b45309",pointRadius:0});
  CHARTS.spc=new Chart($("#cSpc"),{type:"line",data:{labels,datasets:ds},options:{plugins:{legend:{position:"bottom"}}}});
}

/* supplier scorecards */
async function suppliersPage(){
  app().innerHTML=`<div class="card"><h2>Supplier scorecards</h2><p class="sub">Quality by material supplier (from the Stage-1 Supplier field).</p><div id="sup_body"><div class="empty">Loading…</div></div></div>`;
  let list; try{ list=await api("/api/suppliers"); }catch(e){ toast(e.message); return; }
  const rows=list.map(s=>`<tr><td><b>${esc(s.supplier)}</b></td><td>${esc(s.jobs)}</td><td>${esc(s.released)}</td><td>${esc(s.holdReject)}</td><td><span class="pill ${s.fpy>=95?'green':(s.fpy>=85?'amber':'red')}">${esc(s.fpy)}%</span></td><td>${esc(s.defectKg)}</td><td>${esc(s.wasteKg)}</td></tr>`).join("");
  $("#sup_body").innerHTML = list.length?`<div style="overflow-x:auto"><table><thead><tr><th>Supplier</th><th>Jobs</th><th>Released</th><th>Hold/Rej</th><th>FPY</th><th>Defect kg</th><th>Waste kg</th></tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="empty">No supplier data yet — set the <b>Supplier</b> field in Stage 1.</div>`;
}

/* ---------- templates: Stage-1 setup defaults per press / product ---------- */
const TPL_MAT_COLS=[{k:"materialType",l:"Material Type"},{k:"gauge",l:"Gauge/Thickness (µ)"},{k:"grammage",l:"Grammage GSM"},{k:"dyne",l:"Dyne Level"},{k:"supplier",l:"Supplier"},{k:"batch",l:"Batch#"}];
const TPL_SET_KEYS=["unwinderTension","infeedTension","outfeedTension","rewindTension","machineSpeed","corona1","corona2","corona3","corona4"];
async function templatesPage(){
  if(!isMgrRole()){ app().innerHTML=`<div class="card"><div class="empty">Templates are managed by Supervisors and Quality Managers.</div></div>`; return; }
  app().innerHTML=`<div class="empty">Loading…</div>`;
  let list=[]; try{ list=await api("/api/templates"); }catch(e){ app().innerHTML=`<div class="card"><div class="empty">Could not load templates — ${esc(e.message)}</div></div>`; return; }
  window._templates=list;
  const rows=list.map(t=>`<tr><td><b>${esc(t.name)}</b></td><td>${t.machine?esc(mlabel(t.machine)):'<span class="sub">Any press</span>'}</td><td>${t.productType?esc(t.productType):'<span class="sub">Any product</span>'}</td><td>${((t.settings&&t.settings.materials)||[]).length} mat · ${((t.settings&&t.settings.stations)||[]).length} stn</td><td class="no-print"><button class="btn ghost sm" onclick="templateForm('${jsq(t.id)}')">Edit</button> <button class="btn danger sm" onclick="templateDel('${jsq(t.id)}')">×</button></td></tr>`).join("")||`<tr><td colspan=5><div class="empty">No templates yet — create one to auto-fill Stage 1 on new jobs.</div></td></tr>`;
  app().innerHTML=`<div class="card"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><h2 style="margin:0">Templates</h2><div style="margin-left:auto" class="no-print"><button class="btn gold" onclick="templateForm()">+ New template</button></div></div>
    <p class="sub">Default Stage&nbsp;1 setup (machine settings, raw materials, print-station values) applied automatically to a new job by its printing press and/or product type. The most specific match wins; values stay editable on the job.</p>
    <div style="overflow-x:auto"><table><thead><tr><th>Name</th><th>Press</th><th>Product Type</th><th>Defaults</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
async function templateDel(id){ if(!confirm("Delete this template?")) return; try{ await api("/api/templates/"+encodeURIComponent(id),{method:"DELETE"}); toast("Template deleted"); templatesPage(); }catch(e){ toast(e.message); } }
function templateForm(id){ const src=(window._templates||[]).find(x=>x.id===id);
  const t=src?JSON.parse(JSON.stringify(src)):{ id:null, name:"", machine:"", productType:"", settings:{} };
  t.settings=t.settings||{}; if(!Array.isArray(t.settings.materials)||!t.settings.materials.length)t.settings.materials=[{}]; if(!Array.isArray(t.settings.stations))t.settings.stations=[];
  window._tpl=t; tplRender();
}
function tplSeedStations(machine){ const groups=(MD.machines[machine]&&MD.machines[machine].stationGroups)||[]; const st=[]; groups.forEach((g,gi)=>(g.stations||[]).forEach(n=>{ const o={group:gi,name:String(n)}; (g.cols||[]).forEach(c=>o[c.key]=""); st.push(o); })); return st; }
function tplCaptureDom(){ const t=window._tpl; if(!t||!document.getElementById("tpl_name"))return;
  t.name=val("tpl_name"); t.productType=val("tpl_productType");
  TPL_SET_KEYS.forEach(k=>t.settings[k]=val("tpl_"+k));
  document.querySelectorAll('[data-tplmat]').forEach(el=>{ const x=t.settings.materials[+el.dataset.i]; if(x)x[el.dataset.f]=el.value; });
  document.querySelectorAll('[data-tplst]').forEach(el=>{ const x=t.settings.stations[+el.dataset.i]; if(x)x[el.dataset.f]=el.value; });
}
function tplSetMachine(v){ tplCaptureDom(); window._tpl.machine=v; window._tpl.settings.stations=v?tplSeedStations(v):[]; tplRender(); }
function tplMatAdd(){ tplCaptureDom(); window._tpl.settings.materials.push({}); tplRender(); }
function tplMatDel(i){ tplCaptureDom(); window._tpl.settings.materials.splice(i,1); if(!window._tpl.settings.materials.length)window._tpl.settings.materials.push({}); tplRender(); }
async function templateSave(){ tplCaptureDom(); const t=window._tpl; if(!String(t.name||"").trim()){ toast("Enter a template name"); return; }
  const body={ name:t.name, machine:t.machine||"", productType:t.productType||"", settings:t.settings };
  try{ if(t.id) await api("/api/templates/"+encodeURIComponent(t.id),{method:"PUT",body}); else await api("/api/templates",{method:"POST",body}); toast("Template saved"); templatesPage(); }catch(e){ toast(e.message); } }
function tplRender(){ const t=window._tpl; const machine=t.machine||"";
  if(machine && (!t.settings.stations||!t.settings.stations.length)) t.settings.stations=tplSeedStations(machine);
  const machineOpts=`<option value="">— Any press —</option>`+Object.keys(MD.machines||{}).map(m=>`<option value="${esc(m)}" ${m===machine?'selected':''}>${esc(MD.machines[m].label)}</option>`).join("");
  const ptOpts=`<option value="">— Any product —</option>`+(MD.productTypes||[]).map(p=>`<option ${p===(t.productType||"")?'selected':''}>${esc(p)}</option>`).join("");
  const groups=(MD.machines[machine]&&MD.machines[machine].stationGroups)||[];
  const stationTables= machine ? (groups.map((g,gi)=>{ const cols=g.cols||[];
      const head=`<tr><th>Station</th>${cols.map(c=>`<th>${esc(c.label)}</th>`).join("")}</tr>`;
      const rows=t.settings.stations.map((s,i)=>({s,i})).filter(x=>(x.s.group||0)===gi).map(({s,i})=>`<tr><td><b>${esc(s.name)}</b></td>${cols.map(c=>`<td><input data-tplst="1" data-i="${i}" data-f="${esc(c.key)}" value="${esc(s[c.key]||'')}"></td>`).join("")}</tr>`).join("");
      return `<h4 style="margin:12px 0 6px">${esc(g.title)}</h4><div style="overflow-x:auto"><table><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
    }).join("")||`<p class="sub">This press has no station groups.</p>`) : `<p class="sub">Pick a printing press to set per-station defaults (station columns depend on the press).</p>`;
  const matHead=`<tr>${TPL_MAT_COLS.map(c=>`<th>${esc(c.l)}</th>`).join("")}<th></th></tr>`;
  const matBody=t.settings.materials.map((m,i)=>`<tr>${TPL_MAT_COLS.map(c=>`<td><input data-tplmat="1" data-i="${i}" data-f="${c.k}" value="${esc(m[c.k]||'')}"></td>`).join("")}<td><button class="btn danger sm" onclick="tplMatDel(${i})">×</button></td></tr>`).join("");
  app().innerHTML=`<div class="card"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><h2 style="margin:0">${t.id?'Edit template':'New template'}</h2><div style="margin-left:auto" class="no-print"><button class="btn gold" onclick="templateSave()">Save</button> <button class="btn ghost" onclick="go('templates')">Cancel</button></div></div>
    <p class="sub">Leave a key as “Any” to make this template a fallback. A job picks the most specific matching template.</p>
    <div class="grid g3"><div class="field"><label>Name <span class="req">*</span></label><input id="tpl_name" value="${esc(t.name||'')}"></div>
      <div class="field"><label>Printing Press</label><select id="tpl_machine" onchange="tplSetMachine(this.value)">${machineOpts}</select></div>
      <div class="field"><label>Product Type</label><select id="tpl_productType">${ptOpts}</select></div></div>
    <h3>Machine Settings</h3><div class="grid g4">${fT("tpl_unwinderTension","Unwinder Tension (N)",t.settings.unwinderTension)}${fT("tpl_infeedTension","In-Feed Tension (N)",t.settings.infeedTension)}${fT("tpl_outfeedTension","Out-Feed Tension (N)",t.settings.outfeedTension)}${fT("tpl_rewindTension","Rewind Tension (N)",t.settings.rewindTension)}${fT("tpl_machineSpeed","Speed (mpm)",t.settings.machineSpeed)}${fT("tpl_corona1","Corona 1 (W·min/m²)",t.settings.corona1)}${fT("tpl_corona2","Corona 2 (W·min/m²)",t.settings.corona2)}${fT("tpl_corona3","Corona 3 (W·min/m²)",t.settings.corona3)}${fT("tpl_corona4","Corona 4 (W·min/m²)",t.settings.corona4)}</div>
    <h3>Default Raw Materials</h3><div style="overflow-x:auto"><table><thead>${matHead}</thead><tbody>${matBody}</tbody></table></div><div class="row-actions"><button class="btn ghost sm" onclick="tplMatAdd()">+ Add raw material</button></div>
    <h3>Default Print Stations${machine?` (${esc(mlabel(machine))})`:''}</h3>${stationTables}
    <div class="row-actions no-print" style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px"><button class="btn gold" onclick="templateSave()">Save template</button> <button class="btn ghost" onclick="go('templates')">Cancel</button></div></div>`;
}

/* team & access */
async function team(){
  const canManage=["Quality Manager","Administrator"].includes(ME.role);
  let users=[]; try{ users=await api("/api/admin/users"); }catch(e){ users=[]; }
  window._users=users;
  const rows=users.map(u=>`<tr><td><b>${esc(u.id)}</b></td><td>${esc(u.name)}</td><td>${esc(u.role)}</td><td>${(u.qualifiedStages&&u.qualifiedStages.length)?esc(u.qualifiedStages.slice().sort().join(', ')):'—'}</td>${canManage?`<td class="no-print"><button class="btn ghost sm" onclick="userModal('${jsq(u.id)}')">Edit</button> <button class="btn danger sm" onclick="delUser('${jsq(u.id)}')">Remove</button></td>`:''}</tr>`).join("");
  app().innerHTML=`<div class="card"><h2>Team &amp; Access</h2><p class="sub">People who can sign in, their roles, and which stages they're qualified to sign off.</p>
    <h3>Users ${canManage?`<button class="btn gold sm no-print" style="margin-left:8px" onclick="userModal()">+ Add user</button>`:''}</h3>
    <div style="overflow-x:auto"><table><thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Qualified stages</th>${canManage?'<th class="no-print"></th>':''}</tr></thead><tbody>${rows||`<tr><td colspan="5" style="color:var(--muted)">No users.</td></tr>`}</tbody></table></div>
    ${canManage?'<p class="sub" style="margin-top:10px">Roles: QA Officer · Supervisor · Quality Manager · Administrator. Supervisors and above can edit jobs &amp; settings; Quality Manager/Administrator manage users.</p>':'<p class="sub" style="margin-top:8px">Only a Quality Manager or Administrator can add or edit users.</p>'}</div>`;
}
/* audit trail */
async function auditTrail(){
  const canManage=isMgrRole();
  let audit=[]; try{ audit=await api("/api/audit"); }catch(e){}
  app().innerHTML=`<div class="card"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div><h2 style="margin:0">Audit Trail</h2><p class="sub" style="margin:4px 0 0">Tamper-evident log of the latest 300 actions (HMAC-chained).</p></div>
      ${canManage?`<div style="margin-left:auto" class="no-print"><button class="btn ghost" onclick="verifyAudit()">Verify integrity</button></div>`:''}</div>
    <div id="auditVerify" class="no-print" style="margin:6px 0 12px"></div>
    <div style="overflow-x:auto;max-height:72vh;overflow-y:auto"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Job</th><th>Detail</th></tr></thead><tbody>${audit.length?audit.map(x=>`<tr><td>${esc(x.ts.replace('T',' ').slice(0,19))}</td><td>${esc(x.user)}</td><td>${esc(x.action)}</td><td>${esc(x.jobNo)}</td><td>${esc(x.detail)}</td></tr>`).join(""):`<tr><td colspan="5" style="color:var(--muted)">No audit entries yet.</td></tr>`}</tbody></table></div></div>`;
}
async function verifyAudit(){ const host=$("#auditVerify"); if(host)host.innerHTML='<span class="sub">Checking…</span>';
  try{ const r=await api("/api/audit/verify");
    if(r.ok) host.innerHTML=`<div class="banner" style="background:var(--green-bg);border-color:#aee0bf;color:var(--green)">✓ Audit chain intact — ${r.checked} entr${r.checked===1?'y':'ies'} verified${r.legacy?(' ('+r.legacy+' legacy pre-upgrade, unchained)'):''}.</div>`;
    else host.innerHTML=`<div class="banner warn" style="background:var(--red-bg);border-color:#f3c7c7;color:var(--red)">✗ Audit chain broken at entry #${r.brokenAt} (${esc((r.entry&&r.entry.action)||'')}). The log may have been altered.</div>`;
  }catch(e){ if(host)host.innerHTML=`<div class="banner warn">Could not verify: ${esc(e.message)}</div>`; }
}
/* settings (master data, integrations, storage) */
async function settings(){
  const md=MD;
  let backups=null; try{ backups=await api("/api/admin/backups"); }catch(e){}
  let health=null; try{ health=await (await fetch("/api/health")).json(); }catch(e){}
  app().innerHTML=`<div class="card"><h2>Settings</h2><p class="sub">Tolerances, master data, integrations and storage.</p>
    <h3>Tolerances (auto pass/fail)</h3><div class="grid g4">${fT("t_cofMin","COF min",md.tolerances.cofMin)}${fT("t_cofMax","COF max",md.tolerances.cofMax)}${fT("t_reg","Registration max (mm)",md.tolerances.registrationMaxMm)}${fT("t_bc","Barcode min grade",md.tolerances.barcodeMinGrade)}</div><div class="row-actions"><button class="btn gold sm" onclick="saveTol()">Save tolerances</button></div>
    <h3>KPI targets (Executive dashboard)</h3><div class="grid g4">${fT("tg_fpy","First-pass yield min (%)",(md.targets||{}).fpyMin)}${fT("tg_capa","Open CAPAs max",(md.targets||{}).openCapasMax)}${fT("tg_cal","Overdue calibrations max",(md.targets||{}).overdueCalMax)}${fT("tg_hold","Hold/Reject jobs max",(md.targets||{}).holdRejectMax)}</div><div class="row-actions"><button class="btn gold sm" onclick="saveTargets()">Save targets</button></div>
    <h3>Competency control</h3>
    <label style="text-transform:none;font-weight:600;display:flex;align-items:center;gap:10px;max-width:760px"><input type="checkbox" id="cmp_enf" ${md.competencyEnforced?'checked':''} style="width:auto;min-height:0">Enforce operator competency — block a stage sign-off unless the signer is qualified for that stage (set per user in Team &amp; Access; Administrators bypass).</label>
    <div class="row-actions"><button class="btn gold sm" onclick="saveCompetency()">Save</button></div>
    <h3>Defect types</h3><textarea id="a_def" style="min-height:80px">${esc((md.defectTypes||[]).join(", "))}</textarea><div class="row-actions"><button class="btn ghost sm" onclick="saveDefects()">Save defect list</button></div>
    <h3>Backups &amp; storage</h3><div class="kv">
      <div><span>Storage driver</span><b>${esc(health?health.storage:'?')}</b></div>
      <div><span>Latest backup</span><b>${backups&&backups.latest?esc(backups.latest.name):'none found'}</b></div>
      <div><span>Backup age</span><b>${backups&&backups.latest?esc(backups.latest.ageHours+' h'):'—'}</b></div>
      <div><span>Backup size</span><b>${backups&&backups.latest?esc(backups.latest.sizeKB+' KB'):'—'}</b></div>
      <div><span>Total dumps</span><b>${backups?esc(backups.count):'—'}</b></div>
      <div><span>Backups dir</span><b style="font-size:12px">${esc(backups?backups.dir:'?')}</b></div>
    </div>
    ${ME.role==='Administrator' && backups && backups.driver==='json' ? `<h3>Restore from backup</h3>
      <div class="banner warn">Restoring replaces the entire live database with the selected snapshot. A safety backup of the current data is taken automatically first.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;max-width:680px"><select id="rs_name" style="flex:1 1 auto">${(backups.files||[]).filter(f=>/^db-\d{8}-\d{6}\.json$/.test(f.name)).map(f=>`<option value="${esc(f.name)}">${esc(f.name)} — ${esc(f.sizeKB)} KB, ${esc(f.ageHours)} h ago</option>`).join("")||'<option value="">No snapshots found</option>'}</select><button class="btn danger" onclick="doRestore()">Restore</button></div>` : '' }
  </div>`;
}
async function doRestore(){ const name=val("rs_name"); if(!name){ toast("No backup selected"); return; }
  if(!confirm("Restore '"+name+"'? This replaces ALL current data. A safety backup is taken first.")) return;
  try{ const r=await api("/api/admin/restore",{method:"POST",body:{name}}); toast("Restored "+r.restored+" — "+r.jobs+" jobs, "+r.users+" users"); MD=await api("/api/masterdata"); go("dashboard"); }catch(e){ toast(e.message); }
}
async function saveTargets(){ const t={ fpyMin:Number(val("tg_fpy"))||0, openCapasMax:Number(val("tg_capa"))||0, overdueCalMax:Number(val("tg_cal"))||0, holdRejectMax:Number(val("tg_hold"))||0 };
  MD.targets=t; try{ await api("/api/masterdata",{method:"PUT",body:{targets:t}}); toast("KPI targets saved"); }catch(e){ toast(e.message); } }
async function saveCompetency(){ const on=!!(document.getElementById("cmp_enf")&&document.getElementById("cmp_enf").checked); MD.competencyEnforced=on;
  try{ await api("/api/masterdata",{method:"PUT",body:{competencyEnforced:on}}); toast("Competency enforcement "+(on?"enabled":"disabled")); }catch(e){ toast(e.message); } }
/* my account */
function myAccount(){
  app().innerHTML=`<div class="card"><h2>My Account</h2><p class="sub">Your profile and password.</p>
    <div class="kv"><div><span>Name</span><b>${esc(ME.name)}</b></div><div><span>Username</span><b>${esc(ME.id)}</b></div><div><span>Role</span><b>${esc(ME.role)}</b></div></div>
    <h3>Change password</h3>
    <div class="grid g3" style="max-width:760px">
      <div class="field"><label>Current password</label><input id="pw_cur" type="password" autocomplete="current-password"></div>
      <div class="field"><label>New password</label><input id="pw_new" type="password" autocomplete="new-password" placeholder="min 6 characters"></div>
      <div class="field"><label>Confirm new password</label><input id="pw_cf" type="password" autocomplete="new-password"></div>
    </div>
    <div class="row-actions"><button class="btn gold" onclick="changePassword()">Update password</button></div>
    <p class="sub" style="margin-top:8px">Signed in with Microsoft 365? Manage your password in your Microsoft account instead.</p>
    <div class="row-actions" style="margin-top:18px;border-top:1px solid var(--line);padding-top:16px"><button class="btn ghost" onclick="logout()">Sign out</button></div></div>`;
}
async function changePassword(){ const cur=val("pw_cur"), nw=val("pw_new"), cf=val("pw_cf");
  if(!cur||!nw){ toast("Enter your current and new password"); return; }
  if(nw.length<6){ toast("New password must be at least 6 characters"); return; }
  if(nw!==cf){ toast("New passwords don't match"); return; }
  try{ await api("/api/me/password",{method:"POST",body:{current:cur,new:nw}}); toast("Password updated"); ["pw_cur","pw_new","pw_cf"].forEach(id=>{ const e=document.getElementById(id); if(e)e.value=""; }); }catch(e){ toast(e.message); }
}
function userModal(id){ const u=id?(window._users||[]).find(x=>x.id===id):null;
  $("#modalRoot").innerHTML=`<div class="modal-bg"><div class="modal"><h2>${u?'Edit user':'Add user'}</h2>
    <div class="field"><label>User ID <span class="req">*</span></label><input id="u_id" value="${u?esc(u.id):''}" ${u?'disabled':''} placeholder="e.g. jsmith"></div>
    <div class="field"><label>Name <span class="req">*</span></label><input id="u_name" value="${u?esc(u.name):''}"></div>
    <div class="field"><label>Role <span class="req">*</span></label><select id="u_role">${ROLES.map(r=>`<option ${u&&u.role===r?'selected':''}>${esc(r)}</option>`).join("")}</select></div>
    <div class="field"><label>Qualified to sign off stages</label><div style="display:flex;gap:14px;flex-wrap:wrap">${[1,2,3,4].map(s=>`<label style="text-transform:none;font-weight:600"><input type="checkbox" class="u_qs" value="${s}" ${u&&(u.qualifiedStages||[]).map(Number).includes(s)?'checked':''} style="width:auto;min-height:0;margin-right:6px">Stage ${s}</label>`).join("")}</div><p class="sub" style="margin-top:6px">Enforced only when competency checks are on (Settings); Administrators always bypass.</p></div>
    <div class="field"><label>Password${u?' (leave blank to keep current)':' <span class="req">*</span>'}</label><input id="u_pass" type="password" autocomplete="new-password" placeholder="${u?'••••••':'min 6 characters'}"></div>
    <div class="row-actions"><button class="btn gold" onclick="saveUser(${u?`'${jsq(u.id)}'`:'null'})">Save</button><button class="btn ghost" onclick="closeModal()">Cancel</button></div></div></div>`;
}
async function saveUser(id){ const name=val("u_name").trim(), role=val("u_role"), password=val("u_pass");
  if(!name){ toast("Name is required"); return; }
  const qualifiedStages=[...document.querySelectorAll('.u_qs:checked')].map(c=>Number(c.value));
  try{
    if(id){ const body={name,role,qualifiedStages}; if(password){ if(password.length<6){ toast("Password must be at least 6 characters"); return; } body.password=password; } await api("/api/admin/users/"+encodeURIComponent(id),{method:"PUT",body}); }
    else { const uid=val("u_id").trim(); if(!uid){ toast("User ID is required"); return; } if(password.length<6){ toast("Password must be at least 6 characters"); return; } await api("/api/admin/users",{method:"POST",body:{id:uid,name,role,password,qualifiedStages}}); }
    closeModal(); toast("User saved"); team();
  }catch(e){ toast(e.message); }
}
async function delUser(id){ if(!confirm("Remove user '"+id+"'? This cannot be undone.")) return; try{ await api("/api/admin/users/"+encodeURIComponent(id),{method:"DELETE"}); toast("User removed"); team(); }catch(e){ toast(e.message); } }
async function saveTol(){ MD.tolerances=Object.assign(MD.tolerances,{cofMin:parseFloat(val("t_cofMin")),cofMax:parseFloat(val("t_cofMax")),registrationMaxMm:parseFloat(val("t_reg")),barcodeMinGrade:val("t_bc")}); await api("/api/masterdata",{method:"PUT",body:{tolerances:MD.tolerances}}); toast("Tolerances saved"); }
async function saveDefects(){ MD.defectTypes=val("a_def").split(",").map(s=>s.trim()).filter(Boolean); await api("/api/masterdata",{method:"PUT",body:{defectTypes:MD.defectTypes}}); toast("Defect list saved"); }

/* register SW + boot */
function showUpdateBanner(){ if(document.getElementById("updBanner"))return; const d=document.createElement("div"); d.id="updBanner"; d.className="upd-banner no-print"; d.innerHTML=`<span>A new version is available.</span><button class="btn gold sm" onclick="location.reload()">Reload</button>`; document.body.appendChild(d); }
if("serviceWorker" in navigator){ window.addEventListener("load",()=>{
  navigator.serviceWorker.register("sw.js").then(reg=>{ if(!reg)return;
    reg.addEventListener("updatefound",()=>{ const nw=reg.installing; if(!nw)return; nw.addEventListener("statechange",()=>{ if(nw.state==="installed" && navigator.serviceWorker.controller) showUpdateBanner(); }); });
  }).catch(()=>{});
}); }
boot();
