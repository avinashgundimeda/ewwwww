/* ==========================================================
   Nexora Technologies – site interactions (vanilla JS)
   ========================================================== */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Loading animation ---------- */
  var loader = $("#loader");
  function hideLoader() { if (loader) loader.classList.add("done"); }
  window.addEventListener("load", function () { setTimeout(hideLoader, 350); });
  setTimeout(hideLoader, 3000); // safety net if a resource hangs

  /* ---------- Theme toggle (persisted) ---------- */
  var themeBtn = $("#themeToggle");
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    if (themeBtn) themeBtn.setAttribute("aria-pressed", String(t === "dark"));
    try { localStorage.setItem("nx-theme", t); } catch (e) { /* storage blocked */ }
  }
  if (themeBtn) {
    themeBtn.setAttribute("aria-pressed", String(document.documentElement.getAttribute("data-theme") === "dark"));
    themeBtn.addEventListener("click", function () {
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  }

  /* ---------- Mobile navigation ---------- */
  var burger = $("#hamburger");
  var links = $("#navLinks");
  function closeMenu() {
    if (!burger) return;
    burger.setAttribute("aria-expanded", "false");
    links.classList.remove("open");
  }
  if (burger && links) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      links.classList.toggle("open", !open);
    });
    $$("a", links).forEach(function (a) { a.addEventListener("click", closeMenu); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  }

  /* ---------- Header shadow + back-to-top ---------- */
  var header = $(".site-header");
  var toTop = $("#toTop");
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle("scrolled", y > 10);
    if (toTop) toTop.classList.toggle("show", y > 600);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  /* ---------- Scroll-triggered reveal ---------- */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 70 + "ms"; // light stagger inside grids
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Animated counters ---------- */
  function runCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduceMotion) { el.textContent = target.toLocaleString() + suffix; return; }
    var start = null, dur = 1800;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var counters = $$("[data-count]");
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { runCounter(en.target); cio.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { cio.observe(c); });
  } else {
    counters.forEach(runCounter);
  }

  /* ---------- Interactive service cards ---------- */
  $$(".service-card").forEach(function (card) {
    var btn = $(".learn-more", card);
    if (!btn) return;
    btn.addEventListener("click", function () {
      var open = card.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  /* ---------- Testimonial carousel ---------- */
  var car = $("#carousel");
  if (car) {
    var track = $(".track", car);
    var slides = $$(".slide", car);
    var dotsWrap = $("#dots");
    var idx = 0, timer = null;
    slides.forEach(function (_, i) {
      var d = document.createElement("button");
      d.className = "dot";
      d.setAttribute("aria-label", "Show testimonial " + (i + 1));
      d.addEventListener("click", function () { go(i); restart(); });
      dotsWrap.appendChild(d);
    });
    var dots = $$(".dot", dotsWrap);
    function go(i) {
      idx = (i + slides.length) % slides.length;
      track.style.transform = "translateX(-" + idx * 100 + "%)";
      dots.forEach(function (d, n) { d.setAttribute("aria-current", String(n === idx)); });
      slides.forEach(function (s, n) { s.setAttribute("aria-hidden", String(n !== idx)); });
    }
    function restart() {
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(function () { go(idx + 1); }, 6000);
    }
    $("#prevSlide").addEventListener("click", function () { go(idx - 1); restart(); });
    $("#nextSlide").addEventListener("click", function () { go(idx + 1); restart(); });
    car.addEventListener("mouseenter", function () { clearInterval(timer); });
    car.addEventListener("mouseleave", restart);
    // Touch swipe
    var sx = null;
    car.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    car.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) { go(idx + (dx < 0 ? 1 : -1)); restart(); }
      sx = null;
    });
    go(0);
    restart();
  }

  /* ---------- Form validation helpers ---------- */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE = /^\+?[0-9][0-9\s-]{8,14}$/;

  function setError(input, msg) {
    var field = input.closest(".field");
    var out = $(".err", field);
    field.classList.toggle("invalid", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (out) out.textContent = msg || "";
    return !msg;
  }

  var rules = {
    name: function (v) { return v.trim().length < 2 ? "Enter your full name (at least 2 characters)." : ""; },
    email: function (v) { return !EMAIL.test(v.trim()) ? "Enter a valid email address, like name@example.com." : ""; },
    phone: function (v) { return !PHONE.test(v.trim()) ? "Enter a valid phone number (9 to 15 digits)." : ""; },
    subject: function (v) { return v.trim().length < 3 ? "Add a subject (at least 3 characters)." : ""; },
    message: function (v) { return v.trim().length < 10 ? "Write at least 10 characters so we can help." : ""; },
    password: function (v) { return v.length < 8 ? "Use at least 8 characters." : ""; }
  };

  function wireForm(form, onValid) {
    if (!form) return;
    var inputs = $$("input[data-rule], textarea[data-rule]", form);
    inputs.forEach(function (inp) {
      inp.addEventListener("blur", function () { setError(inp, rules[inp.dataset.rule](inp.value)); });
      inp.addEventListener("input", function () { if (inp.closest(".invalid")) setError(inp, rules[inp.dataset.rule](inp.value)); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true, first = null;
      inputs.forEach(function (inp) {
        var good = setError(inp, rules[inp.dataset.rule](inp.value));
        if (!good && !first) first = inp;
        ok = ok && good;
      });
      var confirm = $("[data-confirm]", form);
      if (confirm) {
        var pw = $("[data-rule='password']", form);
        var bad = confirm.value !== pw.value;
        setError(confirm, bad ? "Passwords do not match." : "");
        if (bad) { ok = false; first = first || confirm; }
      }
      if (!ok) { if (first) first.focus(); return; }
      onValid(form);
    });
  }

  function showStatus(form, msg) {
    var s = $(".form-status", form);
    if (!s) return;
    s.textContent = msg;
    s.classList.add("show");
  }

  /* ---------- Contact form (+ prefill from ?subject=) ---------- */
  var contact = $("#contactForm");
  if (contact) {
    var pre = new URLSearchParams(window.location.search).get("subject");
    if (pre) $("#subject").value = pre;
    wireForm(contact, function (form) {
      // No backend is attached: connect this to your API or a form service here.
      showStatus(form, "Thanks! Your message has been received. Our team will reply within one business day.");
      form.reset();
    });
  }

  /* ---------- Login / Sign up dialog ---------- */
  var dlg = $("#authDialog");
  if (dlg) {
    var tabs = $$(".tab", dlg);
    var panes = { login: $("#loginForm"), signup: $("#signupForm") };
    var title = $("#dlgTitle");
    function showTab(name) {
      tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.tab === name)); });
      Object.keys(panes).forEach(function (k) { panes[k].classList.toggle("hidden", k !== name); });
      title.textContent = name === "login" ? "Welcome back" : "Create your account";
    }
    tabs.forEach(function (t) { t.addEventListener("click", function () { showTab(t.dataset.tab); }); });
    $$("[data-auth]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        closeMenu();
        showTab(b.dataset.auth);
        if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
      });
    });
    $("#dlgClose").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); }); // click on backdrop
    wireForm(panes.login, function (f) { showStatus(f, "Demo only: connect this form to your authentication API."); });
    wireForm(panes.signup, function (f) { showStatus(f, "Demo only: account creation needs a backend."); });
  }

  /* ---------- Footer year ---------- */
  var yr = $("#year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
