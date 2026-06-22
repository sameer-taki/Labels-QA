'use strict';
/* Rotating JSON-database backups. Zero deps (fs/path only). Copies data/db.json into
   data/backups/db-<YYYYMMDD-HHMMSS>.json on an interval and prunes to the newest 'keep'.
   Never throws: every fs op is guarded so a backup failure can't crash the server. */
const fs = require('fs'); const path = require('path');

function pad(n){ return n<10 ? '0'+n : ''+n; }
function stamp(d){ return ''+d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'-'+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds()); }

function backupOnce(opts){
  opts=opts||{}; const dbFile=opts.dbFile; const backupDir=opts.backupDir;
  try{
    if(!dbFile||!backupDir) return null;
    if(!fs.existsSync(dbFile)) return null; // nothing to back up yet -> no-op
    fs.mkdirSync(backupDir,{recursive:true});
    const dest=path.join(backupDir,'db-'+stamp(new Date())+'.json');
    fs.copyFileSync(dbFile,dest);
    return dest;
  }catch(e){ console.warn('BACKUP: backupOnce failed -', e.message); return null; }
}

function prune(backupDir, keep){
  try{
    if(!backupDir||!fs.existsSync(backupDir)) return;
    const k=(typeof keep==='number'&&keep>0)?keep:48;
    const files=fs.readdirSync(backupDir).filter(f=>/^db-\d{8}-\d{6}\.json$/.test(f)).sort(); // chronological by name
    for(let i=0;i<files.length-k;i++){ try{ fs.unlinkSync(path.join(backupDir,files[i])); }catch(e){ console.warn('BACKUP: unlink failed -', e.message); } }
  }catch(e){ console.warn('BACKUP: prune failed -', e.message); }
}

function scheduleBackups(opts){
  opts=opts||{}; const intervalMin=(typeof opts.intervalMin==='number'&&opts.intervalMin>0)?opts.intervalMin:180; const keep=(typeof opts.keep==='number'&&opts.keep>0)?opts.keep:48;
  const run=()=>{ backupOnce(opts); prune(opts.backupDir, keep); };
  run(); // immediate first backup
  const handle=setInterval(run, intervalMin*60000);
  if(handle&&typeof handle.unref==='function') handle.unref(); // don't keep the event loop alive on its own
  console.log('BACKUP: scheduled every '+intervalMin+'min, keeping newest '+keep+' in '+(opts.backupDir||'?'));
  return handle;
}

module.exports = { scheduleBackups, backupOnce };
