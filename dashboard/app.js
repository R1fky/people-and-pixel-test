const API_BASE_URL = "http://localhost:3000/internal/mentions";

let currentPage = 1;
const limit = 10;

/* =========================================
   FETCH MENTIONS
========================================= */

async function fetchMentions() {
  const source = document.getElementById("source").value;
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;
  const search = document.getElementById("search").value;

  const params = new URLSearchParams();

  params.set("page", currentPage);
  params.set("limit", limit);

  if (source) {
    params.set("source", source);
  }

  if (from) {
    params.set("from", from);
  }

  if (to) {
    params.set("to", to);
  }

  if (search) {
    params.set("search", search);
  }

  try {
    const response = await fetch(`${API_BASE_URL}?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to fetch mentions");
    }

    const result = await response.json();

    renderMentions(result);
  } catch (error) {
    console.error(error);

    document.getElementById("mentionsTable").innerHTML = `
      <tr>
        <td colspan="6">
          Failed to load mentions.
        </td>
      </tr>
    `;
  }
}

/* =========================================
   RENDER MENTIONS
========================================= */

function renderMentions(result) {
  const tableBody = document.getElementById("mentionsTable");

  tableBody.innerHTML = "";

  if (result.data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          No mentions found.
        </td>
      </tr>
    `;

    updatePagination(result.pagination);

    return;
  }

  result.data.forEach((mention) => {
    const row = document.createElement("tr");

    const publishedDate = mention.published_at ? new Date(mention.published_at).toLocaleString() : "-";

    row.innerHTML = `
      <td>
        <span class="source-badge">
          ${escapeHtml(mention.source)}
        </span>
      </td>

      <td class="title-cell">
        <strong>
          ${escapeHtml(mention.title || "Untitled")}
        </strong>
      </td>

      <td>
        ${escapeHtml(mention.author || "-")}
      </td>

      <td>
        ${publishedDate}
      </td>

      <td class="engagement">
        ${Number(mention.engagement).toLocaleString()}
      </td>

      <td>
        <a
          class="view-link"
          href="${mention.url}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open ↗
        </a>
      </td>
    `;

    tableBody.appendChild(row);
  });

  document.getElementById("resultInfo").textContent = `${result.pagination.total} mentions found`;

  updatePagination(result.pagination);
}

/* =========================================
   PAGINATION
========================================= */

function updatePagination(pagination) {
  document.getElementById("pageInfo").textContent = `Page ${pagination.page} of ${pagination.total_pages || 1}`;

  document.getElementById("previousButton").disabled = pagination.page <= 1;

  document.getElementById("nextButton").disabled = pagination.page >= pagination.total_pages;
}

/* =========================================
   FETCH SOURCE STATS
========================================= */

async function fetchSourceStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats?group_by=source`);

    if (!response.ok) {
      throw new Error("Failed to fetch source statistics");
    }

    const result = await response.json();

    renderSourceStats(result.data);
  } catch (error) {
    console.error(error);

    document.getElementById("sourceStats").textContent = "Failed to load statistics.";
  }
}

/* =========================================
   RENDER SOURCE STATS
========================================= */

function renderSourceStats(data) {
  const container = document.getElementById("sourceStats");

  container.innerHTML = "";

  if (data.length === 0) {
    container.textContent = "No data.";

    return;
  }

  const max = Math.max(...data.map((item) => Number(item.total)));

  data.forEach((item) => {
    const percentage = max > 0 ? (Number(item.total) / max) * 100 : 0;

    const row = document.createElement("div");

    row.className = "stat-row";

    row.innerHTML = `
      <div class="stat-row-header">
        <span>${escapeHtml(item.source)}</span>
        <strong>${item.total}</strong>
      </div>

      <div class="bar">
        <div
          class="bar-fill"
          style="width: ${percentage}%"
        ></div>
      </div>
    `;

    container.appendChild(row);
  });
}

/* =========================================
   FETCH DAY STATS
========================================= */

async function fetchDayStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats?group_by=day`);

    if (!response.ok) {
      throw new Error("Failed to fetch daily statistics");
    }

    const result = await response.json();

    renderDayStats(result.data);
  } catch (error) {
    console.error(error);

    document.getElementById("dayStats").textContent = "Failed to load statistics.";
  }
}

/* =========================================
   RENDER DAY STATS
========================================= */

function renderDayStats(data) {
  const container = document.getElementById("dayStats");

  container.innerHTML = "";

  if (data.length === 0) {
    container.textContent = "No data.";

    return;
  }

  const max = Math.max(...data.map((item) => Number(item.total)));

  data.forEach((item) => {
    const percentage = max > 0 ? (Number(item.total) / max) * 100 : 0;

    const row = document.createElement("div");

    row.className = "day-row";

    row.innerHTML = `
      <span class="day-label">
        ${formatDate(item.day)}
      </span>

      <div class="day-bar">
        <div
          class="day-bar-fill"
          style="width: ${percentage}%"
        ></div>
      </div>

      <strong>
        ${item.total}
      </strong>
    `;

    container.appendChild(row);
  });
}

/* =========================================
   TOTAL STATISTICS
========================================= */

async function loadSummary() {
  try {
    const response = await fetch(`${API_BASE_URL}?page=1&limit=1`);

    const result = await response.json();

    document.getElementById("totalMentions").textContent = result.pagination.total;

    document.getElementById("totalSources").textContent = new Set(result.data.map((item) => item.source)).size;
  } catch (error) {
    console.error(error);
  }
}

/* =========================================
   BULK CREATE MENTIONS
========================================= */
async function bulkCreateMentions() {
  const input = document.getElementById("bulkInput");
  const status = document.getElementById("bulkStatus");
  const button = document.getElementById("bulkButton");

  const value = input.value.trim();

  // 1. Validasi input kosong
  if (!value) {
    status.textContent = "Please enter JSON data.";
    return;
  }

  let payload;

  // 2. Validasi format sintaks JSON
  try {
    payload = JSON.parse(value);
  } catch (error) {
    status.textContent = "Invalid JSON format.";
    return;
  }

  // 3. Validasi struktur objek {"mentions": [...]}
  if (!payload || !payload.mentions || !Array.isArray(payload.mentions)) {
    status.textContent = "JSON must contain a 'mentions' array.";
    return;
  }

  if (payload.mentions.length === 0) {
    status.textContent = "No mentions provided dalam array.";
    return;
  }

  // Kunci tombol saat proses kirim berlangsung
  button.disabled = true;
  status.textContent = "Adding mentions...";

  try {
    // 4. Kirim data objek utuh ke backend Express
    const response = await fetch(`${API_BASE_URL}/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload), // Mengirim objek {"mentions": [...]}
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to add mentions");
    }

    // 5. Berhasil dimasukkan
    status.textContent = `Successfully added ${payload.mentions.length} mentions.`;
    input.value = "";
    currentPage = 1;

    // Refresh data tampilan UI Anda
    await fetchMentions();
    await fetchSourceStats();
    await fetchDayStats();
    await loadSummary();
  } catch (error) {
    console.error(error);
    status.textContent = error.message || "Failed to add mentions.";
  } finally {
    // Buka kembali kunci tombol
    button.disabled = false;
  }
}

// 6. Hubungkan fungsi ke tombol HTML Anda agar bisa diklik
document.getElementById("bulkButton").addEventListener("click", bulkCreateMentions);

/* =========================================
   FORMAT DATE
========================================= */

function formatDate(value) {
  const date = new Date(value);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent = value;

  return div.innerHTML;
}

/* =========================================
   EVENTS
========================================= */

document.getElementById("filterButton").addEventListener("click", () => {
  currentPage = 1;

  fetchMentions();
});

document.getElementById("previousButton").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;

    fetchMentions();
  }
});

document.getElementById("nextButton").addEventListener("click", () => {
  currentPage++;

  fetchMentions();
});

/* =========================================
   INITIAL LOAD
========================================= */

fetchMentions();
fetchSourceStats();
fetchDayStats();
loadSummary();
