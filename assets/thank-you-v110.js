/* New V1.1.0 surface. Demo-only data; no account, order or consent is sent. */
(() => {
  'use strict';
  const root = document.getElementById('current-thank-you');
  if (!root) return;
  const tiers = [
    {name:'Member', min:0, discount:0, rate:1},
    {name:'VIP1', min:150, discount:3, rate:1.1},
    {name:'VIP2', min:500, discount:5, rate:1.2},
    {name:'VIP3', min:1500, discount:10, rate:1.3}
  ];
  const usd = value => new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', maximumFractionDigits:2}).format(value);
  const eur = value => new Intl.NumberFormat('en-US', {style:'currency', currency:'EUR', maximumFractionDigits:2}).format(value);
  const roundMoney = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const number = value => new Intl.NumberFormat('en-US').format(value);
  const svg = body => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const icons = {
    gift:svg('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8H8a3 3 0 1 1 3-3l1 3zm0 0h4a3 3 0 1 0-3-3l-1 3z"/>'),
    clock:svg('<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'),
    gem:svg('<path d="m3 8 4-5h10l4 5-9 13L3 8zm0 0h18M7 3l5 18 5-18M7 3l5 5 5-5"/>'),
    info:svg('<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 6v.2"/>'),
    tag:svg('<path d="M20 3h-7L3 13l8 8L21 11V4a1 1 0 0 0-1-1Z"/><circle cx="17" cy="7" r="1"/>'),
    calendar:svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h1m3 0h1m3 0h1M7 17h1m3 0h1"/>'),
    arrow:svg('<path d="M4 12h16m-6-6 6 6-6 6"/>'),
    lock:svg('<rect x="6" y="10" width="12" height="11" rx="1.5"/><path d="M9 10V6a3 3 0 0 1 6 0v4M12 14v3"/>'),
    help:svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 2.5M12 17v.1"/>'),
    mail:svg('<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="m3 6 9 7 9-7"/>'),
    check:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m14 24 7 7 14-15" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  let demo = {tier:'VIP2', spend:1350, balance:4500, status:'unfulfilled', snapshotTier:'VIP2', snapshotRate:1.2, rewardIssued:true};
  let lastTrigger;
  const dialog = document.createElement('dialog');
  dialog.className = 'v110-ty-dialog';
  dialog.setAttribute('aria-labelledby', 'v110-ty-dialog-title');
  document.getElementById('current-prototype').append(dialog);

  function model() {
    const tier = tiers.find(item => item.name === demo.tier);
    const next = tier ? tiers[tiers.indexOf(tier) + 1] : null;
    const refunded = demo.status === 'refund';
    // Reference order is EUR. The illustrative membership service returns USD net.
    const originalNet = 19.75; // EUR 17.95 × demo FX 1.10, rounded to cents
    const net = refunded ? 14.25 : originalNet;
    const points = Math.floor(net * demo.snapshotRate + 1e-8);
    const purchaseTier = tiers.find(item => item.name === demo.snapshotTier) || tiers[0];
    // Preserve the reference order's EUR paid amount. Original prices here are
    // illustrative; production reads gross, discounts and net from the order.
    const paidMerchandise = 17.95;
    const originalMerchandise = roundMoney(paidMerchandise / (1 - purchaseTier.discount / 100));
    const memberSavings = roundMoney(originalMerchandise - paidMerchandise);
    return {tier, next, net, points, refunded, purchaseTier, paidMerchandise, originalMerchandise, memberSavings, gap:next ? Math.max(0,next.min-demo.spend) : 0, full:['fulfilled','refund'].includes(demo.status), guest:!tier};
  }

  function pointsTiming(m) {
    return `Points become available 30 days after all items have shipped.${m.full?' Estimated to be available on December 26, 2026 (30 days after the last shipment).':demo.status==='partial'?' The final shipment is pending, so the availability date is not yet confirmed.':''}`;
  }

  function rewardCard(m) {
    return `<section class="v110-rewards" aria-label="Membership rewards for this order" data-shopify-extension-target="purchase.thank-you.block.render">
      <h2 class="v110-rewards-title">${icons.gift}Membership rewards for this order</h2>
      ${!m.guest?`<div class="v110-reward-progress">
        <div class="v110-progress-heading"><div class="v110-progress-current-benefit"><span>Current tier</span><strong>${m.tier.name}</strong><span>${m.tier.discount}% OFF</span></div><p class="v110-progress-distance">${m.next?`${usd(m.gap)} away from <strong>${m.next.name}</strong>`:'You’ve reached the highest tier. Keep it up!'}</p><div class="v110-progress-current-benefit v110-progress-next-benefit"><span>${m.next?'Next tier':'Highest tier'}</span><strong>${m.next?m.next.name:m.tier.name}</strong><span>${m.next?m.next.discount:m.tier.discount}% OFF</span></div></div>
        <div class="v110-reward-meter" role="progressbar" aria-label="${m.next?'Confirmed spend from '+m.tier.name+' to '+m.next.name:'Highest tier reached'}" aria-valuenow="${demo.spend}" aria-valuemin="${m.tier.min}" aria-valuemax="${m.next?m.next.min:Math.max(m.tier.min,demo.spend)}"><span style="width:${m.next?Math.min(100,Math.max(0,(demo.spend-m.tier.min)/(m.next.min-m.tier.min)*100)):100}%"></span></div>
        <div class="v110-reward-progress-title"><span>${usd(m.tier.min)}</span><span>${m.next?usd(m.next.min):usd(m.tier.min)+'+'}</span></div>
        <p class="v110-reward-credit-note">Eligible spend and points are credited 30 days after shipment.</p>
      </div>
      `:''}
      <div class="v110-points-row"><span class="v110-points-earned"><img class="v110-points-reward-icon" src="data:image/png;base64,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" alt="" aria-hidden="true"><strong class="v110-points-value">+${number(m.points)} Points</strong></span><span class="v110-points-description">Estimated points from this order<span class="v110-points-help"><button type="button" class="v110-points-info" aria-label="When points become available" aria-expanded="false" aria-controls="v110-points-tooltip" aria-describedby="v110-points-tooltip" data-v110-action="points-help">${icons.info}</button><span class="v110-points-tooltip" id="v110-points-tooltip" role="tooltip">${pointsTiming(m)}</span></span></span></div>
      ${m.guest?`<div class="v110-reward-welcome"><strong>You haven’t joined Fioboc Rewards yet.</strong><p>Your order earns at the Member rate of 1.0 point per $1. A purchase does not automatically enroll you.</p><p>${demo.rewardIssued?'Your one-time welcome reward has already been issued.':'Join and verify your email for 100 welcome points, if eligible. This reward is separate from your purchase points.'}</p></div>`:''}
      ${m.refunded?'<p class="v110-reward-refund">A €5.00 merchandise refund reduced this order’s pending reward from 23 to 17 points. The remaining $14.25 in qualifying spend will count only after posting.</p>':''}
      <button type="button" class="v110-reward-action ${m.guest?'is-outline':''}" data-v110-action="${m.guest?'join':'rewards'}">${m.guest?'Join Fioboc Rewards':'Explore My Rewards'} ${icons.arrow}</button>
    </section>`;
  }

  function address() { return '<p>开心 徐<br>123 Rangoon Road<br>xxx<br>Singapore 218401<br>+16195550198</p>'; }

  function render() {
    const m = model();
    root.innerHTML = `
      <header class="v110-ty-header"><div class="v110-ty-shell"><img class="v110-ty-brand" src="./assets/images/logo-account.svg" width="137" height="27" alt="FIOBOC"></div></header>
      <div class="v110-ty-background"><div class="v110-ty-shell v110-ty-layout">
        <div class="v110-ty-main">
          <div class="v110-ty-heading">${icons.check}<div><p>Confirmation #58XLV4Q01</p><h1>Thank you, 开心!</h1></div></div>
          <section class="v110-ty-card v110-ty-confirmation"><h2>Your order is confirmed</h2><p>You’ll receive a confirmation email soon.</p><button class="v110-ty-shop" type="button" data-v110-action="track">Track order with <strong>shop</strong></button></section>
          ${rewardCard(m)}
          <section class="v110-ty-card"><div class="v110-ty-details-title"><h2>Order details</h2><button type="button" class="v110-ty-link" data-v110-action="rewards">View account</button></div><div class="v110-ty-detail-grid"><div><h3>Contact information</h3><p>happyokk1221@gmail.com</p><h3>Shipping address</h3>${address()}<h3>Shipping method</h3><p>标准</p></div><div><h3>Payment method</h3><p><span class="v110-ty-visa">VISA</span>•••• 0000 · €19.90 EUR</p><h3>Billing address</h3>${address()}</div></div></section>
          <p class="v110-ty-email">${icons.mail}A confirmation email has been sent to happyokk1221@gmail.com.</p>
        </div>
        <aside class="v110-ty-aside" aria-label="Order summary"><button type="button" class="v110-ty-summary-toggle" data-v110-action="summary" aria-expanded="false"><span>Order summary</span><span>${m.refunded?'€14.90':'€19.90'} ⌄</span></button><div class="v110-ty-summary-body"><div class="v110-ty-item"><div class="v110-ty-item-image"><img src="./assets/images/hoodie-white.webp" alt="White oversized short sleeve tee"><span class="v110-ty-quantity">1</span></div><p>Airforce 3D Embroidered Oversized Tee<small>Relaxed-Fit / White / S</small>${m.memberSavings>0?`<span class="v110-ty-item-discount">${icons.tag}<span>${m.purchaseTier.name} ${m.purchaseTier.discount}% OFF (−${eur(m.memberSavings)})</span></span>`:''}</p><span class="v110-ty-item-price">${m.memberSavings>0?`<s aria-label="Price before member discount">${eur(m.originalMerchandise)}</s>`:''}<strong>${eur(m.paidMerchandise)}</strong></span></div><div class="v110-ty-costs"><div><span>Subtotal</span><span>${eur(m.paidMerchandise)}</span></div><div><span>Shipping</span><span>€1.95</span></div><div class="v110-ty-total"><span>Total</span><span><small>EUR</small>€19.90</span></div>${m.refunded?'<div><span>Merchandise refunded</span><span>−€5.00</span></div><div><strong>Retained payment</strong><strong>€14.90</strong></div>':''}</div><div class="v110-ty-estimated-points"><span>Estimated points</span><span><strong>${number(m.points)}</strong> points</span></div></div></aside>
      </div></div>`;
  }

  function openDialog(title, content) {
    lastTrigger = document.activeElement;
    dialog.innerHTML = `<div class="v110-ty-dialog-heading"><h2 id="v110-ty-dialog-title">${title}</h2><button type="button" class="v110-ty-close" aria-label="Close dialog" data-v110-close>×</button></div>${content}`;
    if (!dialog.open) dialog.showModal();
  }

  root.addEventListener('click', event => {
    const action = event.target.closest('[data-v110-action]')?.dataset.v110Action;
    if (action === 'points-help') {
      const help = event.target.closest('.v110-points-help');
      const expanded = help.classList.toggle('is-open');
      help.querySelector('button').setAttribute('aria-expanded', String(expanded));
    } else if (action === 'summary') {
      const aside = root.querySelector('.v110-ty-aside');
      const expanded = aside.classList.toggle('is-expanded');
      root.querySelector('.v110-ty-summary-toggle').setAttribute('aria-expanded', String(expanded));
    } else if (action === 'rewards') {
      if (model().guest) return openDialog('Your account & membership', '<p>Your order does not automatically enroll you in Fioboc Rewards. Use Join Fioboc Rewards to choose membership.</p><p class="v110-ty-demo-note">Demo account information only. No account is created.</p>');
      document.getElementById('current-member-tab').click();
    } else if (action === 'join') {
      openDialog('Join Fioboc Rewards', `<form id="v110-ty-join"><p>Join for free with the verified email used for this order: <strong>happyokk1221@gmail.com</strong>.</p><label><input type="checkbox" name="consent" required><span>I choose to join Fioboc Rewards and agree to the membership terms.</span></label><label><input type="checkbox" name="marketing"><span>Email me about news and offers (optional).</span></label><p class="v110-ty-demo-note">Prototype only: the email is assumed verified; no registration or email is sent. The 100-point welcome reward is checked separately and issued only once.</p><button type="submit" class="v110-reward-action">Join Fioboc Rewards</button></form>`);
    } else if (action === 'track') {
      openDialog('Track your order', `<p><strong>Order #58XLV4Q01</strong></p><p>${model().full?'All items shipped on November 26, 2026.':demo.status==='partial'?'Your first package has shipped. The final shipment is pending.':'Your order is confirmed. Tracking will be available after shipment.'}</p><p class="v110-ty-demo-note">Shop tracking preview only. The live store uses the Shopify / Shop order tracking destination.</p>`);
    } else if (action === 'help') {
      openDialog('Contact Fioboc', '<p>For order questions or a request to leave Fioboc Rewards, contact <a href="mailto:service@fioboc.com">service@fioboc.com</a>.</p><p>Support reviews unused points and benefits before processing a membership exit. Submitting a request does not automatically clear rewards or cancel your order. Marketing preferences are separate.</p><p class="v110-ty-demo-note">No message is sent from this prototype.</p>');
    }
  });
  function closePointsHelp() {
    root.querySelectorAll('.v110-points-help.is-open').forEach(help => {
      help.classList.remove('is-open');
      help.querySelector('button').setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('.v110-points-help')) closePointsHelp();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePointsHelp();
  });
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-v110-close]')) dialog.close();
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    }
  });
  dialog.addEventListener('close', () => { if (lastTrigger?.isConnected) lastTrigger.focus(); });
  dialog.addEventListener('submit', event => {
    if (event.target.id !== 'v110-ty-join') return;
    event.preventDefault();
    if (!demo.rewardIssued) { demo.balance += 100; demo.rewardIssued = true; }
    demo.tier = 'Member';
    render();
    openDialog('Welcome to Fioboc Rewards', '<p>You joined as a Member. <strong>100 welcome points</strong> are available now, separately from your purchase reward.</p><p>The order still uses its original Member earn rate. Purchase points and qualifying spend stay pending until 30 days after all items have shipped.</p><p class="v110-ty-demo-note">Local demo completed. No real account, consent record or points transaction was created.</p>');
  });
  window.fiobocRenderThankYou = render;
  window.fiobocSetThankYouScenario = name => {
    const tier = tiers.find(item => item.name.toLowerCase() === name);
    const selected = tier || tiers[2];
    const guest = name === 'guest';
    demo = {
      tier:guest ? null : selected.name,
      spend:guest ? 0 : ({Member:80,VIP1:350,VIP2:1350,VIP3:1800})[selected.name],
      balance:guest ? 0 : 4500,
      status:['partial','fulfilled','refund'].includes(name) ? name : 'unfulfilled',
      snapshotRate:guest ? 1 : selected.rate,
      snapshotTier:guest ? 'Member' : selected.name,
      rewardIssued:!guest
    };
    render();
  };
  render();
  if (['#thank-you','#thankyou'].includes(location.hash)) document.getElementById('current-thank-you-tab').click();
})();
