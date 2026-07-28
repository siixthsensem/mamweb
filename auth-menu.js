(async()=>{
  try {
    const db=await window.supabaseReady;
    const {data:{user}}=await db.auth.getUser();
    const slot=document.querySelector('.actions')||document.querySelector('header');
    if(!slot)return;
    const existing=slot.querySelector('[data-auth-menu]');
    if(existing)existing.remove();
    const link=document.createElement('a');
    link.dataset.authMenu='true';
    link.className='auth-chip';
    if(!user){link.href='login.html';link.textContent='เข้าสู่ระบบ'}
    else {const {data:profile}=await db.from('profiles').select('display_name,role,avatar_url').eq('id',user.id).single();link.href=profile?.role==='admin'?'admin.html':'account.html';const avatar=profile?.avatar_url?`<img src="${profile.avatar_url}" alt="">`:`<span>${(profile?.display_name||user.email)[0].toUpperCase()}</span>`;link.innerHTML=`${avatar}<b>${profile?.display_name||user.email.split('@')[0]}</b>`}
    slot.append(link);
  } catch(e) { console.warn('Auth menu unavailable',e); }
})();
