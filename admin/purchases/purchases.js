(() => {
  'use strict';

  const API = 'https://dummyjson.com';
  const ORDER_KEY = 'fieldwork-demo-orders-v1';
  const PAGE_SIZE = 20;
  const state = { orders: [], users: new Map(), query: '', source: 'all', shown: PAGE_SIZE };
  const $ = selector => document.querySelector(selector);
  const list = $('#activity-list');
  let toastTimer;

  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
  function imageUrl(value) { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } }
  function money(value) { return `$${Number(value || 0).toFixed(2)}`; }
  function readLocalOrders() { try { const value = JSON.parse(localStorage.getItem(ORDER_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
  function notify(message) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }
  async function getJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`DummyJSON returned ${response.status}`);
    return response.json();
  }
  function getUser(userId) { return state.users.get(Number(userId)) || null; }
  function userName(userId) {
    const user = getUser(userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : `Demo user #${userId || '—'}`;
  }
  function userEmail(userId) { const user = getUser(userId); return user?.email || 'User details unavailable'; }
  function avatarName(name) { return name.split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]).join('').toUpperCase() || 'U'; }
  function orderProducts(order) { return Array.isArray(order.products) ? order.products : (order.apiCart?.products || []); }
  function orderQuantity(order) { return Number(order.totalQuantity) || orderProducts(order).reduce((sum, product) => sum + Number(product.quantity || 0), 0) || Number(order.quantity || 0); }
  function orderTotal(order) { return Number(order.total ?? order.discountedTotal ?? order.apiCart?.discountedTotal ?? order.apiCart?.total ?? 0); }
  function normalizeCart(cart) { return { ...cart, source: 'api', userId: cart.userId, products: cart.products || [], id: cart.id, total: cart.discountedTotal ?? cart.total }; }
  function normalizeLocal(order) {
    const cart = order.apiCart || {};
    return { ...cart, source: 'local', localDate: order.date, id: order.id, apiCartId: order.apiCartId, subtotal: order.subtotal, shipping: order.shipping, userId: cart.userId || 1, products: cart.products || [], total: order.total ?? cart.discountedTotal ?? cart.total ?? 0, totalQuantity: order.quantity || cart.totalQuantity };
  }
  function visibleOrders() {
    let orders = state.orders.filter(order => state.source === 'all' || (state.source === 'local' ? order.source === 'local' : order.source === 'api'));
    if (state.query) {
      const query = state.query.toLowerCase();
      orders = orders.filter(order => `${userName(order.userId)} ${userEmail(order.userId)} ${order.id} ${(orderProducts(order).map(product => `${product.title} ${product.id}`).join(' '))}`.toLowerCase().includes(query));
    }
    return orders;
  }
  function displayDate(order) {
    if (!order.localDate) return 'DummyJSON sample';
    const date = new Date(order.localDate);
    return Number.isNaN(date.getTime()) ? 'Demo order' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function orderCard(order) {
    const products = orderProducts(order);
    const first = products[0] || {};
    const image = imageUrl(first.thumbnail || first.images?.[0] || '');
    const productCount = products.length;
    const productNames = products.slice(0,2).map(product => product.title || `Product #${product.id}`).join(', ');
    const remaining = productCount > 2 ? ` + ${productCount - 2} more` : '';
    const name = userName(order.userId);
    const ref = order.source === 'local' ? `Demo order #${order.id}` : `Cart #${order.id}`;
    return `<article class="purchase-row"><div class="purchase-user"><span class="user-avatar">${escapeHtml(avatarName(name))}</span><div class="user-copy"><div class="user-name">${escapeHtml(name)}</div><div class="user-email">${escapeHtml(userEmail(order.userId))}</div><div class="order-ref">${ref} · ${escapeHtml(displayDate(order))}</div></div></div><div class="purchase-items"><span class="mini-product">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.remove()">` : '◫'}</span><div class="items-text"><div class="items-title">${escapeHtml(productNames || 'No item details returned')}${remaining}</div><div class="items-more">${productCount} ${productCount === 1 ? 'product' : 'products'} · ${orderQuantity(order)} ${orderQuantity(order) === 1 ? 'item' : 'items'}</div></div></div><span class="purchase-qty">${orderQuantity(order)} pcs</span><strong class="purchase-total">${money(orderTotal(order))}</strong><button class="view-order" type="button" data-view-order="${escapeHtml(order.source)}:${Number(order.id)}">View order</button><span class="source-badge ${order.source === 'local' ? 'local' : ''}">${order.source === 'local' ? 'This browser' : 'API sample'}</span></article>`;
  }
  function renderSummary() {
    const customers = new Set(state.orders.map(order => Number(order.userId)).filter(Boolean));
    const items = state.orders.reduce((sum, order) => sum + orderQuantity(order), 0);
    const value = state.orders.reduce((sum, order) => sum + orderTotal(order), 0);
    $('#total-carts').textContent = state.orders.length.toLocaleString();
    $('#total-customers').textContent = customers.size.toLocaleString();
    $('#total-items').textContent = items.toLocaleString();
    $('#total-value').textContent = money(value);
  }
  function render() {
    const orders = visibleOrders();
    const shown = orders.slice(0, state.shown);
    renderSummary();
    list.innerHTML = shown.map(orderCard).join('') || '<div class="empty-state"><strong>No matching activity</strong>Try a different name, email, product or source.</div>';
    list.setAttribute('aria-busy', 'false');
    $('#record-count').textContent = state.orders.length.toLocaleString();
    $('#activity-count').textContent = `${orders.length} ${orders.length === 1 ? 'purchase' : 'purchases'}${state.query || state.source !== 'all' ? ' found' : ' in this activity feed'}`;
    $('#list-count').textContent = `Showing ${shown.length} of ${orders.length}`;
    $('#load-more').classList.toggle('hidden', orders.length <= state.shown);
  }
  function showError(error) {
    list.setAttribute('aria-busy', 'false');
    list.innerHTML = `<div class="error-state"><strong>Purchase activity couldn't load</strong>${escapeHtml(error)}. Check the connection to DummyJSON and try again.<br><button type="button" id="retry-activity">Retry</button></div>`;
    $('#activity-count').textContent = 'Waiting for API connection';
    $('#retry-activity').addEventListener('click', loadActivity, { once: true });
  }
  async function loadActivity() {
    list.setAttribute('aria-busy', 'true');
    list.innerHTML = '<div class="loading-state"><strong>Loading customer activity…</strong>Fetching carts and customer details from DummyJSON.</div>';
    $('#activity-count').textContent = 'Loading purchases…';
    try {
      const [cartData, userData] = await Promise.all([getJson('https://dummyjson.com/carts?limit=0'), getJson('https://dummyjson.com/users?limit=0')]);
      if (!Array.isArray(cartData.carts) || !Array.isArray(userData.users)) throw new Error('DummyJSON returned an unexpected response.');
      state.users = new Map(userData.users.map(user => [Number(user.id), user]));
      const apiOrders = cartData.carts.map(normalizeCart);
      const localOrders = readLocalOrders().map(normalizeLocal);
      state.orders = [...localOrders.sort((a,b) => new Date(b.localDate || 0) - new Date(a.localDate || 0)), ...apiOrders.sort((a,b) => Number(b.id) - Number(a.id))];
      render();
    } catch (error) { showError(error.message || 'Network error'); }
  }
  function viewOrder(key) {
    const [source, id] = key.split(':');
    const order = state.orders.find(item => item.source === source && Number(item.id) === Number(id));
    if (!order) return;
    const user = getUser(order.userId);
    const name = userName(order.userId);
    const address = user?.address ? [user.address.address, user.address.city, user.address.state, user.address.postalCode].filter(Boolean).join(', ') : 'Demo customer record';
    const products = orderProducts(order);
    const date = displayDate(order);
    $('#purchase-details').innerHTML = `<div class="detail-heading"><p class="overline">${source === 'local' ? 'LOCAL DEMO ORDER' : 'DUMMYJSON SAMPLE CART'} <span>/</span> ${source === 'local' ? 'ORDER' : 'CART'} #${Number(id)}</p><h2>Purchase details</h2><p>${escapeHtml(date)} · User ID ${Number(order.userId) || '—'}</p></div><div class="detail-user"><span class="user-avatar">${escapeHtml(avatarName(name))}</span><div><div class="user-name">${escapeHtml(name)}</div><div class="user-email">${escapeHtml(userEmail(order.userId))}</div><div class="detail-user-meta">${escapeHtml(address)}</div></div></div><div class="detail-products">${products.map(product => { const image = imageUrl(product.thumbnail || product.images?.[0] || ''); const quantity = Number(product.quantity || 0); const lineTotal = Number(product.discountedTotal || product.discountedPrice || product.total || (Number(product.price || 0) * quantity)); return `<div class="detail-product"><span class="detail-product-image">${image ? `<img src="${escapeHtml(image)}" alt="" onerror="this.remove()">` : '◫'}</span><div><div class="detail-product-name">${escapeHtml(product.title || `Product #${product.id}`)}</div><div class="detail-product-meta">${money(product.price)} each · quantity ${quantity}</div></div><strong class="detail-product-total">${money(lineTotal)}</strong></div>`; }).join('') || '<div class="empty-state">No product details returned.</div>'}</div><div class="detail-total"><span>Cart total</span><strong>${money(orderTotal(order))}</strong></div>`;
    $('#purchase-dialog').showModal();
  }

  $('#refresh-orders').addEventListener('click', loadActivity);
  $('#order-search').addEventListener('input', event => { state.query = event.target.value.trim(); state.shown = PAGE_SIZE; render(); });
  $('#source-filter').addEventListener('change', event => { state.source = event.target.value; state.shown = PAGE_SIZE; render(); });
  $('#load-more').addEventListener('click', () => { state.shown += PAGE_SIZE; render(); });
  $('#activity-list').addEventListener('click', event => { const button = event.target.closest('[data-view-order]'); if (button) viewOrder(button.dataset.viewOrder); });
  $('.close-button').addEventListener('click', () => $('#purchase-dialog').close());
  $('#purchase-dialog').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
  loadActivity();
})();
