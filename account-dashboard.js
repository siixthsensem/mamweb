window.addEventListener('load', async () => {
  const session = await requireRole('customer');
  if (!session) return;

  const db = await supabaseReady;
  const profile = session.profile;
  const form = document.getElementById('profile-form');
  const status = document.getElementById('profile-status');
  const maskEmail = email => {
    const [local, domain] = email.split('@');
    return local.slice(0, 6) + '*'.repeat(Math.max(0, local.length - 6)) + '@' + domain;
  };
  const money = value => '฿ ' + Number(value || 0).toLocaleString('th-TH');
  const orderCode = id => 'LM-' + String(id).slice(0, 8).toUpperCase();
  const labels = {
    pending_payment: 'รอแจ้งชำระเงิน', paid: 'ชำระเงินแล้ว', processing: 'กำลังเตรียมจัดส่ง',
    shipped: 'จัดส่งแล้ว', completed: 'สำเร็จ', cancelled: 'ยกเลิก', expired: 'หมดอายุ', pending: 'รอดำเนินการ'
  };

  document.getElementById('name').textContent = profile.display_name || session.user.email;
  document.getElementById('email').textContent = maskEmail(session.user.email);
  document.getElementById('profile-email').value = session.user.email;
  const avatar = document.getElementById('avatar');
  const renderAvatar = url => {
    avatar.replaceChildren();
    if (url) { const image = document.createElement('img'); image.src = url; image.alt = 'รูปโปรไฟล์'; avatar.append(image); }
    else avatar.textContent = (profile.display_name || session.user.email)[0];
  };
  form.elements.namedItem('display_name').value = profile.display_name || '';
  form.elements.namedItem('phone').value = profile.phone || '';
  form.elements.namedItem('address').value = profile.address || '';
  form.elements.namedItem('birth_date').value = profile.birth_date || '';
  let avatarUrl = profile.avatar_url || '';
  if (avatarUrl) document.getElementById('avatar-preview').src = avatarUrl;
  renderAvatar(avatarUrl);

  document.getElementById('avatar-file').onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { status.textContent = 'รูปต้องมีขนาดไม่เกิน 1 MB'; return; }
    const ext = file.name.split('.').pop();
    const path = `${session.user.id}/avatar.${ext}`;
    const { error } = await db.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    if (error) { status.textContent = error.message; return; }
    avatarUrl = db.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    document.getElementById('avatar-preview').src = avatarUrl;
    renderAvatar(avatarUrl);
  };

  form.onsubmit = async event => {
    event.preventDefault();
    const values = new FormData(form);
    const displayName = (values.get('display_name') || '').trim();
    status.textContent = 'กำลังบันทึกข้อมูล...';
    const { error } = await db.rpc('update_my_profile', {
      p_display_name: displayName, p_phone: values.get('phone') || null, p_address: values.get('address') || null,
      p_birth_date: values.get('birth_date') || null, p_avatar_url: avatarUrl || null
    });
    if (error) { status.textContent = error.message; return; }
    status.textContent = 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว ✓';
    document.getElementById('name').textContent = displayName || session.user.email;
    renderAvatar(avatarUrl);
  };

  const root = document.getElementById('orders');
  const { data: orders, error } = await db.from('orders')
    .select('id,total,status,created_at,expires_at,tracking_code,shipped_at,order_items(product_name,quantity,unit_price)')
    .order('created_at', { ascending: false });
  if (error) { root.innerHTML = '<h2>คำสั่งซื้อของฉัน</h2><p>ไม่สามารถโหลดคำสั่งซื้อได้: ' + error.message + '</p>'; return; }
  root.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = 'คำสั่งซื้อของฉัน';
  root.append(heading);
  if (!orders?.length) { const empty = document.createElement('p'); empty.textContent = 'ยังไม่มีคำสั่งซื้อ'; root.append(empty); return; }
  orders.forEach(order => {
    const card = document.createElement('article');
    card.className = 'order';
    card.style.display = 'block';
    card.style.marginTop = '14px';
    const title = document.createElement('b');
    const meta = document.createElement('p');
    const items = document.createElement('p');
    title.textContent = `${orderCode(order.id)} · ${labels[order.status] || order.status}`;
    meta.style.margin = '7px 0';
    meta.textContent = `สั่งซื้อเมื่อ ${new Date(order.created_at).toLocaleString('th-TH')} · ยอดรวม ${money(order.total)}`;
    items.style.cssText = 'margin:0;white-space:pre-line;color:#526d62';
    items.textContent = (order.order_items || []).map(item => `${item.product_name} × ${item.quantity} ชิ้น`).join('\n') || 'ไม่พบรายการสินค้า';
    card.append(title, meta, items);
    if (order.tracking_code) {
      const tracking = document.createElement('p');
      tracking.style.cssText = 'margin:10px 0 0;padding:10px;background:#edf3ed;border-radius:8px;color:#355343';
      tracking.textContent = `เลขติดตามพัสดุไปรษณีย์ไทย: ${order.tracking_code}${order.shipped_at ? ' · ส่งแล้ว ' + new Date(order.shipped_at).toLocaleString('th-TH') : ''}`;
      card.append(tracking);
    } else if (order.status === 'processing') {
      const preparing = document.createElement('p');
      preparing.style.cssText = 'margin:10px 0 0;color:#bf704a';
      preparing.textContent = 'ร้านกำลังเตรียมจัดส่ง จะแจ้งเลขติดตามพัสดุในหน้านี้';
      card.append(preparing);
    } else if (order.status === 'pending_payment' && order.expires_at) {
      const pending = document.createElement('p');
      pending.style.cssText = 'margin:10px 0 0;color:#bf704a';
      pending.textContent = 'กรุณาแจ้งชำระเงินภายใน ' + new Date(order.expires_at).toLocaleString('th-TH');
      card.append(pending);
    }
    root.append(card);
  });
});
