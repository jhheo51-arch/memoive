(function () {
  "use strict";

  const editions = Array.isArray(window.CAREER_EDITIONS) ? [...window.CAREER_EDITIONS] : [];
  editions.sort((a, b) => `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`));

  const editionsByDate = editions.reduce((map, edition) => {
    if (!map.has(edition.date)) map.set(edition.date, []);
    map.get(edition.date).push(edition);
    return map;
  }, new Map());

  const latest = editions[0];
  const initialDate = latest ? new Date(`${latest.date}T00:00:00`) : new Date();
  let viewYear = initialDate.getFullYear();
  let viewMonth = initialDate.getMonth();
  let selectedDate = latest ? latest.date : "";

  const grid = document.getElementById("calendar-grid");
  const monthLabel = document.getElementById("month-label");
  const panel = document.getElementById("edition-panel");
  const recentList = document.getElementById("recent-list");

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split("-");
    return `${year}.${month}.${day}`;
  };

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const renderStats = () => {
    document.getElementById("edition-count").textContent = editions.length;
    document.getElementById("active-days").textContent = editionsByDate.size;
    document.getElementById("latest-date").textContent = latest ? formatDate(latest.date).slice(5) : "—";
  };

  const renderPanel = (dateString) => {
    const dailyEditions = editionsByDate.get(dateString) || [];
    if (!dailyEditions.length) {
      panel.innerHTML = `<div class="empty-state"><span class="empty-icon" aria-hidden="true">${formatDate(dateString).slice(5)}</span><h2>발행된 뉴스레터가 없습니다</h2><p>다른 파란 날짜를 선택해 주세요.</p></div>`;
      return;
    }

    const editionCards = dailyEditions.map((edition, index) => `
      <article class="selected-edition">
        <div class="selected-meta"><span>${escapeHtml(formatDate(edition.date))}</span><span>${escapeHtml(edition.time)}</span></div>
        <span class="status-badge">${escapeHtml(edition.status)}</span>
        <h2>${escapeHtml(edition.title)}</h2>
        <p class="selected-summary">${escapeHtml(edition.summary)}</p>
        <div class="role-tags">${edition.roles.map((role) => `<span>${escapeHtml(role)}</span>`).join("")}</div>
        <dl class="edition-numbers">
          <div><dt>핵심</dt><dd>${edition.highlights}</dd></div>
          <div><dt>기타</dt><dd>${edition.additional}</dd></div>
          <div><dt>신규</dt><dd>${edition.newCount}</dd></div>
          <div><dt>후속</dt><dd>${edition.followUpCount}</dd></div>
        </dl>
        <a class="open-edition" href="${escapeHtml(edition.href)}">${dailyEditions.length > 1 ? `${index + 1}회차 ` : ""}뉴스레터 열기 <span aria-hidden="true">↗</span></a>
      </article>`).join("");
    panel.innerHTML = editionCards;
  };

  const renderCalendar = () => {
    monthLabel.textContent = `${viewYear}년 ${viewMonth + 1}월`;
    grid.innerHTML = "";
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const lastDate = new Date(viewYear, viewMonth + 1, 0).getDate();
    const todayKey = latest ? latest.date : "";

    for (let i = 0; i < firstDay; i += 1) {
      const spacer = document.createElement("span");
      spacer.className = "calendar-spacer";
      spacer.setAttribute("aria-hidden", "true");
      grid.appendChild(spacer);
    }

    for (let day = 1; day <= lastDate; day += 1) {
      const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEditions = editionsByDate.get(dateKey) || [];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "calendar-day";
      button.dataset.date = dateKey;
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `${viewYear}년 ${viewMonth + 1}월 ${day}일${dayEditions.length ? `, 뉴스레터 ${dayEditions.length}개` : ", 발행 없음"}`);
      button.setAttribute("aria-pressed", String(dateKey === selectedDate));
      if (dayEditions.length) button.classList.add("has-edition");
      if (dateKey === todayKey) button.classList.add("today");
      if (dateKey === selectedDate) button.classList.add("selected");
      button.innerHTML = `<span class="day-number">${day}</span>${dayEditions.length ? `<span class="edition-indicator">${dayEditions.length > 1 ? dayEditions.length : ""}</span>` : ""}`;
      button.addEventListener("click", () => {
        selectedDate = dateKey;
        renderCalendar();
        renderPanel(dateKey);
      });
      grid.appendChild(button);
    }
  };

  const renderRecent = () => {
    if (!editions.length) {
      recentList.innerHTML = '<p class="recent-empty">아직 발행된 뉴스레터가 없습니다.</p>';
      return;
    }
    recentList.innerHTML = editions.slice(0, 8).map((edition) => `
      <a class="recent-card" href="${escapeHtml(edition.href)}">
        <div class="recent-date"><span>${escapeHtml(formatDate(edition.date))}</span><small>${escapeHtml(edition.time)}</small></div>
        <div class="recent-copy"><strong>${escapeHtml(edition.title)}</strong><p>${escapeHtml(edition.summary)}</p></div>
        <div class="recent-counts"><span>핵심 ${edition.highlights}</span><span>기타 ${edition.additional}</span><b aria-hidden="true">↗</b></div>
      </a>`).join("");
  };

  document.getElementById("prev-month").addEventListener("click", () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    renderCalendar();
  });

  document.getElementById("next-month").addEventListener("click", () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    renderCalendar();
  });

  renderStats();
  renderCalendar();
  renderPanel(selectedDate);
  renderRecent();
}());
