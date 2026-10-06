/*
========================================================
 MAPL SALES ANALYSIS SYSTEM
 REPORTS MODULE
========================================================

 Supabase Tables:

 divisions
 - id
 - division_name
 - monthly_target
 - active

 sales
 - id
 - sale_date
 - sales_amount
 - division_id
 - remarks
 - created_by
 - created_at
 - updated_at

========================================================
*/


// ======================================================
// FIXED DIVISION ORDER
// ======================================================

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


// ======================================================
// GLOBAL VARIABLES
// ======================================================

let currentUser = null;
let currentProfile = null;

let divisions = [];
let salesData = [];

let filteredSales = [];

let reportFromDate = null;
let reportToDate = null;
let reportDivision = "";


// ======================================================
// PAGE LOAD
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        try {

            await checkAuthentication();

            setupEventListeners();

            await loadUserProfile();

            await loadDivisions();

            setDefaultDates();

            await generateReport();

        } catch (error) {

            console.error(
                "Reports Page Error:",
                error
            );

            showReportError(
                error.message ||
                "Unable to load reports."
            );

        }

    }
);


// ======================================================
// AUTHENTICATION
// ======================================================

async function checkAuthentication() {

    const {
        data,
        error
    } = await supabaseClient.auth.getSession();


    if (error) {

        throw error;

    }


    if (!data.session) {

        window.location.href =
            "login.html";

        return;

    }


    currentUser =
        data.session.user;

}


// ======================================================
// LOAD USER PROFILE
// ======================================================

async function loadUserProfile() {

    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();


    if (error) {

        console.error(
            "Profile Load Error:",
            error
        );

        return;

    }


    currentProfile = data;


    const userName =
        document.getElementById(
            "userName"
        );

    const userRole =
        document.getElementById(
            "userRole"
        );


    if (userName) {

        userName.textContent =
            data.full_name ||
            "Administrator";

    }


    if (userRole) {

        userRole.textContent =
            String(
                data.role ||
                "admin"
            ).toUpperCase();

    }

}


// ======================================================
// EVENT LISTENERS
// ======================================================

function setupEventListeners() {

    const applyButton =
        document.getElementById(
            "applyReportFilter"
        );


    if (applyButton) {

        applyButton.addEventListener(
            "click",
            generateReport
        );

    }


    const resetButton =
        document.getElementById(
            "resetReportFilter"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetFilters
        );

    }


    const exportButton =
        document.getElementById(
            "exportReportCSV"
        );


    if (exportButton) {

        exportButton.addEventListener(
            "click",
            exportReportCSV
        );

    }


    const logoutButton =
        document.getElementById(
            "logoutBtn"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logout
        );

    }

}


// ======================================================
// DEFAULT DATE
// ======================================================

function setDefaultDates() {

    const today =
        new Date();


    const firstDay =
        new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );


    const fromDate =
        document.getElementById(
            "fromDate"
        );


    const toDate =
        document.getElementById(
            "toDate"
        );


    if (fromDate) {

        fromDate.value =
            formatInputDate(
                firstDay
            );

    }


    if (toDate) {

        toDate.value =
            formatInputDate(
                today
            );

    }

}


// ======================================================
// LOAD DIVISIONS
// ======================================================

async function loadDivisions() {

    const {
        data,
        error
    } = await supabaseClient
        .from("divisions")
        .select(
            "id, division_name, monthly_target, active"
        )
        .eq(
            "active",
            true
        );


    if (error) {

        throw error;

    }


    divisions =
        data || [];


    sortDivisions();


    renderDivisionFilter();

}


// ======================================================
// SORT DIVISIONS
// ======================================================

function sortDivisions() {

    divisions.sort(
        function (a, b) {

            const aIndex =
                divisionOrder.indexOf(
                    a.division_name
                );


            const bIndex =
                divisionOrder.indexOf(
                    b.division_name
                );


            const safeA =
                aIndex === -1
                    ? 999
                    : aIndex;


            const safeB =
                bIndex === -1
                    ? 999
                    : bIndex;


            return safeA - safeB;

        }
    );

}


// ======================================================
// RENDER DIVISION FILTER
// ======================================================

function renderDivisionFilter() {

    const select =
        document.getElementById(
            "divisionFilter"
        );


    if (!select) {

        return;

    }


    select.innerHTML =
        '<option value="">All Divisions</option>';


    divisions.forEach(
        function (division) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                division.id;


            option.textContent =
                division.division_name;


            select.appendChild(
                option
            );

        }
    );

}


// ======================================================
// LOAD SALES
// ======================================================

async function loadSales() {

    const {
        data,
        error
    } = await supabaseClient
        .from("sales")
        .select(`
            id,
            sale_date,
            sales_amount,
            division_id,
            remarks,
            created_by,
            created_at
        `)
        .order(
            "sale_date",
            {
                ascending: true
            }
        );


    if (error) {

        throw error;

    }


    salesData =
        data || [];

}


// ======================================================
// GENERATE REPORT
// ======================================================

async function generateReport() {

    showLoadingState();


    try {

        await loadSales();


        const fromInput =
            document.getElementById(
                "fromDate"
            );


        const toInput =
            document.getElementById(
                "toDate"
            );


        const divisionInput =
            document.getElementById(
                "divisionFilter"
            );


        reportFromDate =
            fromInput
                ? fromInput.value
                : "";


        reportToDate =
            toInput
                ? toInput.value
                : "";


        reportDivision =
            divisionInput
                ? divisionInput.value
                : "";


        if (
            reportFromDate &&
            reportToDate &&
            reportFromDate >
            reportToDate
        ) {

            throw new Error(
                "From Date cannot be greater than To Date."
            );

        }


        filteredSales =
            salesData.filter(
                function (sale) {

                    const saleDate =
                        String(
                            sale.sale_date
                        );


                    if (
                        reportFromDate &&
                        saleDate <
                        reportFromDate
                    ) {

                        return false;

                    }


                    if (
                        reportToDate &&
                        saleDate >
                        reportToDate
                    ) {

                        return false;

                    }


                    if (
                        reportDivision &&
                        String(
                            sale.division_id
                        ) !==
                        String(
                            reportDivision
                        )
                    ) {

                        return false;

                    }


                    return true;

                }
            );


        updateReportPeriod();

        updateKPIs();

        renderDivisionReport();

        renderMonthlyReport();

        renderDailyReport();

        renderManagementSummary();


    } catch (error) {

        console.error(
            "Generate Report Error:",
            error
        );


        showReportError(
            error.message ||
            "Unable to generate report."
        );

    }

}


// ======================================================
// UPDATE REPORT PERIOD
// ======================================================

function updateReportPeriod() {

    const fromElement =
        document.getElementById(
            "reportFromDate"
        );


    const toElement =
        document.getElementById(
            "reportToDate"
        );


    const transactionElement =
        document.getElementById(
            "reportTransactions"
        );


    if (fromElement) {

        fromElement.textContent =
            formatDisplayDate(
                reportFromDate
            );

    }


    if (toElement) {

        toElement.textContent =
            formatDisplayDate(
                reportToDate
            );

    }


    if (transactionElement) {

        transactionElement.textContent =
            filteredSales.length.toLocaleString(
                "en-US"
            );

    }

}


// ======================================================
// UPDATE KPI
// ======================================================

function updateKPIs() {

    const totalSales =
        getTotalSales();


    const totalTarget =
        getTotalTarget();


    const achievement =
        totalTarget > 0
            ? (
                totalSales /
                totalTarget
            ) * 100
            : 0;


    const remaining =
        Math.max(
            totalTarget -
            totalSales,
            0
        );


    setText(
        "reportTotalSales",
        formatCurrency(
            totalSales
        )
    );


    setText(
        "reportTotalTarget",
        formatCurrency(
            totalTarget
        )
    );


    setText(
        "reportAchievement",
        achievement.toFixed(2) +
        "%"
    );


    setText(
        "reportRemaining",
        formatCurrency(
            remaining
        )
    );

}


// ======================================================
// TOTAL SALES
// ======================================================

function getTotalSales() {

    return filteredSales.reduce(
        function (total, sale) {

            return (
                total +
                Number(
                    sale.sales_amount ||
                    0
                )
            );

        },
        0
    );

}


// ======================================================
// TOTAL TARGET
// ======================================================

function getTotalTarget() {

    /*
        Current system uses one monthly target
        for the selected report period.

        If the report spans multiple months,
        the same monthly target is currently
        used for the report.
    */

    return divisions.reduce(
        function (total, division) {

            return (
                total +
                Number(
                    division.monthly_target ||
                    0
                )
            );

        },
        0
    );

}


// ======================================================
// DIVISION REPORT
// ======================================================

function renderDivisionReport() {

    const tbody =
        document.getElementById(
            "divisionReportBody"
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML = "";


    let visibleDivisions =
        divisions;


    if (reportDivision) {

        visibleDivisions =
            divisions.filter(
                function (division) {

                    return String(
                        division.id
                    ) ===
                    String(
                        reportDivision
                    );

                }
            );

    }


    if (
        visibleDivisions.length ===
        0
    ) {

        tbody.innerHTML =
            `
            <tr>
                <td
                    colspan="6"
                    style="text-align:center;"
                >
                    No division data found.
                </td>
            </tr>
            `;

        return;

    }


    visibleDivisions.forEach(
        function (
            division,
            index
        ) {

            const divisionSales =
                filteredSales
                    .filter(
                        function (sale) {

                            return String(
                                sale.division_id
                            ) ===
                            String(
                                division.id
                            );

                        }
                    )
                    .reduce(
                        function (
                            total,
                            sale
                        ) {

                            return (
                                total +
                                Number(
                                    sale.sales_amount ||
                                    0
                                )
                            );

                        },
                        0
                    );


            const target =
                Number(
                    division.monthly_target ||
                    0
                );


            const achievement =
                target > 0
                    ? (
                        divisionSales /
                        target
                    ) * 100
                    : 0;


            const remaining =
                Math.max(
                    target -
                    divisionSales,
                    0
                );


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML =
                `
                <td>
                    ${index + 1}
                </td>

                <td>
                    <strong>
                        ${escapeHTML(
                            division.division_name
                        )}
                    </strong>
                </td>

                <td>
                    ${formatCurrency(
                        divisionSales
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        target
                    )}
                </td>

                <td>

                    <span
                        class="achievement-badge"
                    >
                        ${achievement.toFixed(2)}%
                    </span>

                </td>

                <td>
                    ${formatCurrency(
                        remaining
                    )}
                </td>
                `;


            tbody.appendChild(
                row
            );

        }
    );

}


// ======================================================
// MONTHLY REPORT
// ======================================================

function renderMonthlyReport() {

    const tbody =
        document.getElementById(
            "monthlyReportBody"
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML = "";


    const monthlyMap =
        {};


    filteredSales.forEach(
        function (sale) {

            const date =
                new Date(
                    sale.sale_date +
                    "T00:00:00"
                );


            const year =
                date.getFullYear();


            const month =
                date.getMonth();


            const key =
                year +
                "-" +
                String(
                    month + 1
                ).padStart(
                    2,
                    "0"
                );


            if (
                !monthlyMap[key]
            ) {

                monthlyMap[key] = {

                    year:
                        year,

                    month:
                        month,

                    sales:
                        0,

                    transactions:
                        0

                };

            }


            monthlyMap[key].sales +=
                Number(
                    sale.sales_amount ||
                    0
                );


            monthlyMap[key].transactions++;

        }
    );


    const months =
        Object.values(
            monthlyMap
        ).sort(
            function (a, b) {

                if (
                    a.year !==
                    b.year
                ) {

                    return (
                        a.year -
                        b.year
                    );

                }


                return (
                    a.month -
                    b.month
                );

            }
        );


    if (
        months.length ===
        0
    ) {

        tbody.innerHTML =
            `
            <tr>
                <td
                    colspan="5"
                    style="text-align:center;"
                >
                    No monthly sales data found.
                </td>
            </tr>
            `;

        return;

    }


    months.forEach(
        function (
            item,
            index
        ) {

            const average =
                item.transactions >
                0
                    ? (
                        item.sales /
                        item.transactions
                    )
                    : 0;


            const monthName =
                new Date(
                    item.year,
                    item.month,
                    1
                ).toLocaleString(
                    "en-US",
                    {
                        month:
                            "long",
                        year:
                            "numeric"
                    }
                );


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML =
                `
                <td>
                    ${index + 1}
                </td>

                <td>
                    <strong>
                        ${monthName}
                    </strong>
                </td>

                <td>
                    ${formatCurrency(
                        item.sales
                    )}
                </td>

                <td>
                    ${item.transactions.toLocaleString(
                        "en-US"
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        average
                    )}
                </td>
                `;


            tbody.appendChild(
                row
            );

        }
    );

}


// ======================================================
// DAILY REPORT
// ======================================================

function renderDailyReport() {

    const tbody =
        document.getElementById(
            "dailyReportBody"
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML = "";


    const dailyMap =
        {};


    filteredSales.forEach(
        function (sale) {

            const date =
                String(
                    sale.sale_date
                );


            if (
                !dailyMap[date]
            ) {

                dailyMap[date] = {

                    sales:
                        0,

                    transactions:
                        0

                };

            }


            dailyMap[date].sales +=
                Number(
                    sale.sales_amount ||
                    0
                );


            dailyMap[date].transactions++;

        }
    );


    const dates =
        Object.keys(
            dailyMap
        ).sort();


    if (
        dates.length ===
        0
    ) {

        tbody.innerHTML =
            `
            <tr>
                <td
                    colspan="5"
                    style="text-align:center;"
                >
                    No daily sales data found.
                </td>
            </tr>
            `;

        return;

    }


    dates.reverse();


    dates.forEach(
        function (
            date,
            index
        ) {

            const item =
                dailyMap[date];


            const average =
                item.transactions >
                0
                    ? (
                        item.sales /
                        item.transactions
                    )
                    : 0;


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML =
                `
                <td>
                    ${index + 1}
                </td>

                <td>
                    <strong>
                        ${formatDisplayDate(
                            date
                        )}
                    </strong>
                </td>

                <td>
                    ${formatCurrency(
                        item.sales
                    )}
                </td>

                <td>
                    ${item.transactions.toLocaleString(
                        "en-US"
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        average
                    )}
                </td>
                `;


            tbody.appendChild(
                row
            );

        }
    );

}


// ======================================================
// MANAGEMENT SUMMARY
// ======================================================

function renderManagementSummary() {

    const container =
        document.getElementById(
            "managementSummary"
        );


    if (!container) {

        return;

    }


    const totalSales =
        getTotalSales();


    const totalTarget =
        getTotalTarget();


    const achievement =
        totalTarget > 0
            ? (
                totalSales /
                totalTarget
            ) * 100
            : 0;


    const transactionCount =
        filteredSales.length;


    let highestDivision =
        null;


    let highestSales =
        0;


    divisions.forEach(
        function (division) {

            const divisionSales =
                filteredSales
                    .filter(
                        function (sale) {

                            return String(
                                sale.division_id
                            ) ===
                            String(
                                division.id
                            );

                        }
                    )
                    .reduce(
                        function (
                            total,
                            sale
                        ) {

                            return (
                                total +
                                Number(
                                    sale.sales_amount ||
                                    0
                                )
                            );

                        },
                        0
                    );


            if (
                divisionSales >
                highestSales
            ) {

                highestSales =
                    divisionSales;

                highestDivision =
                    division.division_name;

            }

        }
    );


    const averageTransaction =
        transactionCount > 0
            ? (
                totalSales /
                transactionCount
            )
            : 0;


    container.innerHTML =
        `
        <p>
            <strong>Report Summary:</strong>
            The selected period contains
            <strong>
                ${transactionCount.toLocaleString(
                    "en-US"
                )}
            </strong>
            sales transaction(s) with total sales of
            <strong>
                ${formatCurrency(
                    totalSales
                )}
            </strong>.
        </p>

        <p>
            Total monthly target represented in this report is
            <strong>
                ${formatCurrency(
                    totalTarget
                )}
            </strong>,
            resulting in an achievement of
            <strong>
                ${achievement.toFixed(2)}%
            </strong>.
        </p>

        <p>
            Average transaction value is
            <strong>
                ${formatCurrency(
                    averageTransaction
                )}
            </strong>.
        </p>

        ${
            highestDivision
                ? `
                <p>
                    Highest sales during the selected period:
                    <strong>
                        ${escapeHTML(
                            highestDivision
                        )}
                    </strong>
                    with
                    <strong>
                        ${formatCurrency(
                            highestSales
                        )}
                    </strong>.
                </p>
                `
                : `
                <p>
                    No division sales data is available
                    for the selected period.
                </p>
                `
        }
        `;

}


// ======================================================
// RESET FILTER
// ======================================================

async function resetFilters() {

    const divisionFilter =
        document.getElementById(
            "divisionFilter"
        );


    if (divisionFilter) {

        divisionFilter.value = "";

    }


    setDefaultDates();


    await generateReport();

}


// ======================================================
// EXPORT CSV
// ======================================================

function exportReportCSV() {

    if (
        filteredSales.length ===
        0
    ) {

        alert(
            "There is no sales data to export."
        );

        return;

    }


    const rows = [];


    rows.push([
        "Date",
        "Division",
        "Sales Amount",
        "Remarks"
    ]);


    filteredSales.forEach(
        function (sale) {

            const division =
                divisions.find(
                    function (item) {

                        return String(
                            item.id
                        ) ===
                        String(
                            sale.division_id
                        );

                    }
                );


            rows.push([
                sale.sale_date || "",
                division
                    ? division.division_name
                    : "Unknown",
                Number(
                    sale.sales_amount ||
                    0
                ),
                sale.remarks || ""
            ]);

        }
    );


    const csv =
        rows
            .map(
                function (row) {

                    return row
                        .map(
                            function (value) {

                                return csvEscape(
                                    value
                                );

                            }
                        )
                        .join(",");

                }
            )
            .join("\n");


    const blob =
        new Blob(
            [
                "\uFEFF" +
                csv
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        "MAPL_Sales_Report_" +
        getTodayString() +
        ".csv";


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


// ======================================================
// CSV ESCAPE
// ======================================================

function csvEscape(value) {

    const stringValue =
        String(
            value ?? ""
        );


    if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
    ) {

        return (
            '"' +
            stringValue.replace(
                /"/g,
                '""'
            ) +
            '"'
        );

    }


    return stringValue;

}


// ======================================================
// LOGOUT
// ======================================================

async function logout() {

    try {

        await supabaseClient.auth.signOut();

    } catch (error) {

        console.error(
            "Logout Error:",
            error
        );

    }


    window.location.href =
        "login.html";

}


// ======================================================
// LOADING STATE
// ======================================================

function showLoadingState() {

    const ids = [

        "reportTotalSales",
        "reportTotalTarget",
        "reportAchievement",
        "reportRemaining"

    ];


    ids.forEach(
        function (id) {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.textContent =
                    "Loading...";

            }

        }
    );

}


// ======================================================
// ERROR MESSAGE
// ======================================================

function showReportError(
    message
) {

    const summary =
        document.getElementById(
            "managementSummary"
        );


    if (summary) {

        summary.innerHTML =
            `
            <p style="color:#b91c1c;">
                <strong>
                    Report Error:
                </strong>
                ${escapeHTML(
                    message
                )}
            </p>
            `;

    }

}


// ======================================================
// SET TEXT
// ======================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

}


// ======================================================
// CURRENCY FORMAT
// ======================================================

function formatCurrency(
    amount
) {

    return (
        "৳" +
        Number(
            amount || 0
        ).toLocaleString(
            "en-US",
            {
                minimumFractionDigits:
                    0,

                maximumFractionDigits:
                    2
            }
        )
    );

}


// ======================================================
// DATE FORMAT
// ======================================================

function formatDisplayDate(
    dateString
) {

    if (!dateString) {

        return "—";

    }


    const date =
        new Date(
            dateString +
            "T00:00:00"
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateString;

    }


    return date.toLocaleDateString(
        "en-GB",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"
        }
    );

}


// ======================================================
// INPUT DATE FORMAT
// ======================================================

function formatInputDate(
    date
) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );

}


// ======================================================
// TODAY
// ======================================================

function getTodayString() {

    return formatInputDate(
        new Date()
    );

}


// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
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