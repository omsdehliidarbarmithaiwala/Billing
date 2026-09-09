/* Om's Dehlii Darbar POS Billing Terminal JS */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // Live Counter Clock
  function updateClock() {
    var now = new Date();
    var timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    var clockEl = document.getElementById('pos-live-clock');
    if (clockEl) clockEl.textContent = timeStr;
  }
  setInterval(updateClock, 1000);
  updateClock();

  function inr(n) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function inrRound(n) { return '₹' + Number(Math.round(n)).toLocaleString('en-IN'); }
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Generate Unique Invoice Number
  var invoiceNum = 'ODD-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  document.getElementById('pos-invoice-num').textContent = 'INV #' + invoiceNum;

  // Catalogue Item Source
  var catalogueItems = [];

  if (typeof PRODUCTS !== 'undefined') {
    PRODUCTS.forEach(function (p) {
      catalogueItems.push({
        id: p.id,
        name: p.name,
        nameHi: p.nameHi || '',
        category: p.category,
        categories: p.categories || [p.category],
        rate: p.pricePerKg || 0,
        unit: p.unit || 'kg',
        photo: p.photo
      });
    });
  }

  if (typeof BANDS !== 'undefined') {
    BANDS.forEach(function (b) {
      catalogueItems.push({
        id: 'band-' + b.id,
        name: b.name,
        nameHi: b.nameHi || '',
        category: 'bands',
        categories: ['bands'],
        rate: b.pricePerKg,
        unit: 'kg',
        photo: 'assorted-diamonds'
      });
    });
  }

  if (typeof BOXES !== 'undefined') {
    BOXES.forEach(function (bx, i) {
      catalogueItems.push({
        id: 'box-' + i,
        name: bx.name + ' (' + bx.weight + ')',
        nameHi: 'ड्राई फ्रूट बॉक्स',
        category: 'boxes',
        categories: ['boxes'],
        rate: bx.price,
        unit: 'box',
        photo: 'box-white'
      });
    });
  }

  if (typeof HAMPERS !== 'undefined') {
    HAMPERS.forEach(function (h, i) {
      catalogueItems.push({
        id: 'hamper-' + i,
        name: h.name + ' Gift Hamper (' + h.weight + ')',
        nameHi: h.nameHi || 'गिफ्ट हैंपर',
        category: 'boxes',
        categories: ['boxes'],
        rate: h.price,
        unit: 'box',
        photo: 'assorted-hamper'
      });
    });
  }

  // State
  var currentCategory = 'all';
  var searchQuery = '';
  var cart = []; // array of { id, name, nameHi, rate, unit, grams, count, amount }
  var selectedItemForModal = null;

  // DOM Elements
  var itemsContainer = document.getElementById('pos-items-container');
  var cartTbody = document.getElementById('pos-cart-list');
  var cartEmptyMsg = document.getElementById('pos-cart-empty-view');
  var searchInput = document.getElementById('pos-search-input');
  var catButtons = document.querySelectorAll('.pos-cat-pill');

  // Mobile Tabs DOM
  var tabCatalogueBtn = document.getElementById('pos-tab-catalogue');
  var tabCartBtn = document.getElementById('pos-tab-cart');
  var catalogueCard = document.getElementById('pos-catalogue-panel');
  var billCard = document.getElementById('pos-bill-panel');
  var mobileFloatingBar = document.getElementById('pos-mobile-bottom-bar');
  var mobileBarViewBtn = document.getElementById('pos-m-bar-view-btn');

  // Modal DOM
  var modalOverlay = document.getElementById('weigh-modal-overlay');
  var modalCloseBtn = document.getElementById('modal-close-btn');
  var modalSweetName = document.getElementById('modal-sweet-name');
  var modalItemImg = document.getElementById('modal-item-img');
  var modalItemTitle = document.getElementById('modal-item-title');
  var modalItemDeva = document.getElementById('modal-item-deva');
  var modalItemRateLabel = document.getElementById('modal-item-rate-label');
  var modalCalcFormula = document.getElementById('modal-calc-formula');
  var modalCalcPrice = document.getElementById('modal-calc-price');
  var modalCalcSub = document.getElementById('modal-calc-sub');
  var modalWeightControls = document.getElementById('modal-weight-controls');
  var modalCountControls = document.getElementById('modal-count-controls');
  var modalInputGrams = document.getElementById('modal-input-grams');
  var modalInputCount = document.getElementById('modal-input-count');
  var modalBtnConfirmAdd = document.getElementById('modal-btn-confirm-add');
  var modalCountMinus = document.getElementById('modal-count-minus');
  var modalCountPlus = document.getElementById('modal-count-plus');
  var modalGramMinus = document.getElementById('modal-gram-minus');
  var modalGramPlus = document.getElementById('modal-gram-plus');

  // Mobile View Switcher
  function switchMobileView(view) {
    if (view === 'cart') {
      tabCatalogueBtn.classList.remove('active');
      tabCartBtn.classList.add('active');
      catalogueCard.classList.add('mobile-hidden');
      billCard.classList.remove('mobile-hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      tabCatalogueBtn.classList.add('active');
      tabCartBtn.classList.remove('active');
      catalogueCard.classList.remove('mobile-hidden');
      billCard.classList.add('mobile-hidden');
    }
  }

  if (tabCatalogueBtn) tabCatalogueBtn.addEventListener('click', function () { switchMobileView('catalogue'); });
  if (tabCartBtn) tabCartBtn.addEventListener('click', function () { switchMobileView('cart'); });
  if (mobileBarViewBtn) mobileBarViewBtn.addEventListener('click', function () { switchMobileView('cart'); });

  // Render POS Catalogue Tiles
  function renderCatalogue() {
    if (!itemsContainer) return;
    
    var filtered = catalogueItems.filter(function (item) {
      var matchCat = (currentCategory === 'all') || 
                     (item.category === currentCategory) || 
                     (item.categories && item.categories.indexOf(currentCategory) !== -1);
      
      var q = searchQuery.toLowerCase();
      var matchSearch = !q || 
                        item.name.toLowerCase().indexOf(q) !== -1 || 
                        (item.nameHi && item.nameHi.toLowerCase().indexOf(q) !== -1);
      
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      itemsContainer.innerHTML = '<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--muted)">No items found matching "' + esc(searchQuery) + '".</div>';
      return;
    }

    var html = filtered.map(function (item) {
      var imgPath = item.photo ? 'assets/img/' + item.photo + '-400.jpg' : 'assets/img/kaju-katri-400.jpg';
      var rateText = inrRound(item.rate);
      var unitText = item.unit === 'box' ? 'per box' : (item.unit === 'piece' ? 'per pc' : 'per kg');
      
      return '<div class="pos-item-card" data-id="' + esc(item.id) + '">' +
        '<div class="pos-item-card-plus">+</div>' +
        '<div class="pos-item-img-wrap">' +
          '<img src="' + imgPath + '" alt="' + esc(item.name) + '" loading="lazy" onerror="this.src=\'assets/img/kaju-katri-400.jpg\'">' +
        '</div>' +
        '<div class="pos-item-title">' + esc(item.name) + '</div>' +
        (item.nameHi ? '<div class="pos-item-deva">' + esc(item.nameHi) + '</div>' : '') +
        '<div class="pos-item-price-row">' +
          '<span class="pos-item-rate">' + rateText + '</span>' +
          '<span class="pos-item-unit">' + unitText + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    itemsContainer.innerHTML = html;

    // Attach click events
    itemsContainer.querySelectorAll('.pos-item-card').forEach(function (tile) {
      tile.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var item = catalogueItems.find(function (it) { return it.id === id; });
        if (item) openWeighModal(item);
      });
    });
  }

  // Open Weighing Modal
  function openWeighModal(item) {
    selectedItemForModal = item;
    modalSweetName.textContent = item.unit === 'kg' ? 'Weigh & Calculate Grams' : 'Select Quantity';
    modalItemTitle.textContent = item.name;
    modalItemDeva.textContent = item.nameHi || '';
    modalItemImg.src = item.photo ? 'assets/img/' + item.photo + '-400.jpg' : 'assets/img/kaju-katri-400.jpg';
    
    var unitLabel = item.unit === 'box' ? 'per box' : (item.unit === 'piece' ? 'per piece' : 'per kg');
    modalItemRateLabel.textContent = 'Official Rate: ' + inrRound(item.rate) + ' ' + unitLabel;

    if (item.unit === 'kg') {
      modalWeightControls.style.display = 'block';
      modalCountControls.style.display = 'none';
      modalInputGrams.value = '250';
      
      document.querySelectorAll('.pos-chip-btn').forEach(function (chip) {
        if (chip.getAttribute('data-grams') === '250') chip.classList.add('active');
        else chip.classList.remove('active');
      });
      recalcModalGramPrice(250);
    } else {
      modalWeightControls.style.display = 'none';
      modalCountControls.style.display = 'block';
      modalInputCount.value = '1';
      recalcModalCountPrice(1);
    }

    modalOverlay.classList.add('active');
  }

  function closeWeighModal() {
    modalOverlay.classList.remove('active');
    selectedItemForModal = null;
  }

  modalCloseBtn.addEventListener('click', closeWeighModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeWeighModal();
  });

  // Calculate Exact Gram Price: (Rate / 1000) * grams
  function recalcModalGramPrice(grams) {
    if (!selectedItemForModal || selectedItemForModal.unit !== 'kg') return;
    grams = Math.max(1, Number(grams) || 1);
    
    var rate = Number(selectedItemForModal.rate) || 0;
    var pricePerGram = rate / 1000.0;
    var total = pricePerGram * grams;

    modalCalcFormula.textContent = '(' + inrRound(rate) + ' ÷ 1000g) × ' + grams + 'g';
    modalCalcPrice.textContent = inr(total);
    modalCalcSub.textContent = 'Calculated for exact ' + grams + ' grams (' + (grams >= 1000 ? (grams/1000).toFixed(3) + ' kg' : grams + ' g') + ')';
  }

  // Calculate Unit Count Price
  function recalcModalCountPrice(count) {
    if (!selectedItemForModal || selectedItemForModal.unit === 'kg') return;
    count = Math.max(1, parseInt(count, 10) || 1);
    var rate = Number(selectedItemForModal.rate) || 0;
    var total = rate * count;
    var unitWord = selectedItemForModal.unit === 'box' ? (count > 1 ? 'boxes' : 'box') : (count > 1 ? 'pieces' : 'piece');

    modalCalcFormula.textContent = inrRound(rate) + ' × ' + count + ' ' + unitWord;
    modalCalcPrice.textContent = inr(total);
    modalCalcSub.textContent = 'Calculated for ' + count + ' ' + unitWord;
  }

  // Quick Gram Preset Chips
  document.querySelectorAll('.pos-chip-btn').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.pos-chip-btn').forEach(function (c) { c.classList.remove('active'); });
      this.classList.add('active');
      var g = parseInt(this.getAttribute('data-grams'), 10);
      modalInputGrams.value = g;
      recalcModalGramPrice(g);
    });
  });

  modalInputGrams.addEventListener('input', function () {
    var g = parseInt(this.value, 10) || 0;
    document.querySelectorAll('.pos-chip-btn').forEach(function (c) {
      if (parseInt(c.getAttribute('data-grams'), 10) === g) c.classList.add('active');
      else c.classList.remove('active');
    });
    recalcModalGramPrice(g);
  });

  if (modalGramMinus) {
    modalGramMinus.addEventListener('click', function () {
      var g = Math.max(25, (parseInt(modalInputGrams.value, 10) || 250) - 50);
      modalInputGrams.value = g;
      recalcModalGramPrice(g);
    });
  }

  if (modalGramPlus) {
    modalGramPlus.addEventListener('click', function () {
      var g = (parseInt(modalInputGrams.value, 10) || 250) + 50;
      modalInputGrams.value = g;
      recalcModalGramPrice(g);
    });
  }

  modalInputCount.addEventListener('input', function () {
    var c = parseInt(this.value, 10) || 1;
    recalcModalCountPrice(c);
  });

  modalCountMinus.addEventListener('click', function () {
    var c = Math.max(1, (parseInt(modalInputCount.value, 10) || 1) - 1);
    modalInputCount.value = c;
    recalcModalCountPrice(c);
  });

  modalCountPlus.addEventListener('click', function () {
    var c = (parseInt(modalInputCount.value, 10) || 1) + 1;
    modalInputCount.value = c;
    recalcModalCountPrice(c);
  });

  // Confirm and Add to Bill
  modalBtnConfirmAdd.addEventListener('click', function () {
    if (!selectedItemForModal) return;
    
    var item = selectedItemForModal;
    var lineAmount = 0;
    var grams = 0;
    var count = 1;

    if (item.unit === 'kg') {
      grams = Math.max(1, parseInt(modalInputGrams.value, 10) || 250);
      lineAmount = (Number(item.rate) / 1000.0) * grams;
    } else {
      count = Math.max(1, parseInt(modalInputCount.value, 10) || 1);
      lineAmount = Number(item.rate) * count;
    }

    cart.push({
      id: item.id + '-' + Date.now(),
      name: item.name,
      nameHi: item.nameHi,
      rate: item.rate,
      unit: item.unit,
      grams: grams,
      count: count,
      amount: lineAmount
    });

    closeWeighModal();
    renderCart();

    // Mobile badge update
    var mBadge = document.getElementById('pos-m-cart-badge');
    if (mBadge) mBadge.textContent = cart.length;
  });

  // Custom Item Modal Prompt
  document.getElementById('pos-btn-custom-item').addEventListener('click', function () {
    var name = prompt('Enter Custom Item Name:', 'Special Mithai / Farsan');
    if (!name) return;
    var rate = parseFloat(prompt('Enter Rate per Kg (or per piece) in ₹:', '600')) || 600;
    var unit = confirm('Is this item sold by weight in Kg? (Click Cancel for Piece/Box)') ? 'kg' : 'piece';

    var customItem = {
      id: 'custom-' + Date.now(),
      name: name,
      nameHi: '',
      category: 'custom',
      categories: ['custom'],
      rate: rate,
      unit: unit,
      photo: null
    };

    openWeighModal(customItem);
  });

  // Render Cart & Invoices
  function renderCart() {
    if (cart.length === 0) {
      cartTbody.innerHTML = '';
      cartEmptyMsg.style.display = 'block';
    } else {
      cartEmptyMsg.style.display = 'none';
      var html = cart.map(function (row, idx) {
        var qtyDisplay = '';
        var calcNote = '';
        if (row.unit === 'kg') {
          qtyDisplay = (row.grams >= 1000 ? (row.grams/1000).toFixed(3) + ' kg' : row.grams + ' g');
          calcNote = inrRound(row.rate) + '/kg × ' + qtyDisplay;
        } else {
          var uLabel = row.unit === 'box' ? (row.count > 1 ? 'boxes' : 'box') : (row.count > 1 ? 'pcs' : 'pc');
          qtyDisplay = row.count + ' ' + uLabel;
          calcNote = inrRound(row.rate) + '/' + row.unit + ' × ' + row.count;
        }

        return '<div class="pos-cart-item-row">' +
          '<div class="pos-cart-item-meta">' +
            '<div class="pos-cart-item-name">' + esc(row.name) + '</div>' +
            '<div class="pos-cart-item-calc">' + esc(calcNote) + '</div>' +
          '</div>' +
          '<div class="pos-cart-item-amount">' + inr(row.amount) + '</div>' +
          '<button class="pos-cart-del-btn" type="button" data-idx="' + idx + '" title="Remove item">&times;</button>' +
        '</div>';
      }).join('');
      cartTbody.innerHTML = html;

      // Attach delete row handlers
      cartTbody.querySelectorAll('.pos-cart-del-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = parseInt(this.getAttribute('data-idx'), 10);
          cart.splice(idx, 1);
          renderCart();
        });
      });
    }

    // Calculations
    var totalGrams = 0;
    var subtotal = 0;
    cart.forEach(function (row) {
      subtotal += row.amount;
      if (row.unit === 'kg') totalGrams += row.grams;
    });

    var fancyBoxCheck = document.getElementById('pos-toggle-fancy-box');
    var boxCharge = (fancyBoxCheck && fancyBoxCheck.checked && cart.length > 0) ? 50.0 : 0.0;
    var discountInput = document.getElementById('pos-discount-pct');
    var discPct = Math.min(50, Math.max(0, parseFloat(discountInput ? discountInput.value : 0) || 0));
    var discAmount = (subtotal * discPct) / 100.0;
    var grandTotal = Math.max(0, subtotal + boxCharge - discAmount);

    document.getElementById('pos-sum-items-count').textContent = cart.length + ' items' + (totalGrams > 0 ? ' (' + (totalGrams >= 1000 ? (totalGrams/1000).toFixed(3) + ' kg' : totalGrams + ' g') + ')' : '');
    document.getElementById('pos-sum-subtotal').textContent = inr(subtotal);
    document.getElementById('pos-sum-box-charge').textContent = boxCharge > 0 ? '+' + inr(boxCharge) : '₹0.00';
    document.getElementById('pos-sum-discount').textContent = discAmount > 0 ? '-' + inr(discAmount) : '-₹0.00';
    document.getElementById('pos-sum-grand-total').textContent = inr(grandTotal);

    // Mobile Bottom Bar Updates
    var mBadge = document.getElementById('pos-m-cart-badge');
    if (mBadge) mBadge.textContent = cart.length;
    var mTotal = document.getElementById('pos-m-bar-grand-total');
    if (mTotal) mTotal.textContent = inr(grandTotal);
    var mCount = document.getElementById('pos-m-bar-count-text');
    if (mCount) mCount.textContent = cart.length + ' items ' + (totalGrams > 0 ? '· ' + (totalGrams >= 1000 ? (totalGrams/1000).toFixed(3) + ' kg' : totalGrams + ' g') : '');

    // Update Print Slip
    updatePrintableSlip(subtotal, boxCharge, discAmount, grandTotal);
  }

  function updatePrintableSlip(subtotal, boxCharge, discAmount, grandTotal) {
    var now = new Date();
    document.getElementById('prn-inv-no').textContent = invoiceNum;
    document.getElementById('prn-inv-date').textContent = now.toLocaleDateString('en-IN');
    document.getElementById('prn-inv-time').textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    
    var custName = (document.getElementById('cust-name').value || '').trim() || 'Valued Patron';
    var custPhone = (document.getElementById('cust-phone').value || '').trim() || 'Counter Sale';
    document.getElementById('prn-cust-name').textContent = custName;
    document.getElementById('prn-cust-phone').textContent = custPhone;

    var prnTbody = document.getElementById('prn-table-body');
    if (cart.length === 0) {
      prnTbody.innerHTML = '<tr><td colspan="3" style="text-align:center">No items</td></tr>';
    } else {
      prnTbody.innerHTML = cart.map(function (row) {
        var wtStr = row.unit === 'kg' ? (row.grams >= 1000 ? (row.grams/1000).toFixed(3) + 'kg' : row.grams + 'g') : row.count + ' ' + row.unit;
        return '<tr>' +
          '<td>' + esc(row.name) + '</td>' +
          '<td>' + wtStr + '</td>' +
          '<td style="text-align:right">' + inr(row.amount) + '</td>' +
        '</tr>';
      }).join('');
    }

    document.getElementById('prn-subtotal').textContent = inr(subtotal);
    var boxRow = document.getElementById('prn-box-row');
    if (boxCharge > 0) {
      boxRow.style.display = '';
      document.getElementById('prn-box-charge').textContent = inr(boxCharge);
    } else {
      boxRow.style.display = 'none';
    }

    var discRow = document.getElementById('prn-disc-row');
    if (discAmount > 0) {
      discRow.style.display = '';
      document.getElementById('prn-disc-amt').textContent = '-' + inr(discAmount);
    } else {
      discRow.style.display = 'none';
    }

    document.getElementById('prn-grand-total').textContent = inr(grandTotal);
  }

  // Event Listeners for Recalculation
  document.getElementById('pos-toggle-fancy-box').addEventListener('change', renderCart);
  document.getElementById('pos-discount-pct').addEventListener('input', renderCart);
  document.getElementById('cust-name').addEventListener('input', renderCart);
  document.getElementById('cust-phone').addEventListener('input', renderCart);

  // Clear Cart / Reset Bill
  document.getElementById('btn-clear-cart').addEventListener('click', function () {
    if (cart.length > 0 && !confirm('Are you sure you want to clear this bill and start a new one?')) return;
    cart = [];
    document.getElementById('cust-name').value = '';
    document.getElementById('cust-phone').value = '';
    document.getElementById('pos-discount-pct').value = '0';
    document.getElementById('pos-toggle-fancy-box').checked = false;
    invoiceNum = 'ODD-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('pos-invoice-num').textContent = 'INV #' + invoiceNum;
    renderCart();
    switchMobileView('catalogue');
  });

  // Search & Filter Listeners
  searchInput.addEventListener('input', function (e) {
    searchQuery = (e.target.value || '').trim();
    renderCatalogue();
  });

  catButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      catButtons.forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      currentCategory = this.getAttribute('data-cat');
      renderCatalogue();
    });
  });

  // DIRECT PHONE DISPATCH: WHATSAPP
  document.getElementById('btn-send-whatsapp').addEventListener('click', function () {
    if (cart.length === 0) {
      alert('Please add at least one sweet item to the bill before dispatching.');
      return;
    }

    var phoneInput = document.getElementById('cust-phone').value.replace(/[^0-9]/g, '');
    var custName = (document.getElementById('cust-name').value || '').trim() || 'Patron';

    if (!phoneInput || phoneInput.length < 10) {
      phoneInput = prompt('Please enter customer’s 10-digit mobile number to send WhatsApp bill:', '');
      if (!phoneInput) return;
      phoneInput = phoneInput.replace(/[^0-9]/g, '');
      if (phoneInput.length < 10) {
        alert('Valid 10-digit mobile number required.');
        return;
      }
      document.getElementById('cust-phone').value = phoneInput.slice(-10);
    }

    var finalPhone = phoneInput.length === 10 ? '91' + phoneInput : phoneInput;

    var subtotal = 0;
    var totalGrams = 0;
    var itemLines = cart.map(function (row, idx) {
      subtotal += row.amount;
      var wtStr = row.unit === 'kg' ? (row.grams >= 1000 ? (row.grams/1000).toFixed(3) + ' kg' : row.grams + ' g') : row.count + ' ' + row.unit;
      if (row.unit === 'kg') totalGrams += row.grams;
      return (idx + 1) + '. *' + row.name + '*\n   ' + inrRound(row.rate) + '/' + row.unit + ' × ' + wtStr + ' = *' + inr(row.amount) + '*';
    }).join('\n');

    var boxCharge = document.getElementById('pos-toggle-fancy-box').checked ? 50.0 : 0.0;
    var discPct = parseFloat(document.getElementById('pos-discount-pct').value) || 0;
    var discAmount = (subtotal * discPct) / 100.0;
    var grandTotal = Math.max(0, subtotal + boxCharge - discAmount);

    var now = new Date();
    var dateStr = now.toLocaleDateString('en-IN');
    var timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    var msg = '👑 *OM\'S DEHLII DARBAR MITHAIWALA (Since 1947)*\n' +
              '📍 *Shop No. 20, Delisle Road, Lower Parel, Mumbai*\n' +
              '-----------------------------------------\n' +
              '🧾 *TAX INVOICE / CASH BILL*\n' +
              '🔢 *Bill No:* ' + invoiceNum + '\n' +
              '📅 *Date:* ' + dateStr + ' ' + timeStr + '\n' +
              '👤 *Customer:* ' + custName + '\n' +
              '-----------------------------------------\n' +
              itemLines + '\n' +
              '-----------------------------------------\n' +
              '💰 *Subtotal:* ' + inr(subtotal) + '\n';

    if (boxCharge > 0) msg += '🎁 *Fancy Gift Box:* ' + inr(boxCharge) + '\n';
    if (discAmount > 0) msg += '🏷️ *Discount (' + discPct + '%):* -' + inr(discAmount) + '\n';

    msg += '⭐ *GRAND TOTAL: ' + inr(grandTotal) + '*\n' +
           '-----------------------------------------\n' +
           '✨ *Freshness Rule:* Milk & Mawa sweets consume within 12 hours. Bengali sweets keep in fridge.\n' +
           '🙏 *Thank you for shopping with us! Have a sweet day!*';

    var waUrl = 'https://wa.me/' + finalPhone + '?text=' + encodeURIComponent(msg);
    window.open(waUrl, '_blank');
  });

  // DIRECT PHONE DISPATCH: SMS
  document.getElementById('btn-send-sms').addEventListener('click', function () {
    if (cart.length === 0) {
      alert('Please add at least one sweet item to the bill before dispatching.');
      return;
    }

    var phoneInput = document.getElementById('cust-phone').value.replace(/[^0-9]/g, '');
    var custName = (document.getElementById('cust-name').value || '').trim() || 'Patron';

    var subtotal = 0;
    cart.forEach(function (r) { subtotal += r.amount; });
    var boxCharge = document.getElementById('pos-toggle-fancy-box').checked ? 50.0 : 0.0;
    var discPct = parseFloat(document.getElementById('pos-discount-pct').value) || 0;
    var discAmount = (subtotal * discPct) / 100.0;
    var grandTotal = Math.max(0, subtotal + boxCharge - discAmount);

    var smsText = "Om's Dehlii Darbar Bill " + invoiceNum + " for " + custName + ": Total " + inr(grandTotal) + " (" + cart.length + " items). Thank you!";
    var smsUrl = 'sms:' + (phoneInput ? '+91' + phoneInput.slice(-10) : '') + '?body=' + encodeURIComponent(smsText);
    window.location.href = smsUrl;
  });

  // Initial Load
  renderCatalogue();
  renderCart();
});
