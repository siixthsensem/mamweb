window.addEventListener('load', async () => {
  const session = await requireRole('admin');
  if (!session) return;

  const db = await supabaseReady;
  document.getElementById('admin-name').textContent = session.profile.display_name || session.user.email;

  const money = value => catalog.money(value);
  const orderCode = id => 'LM-' + String(id).slice(0, 8).toUpperCase();

  async function refreshStats() {
    const [orders, messages, items, products] = await Promise.all([
      db.from('orders').select('*', { count: 'exact', head: true }),
      db.from('custom_orders').select('*', { count: 'exact', head: true }).eq('status', 'รอการติดต่อ'),
      db.from('order_items').select('quantity,orders(status)'),
      db.from('products').select('*', { count: 'exact', head: true })
    ]);
    document.getElementById('orders-count').textContent = orders.count || 0;
    document.getElementById('products-count').textContent = products.count || 0;
    document.getElementById('messages-count').textContent = messages.count || 0;
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
        const tracking = prompt('กรอกรหัสติดตามพัสดุ (จำเป็น)');
        if (!tracking || !tracking.trim()) { alert('ต้องกรอกรหัสติดตามพัสดุก่อนยืนยันจัดส่ง'); return; }
        button.disabled = true;
        const { error: shipError } = await db.rpc('mark_order_shipped', { p_order_id: order.id, p_tracking_code: tracking.trim() });
        if (shipError) { alert(shipError.message); button.disabled = false; return; }
        await Promise.all([loadShipments(), refreshStats()]);
      };
      row.append(details, button);
      root.append(row);
    });
  }

  await Promise.all([refreshStats(), loadPayments(), loadShipments()]);
});
