(() => {
  'use strict';

  const PRODUCTS_API = 'https://dummyjson.com/products';
  const CARTS_API = 'https://dummyjson.com/carts';
  const CATALOG_KEY = 'fieldwork-catalog-v2';
  const CART_KEY = 'fieldwork-shop-cart-v1';
  const ORDER_KEY = 'fieldwork-demo-orders-v1';
  const USER_KEY = 'fieldwork-current-user-v1';
  const FREE_SHIPPING_AT = 75;
  const SHIPPING_FEE = 6.95;
  const PAGE_SIZE = 16;
  const state = { products: [], categories: [], query: '', category: 'all', sort: 'featured', shown: PAGE_SIZE, cart: [], user: null, loading: true };
  const $ = (selector, root = document) => root.querySelector(selector);
  const grid = $('#store-grid');
  const toast = $('#store-toast');
  let toastTimer;

  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  function imageUrl(value) { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } }
  function imageOf(product) { return imageUrl(product?.thumbnail || product?.images?.[0] || ''); }
  function money(value) { return `$${Number(value || 0).toFixed(2)}`; }
  function notify(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2800); }
  function safeRead(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value ?? fallback; } catch { return fallback; } }
  function safeWrite(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { notify('Your browser storage is full.'); return false; } }
  state.user = safeRead(USER_KEY, null);
  function renderAccount() {
    const button = $('#account-action');
    button.classList.toggle('signed-in', Boolean(state.user));
    button.textContent = state.user ? `Hi, ${state.user.firstName || state.user.username}` : 'Sign in';
    button.title = state.user ? 'Click to sign out' : 'Sign in with a DummyJSON user';
    button.setAttribute('aria-label', state.user ? `Signed in as ${state.user.firstName || state.user.username}. Click to sign out.` : 'Sign in');
  }
  function apiRequest(url, options = {}) {
    return fetch(url, options).then(async response => {
      if (!response.ok) throw new Error(`DummyJSON returned ${response.status}`);
      return response.json();
    }).catch(error => {
      if (error instanceof TypeError) throw new Error('Could not connect to DummyJSON. Check your internet connection.');
      throw error;
    });
  }
  function overlayCatalog(products) {
    const saved = safeRead(CATALOG_KEY, { overrides: {}, added: [], deleted: [] });
    const deleted = new Set((saved.deleted || []).map(Number));
    const list = products.filter(product => !deleted.has(Number(product.id))).map(product => ({ ...product, ...(saved.overrides?.[String(product.id)] || {}) }));
    list.push(...(saved.added || []));
    return list;
  }
  function filteredProducts() {
    let products = state.products.filter(product => state.category === 'all' || product.category === state.category);
    if (state.query) {
      const query = state.query.toLowerCase();
      products = products.filter(product => `${product.title} ${product.description} ${product.brand || ''} ${product.category} ${(product.tags || []).join(' ')}`.toLowerCase().includes(query));
    }
    if (state.sort === 'title-asc') products.sort((a,b) => a.title.localeCompare(b.title));
    if (state.sort === 'price-asc') products.sort((a,b) => Number(a.price) - Number(b.price));
    if (state.sort === 'price-desc') products.sort((a,b) => Number(b.price) - Number(a.price));
    if (state.sort === 'rating-desc') products.sort((a,b) => Number(b.rating || 0) - Number(a.rating || 0));
    return products;
  }
  function productCard(product, index) {
    const image = imageOf(product);
    const discount = Number(product.discountPercentage || 0);
    return `<article class="shop-card" style="animation-delay:${Math.min(index, 10) * 25}ms"><div class="shop-image"><span class="shop-placeholder">${escapeHtml((product.title || 'F').charAt(0).toUpperCase())}</span>${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.remove()">` : ''}${discount > 0 ? `<span class="image-badge">${Math.round(discount)}% off</span>` : ''}<button class="quick-view" type="button" data-action="view" data-id="${Number(product.id)}">Take a closer look&nbsp; ↗</button></div><div class="shop-product-info"><span class="shop-category">${escapeHtml(product.category || 'Everyday').replaceAll('-', ' ')}</span><div class="shop-title-row"><h3 class="shop-title" data-action="view" data-id="${Number(product.id)}" tabindex="0">${escapeHtml(product.title)}</h3><span class="shop-price">${money(product.price)}</span></div><div class="shop-rating"><span class="star">★</span> ${Number(product.rating || 0).toFixed(1)} <span>· ${Number(product.stock || 0)} available</span></div><button class="shop-add" type="button" data-action="add" data-id="${Number(product.id)}" ${Number(product.stock) <= 0 ? 'disabled' : ''}>${Number(product.stock) <= 0 ? 'Currently unavailable' : 'Add to bag'} <span>＋</span></button></div></article>`;
  }
  function renderCategories() {
    const categories = ['all', ...state.categories];
    $('#category-tabs').innerHTML = categories.map(category => `<button type="button" class="category-tab ${state.category === category ? 'active' : ''}" data-category="${escapeHtml(category)}">${category === 'all' ? 'All things' : escapeHtml(category.replaceAll('-', ' '))}<span>${category === 'all' ? state.products.length : state.products.filter(p => p.category === category).length}</span></button>`).join('');
  }
  function render() {
    renderCategories();
    const products = filteredProducts();
    const visible = products.slice(0, state.shown);
    grid.innerHTML = visible.map(productCard).join('');
    grid.setAttribute('aria-busy', 'false');
    $('#store-count').textContent = state.query || state.category !== 'all' ? `${products.length} lovely ${products.length === 1 ? 'find' : 'finds'}` : `${products.length} things worth keeping`;
    $('#store-empty').classList.toggle('hidden', state.loading || products.length > 0);
    $('#store-load-more').classList.toggle('hidden', products.length <= state.shown);
    $('#bag-count').textContent = cartQuantity();
    if (state.products.length) {
      const first = state.products.find(product => imageOf(product));
      const second = state.products.find(product => imageOf(product) && product.id !== first?.id);
      setHeroImage($('#hero-image-main'), first);
      setHeroImage($('#hero-image-small'), second);
    }
  }
  function setHeroImage(element, product) {
    if (!element || !product || element.dataset.product === String(product.id)) return;
    element.dataset.product = product.id;
    const image = imageOf(product);
    element.innerHTML = `<span class="hero-image-placeholder">${escapeHtml(product.title)}</span>${image ? `<img src="${escapeHtml(image)}" alt="Featured: ${escapeHtml(product.title)}" onerror="this.remove()">` : ''}`;
  }
  function showSkeletons() {
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = Array.from({ length: 8 }, () => '<article class="shop-card skeleton-product"><div class="shop-image store-skeleton"></div><div class="shop-product-info"><div class="skeleton-text store-skeleton"></div><div class="skeleton-text store-skeleton"></div></div></article>').join('');
    $('#store-count').textContent = 'Finding the good stuff…';
  }
  async function loadProducts() {
    state.loading = true;
    showSkeletons();
    try {
      const data = await apiRequest(`${PRODUCTS_API}?limit=0`);
      if (!Array.isArray(data.products)) throw new Error('DummyJSON did not return a product list');
      state.products = overlayCatalog(data.products);
      state.categories = [...new Set(state.products.map(product => product.category).filter(Boolean))].sort();
      state.loading = false;
      render();
    } catch (error) {
      state.loading = false;
      grid.setAttribute('aria-busy', 'false');
      grid.innerHTML = `<div class="store-error"><h3>We lost the thread</h3><p>${escapeHtml(error.message)} Make sure this page is served over HTTP (VS Code Live Server works), then try again.</p><button type="button" id="retry-store">Try again</button></div>`;
      $('#store-count').textContent = 'Catalog unavailable';
      $('#retry-store').addEventListener('click', loadProducts, { once: true });
    }
  }
  function findProduct(id) { return state.products.find(product => Number(product.id) === Number(id)); }
  function openDetails(product) {
    const image = imageOf(product);
    $('#store-detail-content').innerHTML = `<div class="store-detail-layout"><div class="store-detail-image"><span class="shop-placeholder">${escapeHtml((product.title || 'F').charAt(0).toUpperCase())}</span>${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" onerror="this.remove()">` : ''}</div><div class="store-detail-copy"><span class="section-kicker">${escapeHtml(product.category || 'EVERYDAY').replaceAll('-', ' ').toUpperCase()}</span><h2 id="store-detail-title">${escapeHtml(product.title)}</h2><span class="store-detail-price">${money(product.price)}</span><div class="store-detail-rating"><span class="star">★</span> ${Number(product.rating || 0).toFixed(1)} / 5 &nbsp;·&nbsp; ${Number(product.stock || 0)} in stock</div><p class="store-detail-description">${escapeHtml(product.description || 'A good thing for everyday.')}</p><div class="store-detail-meta">${product.brand ? `A ${escapeHtml(product.brand)} piece<br>` : ''}${product.shippingInformation ? `${escapeHtml(product.shippingInformation)}<br>` : 'Carefully packed and sent with love.<br>'}${product.returnPolicy ? escapeHtml(product.returnPolicy) : 'Simple, thoughtful returns.'}</div><button class="add-detail" type="button" data-action="add" data-id="${Number(product.id)}" ${Number(product.stock) <= 0 ? 'disabled' : ''}>${Number(product.stock) <= 0 ? 'Currently unavailable' : 'Add to bag · ' + money(product.price)}</button></div></div>`;
    $('#store-detail').showModal();
  }
  function cartQuantity() { return state.cart.reduce((total, item) => total + Number(item.quantity), 0); }
  function cartSubtotal() { return state.cart.reduce((total, item) => total + (Number(findProduct(item.id)?.price) || 0) * Number(item.quantity), 0); }
  function addToBag(product) {
    if (!product || Number(product.stock) <= 0) return;
    const existing = state.cart.find(item => Number(item.id) === Number(product.id));
    if (existing) {
      if (existing.quantity >= Number(product.stock)) { notify(`Only ${Number(product.stock)} available.`); return; }
      existing.quantity += 1;
    } else state.cart.push({ id: product.id, quantity: 1 });
    safeWrite(CART_KEY, state.cart);
    render(); renderCart();
    notify('Added to your bag. Good choice.');
  }
  function removeCartLine(id) { state.cart = state.cart.filter(item => Number(item.id) !== Number(id)); safeWrite(CART_KEY, state.cart); render(); renderCart(); }
  function updateQuantity(id, difference) {
    const item = state.cart.find(line => Number(line.id) === Number(id));
    const product = findProduct(id);
    if (!item || !product) return;
    const quantity = item.quantity + difference;
    if (quantity <= 0) return removeCartLine(id);
    if (quantity > Number(product.stock)) { notify(`Only ${Number(product.stock)} available.`); return; }
    item.quantity = quantity;
    safeWrite(CART_KEY, state.cart); render(); renderCart();
  }
  function renderCart() {
    state.cart = state.cart.filter(item => findProduct(item.id));
    const count = cartQuantity();
    const subtotal = cartSubtotal();
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_AT ? 0 : SHIPPING_FEE;
    $('#drawer-count').textContent = `(${count})`;
    $('#bag-count').textContent = count;
    $('#cart-subtotal').textContent = money(subtotal);
    $('#cart-shipping').textContent = shipping ? money(shipping) : subtotal ? 'On us' : '—';
    $('#cart-total').textContent = money(subtotal + shipping);
    $('#checkout-open').disabled = !count;
    $('#checkout-item-count').textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
    $('#checkout-total').textContent = money(subtotal + shipping);
    const progress = Math.min(100, subtotal / FREE_SHIPPING_AT * 100);
    $('#shipping-progress').style.width = `${progress}%`;
    $('#shipping-message').innerHTML = !count ? 'Add something lovely to get started.' : subtotal >= FREE_SHIPPING_AT ? '<strong>You unlocked free shipping. Nice.</strong>' : `You're ${money(FREE_SHIPPING_AT - subtotal)} away from free shipping.`;
    $('#cart-lines').innerHTML = count ? state.cart.map(item => {
      const product = findProduct(item.id);
      const image = imageOf(product);
      return `<article class="cart-line"><div class="cart-line-image">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" onerror="this.remove()">` : ''}</div><div><div class="cart-line-category">${escapeHtml(product.category || 'Everyday')}</div><h3 class="cart-line-name">${escapeHtml(product.title)}</h3><span class="cart-line-price">${money(product.price)}</span></div><div class="cart-line-right"><div class="qty-control"><button type="button" data-cart-action="decrease" data-id="${Number(item.id)}" aria-label="Decrease quantity">−</button><span>${Number(item.quantity)}</span><button type="button" data-cart-action="increase" data-id="${Number(item.id)}" aria-label="Increase quantity">＋</button></div><button class="remove-line" type="button" data-cart-action="remove" data-id="${Number(item.id)}">Remove</button></div></article>`;
    }).join('') : '<div class="cart-empty"><span class="empty-bag">◌</span><h3>Your bag is taking a breather.</h3><p>It could use a good find or two.</p><button type="button" id="empty-shop">Keep browsing</button></div>';
    $('#empty-shop')?.addEventListener('click', () => $('#cart-drawer').close());
    safeWrite(CART_KEY, state.cart);
  }
  function openCart() { renderCart(); $('#cart-drawer').showModal(); }
  function openCheckout() {
    if (!state.cart.length) return;
    if (!state.user?.id || !state.user?.accessToken) {
      $('#cart-drawer').close();
      $('#auth-modal').showModal();
      notify('Sign in first so the order is linked to your user profile.');
      return;
    }
    const customerName = `${state.user.firstName || ''} ${state.user.lastName || ''}`.trim() || state.user.username;
    const initials = customerName.split(/\s+/).map(part => part[0]).slice(0,2).join('').toUpperCase();
    $('#checkout-customer').innerHTML = `<span class="checkout-avatar">${escapeHtml(initials)}</span><div><div class="checkout-user-name">Order for ${escapeHtml(customerName)}</div><div class="checkout-user-email">${escapeHtml(state.user.email || state.user.username)}</div></div>`;
    $('#checkout-total').textContent = money(cartSubtotal() + (cartSubtotal() >= FREE_SHIPPING_AT ? 0 : SHIPPING_FEE));
    $('#checkout-item-count').textContent = `${cartQuantity()} ${cartQuantity() === 1 ? 'item' : 'items'}`;
    $('#cart-drawer').close();
    $('#checkout-modal').showModal();
  }
  async function placeOrder(event) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity() || !state.cart.length) return;
    if (!state.user?.id || !state.user?.accessToken) { $('#checkout-modal').close(); $('#auth-modal').showModal(); return; }
    const button = $('#place-order');
    button.disabled = true; button.innerHTML = 'Placing your demo order…';
    const products = state.cart.map(item => {
      const product = findProduct(item.id);
      return { id: Number(product?.apiId || product?.id), quantity: Number(item.quantity) };
    });
    try {
      const verifiedUser = await apiRequest('https://dummyjson.com/auth/me', { headers: { Authorization: `Bearer ${state.user.accessToken}` } });
      if (Number(verifiedUser.id) !== Number(state.user.id)) throw new Error('Your session changed. Please sign in again.');
      const response = await apiRequest(`${CARTS_API}/add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: state.user.id, products }) });
      const subtotal = cartSubtotal();
      const shipping = subtotal >= FREE_SHIPPING_AT ? 0 : SHIPPING_FEE;
      const total = subtotal + shipping;
      const order = { id: Date.now(), apiCartId: response.id, date: new Date().toISOString(), quantity: cartQuantity(), subtotal, shipping, total, apiCart: response };
      const orders = safeRead(ORDER_KEY, []); orders.push(order); safeWrite(ORDER_KEY, orders);
      state.cart = []; safeWrite(CART_KEY, []); render(); renderCart();
      $('#checkout-modal').close();
      $('#success-message').textContent = `${customerNameFor(state.user)} · demo order #${response.id} · ${order.quantity} ${order.quantity === 1 ? 'item' : 'items'} · ${money(total)}.`;
      $('#success-modal').showModal();
    } catch (error) { notify(`${error.message} Your bag is still here.`); }
    finally { button.disabled = false; button.innerHTML = 'Place demo order <span>↗</span>'; }
  }

  function customerNameFor(user) { return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username; }
  async function signIn(event) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const button = $('#sign-in');
    button.disabled = true;
    button.textContent = 'Signing in…';
    $('#auth-error').textContent = '';
    try {
      const result = await apiRequest('https://dummyjson.com/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: $('#auth-username').value.trim(), password: $('#auth-password').value, expiresInMins: 60 }) });
      if (!result.accessToken || !result.id) throw new Error('The response did not include an active user session.');
      state.user = { id: result.id, username: result.username, firstName: result.firstName, lastName: result.lastName, email: result.email, image: result.image, accessToken: result.accessToken, refreshToken: result.refreshToken };
      safeWrite(USER_KEY, state.user);
      renderAccount();
      $('#auth-password').value = '';
      $('#auth-modal').close();
      notify(`Welcome, ${state.user.firstName || state.user.username}.`);
    } catch (error) { $('#auth-error').textContent = `${error.message} Check the username and password.`; }
    finally { button.disabled = false; button.innerHTML = 'Sign in with DummyJSON <span>↗</span>'; }
  }
  function accountAction() {
    if (state.user) {
      if (!window.confirm(`Sign out ${state.user.firstName || state.user.username}?`)) return;
      state.user = null;
      localStorage.removeItem(USER_KEY);
      renderAccount();
      notify('You are signed out.');
      return;
    }
    $('#auth-modal').showModal();
  }

  state.cart = safeRead(CART_KEY, []);
  $('#year').textContent = new Date().getFullYear();
  $('#store-search').addEventListener('input', event => { state.query = event.target.value.trim(); state.shown = PAGE_SIZE; render(); });
  $('#store-sort').addEventListener('change', event => { state.sort = event.target.value; render(); });
  $('#category-tabs').addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (!button) return; state.category = button.dataset.category; state.shown = PAGE_SIZE; render(); });
  $('#store-load-more').addEventListener('click', () => { state.shown += PAGE_SIZE; render(); });
  $('#reset-store').addEventListener('click', () => { state.category = 'all'; state.query = ''; $('#store-search').value = ''; render(); });
  $('#open-cart').addEventListener('click', openCart);
  $('#account-action').addEventListener('click', accountAction);
  $('#auth-form').addEventListener('submit', signIn);
  $('#fill-demo').addEventListener('click', () => { $('#auth-username').value = 'emilys'; $('#auth-password').value = 'emilyspass'; });
  $('#checkout-open').addEventListener('click', openCheckout);
  $('#checkout-form').addEventListener('submit', placeOrder);
  $('#continue-shopping').addEventListener('click', () => $('#success-modal').close());
  document.querySelectorAll('.modal-close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  [$('#store-detail'), $('#cart-drawer'), $('#checkout-modal'), $('#success-modal')].forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const product = findProduct(target.dataset.id);
    if (target.dataset.action === 'view' && product) openDetails(product);
    if (target.dataset.action === 'add' && product) { addToBag(product); $('#store-detail').close(); }
  });
  document.addEventListener('click', event => {
    const control = event.target.closest('[data-cart-action]');
    if (!control) return;
    const id = Number(control.dataset.id);
    if (control.dataset.cartAction === 'increase') updateQuantity(id, 1);
    if (control.dataset.cartAction === 'decrease') updateQuantity(id, -1);
    if (control.dataset.cartAction === 'remove') removeCartLine(id);
  });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#store-search').focus(); }
    if (event.key === 'Enter' && event.target.matches('.shop-title')) openDetails(findProduct(event.target.dataset.id));
  });
  renderCart();
  renderAccount();
  loadProducts();
})();
