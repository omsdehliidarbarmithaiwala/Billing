/* Om's Dehlii Darbar POS Billing Terminal JS */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var SHOP_BACKUP_PHONE = '919820260299';
  var SHOP_GST = '27ABZPT1488R1Z4';
  var SHOP_FSSAI = '21521015000240';
  var SHOP_WEBSITE = 'https://omsdehliidarbarmithaiwala.github.io/Our-Website/';
  var SHOP_MAPS = 'https://maps.google.com/?q=Om%27s%20Dehlii%20Darbar%20Mithaiwala%2C%20Shop%20No.%2020%2C%20Shivaji%20Nagar%2C%20Delisle%20Road%2C%20Lower%20Parel%20%28E%29%2C%20Mumbai%20400013';
  var SHOP_ADDR = "Shop No. 20, Shivaji Nagar, Delisle Road, Lower Parel (E), Mumbai — 400 013";
  var SHOP_PHONES = "99208 79952 / 98202 60299";

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
  var modalInputBoxes = document.getElementById('modal-input-boxes');
  var modalBoxMinus = document.getElementById('modal-box-minus');
  var modalBoxPlus = document.getElementById('modal-box-plus');
  var boxChipButtons = document.querySelectorAll('.pos-chip-box-btn');

  function switchMobileView(view) {
    var mobileBottomBar = document.getElementById('pos-mobile-bottom-bar');
    if (view === 'cart') {
      tabCatalogueBtn.classList.remove('active');
      tabCartBtn.classList.add('active');
      catalogueCard.classList.add('mobile-hidden');
      billCard.classList.remove('mobile-hidden');
      if (mobileBottomBar) mobileBottomBar.style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      tabCatalogueBtn.classList.add('active');
      tabCartBtn.classList.remove('active');
      catalogueCard.classList.remove('mobile-hidden');
      billCard.classList.add('mobile-hidden');
      if (mobileBottomBar) mobileBottomBar.style.display = '';
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
      if (modalInputBoxes) modalInputBoxes.value = '1';
      
      document.querySelectorAll('.pos-chip-btn').forEach(function (chip) {
        if (chip.getAttribute('data-grams') === '250') chip.classList.add('active');
        else chip.classList.remove('active');
      });
      if (boxChipButtons) {
        boxChipButtons.forEach(function (chip) {
          if (chip.getAttribute('data-boxes') === '1') chip.classList.add('active');
          else chip.classList.remove('active');
        });
      }
      recalcModalGramPrice(250, 1);
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

  // Calculate Exact Gram Price: (Rate / 1000) * grams * boxes
  function recalcModalGramPrice(grams, boxes) {
    if (!selectedItemForModal || selectedItemForModal.unit !== 'kg') return;
    grams = Math.max(1, Number(grams) || 1);
    if (boxes === undefined) {
      boxes = modalInputBoxes ? (parseInt(modalInputBoxes.value, 10) || 1) : 1;
    }
    boxes = Math.max(1, Number(boxes) || 1);
    
    var rate = Number(selectedItemForModal.rate) || 0;
    var pricePerGram = rate / 1000.0;
    var pricePerBox = pricePerGram * grams;
    var total = pricePerBox * boxes;
    var totalGrams = grams * boxes;

    if (boxes > 1) {
      modalCalcFormula.textContent = boxes + ' boxes × (' + inrRound(rate) + ' ÷ 1000g × ' + grams + 'g)';
      modalCalcPrice.textContent = inr(total);
      var totalWtStr = totalGrams >= 1000 ? (totalGrams / 1000).toFixed(3) + ' kg' : totalGrams + ' g';
      modalCalcSub.textContent = boxes + ' boxes of ' + grams + 'g each (' + inr(pricePerBox) + '/box · Total: ' + totalWtStr + ')';
    } else {
      modalCalcFormula.textContent = '(' + inrRound(rate) + ' ÷ 1000g) × ' + grams + 'g';
      modalCalcPrice.textContent = inr(total);
      modalCalcSub.textContent = 'Calculated for exact ' + grams + ' grams (' + (grams >= 1000 ? (grams/1000).toFixed(3) + ' kg' : grams + ' g') + ')';
    }
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
      var b = modalInputBoxes ? (parseInt(modalInputBoxes.value, 10) || 1) : 1;
      recalcModalGramPrice(g, b);
    });
  });

  modalInputGrams.addEventListener('input', function () {
    var g = parseInt(this.value, 10) || 0;
    document.querySelectorAll('.pos-chip-btn').forEach(function (c) {
      if (parseInt(c.getAttribute('data-grams'), 10) === g) c.classList.add('active');
      else c.classList.remove('active');
    });
    var b = modalInputBoxes ? (parseInt(modalInputBoxes.value, 10) || 1) : 1;
    recalcModalGramPrice(g, b);
  });

  if (modalGramMinus) {
    modalGramMinus.addEventListener('click', function () {
      var g = Math.max(25, (parseInt(modalInputGrams.value, 10) || 250) - 50);
      modalInputGrams.value = g;
      var b = modalInputBoxes ? (parseInt(modalInputBoxes.value, 10) || 1) : 1;
      recalcModalGramPrice(g, b);
    });
  }

  if (modalGramPlus) {
    modalGramPlus.addEventListener('click', function () {
      var g = (parseInt(modalInputGrams.value, 10) || 250) + 50;
      modalInputGrams.value = g;
      var b = modalInputBoxes ? (parseInt(modalInputBoxes.value, 10) || 1) : 1;
      recalcModalGramPrice(g, b);
    });
  }

  // Quick Box / Packs Preset Chips & Steppers for Weighed Items
  if (boxChipButtons) {
    boxChipButtons.forEach(function (chip) {
      chip.addEventListener('click', function () {
        boxChipButtons.forEach(function (c) { c.classList.remove('active'); });
        this.classList.add('active');
        var b = parseInt(this.getAttribute('data-boxes'), 10) || 1;
        if (modalInputBoxes) modalInputBoxes.value = b;
        var g = parseInt(modalInputGrams.value, 10) || 250;
        recalcModalGramPrice(g, b);
      });
    });
  }

  if (modalInputBoxes) {
    modalInputBoxes.addEventListener('input', function () {
      var b = Math.max(1, parseInt(this.value, 10) || 1);
      if (boxChipButtons) {
        boxChipButtons.forEach(function (c) {
          if (parseInt(c.getAttribute('data-boxes'), 10) === b) c.classList.add('active');
          else c.classList.remove('active');
        });
      }
      var g = parseInt(modalInputGrams.value, 10) || 250;
      recalcModalGramPrice(g, b);
    });
  }

  if (modalBoxMinus) {
    modalBoxMinus.addEventListener('click', function () {
      var cur = parseInt(modalInputBoxes.value, 10) || 1;
      var b = Math.max(1, cur - 1);
      modalInputBoxes.value = b;
      if (boxChipButtons) {
        boxChipButtons.forEach(function (c) {
          if (parseInt(c.getAttribute('data-boxes'), 10) === b) c.classList.add('active');
          else c.classList.remove('active');
        });
      }
      var g = parseInt(modalInputGrams.value, 10) || 250;
      recalcModalGramPrice(g, b);
    });
  }

  if (modalBoxPlus) {
    modalBoxPlus.addEventListener('click', function () {
      var cur = parseInt(modalInputBoxes.value, 10) || 1;
      var b = cur + 1;
      modalInputBoxes.value = b;
      if (boxChipButtons) {
        boxChipButtons.forEach(function (c) {
          if (parseInt(c.getAttribute('data-boxes'), 10) === b) c.classList.add('active');
          else c.classList.remove('active');
        });
      }
      var g = parseInt(modalInputGrams.value, 10) || 250;
      recalcModalGramPrice(g, b);
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
    var boxes = 1;

    if (item.unit === 'kg') {
      grams = Math.max(1, parseInt(modalInputGrams.value, 10) || 250);
      boxes = Math.max(1, parseInt(modalInputBoxes ? modalInputBoxes.value : 1, 10) || 1);
      count = boxes;
      lineAmount = (Number(item.rate) / 1000.0) * grams * boxes;
    } else {
      count = Math.max(1, parseInt(modalInputCount.value, 10) || 1);
      boxes = count;
      lineAmount = Number(item.rate) * count;
    }

    cart.push({
      id: item.id + '-' + Date.now(),
      name: item.name,
      nameHi: item.nameHi,
      rate: item.rate,
      unit: item.unit,
      grams: grams,
      boxes: boxes,
      count: count,
      totalGrams: item.unit === 'kg' ? (grams * boxes) : 0,
      amount: lineAmount
    });

    closeWeighModal();
    renderCart();

    var mBadge = document.getElementById('pos-m-cart-badge');
    if (mBadge) mBadge.textContent = cart.length;

    var wtDesc = '';
    if (item.unit === 'kg') {
      var singleWt = (grams >= 1000 ? (grams/1000).toFixed(1) + 'kg' : grams + 'g');
      wtDesc = boxes > 1 ? (boxes + ' boxes × ' + singleWt) : singleWt;
    } else {
      var uWrd = item.unit === 'box' ? (count > 1 ? 'boxes' : 'box') : (count > 1 ? 'pcs' : 'pc');
      wtDesc = count + ' ' + uWrd;
    }
    showNotification('✅ Added ' + wtDesc + ' ' + item.name + ' (' + inr(lineAmount) + ') to Bill!');

    if (navigator.vibrate) {
      try { navigator.vibrate(40); } catch (e) {}
    }
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
        var boxes = row.boxes || row.count || 1;

        if (row.unit === 'kg') {
          var singleWt = (row.grams >= 1000 ? (row.grams/1000) + 'kg' : row.grams + 'g');
          if (boxes > 1) {
            var totalG = row.grams * boxes;
            var totalWt = totalG >= 1000 ? (totalG/1000).toFixed(3) + ' kg' : totalG + ' g';
            qtyDisplay = boxes + ' boxes × ' + singleWt;
            calcNote = inrRound(row.rate) + '/kg · ' + boxes + ' boxes × ' + singleWt + ' (Total: ' + totalWt + ')';
          } else {
            qtyDisplay = singleWt;
            calcNote = inrRound(row.rate) + '/kg × ' + singleWt;
          }
        } else {
          var uLabel = row.unit === 'box' ? (boxes > 1 ? 'boxes' : 'box') : (boxes > 1 ? 'pcs' : 'pc');
          qtyDisplay = boxes + ' ' + uLabel;
          calcNote = inrRound(row.rate) + '/' + row.unit + ' × ' + boxes;
        }

        return '<div class="pos-cart-item-row">' +
          '<div class="pos-cart-item-meta">' +
            '<div class="pos-cart-item-name">' + esc(row.name) +
              '<span class="pos-cart-item-qty-tag">' + esc(qtyDisplay) + '</span>' +
            '</div>' +
            '<div class="pos-cart-item-calc">' + esc(calcNote) + '</div>' +
          '</div>' +
          '<div class="pos-cart-item-qty-adjust">' +
            '<button type="button" class="pos-cart-qty-btn pos-cart-qty-minus" data-idx="' + idx + '" title="Decrease quantity">-</button>' +
            '<span class="pos-cart-qty-val">' + boxes + '</span>' +
            '<button type="button" class="pos-cart-qty-btn pos-cart-qty-plus" data-idx="' + idx + '" title="Increase quantity">+</button>' +
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

      // Attach quantity adjusters (+ / -) in cart list
      cartTbody.querySelectorAll('.pos-cart-qty-plus').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = parseInt(this.getAttribute('data-idx'), 10);
          var row = cart[idx];
          if (!row) return;
          var cur = row.boxes || row.count || 1;
          cur++;
          row.boxes = cur;
          row.count = cur;
          if (row.unit === 'kg') {
            row.totalGrams = row.grams * cur;
            row.amount = (Number(row.rate) / 1000.0) * row.totalGrams;
          } else {
            row.amount = Number(row.rate) * cur;
          }
          renderCart();
        });
      });

      cartTbody.querySelectorAll('.pos-cart-qty-minus').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = parseInt(this.getAttribute('data-idx'), 10);
          var row = cart[idx];
          if (!row) return;
          var cur = row.boxes || row.count || 1;
          if (cur > 1) {
            cur--;
            row.boxes = cur;
            row.count = cur;
            if (row.unit === 'kg') {
              row.totalGrams = row.grams * cur;
              row.amount = (Number(row.rate) / 1000.0) * row.totalGrams;
            } else {
              row.amount = Number(row.rate) * cur;
            }
          } else {
            cart.splice(idx, 1);
          }
          renderCart();
        });
      });
    }

    // Calculations
    var totalGrams = 0;
    var subtotal = 0;
    cart.forEach(function (row) {
      subtotal += row.amount;
      if (row.unit === 'kg') {
        var b = row.boxes || row.count || 1;
        totalGrams += (row.grams * b);
      }
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

    // Update Print Slip & PDF Container
    updatePrintableSlip(subtotal, boxCharge, discAmount, grandTotal);
    updatePdfContainer(subtotal, boxCharge, discAmount, grandTotal);
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
        var wtStr = '';
        var boxes = row.boxes || row.count || 1;
        if (row.unit === 'kg') {
          var singleWt = row.grams >= 1000 ? (row.grams/1000).toFixed(3) + 'kg' : row.grams + 'g';
          if (boxes > 1) {
            wtStr = boxes + ' bxs × ' + singleWt;
          } else {
            wtStr = singleWt;
          }
        } else {
          wtStr = boxes + ' ' + row.unit;
        }

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

  function updatePdfContainer(subtotal, boxCharge, discAmount, grandTotal) {
    if (!document.getElementById('pos-royal-pdf-container')) return;
    var now = new Date();
    document.getElementById('pdf-inv-no').textContent = invoiceNum;
    document.getElementById('pdf-inv-date').textContent = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    document.getElementById('pdf-inv-time').textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    var custName = (document.getElementById('cust-name').value || '').trim() || 'Valued Patron';
    var custPhone = (document.getElementById('cust-phone').value || '').trim() || 'Counter Sale';
    document.getElementById('pdf-cust-name').textContent = custName;
    document.getElementById('pdf-cust-phone').textContent = custPhone;

    var pdfTbody = document.getElementById('pdf-table-body');
    if (cart.length === 0) {
      pdfTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px">No sweets added to this invoice.</td></tr>';
    } else {
      pdfTbody.innerHTML = cart.map(function (row, idx) {
        var rateStr = inrRound(row.rate) + (row.unit === 'box' ? '/box' : (row.unit === 'piece' ? '/pc' : '/kg'));
        var wtStr = '';
        var boxes = row.boxes || row.count || 1;

        if (row.unit === 'kg') {
          var singleWt = (row.grams >= 1000 ? (row.grams/1000).toFixed(3) + ' kg' : row.grams + ' g');
          if (boxes > 1) {
            var totalG = row.grams * boxes;
            var totalWt = totalG >= 1000 ? (totalG/1000).toFixed(3) + ' kg' : totalG + ' g';
            wtStr = '<b>' + boxes + ' boxes × ' + singleWt + '</b><div style="font-size:10px;color:#7c6a55;font-weight:normal">(Total: ' + totalWt + ')</div>';
          } else {
            wtStr = '<b>' + singleWt + '</b>';
          }
        } else {
          var uLabel = row.unit === 'box' ? (boxes > 1 ? 'boxes' : 'box') : (boxes > 1 ? 'pcs' : 'pc');
          wtStr = '<b>' + boxes + ' ' + uLabel + '</b>';
        }

        var deva = row.nameHi ? ' <span style="font-size:11px;color:#7c6a55">(' + esc(row.nameHi) + ')</span>' : '';

        return '<tr>' +
          '<td style="text-align:center;font-weight:bold">' + (idx + 1) + '</td>' +
          '<td><b>' + esc(row.name) + '</b>' + deva + '</td>' +
          '<td style="text-align:center">' + rateStr + '</td>' +
          '<td style="text-align:center">' + wtStr + '</td>' +
          '<td style="text-align:right;font-weight:bold;color:var(--burgundy)">' + inr(row.amount) + '</td>' +
        '</tr>';
      }).join('');
    }

    document.getElementById('pdf-subtotal').textContent = inr(subtotal);
    var boxRow = document.getElementById('pdf-box-row');
    if (boxCharge > 0) {
      boxRow.style.display = '';
      document.getElementById('pdf-box-charge').textContent = inr(boxCharge);
    } else {
      boxRow.style.display = 'none';
    }

    var discRow = document.getElementById('pdf-disc-row');
    if (discAmount > 0) {
      discRow.style.display = '';
      document.getElementById('pdf-disc-amt').textContent = '-' + inr(discAmount);
    } else {
      discRow.style.display = 'none';
    }

    document.getElementById('pdf-grand-total').textContent = inr(grandTotal);
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

  // HELPER: Build Full Formatted WhatsApp Message
  function buildWhatsAppBillMessage(isBackup) {
    var phoneInput = document.getElementById('cust-phone').value.replace(/[^0-9]/g, '');
    var custName = (document.getElementById('cust-name').value || '').trim() || 'Valued Patron';

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

    var header = isBackup ? '🛡️ *[SHOP RECORD & BACKUP COPY]*\n' : '';

    var msg = header +
              '👑 *OM\'S DEHLII DARBAR MITHAIWALA (Since 1947)*\n' +
              '📍 *Shop No. 20, Delisle Road, Lower Parel, Mumbai — 400 013*\n' +
              '📞 *Hotline:* ' + SHOP_PHONES + '\n' +
              '🌐 *Our Official Website & Menu:* ' + SHOP_WEBSITE + '\n' +
              '🏛️ *GSTIN:* ' + SHOP_GST + ' | *FSSAI Lic:* ' + SHOP_FSSAI + '\n' +
              '-----------------------------------------\n' +
              '🧾 *TAX INVOICE / CASH BILL*\n' +
              '🔢 *Bill No:* ' + invoiceNum + '\n' +
              '📅 *Date:* ' + dateStr + ' ' + timeStr + '\n' +
              '👤 *Customer:* ' + custName + ' (' + (phoneInput || 'Counter Sale') + ')\n' +
              '-----------------------------------------\n' +
              itemLines + '\n' +
              '-----------------------------------------\n' +
              '💰 *Subtotal:* ' + inr(subtotal) + '\n';

    if (boxCharge > 0) msg += '🎁 *Luxury Sweet Box:* ' + inr(boxCharge) + '\n';
    if (discAmount > 0) msg += '🏷️ *Discount (' + discPct + '%):* -' + inr(discAmount) + '\n';

    msg += '⭐ *GRAND TOTAL: ' + inr(grandTotal) + '*\n' +
           '-----------------------------------------\n' +
           '📄 *Official PDF Tax Invoice attached / generated.*\n' +
           '🌐 *Explore all sweets on our website:* ' + SHOP_WEBSITE + '\n' +
           '✨ *Freshness Rule:* Milk & Mawa sweets consume within 12 hours. Bengali sweets keep in fridge.\n' +
           '🙏 *Thank you for shopping with us! Have a sweet day!*';

    return msg;
  }

  // GENERATE PDF BLOB HELPER (A4 PERFECT FIT & NO SCREEN FLICKER)
  function generatePdfPromise() {
    var container = document.getElementById('pos-royal-pdf-container');
    if (!container) return Promise.reject('No PDF container found');

    // Ensure totals and invoice data are freshly calculated
    if (typeof renderCart === 'function') {
      renderCart();
    }

    // Host container in offscreen hidden wrapper so user sees zero screen flicker
    var host = document.getElementById('pdf-offscreen-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'pdf-offscreen-host';
      host.style.cssText = 'position: fixed; left: 0; top: 0; width: 0; height: 0; overflow: hidden; z-index: -99999; pointer-events: none;';
      document.body.appendChild(host);
    }
    host.appendChild(container);

    // Style container inside host for clean full-width clone with balanced padding to prevent right-edge clipping
    container.style.cssText = 'position: relative !important; left: 0 !important; top: 0 !important; width: 100% !important; opacity: 1 !important; display: block !important; padding: 0 14px 0 6px !important; box-sizing: border-box !important;';

    var box = container.querySelector('.pdf-invoice-box');
    if (box) {
      box.style.cssText = 'box-sizing: border-box !important; width: 100% !important; max-width: 700px !important; margin: 0 auto !important; border: 2px solid #C49A45 !important; padding: 14px 16px !important; background: #ffffff !important;';
    }

    var custName = (document.getElementById('cust-name').value || 'Customer').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    var filename = 'Invoice_' + invoiceNum + '_' + custName + '.pdf';

    var opt = {
      margin: [8, 8, 8, 8],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
      return html2pdf().from(container).set(opt).outputPdf('blob').then(function (blob) {
        container.style.display = 'none';
        container.style.cssText = '';
        if (box) box.style.cssText = '';
        return { blob: blob, filename: filename };
      }).catch(function (e) {
        container.style.display = 'none';
        container.style.cssText = '';
        if (box) box.style.cssText = '';
        throw e;
      });
    } else {
      container.style.display = 'none';
      container.style.cssText = '';
      if (box) box.style.cssText = '';
      return Promise.resolve(null);
    }
  }

  // AUTOMATIC SHOP RECORD BACKUP (+91 9820260299)
  function triggerShopBackupAuto() {
    var backupMsg = buildWhatsAppBillMessage(true);
    var backupUrl = 'https://wa.me/' + SHOP_BACKUP_PHONE + '?text=' + encodeURIComponent(backupMsg);
    setTimeout(function () {
      window.open(backupUrl, '_blank');
      showNotification('🛡️ Shop record copy sent to +91 9820260299!');
    }, 1500);
  }

  // 1-TAP WHATSAPP: Send Bill to Customer + Auto-Backup to Shop
  document.getElementById('btn-send-whatsapp').addEventListener('click', function () {
    if (cart.length === 0) {
      alert('Please add at least one sweet item to the bill before dispatching.');
      return;
    }

    var phoneInput = document.getElementById('cust-phone').value.replace(/[^0-9]/g, '');

    if (!phoneInput || phoneInput.length < 10) {
      phoneInput = prompt("Enter customer 10-digit mobile number for WhatsApp:", "");
      if (!phoneInput) return;
      phoneInput = phoneInput.replace(/[^0-9]/g, '');
      if (phoneInput.length < 10) {
        alert('Valid 10-digit mobile number required.');
        return;
      }
      document.getElementById('cust-phone').value = phoneInput.slice(-10);
    }

    var finalPhone = phoneInput.length === 10 ? '91' + phoneInput : phoneInput;
    var msg = buildWhatsAppBillMessage(false);
    var waUrl = 'https://wa.me/' + finalPhone + '?text=' + encodeURIComponent(msg);
    window.open(waUrl, '_blank');

    triggerShopBackupAuto();
    showNotification('✅ WhatsApp bill opened! Shop record copy auto-sent.');
  });

  // MANUAL SHOP BACKUP BUTTON (+91 9820260299)
  document.getElementById('btn-send-backup').addEventListener('click', function () {
    if (cart.length === 0) {
      alert('Please add items to bill first.');
      return;
    }

    var msg = buildWhatsAppBillMessage(true);
    var waUrl = 'https://wa.me/' + SHOP_BACKUP_PHONE + '?text=' + encodeURIComponent(msg);
    window.open(waUrl, '_blank');
    showNotification('🛡️ Shop record backup sent to +91 9820260299!');
  });

  // 2. PRINT THERMAL BILL (80mm ESC/POS RECEIPT SLIP)
  var btnThermal = document.getElementById('btn-thermal-print');
  if (btnThermal) {
    btnThermal.addEventListener('click', function () {
      if (cart.length === 0) {
        alert('Please add at least one sweet item to the bill before printing.');
        return;
      }
      renderCart();
      window.print();
    });
  }

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

    var smsText = "Om's Dehlii Darbar Bill " + invoiceNum + " for " + custName + ": Total " + inr(grandTotal) + " (" + cart.length + " items). Website: " + SHOP_WEBSITE + " | GSTIN: " + SHOP_GST + ", FSSAI: " + SHOP_FSSAI + ". Thank you!";
    var smsUrl = 'sms:' + (phoneInput ? '+91' + phoneInput.slice(-10) : '') + '?body=' + encodeURIComponent(smsText);
    window.location.href = smsUrl;
  });

  // Initial Load
  renderCatalogue();
  renderCart();
});
