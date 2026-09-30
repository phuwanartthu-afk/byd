/* ==========================================================================
   Body Scent — script.js
   ไฟล์เดียวใช้ร่วมทุกหน้า: ตรวจจาก element ในหน้านั้นๆ ว่าต้องรันฟังก์ชันไหน
   - product.html : #product-list, #filter-bar
   - order.html   : #orderForm, #items, #total
   - admin.html   : #ordersTable
   ========================================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "bodyScentOrders";

  var MOODS = [
    { key: "all", label: "ทั้งหมด" },
    { key: "fresh", label: "Fresh" },
    { key: "sweet", label: "Sweet" },
    { key: "confident", label: "Confident" },
    { key: "romance", label: "Romance" }
  ];

  var TYPE_LABELS = { spray: "สเปรย์", rollon: "โรลออน" };

  /* ---------- Helpers ---------- */

  // สร้าง element แบบปลอดภัย (ใช้ textContent ไม่ใช้ innerHTML)
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  // ใส่ค่าลง element ไม่ว่าจะเป็น input/textarea (value) หรือ div/span (textContent)
  function setFieldValue(node, value) {
    if (!node) return;
    if ("value" in node) {
      node.value = value;
    } else {
      node.textContent = value;
    }
  }

  function getFieldValue(node) {
    if (!node) return "";
    var v = "value" in node ? node.value : node.textContent;
    return String(v || "").trim();
  }

  function getParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (e) {
      return null;
    }
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    var n = Number(String(value).replace(/,/g, ""));
    return isFinite(n) ? n : null;
  }

  function isValidMood(key) {
    return MOODS.some(function (m) { return m.key === key; });
  }

  function readOrders() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  /* ==========================================================================
     product.html
     ========================================================================== */

  function initProductPage() {
    var list = document.getElementById("product-list");
    var bar = document.getElementById("filter-bar");
    if (!list) return;

    var products = [];
    var activeMood = "all";

    // ---- การ์ดสินค้า ----
    function buildCard(p) {
      var card = el("article", "product-card");
      card.setAttribute("data-mood", p.mood);

      var media = el("div", "product-card__media");
      var img = el("img");
      img.src = p.image;
      img.alt = p.name;
      img.loading = "lazy";
      media.appendChild(img);

      var body = el("div", "product-card__body");

      var moodRow = el("div", "product-card__mood");
      moodRow.appendChild(el("span", "dot"));
      var moodLabel = MOODS.filter(function (m) { return m.key === p.mood; })[0];
      moodRow.appendChild(el("span", null, moodLabel ? moodLabel.label : p.mood));

      var name = el("h3", "product-card__name", p.name);
      var meta = el(
        "p",
        "product-card__meta",
        (TYPE_LABELS[p.type] || p.type) + " • " + p.size
      );
      var desc = el("p", "product-card__desc", p.description);

      var price = el("div", "product-card__price");
      price.appendChild(document.createTextNode(Number(p.price).toLocaleString("th-TH")));
      price.appendChild(el("small", null, "บาท"));

      var buy = el("a", "btn btn--gold btn--block btn--small", "สั่งซื้อ");
      var itemLabel = p.name + " (" + p.size + ")";
      buy.href =
        "order.html?item=" + encodeURIComponent(itemLabel) +
        "&price=" + encodeURIComponent(p.price);

      body.appendChild(moodRow);
      body.appendChild(name);
      body.appendChild(meta);
      body.appendChild(desc);
      body.appendChild(price);
      body.appendChild(buy);

      card.appendChild(media);
      card.appendChild(body);
      return card;
    }

    // ---- แสดงผลตาม mood ที่เลือก ----
    function render() {
      var shown = products.filter(function (p) {
        return activeMood === "all" || p.mood === activeMood;
      });

      list.innerHTML = "";

      if (shown.length === 0) {
        list.appendChild(el("p", "muted", "ไม่พบสินค้าในหมวดนี้"));
        return;
      }

      // ใช้ grid เดียวกับ CSS ถ้า #product-list ยังไม่ได้ใส่ class ไว้
      shown.forEach(function (p) {
        list.appendChild(buildCard(p));
      });
    }

    // ---- ปุ่มกรอง ----
    function updateButtons() {
      if (!bar) return;
      var buttons = bar.querySelectorAll("[data-mood]");
      Array.prototype.forEach.call(buttons, function (btn) {
        var active = btn.getAttribute("data-mood") === activeMood;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    function setMood(key, syncUrl) {
      activeMood = isValidMood(key) ? key : "all";
      updateButtons();
      render();

      if (syncUrl && window.history && history.replaceState) {
        try {
          var url = new URL(window.location.href);
          if (activeMood === "all") {
            url.searchParams.delete("mood");
          } else {
            url.searchParams.set("mood", activeMood);
          }
          history.replaceState(null, "", url.toString());
        } catch (e) { /* ไม่ต้องทำอะไร */ }
      }
    }

    function buildFilterBar() {
      if (!bar) return;

      // ถ้าใน HTML มีปุ่มอยู่แล้ว (data-mood) ให้ใช้ของเดิม ไม่สร้างซ้ำ
      if (!bar.querySelector("[data-mood]")) {
        MOODS.forEach(function (m) {
          var btn = el("button", "filter-btn");
          btn.type = "button";
          btn.setAttribute("data-mood", m.key);
          if (m.key !== "all") {
            var dot = el("span", "dot");
            dot.setAttribute("data-mood", m.key);
            btn.appendChild(dot);
          }
          btn.appendChild(el("span", null, m.label));
          bar.appendChild(btn);
        });
      }

      bar.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-mood]");
        if (!btn || !bar.contains(btn)) return;
        setMood(btn.getAttribute("data-mood"), true);
      });
    }

    buildFilterBar();

    // ---- โหลดข้อมูล ----
    list.appendChild(el("p", "muted", "กำลังโหลดสินค้า..."));

    fetch("products.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        products = Array.isArray(data) ? data : [];
        setMood(getParam("mood") || "all", false);
      })
      .catch(function (err) {
        console.error("โหลด products.json ไม่สำเร็จ:", err);
        list.innerHTML = "";
        list.appendChild(
          el(
            "p",
            "muted",
            "โหลดข้อมูลสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง (หากเปิดไฟล์โดยตรงจากเครื่อง ให้รันผ่านเว็บเซิร์ฟเวอร์ เช่น Live Server)"
          )
        );
      });
  }

  /* ==========================================================================
     order.html
     ========================================================================== */

  function initOrderPage() {
    var form = document.getElementById("orderForm");
    if (!form) return;

    var itemsEl = document.getElementById("items");
    var totalEl = document.getElementById("total");

    // ---- เติม item / price จาก URL (เติมทั้งสองช่องเสมอ) ----
    var itemParam = getParam("item");
    var priceParam = getParam("price");
    var priceNum = toNumber(priceParam);

    setFieldValue(itemsEl, itemParam || "");
    setFieldValue(totalEl, priceNum !== null ? String(priceNum) : "");

    // ---- อ่านค่าจากฟิลด์ในฟอร์ม (รองรับทั้ง name และ id) ----
    function field(name) {
      return form.querySelector('[name="' + name + '"]') || document.getElementById(name);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (typeof form.reportValidity === "function" && !form.reportValidity()) {
        return;
      }

      var totalRaw = getFieldValue(totalEl);
      var totalNum = toNumber(totalRaw);

      var payload = {
        customerName: getFieldValue(field("customerName")),
        contact: getFieldValue(field("contact")),
        items: getFieldValue(itemsEl),
        total: totalNum !== null ? totalNum : totalRaw,
        note: getFieldValue(field("note")),
        timestamp: new Date().toISOString()
      };

      try {
        var orders = readOrders();
        orders.push(payload);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      } catch (err) {
        console.error("บันทึกคำสั่งซื้อไม่สำเร็จ:", err);
        alert("ไม่สามารถบันทึกคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง");
        return;
      }

      window.location.href = "thankyou.html";
    });
  }

  /* ==========================================================================
     admin.html
     ========================================================================== */

  function initAdminPage() {
    var table = document.getElementById("ordersTable");
    if (!table) return;

    var tbody = table.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      table.appendChild(tbody);
    }

    var orders = readOrders();
    tbody.innerHTML = "";

    if (orders.length === 0) {
      var headCells = table.querySelectorAll("thead th").length;
      var emptyRow = document.createElement("tr");
      var emptyCell = el("td", "text-center muted", "ยังไม่มีคำสั่งซื้อ");
      emptyCell.colSpan = headCells || 6;
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return;
    }

    // เรียงจากล่าสุดขึ้นก่อน
    orders.sort(function (a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    function formatDate(ts) {
      var d = new Date(ts);
      return isNaN(d.getTime()) ? "-" : d.toLocaleString("th-TH");
    }

    function formatTotal(t) {
      var n = toNumber(t);
      return n !== null ? n.toLocaleString("th-TH") + " บาท" : (t || "-");
    }

    orders.forEach(function (o) {
      var row = document.createElement("tr");
      [
        formatDate(o.timestamp),
        o.customerName || "-",
        o.contact || "-",
        o.items || "-",
        formatTotal(o.total),
        o.note || "-"
      ].forEach(function (text) {
        row.appendChild(el("td", null, text));
      });
      tbody.appendChild(row);
    });
  }

  /* ==========================================================================
     Init — ตรวจว่าหน้านี้มี element อะไร แล้วรันเฉพาะที่เกี่ยวข้อง
     ========================================================================== */

  function init() {
    if (document.getElementById("product-list")) initProductPage();
    if (document.getElementById("orderForm")) initOrderPage();
    if (document.getElementById("ordersTable")) initAdminPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
