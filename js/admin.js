/* =========================================================
   MAPL SALES ANALYSIS SYSTEM
   ADMIN DASHBOARD ENGINE
   Supabase + Chart.js
   ========================================================= */

/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let allDivisions = [];
let salesData = [];

let salesTrendChart = null;
let targetActualChart = null;
let monthlyChart = null;


/* =========================================================
   DIVISION ORDER
   IMPORTANT:
   DO NOT CHANGE THIS ORDER
   ========================================================= */

const divisionOrder = [
    "Dhaka",
    "Mymensingh",
    "Chittagong",
    "Sylhet",
    "Khulna",
    "Barishal",
    "Rajshahi",
    "Rangpur"
];


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    try {

        await checkAuthentication();

        await initializeDashboard();

    } catch (error) {

        console.error("Initialization Error:", error);

        showError(
            error.message || "Failed to initialize dashboard."
        );
    }

});


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function checkAuthentication() {

    const {
        data: {
            session
        },
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        throw error;
    }

    if (!session) {

        window.location.href = "login.html";

        return;
    }

    currentUser = session.user;

    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

    if (profileError) {
        throw profileError;
    }

    if (!profile) {

        await supabaseClient.auth.signOut();

        window.location.href = "login.html";

        return;
    }

    if (
        !["admin", "manager", "viewer"]
            .includes(profile.role)
    ) {

        await supabaseClient.auth.signOut();

        window.location.href = "login.html";

        return;
    }

    currentProfile = profile;
}


/* =========================================================
   INITIALIZE DASHBOARD
   ========================================================= */

async function initializeDashboard() {

    updateUserInformation();

    await loadDivisions();

    setDefaultDates();

    setDefaultSaleDate();

    setupEventListeners();

    await loadSales();

}


/* =========================================================
   USER INFORMATION
   ========================================================= */

function updateUserInformation() {

    const userNameElements = [
        document.getElementById("userName"),
        document.getElementById("profileName"),
        document.getElementById("adminName")
    ];

    userNameElements.forEach(element => {

        if (element) {

            element.textContent =
                currentProfile?.full_name ||
                currentUser?.email ||
                "User";
        }

    });


    const roleElements = [
        document.getElementById("userRole"),
        document.getElementById("profileRole"),
        document.getElementById("adminRole")
    ];

    roleElements.forEach(element => {

        if (element) {

            element.textContent =
                capitalize(
                    currentProfile?.role || "viewer"
                );
        }

    });

}


/* =========================================================
   LOAD DIVISIONS
   ========================================================= */

async function loadDivisions() {

    const {
        data,
        error
    } = await supabaseClient
        .from("divisions")
        .select("*")
        .eq("active", true);

    if (error) {
        throw error;
    }

    allDivisions = (data || []).sort((a, b) => {

        const aIndex =
            divisionOrder.indexOf(a.division_name);

        const bIndex =
            divisionOrder.indexOf(b.division_name);

        return (
            (aIndex === -1 ? 999 : aIndex) -
            (bIndex === -1 ? 999 : bIndex)
        );

    });


    populateDivisionFilter();

    populateSalesDivisionSelect();
}


/* =========================================================
   DIVISION FILTER
   ========================================================= */

function populateDivisionFilter() {

    const select =
        document.getElementById("divisionFilter");

    if (!select) return;

    select.innerHTML = `
        <option value="">All Divisions</option>
    `;

    allDivisions.forEach(division => {

        const option =
            document.createElement("option");

        option.value = division.id;

        option.textContent =
            division.division_name;

        select.appendChild(option);

    });

}


/* =========================================================
   SALES ENTRY DIVISION SELECT
   ========================================================= */

function populateSalesDivisionSelect() {

    const select =
        document.getElementById("saleDivision");

    if (!select) return;

    select.innerHTML = `
        <option value="">Select Division</option>
    `;

    allDivisions.forEach(division => {

        const option =
            document.createElement("option");

        option.value = division.id;

        option.textContent =
            division.division_name;

        select.appendChild(option);

    });

}


/* =========================================================
   DEFAULT DATE FILTER
   ========================================================= */

function setDefaultDates() {

    const fromDate =
        document.getElementById("fromDate");

    const toDate =
        document.getElementById("toDate");

    if (!fromDate || !toDate) return;

    const today = new Date();

    const firstDay =
        new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );

    fromDate.value =
        formatInputDate(firstDay);

    toDate.value =
        formatInputDate(today);

}


/* =========================================================
   DEFAULT SALES DATE
   ========================================================= */

function setDefaultSaleDate() {

    const input =
        document.getElementById("saleDate");

    if (!input) return;

    input.value =
        formatInputDate(new Date());

}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

    const filterButton =
        document.getElementById("applyFilter");

    if (filterButton) {

        filterButton.addEventListener(
            "click",
            async () => {

                await loadSales();

            }
        );

    }


    const salesForm =
        document.getElementById("salesForm");

    if (salesForm) {

        salesForm.addEventListener(
            "submit",
            saveSale
        );

    }


    const cancelEditButton =
        document.getElementById("cancelEditBtn");

    if (cancelEditButton) {

        cancelEditButton.addEventListener(
            "click",
            resetSalesForm
        );

    }


    const exportButton =
        document.getElementById("exportCSV");

    if (exportButton) {

        exportButton.addEventListener(
            "click",
            exportSalesCSV
        );

    }


    const logoutButton =
        document.getElementById("logoutBtn");

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logout
        );

    }

}


/* =========================================================
   LOAD SALES
   ========================================================= */

async function loadSales() {

    try {

        let query =
            supabaseClient
                .from("sales")
                .select(`
                    id,
                    sale_date,
                    sales_amount,
                    division_id,
                    remarks,
                    created_by,
                    created_at,
                    updated_at,
                    divisions (
                        division_name,
                        monthly_target
                    )
                `)
                .order(
                    "sale_date",
                    {
                        ascending: true
                    }
                );


        const fromDate =
            document.getElementById("fromDate")?.value;

        const toDate =
            document.getElementById("toDate")?.value;

        const divisionId =
            document.getElementById("divisionFilter")?.value;


        if (fromDate) {

            query =
                query.gte(
                    "sale_date",
                    fromDate
                );

        }


        if (toDate) {

            query =
                query.lte(
                    "sale_date",
                    toDate
                );

        }


        if (divisionId) {

            query =
                query.eq(
                    "division_id",
                    divisionId
                );

        }


        const {
            data,
            error
        } = await query;


        if (error) {
            throw error;
        }


        salesData = data || [];


        updateDashboard();


    } catch (error) {

        console.error(
            "Load Sales Error:",
            error
        );

        showError(
            error.message ||
            "Failed to load sales data."
        );

    }

}


/* =========================================================
   UPDATE ENTIRE DASHBOARD
   ========================================================= */

function updateDashboard() {

    updateKPIs();

    renderTargetProgress();

    renderSalesTrend();

    renderTargetActual();

    renderMonthlyComparison();

    renderDivisionPerformance();

    renderDateDivisionComparison();

    renderWorkingDayAnalysis();

    renderManagementInsights();

    renderSalesTable();

}


/* =========================================================
   KPI
   ========================================================= */

function updateKPIs() {

    const totalSales =
        salesData.reduce(
            (sum, sale) =>
                sum +
                Number(sale.sales_amount || 0),
            0
        );


    const totalTarget =
        getTotalTarget();


    const achievement =
        totalTarget > 0
            ? (totalSales / totalTarget) * 100
            : 0;


    const remaining =
        Math.max(
            totalTarget - totalSales,
            0
        );


    const totalSalesElement =
        document.getElementById("totalSales");

    const totalTargetElement =
        document.getElementById("totalTarget");

    const achievementElement =
        document.getElementById("achievement");

    const remainingElement =
        document.getElementById("remaining");


    if (totalSalesElement) {

        totalSalesElement.textContent =
            formatCurrency(totalSales);

    }


    if (totalTargetElement) {

        totalTargetElement.textContent =
            formatCurrency(totalTarget);

    }


    if (achievementElement) {

        achievementElement.textContent =
            achievement.toFixed(2) + "%";

    }


    if (remainingElement) {

        remainingElement.textContent =
            formatCurrency(remaining);

    }

}


/* =========================================================
   GET TOTAL TARGET
   ========================================================= */

function getTotalTarget() {

    const selectedDivision =
        document.getElementById(
            "divisionFilter"
        )?.value;


    if (selectedDivision) {

        const division =
            allDivisions.find(
                item =>
                    item.id === selectedDivision
            );

        return Number(
            division?.monthly_target || 0
        );

    }


    return allDivisions.reduce(
        (sum, division) =>
            sum +
            Number(
                division.monthly_target || 0
            ),
        0
    );

}


/* =========================================================
   TARGET PROGRESS
   ========================================================= */

function renderTargetProgress() {

    const totalSales =
        salesData.reduce(
            (sum, sale) =>
                sum +
                Number(sale.sales_amount || 0),
            0
        );


    const target =
        getTotalTarget();


    const percentage =
        target > 0
            ? Math.min(
                (totalSales / target) * 100,
                100
            )
            : 0;


    const progressBar =
        document.getElementById(
            "targetProgress"
        );

    const progressText =
        document.getElementById(
            "progressPercent"
        );


    if (progressBar) {

        progressBar.style.width =
            percentage + "%";

    }


    if (progressText) {

        progressText.textContent =
            percentage.toFixed(2) + "%";

    }

}


/* =========================================================
   SALES TREND
   ========================================================= */

function renderSalesTrend() {

    const canvas =
        document.getElementById(
            "salesTrendChart"
        );

    if (!canvas) return;


    const dailySales = {};


    salesData.forEach(sale => {

        const date =
            sale.sale_date;

        if (!dailySales[date]) {

            dailySales[date] = 0;

        }

        dailySales[date] +=
            Number(
                sale.sales_amount || 0
            );

    });


    const labels =
        Object.keys(dailySales).sort();


    const values =
        labels.map(
            date =>
                dailySales[date]
        );


    if (salesTrendChart) {

        salesTrendChart.destroy();

    }


    salesTrendChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "line",

                data: {

                    labels,

                    datasets: [{

                        label:
                            "Daily Sales",

                        data: values,

                        tension: 0.35,

                        fill: false

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: true
                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback: value =>
                                    formatCurrency(value)

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   TARGET VS ACTUAL
   ========================================================= */

function renderTargetActual() {

    const canvas =
        document.getElementById(
            "targetActualChart"
        );

    if (!canvas) return;


    const totalSales =
        salesData.reduce(
            (sum, sale) =>
                sum +
                Number(sale.sales_amount || 0),
            0
        );


    const target =
        getTotalTarget();


    if (targetActualChart) {

        targetActualChart.destroy();

    }


    targetActualChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "bar",

                data: {

                    labels: [
                        "Target",
                        "Actual Sales"
                    ],

                    datasets: [{

                        label:
                            "Amount",

                        data: [
                            target,
                            totalSales
                        ]

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback: value =>
                                    formatCurrency(value)

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   MONTHLY COMPARISON
   ========================================================= */

function renderMonthlyComparison() {

    const canvas =
        document.getElementById(
            "monthlyChart"
        );

    if (!canvas) return;


    const monthlySales = {};


    salesData.forEach(sale => {

        const month =
            String(
                sale.sale_date
            ).slice(0, 7);


        if (!monthlySales[month]) {

            monthlySales[month] = 0;

        }


        monthlySales[month] +=
            Number(
                sale.sales_amount || 0
            );

    });


    const labels =
        Object.keys(monthlySales).sort();


    const values =
        labels.map(
            month =>
                monthlySales[month]
        );


    if (monthlyChart) {

        monthlyChart.destroy();

    }


    monthlyChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "bar",

                data: {

                    labels,

                    datasets: [{

                        label:
                            "Monthly Sales",

                        data: values

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback: value =>
                                    formatCurrency(value)

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   DIVISION PERFORMANCE
   ========================================================= */

function renderDivisionPerformance() {

    const container =
        document.getElementById(
            "divisionPerformance"
        );

    if (!container) return;


    const divisionData = {};


    allDivisions.forEach(division => {

        divisionData[division.id] = {

            name:
                division.division_name,

            sales: 0,

            target:
                Number(
                    division.monthly_target || 0
                )

        };

    });


    salesData.forEach(sale => {

        if (
            divisionData[sale.division_id]
        ) {

            divisionData[
                sale.division_id
            ].sales +=
                Number(
                    sale.sales_amount || 0
                );

        }

    });


    let html = `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>Division</th>

                        <th>Sales</th>

                        <th>Target</th>

                        <th>Achievement</th>

                        <th>Remaining</th>

                    </tr>

                </thead>

                <tbody>
    `;


    allDivisions.forEach(division => {

        const item =
            divisionData[division.id];


        const achievement =
            item.target > 0
                ? (
                    item.sales /
                    item.target
                ) * 100
                : 0;


        const remaining =
            Math.max(
                item.target -
                item.sales,
                0
            );


        html += `

            <tr>

                <td>
                    ${escapeHTML(item.name)}
                </td>

                <td>
                    ${formatCurrency(item.sales)}
                </td>

                <td>
                    ${formatCurrency(item.target)}
                </td>

                <td>
                    ${achievement.toFixed(2)}%
                </td>

                <td>
                    ${formatCurrency(remaining)}
                </td>

            </tr>

        `;

    });


    html += `

                </tbody>

            </table>

        </div>
    `;


    container.innerHTML = html;

}


/* =========================================================
   DATE-WISE DIVISION SALES COMPARISON
   ========================================================= */

function renderDateDivisionComparison() {

    const container =
        document.getElementById(
            "dateDivisionTable"
        );

    if (!container) return;


    const dates = [
        ...new Set(
            salesData.map(
                sale =>
                    sale.sale_date
            )
        )
    ].sort();


    if (dates.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No sales data available.
            </div>
        `;

        return;
    }


    let html = `

        <div class="table-wrapper">

            <table>

                <thead>

                    <tr>

                        <th>Date</th>
    `;


    /* EXACT DIVISION ORDER */

    allDivisions.forEach(division => {

        html += `
            <th>
                ${escapeHTML(
                    division.division_name
                )}
            </th>
        `;

    });


    html += `

                    </tr>

                </thead>

                <tbody>
    `;


    dates.forEach(date => {

        html += `

            <tr>

                <td>
                    ${formatDisplayDate(date)}
                </td>
        `;


        allDivisions.forEach(division => {

            const amount =
                salesData
                    .filter(
                        sale =>
                            sale.sale_date === date &&
                            sale.division_id === division.id
                    )
                    .reduce(
                        (sum, sale) =>
                            sum +
                            Number(
                                sale.sales_amount || 0
                            ),
                        0
                    );


            html += `

                <td>
                    ${formatCurrency(amount)}
                </td>

            `;

        });


        html += `

            </tr>

        `;

    });


    html += `

                </tbody>

            </table>

        </div>

    `;


    container.innerHTML = html;

}


/* =========================================================
   WORKING DAY ANALYSIS
   Friday = Weekly Holiday
   ========================================================= */

function renderWorkingDayAnalysis() {

    const container =
        document.getElementById(
            "workingDayAnalysis"
        );

    if (!container) return;


    const today =
        new Date();


    const year =
        today.getFullYear();

    const month =
        today.getMonth();


    const firstDay =
        new Date(
            year,
            month,
            1
        );


    const lastDay =
        new Date(
            year,
            month + 1,
            0
        );


    let workingDays = 0;


    for (
        let day = 1;
        day <= lastDay.getDate();
        day++
    ) {

        const date =
            new Date(
                year,
                month,
                day
            );


        /*
         * Friday = 5
         */

        if (
            date.getDay() !== 5
        ) {

            workingDays++;

        }

    }


    const completedDates =
        new Set(
            salesData.map(
                sale =>
                    sale.sale_date
            )
        );


    let completedDays = 0;


    completedDates.forEach(dateString => {

        const date =
            new Date(
                dateString + "T00:00:00"
            );


        if (
            date.getMonth() === month &&
            date.getFullYear() === year &&
            date.getDay() !== 5
        ) {

            completedDays++;

        }

    });


    const remainingDays =
        Math.max(
            workingDays -
            completedDays,
            0
        );


    const totalSales =
        salesData.reduce(
            (sum, sale) =>
                sum +
                Number(
                    sale.sales_amount || 0
                ),
            0
        );


    const target =
        getTotalTarget();


    const averagePerDay =
        completedDays > 0
            ? totalSales /
              completedDays
            : 0;


    const requiredPerDay =
        remainingDays > 0
            ? Math.max(
                target -
                totalSales,
                0
            ) /
            remainingDays
            : 0;


    const projectedSales =
        totalSales +
        (
            averagePerDay *
            remainingDays
        );


    container.innerHTML = `

        <div class="analysis-grid">

            <div class="analysis-card">

                <span>
                    Working Days
                </span>

                <strong>
                    ${workingDays}
                </strong>

            </div>


            <div class="analysis-card">

                <span>
                    Completed Days
                </span>

                <strong>
                    ${completedDays}
                </strong>

            </div>


            <div class="analysis-card">

                <span>
                    Remaining Days
                </span>

                <strong>
                    ${remainingDays}
                </strong>

            </div>


            <div class="analysis-card">

                <span>
                    Average Sales / Day
                </span>

                <strong>
                    ${formatCurrency(
                        averagePerDay
                    )}
                </strong>

            </div>


            <div class="analysis-card">

                <span>
                    Required / Remaining Day
                </span>

                <strong>
                    ${formatCurrency(
                        requiredPerDay
                    )}
                </strong>

            </div>


            <div class="analysis-card">

                <span>
                    Projected Month-End
                </span>

                <strong>
                    ${formatCurrency(
                        projectedSales
                    )}
                </strong>

            </div>

        </div>

    `;

}


/* =========================================================
   MANAGEMENT INSIGHTS
   ========================================================= */

function renderManagementInsights() {

    const container =
        document.getElementById(
            "managementInsights"
        );

    if (!container) return;


    const totalSales =
        salesData.reduce(
            (sum, sale) =>
                sum +
                Number(
                    sale.sales_amount || 0
                ),
            0
        );


    const target =
        getTotalTarget();


    const achievement =
        target > 0
            ? (
                totalSales /
                target
            ) * 100
            : 0;


    const remaining =
        Math.max(
            target -
            totalSales,
            0
        );


    let html = `

        <div class="insights-list">

            <div class="insight-item">

                <strong>
                    Target Status
                </strong>

                <span>
                    ${achievement.toFixed(2)}%
                    achieved
                </span>

            </div>


            <div class="insight-item">

                <strong>
                    Remaining Target
                </strong>

                <span>
                    ${formatCurrency(
                        remaining
                    )}
                </span>

            </div>

    `;


    allDivisions.forEach(division => {

        const divisionSales =
            salesData
                .filter(
                    sale =>
                        sale.division_id ===
                        division.id
                )
                .reduce(
                    (sum, sale) =>
                        sum +
                        Number(
                            sale.sales_amount || 0
                        ),
                    0
                );


        const divisionTarget =
            Number(
                division.monthly_target || 0
            );


        const divisionAchievement =
            divisionTarget > 0
                ? (
                    divisionSales /
                    divisionTarget
                ) * 100
                : 0;


        if (
            divisionTarget > 0 &&
            divisionAchievement < 70
        ) {

            html += `

                <div class="insight-item">

                    <strong>
                        Attention:
                        ${escapeHTML(
                            division.division_name
                        )}
                    </strong>

                    <span>
                        Achievement
                        ${divisionAchievement.toFixed(2)}%
                    </span>

                </div>

            `;

        }

    });


    html += `

        </div>
    `;


    container.innerHTML = html;

}


/* =========================================================
   SALES TABLE
   ========================================================= */

function renderSalesTable() {

    const tbody =
        document.getElementById(
            "salesTableBody"
        );

    if (!tbody) return;


    if (
        !salesData ||
        salesData.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    style="text-align:center;"
                >
                    No sales records found.
                </td>

            </tr>

        `;

        return;
    }


    /*
     * Newest date first
     */

    const sortedSales =
        [...salesData].sort(
            (a, b) =>
                new Date(b.sale_date) -
                new Date(a.sale_date)
        );


    tbody.innerHTML =
        sortedSales.map(sale => {

            const divisionName =
                sale.divisions?.division_name ||
                getDivisionName(
                    sale.division_id
                );


            return `

                <tr>

                    <td>
                        ${formatDisplayDate(
                            sale.sale_date
                        )}
                    </td>


                    <td>
                        ${formatCurrency(
                            sale.sales_amount
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            divisionName
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            sale.remarks || "-"
                        )}
                    </td>


                    <td>
                        ${
                            sale.created_at
                                ? new Date(
                                    sale.created_at
                                ).toLocaleString(
                                    "en-BD"
                                )
                                : "-"
                        }
                    </td>


                    <td>

                        <div class="table-actions">

                            <button
                                type="button"
                                class="btn-edit"
                                onclick="editSale('${sale.id}')"
                            >
                                Edit
                            </button>


                            <button
                                type="button"
                                class="btn-delete"
                                onclick="deleteSale('${sale.id}')"
                            >
                                Delete
                            </button>

                        </div>

                    </td>

                </tr>

            `;

        }).join("");

}


/* =========================================================
   SAVE / UPDATE SALE
   ========================================================= */

async function saveSale(event) {

    event.preventDefault();


    const saleId =
        document.getElementById(
            "saleId"
        )?.value;


    const saleDate =
        document.getElementById(
            "saleDate"
        )?.value;


    const divisionId =
        document.getElementById(
            "saleDivision"
        )?.value;


    const salesAmount =
        Number(
            document.getElementById(
                "salesAmount"
            )?.value || 0
        );


    const remarks =
        document.getElementById(
            "salesRemarks"
        )?.value.trim();


    const message =
        document.getElementById(
            "salesFormMessage"
        );


    const button =
        document.getElementById(
            "saveSaleBtn"
        );


    if (
        !saleDate ||
        !divisionId ||
        salesAmount <= 0
    ) {

        if (message) {

            message.innerHTML = `

                <div class="error-message">

                    Please enter Date,
                    Division and Sales Amount.

                </div>

            `;

        }

        return;
    }


    try {

        if (button) {

            button.disabled = true;

            button.textContent =
                saleId
                    ? "Updating..."
                    : "Saving...";

        }


        const {
            data: {
                user
            }
        } =
            await supabaseClient
                .auth
                .getUser();


        if (!user) {

            throw new Error(
                "User session expired."
            );

        }


        const payload = {

            sale_date:
                saleDate,

            sales_amount:
                salesAmount,

            division_id:
                divisionId,

            remarks:
                remarks || null,

            updated_at:
                new Date().toISOString()

        };


        let result;


        /* UPDATE */

        if (saleId) {

            result =
                await supabaseClient
                    .from("sales")
                    .update(payload)
                    .eq("id", saleId);


        }

        /* INSERT */

        else {

            payload.created_by =
                user.id;


            result =
                await supabaseClient
                    .from("sales")
                    .insert([
                        payload
                    ]);

        }


        if (result.error) {

            throw result.error;

        }


        /* AUDIT LOG */

        await supabaseClient
            .from("audit_logs")
            .insert([{

                user_id:
                    user.id,

                action:
                    saleId
                        ? "UPDATE"
                        : "INSERT",

                table_name:
                    "sales",

                record_id:
                    saleId || null,

                details: {

                    sale_date:
                        saleDate,

                    sales_amount:
                        salesAmount,

                    division_id:
                        divisionId,

                    remarks:
                        remarks || null

                }

            }]);


        if (message) {

            message.innerHTML = `

                <div class="success-message">

                    ${
                        saleId
                            ? "Sales record updated successfully."
                            : "Sales record saved successfully."
                    }

                </div>

            `;

        }


        resetSalesForm();


        await loadSales();


    } catch (error) {

        console.error(
            "Save Sale Error:",
            error
        );


        if (message) {

            message.innerHTML = `

                <div class="error-message">

                    ${escapeHTML(
                        error.message ||
                        "Failed to save sales."
                    )}

                </div>

            `;

        }


    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "Save Sales";

        }

    }

}


/* =========================================================
   EDIT SALE
   ========================================================= */

function editSale(id) {

    const sale =
        salesData.find(
            item =>
                item.id === id
        );


    if (!sale) {

        showError(
            "Sales record not found."
        );

        return;
    }


    const saleId =
        document.getElementById(
            "saleId"
        );

    const saleDate =
        document.getElementById(
            "saleDate"
        );

    const saleDivision =
        document.getElementById(
            "saleDivision"
        );

    const salesAmount =
        document.getElementById(
            "salesAmount"
        );

    const salesRemarks =
        document.getElementById(
            "salesRemarks"
        );

    const saveButton =
        document.getElementById(
            "saveSaleBtn"
        );

    const cancelButton =
        document.getElementById(
            "cancelEditBtn"
        );


    if (saleId) {

        saleId.value =
            sale.id;

    }


    if (saleDate) {

        saleDate.value =
            sale.sale_date;

    }


    if (saleDivision) {

        saleDivision.value =
            sale.division_id;

    }


    if (salesAmount) {

        salesAmount.value =
            sale.sales_amount;

    }


    if (salesRemarks) {

        salesRemarks.value =
            sale.remarks || "";

    }


    if (saveButton) {

        saveButton.textContent =
            "Update Sales";

    }


    if (cancelButton) {

        cancelButton.style.display =
            "inline-flex";

    }


    const section =
        document.getElementById(
            "salesEntrySection"
        );


    if (section) {

        section.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });

    }

}


/* =========================================================
   DELETE SALE
   ========================================================= */

async function deleteSale(id) {

    const sale =
        salesData.find(
            item =>
                item.id === id
        );


    if (!sale) {

        showError(
            "Sales record not found."
        );

        return;
    }


    const confirmed =
        confirm(
            `Are you sure you want to delete this sales record?\n\n` +
            `Date: ${sale.sale_date}\n` +
            `Sales: ${formatCurrency(
                sale.sales_amount
            )}`
        );


    if (!confirmed) return;


    try {

        const {
            data: {
                user
            }
        } =
            await supabaseClient
                .auth
                .getUser();


        if (!user) {

            throw new Error(
                "User session expired."
            );

        }


        const {
            error
        } =
            await supabaseClient
                .from("sales")
                .delete()
                .eq("id", id);


        if (error) {

            throw error;

        }


        /* AUDIT LOG */

        await supabaseClient
            .from("audit_logs")
            .insert([{

                user_id:
                    user.id,

                action:
                    "DELETE",

                table_name:
                    "sales",

                record_id:
                    id,

                details: {

                    sale_date:
                        sale.sale_date,

                    sales_amount:
                        sale.sales_amount,

                    division_id:
                        sale.division_id,

                    remarks:
                        sale.remarks

                }

            }]);


        await loadSales();


    } catch (error) {

        console.error(
            "Delete Sale Error:",
            error
        );


        showError(
            error.message ||
            "Failed to delete sales record."
        );

    }

}


/* =========================================================
   RESET SALES FORM
   ========================================================= */

function resetSalesForm() {

    const form =
        document.getElementById(
            "salesForm"
        );

    if (form) {

        form.reset();

    }


    const saleId =
        document.getElementById(
            "saleId"
        );

    if (saleId) {

        saleId.value = "";

    }


    const saveButton =
        document.getElementById(
            "saveSaleBtn"
        );

    if (saveButton) {

        saveButton.textContent =
            "Save Sales";

    }


    const cancelButton =
        document.getElementById(
            "cancelEditBtn"
        );

    if (cancelButton) {

        cancelButton.style.display =
            "none";

    }


    const message =
        document.getElementById(
            "salesFormMessage"
        );

    if (message) {

        message.innerHTML = "";

    }


    setDefaultSaleDate();

}


/* =========================================================
   CSV EXPORT
   ========================================================= */

function exportSalesCSV() {

    if (
        !salesData ||
        salesData.length === 0
    ) {

        alert(
            "No sales data available to export."
        );

        return;
    }


    const headers = [

        "Date",

        "Sales Amount",

        "Division",

        "Remarks",

        "Entry Time"

    ];


    const rows =
        salesData.map(sale => [

            sale.sale_date,

            sale.sales_amount,

            sale.divisions?.division_name ||
                getDivisionName(
                    sale.division_id
                ),

            sale.remarks || "",

            sale.created_at
                ? new Date(
                    sale.created_at
                ).toLocaleString(
                    "en-BD"
                )
                : ""

        ]);


    const csvContent = [

        headers,

        ...rows

    ]

    .map(row =>

        row
            .map(value =>
                `"${String(value)
                    .replace(/"/g, '""')}"`
            )
            .join(",")

    )

    .join("\n");


    const blob =
        new Blob(
            [
                "\uFEFF" +
                csvContent
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;


    link.download =
        `MAPL_Sales_Report_${formatInputDate(
            new Date()
        )}.csv`;


    document.body.appendChild(
        link
    );


    link.click();


    document.body.removeChild(
        link
    );


    URL.revokeObjectURL(
        url
    );

}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

    try {

        await supabaseClient
            .auth
            .signOut();

        sessionStorage.clear();

        window.location.href =
            "login.html";

    } catch (error) {

        console.error(
            "Logout Error:",
            error
        );

    }

}


/* =========================================================
   GET DIVISION NAME
   ========================================================= */

function getDivisionName(id) {

    const division =
        allDivisions.find(
            item =>
                item.id === id
        );


    return (
        division?.division_name ||
        "Unknown"
    );

}


/* =========================================================
   CURRENCY FORMAT
   IMPORTANT:
   FULL VALUE ONLY
   NO MILLION / M / K
   ========================================================= */

function formatCurrency(value) {

    const number =
        Number(value || 0);


    return (
        "৳" +
        number.toLocaleString(
            "en-BD",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        )
    );

}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatInputDate(date) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


/* =========================================================
   DISPLAY DATE
   ========================================================= */

function formatDisplayDate(dateString) {

    if (!dateString) {
        return "-";
    }


    const parts =
        String(
            dateString
        ).split("-");


    if (parts.length !== 3) {

        return dateString;

    }


    return (
        parts[2] +
        "-" +
        parts[1] +
        "-" +
        parts[0]
    );

}


/* =========================================================
   CAPITALIZE
   ========================================================= */

function capitalize(text) {

    if (!text) return "";

    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   SHOW ERROR
   ========================================================= */

function showError(message) {

    console.error(
        message
    );


    const container =
        document.getElementById(
            "managementInsights"
        );


    if (!container) {

        alert(message);

        return;

    }


    container.innerHTML = `

        <div class="error-message">

            ${escapeHTML(
                message
            )}

        </div>

    `;

}
