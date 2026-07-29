(function () {
  const productKey = 'lamunlai-products';
  const cartKey = 'lamunlai-cart';
  const colors = ['sand', 'green', 'beige', 'pink'];
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || link.target || link.hasAttribute('download')) return;
    const target = new URL(link.href, location.href);
    if (target.origin !== location.origin || target.pathname === location.pathname || link.getAttribute('href').startsWith('#')) return;
    event.preventDefault();
    document.body.classList.add('page-leaving');
    setTimeout(() => { location.href = target.href; }, 180);
  });
  const initial = [
    { id: 'tote', name: 'กระเป๋าผ้า Everyday Tote', category: 'กระเป๋าผ้า', detail: 'ผ้าฝ้ายทอมือ · สีดินเผา', description: 'กระเป๋าผ้าทอมือสำหรับทุกวัน', price: 890, stock: 0, color: 'sand', icon: '👜' },
    { id: 'pillow', name: 'ปลอกหมอนลายตาราง', category: 'ของแต่งบ้าน', detail: 'ผ้าฝ้ายธรรมชาติ · Sage green', description: 'ปลอกหมอนผ้าฝ้ายธรรมชาติ', price: 650, stock: 0, color: 'green', icon: '🏠' },
    { id: 'bloom', name: 'กระเป๋าใส่เครื่องเขียน Bloom', category: 'ของชิ้นเล็ก', detail: 'ผ้าคอตตอน · ปักมือ', description: 'กระเป๋าผ้าคอตตอนปักมือ', price: 420, stock: 0, color: 'beige', icon: '🎀' }
  ];

  const load = () => JSON.parse(localStorage.getItem(productKey) || 'null') || initial;
  const save = products => localStorage.setItem(productKey, JSON.stringify(products));
  const cart = () => JSON.parse(localStorage.getItem(cartKey) || '[]');
  const money = number => `฿ ${Number(number || 0).toLocaleString('th-TH')}`;
  const stockOf = product => Math.max(0, Number(product?.stock) || 0);
  const count = () => cart().reduce((total, item) => total + Math.max(0, Number(item.quantity) || 0), 0);

  function updateCartCount() {
    document.querySelectorAll('.count').forEach(element => { element.textContent = count(); });
  }

  function saveCart(items) {
    const products = load();
    const normalized = items.map(item => {
      const product = products.find(candidate => candidate.id === item.id) || item;
      const quantity = Math.min(Math.max(0, Number(item.quantity) || 0), stockOf(product));
      return { ...product, ...item, stock: stockOf(product), quantity };
    }).filter(item => item.quantity > 0);
    localStorage.setItem(cartKey, JSON.stringify(normalized));
    updateCartCount();
  }

  function addToCart(product, quantity = 1) {
    const currentProduct = load().find(item => item.id === product.id) || product;
    const items = cart();
    const existing = items.find(item => item.id === currentProduct.id);
    const current = existing ? Number(existing.quantity) || 0 : 0;
    const available = Math.max(0, stockOf(currentProduct) - current);
    const added = Math.min(Math.max(0, Number(quantity) || 0), available);
    if (added) {
      if (existing) existing.quantity = current + added;
      else items.push({ ...currentProduct, quantity: added });
      saveCart(items);
    }
    return { added, available };
  }

  async function syncStocks() {
    while (!window.supabaseReady) await new Promise(resolve => setTimeout(resolve, 25));
    try {
      const db = await window.supabaseReady;
      const { data, error } = await db.from('products')
        .select('id,slug,name,category,short_description,description,price,image_url,stock,active')
        .eq('active', true)
        .order('name');
      if (error || !data) throw error || new Error('ไม่พบข้อมูลสินค้า');
      const { data: media, error: mediaError } = await db.from('product_media')
        .select('product_id,media_type,media_url,display_order,is_cover')
        .eq('media_type', 'image')
        .order('display_order');
      if (mediaError) console.warn('Unable to load product media', mediaError);
      const coverByProduct = new Map();
      (media || []).sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.display_order - b.display_order)
        .forEach(item => { if (!coverByProduct.has(item.product_id)) coverByProduct.set(item.product_id, item.media_url); });
      const products = data.map((product, index) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        detail: product.short_description || '',
        description: product.description || '',
        price: Number(product.price) || 0,
        image: coverByProduct.get(product.id) || product.image_url || '',
        stock: stockOf(product),
        active: product.active,
        color: colors[index % colors.length],
        icon: '🧵'
      }));
      save(products);
      saveCart(cart());
      return products;
    } catch (error) {
      console.warn('Unable to refresh products', error);
      return load();
    }
  }

  window.catalog = { load, save, money, cart, saveCart, count, addToCart, updateCartCount, stockOf, syncStocks };

  window.renderCatalog = function (filter = 'ทั้งหมด') {
    const target = document.querySelector('#product-list');
    if (!target) return;
    const products = load().filter(product => filter === 'ทั้งหมด' || product.category === filter);
    target.innerHTML = '';
    if (!products.length) {
      target.innerHTML = '<p>ยังไม่มีสินค้าในหมวดนี้</p>';
      return;
    }
    products.forEach(product => {
      const card = document.createElement('a');
      card.className = 'card';
      card.href = `product.html?id=${encodeURIComponent(product.id)}`;
      const stock = stockOf(product);
      if (stock === 0) {
        card.style.opacity = '.58';
        card.style.filter = 'grayscale(1)';
      }
      const visual = product.image ? '<img class="product-photo" alt="">' : `<span class="product-emoji">${product.icon || '🧵'}</span>`;
      card.innerHTML = `<div class="card-img ${product.color || 'beige'}">${stock === 0 ? '<span class="tag">สินค้าหมด</span>' : ''}${visual}</div><h3></h3><small></small><div class="price"></div>${stock === 0 ? '<small class="out-of-stock">สินค้าหมดชั่วคราว</small>' : ''}`;
      if (product.image) {
        const image = card.querySelector('img');
        image.src = product.image;
        image.alt = product.name;
      }
      card.querySelector('h3').textContent = product.name;
      card.querySelector('small').textContent = product.detail;
      card.querySelector('.price').textContent = money(product.price);
      target.append(card);
    });
  };

  updateCartCount();
  addEventListener('storage', event => { if (event.key === cartKey) updateCartCount(); });
  addEventListener('load', () => {
    updateCartCount();
    syncStocks().then(() => {
      if (typeof window.renderCatalog === 'function') window.renderCatalog();
      if (typeof window.renderCart === 'function') window.renderCart();
    });
  });
  document.addEventListener('click', event => {
    const button = event.target;
    if (button.id !== 'add-button') return;
    event.preventDefault();
    const id = new URLSearchParams(location.search).get('id');
    const product = load().find(item => item.id === id);
    const quantity = Number(document.getElementById('quantity')?.textContent) || 1;
    const result = product ? addToCart(product, quantity) : { added: 0 };
    const message = document.getElementById('add-message');
    if (message) message.textContent = result.added === quantity ? 'เพิ่มสินค้าในตะกร้าแล้ว ✓' : 'สินค้าหมดหรือมีจำนวนในตะกร้าครบตามสต๊อกแล้ว';
  }, true);
}());
