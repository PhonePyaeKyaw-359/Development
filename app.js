(() => {
  'use strict';

  const API = 'https://dummyjson.com/products';
  const STORAGE_KEY = 'fieldwork-catalog-v2';
  const PAGE_SIZE = 20;
  const state = { products: [], categories: [], query: '', category: 'all', sort: 'featured', shown: PAGE_SIZE, loading: false };
  const $ = (selector, root = document) => root.querySelector(selector);
  const grid = $('#product-grid');
  const toast = $('#toast');
  let toastTimer;

  function readSaved() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { overrides: data.overrides || {}, added: Array.isArray(data.added) ? data.added : [], deleted: Array.isArray(data.deleted) ? data.deleted : [] };
    } catch { return { overrides: {}, added: [], deleted: [] }; }
  }
  function persist(saved) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); return true; }
    catch { notify('Could not save to browser storage. Free up space and try again.'); return false; }
  }
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }
  function safeImage(value) {
    try { const image = new URL(value); return image.protocol === 'https:' ? image.href : ''; }
    catch { return ''; }
  }
  function money(value) { return `$${Number(value || 0).toFixed(2)}`; }
  function stockState(stock) {
    if (Number(stock) <= 0) return ['out', 'Out of stock'];
    if (Number(stock) <= 10) return ['low', `${Number(stock)} left`];
    return ['', 'In stock'];
  }
  function readImage(product) { return safeImage(product.thumbnail || product.images?.[0] || ''); }

  function renderSkeletons() {
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = Array.from({ length: 10 }, () => '<div class="skeleton-card" aria-hidden="true"><div class="skeleton-image"></div><div class="skeleton-body"><div class="skeleton-line short"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>').join('');
    $('#result-count').textContent = 'Loading products from DummyJSON…';
  }
  function filteredProducts() {
    let products = state.products.filter(product => state.category === 'all' || product.category === state.category);
    if (state.query) {
      const query = state.query.toLowerCase();
      products = products.filter(product => `${product.title} ${product.description} ${product.category} ${product.brand || ''} ${(product.tags || []).join(' ')}`.toLowerCase().includes(query));
    }
    if (state.sort === 'title-asc') products.sort((a, b) => a.title.localeCompare(b.title));
    if (state.sort === 'price-asc') products.sort((a, b) => Number(a.price) - Number(b.price));
    if (state.sort === 'price-desc') products.sort((a, b) => Number(b.price) - Number(a.price));
    if (state.sort === 'rating-desc') products.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    return products;
  }
  function renderCategoryOptions() {
    const select = $('#category-select');
    const current = state.category;
    select.innerHTML = '<option value="all">All categories</option>' + state.categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category.replaceAll('-', ' '))}</option>`).join('');
    select.value = state.categories.includes(current) || current === 'all' ? current : 'all';
    state.category = select.value;
  }
  function renderSummary() {
    const count = state.products.length;
    const rating = count ? state.products.reduce((sum, item) => sum + Number(item.rating || 0), 0) / count : 0;
    const averagePrice = count ? state.products.reduce((sum, item) => sum + Number(item.price || 0), 0) / count : 0;
    $('#summary-products').textContent = count.toLocaleString();
    $('#summary-categories').textContent = state.categories.length.toLocaleString();
    $('#summary-rating').textContent = count ? `${rating.toFixed(1)} / 5` : '—';
    $('#summary-price').textContent = count ? money(averagePrice) : '—';
  }
  function productCard(product, index) {
    const image = readImage(product);
    const [stockClass, stockLabel] = stockState(product.stock);
    return `<article class="product-card" style="animation-delay:${Math.min(index, 10) * 25}ms">
      <div class="product-image-wrap"><span class="product-image-fallback">${escapeHtml((product.title || 'P').trim().charAt(0).toUpperCase())}</span>${image ? `<img class="product-image" src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.remove()">` : ''}<span class="product-tag">${escapeHtml(product.category || 'Uncategorized').replaceAll('-', ' ')}</span><span class="stock-pill ${stockClass}">${stockLabel}</span></div>
      <div class="product-info"><div class="product-brand">${escapeHtml(product.brand || 'Independent')}</div><h3 class="product-title" role="button" tabindex="0" data-action="view" data-id="${Number(product.id)}" title="View ${escapeHtml(product.title)}">${escapeHtml(product.title)}</h3><div class="product-stats"><span class="product-price">${money(product.price)}</span><span class="product-rating"><span class="star">★</span> ${Number(product.rating || 0).toFixed(1)} <span aria-label="available stock">· ${Number(product.stock || 0)} pcs</span></span></div><div class="product-actions"><button type="button" data-action="view" data-id="${Number(product.id)}" aria-label="View ${escapeHtml(product.title)}">View</button><button type="button" data-action="edit" data-id="${Number(product.id)}" aria-label="Edit ${escapeHtml(product.title)}">Edit</button><button type="button" class="delete-action" data-action="delete" data-id="${Number(product.id)}" aria-label="Delete ${escapeHtml(product.title)}">Delete</button></div></div>
    </article>`;
  }
  function render() {
    renderCategoryOptions();
    renderSummary();
    const products = filteredProducts();
    const visible = products.slice(0, state.shown);
    grid.innerHTML = visible.map(productCard).join('');
    grid.setAttribute('aria-busy', 'false');
    $('#heading-count').textContent = products.length.toLocaleString();
    $('#result-count').textContent = state.query || state.category !== 'all' ? `${products.length} matching ${products.length === 1 ? 'product' : 'products'}` : `Showing ${visible.length} of ${products.length} products`;
    $('#page-count').textContent = products.length ? `Showing ${visible.length} of ${products.length}` : '';
    $('#load-more').classList.toggle('hidden', products.length <= state.shown);
    $('#empty-state').classList.toggle('hidden', state.loading || products.length > 0);
  }
  function showLoadError(error) {
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = `<div class="error-card"><div class="error-icon">!</div><h3>Products couldn't load</h3><p>${escapeHtml(error)}. Check your internet connection and make sure you're opening this project through a local web server (for example VS Code Live Server), then retry.</p><button class="retry-button" type="button" id="retry-load">Retry connection</button></div>`;
    $('#result-count').textContent = 'Waiting for API connection';
    $('#heading-count').textContent = '—';
    $('#page-count').textContent = '';
    $('#summary-products').textContent = '—';
    $('#summary-categories').textContent = '—';
    $('#summary-rating').textContent = '—';
    $('#summary-price').textContent = '—';
    $('#retry-load').addEventListener('click', loadProducts, { once: true });
  }
  async function apiRequest(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!response.ok) throw new Error(`DummyJSON returned ${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The request timed out after 15 seconds');
      if (error instanceof TypeError) throw new Error('The browser could not reach dummyjson.com');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  async function loadProducts() {
    state.loading = true;
    renderSkeletons();
    try {
      const data = await apiRequest(`${API}?limit=0`);
      if (!Array.isArray(data.products)) throw new Error('DummyJSON returned an unexpected product list');
      const saved = readSaved();
      const deleted = new Set(saved.deleted.map(Number));
      state.products = data.products.filter(product => !deleted.has(Number(product.id))).map(product => ({ ...product, ...(saved.overrides[String(product.id)] || {}) }));
      state.products.push(...saved.added);
      state.categories = [...new Set(state.products.map(product => product.category).filter(Boolean))].sort();
      state.loading = false;
      render();
    } catch (error) {
      state.loading = false;
      showLoadError(error.message || 'Unknown network error');
    }
  }
  function findProduct(id) { return state.products.find(product => Number(product.id) === Number(id)); }
  function fact(label, value) { return `<div class="detail-fact"><span>${label}</span><strong>${escapeHtml(value || '—')}</strong></div>`; }
  function openDetails(product) {
    const image = readImage(product);
    const [stockClass, stockLabel] = stockState(product.stock);
    const tags = (product.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
    $('#dialog-content').innerHTML = `<div class="detail-layout"><div class="detail-image"><span class="product-image-fallback">${escapeHtml((product.title || 'P').charAt(0).toUpperCase())}</span>${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" onerror="this.remove()">` : ''}</div><div class="detail-copy"><p class="overline">${escapeHtml(product.category || 'PRODUCT').replaceAll('-', ' ').toUpperCase()}</p><h2 id="detail-title">${escapeHtml(product.title)}</h2><span class="detail-price">${money(product.price)}</span><div class="detail-rating"><span><span class="star">★</span> ${Number(product.rating || 0).toFixed(1)} / 5</span><span class="stock-pill ${stockClass}">${stockLabel} · ${Number(product.stock || 0)} units</span></div><p class="detail-description">${escapeHtml(product.description || 'No description provided.')}</p><div class="detail-facts">${fact('Brand', product.brand)}${fact('Product ID', product.id)}${fact('SKU', product.sku)}${fact('Discount', product.discountPercentage ? `${Number(product.discountPercentage).toFixed(1)}%` : '—')}${fact('Weight', product.weight ? `${product.weight} oz` : '—')}${fact('Minimum order', product.minimumOrderQuantity)}${fact('Shipping', product.shippingInformation)}${fact('Returns', product.returnPolicy)}</div>${tags ? `<div class="detail-tags">${tags}</div>` : ''}<p class="detail-meta">Product details provided by DummyJSON</p><div class="detail-controls"><button type="button" class="secondary-button" data-action="edit" data-id="${Number(product.id)}">Edit product</button><button type="button" class="secondary-button delete-action" data-action="delete" data-id="${Number(product.id)}">Delete product</button></div></div></div>`;
    $('#product-dialog').showModal();
  }
  function openForm(product = null) {
    $('#product-form').reset();
    $('#form-error').textContent = '';
    $('#form-title').textContent = product ? 'Edit product' : 'Add product';
    $('#save-product').textContent = product ? 'Save changes' : 'Save product';
    $('#product-id').value = product?.id ?? '';
    $('#product-title').value = product?.title || '';
    $('#product-price').value = product?.price ?? '';
    $('#product-category').value = product?.category || '';
    $('#product-brand').value = product?.brand || '';
    $('#product-stock').value = product?.stock ?? '';
    $('#product-image').value = readImage(product || {});
    $('#product-description').value = product?.description || '';
    $('#product-tags').value = (product?.tags || []).join(', ');
    $('#product-dialog').close();
    $('#form-dialog').showModal();
    $('#product-title').focus();
  }
  function getFormData() {
    const url = $('#product-image').value.trim();
    if (url && !safeImage(url)) throw new Error('Image URL must start with https://');
    const stockValue = $('#product-stock').value;
    return {
      title: $('#product-title').value.trim(),
      price: Number($('#product-price').value),
      category: $('#product-category').value.trim().toLowerCase().replace(/\s+/g, '-'),
      brand: $('#product-brand').value.trim(),
      stock: stockValue === '' ? 0 : Number(stockValue),
      description: $('#product-description').value.trim(),
      tags: $('#product-tags').value.split(',').map(tag => tag.trim()).filter(Boolean),
      thumbnail: safeImage(url),
      images: safeImage(url) ? [safeImage(url)] : [],
    };
  }
  async function saveProduct(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    let body;
    try { body = getFormData(); }
    catch (error) { $('#form-error').textContent = error.message; return; }
    if (!Number.isFinite(body.price) || body.price < 0) { $('#form-error').textContent = 'Price must be zero or more.'; return; }
    const id = $('#product-id').value;
    const previous = id ? findProduct(id) : null;
    const apiId = previous?.apiId || id;
    const button = $('#save-product');
    button.disabled = true;
    button.textContent = 'Saving…';
    $('#form-error').textContent = '';
    try {
      const result = await apiRequest(id ? `${API}/${encodeURIComponent(apiId)}` : `${API}/add`, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const saved = readSaved();
      if (id) {
        const product = { ...previous, ...body };
        if (previous.apiId) saved.added = saved.added.map(item => Number(item.id) === Number(id) ? product : item);
        else saved.overrides[String(id)] = product;
        state.products = state.products.map(item => Number(item.id) === Number(id) ? product : item);
      } else {
        const localId = Math.max(194, ...state.products.map(item => Number(item.id) || 0)) + 1;
        const product = { ...result, ...body, id: localId, apiId: result.id };
        saved.added.push(product);
        state.products.unshift(product);
      }
      persist(saved);
      state.categories = [...new Set(state.products.map(product => product.category).filter(Boolean))].sort();
      state.category = 'all';
      state.shown = Math.max(PAGE_SIZE, state.shown);
      $('#form-dialog').close();
      render();
      notify(id ? 'Product updated in this browser.' : 'Product added to this browser.');
    } catch (error) {
      $('#form-error').textContent = `${error.message}. Your changes were not saved.`;
    } finally {
      button.disabled = false;
      button.textContent = id ? 'Save changes' : 'Save product';
    }
  }
  async function deleteProduct(product) {
    if (!window.confirm(`Delete “${product.title}” from this catalog on this device?`)) return;
    try {
      await apiRequest(`${API}/${encodeURIComponent(product.apiId || product.id)}`, { method: 'DELETE' });
      const saved = readSaved();
      if (product.apiId) saved.added = saved.added.filter(item => Number(item.id) !== Number(product.id));
      else {
        saved.deleted.push(Number(product.id));
        delete saved.overrides[String(product.id)];
      }
      persist(saved);
      state.products = state.products.filter(item => Number(item.id) !== Number(product.id));
      state.categories = [...new Set(state.products.map(item => item.category).filter(Boolean))].sort();
      $('#product-dialog').close();
      render();
      notify('Product deleted from this browser.');
    } catch (error) { notify(`${error.message}. Product was not deleted.`); }
  }

  $('#search-input').addEventListener('input', event => { state.query = event.target.value.trim(); state.shown = PAGE_SIZE; render(); });
  $('#category-select').addEventListener('change', event => { state.category = event.target.value; state.shown = PAGE_SIZE; render(); });
  $('#sort-select').addEventListener('change', event => { state.sort = event.target.value; render(); });
  $('#add-product').addEventListener('click', () => openForm());
  $('#refresh-products').addEventListener('click', loadProducts);
  $('#product-form').addEventListener('submit', saveProduct);
  $('#cancel-form').addEventListener('click', () => $('#form-dialog').close());
  $('#load-more').addEventListener('click', () => { state.shown += PAGE_SIZE; render(); });
  $('#clear-filters').addEventListener('click', () => { state.query = ''; state.category = 'all'; $('#search-input').value = ''; render(); });
  document.querySelectorAll('.dialog-x').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  [$('#form-dialog'), $('#product-dialog')].forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const product = findProduct(target.dataset.id);
    if (!product) return;
    if (target.dataset.action === 'view') openDetails(product);
    else if (target.dataset.action === 'edit') openForm(product);
    else if (target.dataset.action === 'delete') deleteProduct(product);
  });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search-input').focus(); }
    if (event.key === 'Enter' && event.target.matches('.product-title')) openDetails(findProduct(event.target.dataset.id));
  });

  loadProducts();
})();
