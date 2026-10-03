const defaultRecords = [
  {
    id: "article-recording",
    type: "article",
    typeLabel: "ARTICLE",
    title: "기록은 기억을 보관하는 일이 아니라 생각을 다시 만나는 일이다",
    source: "The Creative Independent · 8월 14일",
    summary: "좋은 기록은 정보를 완벽히 보존하는 것이 아니라, 미래의 내가 당시의 관점과 맥락을 다시 만날 수 있게 한다.",
    points: ["무엇을 봤는지보다 왜 남겼는지가 재발견에 중요하다.", "짧은 메모도 시간이 지나면 생각의 변화를 보여주는 단서가 된다.", "기록은 수집에서 끝나지 않고 다음 행동으로 이어져야 한다."],
    thought: "완벽하게 정리하려다 아무것도 남기지 않는 습관부터 바꿔야겠다.",
    topics: ["기록습관", "지식관리"]
  },
  {
    id: "youtube-design",
    type: "video",
    typeLabel: "YOUTUBE",
    title: "좋은 제품은 기능보다 기억에 남는 순간을 설계한다",
    source: "Design Better · 12분",
    summary: "사용자는 모든 기능을 기억하지 않지만 제품을 쓰며 느낀 한두 개의 결정적인 순간은 오래 기억한다.",
    points: ["기능의 수보다 사용자가 감정을 느끼는 순간을 먼저 설계한다.", "온보딩의 첫 성공 경험이 제품 전체의 인상을 만든다.", "작은 피드백과 문구가 사용자의 행동을 이어주는 계기가 된다."],
    thought: "",
    topics: ["프로덕트 디자인", "사용자경험"]
  },
  {
    id: "image-reference",
    type: "image",
    typeLabel: "IMAGE",
    title: "정보가 쌓이는 과정을 보여주는 타임라인 레퍼런스",
    source: "스크린샷 · 9월 10일",
    summary: "시간의 흐름과 기록의 연결을 한 화면에서 보여주는 세로형 인터페이스 레퍼런스다.",
    points: ["날짜보다 생각의 변화가 먼저 보인다.", "색을 최소화해 기록 내용에 집중시킨다.", "관련 기록이 선으로 연결돼 탐색 흐름이 자연스럽다."],
    thought: "기록 상세에서 과거와 현재의 생각을 이렇게 나란히 보여주면 좋겠다.",
    topics: ["프로덕트 디자인", "영감"]
  },
  {
    id: "voice-idea",
    type: "voice",
    typeLabel: "VOICE",
    title: "콘텐츠를 저장한 이유를 먼저 물어보는 아이디어",
    source: "음성 메모 · 9월 12일 · 00:38",
    summary: "콘텐츠 요약보다 사용자가 저장한 이유를 빠르게 남기게 하면 개인 기록의 가치가 더 커질 수 있다는 아이디어다.",
    points: ["질문은 한 번에 하나만 보여준다.", "타이핑이 어려운 상황을 위해 음성 입력을 제공한다.", "답하지 않아도 원본 저장은 완료된다."],
    thought: "질문의 답을 강요하지 말고 나중에 다시 물어보는 방식이 중요하다.",
    topics: ["기록습관", "콘텐츠 기획"]
  }
];

const state = {
  screen: "today",
  filter: "all",
  query: "",
  currentRecordId: null,
  captureType: "link",
  recording: false,
  records: JSON.parse(localStorage.getItem("memoive-records") || "null") || defaultRecords
};

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

function persist() {
  localStorage.setItem("memoive-records", JSON.stringify(state.records));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function goTo(screen) {
  state.screen = screen;
  $$(".screen").forEach((el) => el.classList.toggle("active", el.dataset.screen === screen));
  $$(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.go === screen));
  if (screen === "records") renderRecords();
}

function openOverlay(target) {
  $("#overlay").classList.add("active");
  target.classList.add("active");
}

function closeSheets() {
  $("#overlay").classList.remove("active");
  $("#capture-sheet").classList.remove("active");
  $("#thought-sheet").classList.remove("active");
}

function openCapture() {
  openOverlay($("#capture-sheet"));
  setTimeout(() => {
    if (state.captureType === "link") $("#capture-link").focus();
  }, 350);
}

function chooseCaptureType(type) {
  state.captureType = type;
  $$(".capture-type").forEach((button) => button.classList.toggle("active", button.dataset.type === type));
  $$(".capture-panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === type));
}

function makeRecord(type, value, personalNote) {
  const now = new Date();
  const sourceDate = `${now.getMonth() + 1}월 ${now.getDate()}일`;
  const shared = {
    id: `record-${Date.now()}`,
    type,
    thought: personalNote.trim(),
    topics: ["새로운 기록"]
  };

  if (type === "link") {
    const isYoutube = /youtube|youtu\.be/i.test(value);
    return {
      ...shared,
      type: isYoutube ? "video" : "article",
      typeLabel: isYoutube ? "YOUTUBE" : "ARTICLE",
      title: isYoutube ? "새로 저장한 YouTube 콘텐츠" : "새로 저장한 웹 콘텐츠",
      source: `${new URL(value).hostname.replace("www.", "")} · ${sourceDate}`,
      summary: "사용자가 공유한 링크의 중심 내용을 빠르게 이해할 수 있도록 핵심 맥락을 한 문장으로 정리한 시연용 기록입니다.",
      points: ["원문과 출처를 먼저 안전하게 보존합니다.", "내용에서 반복되는 핵심 주제를 찾아 정리합니다.", "나중에 다시 활용할 수 있도록 관련 기록과 연결합니다."],
      topics: isYoutube ? ["영상", "새로운 기록"] : ["아티클", "새로운 기록"]
    };
  }

  if (type === "image") {
    return {
      ...shared,
      typeLabel: "IMAGE",
      title: value || "새로 저장한 이미지 레퍼런스",
      source: `이미지 · ${sourceDate}`,
      summary: "이미지의 주요 구성과 문자 정보를 함께 살펴 다시 찾기 쉬운 레퍼런스로 정리한 시연용 기록입니다.",
      points: ["이미지 속 중요한 문자와 대상을 추출합니다.", "레이아웃과 색상처럼 시각적 특징을 기록합니다.", "비슷한 이미지와 주제를 찾아 연결합니다."],
      topics: ["이미지", "레퍼런스"]
    };
  }

  if (type === "voice") {
    return {
      ...shared,
      typeLabel: "VOICE",
      title: "새로 남긴 음성 아이디어",
      source: `음성 메모 · ${sourceDate}`,
      summary: "음성에 담긴 아이디어를 글로 변환하고 핵심 의도와 다음 행동을 정리한 시연용 기록입니다.",
      points: ["음성 원본과 변환된 문장을 함께 보존합니다.", "중심 생각과 보조 내용을 구분합니다.", "실행 가능한 내용은 별도로 제안합니다."],
      topics: ["아이디어", "음성 메모"]
    };
  }

  const clean = value.trim();
  return {
    ...shared,
    typeLabel: "TEXT",
    title: clean.length > 36 ? `${clean.slice(0, 36)}…` : clean || "새로 남긴 텍스트 기록",
    source: `텍스트 메모 · ${sourceDate}`,
    summary: clean || "사용자가 남긴 텍스트에서 핵심 생각을 찾아 정리한 시연용 기록입니다.",
    points: ["원문을 수정하지 않고 그대로 보존합니다.", "핵심 문장과 주제를 찾아 다시 찾기 쉽게 만듭니다.", "사용자의 다른 기록과 연결할 단서를 제안합니다."],
    topics: ["메모", "새로운 기록"]
  };
}

async function runAnalysis(record) {
  closeSheets();
  const view = $("#analysis-view");
  const steps = [$("#step-extract"), $("#step-summary"), $("#step-connect")];
  steps.forEach((step) => step.className = "");
  view.classList.add("active");

  for (const step of steps) {
    step.classList.add("active");
    await new Promise((resolve) => setTimeout(resolve, 520));
    step.classList.remove("active");
    step.classList.add("done");
    step.querySelector("span").textContent = "✓";
  }

  state.records.unshift(record);
  persist();
  view.classList.remove("active");
  resetCaptureForm();
  openRecord(record.id);
  showToast("새 기록이 MEMOIVE에 살아났어요.");
}

function resetCaptureForm() {
  $("#capture-form").reset();
  $("#file-name").textContent = "JPG, PNG, WEBP";
  $("#voice-button").classList.remove("recording");
  $("#voice-button strong").textContent = "눌러서 음성 기록 시작";
  state.recording = false;
}

function renderRecords() {
  const list = $("#record-list");
  const query = state.query.trim().toLowerCase();
  const records = state.records.filter((record) => {
    const matchesType = state.filter === "all" || record.type === state.filter;
    const haystack = [record.title, record.source, record.summary, record.thought, ...(record.topics || [])].join(" ").toLowerCase();
    return matchesType && haystack.includes(query);
  });

  $("#record-count").textContent = state.records.length;
  list.innerHTML = records.map((record) => `
    <button class="record-item" data-record-id="${record.id}">
      <span class="record-mini-thumb mini-${record.type}">${record.typeLabel}</span>
      <span><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(record.source)} · ${record.thought ? "나의 기록 있음" : "이어 쓰기"}</small></span>
      <span class="item-arrow">→</span>
    </button>
  `).join("");

  $("#empty-state").classList.toggle("hidden", records.length > 0);
  $$(".record-item", list).forEach((item) => item.addEventListener("click", () => openRecord(item.dataset.recordId)));
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function openRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  state.currentRecordId = id;
  $("#detail-source-preview").className = `detail-source-preview ${record.type}`;
  $("#detail-source").textContent = record.source;
  $("#detail-title").textContent = record.title;
  $("#detail-topics").innerHTML = record.topics.map((topic) => `<span># ${escapeHtml(topic)}</span>`).join("");
  $("#detail-summary").textContent = record.summary;
  $("#detail-points").innerHTML = record.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("");
  const thought = $("#detail-thought");
  thought.textContent = record.thought || "아직 나만의 기록이 없어요. 한 문장이면 충분해요.";
  thought.classList.toggle("empty", !record.thought);
  $("#detail-view").classList.add("active");
}

function closeRecord() {
  $("#detail-view").classList.remove("active");
}

function openThought(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  state.currentRecordId = id;
  $("#thought-context").textContent = `“${record.title}”`;
  $("#thought-input").value = record.thought || "";
  openOverlay($("#thought-sheet"));
  setTimeout(() => $("#thought-input").focus(), 350);
}

function saveThought() {
  const value = $("#thought-input").value.trim();
  if (!value) {
    showToast("한 문장만 남겨주세요.");
    return;
  }
  const record = state.records.find((item) => item.id === state.currentRecordId);
  if (!record) return;
  record.thought = value;
  persist();
  closeSheets();
  if ($("#detail-view").classList.contains("active")) openRecord(record.id);
  renderRecords();
  showToast("나만의 기록을 남겼어요.");
}

function renderWeek() {
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const now = new Date();
  const jsDay = now.getDay() || 7;
  $("#week-grid").innerHTML = days.map((day, index) => {
    const position = index + 1;
    const className = position === jsDay ? "today" : [Math.max(1, jsDay - 2), Math.max(1, jsDay - 1)].includes(position) ? "done" : "";
    const date = new Date(now);
    date.setDate(now.getDate() - jsDay + position);
    return `<div class="week-day ${className}"><small>${day}</small><span>${date.getDate()}</span></div>`;
  }).join("");
}

function init() {
  const today = new Date();
  $("#today-date").textContent = `${today.getMonth() + 1}월 ${today.getDate()}일 · 오늘`;
  renderWeek();
  renderRecords();

  $$('[data-go]').forEach((button) => button.addEventListener("click", () => goTo(button.dataset.go)));
  [$("#hero-capture"), $("#nav-capture")].forEach((button) => button.addEventListener("click", openCapture));
  $$(".close-sheet, .thought-close").forEach((button) => button.addEventListener("click", closeSheets));
  $("#overlay").addEventListener("click", closeSheets);

  $$(".capture-type").forEach((button) => button.addEventListener("click", () => chooseCaptureType(button.dataset.type)));
  $("#capture-image").addEventListener("change", (event) => {
    $("#file-name").textContent = event.target.files[0]?.name || "JPG, PNG, WEBP";
  });

  $("#voice-button").addEventListener("click", () => {
    state.recording = !state.recording;
    $("#voice-button").classList.toggle("recording", state.recording);
    $("#voice-button strong").textContent = state.recording ? "음성을 듣고 있어요 · 완료하기" : "음성 기록 완료 · 다시 녹음";
  });

  $("#capture-form").addEventListener("submit", (event) => {
    event.preventDefault();
    let value = "";
    if (state.captureType === "link") value = $("#capture-link").value.trim();
    if (state.captureType === "text") value = $("#capture-text").value.trim();
    if (state.captureType === "image") value = $("#capture-image").files[0]?.name || "";
    if (state.captureType === "voice") value = state.recording ? "recording" : "";

    if (!value) {
      showToast(state.captureType === "image" ? "이미지를 선택해주세요." : state.captureType === "voice" ? "먼저 음성 기록을 시작해주세요." : "남길 내용을 입력해주세요.");
      return;
    }

    try {
      const record = makeRecord(state.captureType, value, $("#personal-note").value);
      runAnalysis(record);
    } catch {
      showToast("올바른 링크 주소인지 확인해주세요.");
    }
  });

  $$(".open-record, .prompt-card").forEach((card) => card.addEventListener("click", (event) => {
    if (!event.target.closest(".add-thought")) openRecord(card.dataset.recordId);
  }));
  $$(".add-thought").forEach((button) => button.addEventListener("click", () => openThought(button.dataset.recordId)));
  $("#detail-add-thought").addEventListener("click", () => openThought(state.currentRecordId));
  $(".detail-back").addEventListener("click", closeRecord);
  $("#save-thought").addEventListener("click", saveThought);
  $("#voice-mini").addEventListener("click", () => showToast("음성 입력은 다음 연결 단계에서 실제 기기 기능과 연동합니다."));

  $("#record-search").addEventListener("input", (event) => { state.query = event.target.value; renderRecords(); });
  $$(".filter").forEach((button) => button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    $$(".filter").forEach((item) => item.classList.toggle("active", item === button));
    renderRecords();
  }));

  $("#open-search").addEventListener("click", () => { goTo("records"); setTimeout(() => $("#record-search").focus(), 250); });
  $$(".topic-item").forEach((button) => button.addEventListener("click", () => {
    goTo("records");
    state.query = button.dataset.topic;
    $("#record-search").value = state.query;
    renderRecords();
  }));
  $("#notification-toggle").addEventListener("change", (event) => showToast(event.target.checked ? "질문형 알림을 켰어요." : "알림을 껐어요. 상시 기록은 그대로 사용할 수 있어요."));
  $("#rhythm-setting").addEventListener("click", () => showToast("첫 버전의 기본 리듬은 주 3회예요."));
  $("#time-setting").addEventListener("click", () => showToast("첫 버전의 선호 시간은 오후 8:30이에요."));

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

init();
