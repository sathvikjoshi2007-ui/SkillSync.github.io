// ═══════════════════════════════════════════════════════════════
// script.js - Traffic Congestion Vulnerability System
// Member 3 - Simulation & Visualization Engineer (Frontend)
// ═══════════════════════════════════════════════════════════════

"use strict";

// ─────────────────────────────────────────────────────────────
//  ROAD DATA (matches roads.csv)
// ─────────────────────────────────────────────────────────────
const ROAD_DATA = [
    { id: "AB", trafficDensity: 80, roadWidth: 2,
      altRoutes: 1, critical: "Yes" },
    { id: "BC", trafficDensity: 70, roadWidth: 3,
      altRoutes: 2, critical: "No"  },
    { id: "CD", trafficDensity: 60, roadWidth: 2,
      altRoutes: 1, critical: "Yes" },
    { id: "DE", trafficDensity: 40, roadWidth: 3,
      altRoutes: 2, critical: "No"  },
    { id: "EA", trafficDensity: 50, roadWidth: 2,
      altRoutes: 1, critical: "No"  }
];

// Road adjacency (for simulation)
const ROAD_GRAPH = {
    A: ["B", "E"],
    B: ["A", "C"],
    C: ["B", "D"],
    D: ["C", "E"],
    E: ["D", "A"]
};

// Simulation impact data (pre-calculated)
const SIMULATION_DATA = {
    AB: {
        disconnected : 0,
        extraDistance: 80,
        affectedRoads: ["BC", "EA"],
        delay        : "+High"
    },
    BC: {
        disconnected : 0,
        extraDistance: 70,
        affectedRoads: ["AB", "CD"],
        delay        : "+High"
    },
    CD: {
        disconnected : 0,
        extraDistance: 60,
        affectedRoads: ["BC", "DE"],
        delay        : "+Medium"
    },
    DE: {
        disconnected : 0,
        extraDistance: 40,
        affectedRoads: ["CD", "EA"],
        delay        : "+Medium"
    },
    EA: {
        disconnected : 0,
        extraDistance: 50,
        affectedRoads: ["AB", "DE"],
        delay        : "+Low"
    }
};

// TVI Weights
const WEIGHTS = {
    trafficDensity : 0.40,
    altRoute       : 0.30,
    roadWidth      : 0.20,
    critical       : 0.10
};

// Chart instance (for re-rendering)
let tviChartInstance  = null;
let radarChartInstance= null;
let currentLocationData = null;

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

// ─────────────────────────────────────────────────────────────
//  INITIALIZATION
// ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚦 Traffic Congestion System Loaded");

    // Calculate TVI for all roads
    const processedData = ROAD_DATA.map(road => ({
        ...road,
        tviScore : calculateTVI(
            road.trafficDensity,
            road.altRoutes,
            road.roadWidth,
            road.critical
        )
    }));

    // Sort by TVI descending
    processedData.sort((a, b) => b.tviScore - a.tviScore);

    // Render all components
    renderStatsCards(processedData);
    renderTable(processedData);
    renderChart(processedData);
    renderReportTable(processedData);
    renderRadarChart(processedData);
    renderRoadButtons();
    attachEdgeClickListeners();
});

// ─────────────────────────────────────────────────────────────
//  TVI CALCULATION ENGINE
// ─────────────────────────────────────────────────────────────

/**
 * Normalize traffic density (0-100)
 */
function normalizeTrafficDensity(density) {
    return Math.min(density, 100);
}

/**
 * Normalize alternative route factor
 * Fewer routes = more vulnerable
 */
function normalizeAltRoute(altRoutes) {
    if (altRoutes <= 0) return 100;
    return Math.round((100 / altRoutes) * 100) / 100;
}

/**
 * Normalize road width factor
 * Narrower = more vulnerable
 */
function normalizeRoadWidth(width) {
    const widthMap = { 1: 100, 2: 80, 3: 50, 4: 30 };
    return widthMap[width] ?? 50;
}

/**
 * Normalize critical importance
 * Yes = 100, No = 0
 */
function normalizeCritical(critical) {
    return critical.toLowerCase() === "yes" ? 100 : 0;
}

/**
 * Calculate TVI Score
 * TVI = 40%*TD + 30%*AR + 20%*RW + 10%*CI
 */
function calculateTVI(trafficDensity, altRoutes, roadWidth, critical) {
    const td = normalizeTrafficDensity(trafficDensity);
    const ar = normalizeAltRoute(altRoutes);
    const rw = normalizeRoadWidth(roadWidth);
    const ci = normalizeCritical(critical);

    const tvi = (WEIGHTS.trafficDensity * td)
              + (WEIGHTS.altRoute       * ar)
              + (WEIGHTS.roadWidth      * rw)
              + (WEIGHTS.critical       * ci);

    return Math.round(tvi * 100) / 100;
}

/**
 * Get risk level from TVI score
 */
function getRiskLevel(tvi) {
    if (tvi >= 70) return { level: "High",   icon: "🔴", class: "risk-high"   };
    if (tvi >= 40) return { level: "Medium", icon: "🟡", class: "risk-medium" };
    return            { level: "Low",    icon: "🟢", class: "risk-low"    };
}

/**
 * Get color from TVI score
 */
function getTVIColor(tvi) {
    if (tvi >= 70) return "#f85149";
    if (tvi >= 40) return "#d29922";
    return "#3fb950";
}

// ─────────────────────────────────────────────────────────────
//  RENDER STATS CARDS
// ─────────────────────────────────────────────────────────────
function renderStatsCards(data) {
    const high   = data.filter(d => d.tviScore >= 70).length;
    const medium = data.filter(d => d.tviScore >= 40 && d.tviScore < 70).length;
    const low    = data.filter(d => d.tviScore < 40).length;

    document.getElementById("high-count").textContent   = high;
    document.getElementById("medium-count").textContent = medium;
    document.getElementById("low-count").textContent    = low;
    document.getElementById("total-roads").textContent  = data.length;
}

// ─────────────────────────────────────────────────────────────
//  RENDER TVI TABLE
// ─────────────────────────────────────────────────────────────
function renderTable(data, query = "") {
    const tbody = document.getElementById("table-body");
    tbody.innerHTML = "";

    const filtered = query
        ? data.filter(d => d.id.toLowerCase().includes(query.toLowerCase()))
        : data;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;
            color:var(--text-secondary);padding:2rem;">
            No roads found matching "${query}"</td></tr>`;
        return;
    }

    filtered.forEach((road, index) => {
        const risk  = getRiskLevel(road.tviScore);
        const color = getTVIColor(road.tviScore);
        const pct   = (road.tviScore / 100 * 100).toFixed(0);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong style="color:var(--accent-blue)">
                #${index + 1}</strong></td>
            <td><strong style="color:var(--text-heading)">
                ${road.id}</strong></td>
            <td>
                <div class="tvi-bar-cell">
                    <div class="tvi-mini-bar" style="
                        width:${road.trafficDensity}px;
                        max-width:100px;
                        background:${color};
                        opacity:0.7;">
                    </div>
                    ${road.trafficDensity}
                </div>
            </td>
            <td>${road.roadWidth} lanes</td>
            <td>${road.altRoutes}</td>
            <td>${road.critical}</td>
            <td>
                <div class="tvi-bar-cell">
                    <div class="tvi-mini-bar" style="
                        width:${pct}px;
                        max-width:100px;
                        background:${color};">
                    </div>
                    <strong style="color:${color}">${road.tviScore}</strong>
                </div>
            </td>
            <td>
                <span class="risk-badge ${risk.class}">
                    ${risk.icon} ${risk.level}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ─────────────────────────────────────────────────────────────
//  FILTER TABLE (Search)
// ─────────────────────────────────────────────────────────────
function filterTable() {
    const query = document.getElementById("search-input").value;
    const data  = ROAD_DATA.map(road => ({
        ...road,
        tviScore: calculateTVI(
            road.trafficDensity, road.altRoutes,
            road.roadWidth, road.critical
        )
    })).sort((a, b) => b.tviScore - a.tviScore);

    renderTable(data, query);
}

// ─────────────────────────────────────────────────────────────
//  SORT TABLE
// ─────────────────────────────────────────────────────────────
let sortState = { col: -1, asc: true };

function sortTable(colIndex) {
    const tbody = document.getElementById("table-body");
    const rows  = Array.from(tbody.querySelectorAll("tr"));

    sortState.asc = (sortState.col === colIndex) ? !sortState.asc : true;
    sortState.col = colIndex;

    rows.sort((a, b) => {
        const aText = a.cells[colIndex]?.textContent.trim() || "";
        const bText = b.cells[colIndex]?.textContent.trim() || "";
        const aNum  = parseFloat(aText);
        const bNum  = parseFloat(bText);

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return sortState.asc ? aNum - bNum : bNum - aNum;
        }
        return sortState.asc
            ? aText.localeCompare(bText)
            : bText.localeCompare(aText);
    });

    rows.forEach(row => tbody.appendChild(row));
}

// ─────────────────────────────────────────────────────────────
//  RENDER TVI CHART
// ─────────────────────────────────────────────────────────────
function showChartFallback(canvas, message) {
    const container = canvas.closest(".chart-container");
    if (!container) return;

    canvas.style.display = "none";

    let fallback = container.querySelector(".chart-fallback");
    if (!fallback) {
        fallback = document.createElement("div");
        fallback.className = "chart-fallback";
        container.appendChild(fallback);
    }
    fallback.textContent = message;
}

function clearChartFallback(canvas) {
    const container = canvas.closest(".chart-container");
    if (!container) return;

    canvas.style.display = "";
    const fallback = container.querySelector(".chart-fallback");
    if (fallback) fallback.remove();
}

function renderChart(dataOverride = null) {
    const chartType = document.getElementById("chart-type")?.value || "bar";
    const canvas    = document.getElementById("tvi-chart");

    if (!canvas) return;

    if (typeof Chart === "undefined") {
        showChartFallback(canvas,
            "Chart library is unavailable. Tables and reports still work.");
        return;
    }

    clearChartFallback(canvas);

    // Destroy existing chart
    if (tviChartInstance) {
        tviChartInstance.destroy();
        tviChartInstance = null;
    }

    const data = (dataOverride || ROAD_DATA.map(road => ({
        ...road,
        tviScore: calculateTVI(
            road.trafficDensity, road.altRoutes,
            road.roadWidth, road.critical
        )
    }))).sort((a, b) => b.tviScore - a.tviScore);

    const labels = data.map(d => d.id);
    const scores = data.map(d => d.tviScore);
    const colors = data.map(d => getTVIColor(d.tviScore));

    const ctx = canvas.getContext("2d");

    const config = {
        type: chartType === "radar" ? "radar" : chartType,
        data: {
            labels,
            datasets: [{
                label          : "TVI Score",
                data           : scores,
                backgroundColor: colors.map(c => c + "99"),
                borderColor    : colors,
                borderWidth    : 2,
                pointBackgroundColor: colors,
                pointRadius    : 6,
                pointHoverRadius: 9,
                fill           : chartType === "line" || chartType === "radar",
                tension        : 0.4
            }]
        },
        options: {
            responsive         : true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: "#c9d1d9", font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: "#1c2128",
                    borderColor    : "#30363d",
                    borderWidth    : 1,
                    titleColor     : "#f0f6fc",
                    bodyColor      : "#c9d1d9",
                    callbacks: {
                        label: (ctx) => {
                            const score = ctx.raw;
                            const risk  = getRiskLevel(score);
                            return [
                                ` TVI Score: ${score}`,
                                ` Risk Level: ${risk.icon} ${risk.level}`
                            ];
                        }
                    }
                }
            },
            scales: chartType !== "radar" ? {
                x: {
                    ticks : { color: "#c9d1d9" },
                    grid  : { color: "rgba(255,255,255,0.05)" }
                },
                y: {
                    min   : 0,
                    max   : 110,
                    ticks : { color: "#c9d1d9" },
                    grid  : { color: "rgba(255,255,255,0.05)" }
                }
            } : {
                r: {
                    min         : 0,
                    max         : 110,
                    ticks       : { color: "#c9d1d9",
                                    backdropColor: "transparent" },
                    grid        : { color: "rgba(255,255,255,0.1)" },
                    pointLabels : { color: "#c9d1d9", font: { size: 13 } }
                }
            },
            animation: {
                duration : 800,
                easing   : "easeInOutQuart"
            }
        },
        plugins: [{
            // Risk threshold lines (for bar/line charts)
            afterDraw: (chart) => {
                if (chartType === "radar") return;
                const { ctx, scales: { y } } = chart;
                if (!y) return;

                // High threshold line
                const y70 = y.getPixelForValue(70);
                ctx.save();
                ctx.strokeStyle = "#f85149";
                ctx.lineWidth   = 1.5;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(chart.chartArea.left,  y70);
                ctx.lineTo(chart.chartArea.right, y70);
                ctx.stroke();
                ctx.fillStyle = "#f85149";
                ctx.font      = "11px sans-serif";
                ctx.fillText("High Risk (70)",
                    chart.chartArea.right - 100, y70 - 5);

                // Medium threshold line
                const y40 = y.getPixelForValue(40);
                ctx.strokeStyle = "#d29922";
                ctx.beginPath();
                ctx.moveTo(chart.chartArea.left,  y40);
                ctx.lineTo(chart.chartArea.right, y40);
                ctx.stroke();
                ctx.fillStyle = "#d29922";
                ctx.fillText("Medium Risk (40)",
                    chart.chartArea.right - 110, y40 - 5);

                ctx.restore();
            }
        }]
    };

    tviChartInstance = new Chart(ctx, config);
}

// ─────────────────────────────────────────────────────────────
//  RENDER REPORT TABLE
// ─────────────────────────────────────────────────────────────
function renderReportTable(data) {
    const tbody = document.getElementById("report-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    data.forEach(road => {
        const risk  = getRiskLevel(road.tviScore);
        const color = getTVIColor(road.tviScore);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong style="color:var(--text-heading)">${road.id}</strong></td>
            <td>${road.trafficDensity}</td>
            <td>${road.roadWidth}</td>
            <td>${road.altRoutes}</td>
            <td>${road.critical}</td>
            <td><strong style="color:${color}">${road.tviScore}</strong></td>
            <td><span class="risk-badge ${risk.class}">
                ${risk.icon} ${risk.level}</span></td>
            <td><span style="color:var(--accent-green);font-size:0.8rem;">
                ✅ Analyzed</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// ─────────────────────────────────────────────────────────────
//  RENDER RADAR CHART (Report Section)
// ─────────────────────────────────────────────────────────────
function renderRadarChart(data) {
    const canvas = document.getElementById("radar-chart");
    if (!canvas) return;

    if (typeof Chart === "undefined") {
        showChartFallback(canvas,
            "Chart library is unavailable. Report data is still shown above.");
        return;
    }

    clearChartFallback(canvas);

    if (radarChartInstance) {
        radarChartInstance.destroy();
        radarChartInstance = null;
    }

    const colors = [
        "#f85149", "#d29922", "#58a6ff",
        "#3fb950", "#bc8cff"
    ];

    const ctx      = canvas.getContext("2d");
    const labels   = ["Traffic Density", "Road Width Factor",
                       "Alt. Route Factor", "Critical Importance", "TVI Score"];

    const datasets = data.map((road, i) => {
        const ar = normalizeAltRoute(road.altRoutes);
        const rw = normalizeRoadWidth(road.roadWidth);
        const ci = normalizeCritical(road.critical);
        return {
            label          : `Road ${road.id}`,
            data           : [
                road.trafficDensity,
                rw,
                ar,
                ci,
                road.tviScore
            ],
            backgroundColor: colors[i] + "33",
            borderColor    : colors[i],
            borderWidth    : 2,
            pointBackgroundColor: colors[i],
            pointRadius    : 4
        };
    });

    radarChartInstance = new Chart(ctx, {
        type: "radar",
        data: { labels, datasets },
        options: {
            responsive         : true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: "#c9d1d9", font: { size: 11 } }
                },
                tooltip: {
                    backgroundColor: "#1c2128",
                    borderColor    : "#30363d",
                    borderWidth    : 1,
                    titleColor     : "#f0f6fc",
                    bodyColor      : "#c9d1d9"
                }
            },
            scales: {
                r: {
                    min         : 0,
                    max         : 110,
                    ticks       : {
                        color         : "#8b949e",
                        backdropColor : "transparent",
                        font          : { size: 10 }
                    },
                    grid        : { color: "rgba(255,255,255,0.1)" },
                    pointLabels : { color: "#c9d1d9", font: { size: 11 } }
                }
            },
            animation: { duration: 1000, easing: "easeInOutQuart" }
        }
    });
}

// ─────────────────────────────────────────────────────────────
//  TVI CALCULATOR
// ─────────────────────────────────────────────────────────────

/**
 * Update slider display value
 */
function updateSlider(type) {
    const map = {
        density : { input: "calc-density", display: "density-val" },
        alt     : { input: "calc-alt",     display: "alt-val"     },
        width   : { input: "calc-width",   display: "width-val"   }
    };
    const { input, display } = map[type];
    const val = document.getElementById(input).value;
    document.getElementById(display).textContent = val;
}

/**
 * Calculate and display TVI for user input
 */
function calculateTVI_UI() {
    // Get values
    const roadId   = document.getElementById("calc-road-id").value.trim().toUpperCase()
                     || "??";
    const density  = parseInt(document.getElementById("calc-density").value);
    const alt      = parseInt(document.getElementById("calc-alt").value);
    const width    = parseInt(document.getElementById("calc-width").value);
    const critical = document.getElementById("calc-critical").value;

    // Calculate component scores
    const tdScore  = normalizeTrafficDensity(density);
    const arScore  = normalizeAltRoute(alt);
    const rwScore  = normalizeRoadWidth(width);
    const ciScore  = normalizeCritical(critical);

    const tvi      = calculateTVI(density, alt, width, critical);
    const risk     = getRiskLevel(tvi);
    const color    = getTVIColor(tvi);

    // Show result
    const resultDiv = document.getElementById("tvi-result");
    resultDiv.classList.remove("hidden");

    // Update result circle
    const circle = document.querySelector(".result-circle");
    circle.style.borderColor = color;
    document.getElementById("result-score").textContent = tvi;
    document.getElementById("result-score").style.color = color;
    document.getElementById("result-road").textContent  = roadId;
    document.getElementById("result-risk").textContent  = `${risk.icon} ${risk.level}`;
    document.getElementById("result-risk").style.color  = color;

    // Breakdown bars
    const breakdownData = [
        { label: "Traffic Density (40%)",  score: tdScore,
          contrib: WEIGHTS.trafficDensity * tdScore, color: "#f85149" },
        { label: "Alt. Route Factor (30%)", score: arScore,
          contrib: WEIGHTS.altRoute * arScore,       color: "#d29922" },
        { label: "Road Width Factor (20%)", score: rwScore,
          contrib: WEIGHTS.roadWidth * rwScore,      color: "#58a6ff" },
        { label: "Critical Importance (10%)", score: ciScore,
          contrib: WEIGHTS.critical * ciScore,       color: "#bc8cff" }
    ];

    const breakdownContainer = document.getElementById("breakdown-bars");
    breakdownContainer.innerHTML = breakdownData.map(item => `
        <div class="breakdown-item">
            <span class="breakdown-label">${item.label}</span>
            <div class="breakdown-bar-bg">
                <div class="breakdown-bar-fill"
                     style="width:${item.score}%;background:${item.color};">
                </div>
            </div>
            <span class="breakdown-score" style="color:${item.color}">
                ${item.contrib.toFixed(1)}
            </span>
        </div>
    `).join("");

    // Animate result
    resultDiv.style.animation = "none";
    setTimeout(() => { resultDiv.style.animation = "fadeIn 0.4s ease"; }, 10);
}

// Expose calculateTVI globally (called from HTML)
window.calculateTVI = calculateTVI_UI;

// ─────────────────────────────────────────────────────────────
//  SIMULATION
// ─────────────────────────────────────────────────────────────

let selectedRoad = null;

/**
 * Render road selector buttons
 */
function renderRoadButtons() {
    const container = document.getElementById("road-buttons");
    if (!container) return;

    ROAD_DATA.forEach(road => {
        const btn = document.createElement("button");
        btn.className   = "road-btn";
        btn.textContent = `Road ${road.id}`;
        btn.dataset.road = road.id;
        btn.onclick = () => selectRoad(road.id);
        container.appendChild(btn);
    });
}

/**
 * Attach click listeners to SVG edges
 */
function attachEdgeClickListeners() {
    document.querySelectorAll(".road-edge").forEach(edge => {
        edge.addEventListener("click", () => {
            const road = edge.dataset.road;
            if (road) selectRoad(road);
        });
    });
}

/**
 * Select a road to close and show simulation
 */
function selectRoad(roadId) {
    selectedRoad = roadId;

    // Update button states
    document.querySelectorAll(".road-btn").forEach(btn => {
        btn.classList.toggle("selected", btn.dataset.road === roadId);
    });

    // Update SVG edge styles
    document.querySelectorAll(".road-edge").forEach(edge => {
        const isSelected = edge.dataset.road === roadId;
        edge.classList.toggle("closed", isSelected);
        edge.style.stroke = isSelected ? "#f85149" : "#58a6ff";
    });

    // Show closed marker on SVG
    const edgeEl = document.getElementById(`edge-${roadId}`);
    const marker = document.getElementById("closed-marker");
    if (edgeEl && marker) {
        const x1  = parseFloat(edgeEl.getAttribute("x1"));
        const y1  = parseFloat(edgeEl.getAttribute("y1"));
        const x2  = parseFloat(edgeEl.getAttribute("x2"));
        const y2  = parseFloat(edgeEl.getAttribute("y2"));
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        marker.setAttribute("x", midX);
        marker.setAttribute("y", midY - 5);
        marker.classList.remove("hidden");
    }

    // Show impact report
    showImpactReport(roadId);
}

/**
 * Show impact report for selected road closure
 */
function showImpactReport(roadId) {
    const impact  = SIMULATION_DATA[roadId];
    if (!impact) return;

    const reportDiv = document.getElementById("impact-report");
    reportDiv.classList.remove("hidden");

    document.getElementById("impact-disconnected").textContent =
        impact.disconnected > 0
            ? `${impact.disconnected} pairs disconnected`
            : "✅ None (network still connected)";

    document.getElementById("impact-distance").textContent =
        `+${impact.extraDistance} traffic units`;

    document.getElementById("impact-affected").textContent =
        impact.affectedRoads.join(", ") || "None";

    document.getElementById("impact-delay").textContent =
        impact.delay + " delay expected";

    // Animate
    reportDiv.style.animation = "none";
    setTimeout(() => { reportDiv.style.animation = "fadeIn 0.4s ease"; }, 10);
}

/**
 * Reset simulation to original state
 */
function resetSimulation() {
    selectedRoad = null;

    // Reset button styles
    document.querySelectorAll(".road-btn").forEach(btn => {
        btn.classList.remove("selected");
    });

    // Reset SVG edge styles
    document.querySelectorAll(".road-edge").forEach(edge => {
        edge.classList.remove("closed");
        edge.style.stroke = "#58a6ff";
    });

    // Hide closed marker
    const marker = document.getElementById("closed-marker");
    if (marker) marker.classList.add("hidden");

    // Hide impact report
    document.getElementById("impact-report").classList.add("hidden");
}

// ─────────────────────────────────────────────────────────────
//  EXPORT FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Export data as CSV
 */
function exportCSV() {
    const data = ROAD_DATA.map(road => ({
        ...road,
        tviScore : calculateTVI(road.trafficDensity, road.altRoutes,
                                 road.roadWidth, road.critical),
        riskLevel: getRiskLevel(
            calculateTVI(road.trafficDensity, road.altRoutes,
                          road.roadWidth, road.critical)
        ).level
    }));

    const headers = [
        "Road_ID", "Traffic_Density", "Road_Width",
        "Alt_Routes", "Critical", "TVI_Score", "Risk_Level"
    ];

    const csvRows = [
        headers.join(","),
        ...data.map(d =>
            [d.id, d.trafficDensity, d.roadWidth,
             d.altRoutes, d.critical, d.tviScore, d.riskLevel].join(",")
        )
    ];

    downloadFile(
        csvRows.join("\n"),
        "traffic_vulnerability_report.csv",
        "text/csv"
    );
}

/**
 * Export data as JSON
 */
function exportJSON() {
    const data = ROAD_DATA.map(road => {
        const tvi  = calculateTVI(road.trafficDensity, road.altRoutes,
                                   road.roadWidth, road.critical);
        const risk = getRiskLevel(tvi);
        return {
            roadId           : road.id,
            trafficDensity   : road.trafficDensity,
            roadWidth        : road.roadWidth,
            altRoutes        : road.altRoutes,
            critical         : road.critical,
            tviScore         : tvi,
            riskLevel        : risk.level,
            simulationImpact : SIMULATION_DATA[road.id] || {}
        };
    });

    const output = {
        systemName  : "Traffic Congestion Vulnerability System",
        generatedAt : new Date().toISOString(),
        totalRoads  : data.length,
        location    : currentLocationData,
        roads       : data
    };

    downloadFile(
        JSON.stringify(output, null, 2),
        "traffic_vulnerability_report.json",
        "application/json"
    );
}

/**
 * Generic file download helper
 */
function downloadFile(content, filename, mimeType) {
    const blob    = new Blob([content], { type: mimeType });
    const url     = URL.createObjectURL(blob);
    const anchor  = document.createElement("a");
    anchor.href   = url;
    anchor.download= filename;
    anchor.click();
    URL.revokeObjectURL(url);
    console.log(`✅ Downloaded: ${filename}`);
}

// ─────────────────────────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────────────────────────

/**
 * Show a specific section and update nav
 */
function setLocationStatus(message, type = "idle") {
    const status = document.getElementById("location-status");
    if (!status) return;
    status.textContent = message;
    status.className = `location-status ${type}`;
}

function updateLocationField(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function updateOsmLink(lat, lon) {
    const link = document.getElementById("osm-link");
    if (!link) return;
    link.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
}

async function reverseGeocode(lat, lon) {
    const url = new URL(NOMINATIM_REVERSE_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lon);

    const response = await fetch(url.toString(), {
        headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
        throw new Error(`Location lookup failed (${response.status})`);
    }

    return response.json();
}

async function renderLocation(position) {
    const { latitude, longitude, accuracy } = position.coords;
    const lat = latitude.toFixed(6);
    const lon = longitude.toFixed(6);

    currentLocationData = {
        latitude,
        longitude,
        accuracyMeters: Math.round(accuracy),
        provider: "OpenStreetMap Nominatim",
        capturedAt: new Date().toISOString()
    };

    updateLocationField("location-lat", lat);
    updateLocationField("location-lon", lon);
    updateLocationField("location-accuracy", `${Math.round(accuracy)} m`);
    updateOsmLink(lat, lon);
    setLocationStatus("Coordinates loaded. Looking up nearest address...", "loading");

    try {
        const data = await reverseGeocode(lat, lon);
        const address = data.display_name || "Address not found for this point.";
        currentLocationData.address = address;

        const addressEl = document.getElementById("location-address");
        if (addressEl) addressEl.textContent = address;
        setLocationStatus("Location loaded successfully.", "success");
    } catch (error) {
        const addressEl = document.getElementById("location-address");
        if (addressEl) {
            addressEl.textContent = "Coordinates loaded, but address lookup is unavailable.";
        }
        setLocationStatus(error.message, "error");
    }
}

function getCurrentLocation() {
    if (!("geolocation" in navigator)) {
        setLocationStatus("Geolocation is not supported by this browser.", "error");
        return;
    }

    setLocationStatus("Requesting location permission...", "loading");

    navigator.geolocation.getCurrentPosition(
        position => { renderLocation(position); },
        error => {
            const messages = {
                1: "Location permission was denied.",
                2: "Location is unavailable right now.",
                3: "Location request timed out."
            };
            setLocationStatus(messages[error.code] || error.message, "error");
        },
        {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 60000
        }
    );
}

function clearLocation() {
    currentLocationData = null;
    updateLocationField("location-lat", "-");
    updateLocationField("location-lon", "-");
    updateLocationField("location-accuracy", "-");

    const addressEl = document.getElementById("location-address");
    if (addressEl) addressEl.textContent = "Waiting for location data.";

    const link = document.getElementById("osm-link");
    if (link) link.href = "https://www.openstreetmap.org/";

    setLocationStatus("Location not loaded yet.");
}

window.getCurrentLocation = getCurrentLocation;
window.clearLocation = clearLocation;

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll(".section").forEach(s => {
        s.classList.remove("active");
    });

    // Deactivate all nav buttons
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    // Show target section
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add("active");

        // Re-render charts if needed (fixes canvas sizing)
        if (sectionId === "dashboard") {
            setTimeout(() => renderChart(), 100);
        }
        if (sectionId === "report") {
            setTimeout(() => {
                const data = ROAD_DATA.map(road => ({
                    ...road,
                    tviScore: calculateTVI(
                        road.trafficDensity, road.altRoutes,
                        road.roadWidth, road.critical
                    )
                })).sort((a, b) => b.tviScore - a.tviScore);
                renderRadarChart(data);
            }, 100);
        }
    }

    // Activate matching nav button
    const buttons = document.querySelectorAll(".nav-btn");
    buttons.forEach(btn => {
        if (btn.getAttribute("onclick")?.includes(sectionId)) {
            btn.classList.add("active");
        }
    });
}

// ─────────────────────────────────────────────────────────────
//  KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
    if (e.ctrlKey) {
        switch (e.key) {
            case "1": e.preventDefault(); showSection("dashboard");  break;
            case "2": e.preventDefault(); showSection("analysis");   break;
            case "3": e.preventDefault(); showSection("simulation"); break;
            case "4": e.preventDefault(); showSection("location");   break;
            case "5": e.preventDefault(); showSection("report");     break;
        }
    }
});

// ─────────────────────────────────────────────────────────────
//  CONSOLE WELCOME
// ─────────────────────────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════════╗
║  🚦 TRAFFIC CONGESTION VULNERABILITY SYSTEM  ║
║                                              ║
║  Member 1: Data & Road Network Engineer      ║
║  Member 2: Vulnerability Analysis Engineer   ║
║  Member 3: Simulation & Visualization Eng.   ║
║                                              ║
║  Keyboard: Ctrl+1/2/3/4/5 to switch sections ║
╚══════════════════════════════════════════════╝
`);
