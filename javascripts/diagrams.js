/* Click-to-enlarge for Mermaid diagrams.
   Material renders each ```mermaid fence into a closed shadow root, so the SVG cannot be read back.
   Instead, capture every diagram's source before the theme replaces the <pre>, and on click
   re-render it with the already-loaded global `mermaid` into a <dialog> at a readable size. */
(function () {
  "use strict";
  // Mermaid's built-in `.actor-line { stroke: #9370DB }` beats Material's `line { stroke: var(...) }`
  // on specificity, so lifelines come out lavender whatever the palette. Patch the source before the
  // theme reads it (its render is async, after fetching mermaid.js). One mid-tone works on both schemes.
  var LIFELINE = '%%{init: {"themeVariables": {"actorLineColor": "rgba(95, 167, 255, 0.6)"}}}%%\n';
  var pres = document.querySelectorAll("pre.mermaid");
  Array.prototype.forEach.call(pres, function (pre) {
    var code = pre.querySelector("code") || pre;
    if (/^\s*sequenceDiagram/.test(code.textContent)) code.textContent = LIFELINE + code.textContent;
  });
  var sources = Array.prototype.map.call(pres, function (pre) { return pre.textContent; });
  if (!sources.length) return;

  var dialog = null, body = null, title = null, counter = 0;

  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement("dialog");
    dialog.className = "vi-zoom";
    dialog.innerHTML =
      '<div class="vi-zoom__bar"><span class="vi-zoom__title"></span>' +
      '<span>scroll to pan · <button type="button" class="vi-zoom__close">close (esc)</button></span></div>' +
      '<div class="vi-zoom__body"></div>';
    body = dialog.querySelector(".vi-zoom__body");
    title = dialog.querySelector(".vi-zoom__title");
    dialog.querySelector(".vi-zoom__close").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("close", function () { body.innerHTML = ""; });
    // drag to pan
    var drag = null;
    body.addEventListener("pointerdown", function (e) {
      drag = { x: e.clientX, y: e.clientY, l: body.scrollLeft, t: body.scrollTop };
      body.setPointerCapture(e.pointerId);
    });
    body.addEventListener("pointermove", function (e) {
      if (!drag) return;
      body.scrollLeft = drag.l - (e.clientX - drag.x);
      body.scrollTop = drag.t - (e.clientY - drag.y);
    });
    body.addEventListener("pointerup", function () { drag = null; });
    body.addEventListener("pointercancel", function () { drag = null; });
    document.body.appendChild(dialog);
  }

  function open(index, label) {
    if (typeof mermaid === "undefined" || !mermaid.render) return;
    ensureDialog();
    title.textContent = label || "diagram";
    body.innerHTML = "";
    mermaid.render("vi-zoom-" + (counter++), sources[index]).then(function (out) {
      body.innerHTML = out.svg;
      var svg = body.querySelector("svg");
      if (!svg) return;
      var vb = svg.viewBox.baseVal;
      var naturalW = parseFloat(svg.style.maxWidth) || vb.width || 800;
      var naturalH = vb.width ? naturalW * (vb.height / vb.width) : naturalW * 0.6;
      var availW = Math.max(320, window.innerWidth * 0.96 - 48);
      var availH = Math.max(240, window.innerHeight * 0.94 - 2.6 * 16 - 48);
      // fit the dialog when the diagram is small, otherwise show it at natural size and pan
      var fit = Math.min(availW / naturalW, availH / naturalH);
      var scale = fit >= 0.8 ? Math.min(fit, 1.75) : 1;
      svg.style.maxWidth = "none";
      svg.style.width = Math.round(naturalW * scale) + "px";
      svg.removeAttribute("height");
      if (typeof out.bindFunctions === "function") out.bindFunctions(body);
      if (!dialog.open) dialog.showModal();
    }).catch(function () { dialog.open && dialog.close(); });
  }

  // nearest heading above the diagram, for the dialog title
  function heading(el) {
    var node = el;
    while (node && !(node.classList && node.classList.contains("md-typeset"))) {
      var prev = node.previousElementSibling;
      while (prev) {
        if (/^H[1-6]$/.test(prev.tagName)) return prev.textContent.replace(/\u00b6\s*$/, "").trim();
        prev = prev.previousElementSibling;
      }
      node = node.parentElement;
    }
    return document.title;
  }

  function wire() {
    var hosts = document.querySelectorAll(".md-typeset div.mermaid");
    if (hosts.length !== sources.length) return false;
    Array.prototype.forEach.call(hosts, function (host, i) {
      if (host.dataset.viZoom) return;
      host.dataset.viZoom = "1";
      host.setAttribute("role", "button");
      host.setAttribute("tabindex", "0");
      host.setAttribute("aria-label", "Enlarge diagram");
      var label = heading(host);
      host.addEventListener("click", function () { open(i, label); });
      host.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i, label); }
      });
    });
    return true;
  }

  // the theme renders asynchronously (after fetching mermaid.js); wait for the hosts to appear
  var observer = new MutationObserver(function () { if (wire()) observer.disconnect(); });
  observer.observe(document.body, { childList: true, subtree: true });
  if (wire()) observer.disconnect();
})();
