/* =========================================================
   MAPL PUBLIC BRAND & DIVISION TARGET REPORT
   =========================================================

   PUBLIC REPORT
   ---------------------------------------------------------
   No login required.

   Requires:
   - js/config.js
   - Supabase client
   - Chart.js

   Tables:
   - divisions
   - brands
   - brand_targets
   - sales

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


let divisions = [];
let brands = [];
let salesRows = [];
let targetRows = [];
let reportRows = [];

let divisionChart = null;
let brandChart = null;


const $ = (id) =>
    document.getElementById(id);



/* =========================================================
   INIT
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);


async function init() {

    try {

        /* -------------------------------------------------
           CHECK SUPABASE
           ------------------------------------------------- */

        if (
            typeof supabaseClient ===
            "undefined"
        ) {

            throw new Error(
                "Supabase client was not found. Please check js/config.js."
            );
        }


        /* -------------------------------------------------
           BIND EVENTS
           ------------------------------------------------- */

        bindEvents();


        /* -------------------------------------------------
           DEFAULT DATE
           ------------------------------------------------- */

        setDefaultDates();


        /* -------------------------------------------------
           LOAD MASTER DATA
           ------------------------------------------------- */

        await Promise.all([

            loadDivisions(),

            loadBrands()

        ]);


        /* -------------------------------------------------
           POPULATE FILTERS
           ------------------------------------------------- */

        populateFilters();


        /* -------------------------------------------------
           INITIAL REPORT
           ------------------------------------------------- */

        await applyReport();


    } catch (error) {

        console.error(
            "Public report initialization error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to initialize public report.",
            "error"
        );


        $("filterStatus").textContent =
            "Error";
    }
}



/* =========================================================
   EVENTS
   ========================================================= */

function bindEvents() {


    $("applyBtn").addEventListener(
        "click",
        applyReport
    );


    $("resetBtn").addEventListener(
        "click",
        resetFilters
    );


    $("exportCsvBtn").addEventListener(
        "click",
        exportCSV
    );


    $("printBtn").addEventListener(
        "click",
        () => window.print()
    );


    $("reportView").addEventListener(
        "change",
        renderCurrentReport
    );

}



/* =========================================================
   DEFAULT DATES
   ========================================================= */

function setDefaultDates() {

    const now =
        new Date();


    const firstDay =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );


    $("fromDate").value =
        formatDateLocal(
            firstDay
        );


    $("toDate").value =
        formatDateLocal(
            now
        );

}



/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatDateLocal(
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


    return `${year}-${month}-${day}`;
}



/* =========================================================
   BDT FORMAT
   ========================================================= */

function formatBDT(
    value
) {

    const number =
        Number(
            value || 0
        );


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
   PERCENT FORMAT
   ========================================================= */

function formatPercent(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-US",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ) + "%";
}



/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}



/* =========================================================
   LOAD DIVISIONS
   ========================================================= */

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


    const orderMap =
        new Map(
            divisionOrder.map(
                (
                    name,
                    index
                ) => [
                    name,
                    index
                ]
            )
        );


    divisions =
        (data || []).sort(
            (
                a,
                b
            ) => {

                const ai =
                    orderMap.has(
                        a.division_name
                    )
                        ? orderMap.get(
                            a.division_name
                        )
                        : 999;


                const bi =
                    orderMap.has(
                        b.division_name
                    )
                        ? orderMap.get(
                            b.division_name
                        )
                        : 999;


                return (
                    ai - bi ||
                    a.division_name.localeCompare(
                        b.division_name
                    )
                );

            }
        );

}



/* =========================================================
   LOAD BRANDS
   ========================================================= */

async function loadBrands() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("brands")
            .select(
                "id, brand_name, active"
            )
            .eq(
                "active",
                true
            )
            .order(
                "brand_name",
                {
                    ascending:
                        true
                }
            );


    if (error) {

        throw error;

    }


    brands =
        data || [];

}



/* =========================================================
   POPULATE FILTERS
   ========================================================= */

function populateFilters() {

    const divisionSelect =
        $("divisionFilter");


    const brandSelect =
        $("brandFilter");


    divisionSelect.innerHTML =
        `
        <option value="">
            All Divisions
        </option>
        ` +
        divisions.map(
            division =>
                `
                <option value="${escapeHtml(
                    division.id
                )}">
                    ${escapeHtml(
                        division.division_name
                    )}
                </option>
                `
        ).join("");


    brandSelect.innerHTML =
        `
        <option value="">
            All Brands
        </option>
        ` +
        brands.map(
            brand =>
                `
                <option value="${escapeHtml(
                    brand.id
                )}">
                    ${escapeHtml(
                        brand.brand_name
                    )}
                </option>
                `
        ).join("");

}



/* =========================================================
   DATE VALIDATION
   ========================================================= */

function validateDates() {

    const from =
        $("fromDate").value;


    const to =
        $("toDate").value;


    if (
        !from ||
        !to
    ) {

        throw new Error(
            "Please select both From Date and To Date."
        );
    }


    if (
        from > to
    ) {

        throw new Error(
            "From Date cannot be later than To Date."
        );

    }


    return {
        from,
        to
    };

}



/* =========================================================
   APPLY REPORT
   ========================================================= */

async function applyReport() {

    try {

        clearMessage();


        const {
            from,
            to
        } =
            validateDates();


        $("applyBtn").disabled =
            true;


        $("applyBtn").textContent =
            "Loading...";


        $("filterStatus").textContent =
            "Loading";


        await Promise.all([

            loadSales(
                from,
                to
            ),

            loadTargets(
                from,
                to
            )

        ]);


        buildReportRows();


        renderKPIs();


        renderCharts();


        renderCurrentReport();


        renderInsights();


        $("lastUpdated").textContent =
            `Updated: ${new Date().toLocaleString()}`;


        $("filterStatus").textContent =
            "Applied";


    } catch (error) {

        console.error(
            "Report error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to load report.",
            "error"
        );


        $("filterStatus").textContent =
            "Error";


    } finally {

        $("applyBtn").disabled =
            false;


        $("applyBtn").textContent =
            "Apply Filter";

    }

}



/* =========================================================
   LOAD SALES
   ========================================================= */

async function loadSales(
    from,
    to
) {

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
                brand_id,
                remarks,
                divisions (
                    id,
                    division_name
                ),
                brands (
                    id,
                    brand_name
                )
            `)
            .gte(
                "sale_date",
                from
            )
            .lte(
                "sale_date",
                to
            )
            .order(
                "sale_date",
                {
                    ascending:
                        true
                }
            );


    if (error) {

        throw error;

    }


    salesRows =
        data || [];

}



/* =========================================================
   LOAD TARGETS
   ========================================================= */

async function loadTargets(
    from,
    to
) {

    const months =
        getMonthsBetween(
            from,
            to
        );


    if (
        !months.length
    ) {

        targetRows = [];

        return;

    }


    const firstMonth =
        months[0];


    const lastMonth =
        months[
            months.length - 1
        ];


    const {
        data,
        error
    } =
        await supabaseClient
            .from("brand_targets")
            .select(`
                id,
                division_id,
                brand_id,
                target_month,
                target_amount,
                remarks
            `)
            .gte(
                "target_month",
                firstMonth
            )
            .lte(
                "target_month",
                lastMonth
            );


    if (error) {

        throw error;

    }


    targetRows =
        data || [];

}



/* =========================================================
   MONTHS
   ========================================================= */

function getMonthsBetween(
    from,
    to
) {

    const start =
        new Date(
            `${from}T00:00:00`
        );


    const end =
        new Date(
            `${to}T00:00:00`
        );


    const months = [];


    let cursor =
        new Date(
            start.getFullYear(),
            start.getMonth(),
            1
        );


    const endMonth =
        new Date(
            end.getFullYear(),
            end.getMonth(),
            1
        );


    while (
        cursor <=
        endMonth
    ) {

        months.push(
            `${cursor.getFullYear()}-${String(
                cursor.getMonth() + 1
            ).padStart(
                2,
                "0"
            )}-01`
        );


        cursor =
            new Date(
                cursor.getFullYear(),
                cursor.getMonth() + 1,
                1
            );

    }


    return months;

}



/* =========================================================
   MONTH DAYS
   ========================================================= */

function getMonthDays(
    year,
    monthIndex
) {

    return new Date(
        year,
        monthIndex + 1,
        0
    ).getDate();

}



/* =========================================================
   TARGET PRORATION
   ========================================================= */

function getTargetForRange(
    targetAmount,
    targetMonth,
    from,
    to
) {

    const monthDate =
        new Date(
            `${targetMonth}T00:00:00`
        );


    const year =
        monthDate.getFullYear();


    const monthIndex =
        monthDate.getMonth();


    const monthStart =
        new Date(
            year,
            monthIndex,
            1
        );


    const monthEnd =
        new Date(
            year,
            monthIndex + 1,
            0
        );


    const selectedStart =
        new Date(
            `${from}T00:00:00`
        );


    const selectedEnd =
        new Date(
            `${to}T00:00:00`
        );


    const overlapStart =
        selectedStart >
        monthStart
            ? selectedStart
            : monthStart;


    const overlapEnd =
        selectedEnd <
        monthEnd
            ? selectedEnd
            : monthEnd;


    if (
        overlapStart >
        overlapEnd
    ) {

        return 0;

    }


    const overlapDays =
        Math.floor(
            (
                overlapEnd -
                overlapStart
            ) /
            86400000
        ) + 1;


    const totalMonthDays =
        getMonthDays(
            year,
            monthIndex
        );


    return (
        Number(
            targetAmount || 0
        ) *
        (
            overlapDays /
            totalMonthDays
        )
    );

}



/* =========================================================
   BUILD REPORT ROWS
   ========================================================= */

function buildReportRows() {

    const from =
        $("fromDate").value;


    const to =
        $("toDate").value;


    const selectedDivision =
        $("divisionFilter").value;


    const selectedBrand =
        $("brandFilter").value;


    const selectedStatus =
        $("statusFilter").value;


    const map =
        new Map();



    /* -----------------------------------------------------
       TARGETS
       ----------------------------------------------------- */

    targetRows.forEach(
        target => {

            if (
                selectedDivision &&
                target.division_id !==
                    selectedDivision
            ) {

                return;

            }


            if (
                selectedBrand &&
                target.brand_id !==
                    selectedBrand
            ) {

                return;

            }


            const division =
                divisions.find(
                    item =>
                        item.id ===
                        target.division_id
                );


            const brand =
                brands.find(
                    item =>
                        item.id ===
                        target.brand_id
                );


            if (
                !division ||
                !brand
            ) {

                return;

            }


            const key =
                `${target.division_id}__${target.brand_id}`;


            if (
                !map.has(key)
            ) {

                map.set(
                    key,
                    {
                        divisionId:
                            target.division_id,

                        divisionName:
                            division.division_name,

                        brandId:
                            target.brand_id,

                        brandName:
                            brand.brand_name,

                        target: 0,

                        actual: 0
                    }
                );

            }


            map.get(key).target +=
                getTargetForRange(
                    target.target_amount,
                    target.target_month,
                    from,
                    to
                );

        }
    );



    /* -----------------------------------------------------
       SALES
       ----------------------------------------------------- */

    salesRows.forEach(
        sale => {

            if (
                selectedDivision &&
                sale.division_id !==
                    selectedDivision
            ) {

                return;

            }


            if (
                selectedBrand &&
                sale.brand_id !==
                    selectedBrand
            ) {

                return;

            }


            /*
             * Sales without brand cannot be shown
             * in brand-wise report.
             */

            if (
                !sale.brand_id ||
                !sale.division_id
            ) {

                return;

            }


            const divisionName =
                sale.divisions?.division_name ||
                divisions.find(
                    item =>
                        item.id ===
                        sale.division_id
                )?.division_name ||
                "Unknown";


            const brandName =
                sale.brands?.brand_name ||
                brands.find(
                    item =>
                        item.id ===
                        sale.brand_id
                )?.brand_name ||
                "Unknown";


            const key =
                `${sale.division_id}__${sale.brand_id}`;


            if (
                !map.has(key)
            ) {

                map.set(
                    key,
                    {
                        divisionId:
                            sale.division_id,

                        divisionName,

                        brandId:
                            sale.brand_id,

                        brandName,

                        target: 0,

                        actual: 0
                    }
                );

            }


            map.get(key).actual +=
                Number(
                    sale.sales_amount ||
                    0
                );

        }
    );



    /* -----------------------------------------------------
       PERFORMANCE
       ----------------------------------------------------- */

    reportRows =
        Array.from(
            map.values()
        ).map(
            row => {

                const target =
                    Number(
                        row.target ||
                        0
                    );


                const actual =
                    Number(
                        row.actual ||
                        0
                    );


                const achievement =
                    target > 0
                        ? (
                            actual /
                            target
                        ) * 100
                        : 0;


                const remaining =
                    Math.max(
                        target -
                        actual,
                        0
                    );


                let status =
                    "no-target";


                if (
                    target > 0
                ) {

                    if (
                        achievement >=
                        100
                    ) {

                        status =
                            "achieved";

                    } else if (
                        achievement >=
                        80
                    ) {

                        status =
                            "near";

                    } else {

                        status =
                            "under";

                    }

                }


                return {

                    ...row,

                    target,

                    actual,

                    achievement,

                    remaining,

                    status

                };

            }
        );



    /* -----------------------------------------------------
       STATUS FILTER
       ----------------------------------------------------- */

    if (
        selectedStatus
    ) {

        reportRows =
            reportRows.filter(
                row =>
                    row.status ===
                    selectedStatus
            );

    }



    /* -----------------------------------------------------
       FIXED DIVISION ORDER
       ----------------------------------------------------- */

    reportRows.sort(
        (
            a,
            b
        ) => {

            const ai =
                divisionOrder.indexOf(
                    a.divisionName
                );


            const bi =
                divisionOrder.indexOf(
                    b.divisionName
                );


            return (

                (
                    ai === -1
                        ? 999
                        : ai
                ) -

                (
                    bi === -1
                        ? 999
                        : bi
                )

            ) ||

            a.brandName.localeCompare(
                b.brandName
            );

        }
    );

}



/* =========================================================
   KPI
   ========================================================= */

function renderKPIs() {

    const totalTarget =
        reportRows.reduce(
            (
                sum,
                row
            ) =>
                sum +
                row.target,
            0
        );


    const totalActual =
        reportRows.reduce(
            (
                sum,
                row
            ) =>
                sum +
                row.actual,
            0
        );


    const achievement =
        totalTarget > 0
            ? (
                totalActual /
                totalTarget
            ) *
              100
            : 0;


    const remaining =
        Math.max(
            totalTarget -
            totalActual,
            0
        );


    const divisionsSet =
        new Set(
            reportRows.map(
                row =>
                    row.divisionId
            )
        );


    const brandsSet =
        new Set(
            reportRows.map(
                row =>
                    row.brandId
            )
        );


    $("totalTarget").textContent =
        formatBDT(
            totalTarget
        );


    $("totalActual").textContent =
        formatBDT(
            totalActual
        );


    $("achievementPercent").textContent =
        formatPercent(
            achievement
        );


    $("remainingTarget").textContent =
        formatBDT(
            remaining
        );


    $("divisionCount").textContent =
        divisionsSet.size;


    $("brandCount").textContent =
        brandsSet.size;


    $("achievementNote").textContent =
        totalTarget > 0
            ? `${formatBDT(
                totalActual
            )} achieved against ${formatBDT(
                totalTarget
            )}`
            : "No target available";

}



/* =========================================================
   DIVISION AGGREGATION
   ========================================================= */

function aggregateByDivision() {

    const map =
        new Map();


    reportRows.forEach(
        row => {

            if (
                !map.has(
                    row.divisionName
                )
            ) {

                map.set(
                    row.divisionName,
                    {
                        name:
                            row.divisionName,

                        target: 0,

                        actual: 0
                    }
                );

            }


            const item =
                map.get(
                    row.divisionName
                );


            item.target +=
                row.target;


            item.actual +=
                row.actual;

        }
    );


    return sortByDivision(
        Array.from(
            map.values()
        )
    );

}



/* =========================================================
   BRAND AGGREGATION
   ========================================================= */

function aggregateByBrand() {

    const map =
        new Map();


    reportRows.forEach(
        row => {

            if (
                !map.has(
                    row.brandName
                )
            ) {

                map.set(
                    row.brandName,
                    {
                        name:
                            row.brandName,

                        target: 0,

                        actual: 0
                    }
                );

            }


            const item =
                map.get(
                    row.brandName
                );


            item.target +=
                row.target;


            item.actual +=
                row.actual;

        }
    );


    return Array.from(
        map.values()
    ).sort(
        (
            a,
            b
        ) =>
            b.actual -
            a.actual
    );

}



/* =========================================================
   DIVISION SORT
   ========================================================= */

function sortByDivision(
    rows
) {

    return rows.sort(
        (
            a,
            b
        ) => {

            const ai =
                divisionOrder.indexOf(
                    a.name
                );


            const bi =
                divisionOrder.indexOf(
                    b.name
                );


            return (

                (
                    ai === -1
                        ? 999
                        : ai
                ) -

                (
                    bi === -1
                        ? 999
                        : bi
                )

            );

        }
    );

}



/* =========================================================
   CHARTS
   ========================================================= */

function renderCharts() {

    const divisionData =
        aggregateByDivision();


    const brandData =
        aggregateByBrand();



    if (
        divisionChart
    ) {

        divisionChart.destroy();

        divisionChart =
            null;

    }


    if (
        brandChart
    ) {

        brandChart.destroy();

        brandChart =
            null;

    }



    const divisionCanvas =
        $("divisionChart")
            .getContext("2d");


    const brandCanvas =
        $("brandChart")
            .getContext("2d");



    divisionChart =
        new Chart(
            divisionCanvas,
            {

                type:
                    "bar",


                data: {

                    labels:
                        divisionData.map(
                            row =>
                                row.name
                        ),


                    datasets: [

                        {

                            label:
                                "Target",

                            data:
                                divisionData.map(
                                    row =>
                                        row.target
                                ),

                            borderWidth:
                                1

                        },


                        {

                            label:
                                "Actual",

                            data:
                                divisionData.map(
                                    row =>
                                        row.actual
                                ),

                            borderWidth:
                                1

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,


                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },


                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {

                                callback:
                                    value =>
                                        "৳" +
                                        Number(
                                            value
                                        ).toLocaleString(
                                            "en-BD"
                                        )

                            }

                        }

                    },


                    plugins: {

                        legend: {

                            position:
                                "bottom"

                        },


                        tooltip: {

                            callbacks: {

                                label:
                                    context =>
                                        `${context.dataset.label}: ${formatBDT(
                                            context.raw
                                        )}`

                            }

                        }

                    }

                }

            }
        );



    brandChart =
        new Chart(
            brandCanvas,
            {

                type:
                    "bar",


                data: {

                    labels:
                        brandData.map(
                            row =>
                                row.name
                        ),


                    datasets: [

                        {

                            label:
                                "Target",

                            data:
                                brandData.map(
                                    row =>
                                        row.target
                                ),

                            borderWidth:
                                1

                        },


                        {

                            label:
                                "Actual",

                            data:
                                brandData.map(
                                    row =>
                                        row.actual
                                ),

                            borderWidth:
                                1

                        }

                    ]

                },


                options: {

                    indexAxis:
                        "y",

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,


                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },


                    scales: {

                        x: {

                            beginAtZero:
                                true,

                            ticks: {

                                callback:
                                    value =>
                                        "৳" +
                                        Number(
                                            value
                                        ).toLocaleString(
                                            "en-BD"
                                        )

                            }

                        }

                    },


                    plugins: {

                        legend: {

                            position:
                                "bottom"

                        },


                        tooltip: {

                            callbacks: {

                                label:
                                    context =>
                                        `${context.dataset.label}: ${formatBDT(
                                            context.raw
                                        )}`

                            }

                        }

                    }

                }

            }
        );

}



/* =========================================================
   REPORT VIEW
   ========================================================= */

function renderCurrentReport() {

    const view =
        $("reportView").value;


    if (
        view ===
        "division"
    ) {

        renderDivisionSummary();

    }

    else if (
        view ===
        "brand"
    ) {

        renderBrandSummary();

    }

    else {

        renderDetailReport();

    }

}



/* =========================================================
   DETAIL REPORT
   ========================================================= */

function renderDetailReport() {

    $("tableTitle").textContent =
        "Division & Brand Detail";


    $("tableSubtitle").textContent =
        "Detailed target vs actual performance for each division and brand";


    $("reportHead").innerHTML = `

        <tr>

            <th>
                Division
            </th>

            <th>
                Brand
            </th>

            <th>
                Target
            </th>

            <th>
                Actual Sales
            </th>

            <th>
                Achievement
            </th>

            <th>
                Progress
            </th>

            <th>
                Remaining
            </th>

            <th>
                Status
            </th>

        </tr>

    `;



    $("reportBody").innerHTML =

        reportRows.map(
            row => `

                <tr>

                    <td>
                        <strong>
                            ${escapeHtml(
                                row.divisionName
                            )}
                        </strong>
                    </td>


                    <td>
                        ${escapeHtml(
                            row.brandName
                        )}
                    </td>


                    <td>
                        ${formatBDT(
                            row.target
                        )}
                    </td>


                    <td>
                        ${formatBDT(
                            row.actual
                        )}
                    </td>


                    <td>

                        <strong>
                            ${formatPercent(
                                row.achievement
                            )}
                        </strong>

                    </td>


                    <td class="progress-cell">

                        <span>
                            ${formatPercent(
                                row.achievement
                            )}
                        </span>


                        <div class="progress-line">

                            <div
                                class="progress-fill ${
                                    row.status ===
                                    "achieved"
                                        ? "achieved"
                                        : row.status ===
                                          "near"
                                            ? "near"
                                            : ""
                                }"
                                style="width:${Math.min(
                                    Math.max(
                                        row.achievement,
                                        0
                                    ),
                                    100
                                )}%"
                            ></div>

                        </div>

                    </td>


                    <td>
                        ${formatBDT(
                            row.remaining
                        )}
                    </td>


                    <td>
                        ${statusBadge(
                            row.status
                        )}
                    </td>

                </tr>

            `
        ).join("");



    renderFooter(

        reportRows.reduce(
            (
                sum,
                row
            ) =>
                sum +
                row.target,
            0
        ),

        reportRows.reduce(
            (
                sum,
                row
            ) =>
                sum +
                row.actual,
            0
        ),

        reportRows.reduce(
            (
                sum,
                row
            ) =>
                sum +
                row.remaining,
            0
        )

    );


    finishTableState();

}



/* =========================================================
   DIVISION SUMMARY
   ========================================================= */

function renderDivisionSummary() {

    const rows =
        aggregateByDivision();


    $("tableTitle").textContent =
        "Division Summary";


    $("tableSubtitle").textContent =
        "Division-wise target vs actual performance";


    $("reportHead").innerHTML = `

        <tr>

            <th>
                Division
            </th>

            <th>
                Target
            </th>

            <th>
                Actual Sales
            </th>

            <th>
                Achievement
            </th>

            <th>
                Remaining
            </th>

            <th>
                Status
            </th>

        </tr>

    `;



    $("reportBody").innerHTML =

        rows.map(
            row => {

                const achievement =
                    row.target > 0
                        ? (
                            row.actual /
                            row.target
                        ) *
                          100
                        : 0;


                const remaining =
                    Math.max(
                        row.target -
                        row.actual,
                        0
                    );


                const status =
                    row.target <= 0
                        ? "no-target"
                        : achievement >=
                          100
                            ? "achieved"
                            : achievement >=
                              80
                                ? "near"
                                : "under";


                return `

                    <tr>

                        <td>

                            <strong>
                                ${escapeHtml(
                                    row.name
                                )}
                            </strong>

                        </td>


                        <td>
                            ${formatBDT(
                                row.target
                            )}
                        </td>


                        <td>
                            ${formatBDT(
                                row.actual
                            )}
                        </td>


                        <td>

                            <strong>
                                ${formatPercent(
                                    achievement
                                )}
                            </strong>

                        </td>


                        <td>
                            ${formatBDT(
                                remaining
                            )}
                        </td>


                        <td>
                            ${statusBadge(
                                status
                            )}
                        </td>

                    </tr>

                `;

            }
        ).join("");



    renderFooter(

        rows.reduce(
            (
                sum,
                row
            ) =>
                sum +
                row.target,
            0
        ),

        rows.reduce(
            (
                sum,
                row
            ) =>
                sum +
                row.actual,
            0
        ),

        rows.reduce(
            (
                sum,
                row
            ) =>
                sum +
                Math.max(
                    row.target -
                    row.actual,
                    0
                ),
            0
        )

    );


    finishTableState();

}



/* =========================================================
   BRAND SUMMARY
   ========================================================= */

function renderBrandSummary() {

    const rows =
        aggregateByBrand();


    $("tableTitle").textContent =
        "Brand Summary";


    $("tableSubtitle").textContent =
        "Brand-wise target vs actual performance";


    $("reportHead").innerHTML = `

        <tr>

            <th>
                Brand
            </th>

            <th>
                Target
            </th>

            <th>
                Actual Sales
            </th>

            <th>
                Achievement
            </th>

            <th>
                Remaining
            </th>

            <th>
                Status
            </th>

        </tr>

    `;



    $("reportBody").innerHTML =

        rows.map(
            row => {

                const achievement =
                    row.target > 0
                        ? (
                            row.actual /
                            row.target
                        ) *
                          100
                        : 0;


                const remaining =
                    Math.max(
                        row.target -
                        row.actual,
                        0
                    );


                const status =
                    row.target <= 0
                        ? "no-target"
                        : achievement >=
                          100
                            ? "achieved"
                            : achievement >=
                              80
                                ? "near"
                                : "under";


                return `

                    <tr>

                        <td>

                            <strong>
                                ${escapeHtml(
                                    row.name
                                )}
                            </strong>

                        </td>


                        <td>
                            ${formatBDT(
                                row.target
                            )}
                        </td>


                        <td>
                            ${formatBDT(
                                row.actual
                            )}
                        </td>


                        <td>

                            <strong>
                                ${formatPercent(
                                    achievement
                                )}
                            </strong>

                        </td>


                        <td>
                            ${formatBDT(
                                remaining
                            )}
                        </td>


                        <td>
                            ${statusBadge(
                                status
                            )}
                        </td>

                    </tr>

                `;

            }
        ).join("");



    renderFooter(

        rows.reduce(
            (
                sum,
                row
            ) =>
                sum +
                row.target,
            0
        ),

        rows.reduce(
            (
                sum,
                row
            ) =>
                sum +
                row.actual,
            0
        ),

        rows.reduce(
            (
                sum,
                row
            ) =>
                sum +
                Math.max(
                    row.target -
                    row.actual,
                    0
                ),
            0
        )

    );


    finishTableState();

}



/* =========================================================
   STATUS BADGE
   ========================================================= */

function statusBadge(
    status
) {

    const labels = {

        achieved:
            "Achieved",

        near:
            "Near Target",

        under:
            "Under Target",

        "no-target":
            "No Target"

    };


    const classes = {

        achieved:
            "status-achieved",

        near:
            "status-near",

        under:
            "status-under",

        "no-target":
            "status-none"

    };


    return `

        <span
            class="status ${
                classes[status] ||
                "status-none"
            }"
        >

            ${
                labels[status] ||
                "No Target"
            }

        </span>

    `;

}



/* =========================================================
   FOOTER TOTAL
   ========================================================= */

function renderFooter(
    target,
    actual,
    remaining
) {

    const achievement =
        target > 0
            ? (
                actual /
                target
            ) *
              100
            : 0;


    $("reportFoot").innerHTML = `

        <tr>

            <td colspan="2">
                TOTAL
            </td>


            <td>
                ${formatBDT(
                    target
                )}
            </td>


            <td>
                ${formatBDT(
                    actual
                )}
            </td>


            <td>
                ${formatPercent(
                    achievement
                )}
            </td>


            <td></td>


            <td>
                ${formatBDT(
                    remaining
                )}
            </td>


            <td></td>

        </tr>

    `;

}



/* =========================================================
   EMPTY STATE
   ========================================================= */

function finishTableState() {

    $("rowCount").textContent =
        `${reportRows.length} rows`;


    if (
        !reportRows.length
    ) {

        $("emptyState")
            .classList
            .remove(
                "hidden"
            );


        $("reportBody").innerHTML =
            "";


        $("reportFoot").innerHTML =
            "";

    }

    else {

        $("emptyState")
            .classList
            .add(
                "hidden"
            );

    }

}



/* =========================================================
   MANAGEMENT INSIGHTS
   ========================================================= */

function renderInsights() {

    const grid =
        $("insightsGrid");


    if (
        !reportRows.length
    ) {

        grid.innerHTML = `

            <div class="insight-card">

                <strong>
                    No Data
                </strong>

                <p>
                    No data is available
                    for the selected filters.
                </p>

            </div>

        `;

        return;

    }


    const divisionData =
        aggregateByDivision();


    const brandData =
        aggregateByBrand();


    const divisionPerformance =
        divisionData.map(
            row => ({

                ...row,

                achievement:
                    row.target > 0
                        ? (
                            row.actual /
                            row.target
                        ) *
                          100
                        : 0

            })
        );


    const bestDivision =
        [
            ...divisionPerformance
        ].sort(
            (
                a,
                b
            ) =>
                b.achievement -
                a.achievement
        )[0];


    const bestBrand =
        [
            ...brandData
        ]
            .map(
                row => ({

                    ...row,

                    achievement:
                        row.target > 0
                            ? (
                                row.actual /
                                row.target
                            ) *
                              100
                            : 0

                })
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.achievement -
                    a.achievement
            )[0];


    const underTargetCount =
        reportRows.filter(
            row =>
                row.status ===
                "under"
        ).length;


    const achievedCount =
        reportRows.filter(
            row =>
                row.status ===
                "achieved"
        ).length;


    const totalTarget =
        reportRows.reduce(
            (
                sum,
                row
            ) =>
                sum +
                row.target,
            0
        );


    const totalActual =
        reportRows.reduce(
            (
                sum,
                row
            ) =>
                sum +
                row.actual,
            0
        );


    const overallAchievement =
        totalTarget > 0
            ? (
                totalActual /
                totalTarget
            ) *
              100
            : 0;


    grid.innerHTML = `

        <div class="insight-card">

            <strong>
                Overall Performance
            </strong>

            <p>

                Selected report achievement is

                <b>
                    ${formatPercent(
                        overallAchievement
                    )}
                </b>

                against a target of

                <b>
                    ${formatBDT(
                        totalTarget
                    )}
                </b>.

            </p>

        </div>



        <div class="insight-card">

            <strong>
                Top Division
            </strong>

            <p>

                ${
                    bestDivision

                        ? `

                            <b>
                                ${escapeHtml(
                                    bestDivision.name
                                )}
                            </b>

                            is currently at

                            <b>
                                ${formatPercent(
                                    bestDivision.achievement
                                )}
                            </b>.

                        `

                        : `

                            No division
                            performance available.

                        `
                }

            </p>

        </div>



        <div class="insight-card">

            <strong>
                Top Brand
            </strong>

            <p>

                ${
                    bestBrand

                        ? `

                            <b>
                                ${escapeHtml(
                                    bestBrand.name
                                )}
                            </b>

                            is currently at

                            <b>
                                ${formatPercent(
                                    bestBrand.achievement
                                )}
                            </b>.

                        `

                        : `

                            No brand
                            performance available.

                        `
                }

            </p>

        </div>



        <div class="insight-card">

            <strong>
                Target Achieved Rows
            </strong>

            <p>

                <b>
                    ${achievedCount}
                </b>

                division-brand combinations
                have reached 100% or above.

            </p>

        </div>



        <div class="insight-card">

            <strong>
                Under Target Rows
            </strong>

            <p>

                <b>
                    ${underTargetCount}
                </b>

                division-brand combinations
                are below 80% achievement.

            </p>

        </div>



        <div class="insight-card">

            <strong>
                Remaining Target
            </strong>

            <p>

                Current remaining target is

                <b>
                    ${formatBDT(
                        Math.max(
                            totalTarget -
                            totalActual,
                            0
                        )
                    )}
                </b>.

            </p>

        </div>

    `;

}



/* =========================================================
   RESET
   ========================================================= */

function resetFilters() {

    setDefaultDates();


    $("divisionFilter").value =
        "";


    $("brandFilter").value =
        "";


    $("statusFilter").value =
        "";


    $("reportView").value =
        "detail";


    applyReport();

}



/* =========================================================
   CSV EXPORT
   ========================================================= */

function exportCSV() {

    if (
        !reportRows.length
    ) {

        showMessage(
            "There is no report data to export.",
            "error"
        );

        return;

    }


    const view =
        $("reportView").value;


    let rows = [];

    let headers = [];



    /* -----------------------------------------------------
       DIVISION
       ----------------------------------------------------- */

    if (
        view ===
        "division"
    ) {

        headers = [

            "Division",

            "Target",

            "Actual Sales",

            "Achievement %",

            "Remaining",

            "Status"

        ];


        rows =
            aggregateByDivision()
                .map(
                    row => {

                        const achievement =
                            row.target > 0
                                ? (
                                    row.actual /
                                    row.target
                                ) *
                                  100
                                : 0;


                        const remaining =
                            Math.max(
                                row.target -
                                row.actual,
                                0
                            );


                        const status =
                            row.target <= 0
                                ? "No Target"
                                : achievement >=
                                  100
                                    ? "Achieved"
                                    : achievement >=
                                      80
                                        ? "Near Target"
                                        : "Under Target";


                        return [

                            row.name,

                            row.target,

                            row.actual,

                            achievement.toFixed(
                                2
                            ),

                            remaining,

                            status

                        ];

                    }
                );

    }



    /* -----------------------------------------------------
       BRAND
       ----------------------------------------------------- */

    else if (
        view ===
        "brand"
    ) {

        headers = [

            "Brand",

            "Target",

            "Actual Sales",

            "Achievement %",

            "Remaining",

            "Status"

        ];


        rows =
            aggregateByBrand()
                .map(
                    row => {

                        const achievement =
                            row.target > 0
                                ? (
                                    row.actual /
                                    row.target
                                ) *
                                  100
                                : 0;


                        const remaining =
                            Math.max(
                                row.target -
                                row.actual,
                                0
                            );


                        const status =
                            row.target <= 0
                                ? "No Target"
                                : achievement >=
                                  100
                                    ? "Achieved"
                                    : achievement >=
                                      80
                                        ? "Near Target"
                                        : "Under Target";


                        return [

                            row.name,

                            row.target,

                            row.actual,

                            achievement.toFixed(
                                2
                            ),

                            remaining,

                            status

                        ];

                    }
                );

    }



    /* -----------------------------------------------------
       DETAIL
       ----------------------------------------------------- */

    else {

        headers = [

            "Division",

            "Brand",

            "Target",

            "Actual Sales",

            "Achievement %",

            "Remaining",

            "Status"

        ];


        rows =
            reportRows.map(
                row => [

                    row.divisionName,

                    row.brandName,

                    row.target,

                    row.actual,

                    row.achievement.toFixed(
                        2
                    ),

                    row.remaining,

                    statusText(
                        row.status
                    )

                ]
            );

    }



    const csv = [

        headers,

        ...rows

    ]
        .map(
            row =>
                row
                    .map(
                        csvEscape
                    )
                    .join(",")
        )
        .join(
            "\r\n"
        );


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
        `MAPL_Public_Target_Report_${$("fromDate").value}_${$("toDate").value}.csv`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );

}



/* =========================================================
   CSV ESCAPE
   ========================================================= */

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

        return `"${text.replaceAll(
            '"',
            '""'
        )}"`;

    }


    return text;

}



/* =========================================================
   STATUS TEXT
   ========================================================= */

function statusText(
    status
) {

    return {

        achieved:
            "Achieved",

        near:
            "Near Target",

        under:
            "Under Target",

        "no-target":
            "No Target"

    }[
        status
    ] ||
    "No Target";

}



/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
    message,
    type = "success"
) {

    const box =
        $("messageBox");


    box.className =
        `message-box ${type}`;


    box.textContent =
        message;


    box.classList.remove(
        "hidden"
    );

}



function clearMessage() {

    $("messageBox")
        .classList
        .add(
            "hidden"
        );


    $("messageBox").textContent =
        "";

}