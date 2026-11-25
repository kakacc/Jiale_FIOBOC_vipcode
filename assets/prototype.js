function isCurrentPrototypeVersion(version = document.body.dataset.projectVersion) {
  return version === '1.1.0' || version === '1.2.0';
}

const thanksgivingGiftRedemptions = [];

(() => {
  const thanksgivingVersion = '1.2.0';
  const selector = document.getElementById('project-version');
  const current = document.getElementById('current-prototype');
  const delivered = document.getElementById('delivered-prototype');
  const memberTab = document.getElementById('current-member-tab');
  const productTab = document.getElementById('current-product-tab');
  const cartTab = document.getElementById('current-cart-tab');
  const orderTab = document.getElementById('current-order-tab');
  const thankYouTab = document.getElementById('current-thank-you-tab');
  const memberContent = document.getElementById('current-member-content');
  const memberHome = memberContent.querySelectorAll('.return-member-overview, .return-member-rewards');
  const rewardCatalog = document.getElementById('return-reward-catalog');
  const catalogEntries = memberContent.querySelectorAll('[data-reward-catalog]');
  const catalogTabs = [...document.querySelectorAll('#return-catalog-tabs [role="tab"]')];
  const catalogResults = document.getElementById('return-catalog-results');
  const giftsBanner = document.getElementById('return-gifts-banner');
  const giftsTab = document.getElementById('return-catalog-gifts');
  const giftCard = catalogResults.querySelector('.return-gift-card');
  const giftPreview = document.getElementById('return-gift-preview');
  const giftVariantDialog = document.getElementById('return-gift-variants');
  const giftVariantForm = document.getElementById('return-gift-variants-form');
  const giftVariantError = document.getElementById('return-gift-variants-error');
  const giftDetailsDialog = document.getElementById('return-gift-details-dialog');
  const giftDetailsAdd = document.getElementById('return-gift-details-add');
  let activeRedeemedGift = null;
  const giftRedeem = document.getElementById('return-gift-redeem');
  const giftStatus = document.getElementById('return-gift-status');
  const startingPoints = 4500;
  const giftCost = 100;
  let giftBalance = startingPoints;
  let giftRedemptionSequence = 0;
  const orderDetail = document.getElementById('current-order-detail');
  const thankYouContent = document.getElementById('current-thank-you');
  const demoScenario = document.getElementById('current-demo-scenario');
  const giftScenarioOptions = demoScenario.innerHTML;
  const previousScenarioOptions = document.getElementById('v110-demo-scenarios').innerHTML;
  const giftScenarios = {
    'gift-only-cart': {quantity: 0, action: 'cart'},
    'gift-mixed-cart': {quantity: 1, action: 'cart'},
    'gift-pending-checkout': {quantity: 1, action: 'redeem'},
    'gift-existing-checkout': {quantity: 1, action: 'redeem', existingPolo: true}
  };
  let activeOrderId;
  let catalogEntry;

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
  const redeemedGifts = document.getElementById('return-redeemed-gifts');
  const availableRewardCount = availableList.querySelectorAll(':scope > .return-member-reward').length;

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

  function showCatalogCategory(selectedTab) {
    catalogTabs.forEach(tab => {
      const selected = tab === selectedTab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    catalogResults.setAttribute('aria-labelledby', selectedTab.id);
    const category = selectedTab.dataset.category;
    giftsBanner.hidden = category !== 'all';
    giftCard.hidden = category !== 'gift';
    giftStatus.textContent = '';
    if (!catalogResults.querySelector('.return-catalog-option')) appendCatalogOptions();
    catalogResults.querySelectorAll('.return-catalog-option').forEach(card => {
      card.hidden = category !== 'all' && card.dataset.category !== category;
    });
  }

  function appendCatalogOptions() {
    // Use the coupon and return options from the delivered prototype.
    const rewards = REWARDS.filter(reward => reward.type !== 'shipping');
    catalogResults.insertAdjacentHTML('beforeend', rewards.map(reward => {
      const coupon = reward.type === 'coupon';
      const title = coupon ? `$${reward.value} off $${reward.min}` : 'Free US returns';
      const description = coupon
        ? `Save $${reward.value} on orders of $${reward.min} or more.`
        : 'Contact customer service to request a return.';
      return `<article class="return-catalog-card return-catalog-card-body return-catalog-option" data-category="${reward.type}">
        <h2>${title}</h2>
        <p>${description}</p>
        ${coupon ? '<p class="return-catalog-note">Applies after member discounts.</p>' : ''}
        <details class="return-terms">
          <summary>Terms &amp; Conditions</summary>
          <div lang="zh-CN">${rewardUseConditionsHTML(reward)}</div>
        </details>
        <div class="return-catalog-cost">
          <span><strong>${number(reward.cost)}</strong> points</span>
          <button type="button" class="return-btn" title="Preview only" disabled>Redeem</button>
        </div>
      </article>`;
    }).join(''));
  }

  function updateGiftBalance(version) {
    const balance = version === thanksgivingVersion ? giftBalance : startingPoints;
    memberContent.querySelectorAll('[data-catalog-points]').forEach(label => {
      label.textContent = balance.toLocaleString('en-US');
    });
    giftRedeem.disabled = giftBalance < giftCost;
    giftRedeem.textContent = giftRedeem.disabled ? 'Insufficient points' : 'Redeem';
    const giftCount = version === thanksgivingVersion ? thanksgivingGiftRedemptions.length : 0;
    redeemedGifts.hidden = giftCount === 0;
    availableFilter.textContent = `Available (${availableRewardCount + giftCount})`;
  }

  function renderRedeemedGifts() {
    redeemedGifts.innerHTML = thanksgivingGiftRedemptions.map(({id, name, image}) => `
      <article class="return-member-reward">
        <div class="return-reward-info">
          <img class="return-redeemed-gift-image" src="${esc(image)}" alt="">
          <div><h3>Free Gifts</h3><p>${esc(name)}</p></div>
        </div>
        <div class="return-reward-actions">
          <button type="button" class="return-btn return-btn-secondary" data-gift-reward-action="cart" data-gift-id="${id}" aria-haspopup="dialog">Add To Cart</button>
          <button type="button" class="return-btn" data-gift-reward-action="details" data-gift-id="${id}" aria-haspopup="dialog">View coupon details</button>
        </div>
      </article>`).join('');
    updateGiftBalance(selector.value);
  }

  function buildGift(color, size) {
    return {
      name: document.getElementById('return-gift-variants-title').textContent,
      image: giftVariantDialog.querySelector('img').getAttribute('src'),
      color,
      size,
      colors: Array.from(giftVariantForm.querySelectorAll('input[name="color"]'), input => input.value),
      sizes: Array.from(giftVariantForm.querySelectorAll('input[name="size"]'), input => input.value)
    };
  }

  function redeemGift(gift, action) {
    if (giftBalance < giftCost) return false;
    if (action === 'cart' && !addRedeemedGiftToCart(gift)) return false;
    if (action === 'redeem') thanksgivingGiftRedemptions.push({...gift, id: ++giftRedemptionSequence});
    giftBalance -= giftCost;
    renderRedeemedGifts();
    return true;
  }

  function openGiftCheckout() {
    showVersion(thanksgivingVersion, 'checkout');
    state.checkoutSummaryOpen = true;
    checkoutOpenPage();
  }

  function openGiftVariants(gift = null) {
    activeRedeemedGift = gift;
    giftVariantForm.reset();
    giftVariantError.hidden = true;
    for (const button of giftVariantForm.querySelectorAll('button[name="action"]')) {
      button.hidden = (button.value === 'owned-cart') !== Boolean(gift);
      button.disabled = button.hidden;
    }
    for (const field of giftVariantForm.querySelectorAll('input[type="radio"]')) {
      const allowed = field.name === 'color' ? gift?.colors : gift?.sizes;
      field.disabled = allowed ? !allowed.includes(field.value) : false;
      if (gift) field.checked = field.value === gift[field.name];
    }
    giftVariantDialog.showModal();
  }

  redeemedGifts.addEventListener('click', event => {
    const button = event.target.closest('[data-gift-reward-action]');
    if (!button) return;
    const gift = thanksgivingGiftRedemptions.find(item => item.id === Number(button.dataset.giftId));
    if (!gift) return;
    if (button.dataset.giftRewardAction === 'cart') {
      openGiftVariants(gift);
    } else {
      document.getElementById('return-gift-coupon-code').textContent = `FG-${String(gift.id).padStart(4, '0')}`;
      giftDetailsAdd.dataset.giftId = String(gift.id);
      giftDetailsDialog.querySelector('details').open = false;
      giftDetailsDialog.showModal();
    }
  });
  giftDetailsAdd.addEventListener('click', () => {
    const gift = thanksgivingGiftRedemptions.find(item => item.id === Number(giftDetailsAdd.dataset.giftId));
    giftDetailsDialog.close();
    if (gift) openGiftVariants(gift);
  });

  document.getElementById('return-gift-thumbnail').addEventListener('click', () => giftPreview.showModal());
  giftPreview.addEventListener('click', event => {
    if (event.target === giftPreview) giftPreview.close();
  });
  giftRedeem.addEventListener('click', () => {
    if (giftBalance < giftCost) return;
    openGiftVariants();
  });
  document.getElementById('return-gift-variants-close').addEventListener('click', () => giftVariantDialog.close());
  giftVariantForm.addEventListener('submit', event => {
    event.preventDefault();
    const action = event.submitter?.value;
    if (!giftVariantDialog.open || !['redeem', 'cart', 'owned-cart'].includes(action)) return;
    if ((action === 'owned-cart') !== Boolean(activeRedeemedGift)) return;
    const fields = new FormData(giftVariantForm);
    const color = fields.get('color');
    const size = fields.get('size');
    if (!color || !size) return;
    if (activeRedeemedGift) {
      const index = thanksgivingGiftRedemptions.indexOf(activeRedeemedGift);
      if (index < 0 || !activeRedeemedGift.colors.includes(color) || !activeRedeemedGift.sizes.includes(size)) return;
      if (!addRedeemedGiftToCart({...activeRedeemedGift, color, size})) {
        giftVariantError.textContent = 'This gift could not be added. Check your cart and try again.';
        giftVariantError.hidden = false;
        return;
      }
      thanksgivingGiftRedemptions.splice(index, 1);
      renderRedeemedGifts();
      giftVariantDialog.close();
      cartTab.click();
      toast('免费礼品已加入购物车。');
      return;
    }
    if (giftBalance < giftCost) return;
    const gift = buildGift(color, size);
    if (!redeemGift(gift, action)) {
      giftVariantError.textContent = 'Your cart is full. Remove an item and try again.';
      giftVariantError.hidden = false;
      return;
    }
    giftVariantDialog.close();
    if (action === 'cart') {
      cartTab.click();
      toast(`已兑换并加购 ${gift.name}（${color} / ${size}），扣除 ${giftCost} 积分。`);
    } else {
      giftStatus.textContent = `Gift saved to My rewards. ${giftCost} points deducted.`;
    }
  });

  const stage = document.getElementById('stage');
  stage.addEventListener('change', event => {
    const field = event.target;
    if (!field.matches('select[data-checkout-gift-option]')) return;
    const row = field.closest('[data-checkout-gift]');
    const gift = checkoutGiftOffers().find(item => String(item.id) === row.dataset.checkoutGift);
    if (!gift) return;
    const choices = field.name === 'color' ? gift.colors : gift.sizes;
    if (choices.includes(field.value)) {
      gift[field.name] = field.value;
      renderRedeemedGifts();
    }
  });
  stage.addEventListener('click', event => {
    const button = event.target.closest('[data-checkout-gift-add]');
    if (!button) return;
    const id = button.closest('[data-checkout-gift]').dataset.checkoutGift;
    const gift = checkoutGiftOffers().find(item => String(item.id) === id);
    if (!gift) return;
    if (!addRedeemedGiftToCart(gift)) {
      toast(gift.cartLineId && !cartLineItems().some(line => line.id === gift.cartLineId)
        ? '对应商品已移除。'
        : '购物车已满，请先移除一件商品。');
      return;
    }
    if (gift === state.checkoutCartGiftOffer) {
      state.checkoutCartGiftOffer = null;
    } else {
      thanksgivingGiftRedemptions.splice(thanksgivingGiftRedemptions.indexOf(gift), 1);
    }
    renderRedeemedGifts();
    checkoutRefreshBlocks();
    document.getElementById('checkout-order-summary')?.focus({preventScroll: true});
    toast(gift.cartLineId && !gift.keepOriginalAtListPrice ? '已应用免费礼品折扣。' : '免费礼品已加入本单。');
  });

  catalogTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showCatalogCategory(tab));
    tab.addEventListener('keydown', event => {
      const last = catalogTabs.length - 1;
      const targetIndex = {
        ArrowLeft: index === 0 ? last : index - 1,
        ArrowRight: index === last ? 0 : index + 1,
        Home: 0,
        End: last
      }[event.key];
      if (targetIndex === undefined) return;
      event.preventDefault();
      const target = catalogTabs[targetIndex];
      showCatalogCategory(target);
      target.focus();
    });
  });

  document.getElementById('return-gifts-banner-link').addEventListener('click', () => {
    showCatalogCategory(giftsTab);
    giftsTab.focus();
  });

  catalogEntries.forEach(entry => entry.addEventListener('click', () => {
    catalogEntry = entry;
    showCatalogCategory(catalogTabs[0]);
    showVersion(selector.value, 'rewards');
    document.getElementById('return-catalog-title').focus();
  }));

  document.getElementById('return-catalog-back').addEventListener('click', () => {
    showVersion(selector.value);
    catalogEntry?.focus();
  });

  function showVersion(version, surface = 'member') {
    const modern = isCurrentPrototypeVersion(version);
    const showCatalog = version === thanksgivingVersion && surface === 'rewards';
    const showMember = modern && (surface === 'member' || showCatalog);
    const showOrder = modern && surface === 'order';
    const showThankYou = modern && surface === 'thankyou';
    if (!showCatalog) {
      if (giftPreview.open) giftPreview.close();
      if (giftVariantDialog.open) giftVariantDialog.close();
    }
    if (!showMember) {
      if (returnDialog.open) returnDialog.close();
      if (discountDialog.open) discountDialog.close();
    }
    if (giftDetailsDialog.open) giftDetailsDialog.close();
    if (version !== document.body.dataset.projectVersion) {
      demoScenario.innerHTML = version === thanksgivingVersion ? giftScenarioOptions : previousScenarioOptions;
    }
    document.body.dataset.projectVersion = version;
    document.body.dataset.currentSurface = surface;
    selector.value = version;
    current.setAttribute('aria-label', `V${version} 原型`);
    memberHome.forEach(section => { section.hidden = showCatalog; });
    rewardCatalog.hidden = !showCatalog;
    catalogEntries.forEach(entry => { entry.disabled = version !== thanksgivingVersion; });
    updateGiftBalance(version);
    demoScenario.value = '';
    current.hidden = !(showMember || showOrder || showThankYou);
    delivered.hidden = showMember || showOrder || showThankYou;
    memberContent.hidden = !showMember;
    orderDetail.hidden = !showOrder;
    thankYouContent.hidden = !showThankYou;
    thankYouTab.setAttribute('aria-pressed', String(showThankYou));
    orderTab.setAttribute('aria-pressed', String(showOrder));
    memberTab.setAttribute('aria-pressed', String(showMember));
    productTab.setAttribute('aria-pressed', String(modern && surface === 'product'));
    cartTab.setAttribute('aria-pressed', String(modern && surface === 'cart'));
  }

  memberTab.addEventListener('click', () => {
    closeModal();
    showVersion(selector.value);
    window.scrollTo(0, 0);
  });
  productTab.addEventListener('click', () => {
    closeModal();
    showVersion(selector.value, 'product');
    productDetailOpen();
    window.scrollTo(0, 0);
  });
  cartTab.addEventListener('click', () => {
    closeModal();
    showVersion(selector.value, 'cart');
    role = 'storefront';
    page = 'checkout';
    cartView = 'collection';
    cartOpen = true;
    render();
    window.scrollTo(0, 0);
    document.querySelector('.cart-drawer-heading .cart-close')?.focus({preventScroll: true});
  });

  thankYouTab.addEventListener('click', () => {
    closeModal();
    showVersion(selector.value, 'thankyou');
    window.fiobocRenderThankYou?.();
    window.scrollTo(0, 0);
  });

  function creditedOrderPoints(order) {
    return order.creditedPoints ?? state.ledger?.find(entry =>
      entry.reference === order.id && entry.label?.endsWith(' · 积分转可用')
    )?.amount;
  }

  function orderItemPoints(items, total, isCredited) {
    const field = isCredited ? 'creditedPoints' : 'earned';
    if (items.every(item => Number.isFinite(item[field]))) {
      return items.map(item => item[field]);
    }
    if (!Number.isFinite(total)) return items.map(() => null);
    if (total === 0) return items.map(() => 0);

    // Older order snapshots only contain an order-level points balance.
    const amounts = items.map(item => Math.max(0, item.result.chosen.total));
    const subtotal = amounts.reduce((sum, amount) => sum + amount, 0);
    if (!subtotal) return items.map(() => null);
    const allocations = amounts.map((amount, index) => {
      const exact = Math.floor(total) * amount / subtotal;
      return {index, points: Math.floor(exact), remainder: exact - Math.floor(exact)};
    });
    const remaining = Math.floor(total) - allocations.reduce((sum, item) => sum + item.points, 0);
    const ranked = [...allocations].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (const item of ranked.slice(0, remaining)) item.points++;
    return allocations.map(item => item.points);
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
    const estimatedItemPoints = orderItemPoints(details.items, order.earned ?? details.earned, false);
    const creditedItemPoints = orderItemPoints(details.items, credited, true);
    const hasItemCredits = details.items.some(item => Number.isFinite(item.creditedPoints));
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
            <div class="order-detail-items">${details.items.map((item, index) => {
              const {line, result} = item;
              const itemCanceled = canceled || item.status === 'canceled';
              const itemIsCredited = Number.isFinite(item.creditedPoints) || (isCredited && !hasItemCredits);
              const points = itemIsCredited ? item.creditedPoints ?? creditedItemPoints[index] : estimatedItemPoints[index];
              return `<div class="order-detail-item">
                <img src="${esc(line.image)}" alt="">
                <div class="order-detail-item-name">${esc(line.englishName || line.name)}
                  <small>${esc([line.color,line.size].filter(Boolean).join(' / '))} · Qty ${number(line.quantity)}${itemCanceled ? ' · Canceled' : ''}</small>
                  ${!itemCanceled && Number.isFinite(points) ? `<div class="order-detail-points"><span>${itemIsCredited ? 'Points credited' : 'Estimated points'}</span><strong class="num">${number(points)} points</strong></div>` : ''}
                </div>
                <span class="num">${formatMoney(result.chosen.total)}</span>
              </div>`;
            }).join('')}</div>
            <dl class="order-detail-totals">
              <div><dt>Subtotal</dt><dd class="num">${formatMoney(details.subtotal)}</dd></div>
              <div><dt>Shipping</dt><dd class="num">${shipping === null ? 'Pending' : formatMoney(shipping)}</dd></div>
              <div class="order-detail-total"><dt>Total</dt><dd class="num">${total === null ? 'Pending' : `<small>${esc(currency)}</small>${formatMoney(total)}`}</dd></div>
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
        currency:'EUR',subtotal:42.90,shipping:1.95,earned:41,
        contact:{email:'alex@example.com',firstName:'Alex',lastName:'Morgan',street:'12 Demo Street',city:'Paris',postal:'75001'},
        items:[{
          line:{englishName:'Airforce 3D Embroidered Oversized Tee',color:'White',size:'S',quantity:1,image:CART_INLINE_IMAGES['hoodie-white']},
          result:{chosen:{total:17.95}},earned:17
        },{
          line:{englishName:'Weekend Performance Essential Polo Tee',color:'White',size:'M',quantity:1,image:CART_INLINE_IMAGES['polo-white']},
          result:{chosen:{total:24.95}},earned:24
        }]
      }
    };
    const demoOrders = [
      confirmed,
      {...confirmed,id:'DEMO-26094',status:'canceled'},
      {...confirmed,id:'DEMO-26095',fulfilled:true,dateLabel:'Oct 5',creditedPoints:41,
        checkoutDetails:{...confirmed.checkoutDetails,items:confirmed.checkoutDetails.items.map(item => ({...item,creditedPoints:item.earned}))}},
      {...confirmed,id:'DEMO-26096',fulfilled:true,
        checkoutDetails:{...confirmed.checkoutDetails,items:confirmed.checkoutDetails.items.map((item, index) =>
          index === 0 ? {...item,creditedPoints:item.earned} : {...item})}},
      {...confirmed,id:'DEMO-26097',
        checkoutDetails:{...confirmed.checkoutDetails,items:confirmed.checkoutDetails.items.map((item, index) =>
          index === 0 ? {...item,status:'canceled'} : {...item})}}
    ];
    const order = demoOrders.find(entry => entry.id === orderId) ?? confirmed;
    activeOrderId = order.id;
    closeModal();
    showVersion(selector.value, 'order');
    renderOrderDetail(order);
    window.scrollTo(0, 0);
  }

  function loadDemoAccount(which) {
    scenario = which;
    init(which);
    document.getElementById('scenario').value = which;
  }

  function previewGiftScenario({quantity, action, existingPolo}) {
    closeModal();
    loadDemoAccount('vip2');
    state.qty = quantity;
    giftBalance = startingPoints;
    thanksgivingGiftRedemptions.length = 0;
    const gift = buildGift(
      giftVariantForm.querySelector('input[name="color"]').value,
      giftVariantForm.querySelector('input[name="size"]').value
    );
    if (existingPolo) {
      const polo = listPricePoloCartLine(gift);
      state.cartItems = [...cartLineItems(), polo];
      state.qty += polo.quantity;
      gift.cartLineId = polo.id;
      gift.colors = [polo.color];
      gift.sizes = [polo.size];
    }
    redeemGift(gift, action);
    if (action === 'cart') cartTab.click();
    else openGiftCheckout();
  }

  demoScenario.addEventListener('change', () => {
    const selected = demoScenario.value;
    if (!selected) return;
    if (selector.value === thanksgivingVersion) {
      if (!Object.hasOwn(giftScenarios, selected)) return;
      previewGiftScenario(giftScenarios[selected]);
    } else if (selected === 'member-return') {
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
    } else if (selected.startsWith('thankyou-')) {
      thankYouTab.click();
      window.fiobocSetThankYouScenario?.(selected.slice(9));
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
  showVersion(hasDemoTarget ? '1.0.0' : thanksgivingVersion);
})();
