(function () {
  const waitForDatabase = async () => {
    while (!window.supabaseReady) await new Promise(resolve => setTimeout(resolve, 25));
    return window.supabaseReady;
  };

  function makeProductCard(product, index) {
    const card = document.createElement('article');
    card.className = 'product';
    const link = document.createElement('a');
    link.href = `product.html?id=${encodeURIComponent(product.id)}`;
    const stock = Math.max(0, Number(product.stock) || 0);
    const visual = document.createElement('div');
    visual.className = `product-image p${(index % 3) + 1}`;
    if (stock === 0) {
      visual.style.filter = 'grayscale(1)';
      visual.style.opacity = '.58';
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = 'สินค้าหมด';
      visual.append(tag);
    }
    if (product.image_url) {
      const image = document.createElement('img');
      image.className = 'product-photo';
      image.src = product.image_url;
      image.alt = product.name;
      visual.append(image);
    } else {
      const icon = document.createElement('span');
      icon.className = 'product-emoji';
      icon.textContent = '🧵';
      visual.append(icon);
    }
    const name = document.createElement('h3'); name.textContent = product.name;
    const detail = document.createElement('small'); detail.textContent = product.short_description || '';
    const price = document.createElement('p'); price.textContent = `฿ ${Number(product.price || 0).toLocaleString('th-TH')}`;
    link.append(visual, name, detail, price);
    card.append(link);
    return card;
  }

  async function loadHomeProducts() {
    document.querySelectorAll('a[href="#shop"], .products .section-title a').forEach(link => { link.href = 'products.html'; });
    const grid = document.querySelector('.product-grid');
    if (!grid) return;
    try {
      const db = await waitForDatabase();
      const { data, error } = await db.from('products')
        .select('id,name,short_description,price,image_url,stock')
        .eq('active', true)
        .order('name')
        .limit(3);
      if (error) throw error;
      const { data: media, error: mediaError } = await db.from('product_media')
        .select('product_id,media_type,media_url,display_order,is_cover')
        .eq('media_type', 'image')
        .order('display_order');
      if (mediaError) console.warn('Unable to load product media', mediaError);
      const coverByProduct = new Map();
      (media || []).sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.display_order - b.display_order)
        .forEach(item => { if (!coverByProduct.has(item.product_id)) coverByProduct.set(item.product_id, item.media_url); });
      grid.innerHTML = '';
      data.forEach((product, index) => grid.append(makeProductCard({ ...product, image_url: coverByProduct.get(product.id) || product.image_url }, index)));
    } catch (error) {
      console.warn('Unable to load home products', error);
    }
  }

  addEventListener('load', loadHomeProducts);
}());
