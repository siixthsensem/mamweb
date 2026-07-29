(function () {
  const form = document.getElementById('add-product');
  const picker = form.elements.media;
  const preview = document.getElementById('media-preview');
  const root = document.getElementById('admin-product-list');
  const status = document.getElementById('product-status');
  let mediaFiles = [];

  const message = text => { status.textContent = text; };
  const slugFor = name => `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product'}-${Date.now()}`;
  const db = async () => {
    while (!window.supabaseReady) await new Promise(resolve => setTimeout(resolve, 25));
    return window.supabaseReady;
  };
  const isVideo = file => file.type.startsWith('video/');
  const fileIsAllowed = file => file.type.startsWith('image/') || ['video/mp4', 'video/webm'].includes(file.type);

  function showPreviews() {
    preview.innerHTML = '';
    mediaFiles.forEach(file => {
      const figure = document.createElement('figure');
      const url = URL.createObjectURL(file);
      const element = document.createElement(isVideo(file) ? 'video' : 'img');
      element.src = url;
      if (isVideo(file)) { element.muted = true; element.controls = true; }
      else element.alt = file.name;
      const caption = document.createElement('figcaption');
      caption.textContent = `${isVideo(file) ? 'วิดีโอ' : 'รูป'}: ${file.name}`;
      figure.append(element, caption);
      preview.append(figure);
    });
  }

  picker.onchange = () => {
    const selected = Array.from(picker.files || []);
    const invalid = selected.find(file => !fileIsAllowed(file) || (!isVideo(file) && file.size > 3 * 1024 * 1024) || (isVideo(file) && file.size > 30 * 1024 * 1024));
    if (invalid) {
      picker.value = '';
      mediaFiles = [];
      showPreviews();
      message('รองรับรูปภาพไม่เกิน 3 MB และวิดีโอ MP4/WebM ไม่เกิน 30 MB ต่อไฟล์');
      return;
    }
    mediaFiles = selected;
    showPreviews();
    message(selected.length ? `เลือกสื่อแล้ว ${selected.length} ไฟล์ — รูปแรกจะเป็นรูปหน้าปกสินค้า` : '');
  };

  async function uploadMedia(client, productId, files = mediaFiles) {
    const rows = [];
    const { data: existingCovers } = await client.from('product_media')
      .select('id').eq('product_id', productId).eq('media_type', 'image').eq('is_cover', true).limit(1);
    let hasCover = Boolean(existingCovers && existingCovers.length);
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const type = isVideo(file) ? 'video' : 'image';
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
      const path = `products/${productId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await client.storage.from('product-media').upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicData } = client.storage.from('product-media').getPublicUrl(path);
      const cover = type === 'image' && !hasCover;
      if (cover) hasCover = true;
      rows.push({ product_id: productId, media_type: type, media_url: publicData.publicUrl, display_order: index, is_cover: cover });
    }
    if (rows.length) {
      const { error } = await client.from('product_media').insert(rows);
      if (error) throw error;
    }
  }

  function mediaCount(product) {
    return Array.isArray(product.product_media) ? product.product_media.length : 0;
  }

  function validateFiles(files) {
    return files.find(file => !fileIsAllowed(file) || (!isVideo(file) && file.size > 3 * 1024 * 1024) || (isVideo(file) && file.size > 30 * 1024 * 1024));
  }

  async function deleteStoredMedia(client, productId) {
    const { data, error } = await client.from('product_media').select('media_url').eq('product_id', productId);
    if (error) throw error;
    const paths = (data || []).map(item => {
      const marker = '/product-media/';
      const position = item.media_url.indexOf(marker);
      return position >= 0 ? item.media_url.slice(position + marker.length) : null;
    }).filter(Boolean);
    if (paths.length) {
      const { error: removeError } = await client.storage.from('product-media').remove(paths);
      if (removeError) throw removeError;
    }
  }

  async function renderProducts() {
    const client = await db();
    const { data, error } = await client.from('products').select('id,name,category,price,stock,active,image_url,product_media(id)').order('name');
    if (error) { root.innerHTML = '<p>ไม่สามารถโหลดสินค้าได้</p>'; message(error.message); return; }
    root.innerHTML = '';
    if (!data.length) { root.innerHTML = '<p>ยังไม่มีสินค้าในฐานข้อมูล</p>'; return; }
    data.forEach(product => {
      const row = document.createElement('div');
      row.className = 'order';
      const info = document.createElement('span');
      info.textContent = `${product.name} · ฿${Number(product.price).toLocaleString('th-TH')} · คงเหลือ ${product.stock || 0} ชิ้น${product.active ? '' : ' (ปิดการขาย)'}`;
      const count = document.createElement('small');
      count.className = 'product-media-count';
      count.textContent = `สื่อสินค้า ${mediaCount(product)} ไฟล์${mediaCount(product) ? '' : ' (ยังไม่มีรูปหรือวิดีโอ)'}`;
      const infoBlock = document.createElement('div');
      infoBlock.append(info, count);
      const actions = document.createElement('div');
      const stockInput = document.createElement('input');
      stockInput.type = 'number'; stockInput.min = '0'; stockInput.value = String(product.stock || 0);
      stockInput.setAttribute('aria-label', `สต๊อก ${product.name}`);
      stockInput.style.cssText = 'width:76px;padding:6px;margin-right:6px;border:1px solid #d9d4c9;border-radius:8px';
      const saveStock = document.createElement('button');
      saveStock.className = 'filter'; saveStock.textContent = 'บันทึกสต๊อก';
      saveStock.onclick = async () => {
        const stock = Number(stockInput.value);
        if (!Number.isInteger(stock) || stock < 0) { message('กรุณาระบุจำนวนสต๊อกตั้งแต่ 0 ขึ้นไป'); return; }
        saveStock.disabled = true;
        const { error: stockError } = await client.from('products').update({ stock }).eq('id', product.id);
        if (stockError) { message(stockError.message); saveStock.disabled = false; return; }
        message(stock === 0 ? 'บันทึกแล้ว: สินค้าหมดชั่วคราว' : `บันทึกสต๊อก ${stock} ชิ้นแล้ว`);
        await renderProducts(); await catalog.syncStocks();
      };
      const toggleActive = document.createElement('button');
      toggleActive.className = 'filter'; toggleActive.textContent = product.active ? 'ปิดการขาย' : 'เปิดขาย';
      toggleActive.onclick = async () => {
        toggleActive.disabled = true;
        const { error: activeError } = await client.from('products').update({ active: !product.active }).eq('id', product.id);
        if (activeError) { message(activeError.message); toggleActive.disabled = false; return; }
        message(product.active ? 'ปิดการขายแล้ว' : 'เปิดขายแล้ว');
        await renderProducts(); await catalog.syncStocks();
      };
      const addMedia = document.createElement('button');
      addMedia.className = 'filter'; addMedia.textContent = 'เพิ่มรูป/วิดีโอ';
      const mediaInput = document.createElement('input');
      mediaInput.type = 'file'; mediaInput.accept = 'image/*,video/mp4,video/webm'; mediaInput.multiple = true;
      mediaInput.hidden = true;
      addMedia.onclick = () => mediaInput.click();
      mediaInput.onchange = async () => {
        const files = Array.from(mediaInput.files || []);
        const invalid = validateFiles(files);
        if (invalid) { message('รองรับรูปภาพไม่เกิน 3 MB และวิดีโอ MP4/WebM ไม่เกิน 30 MB ต่อไฟล์'); return; }
        if (!files.length) return;
        addMedia.disabled = true;
        try {
          message(`กำลังอัปโหลดสื่อ ${files.length} ไฟล์…`);
          await uploadMedia(client, product.id, files);
          message('เพิ่มรูป/วิดีโอสินค้าเรียบร้อย');
          await renderProducts(); await catalog.syncStocks();
        } catch (error) { message(error.message || 'อัปโหลดสื่อไม่สำเร็จ'); addMedia.disabled = false; }
      };
      const remove = document.createElement('button');
      remove.className = 'filter'; remove.textContent = 'ลบ';
      remove.onclick = async () => {
        if (!confirm(`ลบสินค้า “${product.name}” พร้อมรูปและวิดีโอออกจากระบบใช่หรือไม่?`)) return;
        remove.disabled = true;
        try {
          await deleteStoredMedia(client, product.id);
          const { error: deleteError } = await client.from('products').delete().eq('id', product.id);
          if (deleteError) throw deleteError;
          message('ลบสินค้าแล้ว'); await renderProducts(); await catalog.syncStocks();
        } catch (error) { message(error.message); remove.disabled = false; }
      };
      actions.append(stockInput, saveStock, toggleActive, addMedia, mediaInput, remove);
      row.append(infoBlock, actions); root.append(row);
    });
  }

  form.onsubmit = async event => {
    event.preventDefault();
    const fields = new FormData(form);
    const product = {
      name: fields.get('name').trim(), slug: slugFor(fields.get('name')), category: fields.get('category'),
      short_description: fields.get('detail').trim(), description: fields.get('description').trim(),
      price: Number(fields.get('price')), stock: Number(fields.get('stock')), image_url: null, active: true
    };
    try {
      message('กำลังบันทึกสินค้าและอัปโหลดสื่อ…');
      const client = await db();
      const { data: inserted, error } = await client.from('products').insert(product).select('id').single();
      if (error) throw error;
      await uploadMedia(client, inserted.id);
      form.reset(); mediaFiles = []; showPreviews();
      message('เพิ่มสินค้าและอัปโหลดสื่อเรียบร้อย');
      await renderProducts(); await catalog.syncStocks();
    } catch (error) { message(error.message || 'ไม่สามารถเพิ่มสินค้าได้'); }
  };

  (async () => { await db(); const access = await requireRole('admin'); if (access) await renderProducts(); })();
}());
