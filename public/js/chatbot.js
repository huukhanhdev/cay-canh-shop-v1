document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.querySelector('#chatbot-widget .chatbot-button');
  const panel = document.getElementById('chatbot-panel');
  const closeBtn = document.getElementById('chatbot-close');
  const sendBtn = document.getElementById('chatbot-send');
  const input = document.getElementById('chatbot-input');
  const result = document.getElementById('chatbot-result');

  function openPanel(){ panel.setAttribute('aria-hidden','false'); toggleBtn.classList.add('active'); }
  function closePanel(){ panel.setAttribute('aria-hidden','true'); toggleBtn.classList.remove('active'); }
  function togglePanel(){ if (panel.getAttribute('aria-hidden') === 'true') openPanel(); else closePanel(); }

  toggleBtn.addEventListener('click', (e)=>{ e.stopPropagation(); togglePanel(); });
  closeBtn.addEventListener('click', (e)=>{ e.stopPropagation(); closePanel(); });

  // close when clicking outside
  document.addEventListener('click', (e)=>{
    const inside = e.composedPath && e.composedPath().some(el => el && el.id === 'chatbot-panel');
    const isToggle = e.target.closest && e.target.closest('.chatbot-button');
    if (!inside && !isToggle) closePanel();
  });
  // close on ESC
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closePanel(); });

  async function renderSuggestions(data){
    result.innerHTML = '';
    if (data.fallback && data.error){
      const note = document.createElement('div'); note.className='chatbot-note'; note.textContent = 'Lưu ý: AI hiện không khả dụng — đang hiển thị gợi ý từ cơ sở dữ liệu.'; result.appendChild(note);
    }
    if (!data.suggestions || !data.suggestions.length){
      const p = document.createElement('div'); p.className='chatbot-note'; p.textContent = 'Không tìm thấy gợi ý.'; result.appendChild(p); return;
    }
    const placeholderSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect fill="#f3f6f3" width="100%" height="100%"/><text x="50%" y="50%" dy=".35em" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#808080" text-anchor="middle">No image</text></svg>');
    data.suggestions.forEach((s, idx) => {
      const card = document.createElement('div'); card.className = 'chatbot-card';
      
      // Build carousel container
      const carousel = document.createElement('div'); carousel.className = 'card-carousel';
      const track = document.createElement('div'); track.className = 'carousel-track';
      const images = [s.img || s.image || s.thumbnail || placeholderSvg]; // use first image from product
      images.forEach(src => {
        const img = document.createElement('img'); img.src = src; img.alt = s.name || 'product';
        img.onerror = function(){ this.onerror=null; this.src = placeholderSvg; };
        track.appendChild(img);
      });
      
      let currentIndex = 0;
      const prevBtn = document.createElement('button'); prevBtn.className = 'carousel-btn prev'; prevBtn.textContent = '‹'; prevBtn.ariaLabel = 'Previous image';
      const nextBtn = document.createElement('button'); nextBtn.className = 'carousel-btn next'; nextBtn.textContent = '›'; nextBtn.ariaLabel = 'Next image';
      
      function updateCarousel(){
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        prevBtn.classList.toggle('show', currentIndex > 0);
        nextBtn.classList.toggle('show', currentIndex < images.length - 1);
      }
      prevBtn.addEventListener('click', (e) => { e.stopPropagation(); if (currentIndex > 0) { currentIndex--; updateCarousel(); } });
      nextBtn.addEventListener('click', (e) => { e.stopPropagation(); if (currentIndex < images.length - 1) { currentIndex++; updateCarousel(); } });
      
      carousel.appendChild(track);
      carousel.appendChild(prevBtn);
      carousel.appendChild(nextBtn);
      updateCarousel();
      
      const body = document.createElement('div'); body.className = 'card-body';
      const title = document.createElement('a'); title.className = 'card-title'; title.href = s.url || (`/shop/${s.slug||''}`); title.textContent = s.name || 'Sản phẩm';
      const meta = document.createElement('div'); meta.className = 'card-price'; if (s.price) meta.textContent = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(s.price);
      const reason = document.createElement('div'); reason.className = 'card-reason'; reason.textContent = s.reason || (s.note || '');
      const actions = document.createElement('div'); actions.className = 'card-actions';
      const view = document.createElement('a'); view.className = 'btn btn-secondary'; view.href = s.url || (`/shop/${s.slug||''}`); view.textContent = 'Xem';
      actions.appendChild(view);
      // confidence
      if (typeof s.confidence !== 'undefined'){
        const conf = document.createElement('span'); conf.className = 'badge-confidence'; conf.textContent = `Độ tin cậy: ${Math.round((s.confidence||0)*100)}%`; actions.appendChild(conf);
      }

      body.appendChild(title); body.appendChild(meta); body.appendChild(reason);
      // per-card fallback note when DB fallback used
      if (data.fallback) {
        const fb = document.createElement('div'); fb.className = 'fallback-text'; fb.textContent = 'Gợi ý dựa trên tìm kiếm nhanh (fallback)'; body.appendChild(fb);
      }
      body.appendChild(actions);
      card.appendChild(carousel); card.appendChild(body);
      result.appendChild(card);
    });
  }

  sendBtn.addEventListener('click', async () => {
    const message = input.value.trim();
    if (!message) return alert('Vui lòng nhập yêu cầu.');
    result.innerHTML = '<div class="chatbot-note">Đang tải gợi ý…</div>';
    try {
      const resp = await fetch('/api/chatbot/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message })
      });
      const data = await resp.json();
      if (!resp.ok) {
        console.error('API error', data);
        data.fallback = data.fallback || true;
      }
      await renderSuggestions(data);
      openPanel();
      // highlight the button briefly when there are results
      toggleBtn.classList.add('pulse'); setTimeout(()=>toggleBtn.classList.remove('pulse'), 1600);
    } catch (err) {
      console.error(err);
      result.innerHTML = `<div class="chatbot-note">Lỗi khi gọi AI: ${err.message || 'Không xác định'}</div>`;
      openPanel();
    }
  });
});
