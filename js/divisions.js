/*
========================================================
 MAPL SALES ANALYSIS SYSTEM
 DIVISION PERFORMANCE MODULE
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
// GLOBAL DATA
// ======================================================

let currentUser = null;
let currentProfile = null;

let divisions = [];
let salesData = [];
let filteredSales = [];


// ======================================================
// PAGE LOAD
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        try {

            await checkAuthentication();

            setupEvents();

            await loadProfile();

            await loadDivisions();

            setDefaultDates();

            await generateReport();

        } catch (error) {

            console.error(
                "Division Page Error:",
                error
            );

            showError(
                error.message ||
                "Unable to load division data."
            );

        }

    }
);


// ======================================================
// AUTH
// ======================================================

async function checkAuthentication() {

    const {
        data,
        error
    } =
        await supabaseClient
            .auth
            .getSession();


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
// PROFILE
// ======================================================

async function loadProfile() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .single();


    if (error) {

        console.error(
            "Profile error:",
            error
        );

        return;

    }


    currentProfile =
        data;


    setText(
        "userName",
        data.full_name ||
        "Administrator"
    );


    setText(
        "userRole",
        String(
            data.role ||
            "admin"
        ).toUpperCase()
    );

}


// ======================================================
// EVENTS
// ======================================================

function setupEvents() {

    const apply =
        document.getElementById(
            "applyFilter"
        );


    if (apply) {

        apply.addEventListener(
            "click",
            generateReport
        );

    }


    const reset =
        document.getElementById(
            "resetFilter"
        );


    if (reset) {

        reset.addEventListener(
            "click",
            resetFilters
        );

    }


    const search =
        document.getElementById(
            "divisionSearch"
        );


    if (search) {

        search.addEventListener(
            "input",
            renderTable
        );

    }


    const exportButton =
        document.getElementById(
            "exportDivisionCSV"
        );


    if (exportButton) {

        exportButton.addEventListener(
            "click",
            exportCSV
        );

    }


    const logout =
        document.getElementById(
            "logoutBtn"
        );


    if (logout) {

        logout.addEventListener(
            "click",
            logoutUser
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


    const from =
        document.getElementById(
            "fromDate"
        );


    const to =
        document.getElementById(
            "toDate"
        );


    if (from) {

        from.value =
            formatInputDate(
                firstDay
            );

    }


    if (to) {

        to.value =
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
    } =
        await supabaseClient
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

}


// ======================================================
// SORT
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


            return (
                (aIndex === -1 ? 999 : aIndex) -
                (bIndex === -1 ? 999 : bIndex)
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
    } =
        await supabaseClient
            .from("sales")
            .select(`
                id,
                sale_date,
                sales_amount,
                division_id,
                remarks
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

    try {

        await loadSales();


        const from =
            document.getElementById(
                "fromDate"
            ).value;


        const to =
            document.getElementById(
                "toDate"
            ).value;


        if (
            from &&
            to &&
            from > to
        ) {

            throw new Error(
                "From Date cannot be greater than To Date."
            );

        }


        filteredSales =
            salesData.filter(
                function (sale) {

                    const date =
                        String(
                            sale.sale_date
                        );


                    if (
                        from &&
                        date < from
                    ) {

                        return false;

                    }


                    if (
                        to &&
                        date > to
                    ) {

                        return false;

                    }


                    return true;

                }
            );


        updateInformation(
            from,
            to
        );


        updateKPI();

        renderTable();

        renderSummary();


    } catch (error) {

        console.error(
            error
        );

        showError(
            error.message
        );

    }

}


// ======================================================
// UPDATE KPI
// ======================================================

function updateKPI() {

    const totalSales =
        filteredSales.reduce(
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


    const totalTarget =
        divisions.reduce(
            function (
                total,
                division
            ) {

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


    const achievement =
        totalTarget > 0
            ? (
                totalSales /
                totalTarget
            ) * 100
            : 0;


    setText(
        "divisionTotalSales",
        formatCurrency(
            totalSales
        )
    );


    setText(
        "divisionTotalTarget",
        formatCurrency(
            totalTarget
        )
    );


    setText(
        "divisionAchievement",
        achievement.toFixed(2) +
        "%"
    );


    setText(
        "activeDivisionCount",
        divisions.length
    );

}


// ======================================================
// RENDER TABLE
// ======================================================

function renderTable() {

    const tbody =
        document.getElementById(
            "divisionTableBody"
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML =
        "";


    const searchInput =
        document.getElementById(
            "divisionSearch"
        );


    const searchTerm =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const visible =
        divisions.filter(
            function (division) {

                if (!searchTerm) {

                    return true;

                }


                return division
                    .division_name
                    .toLowerCase()
                    .includes(
                        searchTerm
                    );

            }
        );


    if (
        visible.length ===
        0
    ) {

        tbody.innerHTML =
            `
            <tr>

                <td
                    colspan="8"
                    style="text-align:center;"
                >
                    No division found.
                </td>

            </tr>
            `;

        return;

    }


    visible.forEach(
        function (
            division,
            index
        ) {

            const sales =
                getDivisionSales(
                    division.id
                );


            const target =
                Number(
                    division.monthly_target ||
                    0
                );


            const achievement =
                target > 0
                    ? (
                        sales /
                        target
                    ) * 100
                    : 0;


            const remaining =
                Math.max(
                    target -
                    sales,
                    0
                );


            const transactions =
                filteredSales.filter(
                    function (sale) {

                        return String(
                            sale.division_id
                        ) ===
                        String(
                            division.id
                        );

                    }
                ).length;


            let status =
                "On Track";


            let statusClass =
                "on-track";


            if (
                achievement >=
                100
            ) {

                status =
                    "Achieved";

                statusClass =
                    "achieved";

            } else if (
                achievement < 50
            ) {

                status =
                    "Below Target";

                statusClass =
                    "below";

            }


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
                        sales
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        target
                    )}
                </td>

                <td>
                    <span
                        class="division-achievement"
                    >
                        ${achievement.toFixed(2)}%
                    </span>
                </td>

                <td>
                    ${formatCurrency(
                        remaining
                    )}
                </td>

                <td>
                    ${transactions.toLocaleString(
                        "en-US"
                    )}
                </td>

                <td>

                    <span
                        class="division-status ${statusClass}"
                    >
                        ${status}
                    </span>

                </td>
                `;


            tbody.appendChild(
                row
            );

        }
    );

}


// ======================================================
// GET DIVISION SALES
// ======================================================

function getDivisionSales(
    divisionId
) {

    return filteredSales
        .filter(
            function (sale) {

                return String(
                    sale.division_id
                ) ===
                String(
                    divisionId
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

}


// ======================================================
// SUMMARY
// ======================================================

function renderSummary() {

    const box =
        document.getElementById(
            "divisionSummary"
        );


    if (!box) {

        return;

    }


    let highestDivision =
        null;

    let highestSales =
        0;


    let achievedCount =
        0;


    divisions.forEach(
        function (division) {

            const sales =
                getDivisionSales(
                    division.id
                );


            const target =
                Number(
                    division.monthly_target ||
                    0
                );


            if (
                sales >
                highestSales
            ) {

                highestSales =
                    sales;

                highestDivision =
                    division.division_name;

            }


            if (
                target > 0 &&
                sales >= target
            ) {

                achievedCount++;

            }

        }
    );


    const totalSales =
        filteredSales.reduce(
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


    box.innerHTML =
        `
        <p>
            The selected period contains
            <strong>
                ${filteredSales.length.toLocaleString(
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
            ${
                highestDivision
                    ? `
                    The division with the highest
                    sales amount in this selected
                    period is
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
                    `
                    :
                    `
                    No division sales were recorded
                    for the selected period.
                    `
            }
        </p>

        <p>
            Number of divisions that have reached
            their monthly target:
            <strong>
                ${achievedCount}
            </strong>
            out of
            <strong>
                ${divisions.length}
            </strong>.
        </p>
        `;

}


// ======================================================
// INFORMATION
// ======================================================

function updateInformation(
    from,
    to
) {

    setText(
        "infoFromDate",
        formatDisplayDate(
            from
        )
    );


    setText(
        "infoToDate",
        formatDisplayDate(
            to
        )
    );


    setText(
        "infoTransactions",
        filteredSales.length.toLocaleString(
            "en-US"
        )
    );

}


// ======================================================
// RESET
// ======================================================

async function resetFilters() {

    const search =
        document.getElementById(
            "divisionSearch"
        );


    if (search) {

        search.value =
            "";

    }


    setDefaultDates();


    await generateReport();

}


// ======================================================
// EXPORT CSV
// ======================================================

function exportCSV() {

    if (
        divisions.length ===
        0
    ) {

        alert(
            "No division data available."
        );

        return;

    }


    const rows = [];


    rows.push([
        "Division",
        "Sales",
        "Monthly Target",
        "Achievement",
        "Remaining",
        "Transactions",
        "Status"
    ]);


    divisions.forEach(
        function (division) {

            const sales =
                getDivisionSales(
                    division.id
                );


            const target =
                Number(
                    division.monthly_target ||
                    0
                );


            const achievement =
                target > 0
                    ? (
                        sales /
                        target
                    ) * 100
                    : 0;


            const remaining =
                Math.max(
                    target -
                    sales,
                    0
                );


            const transactions =
                filteredSales.filter(
                    function (sale) {

                        return String(
                            sale.division_id
                        ) ===
                        String(
                            division.id
                        );

                    }
                ).length;


            let status =
                "On Track";


            if (
                achievement >=
                100
            ) {

                status =
                    "Achieved";

            } else if (
                achievement < 50
            ) {

                status =
                    "Below Target";

            }


            rows.push([
                division.division_name,
                sales,
                target,
                achievement.toFixed(2) + "%",
                remaining,
                transactions,
                status
            ]);

        }
    );


    const csv =
        rows
            .map(
                function (row) {

                    return row
                        .map(
                            csvEscape
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
        "MAPL_Division_Report_" +
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

function csvEscape(
    value
) {

    const text =
        String(
            value ?? ""
        );


    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n")
    ) {

        return (
            '"' +
            text.replace(
                /"/g,
                '""'
            ) +
            '"'
        );

    }


    return text;

}


// ======================================================
// LOGOUT
// ======================================================

async function logoutUser() {

    try {

        await supabaseClient
            .auth
            .signOut();

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }


    window.location.href =
        "login.html";

}


// ======================================================
// HELPERS
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


function getTodayString() {

    return formatInputDate(
        new Date()
    );

}


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


function showError(
    message
) {

    const box =
        document.getElementById(
            "divisionSummary"
        );


    if (box) {

        box.innerHTML =
            `
            <p style="color:#b91c1c;">
                <strong>
                    Error:
                </strong>
                ${escapeHTML(
                    message
                )}
            </p>
            `;

    }

}