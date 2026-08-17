(function () {
  "use strict";

  var STATUS_META = {
    "Not Started": { barClass: "bar-not-started", dotClass: "status-not-started" },
    "In Progress": { barClass: "bar-in-progress", dotClass: "status-in-progress" },
    "At Risk":     { barClass: "bar-at-risk",     dotClass: "status-at-risk" },
    "Blocked":     { barClass: "bar-blocked",     dotClass: "status-blocked" },
    "Complete":    { barClass: "bar-complete",    dotClass: "status-complete" }
  };

  var STATUS_ORDER = ["Not Started", "In Progress", "At Risk", "Blocked", "Complete"];

  var DAY_MS = 86400000;
  var ganttGranularity = "month"; // "week" | "month"
  var projects = (window.PROJECTS || []).slice();
  var strategicAreas = window.STRATEGIC_AREAS || [];

  var els = {
    gantt: document.getElementById("gantt"),
    emptyState: document.getElementById("empty-state"),
    tableBody: document.getElementById("table-body"),
    search: document.getElementById("search-input"),
    areaFilter: document.getElementById("area-filter"),
    statusFilter: document.getElementById("status-filter"),
    viewTimelineBtn: document.getElementById("view-timeline-btn"),
    viewTableBtn: document.getElementById("view-table-btn"),
    timelineView: document.getElementById("timeline-view"),
    tableView: document.getElementById("table-view"),
    tooltip: document.getElementById("tooltip"),
    themeToggle: document.getElementById("theme-toggle"),
    statTotal: document.getElementById("stat-total"),
    statProgress: document.getElementById("stat-progress"),
    statRisk: document.getElementById("stat-risk"),
    statOverdue: document.getElementById("stat-overdue"),
    statComplete: document.getElementById("stat-complete"),
    statusStackedBar: document.getElementById("status-stacked-bar"),
    statusOverviewSub: document.getElementById("status-overview-sub"),
    areaCards: document.getElementById("area-cards"),
    zoomWeekBtn: document.getElementById("zoom-week-btn"),
    zoomMonthBtn: document.getElementById("zoom-month-btn"),
    ganttScroll: document.getElementById("gantt-scroll")
  };

  function parseDate(str) {
    var parts = str.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatDate(date) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function monthLabel(date) {
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }

  function weekLabel(date) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function startOfWeek(date) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var day = d.getDay(); // 0 = Sun .. 6 = Sat
    var diffToMonday = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diffToMonday);
    return d;
  }

  // Tick columns for the Gantt header/grid — weeks are uniform 7-day spans;
  // months are calendar months (naturally uneven, same as before).
  function buildTicks(rangeStart, rangeEnd, granularity) {
    var ticks = [];
    if (granularity === "week") {
      var cursor = startOfWeek(rangeStart);
      while (cursor <= rangeEnd) {
        ticks.push(new Date(cursor));
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
      }
    } else {
      var mCursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      while (mCursor <= rangeEnd) {
        ticks.push(new Date(mCursor));
        mCursor = new Date(mCursor.getFullYear(), mCursor.getMonth() + 1, 1);
      }
    }
    return ticks;
  }

  function todayDate() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function isOverdue(p, today) {
    return p.status !== "Complete" && parseDate(p.end) < today;
  }

  // Percent of a project's scheduled window that has elapsed, clamped 0-100.
  // Used to shade Gantt bars / table meters by how far along the schedule is —
  // not a claim about actual work completed.
  function elapsedPct(start, end, today) {
    if (today <= start) return 0;
    if (today >= end) return 100;
    return ((today - start) / (end - start)) * 100;
  }

  function daysBetween(a, b) {
    return Math.round((b - a) / DAY_MS);
  }

  function computeCounts(list) {
    var today = todayDate();
    var byStatus = {};
    STATUS_ORDER.forEach(function (s) { byStatus[s] = 0; });
    var overdue = 0;
    list.forEach(function (p) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      if (isOverdue(p, today)) overdue++;
    });
    return { byStatus: byStatus, overdue: overdue, total: list.length };
  }

  /* ---------------------------------------------------------------
     Stacked bar builder (status distribution)
     --------------------------------------------------------------- */
  function buildStackedBar(container, byStatus, total, opts) {
    opts = opts || {};
    container.innerHTML = "";
    if (!total) return;

    STATUS_ORDER.forEach(function (status) {
      var count = byStatus[status];
      if (!count) return;
      var meta = STATUS_META[status];
      var pct = (count / total) * 100;

      var seg = document.createElement(opts.clickable ? "button" : "div");
      seg.className = "stacked-bar-segment " + meta.barClass;
      seg.style.flex = pct + " " + pct + " 0%";
      if (opts.clickable) {
        seg.type = "button";
        seg.addEventListener("click", function () {
          els.statusFilter.value = els.statusFilter.value === status ? "all" : status;
          renderAll();
        });
      }

      if (opts.showLabels && pct > 8) {
        var lbl = document.createElement("span");
        lbl.className = "stacked-bar-segment-label";
        lbl.textContent = count;
        seg.appendChild(lbl);
      }

      attachSimpleTooltip(seg, status, [
        { label: "Projects", value: count },
        { label: "Share", value: Math.round(pct) + "%" }
      ]);

      container.appendChild(seg);
    });
  }

  /* ---------------------------------------------------------------
     Filtering
     --------------------------------------------------------------- */
  function getFiltered() {
    var q = els.search.value.trim().toLowerCase();
    var status = els.statusFilter.value;
    var area = els.areaFilter.value;
    return projects.filter(function (p) {
      if (status !== "all" && p.status !== status) return false;
      if (area !== "all" && p.category !== area) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().indexOf(q) !== -1 ||
        p.owner.toLowerCase().indexOf(q) !== -1 ||
        p.category.toLowerCase().indexOf(q) !== -1
      );
    });
  }

  /* ---------------------------------------------------------------
     Stats
     --------------------------------------------------------------- */
  function renderStats() {
    var counts = computeCounts(projects);
    els.statTotal.textContent = counts.total;
    els.statProgress.textContent = counts.byStatus["In Progress"];
    els.statRisk.textContent = counts.byStatus["At Risk"] + counts.byStatus["Blocked"];
    els.statOverdue.textContent = counts.overdue;
    els.statComplete.textContent = counts.byStatus["Complete"];
  }

  /* ---------------------------------------------------------------
     Status overview (portfolio-wide, independent of filters)
     --------------------------------------------------------------- */
  function renderStatusOverview() {
    var counts = computeCounts(projects);
    buildStackedBar(els.statusStackedBar, counts.byStatus, counts.total, {
      showLabels: true,
      clickable: true
    });
    els.statusOverviewSub.textContent = counts.total + " projects total";
  }

  /* ---------------------------------------------------------------
     Strategic area cards
     --------------------------------------------------------------- */
  function renderAreaCards() {
    els.areaCards.innerHTML = "";
    strategicAreas.forEach(function (area) {
      var list = projects.filter(function (p) { return p.category === area; });
      var counts = computeCounts(list);

      var card = document.createElement("button");
      card.type = "button";
      card.className = "area-card";
      card.dataset.area = area;

      var head = document.createElement("div");
      head.className = "area-card-head";
      var name = document.createElement("span");
      name.className = "area-card-name";
      name.textContent = area;
      var count = document.createElement("span");
      count.className = "area-card-count";
      count.textContent = counts.total;
      head.appendChild(name);
      head.appendChild(count);
      card.appendChild(head);

      if (counts.total > 0) {
        var bar = document.createElement("div");
        bar.className = "stacked-bar";
        buildStackedBar(bar, counts.byStatus, counts.total, {});
        card.appendChild(bar);
      } else {
        var empty = document.createElement("span");
        empty.className = "area-card-empty";
        empty.textContent = "No projects yet";
        card.appendChild(empty);
      }

      card.addEventListener("click", function () {
        els.areaFilter.value = els.areaFilter.value === area ? "all" : area;
        renderAll();
      });

      els.areaCards.appendChild(card);
    });
    updateAreaCardActiveStates();
  }

  function updateAreaCardActiveStates() {
    var active = els.areaFilter.value;
    var cards = els.areaCards.querySelectorAll(".area-card");
    cards.forEach(function (card) {
      card.classList.toggle("is-active", card.dataset.area === active);
    });
  }

  /* ---------------------------------------------------------------
     Gantt / timeline
     --------------------------------------------------------------- */
  function renderGantt() {
    var list = getFiltered();
    els.gantt.innerHTML = "";

    if (list.length === 0) {
      els.emptyState.hidden = false;
      return;
    }
    els.emptyState.hidden = true;

    var minStart = null, maxEnd = null;
    list.forEach(function (p) {
      var s = parseDate(p.start), e = parseDate(p.end);
      if (!minStart || s < minStart) minStart = s;
      if (!maxEnd || e > maxEnd) maxEnd = e;
    });

    // Pad range ~4% each side for breathing room.
    var span = maxEnd - minStart || DAY_MS;
    var pad = span * 0.04;
    var rangeStart = new Date(minStart.getTime() - pad);
    var rangeEnd = new Date(maxEnd.getTime() + pad);
    var rangeSpan = rangeEnd - rangeStart;

    // Tick columns spanning the range (weeks or months, per current zoom).
    var ticks = buildTicks(rangeStart, rangeEnd, ganttGranularity);
    var tickLabel = ganttGranularity === "week" ? weekLabel : monthLabel;
    var colWidth = ganttGranularity === "week" ? 64 : 90;
    els.gantt.style.minWidth = Math.max(860, 270 + ticks.length * colWidth) + "px";

    function pct(date) {
      return ((date - rangeStart) / rangeSpan) * 100;
    }

    // Header row.
    var header = document.createElement("div");
    header.className = "gantt-header";

    var headerLabel = document.createElement("div");
    headerLabel.className = "gantt-header-label";
    headerLabel.textContent = "Project";
    header.appendChild(headerLabel);

    var headerMonths = document.createElement("div");
    headerMonths.className = "gantt-months";
    headerMonths.style.gridTemplateColumns = "repeat(" + ticks.length + ", 1fr)";
    ticks.forEach(function (t) {
      var cell = document.createElement("div");
      cell.className = "gantt-month";
      cell.textContent = tickLabel(t);
      headerMonths.appendChild(cell);
    });
    header.appendChild(headerMonths);
    els.gantt.appendChild(header);

    // Today marker position (only meaningful if within range).
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayPct = (today >= rangeStart && today <= rangeEnd) ? pct(today) : null;

    // The header owns the one visible "Today" label — a small chip pinned
    // to its bottom edge, clear of the tick text above it.
    if (todayPct !== null) {
      var headerTodayMarker = document.createElement("div");
      headerTodayMarker.className = "today-marker";
      headerTodayMarker.style.left = todayPct + "%";
      headerMonths.appendChild(headerTodayMarker);

      var todayChip = document.createElement("div");
      todayChip.className = "today-chip";
      todayChip.style.left = todayPct + "%";
      todayChip.textContent = "Today";
      headerMonths.appendChild(todayChip);
    }

    list.forEach(function (p) {
      var meta = STATUS_META[p.status] || STATUS_META["Not Started"];
      var start = parseDate(p.start);
      var end = parseDate(p.end);

      var row = document.createElement("div");
      row.className = "gantt-row";

      var label = document.createElement("div");
      label.className = "gantt-row-label";
      label.innerHTML =
        '<div class="gantt-row-name"></div>' +
        '<div class="gantt-row-meta"><span class="category-tag"></span><span class="owner-text"></span></div>';
      label.querySelector(".gantt-row-name").textContent = p.name;
      label.querySelector(".category-tag").textContent = p.category;
      label.querySelector(".owner-text").textContent = "Owner: " + p.owner;
      row.appendChild(label);

      var track = document.createElement("div");
      track.className = "gantt-row-track";

      var gridLines = document.createElement("div");
      gridLines.className = "gantt-grid-lines";
      gridLines.style.gridTemplateColumns = "repeat(" + ticks.length + ", 1fr)";
      ticks.forEach(function () {
        gridLines.appendChild(document.createElement("span"));
      });
      track.appendChild(gridLines);

      if (todayPct !== null) {
        var todayMarker = document.createElement("div");
        todayMarker.className = "today-marker";
        todayMarker.style.left = todayPct + "%";
        track.appendChild(todayMarker);
      }

      var left = pct(start);
      var width = Math.max(pct(end) - left, 0.6);
      var overdue = isOverdue(p, today);

      var bar = document.createElement("div");
      bar.className = "gantt-bar " + meta.barClass + (overdue ? " gantt-bar--overdue" : "");
      bar.style.left = left + "%";
      bar.style.width = width + "%";
      bar.tabIndex = 0;
      bar.setAttribute("role", "button");
      bar.setAttribute(
        "aria-label",
        p.name + ", " + p.status + ", " + formatDate(start) + " to " + formatDate(end) +
          ", owner " + p.owner + (overdue ? ", overdue" : "")
      );

      // Active statuses get a "remaining time" wash so the bar reads as a
      // lightweight progress track, not just a duration block.
      if (p.status === "In Progress" || p.status === "At Risk" || p.status === "Blocked") {
        var remaining = 100 - elapsedPct(start, end, today);
        if (remaining > 0.5) {
          var remainingEl = document.createElement("div");
          remainingEl.className = "gantt-bar-remaining";
          remainingEl.style.width = remaining + "%";
          bar.appendChild(remainingEl);
        }
      }

      var barLabel = document.createElement("span");
      barLabel.className = "gantt-bar-label";
      barLabel.textContent = p.name;
      bar.appendChild(barLabel);

      if (overdue) {
        var flag = document.createElement("span");
        flag.className = "overdue-flag";
        flag.setAttribute("aria-hidden", "true");
        flag.textContent = "!";
        bar.appendChild(flag);
      }

      attachTooltip(bar, p, start, end, today);
      track.appendChild(bar);

      row.appendChild(track);
      els.gantt.appendChild(row);
    });
  }

  /* ---------------------------------------------------------------
     Tooltip
     --------------------------------------------------------------- */
  function attachSimpleTooltip(el, title, rows) {
    function show(evt) {
      var tt = els.tooltip;
      tt.innerHTML = "";
      var titleEl = document.createElement("div");
      titleEl.className = "tooltip-title";
      titleEl.textContent = title;
      tt.appendChild(titleEl);
      rows.forEach(function (r) {
        var row = document.createElement("div");
        row.className = "tooltip-row" + (r.stack ? " tooltip-row-stack" : "");
        var label = document.createElement("span");
        label.textContent = r.label;
        var value = document.createElement("strong");
        value.textContent = r.value;
        if (r.tone) value.style.color = r.tone;
        row.appendChild(label);
        row.appendChild(value);
        tt.appendChild(row);
      });
      tt.hidden = false;
      position(evt);
    }
    function position(evt) {
      var tt = els.tooltip;
      var x = (evt && evt.clientX) || el.getBoundingClientRect().left;
      var y = (evt && evt.clientY) || el.getBoundingClientRect().top;
      var vw = window.innerWidth, vh = window.innerHeight;
      var offset = 14;
      requestAnimationFrame(function () {
        var rect = tt.getBoundingClientRect();
        var left = Math.min(x + offset, vw - rect.width - 12);
        var top = Math.min(y + offset, vh - rect.height - 12);
        tt.style.left = Math.max(12, left) + "px";
        tt.style.top = Math.max(12, top) + "px";
      });
    }
    function hide() {
      els.tooltip.hidden = true;
    }
    el.addEventListener("pointermove", position);
    el.addEventListener("pointerenter", show);
    el.addEventListener("pointerleave", hide);
    el.addEventListener("focus", function (e) {
      var rect = el.getBoundingClientRect();
      show({ clientX: rect.left, clientY: rect.bottom });
    });
    el.addEventListener("blur", hide);
  }

  function attachTooltip(el, p, start, end, today) {
    today = today || todayDate();
    var overdue = isOverdue(p, today);
    var durationDays = daysBetween(start, end);
    var rows = [
      { label: "Strategic area", value: p.category },
      { label: "Status", value: p.status },
      { label: "Owner", value: p.owner },
      { label: "Timeline", value: formatDate(start) + " – " + formatDate(end) + " (" + durationDays + "d)" }
    ];
    if (overdue) {
      rows.push({
        label: "Overdue by",
        value: daysBetween(end, today) + " days",
        tone: "var(--status-blocked-text)"
      });
    } else if (p.status === "In Progress" || p.status === "At Risk" || p.status === "Blocked") {
      rows.push({ label: "Schedule elapsed", value: Math.round(elapsedPct(start, end, today)) + "%" });
    }
    if (p.description) {
      rows.push({ label: "Notes", value: p.description, stack: true });
    }
    attachSimpleTooltip(el, p.name, rows);
  }

  /* ---------------------------------------------------------------
     Table view
     --------------------------------------------------------------- */
  function renderTable() {
    var list = getFiltered();
    var today = todayDate();
    els.tableBody.innerHTML = "";

    list.forEach(function (p) {
      var meta = STATUS_META[p.status] || STATUS_META["Not Started"];
      var start = parseDate(p.start);
      var end = parseDate(p.end);
      var overdue = isOverdue(p, today);
      var tr = document.createElement("tr");
      if (overdue) tr.classList.add("row-overdue");

      var cells = [
        { text: p.name, strong: true },
        { text: p.category },
        { text: p.owner, tbd: p.owner === "TBD" },
        { statusChip: true },
        { text: formatDate(start) },
        { text: formatDate(end) },
        { progress: true }
      ];

      cells.forEach(function (c) {
        var td = document.createElement("td");
        if (c.statusChip) {
          var chip = document.createElement("span");
          chip.className = "status-chip " + meta.dotClass;
          var dot = document.createElement("span");
          dot.className = "legend-dot " + meta.dotClass;
          chip.appendChild(dot);
          chip.appendChild(document.createTextNode(p.status));
          td.appendChild(chip);
        } else if (c.progress) {
          td.appendChild(buildProgressCell(p, start, end, today, overdue));
        } else {
          td.textContent = c.text;
          if (c.tbd) td.classList.add("owner-tbd");
          if (c.strong) td.style.fontWeight = "600";
        }
        tr.appendChild(td);
      });

      els.tableBody.appendChild(tr);
    });
  }

  function buildProgressCell(p, start, end, today, overdue) {
    var wrap = document.createElement("div");
    wrap.className = "progress-cell";

    if (p.status === "Not Started") {
      var upcoming = document.createElement("span");
      upcoming.className = "progress-text";
      upcoming.textContent = "Not started";
      wrap.appendChild(upcoming);
      return wrap;
    }

    var pct = p.status === "Complete" ? 100 : elapsedPct(start, end, today);
    var meter = document.createElement("div");
    meter.className = "progress-meter";
    var fill = document.createElement("div");
    fill.className = "progress-meter-fill" + (p.status === "Complete" ? " fill-complete" : overdue ? " fill-overdue" : "");
    fill.style.width = pct + "%";
    meter.appendChild(fill);

    var text = document.createElement("span");
    text.className = "progress-text" + (overdue ? " text-overdue" : "");
    text.textContent = overdue ? "Overdue" : Math.round(pct) + "%";

    wrap.appendChild(meter);
    wrap.appendChild(text);
    return wrap;
  }

  /* ---------------------------------------------------------------
     View toggle
     --------------------------------------------------------------- */
  function setView(view) {
    var isTimeline = view === "timeline";
    els.timelineView.hidden = !isTimeline;
    els.tableView.hidden = isTimeline;
    els.viewTimelineBtn.classList.toggle("is-active", isTimeline);
    els.viewTableBtn.classList.toggle("is-active", !isTimeline);
  }

  function setGranularity(granularity) {
    ganttGranularity = granularity;
    els.zoomWeekBtn.classList.toggle("is-active", granularity === "week");
    els.zoomMonthBtn.classList.toggle("is-active", granularity === "month");
    renderGantt();
  }

  /* ---------------------------------------------------------------
     Drag-to-scroll (mouse only — touch already scrolls natively)
     --------------------------------------------------------------- */
  function initDragScroll(el) {
    var dragging = false;
    var startX = 0;
    var startScroll = 0;

    el.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      el.classList.add("is-dragging");
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    el.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      el.scrollLeft = startScroll - (e.clientX - startX);
    });

    function stopDrag() {
      dragging = false;
      el.classList.remove("is-dragging");
    }

    el.addEventListener("pointerup", stopDrag);
    el.addEventListener("pointercancel", stopDrag);
    el.addEventListener("dragstart", function (e) { e.preventDefault(); });
  }

  /* ---------------------------------------------------------------
     Theme toggle
     --------------------------------------------------------------- */
  function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem("tracker-theme"); } catch (e) {}
    if (stored === "dark" || stored === "light") {
      document.documentElement.setAttribute("data-theme", stored);
    }
    els.themeToggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var isDark = current ? current === "dark" : prefersDark;
      var next = isDark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("tracker-theme", next); } catch (e) {}
    });
  }

  /* ---------------------------------------------------------------
     Wire up
     --------------------------------------------------------------- */
  function renderAll() {
    renderGantt();
    renderTable();
    updateAreaCardActiveStates();
  }

  function populateAreaFilter() {
    strategicAreas.forEach(function (area) {
      var opt = document.createElement("option");
      opt.value = area;
      opt.textContent = area;
      els.areaFilter.appendChild(opt);
    });
  }

  function init() {
    populateAreaFilter();
    renderStats();
    renderStatusOverview();
    renderAreaCards();
    renderAll();
    initTheme();
    initDragScroll(els.ganttScroll);

    els.search.addEventListener("input", renderAll);
    els.areaFilter.addEventListener("change", renderAll);
    els.statusFilter.addEventListener("change", renderAll);
    els.viewTimelineBtn.addEventListener("click", function () { setView("timeline"); });
    els.viewTableBtn.addEventListener("click", function () { setView("table"); });
    els.zoomWeekBtn.addEventListener("click", function () { setGranularity("week"); });
    els.zoomMonthBtn.addEventListener("click", function () { setGranularity("month"); });
    window.addEventListener("resize", renderGantt);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
