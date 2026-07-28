(function () {
  const cfg = window.AUTH_CONFIG || {}, key = 'lamunlai-current-user';
  const user = () => JSON.parse(localStorage.getItem(key) || 'null');
  const save = x => localStorage.setItem(key, JSON.stringify(x));
  window.signOut = () => { localStorage.removeItem(key); location.href = 'login.html'; };
  window.requireRole = role => { const x = user(); if (!x || (role && x.role !== role)) { location.replace('login.html'); return null; } return x; };
  window.demoLogin = role => { save({name:role==='admin'?'ผู้ดูแลร้าน':'คุณละมุน',email:role+'@demo.local',role}); location.href=role==='admin'?'admin.html':'account.html'; };
  window.handleGoogleCredential = r => { const p=JSON.parse(atob(r.credential.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); const role=(cfg.adminEmails||[]).map(v=>v.toLowerCase()).includes(p.email.toLowerCase())?'admin':'user'; save({name:p.name,email:p.email,picture:p.picture,role}); location.href=role==='admin'?'admin.html':'account.html'; };
  addEventListener('load',()=>{ const t=document.querySelector('#google-button'); if(!t)return; if(cfg.googleClientId&&!cfg.googleClientId.startsWith('PUT_')&&window.google?.accounts?.id){google.accounts.id.initialize({client_id:cfg.googleClientId,callback:handleGoogleCredential});google.accounts.id.renderButton(t,{theme:'outline',size:'large',width:320,text:'continue_with'});}else{t.innerHTML='<button class="google-disabled" type="button">G&nbsp;&nbsp;เข้าสู่ระบบด้วย Google</button>';document.querySelector('#auth-status').textContent='ใส่ Google Client ID ใน auth-config.js เพื่อเปิดใช้งาน';}});
})();
