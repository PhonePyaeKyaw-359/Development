(() => {
  const API = 'https://dummyjson.com/products';
  const STORAGE_KEY = 'form-field-catalog-v1';
  const PAGE_SIZE = 12;
  const state = { products: [], categories: [], activeCategory: 'all', query: '', sort: 'featured', shown: PAGE_SIZE, loading: true };
  const $ = (selector, root = document) => root.querySelector(selector);
  const grid = $('#product-grid');
  const filters = $('#category-filters');
  const toast = $('#toast');
  let toastTimer;

  function readSaved() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"overrides":{},"added":[],"deleted":[]}'); }
    catch { return { overrides: {}, added: [], deleted: [] }; }
  }
  function saveSaved(saved) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch { notify('Browser storage is full. Changes may not stay after you leave.'); } }
  function notify(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  function safeImage(value) { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } }
  function imageMarkup(product, className = 'product-image') {
    const image = safeImage(product.thumbnail || product.images?.[0] || '');
    return `<div class="product-image-wrap"><div class="product-image-fallback">${escapeHtml((product.title || 'F').charAt(0).toUpperCase())}</div>${image ? `<img class="${className}" src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.remove()">` : ''}<span class="product-tag">${escapeHtml(product.category || 'Everyday')}</span><div class="card-actions"><button class="icon-button" type="button" data-action="edit" data-id="${Number(product.id)}" aria-label="Edit ${escapeHtml(product.title)}">✎</button><button class="icon-button" type="button" data-action="delete" data-id="${Number(product.id)}" aria-label="Delete ${escapeHtml(product.title)}">×</button></div></div>`;
  }
  function filteredProducts() {
    let items = state.products.filter(p => state.activeCategory === 'all' || p.category === state.activeCategory);
    if (state.query) { const q = state.query.toLowerCase(); items = items.filter(p => `${p.title} ${p.description} ${p.category} ${p.brand || ''}`.toLowerCase().includes(q)); }
    if (state.sort === 'title-asc') items.sort((a,b) => a.title.localeCompare(b.title));
    if (state.sort === 'price-asc') items.sort((a,b) => a.price - b.price);
    if (state.sort === 'price-desc') items.sort((a,b) => b.price - a.price);
    if (state.sort === 'rating-desc') items.sort((a,b) => (b.rating || 0) - (a.rating || 0));
    return items;
  }
  function renderFilters() {
    const popular = state.categories.slice(0, 4);
    filters.innerHTML = `<button class="filter-chip ${state.activeCategory === 'all' ? 'selected' : ''}" data-category="all" type="button">All pieces <span class="chip-count">${state.products.length}</span></button>` + popular.map(category => `<button class="filter-chip ${state.activeCategory === category ? 'selected' : ''}" data-category="${escapeHtml(category)}" type="button">${escapeHtml(category.replaceAll('-', ' '))}<span class="chip-count">${state.products.filter(p => p.category === category).length}</span></button>`).join('');
  }
  function render() {
    renderFilters();
    const items = filteredProducts();
    $('#all-count').textContent = state.products.length;
    $('#result-count').textContent = state.loading ? 'Loading collection' : `${items.length} ${items.length === 1 ? 'piece' : 'pieces'}${state.query || state.activeCategory !== 'all' ? ' found' : ' to explore'}`;
    const visible = items.slice(0, state.shown);
    grid.innerHTML = visible.map((p, index) => `<article class="product-card" style="animation-delay:${Math.min(index, 8) * 35}ms">${imageMarkup(p)}<div class="product-info"><span class="product-category">${escapeHtml(p.category || 'Everyday')}</span><div class="product-title-row"><h3 class="product-title" data-action="view" data-id="${Number(p.id)}" tabindex="0">${escapeHtml(p.title)}</h3><span class="product-price">$${Number(p.price || 0).toFixed(2)}</span></div><div class="product-rating"><span>★</span> ${Number(p.rating || 0).toFixed(1)} <span style="color:#a0a49c">· ${Number(p.stock || 0)} available</span></div></div></article>`).join('');
    $('#empty-state').classList.toggle('hidden', state.loading || items.length > 0);
    $('#load-more').classList.toggle('hidden', items.length <= state.shown);
  }
  async function loadProducts() {
    const saved = readSaved();
    try {
      const response = await fetch(`${API}?limit=0`);
      if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
      const data = await response.json();
      const deleted = new Set(saved.deleted || []);
      state.products = (data.products || []).filter(p => !deleted.has(p.id)).map(p => ({ ...p, ...(saved.overrides?.[p.id] || {}) }));
      state.products.push(...(saved.added || []));
      state.categories = [...new Set(state.products.map(p => p.category).filter(Boolean))].sort();
      state.loading = false;
      render();
    } catch (error) {
      state.loading = false;
      grid.innerHTML = `<div class="empty-state" style="display:block;grid-column:1/-1"><span>↗</span><h3>We couldn't reach the collection</h3><p>${escapeHtml(error.message)}. Check your connection and try again.</p><button class="text-button" id="retry-load" type="button">Try again ↗</button></div>`;
      $('#result-count').textContent = 'Connection needed';
      $('#retry-load').addEventListener('click', loadProducts);
    }
  }
  function findProduct(id) { return state.products.find(p => Number(p.id) === Number(id)); }
  function openDetails(product) {
    const dialog = $('#product-dialog');
    $('#dialog-content').innerHTML = `<div class="detail-layout"><div class="detail-image">${safeImage(product.thumbnail || product.images?.[0]) ? `<img src="${escapeHtml(safeImage(product.thumbnail || product.images?.[0]))}" alt="${escapeHtml(product.title)}" onerror="this.remove()">` : ''}</div><div class="detail-copy"><p class="eyebrow"><span class="eyebrow-line"></span> ${escapeHtml(product.category || 'EVERYDAY')}</p><h2>${escapeHtml(product.title)}</h2><span class="detail-price">$${Number(product.price || 0).toFixed(2)}</span><span class="detail-rating">★ ${Number(product.rating || 0).toFixed(1)} &nbsp;·&nbsp; ${Number(product.stock || 0)} in stock</span><p class="detail-description">${escapeHtml(product.description || 'A thoughtfully selected piece for everyday living.')}</p><span class="detail-meta">${product.brand ? `By ${escapeHtml(product.brand)} · ` : ''}Product no. ${Number(product.id)}</span><div class="detail-controls"><button type="button" data-action="edit" data-id="${Number(product.id)}">Edit piece&nbsp; ✎</button><button type="button" data-action="delete" data-id="${Number(product.id)}">Remove&nbsp; ×</button></div></div></div>`;
    dialog.showModal();
  }
  function openForm(product = null) {
    $('#form-title').innerHTML = product ? 'Edit a <em>piece.</em>' : 'Add a <em>piece.</em>';
    $('#product-id').value = product ? product.id : '';
    $('#product-title').value = product?.title || '';
    $('#product-price').value = product?.price ?? '';
    $('#product-category').value = product?.category || '';
    $('#product-description').value = product?.description || '';
    $('#product-image').value = safeImage(product?.thumbnail || product?.images?.[0] || '') || '';
    $('#save-product').innerHTML = product ? 'Save changes <span>↗</span>' : 'Save product <span>↗</span>';
    $('#product-dialog').close();
    $('#form-dialog').showModal();
  }
  async function saveProduct(event) {
    event.preventDefault();
    const id = $('#product-id').value;
    const previous = id ? findProduct(id) : null;
    const image = safeImage($('#product-image').value);
    const body = { title: $('#product-title').value.trim(), price: Number($('#product-price').value), category: $('#product-category').value.trim().toLowerCase().replaceAll(' ', '-'), description: $('#product-description').value.trim(), ...(image ? { thumbnail: image, images: [image] } : {}) };
    const button = $('#save-product'); button.disabled = true;
    try {
      const response = await fetch(id ? `${API}/${encodeURIComponent(id)}` : `${API}/add`, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error('The product could not be saved. Please try again.');
      const result = await response.json();
      const saved = readSaved();
      const product = { ...(previous || { id: result.id, rating: 0, stock: 0 }), ...body, ...(image ? {} : { thumbnail: previous?.thumbnail || result.thumbnail || '', images: previous?.images || [] }) };
      if (id) { saved.overrides[id] = product; state.products = state.products.map(p => Number(p.id) === Number(id) ? product : p); }
      else { product.id = Math.max(194, ...state.products.map(p => Number(p.id) || 0)) + 1; saved.added.push(product); state.products.unshift(product); }
      saveSaved(saved);
      state.categories = [...new Set(state.products.map(p => p.category).filter(Boolean))].sort();
      state.activeCategory = 'all'; state.shown = Math.max(PAGE_SIZE, state.shown); $('#form-dialog').close(); render(); notify(id ? 'Your changes are saved on this device.' : 'Your new piece is in the collection.');
    } catch (error) { notify(error.message); }
    finally { button.disabled = false; }
  }
  async function deleteProduct(id) {
    const product = findProduct(id); if (!product) return;
    if (!window.confirm(`Remove “${product.title}” from this collection?`)) return;
    try {
      const response = await fetch(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('The product could not be removed. Please try again.');
      const saved = readSaved();
      if (saved.added.some(p => Number(p.id) === Number(id))) saved.added = saved.added.filter(p => Number(p.id) !== Number(id));
      else saved.deleted.push(Number(id));
      delete saved.overrides[id]; saveSaved(saved);
      state.products = state.products.filter(p => Number(p.id) !== Number(id));
      state.categories = [...new Set(state.products.map(p => p.category).filter(Boolean))].sort();
      $('#product-dialog').close(); render(); notify('Piece removed from this device.');
    } catch (error) { notify(error.message); }
  }
  filters.addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (!button) return; state.activeCategory = button.dataset.category; state.shown = PAGE_SIZE; render(); });
  $('#search-input').addEventListener('input', event => { state.query = event.target.value.trim(); state.shown = PAGE_SIZE; render(); });
  $('#sort-select').addEventListener('change', event => { state.sort = event.target.value; render(); });
  $('#load-more').addEventListener('click', () => { state.shown += PAGE_SIZE; render(); });
  $('#clear-filters').addEventListener('click', () => { state.query = ''; state.activeCategory = 'all'; $('#search-input').value = ''; render(); });
  $('#add-product').addEventListener('click', () => openForm());
  $('#product-form').addEventListener('submit', saveProduct);
  $('.form-cancel').addEventListener('click', () => $('#form-dialog').close());
  document.querySelectorAll('.dialog-close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  [$('#form-dialog'), $('#product-dialog')].forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
  document.addEventListener('click', event => { const target = event.target.closest('[data-action]'); if (!target) return; const product = findProduct(target.dataset.id); if (!product) return; if (target.dataset.action === 'view') openDetails(product); if (target.dataset.action === 'edit') openForm(product); if (target.dataset.action === 'delete') deleteProduct(product.id); });
  document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search-input').focus(); } if (event.key === 'Enter' && event.target.matches('.product-title')) openDetails(findProduct(event.target.dataset.id)); });
  $('#year').textContent = new Date().getFullYear();
  loadProducts();
})();
