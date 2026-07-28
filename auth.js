(function(){
  const status=message=>{const el=document.getElementById('auth-status');if(el)el.textContent=message};
  const client=async()=>window.supabaseReady;
  async function profileFor(user){const db=await client();const {data}=await db.from('profiles').select('display_name,role,avatar_url,phone,address,birth_date').eq('id',user.id).single();return data||{display_name:user.email,role:'customer'}}
  async function redirectUser(user){const profile=await profileFor(user);location.href=profile.role==='admin'?'admin.html':'account.html'}
  window.signOut=async()=>{const db=await client();await db.auth.signOut();location.href='login.html'};
  window.requireRole=async role=>{const db=await client();const {data:{user}}=await db.auth.getUser();if(!user){location.replace('login.html');return null}const profile=await profileFor(user);if(role&&profile.role!==role){location.replace('index.html');return null}return {user,profile}};
  window.loginWithPassword=async event=>{event.preventDefault();const form=event.currentTarget,db=await client();status('กำลังเข้าสู่ระบบ...');const {data,error}=await db.auth.signInWithPassword({email:form.email.value.trim(),password:form.password.value});if(error){status(error.message==='Invalid login credentials'?'อีเมลหรือรหัสผ่านไม่ถูกต้อง':error.message);return}await redirectUser(data.user)};
  window.registerUser=async event=>{event.preventDefault();const form=event.currentTarget,db=await client();status('กำลังสร้างบัญชี...');const {data,error}=await db.auth.signUp({email:form.email.value.trim(),password:form.password.value,options:{data:{name:form.name.value.trim()},emailRedirectTo:'https://siixthsensem.github.io/mamweb/login.html'}});if(error){status(error.message);return}if(!data.session){status('กรุณาตรวจอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ')}else await redirectUser(data.user)};
  window.currentProfile=async()=>{const db=await client();const {data:{user}}=await db.auth.getUser();return user?{user,profile:await profileFor(user)}:null};
})();
