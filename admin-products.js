(function () {
  const form = document.getElementById('add-product');
  const picker = form.elements.image;
  const preview = document.getElementById('image-preview');
  const root = document.getElementById('admin-product-list');
  const status = document.getElementById('product-status');
  let imageData = '';

  const message = text => { status.textContent = text; };
  const slugFor = name => `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product'}-${Date.now()}`;
  const db = async () => {
    while (!window.supabaseReady) await new Promise(resolve => setTimeout(resolve, 25));
    return window.supabaseReady;
  };

  picker.onchange = () => {
    const file = picker.files[0];
    imageData = '';
    preview.removeAttribute('src');
    if (!file) return;
    if (file.size > 1024 * 1024) {
      picker.value = '';
      message('กรุณาเลือกรูปขนาดไม่เกิน 1 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { imageData = reader.result; preview.src = imageData; };
    reader.readAsDataURL(file);
  };

  async function renderProducts() {
    const client = await db();
    const { data, error } = await client.from('products').select('id,name,category,price,stock,active,image_url').order('name');
    if (error) { root.innerHTML = '<p>ไม่สามารถโหลดสินค้าได้</p>'; message(error.message); return; }
    root.innerHTML = '';
    if (!data.length) { root.innerHTML = '<p>ยังไม่มีสินค้าในฐานข้อมูล</p>'; return; }
    data.forEach(product => {
      const row = document.createElement('div');
      row.className = 'order';
      const info = document.createElement('span');
      info.textContent = `${product.name} · ฿${Number(product.price).toLocaleString('th-TH')} · คงเหลือ ${product.stock || 0} ชิ้น${product.active ? '' : ' (ปิดการขาย)'}`;
      const remove = document.createElement('button');
      remove.className = 'filter';
      remove.textContent = 'ลบ';
      remove.onclick = async () => {
        if (!confirm(`ลบสินค้า “${product.name}” ออกจากฐานข้อมูลใช่หรือไม่?`)) return;
        remove.disabled = true;
        const { error: deleteError } = await client.from('products').delete().eq('id', product.id);
        if (deleteError) { message(deleteError.message); remove.disabled = false; return; }
        message('ลบสินค้าแล้ว');
        await renderProducts();
        await catalog.syncStocks();
      };
      row.append(info, remove);
      root.append(row);
    });
  }

  form.onsubmit = async event => {
    event.preventDefault();
    const fields = new FormData(form);
    const product = {
      name: fields.get('name').trim(),
      slug: slugFor(fields.get('name')),
      category: fields.get('category'),
      short_description: fields.get('detail').trim(),
      description: fields.get('description').trim(),
      price: Number(fields.get('price')),
      stock: Number(fields.get('stock')),
      image_url: imageData || null,
      active: true
    };
    message('กำลังบันทึกสินค้า…');
    const client = await db();
    const { error } = await client.from('products').insert(product);
    if (error) { message(error.message); return; }
    form.reset(); imageData = ''; preview.removeAttribute('src');
    message('เพิ่มสินค้าในฐานข้อมูลเรียบร้อย');
    await renderProducts();
    await catalog.syncStocks();
  };

  (async () => {
    await db();
    const access = await requireRole('admin');
    if (access) await renderProducts();
  })();
}());
