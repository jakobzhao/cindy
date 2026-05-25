const data = window.SURVEY_DATA;

const sourceSelect = document.querySelector("#sourceSelect");
const sheetSelect = document.querySelector("#sheetSelect");
const searchInput = document.querySelector("#searchInput");
const sourceNote = document.querySelector("#sourceNote");
const summaryGrid = document.querySelector("#summaryGrid");
const frequencyBars = document.querySelector("#frequencyBars");
const skillBars = document.querySelector("#skillBars");
const frequencyTotal = document.querySelector("#frequencyTotal");
const skillAverage = document.querySelector("#skillAverage");
const tableHead = document.querySelector("#tableHead");
const tableBody = document.querySelector("#tableBody");
const rowCount = document.querySelector("#rowCount");

const FIELD_HINTS = {
  age: "1. Age group",
  education: "2. Education Level",
  frequency: "3. How often do you use AI tools",
  skill: "4. How would you rate your prompt writing skill",
};

function findColumn(columns, hint) {
  return columns.find((column) => column.includes(hint));
}

function countBy(rows, column) {
  return rows.reduce((acc, row) => {
    const value = row[column] ?? "未填写";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function uniqueCount(rows, column) {
  return new Set(rows.map((row) => row[column]).filter(Boolean)).size;
}

function selectedSource() {
  return data.sources[sourceSelect.selectedIndex] || data.sources[0];
}

function selectedSheet() {
  const source = selectedSource();
  return source.sheets[sheetSelect.selectedIndex] || source.sheets[0];
}

function renderSourceOptions() {
  sourceSelect.innerHTML = data.sources
    .map((source, index) => `<option value="${index}">${source.fileName}</option>`)
    .join("");
}

function renderSheetOptions() {
  const source = selectedSource();
  sheetSelect.innerHTML = source.sheets
    .map((sheet, index) => `<option value="${index}">${sheet.name}</option>`)
    .join("");
}

function renderSummary(rows, columns, source, sheet) {
  const ageColumn = findColumn(columns, FIELD_HINTS.age);
  const educationColumn = findColumn(columns, FIELD_HINTS.education);
  const skillColumn = findColumn(columns, FIELD_HINTS.skill);
  const skillValues = rows
    .map((row) => Number(row[skillColumn]))
    .filter((value) => Number.isFinite(value));
  const average =
    skillValues.length > 0
      ? (skillValues.reduce((sum, value) => sum + value, 0) / skillValues.length).toFixed(2)
      : "无";

  const metrics = [
    ["数据行数", rows.length.toLocaleString("zh-CN")],
    ["字段数量", columns.length.toLocaleString("zh-CN")],
    ["年龄组数量", ageColumn ? uniqueCount(rows, ageColumn) : "无"],
    ["技能均值", average],
  ];

  summaryGrid.innerHTML = metrics
    .map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");

  const educationText = educationColumn ? `${uniqueCount(rows, educationColumn)} 个教育层级` : "未识别教育层级字段";
  sourceNote.textContent = `${source.relativePath} / ${sheet.name}，${educationText}，生成时间 ${data.generatedAt}`;
}

function renderBars(container, counts, colorClass = "") {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, count]) => count), 1);

  container.innerHTML = entries
    .map(([label, count]) => {
      const width = Math.round((count / max) * 100);
      return `
        <div class="bar-row">
          <div class="bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
          <div class="track"><div class="fill ${colorClass}" style="width:${width}%"></div></div>
          <div class="bar-value">${count}</div>
        </div>
      `;
    })
    .join("");
}

function renderCharts(rows, columns) {
  const frequencyColumn = findColumn(columns, FIELD_HINTS.frequency);
  const skillColumn = findColumn(columns, FIELD_HINTS.skill);
  const frequencyCounts = frequencyColumn ? countBy(rows, frequencyColumn) : {};
  const skillCounts = skillColumn ? countBy(rows, skillColumn) : {};
  const skillValues = rows
    .map((row) => Number(row[skillColumn]))
    .filter((value) => Number.isFinite(value));

  frequencyTotal.textContent = `${rows.length} 条记录`;
  skillAverage.textContent =
    skillValues.length > 0
      ? `平均 ${(skillValues.reduce((sum, value) => sum + value, 0) / skillValues.length).toFixed(2)}`
      : "无数值";

  renderBars(frequencyBars, frequencyCounts);
  renderBars(skillBars, skillCounts, "skill-fill");
}

function rowMatches(row, query) {
  if (!query) return true;
  const lower = query.toLowerCase();
  return Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(lower));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTable(rows, columns) {
  const query = searchInput.value.trim();
  const visibleRows = rows.filter((row) => rowMatches(row, query));

  rowCount.textContent = query
    ? `${visibleRows.length} / ${rows.length} 条`
    : `${rows.length} 条`;

  tableHead.innerHTML = `<tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>`;

  if (visibleRows.length === 0) {
    tableBody.innerHTML = `<tr><td class="empty" colspan="${columns.length}">没有匹配的数据</td></tr>`;
    return;
  }

  tableBody.innerHTML = visibleRows
    .map(
      (row) => `
        <tr>
          ${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}
        </tr>
      `,
    )
    .join("");
}

function render() {
  const source = selectedSource();
  const sheet = selectedSheet();
  const rows = sheet.rows;
  const columns = sheet.columns;

  renderSummary(rows, columns, source, sheet);
  renderCharts(rows, columns);
  renderTable(rows, columns);
}

sourceSelect.addEventListener("change", () => {
  renderSheetOptions();
  searchInput.value = "";
  render();
});

sheetSelect.addEventListener("change", () => {
  searchInput.value = "";
  render();
});

searchInput.addEventListener("input", render);

renderSourceOptions();
renderSheetOptions();
render();
