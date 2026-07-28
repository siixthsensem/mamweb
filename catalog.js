(function(){
  const productKey='lamunlai-products',cartKey='lamunlai-cart';
  const initial=[
    {id:'tote',name:'กระเป๋าผ้า Everyday Tote',category:'กระเป๋าผ้า',detail:'ผ้าฝ้ายทอมือ · สีดินเผา',description:'กระเป๋าผ้าทอมือทรงเรียบง่ายสำหรับทุกวัน ขนาดกำลังพอดี ใส่โน้ตบุ๊ก 13 นิ้วได้ พร้อมช่องกระเป๋าเล็กด้านใน',price:890,color:'sand',icon:'👜'},
    {id:'pillow',name:'ปลอกหมอนลายตาราง',category:'ของแต่งบ้าน',detail:'ผ้าฝ้ายธรรมชาติ · Sage green',description:'ปลอกหมอนผ้าฝ้ายธรรมชาติลายตาราง ช่วยเติมความอบอุ่นให้มุมพักผ่อนของคุณ',price:650,color:'green',icon:'🏠'},
    {id:'bloom',name:'กระเป๋าใส่เครื่องเขียน Bloom',category:'ของชิ้นเล็ก',detail:'ผ้าคอตตอน · ปักมือ',description:'กระเป๋าผ้าคอตตอนใบเล็ก ปักมืออย่างตั้งใจ เหมาะสำหรับเก็บเครื่องเขียนและของใช้ชิ้นโปรด',price:420,color:'beige',icon:'🎀'}
  ];
  const load=()=>JSON.parse(localStorage.getItem(productKey)||'null')||initial,save=x=>localStorage.setItem(productKey,JSON.stringify(x));
  const cart=()=>JSON.parse(localStorage.getItem(cartKey)||'[]'),saveCart=x=>localStorage.setItem(cartKey,JSON.stringify(x));
  const money=n=>'฿ '+Number(n).toLocaleString('th-TH');
  const count=()=>cart().reduce((sum,item)=>sum+item.quantity,0);
  function updateCartCount(){document.querySelectorAll('.count').forEach(el=>el.textContent=count())}
  function addToCart(product,quantity=1){const items=cart(),existing=items.find(x=>x.id===product.id);if(existing)existing.quantity+=quantity;else items.push({...product,quantity});saveCart(items);updateCartCount()}
  window.catalog={load,save,money,cart,saveCart,count,addToCart,updateCartCount};
  window.renderCatalog=function(filter='ทั้งหมด'){
    const target=document.querySelector('#product-list');if(!target)return;const items=load().filter(x=>filter==='ทั้งหมด'||x.category===filter);target.innerHTML='';
    if(!items.length){target.innerHTML='<p>ยังไม่มีสินค้าในหมวดนี้</p>';return}
    items.forEach(x=>{const card=document.createElement('a');card.className='card';card.href='product.html?id='+encodeURIComponent(x.id);const visual=x.image?'<img class="product-photo" alt="">':`<span class="product-emoji">${x.icon||'✦'}</span>`;card.innerHTML=`<div class="card-img ${x.color||'beige'}">${visual}</div><h3></h3><small></small><div class="price"></div>`;if(x.image){const image=card.querySelector('img');image.src=x.image;image.alt=x.name}card.querySelector('h3').textContent=x.name;card.querySelector('small').textContent=x.detail;card.querySelector('.price').textContent=money(x.price);target.append(card)});
  };
  addEventListener('load',updateCartCount);
})();
