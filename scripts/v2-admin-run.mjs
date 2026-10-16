// Telefon üzerinden GitHub Actions ile güvenli v2 test görevi çalıştırma.
const task=process.env.SPORNRD_V2_TASK;
const routes={bootstrap:'/api/v2/admin/bootstrap',ingest:'/api/v2/admin/ingest',discover:'/api/v2/admin/discover'};
const base=String(process.env.SPORNRD_V2_WORKER_URL||'').replace(/\/+$/,'');
const token=process.env.SPORNRD_V2_ADMIN_TOKEN||'';
if(!routes[task]||!/^https:\/\/[a-z\d.-]+\.workers\.dev$/i.test(base)||token.length<24){console.error('Geçersiz görevi, Worker adresi veya yönetim secretı.');process.exit(1);}
const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),65000);
try{
 const res=await fetch(base+routes[task],{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}',signal:ctrl.signal});
 const data=await res.json();
 console.log(JSON.stringify({task,httpStatus:res.status,result:data},null,2));
 if(!res.ok||!data.ok)process.exitCode=1;
}catch(e){console.error('İşlem başarısız:',e.message);process.exitCode=1;}finally{clearTimeout(timeout);}
