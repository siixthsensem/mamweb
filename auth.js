(function () {
  const config=window.AUTH_CONFIG||{},sessionKey='lamunlai-current-user',usersKey='lamunlai-users';
  const getUser=()=>JSON.parse(localStorage.getItem(sessionKey)||'null');
  const getUsers=()=>JSON.parse(localStorage.getItem(usersKey)||'[]');
  const setUser=user=>localStorage.setItem(sessionKey,JSON.stringify(user));
  const setStatus=msg=>{const el=document.getElementById('auth-status');if(el)el.textContent=msg};
  window.signOut=()=>{localStorage.removeItem(sessionKey);location.href='login.html'};
  window.requireRole=role=>{const user=getUser();if(!user||(role&&user.role!==role)){location.replace('login.html');return null}return user};
  window.loginWithPassword=function(event){event.preventDefault();const form=event.currentTarget,username=form.username.value.trim(),password=form.password.value,role=form.role.value;
    if(role==='admin'){if(username==='adminp'&&password==='11223344'){setUser({name:'ผู้ดูแลร้าน',email:'adminp',role:'admin'});location.href='admin.html'}else setStatus('ไอดีหรือรหัสผ่านแอดมินไม่ถูกต้อง');return}
    const account=getUsers().find(x=>x.email.toLowerCase()===username.toLowerCase()&&x.password===password);if(!account){setStatus('ไม่พบผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');return}setUser({name:account.name,email:account.email,role:'user'});location.href='account.html';
  };
  window.registerUser=function(event){event.preventDefault();const form=event.currentTarget,name=form.name.value.trim(),email=form.email.value.trim().toLowerCase(),password=form.password.value;
    if(password.length<6){setStatus('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');return}const users=getUsers();if(users.some(x=>x.email===email)){setStatus('อีเมลนี้ถูกใช้งานแล้ว');return}users.push({name,email,password});localStorage.setItem(usersKey,JSON.stringify(users));setUser({name,email,role:'user'});location.href='account.html';
  };
  window.handleGoogleCredential=function(response){const p=JSON.parse(atob(response.credential.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))),role=(config.adminEmails||[]).map(x=>x.toLowerCase()).includes(p.email.toLowerCase())?'admin':'user';setUser({name:p.name,email:p.email,picture:p.picture,role});location.href=role==='admin'?'admin.html':'account.html'};
  addEventListener('load',()=>{const target=document.getElementById('google-button');if(!target)return;if(config.googleClientId&&!config.googleClientId.startsWith('PUT_')&&window.google?.accounts?.id){google.accounts.id.initialize({client_id:config.googleClientId,callback:handleGoogleCredential});google.accounts.id.renderButton(target,{theme:'outline',size:'large',width:320,text:'continue_with'});}else target.style.display='none'});
})();
