
(() => {
  const selector = document.getElementById('project-version');
  const current = document.getElementById('current-prototype');
  const delivered = document.getElementById('delivered-prototype');
  const memberTab = document.getElementById('current-member-tab');
  const productTab = document.getElementById('current-product-tab');
  const cartTab = document.getElementById('current-cart-tab');
  const orderTab = document.getElementById('current-order-tab');
  const memberContent = document.getElementById('current-member-content');
  const orderDetail = document.getElementById('current-order-detail');
  const demoScenario = document.getElementById('current-demo-scenario');
  let activeOrderId;

  const returnDialog = document.getElementById('return-dialog');
  const returnCoupon = document.getElementById('return-coupon');
  const returnComposer = document.getElementById('return-composer');
  const returnUse = document.getElementById('return-use');
  const returnCode = document.getElementById('return-code-value');
  const returnMailSubject = document.getElementById('return-mail-subject');
  const returnMailBody = document.getElementById('return-mail-body');
  const returnCopyStatus = document.getElementById('return-copy-status');

  function showReturnComposer(open) {
    returnCoupon.hidden = open;
    returnComposer.hidden = !open;
    returnDialog.classList.toggle('is-composing', open);
    returnDialog.setAttribute('aria-labelledby', open ? 'return-composer' : 'return-coupon-title');
    if (open) {
      const orderPlaceholder = '[Enter your order number]';
      returnMailSubject.value = 'Free US Return Request';
      returnMailBody.value = `Hi FIOBOC Customer Service,

I'd like to use my Free US returns coupon to request a return for the order below.

Order number: ${orderPlaceholder}
Coupon code: ${returnCode.textContent.trim()}`;
      const orderStart = returnMailBody.value.indexOf(orderPlaceholder);
      returnMailBody.focus();
      returnMailBody.setSelectionRange(orderStart, orderStart + orderPlaceholder.length);
    } else {
      returnUse.focus();
    }
  }

  document.getElementById('return-details').addEventListener('click', () => {
    returnCopyStatus.textContent = '';
    returnDialog.showModal();
  });
  document.getElementById('return-coupon-close').addEventListener('click', () => returnDialog.close());
  returnUse.addEventListener('click', () => showReturnComposer(true));
  document.getElementById('return-mail-close').addEventListener('click', () => showReturnComposer(false));
  returnDialog.addEventListener('cancel', event => {
    if (returnComposer.hidden) return;
    event.preventDefault();
    showReturnComposer(false);
  });
  returnDialog.addEventListener('click', event => {
    if (event.target === returnDialog && returnComposer.hidden) returnDialog.close();
  });
  const discountDialog = document.getElementById('return-discount-dialog');
  document.getElementById('return-discount-details').addEventListener('click', () => discountDialog.showModal());

  const availableFilter = document.getElementById('return-rewards-available');
  const usedFilter = document.getElementById('return-rewards-used');
  const availableList = document.getElementById('return-available-list');
  const usedList = document.getElementById('return-used-list');

  function showAvailableRewards(available) {
    availableFilter.setAttribute('aria-pressed', String(available));
    usedFilter.setAttribute('aria-pressed', String(!available));
    availableList.hidden = !available;
    usedList.hidden = available;
  }

  availableFilter.addEventListener('click', () => showAvailableRewards(true));
  usedFilter.addEventListener('click', () => showAvailableRewards(false));

  async function copyRewardCode(code) {
    try {
      await navigator.clipboard.writeText(code.textContent);
      return 'Copied';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      return 'Press Ctrl+C or ⌘C to copy';
    }
  }

  document.getElementById('return-copy-code').addEventListener('click', async () => {
    returnCopyStatus.textContent = await copyRewardCode(returnCode);
  });

  current.querySelectorAll('[data-return-copy]').forEach(button => {
    let feedbackTimer;
    button.addEventListener('click', async () => {
      button.textContent = await copyRewardCode(document.getElementById(button.dataset.returnCopy));
      window.clearTimeout(feedbackTimer);
      feedbackTimer = window.setTimeout(() => { button.textContent = 'Copy code'; }, 2500);
    });
  });

  function showVersion(version, surface = 'member') {
    const showMember = version === '1.1.0' && surface === 'member';
    const showOrder = version === '1.1.0' && surface === 'order';
    if (!showMember) {
      if (returnDialog.open) returnDialog.close();
      if (discountDialog.open) discountDialog.close();
    }
    document.body.dataset.projectVersion = version;
    document.body.dataset.currentSurface = surface;
    selector.value = version;
    demoScenario.value = '';
    current.hidden = !(showMember || showOrder);
    delivered.hidden = showMember || showOrder;
    memberContent.hidden = !showMember;
    orderDetail.hidden = !showOrder;
    orderTab.setAttribute('aria-pressed', String(showOrder));
    memberTab.setAttribute('aria-pressed', String(showMember));
    productTab.setAttribute('aria-pressed', String(version === '1.1.0' && surface === 'product'));
    cartTab.setAttribute('aria-pressed', String(version === '1.1.0' && surface === 'cart'));
  }

  memberTab.addEventListener('click', () => {
    closeModal();
    showVersion('1.1.0');
    window.scrollTo(0, 0);
  });
  productTab.addEventListener('click', () => {
    closeModal();
    showVersion('1.1.0', 'product');
    productDetailOpen();
    window.scrollTo(0, 0);
  });
  cartTab.addEventListener('click', () => {
    closeModal();
    showVersion('1.1.0', 'cart');
    role = 'storefront';
    page = 'checkout';
    cartView = 'collection';
    cartOpen = true;
    render();
    window.scrollTo(0, 0);
    document.querySelector('.cart-drawer-heading .cart-close')?.focus({preventScroll: true});
  });

  function creditedOrderPoints(order) {
    return order.creditedPoints ?? state.ledger?.find(entry =>
      entry.reference === order.id && entry.label?.endsWith(' · 积分转可用')
    )?.amount;
  }

  function renderOrderDetail(order) {
    const details = order.checkoutDetails;
    const canceled = order.status === 'canceled';
    const credited = creditedOrderPoints(order);
    const isCredited = Number.isFinite(credited);
    const shipped = order.fulfilled || details.availableDay != null || isCredited;
    const status = canceled ? 'Canceled' : shipped ? 'Shipped' : 'Confirmed';
    const currency = details.currency || 'USD';
    const formatMoney = new Intl.NumberFormat('en-US', {style:'currency', currency}).format;
    const shipping = typeof details.shipping === 'number' ? details.shipping : details.shipping === '免费' ? 0 : null;
    const total = shipping === null ? null : round(details.subtotal + shipping);
    const dateLabel = order.dateLabel || new Intl.DateTimeFormat('en-US', {month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date(order.paid)));
    const points = isCredited ? credited : order.earned ?? details.earned;
    const pointsRow = !canceled && Number.isFinite(points)
      ? `<div class="order-detail-points"><dt>${isCredited ? 'Points credited' : 'Estimated points'}</dt><dd><strong class="num">${number(points)} points</strong></dd></div>`
      : '';
    orderDetail.innerHTML = `
      <header class="return-member-shell order-detail-header"><strong>FIOBOC</strong></header>
      <div class="return-member-shell order-detail-layout">
        <nav class="order-detail-nav" aria-label="Account sections">
          <strong aria-current="page">Orders</strong><span>Profile</span>
          <button type="button" data-order-member>Member Center</button>
        </nav>
        <div class="order-detail-body">
          <header class="order-detail-heading"><h1>Order ${esc(order.id)}</h1><p>${status} · ${esc(dateLabel)}</p></header>
          <section class="order-detail-card order-detail-status" aria-label="Order status">
            <h2>${status}</h2>
            <p>${canceled ? 'This order has been canceled.' : shipped ? 'Your items have shipped.' : "We're preparing these items for shipping."}</p>
          </section>
          <section class="order-detail-card" aria-label="Order summary">
            <div class="order-detail-items">${details.items.map(({line,result}) => `
              <div class="order-detail-item">
                <img src="${esc(line.image)}" alt="">
                <div class="order-detail-item-name">${esc(line.englishName || line.name)}
                  <small>${esc([line.color,line.size].filter(Boolean).join(' / '))} · Qty ${number(line.quantity)}</small>
                </div>
                <span class="num">${formatMoney(result.chosen.total)}</span>
              </div>`).join('')}</div>
            <dl class="order-detail-totals">
              <div><dt>Subtotal</dt><dd class="num">${formatMoney(details.subtotal)}</dd></div>
              <div><dt>Shipping</dt><dd class="num">${shipping === null ? 'Pending' : formatMoney(shipping)}</dd></div>
              <div class="order-detail-total"><dt>Total</dt><dd class="num">${total === null ? 'Pending' : `<small>${esc(currency)}</small>${formatMoney(total)}`}</dd></div>
              ${pointsRow}
            </dl>
          </section>
          <section class="order-detail-card order-detail-contact" aria-label="Order information">
            <div><span>Contact</span><p>${esc(details.contact.email || '—')}</p></div>
            <div><span>Ship to</span><p>${esc([details.contact.firstName,details.contact.lastName].filter(Boolean).join(' '))}<br>${esc(details.contact.street || '—')}<br>${esc([details.contact.city,details.contact.postal].filter(Boolean).join(' '))}</p></div>
            <div><span>Method</span><p>Standard shipping</p></div>
          </section>
        </div>
      </div>`;
  }

  function openOrderDetail(orderId = activeOrderId) {
    const confirmed = {
      id:'DEMO-26093',status:'paid',dateLabel:'Nov 6',
      checkoutDetails:{
        currency:'EUR',subtotal:17.95,shipping:1.95,earned:17,
        contact:{email:'alex@example.com',firstName:'Alex',lastName:'Morgan',street:'12 Demo Street',city:'Paris',postal:'75001'},
        items:[{
          line:{englishName:'Airforce 3D Embroidered Oversized Tee',color:'White',size:'S',quantity:1,image:CART_INLINE_IMAGES['hoodie-white']},
          result:{chosen:{total:17.95}}
        }]
      }
    };
    const demoOrders = [
      confirmed,
      {...confirmed,id:'DEMO-26094',status:'canceled'},
      {...confirmed,id:'DEMO-26095',fulfilled:true,dateLabel:'Oct 5',creditedPoints:17}
    ];
    const order = demoOrders.find(entry => entry.id === orderId) ?? confirmed;
    activeOrderId = order.id;
    closeModal();
    showVersion('1.1.0', 'order');
    renderOrderDetail(order);
    window.scrollTo(0, 0);
  }

  function loadDemoAccount(which) {
    scenario = which;
    init(which);
    document.getElementById('scenario').value = which;
  }

  demoScenario.addEventListener('change', () => {
    const selected = demoScenario.value;
    if (!selected) return;
    if (selected === 'member-return') {
      memberTab.click();
      document.getElementById('return-rewards-available').click();
      document.getElementById('return-details').click();
    } else if (selected === 'product-vip2' || selected === 'product-guest') {
      loadDemoAccount(selected === 'product-guest' ? 'new' : 'vip2');
      productTab.click();
    } else if (selected === 'cart-rules') {
      if (!state.qty) loadDemoAccount('vip2');
      cartTab.click();
      document.querySelector('.cart-drawer [data-action="cart-points-rules"]')?.click();
    } else {
      openOrderDetail(selected);
    }
    demoScenario.value = selected;
  });

  orderTab.addEventListener('click', () => openOrderDetail());
  document.getElementById('current-member-orders').addEventListener('click', () => openOrderDetail());
  orderDetail.addEventListener('click', event => {
    if (event.target.closest('[data-order-member]')) memberTab.click();
  });

  selector.addEventListener('change', () => {
    showVersion(selector.value);
    if (selector.value === '1.0.0') render();
    window.scrollTo(0, 0);
  });

  // Keep existing links to a demo page, scenario or presentation working.
  const params = new URLSearchParams(location.search);
  const legacyLinks = ['#overview', '#rewards', '#wallet', '#points', '#tiers',
    '#checkout', '#join', '#settings', '#overview-owned-rewards'];
  const hasDemoTarget = legacyLinks.includes(location.hash) ||
    params.has('scenario') || params.get('presentation') === '1';
  showVersion(hasDemoTarget ? '1.0.0' : '1.1.0');
})();
