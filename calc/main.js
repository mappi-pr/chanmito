const TAX_RATE = 0.10;

  // メニュー価格
  const MENU_PRICES = {
    drink: [600, 800, 1000, 1500],
    food: [1000, 1500, 2000],
    amuse: [1000, 1500]
  };

  // メニュー名とアイコン
  const MENU_INFO = {
    drink: { label: 'ドリンク', icon: '🍹' },
    food: { label: 'フード', icon: '🍽️' },
    amuse: { label: 'アミュ', icon: '📷' }
  };

  // 選択メニュー配列
  let items = { drink: [], food: [], amuse: [] };

  // 価格ごとのカウント管理（表示用）
  function initCounts() {
    const counts = {};
    for (const type in MENU_PRICES) {
      counts[type] = {};
      MENU_PRICES[type].forEach(price => counts[type][price] = 0);
    }
    return counts;
  }
  let counts = initCounts();

  // 入店時間（Dateオブジェクト）
  let startTime = null;
  // 退店予定時間
  let plannedExitTime = null;

  // --- 警告表示管理（重複防止） ---
  let closedNotice = '';
  let shortageNotice = '';

  // 営業時間外表示文（定数化して場所ごとの差を明確に）
  const CLOSED_NOTICE_ENTER = '※05:00〜12:00は営業時間外です。';
  const CLOSED_NOTICE_SPECIFIED = '※指定時刻は05:00〜12:00の営業時間外です。';

  function renderWarning() {
    const warningEl = document.getElementById('warning');
    if (!warningEl) return;
    warningEl.textContent = [closedNotice, shortageNotice].filter(Boolean).join(' ');
  }

  function setClosedNotice(msg) { closedNotice = msg || ''; renderWarning(); }
  function clearClosedNotice() { closedNotice = ''; renderWarning(); }
  // ショートネスをセット（closedNotice は消さない。両方表示する）
  function setShortageNotice(msg) { shortageNotice = msg || ''; renderWarning(); }
  function clearShortageNotice() { shortageNotice = ''; renderWarning(); }
  // --- ここまで追加 ---

  // メニューUI生成
  function generateMenuUI() {
    const container = document.getElementById('menuSection');
    container.innerHTML = '';
    for (const type in MENU_PRICES) {
      const info = MENU_INFO[type];
      const section = document.createElement('div');
      section.classList.add('menu-category');

      const title = document.createElement('h3');
      title.textContent = `${info.icon} ${info.label}`;
      section.appendChild(title);

      MENU_PRICES[type].forEach(price => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('menu-item');

        const priceLabel = document.createElement('span');
        priceLabel.className = 'item-label';
        priceLabel.textContent = `${price}円`;

        const controls = document.createElement('div');
        controls.className = 'item-controls';

        const btnAdd = document.createElement('button');
        btnAdd.textContent = '＋';
        btnAdd.addEventListener('click', () => addItem(type, price));

        const countSpan = document.createElement('span');
        countSpan.className = 'count-display';
        countSpan.id = `${type}Count${price}`;
        countSpan.textContent = '0';

        const btnRemove = document.createElement('button');
        btnRemove.textContent = '－';
        btnRemove.addEventListener('click', () => removeItem(type, price));

        // controls内に追加
        controls.appendChild(btnAdd);
        controls.appendChild(countSpan);
        controls.appendChild(btnRemove);

        // wrapperに追加
        wrapper.appendChild(priceLabel);
        wrapper.appendChild(controls);

        section.appendChild(wrapper);
      });

      container.appendChild(section);
    }
  }

  // UI更新関数
  function updateCountsUI() {
    for (const type in counts) {
      for (const price in counts[type]) {
        const el = document.getElementById(`${type}Count${price}`);
        if (el) el.textContent = counts[type][price];
      }
    }
  }

  // アイテム追加
  function addItem(type, price) {
    items[type].push(price);
    counts[type][price]++;
    updateCountsUI();
    calculateAndDisplay();
  }

  // アイテム削除
  function removeItem(type, price) {
    const idx = items[type].indexOf(price);
    if (idx !== -1) {
      items[type].splice(idx, 1);
      counts[type][price]--;
      updateCountsUI();
      calculateAndDisplay();
    }
  }

  // 時刻の差を分で返す（負なら0）
  function diffMinutes(t1, t2) {
    const diffMs = t2.getTime() - t1.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  }

  // 時刻フォーマット HH:MM
  function formatTime(date) {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  // input type="time" 用フォーマット
  function formatTimeForInput(date) {
    return formatTime(date);
  }

  // --- ここから追加: 時刻判定ユーティリティ ---
  // 指定日時の深夜0時からの分数を返す
  function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  // 営業時間外チェック（05:00〜12:00 を営業時間外とする）
  function isWithinClosedPeriod(date) {
    if (!date || !(date instanceof Date)) return false;
    const m = minutesSinceMidnight(date);
    const start = 5 * 60;   // 05:00
    const end = 12 * 60;    // 12:00
    return m >= start && m < end;
  }

  // ラスト入店不可時間帯チェック（22:30〜23:00）
  function isWithinLateAdmission(date) {
    if (!date || !(date instanceof Date)) return false;
    const m = minutesSinceMidnight(date);
    const start = 22 * 60 + 30; // 22:30
    const end = 23 * 60;        // 23:00
    return m >= start && m < end;
  }
  // --- ここまで追加 ---

  // 入店ボタン押下時の処理
  document.getElementById('enterBtn').addEventListener('click', () => {
	const now = new Date();

	// 営業時間外チェック（05:00〜12:00） → 重複しないよう closedNotice を設定
	if (isWithinClosedPeriod(now)) {
		setClosedNotice(CLOSED_NOTICE_ENTER);
	} else {
		clearClosedNotice();
	}

	// ラストオーダー時間帯チェック（22:30〜23:00） → ブロックするエラーは shortageNotice として出し全体を上書き
	if (isWithinLateAdmission(now)) {
		setClosedNotice('');
		setShortageNotice('22:30〜23:00はラストオーダー超過のため入店できません。');
		return;
	}

	startTime = now;
	clearShortageNotice(); // 入店成功時は不足メッセージをクリア
 	document.getElementById('startTimeDisplay').textContent = formatTime(startTime);
 	calculateAndDisplay();
 	startStayTimer();
   });

   // 時刻編集ボタン押下
   document.getElementById('editTimeBtn').addEventListener('click', () => {
    if (!startTime) {
      // 優先で表示したいメッセージは shortageNotice としてセット（完全に上書き）
      setClosedNotice('');
      setShortageNotice('まず入店時刻を登録してください。');
      return;
    } else {
      clearClosedNotice();
      clearShortageNotice();
    }
     document.getElementById('manualTimeInput').value = formatTimeForInput(startTime);
     document.getElementById('editTimeSection').style.display = 'block';
   });

   // 時刻保存
   document.getElementById('saveTimeBtn').addEventListener('click', () => {
 	const val = document.getElementById('manualTimeInput').value;
 	if (!val) return alert('時刻を入力してください。');
 	const [hh, mm] = val.split(':').map(Number);
 	if (isNaN(hh) || isNaN(mm)) return alert('正しい時刻を入力してください。');
 	const nowDate = new Date();
 	const dt = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), hh, mm);

 	// 営業時間外チェック：手動設定では不可（警告のみではなくブロック）
 	// 注意：ここはブロック（アラート）しており、closedNotice を設定しない実装です。
 	if (isWithinClosedPeriod(dt)) {
 		alert('指定された時刻は05:00〜12:00の営業時間外です。別の時刻を指定してください。');
 		return;
 	} else {
 		clearClosedNotice();
 	}
 	// ラストオーダー時間帯チェック（従来どおりブロック）
 	if (isWithinLateAdmission(dt)) {
 		alert('22:30〜23:00はラストオーダー超過のため入店できません。別の時刻を指定してください。');
 		return;
 	}

 	startTime = dt;
 	document.getElementById('startTimeDisplay').textContent = formatTime(startTime);
 	document.getElementById('editTimeSection').style.display = 'none';
 	calculateAndDisplay();
   });

   // 時刻編集キャンセル
   document.getElementById('cancelTimeBtn').addEventListener('click', () => {
     document.getElementById('editTimeSection').style.display = 'none';
   });

   // 退店予定時刻保存
   document.getElementById('saveExitBtn').addEventListener('click', () => {
     const val = document.getElementById('plannedExitTimeInput').value;
     if (!val) {
       alert('退店予定時刻を入力してください。');
       return;
     }

     const [hh, mm] = val.split(':').map(Number);
     if (isNaN(hh) || isNaN(mm)) {
       alert('正しい時刻を入力してください。');
       return;
     }

     const now = new Date();
     let candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm);

     // 入店時刻より前になってしまった場合は翌日に調整
     if (candidate < startTime) {
       candidate.setDate(candidate.getDate() + 1);
     }

     // 営業時間外チェック（退店予定が営業時間外なら警告表示のみに変更）
    if (isWithinClosedPeriod(candidate)) {
      setClosedNotice(CLOSED_NOTICE_SPECIFIED);
    } else {
      clearClosedNotice();
    }

     plannedExitTime = candidate;
     // ★ 追加：滞在時間・延長分・最低料金を即計算
     calculateAndDisplay();
   });


  // 退店予定時刻クリア
  document.getElementById('clearExitBtn').addEventListener('click', () => {
    plannedExitTime = null;
    document.getElementById('plannedExitTimeInput').value = '';
  });

  // 消費税モード切替時
  document.querySelectorAll('input[name="taxMode"]').forEach(radio => {
     radio.addEventListener('change', () => {
       calculateAndDisplay();
     });
   });

   // 合計計算・表示
   function calculateAndDisplay() {
     if (!startTime) {
      document.getElementById('result').textContent = '合計：--円';
      document.getElementById('stayMinutes').textContent = '0';
      // startTime 未設定時は全ての警告をクリア
      clearClosedNotice();
      clearShortageNotice();
       return;
     }

    // ▶ 滞在時間計算（退店予定があればそちらを優先）
    let now = new Date();

    // plannedExitTime が設定されている場合
    if (plannedExitTime) {
      // 入店時刻より前なら無視
      if (plannedExitTime < startTime) {
        plannedExitTime = null;
      } else {
        now = plannedExitTime;
      }
    }

    // 日をまたいだ滞在も正しく計算
    const stayMs = now.getTime() - startTime.getTime();
    const stayMin = Math.max(0, Math.floor(stayMs / 60000));
    document.getElementById('stayMinutes').textContent = stayMin;

    // ===== 基本設定 =====
    const baseCharge = 800;              // 初回60分チャージ
    const baseDrinkMinPrice = 600;       // 最低ドリンク価格
    const baseAmuseMinPrice = 1000;      // 最低アミュ価格
    const extensionUnitMin = 30;         // 延長単位
    const extensionCharge = 400;         // 延長料金

    // 延長回数
    let extensionCount = 0;
    if (stayMin > 60) {
      extensionCount = Math.ceil((stayMin - 60) / extensionUnitMin);
    }

    // チャージ料金
    const chargeTotal = baseCharge + extensionCharge * extensionCount;

    // メニュー合計
    let menuTotal = 0;
    for (const type in items) {
      menuTotal += items[type].reduce((a, v) => a + v, 0);
    }

    // ===== 必要オーダー数の判定 =====
    const drinkCount = items.drink.length;
    const amuseCount = items.amuse.length;

    let drinkShortage = Math.max(0, 1 - drinkCount);
    let amuseShortage = Math.max(0, 1 - amuseCount);

    let orShortageCount = 0;
    if (extensionCount > 0) {
      const provided = Math.max(0, drinkCount - 1) + Math.max(0, amuseCount - 1);
      orShortageCount = Math.max(0, extensionCount - provided);
    }

    const forcedDrinkPrice = baseDrinkMinPrice * drinkShortage;
    const forcedAmusePrice = baseAmuseMinPrice * amuseShortage;
    const forcedOrPrice = Math.min(baseDrinkMinPrice, baseAmuseMinPrice) * orShortageCount;

    // ===== 警告表示 =====
    // 不足メッセージは shortageNotice にセット（閉店注意は closedNotice 側で保持）
    let shortageMsg = '';
    if (drinkShortage > 0 || amuseShortage > 0) {
      shortageMsg += `入店時の必須オーダー（1ドリンク＋1アミュ）が不足しています。`;
    }
    if (orShortageCount > 0) {
      shortageMsg += ` 延長分のドリンク/アミュが不足しています（不足 ${orShortageCount}件）。`;
    }
    if (shortageMsg) setShortageNotice(shortageMsg); else clearShortageNotice();

     // ===== 小計・合計計算（日本の消費税ルール） =====
     const taxMode = document.querySelector('input[name="taxMode"]:checked').value;
     let subTotal = chargeTotal + menuTotal + forcedDrinkPrice + forcedAmusePrice + forcedOrPrice;
     let tax = 0;
     let total = subTotal;

     if (taxMode === 'external') {
       tax = Math.round(subTotal * TAX_RATE);
       total = subTotal + tax;
     }

     // ===== 表示 =====
     document.getElementById('result').textContent = `合計：${total.toLocaleString()}円`;
   }

  // 滞在時間更新タイマー（1分ごと）
  let stayTimer = null;
  function startStayTimer() {
    if (stayTimer) clearInterval(stayTimer);
    stayTimer = setInterval(calculateAndDisplay, 60000);
  }

  // 簡易レシートモーダル表示
  document.getElementById('showReceiptBtn').addEventListener('click', () => {
    if (!startTime) {
      // 完全上書きでエラー表示
      setClosedNotice('');
      setShortageNotice('まず入店時刻を登録してください。');
      return;
    } else {
      // レシート表示時は不足系はクリア（営業時間外の注意は残す）
      clearShortageNotice();
      showReceiptModal();
    }
   });

  document.getElementById('receiptCloseBtn').addEventListener('click', () => {
    closeReceiptModal();
  });

function showReceiptModal() {
  const container = document.getElementById('receiptItems');
  container.innerHTML = '';

  // --------- 基本料金・延長料金 ----------
  const baseCharge = 800;              // 初回60分チャージ
  const baseDrinkMinPrice = 600;       // 最低ドリンク
  const baseAmuseMinPrice = 1000;      // 最低アミュ
  const extensionUnitMin = 30;         
  const extensionCharge = 400;         

  const now = plannedExitTime || new Date(); 
  const stayMin = diffMinutes(startTime, now);

  let extensionCount = 0;
  if (stayMin > 60) {
    extensionCount = Math.ceil((stayMin - 60) / extensionUnitMin);
  }

  const chargeTotal = baseCharge + extensionCharge * extensionCount;

  const chargeLine = document.createElement('div');
  chargeLine.textContent = `入店料金（60分チャージ）: ${baseCharge}円`;
  container.appendChild(chargeLine);

  if (extensionCount > 0) {
    const extLine = document.createElement('div');
    extLine.textContent = `延長料金（30分×${extensionCount}）: ${extensionCharge * extensionCount}円`;
    container.appendChild(extLine);
  }

  // --------- メニュー表示 ----------
  let menuTotal = 0;
  for (const type in items) {
    if (items[type].length === 0) continue;
    const info = MENU_INFO[type];

    const grouped = items[type].reduce((acc, price) => {
      acc[price] = (acc[price] || 0) + 1;
      return acc;
    }, {});

    const section = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = `${info.icon} ${info.label}`;
    section.appendChild(title);

    for (const price in grouped) {
      const count = grouped[price];
      const line = document.createElement('div');
      line.textContent = `${count} × ${price}円 = ${count * price}円`;
      section.appendChild(line);
      menuTotal += count * price;
    }

    container.appendChild(section);
  }

  // --------- 最低料金補填 ----------
  // 入店必須
  const drinkCount = items.drink.length;
  const amuseCount = items.amuse.length;
  let drinkShortage = Math.max(0, 1 - drinkCount);
  let amuseShortage = Math.max(0, 1 - amuseCount);

  // 延長分補填
  let orShortageCount = 0;
  if (extensionCount > 0) {
    const provided = Math.max(0, drinkCount - 1) + Math.max(0, amuseCount - 1);
    orShortageCount = Math.max(0, extensionCount - provided);
  }

  const forcedDrinkPrice = baseDrinkMinPrice * drinkShortage;
  const forcedAmusePrice = baseAmuseMinPrice * amuseShortage;
  const forcedOrPrice = Math.min(baseDrinkMinPrice, baseAmuseMinPrice) * orShortageCount;

  if (forcedDrinkPrice > 0) {
    const line = document.createElement('div');
    line.textContent = `入店必須ドリンク補填：${forcedDrinkPrice}円`;
    container.appendChild(line);
  }

  if (forcedAmusePrice > 0) {
    const line = document.createElement('div');
    line.textContent = `入店必須アミュ補填：${forcedAmusePrice}円`;
    container.appendChild(line);
  }

  if (forcedOrPrice > 0) {
    const line = document.createElement('div');
    line.textContent = `延長分補填：${forcedOrPrice}円`;
    container.appendChild(line);
  }

  // --------- 消費税と合計 ----------
  const taxMode = document.querySelector('input[name="taxMode"]:checked').value;
  let subTotal = chargeTotal + menuTotal + forcedDrinkPrice + forcedAmusePrice + forcedOrPrice;
  let tax = 0;
  let total = subTotal;

  if (taxMode === 'external') {
    tax = Math.round(subTotal * TAX_RATE);      // 10%四捨五入
    total = subTotal + tax;

    const lineBase = document.createElement('div');
    lineBase.textContent = `本体：${subTotal.toLocaleString()}円`;
    container.appendChild(lineBase);

    const lineTax = document.createElement('div');
    lineTax.textContent = `消費税：${tax.toLocaleString()}円`;
    container.appendChild(lineTax);
  }

  const totalLine = document.getElementById('receiptTotal');
  totalLine.textContent = `合計：${total.toLocaleString()}円`;

  // --------- モーダル表示 ----------
  document.getElementById('receiptModal').style.display = 'flex';
}

  function closeReceiptModal() {
    document.getElementById('receiptModal').style.display = 'none';
  }

  // リセットボタン
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('リセットしますか？選択したメニューと時刻情報が消えます。')) return;
    startTime = null;
    plannedExitTime = null;
    document.getElementById('startTimeDisplay').textContent = '未設定';
    document.getElementById('plannedExitTimeInput').value = '';
    items = { drink: [], food: [], amuse: [] };
    counts = initCounts();
    updateCountsUI();
    calculateAndDisplay();
    if (stayTimer) {
      clearInterval(stayTimer);
      stayTimer = null;
    }
  });

  // 初期UI生成
  generateMenuUI();
  updateCountsUI();
  calculateAndDisplay();