/* I165 R63: push genérico. Não instala cache nem altera fontes ou calendários. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:'AIzaSyAyvxHHInEQMpcNHKY__lj3T2G5cikGoyw',authDomain:'get-started-4956d.firebaseapp.com',projectId:'get-started-4956d',storageBucket:'get-started-4956d.firebasestorage.app',messagingSenderId:'27813235721',appId:'1:27813235721:web:38c8e840153e2ae3853cd8'});
const VERSAO_SERVICO_AVISOS_I171='get-i171-ativacao-explicita-r86-v1';
self.addEventListener('message',event=>{
 let origem;try{origem=new URL(event.source?.url);}catch{return;}
 if(origem.origin!==self.location.origin||origem.pathname!=='/escritorio.html'||event.origin&&event.origin!==self.location.origin)return;
 const d=event.data;if(!d||typeof d!=='object'||Array.isArray(d))return;
 if(d.tipo==='conferir_versao_avisos_i171'&&Object.keys(d).length===2&&typeof d.nonce==='string'&&/^sw_i171_[0-9_]+$/.test(d.nonce)&&d.nonce.length<=100){event.ports?.[0]?.postMessage({tipo:'versao_avisos_i171',nonce:d.nonce,versao:VERSAO_SERVICO_AVISOS_I171});return;}
 if(d.tipo==='ativar_versao_avisos_i171'&&Object.keys(d).length===2&&d.versao===VERSAO_SERVICO_AVISOS_I171)event.waitUntil(self.skipWaiting());
});
function alvoAvisoI165(link,id){
 if(typeof id!=='string'||!/^[A-Za-z0-9_-]{12,160}$/.test(id))return null;
 try{const u=new URL(link,self.location.origin);if(u.origin!==self.location.origin||u.pathname!=='/escritorio.html'||u.searchParams.get('avisoI165')!==id||u.username||u.password)return null;const seguro=new URL('/escritorio.html',self.location.origin);seguro.searchParams.set('avisoI165',id);return seguro;}catch{return null;}
}
function notificarJanelaI165(c,id){
 if(typeof MessageChannel!=='function'){c.postMessage({tipo:'abrir_aviso_i165',id});return Promise.resolve(true);}
 return new Promise(resolve=>{const canal=new MessageChannel();let fim=false;const concluir=v=>{if(fim)return;fim=true;clearTimeout(timer);canal.port1.close();resolve(v);};const timer=setTimeout(()=>concluir(false),1500);canal.port1.onmessage=e=>{if(e.data?.recebido===true)concluir(true);};try{c.postMessage({tipo:'abrir_aviso_i165',id},[canal.port2]);}catch{concluir(false);}});
}
self.addEventListener('notificationclick',event=>{
 event.notification.close();let u;try{u=new URL(event.notification.data?.link);}catch{return;}
 const id=u.searchParams.get('avisoI165');u=alvoAvisoI165(u.href,id);if(!u)return;
 event.waitUntil((async()=>{const janelas=await clients.matchAll({type:'window',includeUncontrolled:true});const atual=janelas.find(c=>{try{const x=new URL(c.url);return x.origin===u.origin&&x.pathname==='/escritorio.html';}catch{return false;}});
  if(atual){await atual.focus();const recebido=await notificarJanelaI165(atual,id);if(!recebido&&typeof atual.navigate==='function')await atual.navigate(u.href);return;}
  await clients.openWindow(u.href);
 })());
});
firebase.messaging().onBackgroundMessage(async p=>{
 if(p?.data?.tipo==='teste_dispositivo_i165'){
  const id=p.data.testeId;if(typeof id!=='string'||!/^[A-Za-z0-9_-]{12,100}$/.test(id))return;
  await self.registration.showNotification('Get · Seu teste de aviso',{body:'Este é o teste enviado pelo servidor que você pediu. Volte ao site para confirmar se viu.',tag:'i165_teste_servidor_'+id});return;
 }
 const u=alvoAvisoI165(p?.data?.link,p?.data?.id);if(!u)return;
 // O payload não comprova destinatário. A página relê o aviso no Google atual.
 await self.registration.showNotification('Get · Conteúdos',{body:'Tem uma ação de conteúdo para você conferir no sistema.',tag:'i165_'+p.data.id,data:{link:u.href}});
});
