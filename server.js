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
const PUB = path.join(ROOT, 'public');
fs.mkdirSync(UP_DIR, { recursive: true });

const BC = require('./integrations/businessCentral');
const NOTIFY = require('./integrations/notify');
const AVT = require('./integrations/avtImport');
const EMAIL = require('./integrations/email');
const ENTRA = require('./integrations/entraId');
const BACKUP = require('./integrations/backup');
const { makeStorage } = require('./integrations/storage');

/* ---------- runtime config (env overrides config.json for container deploys) ---------- */
const PROD = process.env.NODE_ENV === 'production';
const SECRET_KEY = process.env.SECRET_KEY || '';
if (PROD && SECRET_KEY.replace(/[^A-Za-z0-9]/g, '').length < 16) {
  console.error('FATAL: set a strong SECRET_KEY (>= 16 alphanumeric chars) in production.'); process.exit(1);
}
const TOKEN_SECRET = SECRET_KEY || 'dev-insecure-secret-change-me';
const TOKEN_TTL_MS = (Number(process.env.SESSION_HOURS) || 12) * 60 * 60 * 1000;

/* ---------- persistence: Postgres (DATABASE_URL) | SQLite | JSON file ---------- */
let DB = null;
const STORAGE = makeStorage({
  databaseUrl: process.env.DATABASE_URL || '',
  dbFile: DB_FILE,
  sqlitePath: (CFG.storage && CFG.storage.path) ? path.resolve(ROOT, CFG.storage.path) : path.join(DATA_DIR, 'db.sqlite'),
  driverPref: (CFG.storage && CFG.storage.driver) || 'json'
});
async function loadDB() {
  const loaded = await STORAGE.load();
  if (loaded) DB = loaded; else { DB = seedDB(); await STORAGE.save(DB); }
  // forward-compat shims for databases created before these collections existed
  if (!Array.isArray(DB.capas)) DB.capas = [];
  if (!Array.isArray(DB.audit)) DB.audit = [];
  if (typeof DB.auditAnchor !== 'string') DB.auditAnchor = '';
}
let _saveChain = Promise.resolve();
function saveDB() { _saveChain = _saveChain.then(() => STORAGE.save(DB)).catch(e => console.error('saveDB failed:', e && e.message)); return _saveChain; }
function hashPw(pw, salt) { return crypto.scryptSync(String(pw), salt, 64).toString('hex'); }
function checkPw(u, pw) { if (!u || !u.passHash) return false; const h = hashPw(pw, u.salt); return h.length === u.passHash.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(u.passHash)); }
function mkUser(id, name, role, pw) { const salt = crypto.randomBytes(16).toString('hex'); return { id, name, role, salt, passHash: hashPw(pw, salt) }; }

function seedDB() {
  const adminUser = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || '';
  if (PROD && !adminPass) { console.error('FATAL: set ADMIN_PASSWORD to seed the initial admin user in production.'); process.exit(1); }
  // Production (ADMIN_PASSWORD set): seed a single admin, no demo data. Dev: seed the demo users + jobs.
  const users = adminPass
    ? [ mkUser(adminUser, 'Administrator', 'Administrator', adminPass) ]
    : [ mkUser('akumar', 'A. Kumar', 'QA Officer', 'kumar123'),
        mkUser('pdevi', 'P. Devi', 'QA Officer', 'devi123'),
        mkUser('rprasad', 'R. Prasad', 'Supervisor', 'prasad123'),
        mkUser('ateet', 'Ateet Roshan', 'Quality Manager', 'ateet123'),
        mkUser('admin', 'Administrator', 'Administrator', 'admin123') ];
  return {
    users,
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
    jobs: adminPass ? [] : seedJobs(),
    capas: adminPass ? [] : seedCapas(),
    audit: [ (function(){ const e={ ts:new Date().toISOString(), user:'system', action:'seed', jobNo:'', detail:'Database initialised' }; e.hash=auditHash('', e); return e; })() ],
    auditAnchor: ''
  };
}
function seedCapas() {
  return [ { id:'CAPA-24817-1', jobNo:'SK-24817', title:'Recurring hickeys on Station 1', source:'Reel Inspection (F-021)', severity:'Medium', status:'Open',
    rootCause:'Worn anilox roller depositing debris during the run.', correctiveAction:'Swap the 360 anilox on Station 1 and re-run a 500 m verification reel.', preventiveAction:'Add an anilox-condition check to the weekly preventive-maintenance sheet.',
    owner:'ateet', dueDate:'2026-06-30', createdBy:'akumar', createdAt:'2026-06-19T03:00:00.000Z', updatedAt:'2026-06-19T03:00:00.000Z', closedBy:'', closedAt:'' } ];
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
/* Stateless signed session tokens (HMAC). No server-side session store, so logins
   survive restarts/redeploys and work across replicas. Payload carries id/name/role. */
function signToken(payload){ const body=Buffer.from(JSON.stringify(payload)).toString('base64url'); const sig=crypto.createHmac('sha256',TOKEN_SECRET).update(body).digest('base64url'); return body+'.'+sig; }
function verifyTokenStr(tok){ if(!tok||typeof tok!=='string') return null; const i=tok.lastIndexOf('.'); if(i<1) return null; const body=tok.slice(0,i), sig=tok.slice(i+1); const exp=crypto.createHmac('sha256',TOKEN_SECRET).update(body).digest('base64url'); if(sig.length!==exp.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(exp))) return null; let p; try{ p=JSON.parse(Buffer.from(body,'base64url').toString('utf8')); }catch(e){ return null; } if(p.exp && Date.now()>p.exp) return null; return p; }
function issueToken(u){ return signToken({ uid:u.id, name:u.name, role:u.role, exp:Date.now()+TOKEN_TTL_MS }); }
function userByToken(req) { const t=(req.headers['authorization']||'').replace(/^Bearer /,'') || req.headers['x-token']; const p=verifyTokenStr(t); if(!p) return null; return DB.users.find(u=>u.id===p.uid) || { id:p.uid, name:p.name, role:p.role }; }
function alertAll(title, text){ try{ NOTIFY.alert(CFG, title, text); }catch(e){} EMAIL.send(CFG, { subject:title, text:text }).then(r=>{ if(r && !r.ok && r.error!=='email disabled') console.log('EMAIL send:', r.error); }).catch(()=>{}); }
/* Tamper-evident audit log: each entry is HMAC-chained to the previous one
   (key = TOKEN_SECRET), so any later edit/insert/delete/reorder breaks the chain
   and is caught by verifyAuditChain(). DB.auditAnchor keeps the hash of the last
   pruned entry so the chain stays verifiable after the 5000-entry cap trims the head.
   Strength depends on SECRET_KEY being secret (enforced in production). */
function auditHash(prevHash, e){ return crypto.createHmac('sha256', TOKEN_SECRET).update(String(prevHash||'')+'|'+JSON.stringify([e.ts,e.user,e.action,e.jobNo,e.detail])).digest('hex'); }
function audit(user, action, jobNo, detail) {
  const prev = DB.audit.length ? (DB.audit[DB.audit.length-1].hash || '') : (DB.auditAnchor || '');
  const e = { ts:new Date().toISOString(), user:user?user.id:'anon', action, jobNo:jobNo||'', detail:detail||'' };
  e.hash = auditHash(prev, e);
  DB.audit.push(e);
  if (DB.audit.length>5000){ const drop=DB.audit.length-5000; DB.auditAnchor = DB.audit[drop-1].hash || DB.auditAnchor || ''; DB.audit = DB.audit.slice(drop); }
}
function verifyAuditChain(){
  let prev = DB.auditAnchor || ''; let checked=0, legacy=0;
  for(let i=0;i<DB.audit.length;i++){ const e=DB.audit[i];
    if(!e.hash){ legacy++; prev=''; continue; } // pre-upgrade entries: not chained
    if(auditHash(prev, e) !== e.hash) return { ok:false, brokenAt:i, total:DB.audit.length, checked, legacy, entry:{ ts:e.ts, user:e.user, action:e.action, jobNo:e.jobNo } };
    prev=e.hash; checked++;
  }
  return { ok:true, total:DB.audit.length, checked, legacy };
}
function completedStages(j){ return [1,2,3,4].filter(n=>j['stage'+n]&&j['stage'+n]._done).length; }
function jobStatus(j){ if(j.statusOverride) return j.statusOverride; const c=completedStages(j); return c===0?'New':(c<4?'In Progress':'Released'); }
function canManageUsers(u){ return !!u && (u.role==='Administrator' || u.role==='Quality Manager'); }
function isManager(u){ return !!u && ['Supervisor','Quality Manager','Administrator'].includes(u.role); }

const CAPA_SEVERITY = ['Low','Medium','High','Critical'];
const CAPA_STATUS = ['Open','In Progress','Closed'];

/* In-memory login throttle (keyed by username+IP). Resets on restart; the deployment
   is single-writer, so a shared store isn't required. Tunable via config.security. */
const SECCFG = CFG.security || {};
const LOGIN_MAX_FAILS = Number(SECCFG.maxLoginFails) || 5;
const LOGIN_WINDOW_MS = (Number(SECCFG.windowMin) || 15) * 60000;
const LOGIN_LOCK_MS = (Number(SECCFG.lockMin) || 15) * 60000;
const LOGIN_FAILS = new Map();
function loginKeyOf(req, username){ const xf=String(req.headers['x-forwarded-for']||'').split(',')[0].trim(); const ip=xf||(req.socket&&req.socket.remoteAddress)||''; return username+'|'+ip; }
function loginLockedSec(key){ const r=LOGIN_FAILS.get(key); if(r&&r.lockUntil&&Date.now()<r.lockUntil) return Math.ceil((r.lockUntil-Date.now())/1000); return 0; }
function loginRecordFail(key){ const now=Date.now(); let r=LOGIN_FAILS.get(key); if(!r||now-r.first>LOGIN_WINDOW_MS) r={count:0,first:now,lockUntil:0}; r.count++; if(r.count>=LOGIN_MAX_FAILS) r.lockUntil=now+LOGIN_LOCK_MS; LOGIN_FAILS.set(key,r); return r; }
function loginClear(key){ LOGIN_FAILS.delete(key); }

/* Required fields enforced when a stage is marked complete (mirrored on the client). */
const STAGE_REQUIRED = {
  '1': [['date','Date'],['qaOfficer','QA Officer'],['proceed','Proceed With Job'],['materialType','Material Type']],
  '2': [['date','Date'],['qaOfficer','QA Officer']],
  '3': [['date','Date'],['operatorName','Operator'],['startTime','Start Time'],['finishTime','Finish Time']],
  '4': [['date','Date'],['qcName','QC Name'],['statusFinal','Final Release Decision']]
};
function validateComplete(n, d){
  const miss = [];
  (STAGE_REQUIRED[n]||[]).forEach(([k,l])=>{ if(!String((d&&d[k])||'').trim()) miss.push(l); });
  if(n==='2' && !((d.rows||[]).some(r=>String(r.totalMeters||'').trim()||String(r.defect||'').trim()))) miss.push('At least one reel row');
  if(n==='4'){
    if(!((d.checks||[]).some(c=>String(c.time||'').trim()))) miss.push('At least one hourly check');
    if(!(d&&d.signature)) miss.push('Signature');
  }
  return miss;
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
function csvCell(v){ v=(v==null?'':String(v)); if(/^[=+\-@\t\r]/.test(v)) v="'"+v; return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }

/* ---------- API ---------- */
async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
  const seg = parts.slice(1);
  const method = req.method;

  if (seg[0]==='health' && seg[1]==='ready') { const ok = await STORAGE.ready(); return send(res, ok?200:503, { ready:ok, storage:STORAGE.driver }); }
  if (seg[0]==='health') return send(res,200,{ ok:true, org:CFG.orgName, time:new Date().toISOString(), storage:STORAGE.driver });

  if (seg[0]==='login' && method==='POST') {
    const b = await readBody(req);
    if (b.mode==='sso') {
      if(!CFG.sso || !CFG.sso.enabled) return send(res,403,{error:'SSO is disabled'});
      if(b.idToken){ // real Microsoft Entra ID path
        const r = await ENTRA.verifyIdToken(CFG, b.idToken);
        if(!r.ok) return send(res,401,{error:'SSO rejected: '+(r.error||'invalid token')});
        const u = ssoUser(r.claims.email, r.claims.name); audit(u,'login-sso'); return send(res,200,{ token:issueToken(u), user:pubUser(u) });
      }
      if(b.email && !(CFG.sso.tenantId && CFG.sso.clientId)){ // demo fallback only when Entra isn't configured
        const u = verifySso(b.email); if(!u) return send(res,401,{error:'SSO not recognised'}); audit(u,'login-sso-demo'); return send(res,200,{ token:issueToken(u), user:pubUser(u) });
      }
      return send(res,401,{error:'No id_token supplied'});
    }
    const username = String(b.username||'').trim().toLowerCase();
    const key = loginKeyOf(req, username);
    const lock = loginLockedSec(key);
    if (lock) return send(res,429,{error:'Too many failed attempts. Try again in about '+Math.ceil(lock/60)+' min.'}, { 'Retry-After':String(lock) });
    const u = DB.users.find(x=>x.id===username);
    if (!u || !checkPw(u, String(b.password||''))) {
      const r = loginRecordFail(key);
      audit(null,'login-fail','', username+(r.lockUntil?' — locked out':' (attempt '+r.count+')')); saveDB();
      return send(res,401,{error:'Invalid username or password'});
    }
    loginClear(key); audit(u,'login'); return send(res,200,{ token:issueToken(u), user:pubUser(u) });
  }
  if (seg[0]==='config' && method==='GET') return send(res,200,{ orgName:CFG.orgName, sso:{ enabled:!!(CFG.sso&&CFG.sso.enabled), clientId:(CFG.sso&&CFG.sso.clientId)||'', tenantId:(CFG.sso&&CFG.sso.tenantId)||'' } });

  const user = userByToken(req);
  if (!user) return send(res,401,{error:'Not authenticated'});

  if (seg[0]==='me' && seg[1]==='password' && method==='POST') {
    const dbu = DB.users.find(u=>u.id===user.id);
    if(!dbu) return send(res,400,{error:'This account signs in via Microsoft 365 — manage its password in Microsoft.'});
    const b = await readBody(req);
    if(!checkPw(dbu, String(b.current||''))) return send(res,401,{error:'Current password is incorrect'});
    if(String(b.new||'').length<6) return send(res,400,{error:'New password must be at least 6 characters'});
    dbu.salt=crypto.randomBytes(16).toString('hex'); dbu.passHash=hashPw(String(b.new),dbu.salt); audit(user,'change-password'); saveDB();
    return send(res,200,{ ok:true });
  }
  if (seg[0]==='me') return send(res,200,{ user:pubUser(user) });

  if (seg[0]==='jobs' && method==='GET' && !seg[1]) {
    return send(res,200, DB.jobs.map(j=>({ jobNo:j.jobNo, product:j.product, customer:j.customer, machine:j.machine, created:j.created, status:jobStatus(j), completed:completedStages(j) })));
  }
  if (seg[0]==='jobs' && method==='GET' && seg[1]) {
    const j = DB.jobs.find(x=>x.jobNo.toLowerCase()===decodeURIComponent(seg[1]).toLowerCase());
    return j ? send(res,200,j) : send(res,404,{error:'Job not found'});
  }
  if (seg[0]==='jobs' && method==='POST' && !seg[1]) {
    const b = await readBody(req);
    if(!b.jobNo||!b.machine) return send(res,400,{error:'jobNo and machine required'});
    if(DB.jobs.find(x=>x.jobNo.toLowerCase()===b.jobNo.toLowerCase())) return send(res,409,{error:'Job already exists'});
    const job={ jobNo:b.jobNo, machine:b.machine, customer:b.customer||'StarKist', product:b.product||'', description:b.description||'', created:new Date().toISOString().slice(0,10), stage1:{_done:false},stage2:{_done:false},stage3:{_done:false},stage4:{_done:false} };
    DB.jobs.unshift(job); audit(user,'create-job',job.jobNo); saveDB(); return send(res,200,job);
  }
  if (seg[0]==='jobs' && seg[1] && seg[2]==='clone' && method==='POST') {
    const src = DB.jobs.find(x=>x.jobNo.toLowerCase()===decodeURIComponent(seg[1]).toLowerCase());
    if(!src) return send(res,404,{error:'Source job not found'});
    const b=await readBody(req); const newNo=String(b.jobNo||'').trim();
    if(!newNo) return send(res,400,{error:'New Job # required'});
    if(DB.jobs.find(x=>x.jobNo.toLowerCase()===newNo.toLowerCase())) return send(res,409,{error:'A job with that number already exists'});
    const job={ jobNo:newNo, machine:src.machine, customer:src.customer, product:src.product, description:src.description, created:new Date().toISOString().slice(0,10), stage1:{_done:false},stage2:{_done:false},stage3:{_done:false},stage4:{_done:false} };
    DB.jobs.unshift(job); audit(user,'clone-job',newNo,'from '+src.jobNo); saveDB(); return send(res,200,job);
  }
  if (seg[0]==='jobs' && seg[1] && !seg[2] && method==='PUT') {
    if(!isManager(user)) return send(res,403,{error:'Only a Supervisor, Quality Manager or Administrator can edit job details'});
    const j = DB.jobs.find(x=>x.jobNo.toLowerCase()===decodeURIComponent(seg[1]).toLowerCase());
    if(!j) return send(res,404,{error:'Job not found'});
    const b=await readBody(req);
    ['customer','product','description'].forEach(k=>{ if(typeof b[k]==='string') j[k]=b[k]; });
    if(b.machine && DB.masterdata.machines[b.machine] && completedStages(j)===0) j.machine=b.machine;
    audit(user,'edit-job',j.jobNo); saveDB(); return send(res,200,j);
  }
  if (seg[0]==='jobs' && seg[1] && !seg[2] && method==='DELETE') {
    if(!canManageUsers(user)) return send(res,403,{error:'Only a Quality Manager or Administrator can delete jobs'});
    const i = DB.jobs.findIndex(x=>x.jobNo.toLowerCase()===decodeURIComponent(seg[1]).toLowerCase());
    if(i<0) return send(res,404,{error:'Job not found'});
    const removed=DB.jobs.splice(i,1)[0]; audit(user,'delete-job',removed.jobNo); saveDB(); return send(res,200,{ ok:true });
  }
  if (seg[0]==='jobs' && seg[2]==='stage' && method==='PUT') {
    const j = DB.jobs.find(x=>x.jobNo.toLowerCase()===decodeURIComponent(seg[1]).toLowerCase());
    if(!j) return send(res,404,{error:'Job not found'});
    const n = seg[3]; const b = await readBody(req);
    if(b.data && b.data._done){
      const prev = Number(n)-1;
      if(prev>=1 && !(j['stage'+prev] && j['stage'+prev]._done)) return send(res,409,{error:'Complete Stage '+prev+' before completing Stage '+n});
      const miss = validateComplete(n, b.data);
      if(miss.length) return send(res,400,{error:'Cannot mark complete — missing: '+miss.join(', '), missing:miss});
    }
    j['stage'+n] = b.data || {};
    if(n==='4' && b.data && b.data._done && b.data.statusFinal){ j.statusOverride = b.data.statusFinal==='Released'?'Released':'Hold'; if(j.statusOverride!=='Released'){ alertAll('Job '+j.jobNo+' set to '+j.statusOverride,'Stage 4 decision: '+b.data.statusFinal+' (qty '+(b.data.rejectedQty||'?')+')'); } }
    audit(user,'save-stage'+n,j.jobNo, b.data&&b.data._done?'completed':'draft'); saveDB(); return send(res,200,j);
  }
  if (seg[0]==='jobs' && seg[2]==='hold' && method==='POST') {
    const j = DB.jobs.find(x=>x.jobNo.toLowerCase()===decodeURIComponent(seg[1]).toLowerCase());
    if(!j) return send(res,404,{error:'Job not found'}); const b=await readBody(req);
    j.statusOverride='Hold'; audit(user,'hold',j.jobNo,b.reason||''); alertAll('Job '+j.jobNo+' placed on HOLD', (b.reason||'')+' by '+user.name); saveDB(); return send(res,200,j);
  }

  if (seg[0]==='upload' && method==='POST') { // {dataUrl, name}
    const b = await readBody(req); const m=/^data:(image\/\w+);base64,(.+)$/.exec(b.dataUrl||'');
    if(!m) return send(res,400,{error:'Invalid image data'});
    const ext = m[1]==='image/png'?'.png':'.jpg'; const fn = Date.now()+'-'+crypto.randomBytes(4).toString('hex')+ext;
    fs.writeFileSync(path.join(UP_DIR,fn), Buffer.from(m[2],'base64')); audit(user,'upload-photo','',fn);
    return send(res,200,{ url:'/uploads/'+fn });
  }

  if (seg[0]==='masterdata' && method==='GET') return send(res,200, DB.masterdata);
  if (seg[0]==='masterdata' && method==='PUT') { if(!isManager(user)) return send(res,403,{error:'Only a Supervisor, Quality Manager or Administrator can change master data'}); const b=await readBody(req); DB.masterdata=Object.assign(DB.masterdata,b); audit(user,'update-masterdata'); saveDB(); return send(res,200,DB.masterdata); }

  if (seg[0]==='admin' && seg[1]==='users') {
    const uid = seg[2] ? decodeURIComponent(seg[2]).toLowerCase() : null;
    if(method==='GET'){ if(!isManager(user)) return send(res,403,{error:'Not permitted'}); return send(res,200, DB.users.map(pubUser)); }
    if(!canManageUsers(user)) return send(res,403,{error:'Only a Quality Manager or Administrator can manage users'});
    if(method==='POST'){
      const b=await readBody(req);
      const id=String(b.id||'').trim().toLowerCase().replace(/[^a-z0-9._-]/g,'');
      if(!id||!String(b.name||'').trim()||!String(b.role||'').trim()) return send(res,400,{error:'User id, name and role are required'});
      if(String(b.password||'').length<6) return send(res,400,{error:'Password must be at least 6 characters'});
      if(DB.users.find(u=>u.id===id)) return send(res,409,{error:'A user with that id already exists'});
      DB.users.push(mkUser(id, String(b.name).trim(), String(b.role).trim(), String(b.password))); audit(user,'create-user','',id); saveDB();
      return send(res,200,{ ok:true, users:DB.users.map(pubUser) });
    }
    if(uid && method==='PUT'){
      const b=await readBody(req); const u=DB.users.find(x=>x.id===uid); if(!u) return send(res,404,{error:'User not found'});
      if(String(b.name||'').trim()) u.name=String(b.name).trim();
      if(String(b.role||'').trim()) u.role=String(b.role).trim();
      if(b.password){ if(String(b.password).length<6) return send(res,400,{error:'Password must be at least 6 characters'}); u.salt=crypto.randomBytes(16).toString('hex'); u.passHash=hashPw(String(b.password),u.salt); }
      audit(user,'update-user','',uid); saveDB(); return send(res,200,{ ok:true, users:DB.users.map(pubUser) });
    }
    if(uid && method==='DELETE'){
      if(uid===user.id) return send(res,400,{error:'You cannot delete your own account'});
      const i=DB.users.findIndex(x=>x.id===uid); if(i<0) return send(res,404,{error:'User not found'});
      if(DB.users.length<=1) return send(res,400,{error:'Cannot delete the last remaining user'});
      DB.users.splice(i,1); audit(user,'delete-user','',uid); saveDB(); return send(res,200,{ ok:true, users:DB.users.map(pubUser) });
    }
    return send(res,405,{error:'Method not allowed'});
  }

  if (seg[0]==='admin' && seg[1]==='backups' && method==='GET') {
    if(!isManager(user)) return send(res,403,{error:'Not permitted'});
    const dir = process.env.BACKUP_DIR || path.join(DATA_DIR,'backups');
    try{
      if(!fs.existsSync(dir)) return send(res,200,{ dir, driver:STORAGE.driver, count:0, files:[], latest:null });
      const walk=(d)=>{ let out=[]; for(const e of fs.readdirSync(d,{withFileTypes:true})){ if(e.isSymbolicLink()) continue; const p=path.join(d,e.name); if(e.isDirectory()) out=out.concat(walk(p)); else out.push(p); } return out; };
      const files=walk(dir).filter(f=>/\.(sql|gz|json|dump)$/i.test(f)).map(f=>{ const s=fs.statSync(f); return { name:path.basename(f), size:s.size, mtime:s.mtimeMs }; }).sort((a,b)=>b.mtime-a.mtime);
      const l=files[0];
      const list=files.slice(0,40).map(f=>({ name:f.name, sizeKB:Math.round(f.size/1024), ageHours:Math.round((Date.now()-f.mtime)/3600000) }));
      return send(res,200,{ dir, driver:STORAGE.driver, count:files.length, files:list, latest: l ? { name:l.name, sizeKB:Math.round(l.size/1024), ageHours:Math.round((Date.now()-l.mtime)/3600000) } : null });
    }catch(e){ return send(res,200,{ dir, error:String(e.message||e) }); }
  }

  if (seg[0]==='admin' && seg[1]==='restore' && method==='POST') {
    if(user.role!=='Administrator') return send(res,403,{error:'Only an Administrator can restore from a backup'});
    if(STORAGE.driver!=='json') return send(res,400,{error:'Restore is available for JSON file storage only (current driver: '+STORAGE.driver+').'});
    const b=await readBody(req); const name=String(b.name||'');
    if(!/^db-\d{8}-\d{6}\.json$/.test(name)) return send(res,400,{error:'Invalid backup name'});
    const dir = process.env.BACKUP_DIR || path.join(DATA_DIR,'backups');
    const src = path.join(dir, name);
    if(!fs.existsSync(src)) return send(res,404,{error:'Backup not found'});
    let restored; try{ restored=JSON.parse(fs.readFileSync(src,'utf8')); }catch(e){ return send(res,400,{error:'Backup file is not valid JSON'}); }
    if(!restored || !Array.isArray(restored.users) || !Array.isArray(restored.jobs)) return send(res,400,{error:'That file does not look like a Golden QA database'});
    BACKUP.backupOnce({ dbFile: DB_FILE, backupDir: dir }); // safety snapshot of current state before overwriting
    DB = restored;
    if(!Array.isArray(DB.capas)) DB.capas=[]; if(!Array.isArray(DB.audit)) DB.audit=[]; if(typeof DB.auditAnchor!=='string') DB.auditAnchor='';
    audit(user,'restore-backup','', name); await saveDB();
    return send(res,200,{ ok:true, restored:name, users:DB.users.length, jobs:DB.jobs.length, capas:DB.capas.length });
  }

  if (seg[0]==='audit' && seg[1]==='verify' && method==='GET') { if(!isManager(user)) return send(res,403,{error:'Not permitted'}); return send(res,200, verifyAuditChain()); }
  if (seg[0]==='audit' && method==='GET') return send(res,200, DB.audit.slice(-300).reverse());

  if (seg[0]==='capas' && method==='GET' && !seg[1]) {
    let list = (DB.capas||[]).slice();
    const fs_=url.searchParams.get('status'); if(fs_) list=list.filter(c=>c.status===fs_);
    const fj=url.searchParams.get('jobNo'); if(fj) list=list.filter(c=>String(c.jobNo||'').toLowerCase()===fj.toLowerCase());
    return send(res,200, list.reverse());
  }
  if (seg[0]==='capas' && method==='POST' && !seg[1]) {
    if(!isManager(user)) return send(res,403,{error:'Only a Supervisor, Quality Manager or Administrator can raise a CAPA'});
    const b=await readBody(req);
    if(!String(b.title||'').trim()) return send(res,400,{error:'A CAPA title is required'});
    const now=new Date().toISOString();
    const c={ id:'CAPA-'+Date.now().toString(36).toUpperCase(), jobNo:String(b.jobNo||'').trim(), title:String(b.title).trim(),
      source:String(b.source||'').trim(), severity:CAPA_SEVERITY.includes(b.severity)?b.severity:'Medium', status:'Open',
      rootCause:String(b.rootCause||''), correctiveAction:String(b.correctiveAction||''), preventiveAction:String(b.preventiveAction||''),
      owner:String(b.owner||'').trim(), dueDate:String(b.dueDate||'').trim(), createdBy:user.id, createdAt:now, updatedAt:now, closedBy:'', closedAt:'' };
    DB.capas.push(c); audit(user,'capa-open',c.jobNo,c.id+': '+c.title); saveDB(); return send(res,200,c);
  }
  if (seg[0]==='capas' && seg[1] && method==='PUT') {
    if(!isManager(user)) return send(res,403,{error:'Only a Supervisor, Quality Manager or Administrator can update a CAPA'});
    const c=(DB.capas||[]).find(x=>x.id===decodeURIComponent(seg[1])); if(!c) return send(res,404,{error:'CAPA not found'});
    const b=await readBody(req);
    ['title','source','rootCause','correctiveAction','preventiveAction','owner','dueDate'].forEach(k=>{ if(typeof b[k]==='string') c[k]=b[k]; });
    if(b.severity && CAPA_SEVERITY.includes(b.severity)) c.severity=b.severity;
    if(b.status && CAPA_STATUS.includes(b.status)){
      const wasClosed=c.status==='Closed'; c.status=b.status;
      if(c.status==='Closed' && !wasClosed){ c.closedBy=user.id; c.closedAt=new Date().toISOString(); }
      if(c.status!=='Closed'){ c.closedBy=''; c.closedAt=''; }
    }
    c.updatedAt=new Date().toISOString();
    audit(user, c.status==='Closed'?'capa-close':'capa-update', c.jobNo, c.id); saveDB(); return send(res,200,c);
  }

  if (seg[0]==='bc' && seg[1]==='job' && method==='GET') { const r = await BC.lookupJob(CFG, decodeURIComponent(seg[2]||'')); return send(res, r.error?502:200, r); }

  if (seg[0]==='avt-import' && method==='POST') { const b=await readBody(req); const r=AVT.parse(b.csv||''); return send(res,200,r); }

  if (seg[0]==='analytics' && method==='GET') return send(res,200, analytics({ from:url.searchParams.get('from')||'', to:url.searchParams.get('to')||'', shift:url.searchParams.get('shift')||'' }));

  if (seg[0]==='digest' && method==='GET' && !seg[1]) return send(res,200, buildDigest());
  if (seg[0]==='digest' && seg[1]==='send' && method==='POST') {
    if(!isManager(user)) return send(res,403,{error:'Not permitted'});
    const d=buildDigest(); const subject=CFG.orgName+' — QA Digest '+d.generated.slice(0,10);
    const r=await EMAIL.send(CFG, { subject, text:digestText(d), html:digestHtml(d) });
    try{ NOTIFY.alert(CFG, subject, digestText(d)); }catch(e){}
    audit(user,'send-digest','', r.ok?'emailed':('email '+(r.error||'failed')));
    return send(res,200,{ ok:!!r.ok, error:r.error||'', emailed:!!r.ok, teams:!!(CFG.notify&&CFG.notify.teamsWebhookUrl) });
  }

  if (seg[0]==='export' && seg[1]==='jobs.csv' && method==='GET') {
    const ml=m=>(DB.masterdata.machines && DB.masterdata.machines[m] && DB.masterdata.machines[m].label) || m;
    const lines=[['Job #','Customer','Product','Machine','Created','Status','Stages Complete','S1 Date','S1 QA Officer','S1 Proceed','S2 Date','S3 Date','S4 Date','S4 Decision','S4 Rejected Qty','S4 QC']];
    DB.jobs.forEach(j=>{ const s1=j.stage1||{}, s2=j.stage2||{}, s3=j.stage3||{}, s4=j.stage4||{};
      lines.push([ j.jobNo, j.customer, j.product, ml(j.machine), j.created, jobStatus(j), completedStages(j),
        s1._done?s1.date:'', s1._done?s1.qaOfficer:'', s1._done?s1.proceed:'',
        s2._done?s2.date:'', s3._done?s3.date:'', s4._done?s4.date:'',
        s4._done?(s4.statusFinal||''):'', s4._done?(s4.rejectedQty||''):'', s4._done?(s4.qcName||''):'' ]); });
    const csv='﻿'+lines.map(r=>r.map(csvCell).join(',')).join('\r\n');
    audit(user,'export-csv','', DB.jobs.length+' jobs');
    res.writeHead(200,{ 'Content-Type':'text/csv; charset=utf-8', 'Content-Disposition':'attachment; filename="golden-qa-jobs.csv"', 'Cache-Control':'no-store' });
    return res.end(csv);
  }

  return send(res,404,{error:'Unknown API route'});
}
function pubUser(u){ return { id:u.id, name:u.name, role:u.role }; }
/* Resolve a verified SSO e-mail to a user: known users keep their role; unknown domain
   users get least-privilege QA Officer (carried in the signed token, not persisted to DB). */
function ssoUser(email, name){ const id=String(email).split('@')[0].toLowerCase(); return DB.users.find(u=>u.id===id) || { id, name:name||email.split('@')[0], role:'QA Officer' }; }
function verifySso(email){ if(!email) return null; const dom='@'+CFG.sso.allowedDomain; if(!String(email).toLowerCase().endsWith(dom)) return null; return ssoUser(email); }

function analytics(opts){
  opts=opts||{}; const from=opts.from||'', to=opts.to||'', shift=String(opts.shift||'');
  const inRange=j=>{ const d=j.created||''; if(from && d<from) return false; if(to && d>to) return false; return true; };
  const inShift=j=>{ if(!shift) return true; return [j.stage2&&j.stage2.shift, j.stage4&&j.stage4.shift].some(s=>String(s||'').toLowerCase()===shift.toLowerCase()); };
  const jobs=DB.jobs.filter(j=>inRange(j)&&inShift(j));
  const defects={}, wasteByMachine={}, downtime={Setup:0,Material:0,Windup:0,Damage:0,Mechanical:0,Electrical:0,Others:0}, trendMap={};
  let released=0, total=jobs.length, rejectedJobs=0;
  jobs.forEach(j=>{
    const st=jobStatus(j);
    if(st==='Released') released++;
    const s2=j.stage2||{}; (s2.rows||[]).forEach(r=>{ if(r.defect){ defects[r.defect]=(defects[r.defect]||0)+(parseFloat(r.weightKg)||0.0); } });
    const s3=j.stage3||{}; const w=(s3.rolls||[]).reduce((a,r)=>a+(parseFloat(r.wasteKg)||0),0); wasteByMachine[j.machine]=(wasteByMachine[j.machine]||0)+w;
    downtime.Setup+=parseFloat(s3.setupHours)||0; downtime.Material+=parseFloat(s3.dtMaterial)||0; downtime.Windup+=parseFloat(s3.dtWindup)||0; downtime.Damage+=parseFloat(s3.dtDamage)||0; downtime.Mechanical+=parseFloat(s3.dtMechanical)||0; downtime.Electrical+=parseFloat(s3.dtElectrical)||0; downtime.Others+=parseFloat(s3.dtOthers)||0;
    const s4=j.stage4||{}; if(s4.statusFinal && s4.statusFinal!=='Released') rejectedJobs++;
    const day=j.created||'unknown'; const t=trendMap[day]||(trendMap[day]={date:day,jobs:0,released:0,held:0}); t.jobs++; if(st==='Released')t.released++; if(st==='Hold'||st==='Rejected')t.held++;
  });
  const fpy = total? Math.round((released/total)*100):0;
  const trend = Object.values(trendMap).sort((a,b)=> a.date<b.date?-1:1);
  const openCapas = (DB.capas||[]).filter(c=>c.status!=='Closed').length;
  return { defects, wasteByMachine, downtime, trend, range:{from,to,shift}, kpis:{ total, released, rejectedJobs, firstPassYield:fpy, openCapas } };
}

/* ---------- manager digest (emailed / Teams) ---------- */
function buildDigest(){
  const a=analytics();
  const holds=DB.jobs.filter(j=>{ const s=jobStatus(j); return s==='Hold'||s==='Rejected'; }).map(j=>({ jobNo:j.jobNo, status:jobStatus(j), product:j.product }));
  const inProgress=DB.jobs.filter(j=>jobStatus(j)==='In Progress').length;
  const topDefects=Object.entries(a.defects).sort((x,y)=>y[1]-x[1]).slice(0,5).map(([k,v])=>({ defect:k, kg:Math.round(v*100)/100 }));
  return { org:CFG.orgName, generated:new Date().toISOString(), kpis:a.kpis, inProgress, holds, topDefects };
}
function digestText(d){
  return [ d.org+' — QA Digest', 'Generated: '+d.generated, '',
    'Jobs: '+d.kpis.total+'   Released: '+d.kpis.released+'   Hold/Reject: '+d.kpis.rejectedJobs+'   In progress: '+d.inProgress,
    'First-pass yield: '+d.kpis.firstPassYield+'%', '',
    'On hold / rejected: '+(d.holds.length?d.holds.map(h=>h.jobNo+' ('+h.status+')').join(', '):'none'), '',
    'Top defects (kg): '+(d.topDefects.length?d.topDefects.map(t=>t.defect+' '+t.kg).join(', '):'none') ].join('\n');
}
function digestHtml(d){
  const e=s=>String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const kpi=(n,l)=>'<td style="padding:8px 18px;text-align:center"><div style="font-size:26px;font-weight:800;color:#0e2a47">'+n+'</div><div style="font-size:12px;color:#5b6b80;text-transform:uppercase">'+l+'</div></td>';
  return '<div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937">'+
    '<h2 style="color:#0e2a47;margin:0 0 2px">'+e(d.org)+' — QA Digest</h2>'+
    '<p style="color:#5b6b80;margin:0 0 14px">Generated '+e(d.generated)+'</p>'+
    '<table style="border-collapse:collapse;border:1px solid #dde5ee"><tr>'+kpi(d.kpis.total,'Jobs')+kpi(d.kpis.released,'Released')+kpi(d.kpis.rejectedJobs,'Hold/Reject')+kpi(d.inProgress,'In&nbsp;Progress')+kpi(d.kpis.firstPassYield+'%','First-pass')+'</tr></table>'+
    '<h3 style="color:#0e2a47">On hold / rejected</h3><p>'+(d.holds.length?d.holds.map(h=>e(h.jobNo)+' <b>('+e(h.status)+')</b>').join(', '):'None')+'</p>'+
    '<h3 style="color:#0e2a47">Top defects (kg)</h3><p>'+(d.topDefects.length?d.topDefects.map(t=>e(t.defect)+' — '+t.kg).join('<br>'):'None')+'</p></div>';
}

/* ---------- HTTP server ---------- */
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
const HOST = process.env.HOST || CFG.host;

let _shuttingDown = false;
function shutdown(sig){ if(_shuttingDown) return; _shuttingDown=true; console.log('Shutting down ('+sig+')…'); server.close(async ()=>{ try{ await _saveChain; }catch(e){} try{ await Promise.resolve(STORAGE.close && STORAGE.close()); }catch(e){} process.exit(0); }); setTimeout(()=>process.exit(0), 8000).unref(); }
process.on('SIGTERM', ()=>shutdown('SIGTERM'));
process.on('SIGINT', ()=>shutdown('SIGINT'));

(async ()=>{
  try { await loadDB(); }
  catch(e){ console.error('FATAL: database init failed —', e && e.message); process.exit(1); }
  if (STORAGE.driver === 'json') BACKUP.scheduleBackups({ dbFile: DB_FILE, backupDir: path.join(DATA_DIR,'backups'), intervalMin:(CFG.backup&&CFG.backup.intervalMin)||180, keep:(CFG.backup&&CFG.backup.keep)||48 });
  server.listen(PORT, HOST, ()=> console.log('Golden QA server on http://'+HOST+':'+PORT+'  ('+CFG.orgName+')  [storage: '+STORAGE.driver+']'));
})();

module.exports = { server };
