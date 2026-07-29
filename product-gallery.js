(function () {
  const waitForDatabase = async () => {
    while (!window.supabaseReady) await new Promise(resolve => setTimeout(resolve, 25));
    return window.supabaseReady;
  };

  function displayMedia(art, media, all) {
    art.innerHTML = '';
    art.className = 'detail-art';
    const main = document.createElement(media.media_type === 'video' ? 'video' : 'img');
    main.src = media.media_url;
    main.className = 'product-photo';
    main.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
    if (media.media_type === 'video') { main.controls = true; main.playsInline = true; main.preload = 'metadata'; }
    else main.alt = document.getElementById('product-name').textContent || 'รูปสินค้า';
    art.append(main);
    if (all.length < 2) return;
    const thumbs = document.createElement('div');
    thumbs.style.cssText = 'position:absolute;left:12px;right:12px;bottom:12px;display:flex;gap:8px;overflow:auto;padding:2px';
    all.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', item.media_type === 'video' ? 'ดูวิดีโอสินค้า' : 'ดูรูปสินค้า');
      button.style.cssText = `flex:0 0 48px;width:48px;height:48px;padding:0;border:2px solid ${item.id === media.id ? '#c86a4a' : '#fff'};border-radius:8px;overflow:hidden;background:#fff;cursor:pointer`;
      const thumb = document.createElement(item.media_type === 'video' ? 'video' : 'img');
      thumb.src = item.media_url; thumb.muted = true; thumb.preload = 'metadata';
      thumb.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
      button.append(thumb);
      button.onclick = () => displayMedia(art, item, all);
      thumbs.append(button);
    });
    art.style.position = 'relative';
    art.append(thumbs);
  }

  async function loadGallery() {
    const productId = new URLSearchParams(location.search).get('id');
    if (!productId) return;
    try {
      const db = await waitForDatabase();
      const { data, error } = await db.from('product_media')
        .select('id,media_type,media_url,display_order,is_cover')
        .eq('product_id', productId)
        .order('display_order');
      if (error || !data || !data.length) return;
      const first = data.find(item => item.is_cover && item.media_type === 'image') || data[0];
      displayMedia(document.getElementById('detail-art'), first, data);
    } catch (error) { console.warn('Unable to load product gallery', error); }
  }

  addEventListener('load', () => setTimeout(loadGallery, 350));
}());
