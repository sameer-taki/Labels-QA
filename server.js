'use strict';
/* Golden Manufacturers - Starkist Label QA System (on-prem server, zero external deps) */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UP_DIR = path.join(DATA_DIR, 'uploads');
const SESS_FILE = path.join(DATA_DIR, 'sessions.json');
const PUB = path.join(ROOT, 'public');
fs.mkdirSync(UP_DIR, { recursive: true });

const BC = require('./integrations/businessCentral');
const NOTIFY = require('./integrations/notify');
const AVT = require('./integrations/avtImport');

/* ---------- tiny persistence layer (swap for SQLite/Postgres later) ---------- */
let DB = null;
function loadDB() {
  if (fs.existsSync(DB_FILE)) { DB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  else { DB = seedDB(); saveDB(); }
}
let saveTimer = null;
function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2)); }
function hashPin(pin, salt) { return crypto.createHash('sha256').update(salt + ':' + pin).digest('hex'); }
function mkUser(id, name, role, pin) { const salt = crypto.randomBytes(6).toString('hex'); return { id, name, role, active: true, salt, pinHash: hashPin(pin, salt) }; }

function seedDB() {
  return {
    users: [
      mkUser('akumar', 'A. Kumar', 'QA Officer', '1234'),
      mkUser('pdevi', 'P. Devi', 'QA Officer', '1234'),
      mkUser('rprasad', 'R. Prasad', 'Supervisor', '2345'),
      mkUser('ateet', 'Ateet Roshan', 'Quality Manager', '9999'),
      mkUser('admin', 'Administrator', 'Administrator', '0000')
    ],
    masterdata: {
      machines: {
        Flexo450: { form: 'F-040-A', label: 'Flexo 450', stations: ['Infeed','Station 1','Station 2','Station 3','Station 4','Station 5','Station 6','Station 7','Station 8','Station 9'] },
        NilPeter: { form: 'F-016-E', label: 'NilPeter', stations: ['Infeed','Station 1','Station 2','Station 3','Station 4','Station 5','Station 6','Station 7','Station 8'] },
        BOBST: { form: 'F-027-A', label: 'BOBST (Lamination)', stations: ['Infeed','Station 1','Station 2','Station 3','Station 4','Station 5','Station 6'] }
      },
      defectTypes: ['Hickey','Mis-register','Ink splash','Bubble','Streak','Scratch','Colour variation','Die-cut error','Lamination defect','Foreign matter'],
      products: ['Chunk Light Tuna 142g Wrap Label','Solid White Albacore 198g Label','Chunk Light 85g Wrap Label'],
      tolerances: CFG.tolerances
    },
    jobs: seedJobs(),
    audit: [{ ts: new Date().toISOString(), user: 'system', action: 'seed', jobNo: '', detail: 'Database initialised' }]
  };
}
function seedJobs() {
  return [
    { jobNo:'SK-24817', customer:'StarKist', product:'Chunk Light Tuna 142g Wrap Label', machine:'Flexo450', description:'5-colour wrap, UV varnish', created:'2026-06-18',
      stage1:{_done:true,date:'2026-06-18',productDescription:'Chunk Light Tuna 142g',operator:'J. Naidu',supervisor:'R. Prasad',qaOfficer:'A. Kumar',proceed:'Yes',materialType:'BOPP White 60um',thicknessGrammage:'60um / 58 gsm',batchDetails:'BP-2261',dyneLevel:'38',supplier:'Innovia',substrate:'BOPP',machineSpeed:'120',gs1Barcode:'A',printRegistration:'0.1',cofFilmMetal:'0.28',stations:[{name:'Station 1',uv:'100%',anilox:'360',teeth:'120',ink:'Cyan',batch:'C-8841',by:'JN'},{name:'Station 2',uv:'100%',anilox:'360',teeth:'120',ink:'Magenta',batch:'M-8842',by:'JN'}],comments:'Within spec.',photos:[]},
      stage2:{_done:true,date:'2026-06-18',machineName:'AVT Inspection Machine 1',shift:'Day',operator:'S. Lal',qaOfficer:'A. Kumar',avtRef:'AVT-24817-01',rows:[{roll:'1',totalMeters:'5000',wasteIn:'40',wasteOut:'35',defect:'Hickey',weightKg:'1.1',sign:'SL'},{roll:'2',totalMeters:'5000',wasteIn:'30',wasteOut:'28',defect:'Mis-register',weightKg:'1.0',sign:'SL'}],remarks:'Cleared.',photos:[]},
      stage3:{_done:true,date:'2026-06-19',customerItem:'StarKist / 142g Wrap',startTime:'06:10',finishTime:'10:40',operatorName:'M. Singh',rolls:[{no:'1',material:'BOPP 60um',reelWidth:'330',size:'105x148',gsm:'58',repeat:'148',totalSheets:'4200',wasteKg:'1.2',goodSheets:'4120'}],colours:'Pass',register:'Pass',barcode:'A',cuttingAccuracy:'0.2',setupHours:'0.5',dtMechanical:'0.1',operatorRemarks:'Smooth',qcRemarks:'OK',photos:[]},
      stage4:{_done:false} },
    { jobNo:'SK-24820', customer:'StarKist', product:'Solid White Albacore 198g Label', machine:'NilPeter', description:'4-colour + cold foil', created:'2026-06-19',
      stage1:{_done:true,date:'2026-06-19',productDescription:'Albacore 198g',operator:'V. Reddy',supervisor:'R. Prasad',qaOfficer:'P. Devi',proceed:'Yes',materialType:'Paper 80gsm',gs1Barcode:'A',printRegistration:'0.1',stations:[{name:'Station 1',uv:'100%',anilox:'360',teeth:'110',ink:'Cyan',batch:'C-9001',by:'VR'}],comments:'Cold foil aligned.',photos:[]},
      stage2:{_done:false}, stage3:{_done:false}, stage4:{_done:false} },
    { jobNo:'SK-24795', customer:'StarKist', product:'Chunk Light 85g Wrap Label', machine:'BOBST', description:'Laminated wrap', created:'2026-06-15',
      stage1:{_done:true,date:'2026-06-15',operator:'A. Chand',qaOfficer:'A. Kumar',proceed:'Yes',materialType:'BOPP/Foil laminate',gs1Barcode:'A',cofFilmMetal:'0.30',stations:[{name:'Station 1',uv:'100%',anilox:'320',teeth:'130',ink:'Adhesive',batch:'AD-220',by:'AC'}],comments:'Bond OK.',photos:[]},
      stage2:{_done:true,date:'2026-06-15',machineName:'AVT Inspection Machine 1',shift:'Day',operator:'S. Lal',qaOfficer:'A. Kumar',avtRef:'AVT-24795-01',rows:[{roll:'1',totalMeters:'6000',wasteIn:'25',wasteOut:'20',defect:'Bubble',weightKg:'1.0',sign:'SL'}],remarks:'Cleared.',photos:[]},
      stage3:{_done:true,date:'2026-06-16',customerItem:'StarKist / 85g Wrap',startTime:'07:00',finishTime:'11:15',operatorName:'M. Singh',rolls:[{no:'1',material:'Laminate',reelWidth:'300',size:'95x130',gsm:'-',repeat:'130',totalSheets:'5200',wasteKg:'1.5',goodSheets:'5100'}],colours:'Pass',register:'Pass',barcode:'A',cuttingAccuracy:'0.2',setupHours:'0.4',operatorRemarks:'OK',qcRemarks:'OK',photos:[]},
      stage4:{_done:true,date:'2026-06-16',productItem:'Chunk Light 85g Wrap',labelWidth:'95',labelLength:'130',shift:'Day',shiftStartFinish:'07:00 - 15:00',checks:[{time:'08:00',vals:{'Banded Bundle Checked':'Yes','Shrink-Wrapped Bundle Checked':'Yes','Packing Label Checked':'Yes','Finished Good Pallet Checked':'Yes','Label Orientation in Bundle':'Yes','Line Clearance Status':'Yes','Curling':'No','Printing Defects':'No','Cutting Defects':'No'}}],rejectedQty:'0',reasonsRejection:'-',remarks:'All checks passed.',operatorName:'R. Kumar',qcName:'A. Kumar',packersNames:'Team B',statusFinal:'Released',photos:[]},
      statusOverride:'Released' }
  ];
}

/* ---------- helpers ---------- */
/* Sessions: token -> {userId, ts}. Persisted to disk so a server restart does not
   log everyone out, and expired after a sliding inactivity window (config.auth). */
const SESS_TTL = (((CFG.auth&&CFG.auth.sessionTtlMinutes)||720) * 60000);
let SESS = {};
function loadSess(){ try{ if(fs.existsSync(SESS_FILE)) SESS = JSON.parse(fs.readFileSync(SESS_FILE,'utf8'))||{}; }catch(e){ SESS={}; } pruneSess(); }
function saveSess(){ try{ fs.writeFileSync(SESS_FILE, JSON.stringify(SESS)); }catch(e){} }
function pruneSess(){ const now=Date.now(); let changed=false; for(const t in SESS){ if(now-(SESS[t].ts||0) > SESS_TTL){ delete SESS[t]; changed=true; } } if(changed) saveSess(); }
function newToken() { return crypto.randomBytes(16).toString('hex'); }
function userByToken(req) {
  const t = (req.headers['authorization']||'').replace(/^Bearer /,'') || req.headers['x-token'];
  const s = t && SESS[t]; if(!s) return null;
  if(Date.now()-(s.ts||0) > SESS_TTL){ delete SESS[t]; saveSess(); return null; } // expired
  s.ts = Date.now(); // sliding window (persisted on login/logout/prune, not every request)
  const u = DB.users.find(x=>x.id===s.userId);
  if(!u || u.active===false){ delete SESS[t]; saveSess(); return null; } // user removed/disabled
  return u;
}
function isRole(user, roles){ return !!user && roles.includes(user.role); }
function audit(user, action, jobNo, detail) { DB.audit.push({ ts:new Date().toISOString(), user:user?user.id:'anon', action, jobNo:jobNo||'', detail:detail||'' }); if (DB.audit.length>5000) DB.audit = DB.audit.slice(-5000); }
function completedStages(j){ return [1,2,3,4].filter(n=>j['stage'+n]&&j['stage'+n]._done).length; }
function jobStatus(j){ if(j.statusOverride) return j.statusOverride; const c=completedStages(j); return c===0?'New':(c<4?'In Progress':'Released'); }
function mlabelS(m){ const mm=DB.masterdata&&DB.masterdata.machines&&DB.masterdata.machines[m]; return mm?mm.label:(m||''); }
/* Stage validation: enforce in-sequence completion + minimum required fields. */
function stageSequenceError(j, n){ for(let k=1;k<n;k++){ if(!(j['stage'+k]&&j['stage'+k]._done)) return 'Complete Stage '+k+' before completing Stage '+n+'.'; } return null; }
function stageRequiredError(n, d){
  const blank=v=>(v===undefined||v===null||String(v).trim()===''); const miss=[];
  const req=pairs=>pairs.forEach(p=>{ if(blank(d[p[1]])) miss.push(p[0]); });
  if(n===1){ req([['Date','date'],['Proceed With Job','proceed'],['QA Officer','qaOfficer']]); }
  else if(n===2){ req([['Date','date'],['QA Officer','qaOfficer']]); if(!(d.rows||[]).some(r=>r&&(String(r.totalMeters||'').trim()||String(r.defect||'').trim()))) miss.push('at least one reel/defect row'); }
  else if(n===3){ req([['Date','date'],['Operator','operatorName']]); if(!(d.rolls||[]).some(r=>r&&String(r.no||'').trim())) miss.push('at least one roll'); }
  else if(n===4){ req([['Date','date'],['Final Release Decision','statusFinal'],['QC Name','qcName']]); if(!(d.checks||[]).some(c=>c&&String(c.time||'').trim())) miss.push('at least one hourly check'); }
  return miss.length ? ('Missing required: '+miss.join(', ')) : null;
}

function send(res, code, obj, headers) {
  const body = typeof obj === 'string' ? obj : JSON.stringify(obj);
  res.writeHead(code, Object.assign({ 'Content-Type': typeof obj==='string'?'text/plain':'application/json', 'Cache-Control':'no-store' }, headers||{}));
  res.end(body);
}
const MIME = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon' };
function serveStatic(res, filePath) {
  fs.readFile(filePath, (err, buf) => {
    if (err) return send(res, 404, 'Not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
}
function readBody(req) { return new Promise((resolve)=>{ let d=''; req.on('data',c=>{ d+=c; if(d.length>25*1024*1024) req.destroy(); }); req.on('end',()=>{ try{ resolve(d?JSON.parse(d):{}); }catch(e){ resolve({}); } }); }); }

/* ---------- API ---------- */
async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
  const seg = parts.slice(1);
  const method = req.method;

  if (seg[0]==='health') return send(res,200,{ ok:true, org:CFG.orgName, time:new Date().toISOString() });

  if (seg[0]==='login' && method==='POST') {
    const b = await readBody(req);
    if (b.mode==='sso') {
      const u = await verifySso(b); if(!u) return send(res,401,{error:'SSO not recognised'});
      if(u.active===false) return send(res,403,{error:'Account disabled'});
      const t=newToken(); SESS[t]={userId:u.id,ts:Date.now()}; saveSess(); audit(u,'login-sso'); return send(res,200,{ token:t, user:pubUser(u) });
    }
    const u = DB.users.find(x=>x.id===b.userId);
    if (!u || !u.pinHash || u.pinHash !== hashPin(String(b.pin||''), u.salt)) return send(res,401,{error:'Invalid user or PIN'});
    if (u.active===false) return send(res,403,{error:'Account disabled'});
    const t=newToken(); SESS[t]={userId:u.id,ts:Date.now()}; saveSess(); audit(u,'login'); return send(res,200,{ token:t, user:pubUser(u) });
  }
  if (seg[0]==='users' && method==='GET') return send(res,200, DB.users.filter(u=>u.active!==false && u.pinHash).map(pubUser)); // PIN login picker (active, PIN-enabled)

  const user = userByToken(req);
  if (!user) return send(res,401,{error:'Not authenticated'});

  if (seg[0]==='me') return send(res,200,{ user:pubUser(user) });

  if (seg[0]==='logout' && method==='POST') { const t=(req.headers['authorization']||'').replace(/^Bearer /,'')||req.headers['x-token']; if(t&&SESS[t]){ delete SESS[t]; saveSess(); } audit(user,'logout'); return send(res,200,{ ok:true }); }

  if (seg[0]==='jobs' && method==='GET' && !seg[1]) {
    return send(res,200, DB.jobs.map(j=>({ jobNo:j.jobNo, product:j.product, customer:j.customer, machine:j.machine, created:j.created, status:jobStatus(j), completed:completedStages(j) })));
  }
  if (seg[0]==='jobs' && method==='GET' && seg[1]) {
    const j = DB.jobs.find(x=>x.jobNo.toLowerCase()===decodeURIComponent(seg[1]).toLowerCase());
    return j ? send(res,200,j) : send(res,404,{error:'Job not found'});
  }
  if (seg[0]==='jobs' && method==='POST') {
    const b = await readBody(req);
    if(!b.jobNo||!b.machine) return send(res,400,{error:'jobNo and machine required'});
    if(DB.jobs.find(x=>x.jobNo.toLowerCase()===b.jobNo.toLowerCase())) return send(res,409,{error:'Job already exists'});
    const job={ jobNo:b.jobNo, machine:b.machine, customer:b.customer||'StarKist', product:b.product||'', description:b.description||'', created:new Date().toISOString().slice(0,10), stage1:{_done:false},stage2:{_done:false},stage3:{_done:false},stage4:{_done:false} };
    DB.jobs.unshift(job); audit(user,'create-job',job.jobNo); saveDB(); return send(res,200,job);
  }
  if (seg[0]==='jobs' && seg[2]==='stage' && method==='PUT') {
    const j = DB.jobs.find(x=>x.jobNo.toLowerCase()===decodeURIComponent(seg[1]).toLowerCase());
    if(!j) return send(res,404,{error:'Job not found'});
    const n = seg[3]; const b = await readBody(req); const data = b.data || {};
    if(data._done){ // drafts can always be saved; completion is validated
      const seqErr = stageSequenceError(j, +n); if(seqErr) return send(res,400,{error:seqErr});
      const reqErr = stageRequiredError(+n, data); if(reqErr) return send(res,400,{error:reqErr});
    }
    j['stage'+n] = data;
    if(n==='4' && data._done && data.statusFinal){ j.statusOverride = data.statusFinal==='Released'?'Released':(data.statusFinal==='Rejected'?'Rejected':'Hold'); if(j.statusOverride!=='Released'){ NOTIFY.alert(CFG,'Job '+j.jobNo+' set to '+j.statusOverride,'Stage 4 decision: '+data.statusFinal+' (qty '+(data.rejectedQty||'?')+')'); } }
    audit(user,'save-stage'+n,j.jobNo, data._done?'completed':'draft'); saveDB(); return send(res,200,j);
  }
  if (seg[0]==='jobs' && seg[2]==='hold' && method==='POST') {
    const j = DB.jobs.find(x=>x.jobNo.toLowerCase()===decodeURIComponent(seg[1]).toLowerCase());
    if(!j) return send(res,404,{error:'Job not found'}); const b=await readBody(req);
    j.statusOverride='Hold'; audit(user,'hold',j.jobNo,b.reason||''); NOTIFY.alert(CFG,'Job '+j.jobNo+' placed on HOLD', (b.reason||'')+' by '+user.name); saveDB(); return send(res,200,j);
  }

  if (seg[0]==='upload' && method==='POST') { // {dataUrl, name}
    const b = await readBody(req); const m=/^data:(image\/\w+);base64,(.+)$/.exec(b.dataUrl||'');
    if(!m) return send(res,400,{error:'Invalid image data'});
    const ext = m[1]==='image/png'?'.png':'.jpg'; const fn = Date.now()+'-'+crypto.randomBytes(4).toString('hex')+ext;
    fs.writeFileSync(path.join(UP_DIR,fn), Buffer.from(m[2],'base64')); audit(user,'upload-photo','',fn);
    return send(res,200,{ url:'/uploads/'+fn });
  }

  if (seg[0]==='masterdata' && method==='GET') return send(res,200, DB.masterdata);
  if (seg[0]==='masterdata' && method==='PUT') { const b=await readBody(req); DB.masterdata=Object.assign(DB.masterdata,b); audit(user,'update-masterdata'); saveDB(); return send(res,200,DB.masterdata); }

  /* ---- user management (Administrator only) ---- */
  if (seg[0]==='admin' && seg[1]==='users') {
    if(!isRole(user,['Administrator'])) return send(res,403,{error:'Administrator access required'});
    const ROLES=['QA Officer','Supervisor','Quality Manager','Administrator'];
    const activeAdmins=()=>DB.users.filter(x=>x.role==='Administrator'&&x.active!==false).length;
    if(method==='GET' && !seg[2]) return send(res,200, DB.users.map(adminUser));
    if(method==='POST' && !seg[2]) { const b=await readBody(req);
      const id=String(b.id||'').trim().toLowerCase().replace(/[^a-z0-9._-]/g,'');
      if(!id || !String(b.name||'').trim() || !b.role) return send(res,400,{error:'id, name and role are required'});
      if(!ROLES.includes(b.role)) return send(res,400,{error:'Invalid role'});
      if(!/^\d{4,8}$/.test(String(b.pin||''))) return send(res,400,{error:'PIN must be 4–8 digits'});
      if(DB.users.find(u=>u.id===id)) return send(res,409,{error:'User id already exists'});
      const u=mkUser(id, String(b.name).trim(), b.role, String(b.pin)); DB.users.push(u);
      audit(user,'create-user',null,id+' ('+b.role+')'); saveDB(); return send(res,200, adminUser(u));
    }
    const id=decodeURIComponent(seg[2]||''); const u=DB.users.find(x=>x.id===id);
    if(seg[2] && method==='PUT') { if(!u) return send(res,404,{error:'User not found'}); const b=await readBody(req);
      if(b.name!==undefined && String(b.name).trim()) u.name=String(b.name).trim();
      if(b.role!==undefined){ if(!ROLES.includes(b.role)) return send(res,400,{error:'Invalid role'});
        if(u.role==='Administrator' && b.role!=='Administrator' && activeAdmins()<=1) return send(res,400,{error:'Cannot demote the last administrator'});
        u.role=b.role; }
      if(b.active!==undefined){ const a=!!b.active;
        if(!a && u.id===user.id) return send(res,400,{error:'You cannot disable your own account'});
        if(!a && u.role==='Administrator' && activeAdmins()<=1) return send(res,400,{error:'Cannot disable the last administrator'});
        u.active=a; if(!a){ for(const t in SESS){ if(SESS[t].userId===u.id) delete SESS[t]; } saveSess(); } }
      if(b.pin!==undefined && String(b.pin)!==''){ if(!/^\d{4,8}$/.test(String(b.pin))) return send(res,400,{error:'PIN must be 4–8 digits'}); u.salt=crypto.randomBytes(6).toString('hex'); u.pinHash=hashPin(String(b.pin),u.salt); }
      audit(user,'update-user',null,id); saveDB(); return send(res,200, adminUser(u));
    }
    if(seg[2] && method==='DELETE') { if(!u) return send(res,404,{error:'User not found'});
      if(u.id===user.id) return send(res,400,{error:'You cannot delete your own account'});
      if(u.role==='Administrator' && activeAdmins()<=1) return send(res,400,{error:'Cannot delete the last administrator'});
      DB.users=DB.users.filter(x=>x.id!==id); for(const t in SESS){ if(SESS[t].userId===id) delete SESS[t]; } saveSess();
      audit(user,'delete-user',null,id); saveDB(); return send(res,200,{ ok:true });
    }
    return send(res,404,{error:'Unknown user route'});
  }

  if (seg[0]==='audit' && method==='GET') return send(res,200, DB.audit.slice(-300).reverse());

  if (seg[0]==='bc' && seg[1]==='job' && method==='GET') { const r = await BC.lookupJob(CFG, decodeURIComponent(seg[2]||'')); return send(res, r.error?502:200, r); }

  if (seg[0]==='avt-import' && method==='POST') { const b=await readBody(req); const r=AVT.parse(b.csv||''); return send(res,200,r); }

  if (seg[0]==='analytics' && method==='GET') return send(res,200, analytics());

  if (seg[0]==='export' && method==='GET') {
    const cell=v=>{ v=v==null?'':String(v); return /[",\n\r]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; };
    const toCsv=(headers,rows)=> [headers].concat(rows).map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';
    const csvRes=(name,csv)=> send(res,200,csv,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="'+name+'"'});
    if(seg[1]==='jobs') return csvRes('golden-qa-jobs.csv', toCsv(['Job #','Product','Customer','Machine','Created','Status','Stages Complete'],
      DB.jobs.map(j=>[j.jobNo,j.product,j.customer,mlabelS(j.machine),j.created,jobStatus(j),completedStages(j)])));
    if(seg[1]==='defects'){ const rows=[]; DB.jobs.forEach(j=>{ ((j.stage2&&j.stage2.rows)||[]).forEach(r=>{ if(r&&(r.defect||r.weightKg||r.totalMeters)) rows.push([j.jobNo,mlabelS(j.machine),r.roll,r.defect,r.totalMeters,r.wasteIn,r.wasteOut,r.weightKg]); }); });
      return csvRes('golden-qa-defects.csv', toCsv(['Job #','Machine','Roll','Defect','Total m','Waste In','Waste Out','Weight Kg'], rows)); }
    return send(res,404,{error:'Unknown export'});
  }

  return send(res,404,{error:'Unknown API route'});
}
function pubUser(u){ return { id:u.id, name:u.name, role:u.role }; }
function adminUser(u){ return { id:u.id, name:u.name, role:u.role, active:u.active!==false, sso:!!u.sso, hasPin:!!u.pinHash }; }

/* SSO. mode 'stub' (default) trusts any email at the allowed domain — demo only.
   mode 'entra' delegates to verifyEntraToken() (see scaffold below). */
async function verifySso(b){
  const mode=(CFG.sso&&CFG.sso.mode)||'stub';
  if(mode==='entra'){ const p=await verifyEntraToken(b.idToken||b.accessToken); return p?ssoProfileToUser(p):null; }
  const email=b&&b.email; if(!email) return null;
  const dom='@'+CFG.sso.allowedDomain; if(!String(email).toLowerCase().endsWith(dom)) return null;
  return ssoProfileToUser({ id:String(email).split('@')[0].toLowerCase(), name:email.split('@')[0], role:'Quality Manager', email });
}
/* Map a verified SSO profile to a local user, auto-provisioning on first sign-in
   so subsequent token lookups (which resolve against DB.users) succeed. */
function ssoProfileToUser(p){ if(!p||!p.id) return null;
  let u=DB.users.find(x=>x.id===p.id);
  if(!u){ u={ id:p.id, name:p.name||p.id, role:p.role||'QA Officer', active:true, sso:true }; DB.users.push(u); audit(null,'provision-sso-user',null,p.id); saveDB(); }
  return u;
}
/* SCAFFOLD — Microsoft Entra ID token validation. To enable in production:
     1) set sso.mode='entra' and fill sso.tenantId / sso.clientId in config.json;
     2) validate the JWT signature against the tenant JWKS:
        https://login.microsoftonline.com/<tenantId>/discovery/v2.0/keys
     3) verify claims: iss == https://login.microsoftonline.com/<tenantId>/v2.0,
        aud == clientId, exp in the future, tid == tenantId;
     4) return { id, name, role, email } built from the verified claims.
   Use a vetted JWT/JWKS library for step 2–3. Until implemented, this rejects all
   logins so an enabled-but-unconfigured 'entra' mode never silently trusts a token. */
async function verifyEntraToken(token){ if(!token) return null;
  console.warn('SSO mode=entra but verifyEntraToken() is not implemented yet — rejecting login. See scaffold in server.js.');
  return null;
}

function analytics(){
  const defects={}, wasteByMachine={}, downtime={Setup:0,Material:0,Windup:0,Damage:0,Mechanical:0,Electrical:0,Others:0};
  let released=0, total=DB.jobs.length, rejectedJobs=0;
  DB.jobs.forEach(j=>{
    if(jobStatus(j)==='Released') released++;
    const s2=j.stage2||{}; (s2.rows||[]).forEach(r=>{ if(r.defect){ defects[r.defect]=(defects[r.defect]||0)+(parseFloat(r.weightKg)||0.0); } });
    const s3=j.stage3||{}; const w=(s3.rolls||[]).reduce((a,r)=>a+(parseFloat(r.wasteKg)||0),0); wasteByMachine[j.machine]=(wasteByMachine[j.machine]||0)+w;
    if(s3){ downtime.Setup+=parseFloat(s3.setupHours)||0; downtime.Material+=parseFloat(s3.dtMaterial)||0; downtime.Windup+=parseFloat(s3.dtWindup)||0; downtime.Damage+=parseFloat(s3.dtDamage)||0; downtime.Mechanical+=parseFloat(s3.dtMechanical)||0; downtime.Electrical+=parseFloat(s3.dtElectrical)||0; downtime.Others+=parseFloat(s3.dtOthers)||0; }
    const s4=j.stage4||{}; if(s4.statusFinal && s4.statusFinal!=='Released') rejectedJobs++;
  });
  const fpy = total? Math.round((released/total)*100):0;
  return { defects, wasteByMachine, downtime, kpis:{ total, released, rejectedJobs, firstPassYield:fpy } };
}

/* ---------- HTTP server ---------- */
loadDB();
loadSess();
setInterval(pruneSess, 3600000).unref(); // hourly expiry sweep
const server = http.createServer((req,res)=>{
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) return api(req,res,url).catch(e=>{ console.error(e); send(res,500,{error:String(e)}); });
  if (url.pathname.startsWith('/uploads/')) return serveStatic(res, path.join(UP_DIR, path.basename(url.pathname)));
  let p = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.normalize(path.join(PUB, p));
  if (!filePath.startsWith(PUB)) return send(res,403,'Forbidden');
  fs.existsSync(filePath) ? serveStatic(res, filePath) : serveStatic(res, path.join(PUB,'index.html'));
});
const PORT = process.env.PORT || CFG.port;
server.listen(PORT, CFG.host, ()=> console.log('Golden QA server on http://'+CFG.host+':'+PORT+'  ('+CFG.orgName+')'));
module.exports = { server };
