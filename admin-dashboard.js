window.addEventListener('load', async () => {
  document.querySelectorAll('a[href="admin-custom-orders.html"]').forEach(link => {
    const panel = link.closest('.panel');
    if (panel) panel.remove(); else link.remove();
  });
  document.getElementById('messages-count')?.closest('.stat')?.remove();
  const session = await requireRole('admin');
  if (!session) return;

  const db = await supabaseReady;
  document.getElementById('admin-name').textContent = session.profile.display_name || session.user.email;

  const money = value => catalog.money(value);
  const orderCode = id => 'LM-' + String(id).slice(0, 8).toUpperCase();

  function requestTrackingCode(code) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(31,42,36,.5);display:grid;place-items:center;padding:20px;z-index:1000';
      const dialog = document.createElement('form');
      dialog.style.cssText = 'width:min(100%,440px);background:#fffaf2;border-radius:16px;padding:28px;box-shadow:0 20px 50px rgba(0,0,0,.2)';
      const title = document.createElement('h2');
      const text = document.createElement('p');
      const label = document.createElement('label');
      const input = document.createElement('input');
      const hint = document.createElement('small');
      const actions = document.createElement('div');
      const cancel = document.createElement('button');
      const confirm = document.createElement('button');
      title.textContent = 'ยืนยันการจัดส่ง';
      text.textContent = `คำสั่งซื้อ ${code}`;
      label.textContent = 'รหัสติดตามพัสดุไปรษณีย์ไทย';
      input.required = true;
      input.autocomplete = 'off';
      input.placeholder = 'เช่น EX123456789TH หรือ 1234567890';
      input.style.cssText = 'width:100%;box-sizing:border-box;margin-top:8px;padding:12px;border:1px solid #c8bba8;border-radius:8px;font-size:16px;text-transform:uppercase';
      hint.textContent = 'กรอกรหัสพัสดุให้ครบก่อนกดยืนยัน';
      hint.style.display = 'block';
      hint.style.marginTop = '8px';
      actions.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:22px';
      cancel.type = 'button';
      cancel.className = 'filter';
      cancel.textContent = 'ยกเลิก';
      confirm.type = 'submit';
      confirm.className = 'btn';
      confirm.textContent = 'ยืนยันจัดส่ง';
      actions.append(cancel, confirm);
      dialog.append(title, text, label, input, hint, actions);
      overlay.append(dialog);
      document.body.append(overlay);
      input.focus();
      const close = value => { overlay.remove(); resolve(value); };
      cancel.onclick = () => close(null);
      overlay.onclick = event => { if (event.target === overlay) close(null); };
      dialog.onsubmit = event => {
        event.preventDefault();
        const value = input.value.trim().toUpperCase();
        if (!value) { input.focus(); return; }
        close(value);
      };
    });
  }

  async function refreshStats() {
    const [orders, items, products] = await Promise.all([
      db.from('orders').select('*', { count: 'exact', head: true }),
      db.from('order_items').select('quantity,orders(status)'),
      db.from('products').select('*', { count: 'exact', head: true })
    ]);
    document.getElementById('orders-count').textContent = orders.count || 0;
    document.getElementById('products-count').textContent = products.count || 0;
    const list = items.data || [];
    const sum = predicate => list.filter(predicate).reduce((total, item) => total + (Number(item.quantity) || 0), 0);
    document.getElementById('to-ship-count').textContent = sum(item => item.orders?.status === 'processing');
    document.getElementById('shipped-count').textContent = sum(item => item.orders?.status === 'shipped');
  }

  async function loadPayments() {
    const root = document.getElementById('pending-payment-list');
    const { data, error } = await db.from('orders').select('id,total,expires_at').eq('status', 'pending_payment').order('created_at', { ascending: true });
    if (error) { root.textContent = error.message; return; }
    if (!data?.length) { root.innerHTML = '<p>ไม่มีคำสั่งซื้อที่รอยืนยัน</p>'; return; }
    root.replaceChildren();
    data.forEach(order => {
      const row = document.createElement('div');
      row.className = 'order';
      const info = document.createElement('span');
      const button = document.createElement('button');
      info.textContent = `${orderCode(order.id)} · ${money(order.total)} · หมดอายุ ${new Date(order.expires_at).toLocaleString('th-TH')}`;
      button.className = 'btn';
      button.textContent = 'ยืนยันชำระเงิน';
      button.onclick = async () => {
        button.disabled = true;
        const { error: confirmError } = await db.rpc('confirm_order_payment', { p_order_id: order.id });
        if (confirmError) { alert(confirmError.message); button.disabled = false; return; }
        await Promise.all([loadPayments(), loadShipments(), refreshStats()]);
      };
      row.append(info, button);
      root.append(row);
    });
  }

  async function loadShipments() {
    const root = document.getElementById('shipment-list');
    const { data, error } = await db.from('orders')
      .select('id,total,created_at,user_id,order_items(product_name,quantity,unit_price)')
      .eq('status', 'processing')
      .order('created_at', { ascending: true });
    if (error) { root.textContent = error.message; return; }
    if (!data?.length) { root.innerHTML = '<p>ไม่มีสินค้าที่รอจัดส่ง</p>'; return; }
    root.replaceChildren();
    data.forEach(order => {
      const row = document.createElement('div');
      row.className = 'order';
      const details = document.createElement('div');
      const title = document.createElement('b');
      const list = document.createElement('p');
      title.textContent = `${orderCode(order.id)} · ยอด ${money(order.total)}`;
      list.style.margin = '6px 0 0';
      list.style.whiteSpace = 'pre-line';
      list.textContent = (order.order_items || []).map(item => `${item.product_name} × ${item.quantity} ชิ้น · ${money(item.unit_price * item.quantity)}`).join('\n') || 'ไม่พบรายการสินค้า';
      details.append(title, list);
      const button = document.createElement('button');
      button.className = 'btn';
      button.textContent = 'ยืนยันจัดส่ง';
      button.onclick = async () => {
        const tracking = await requestTrackingCode(orderCode(order.id));
        if (!tracking) return;
        button.disabled = true;
        const { error: shipError } = await db.rpc('mark_order_shipped', { p_order_id: order.id, p_tracking_code: tracking });
        if (shipError) { alert(shipError.message); button.disabled = false; return; }
        await Promise.all([loadShipments(), refreshStats()]);
      };
      row.append(details, button);
      root.append(row);
    });
  }

  await Promise.all([refreshStats(), loadPayments(), loadShipments()]);
});
