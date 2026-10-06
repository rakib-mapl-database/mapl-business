/* =========================================================
   MAPL DIVISION & BRAND SALES
   =========================================================

   Required Supabase tables:

   divisions
   brands
   sales
   profiles
   audit_logs

   sales fields:

   id
   sale_date
   sales_amount
   division_id
   brand_id
   remarks
   created_by
   created_at
   updated_at

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


let currentUser = null;

let divisions = [];
let brands = [];
let salesData = [];

let editingSaleId = null;


/* =========================================================
   ELEMENTS
========================================================= */

const $ = id =>
    document.getElementById(id);


const elements = {

    userName: $("userName"),
    userRole: $("userRole"),
    logoutBtn: $("logoutBtn"),

    message: $("pageMessage"),

    form: $("salesForm"),

    saleId: $("saleId"),
    saleDate: $("saleDate"),
    saleDivision: $("saleDivision"),
    saleBrand: $("saleBrand"),
    salesAmount: $("salesAmount"),
    salesRemarks: $("salesRemarks"),

    saveSaleBtn: $("saveSaleBtn"),
    cancelEditBtn: $("cancelEditBtn"),
    resetFormBtn: $("resetFormBtn"),

    formMode: $("formMode"),

    todaySales: $("todaySales"),
    monthSales: $("monthSales"),
    transactionCount: $("transactionCount"),
    selectedDivisionTotal: $("selectedDivisionTotal"),

    filterFromDate: $("filterFromDate"),
    filterToDate: $("filterToDate"),
    filterDivision: $("filterDivision"),
    filterBrand: $("filterBrand"),
    searchSales: $("searchSales"),

    applyFilterBtn: $("applyFilterBtn"),
    clearFilterBtn: $("clearFilterBtn"),

    tableBody: $("salesTableBody"),
    filteredTotal: $("filteredTotal")

};


/* =========================================================
   INIT
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialize
);


async function initialize() {

    try {

        if (
            !window.supabase ||
            typeof supabaseClient === "undefined"
        ) {

            throw new Error(
                "Supabase client is not available."
            );

        }


        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();


        if (error) {

            throw error;

        }


        if (!data.session) {

            window.location.replace(
                "login.html"
            );

            return;

        }


        currentUser =
            data.session.user;


        await loadProfile();

        setDefaultDate();

        await loadDivisions();

        await loadBrands();

        populateFilters();

        attachEvents();

        await loadSales();

    }

    catch (error) {

        console.error(
            "Initialization Error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to initialize sales entry.",
            "error"
        );

    }

}


/* =========================================================
   PROFILE
========================================================= */

async function loadProfile() {

    if (!currentUser) return;


    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "full_name,email,role"
            )
            .eq(
                "id",
                currentUser.id
            )
            .maybeSingle();


    if (error) {

        console.warn(
            "Profile Error:",
            error.message
        );

        return;

    }


    if (data) {

        elements.userName.textContent =
            data.full_name ||
            data.email ||
            currentUser.email ||
            "User";


        elements.userRole.textContent =
            String(
                data.role ||
                "USER"
            ).toUpperCase();

    }

}


/* =========================================================
   DEFAULT DATE
========================================================= */

function setDefaultDate() {

    const today =
        getLocalDate();


    elements.saleDate.value =
        today;

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
                "id,division_name,active"
            )
            .eq(
                "active",
                true
            );


    if (error) {

        throw error;

    }


    divisions =
        (data || [])
            .sort(sortDivisions);


    elements.saleDivision.innerHTML =
        '<option value="">Select Division</option>';


    elements.filterDivision.innerHTML =
        '<option value="">All Divisions</option>';


    divisions.forEach(
        division => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                division.id;

            option.textContent =
                division.division_name;


            elements.saleDivision
                .appendChild(option);


            const filterOption =
                option.cloneNode(true);


            elements.filterDivision
                .appendChild(
                    filterOption
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
                "id,brand_name,active"
            )
            .eq(
                "active",
                true
            )
            .order(
                "brand_name",
                {
                    ascending: true
                }
            );


    if (error) {

        throw error;

    }


    brands =
        data || [];


    renderBrandDropdown(
        elements.saleBrand
    );

}


/* =========================================================
   BRAND DROPDOWN
========================================================= */

function renderBrandDropdown(
    select,
    selectedValue = ""
) {

    select.innerHTML =
        '<option value="">Select Brand</option>';


    if (
        !elements.saleDivision.value
    ) {

        select.disabled = true;

        select.innerHTML =
            '<option value="">Select Division First</option>';

        return;

    }


    select.disabled = false;


    brands.forEach(
        brand => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                brand.id;

            option.textContent =
                brand.brand_name;


            if (
                String(
                    brand.id
                ) ===
                String(
                    selectedValue
                )
            ) {

                option.selected =
                    true;

            }


            select.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   FILTER BRANDS
========================================================= */

function populateFilters() {

    elements.filterBrand.innerHTML =
        '<option value="">All Brands</option>';


    brands.forEach(
        brand => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                brand.id;

            option.textContent =
                brand.brand_name;


            elements.filterBrand
                .appendChild(
                    option
                );

        }
    );

}


/* =========================================================
   EVENTS
========================================================= */

function attachEvents() {


    elements.saleDivision
        .addEventListener(
            "change",
            () => {

                renderBrandDropdown(
                    elements.saleBrand
                );

                updateSelectedDivisionTotal();

            }
        );


    elements.form
        .addEventListener(
            "submit",
            handleSubmit
        );


    elements.cancelEditBtn
        .addEventListener(
            "click",
            resetForm
        );


    elements.resetFormBtn
        .addEventListener(
            "click",
            resetForm
        );


    elements.applyFilterBtn
        .addEventListener(
            "click",
            loadSales
        );


    elements.clearFilterBtn
        .addEventListener(
            "click",
            clearFilters
        );


    elements.filterDivision
        .addEventListener(
            "change",
            loadSales
        );


    elements.filterBrand
        .addEventListener(
            "change",
            loadSales
        );


    elements.searchSales
        .addEventListener(
            "input",
            debounce(
                renderSalesTable,
                250
            )
        );


    elements.logoutBtn
        .addEventListener(
            "click",
            logout
        );

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
                    brand_id,
                    remarks,
                    created_by,
                    created_at,
                    updated_at,
                    divisions (
                        division_name
                    ),
                    brands (
                        brand_name
                    )
                `)
                .order(
                    "sale_date",
                    {
                        ascending: false
                    }
                );


        if (
            elements.filterFromDate.value
        ) {

            query =
                query.gte(
                    "sale_date",
                    elements.filterFromDate.value
                );

        }


        if (
            elements.filterToDate.value
        ) {

            query =
                query.lte(
                    "sale_date",
                    elements.filterToDate.value
                );

        }


        if (
            elements.filterDivision.value
        ) {

            query =
                query.eq(
                    "division_id",
                    elements.filterDivision.value
                );

        }


        if (
            elements.filterBrand.value
        ) {

            query =
                query.eq(
                    "brand_id",
                    elements.filterBrand.value
                );

        }


        const {
            data,
            error
        } = await query;


        if (error) {

            throw error;

        }


        salesData =
            data || [];


        renderSalesTable();

        updateKPIs();

    }

    catch (error) {

        console.error(
            "Load Sales Error:",
            error
        );

        elements.tableBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="error-cell"
                >
                    ${escapeHTML(
                        error.message ||
                        "Failed to load sales."
                    )}
                </td>

            </tr>

        `;

    }

}


/* =========================================================
   RENDER TABLE
========================================================= */

function renderSalesTable() {

    const search =
        String(
            elements.searchSales.value ||
            ""
        )
            .trim()
            .toLowerCase();


    let filtered =
        salesData.filter(
            sale => {

                if (!search) {

                    return true;

                }


                const division =
                    sale.divisions
                        ?.division_name ||
                    "";


                const brand =
                    sale.brands
                        ?.brand_name ||
                    "";


                const remarks =
                    sale.remarks ||
                    "";


                return (

                    division
                        .toLowerCase()
                        .includes(search)

                    ||

                    brand
                        .toLowerCase()
                        .includes(search)

                    ||

                    remarks
                        .toLowerCase()
                        .includes(search)

                    ||

                    String(
                        sale.sales_amount
                    ).includes(search)

                );

            }
        );


    if (!filtered.length) {

        elements.tableBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="empty-cell"
                >
                    No sales records found.
                </td>

            </tr>

        `;


        elements.filteredTotal.textContent =
            currency(0);

        return;

    }


    let total = 0;


    elements.tableBody.innerHTML =
        filtered.map(
            (sale, index) => {

                const amount =
                    Number(
                        sale.sales_amount
                    ) || 0;


                total += amount;


                const division =
                    sale.divisions
                        ?.division_name ||
                    "—";


                const brand =
                    sale.brands
                        ?.brand_name ||
                    "Not Assigned";


                return `

                    <tr>

                        <td>
                            ${index + 1}
                        </td>

                        <td>
                            ${formatDate(
                                sale.sale_date
                            )}
                        </td>

                        <td>
                            <span class="division-badge">
                                ${escapeHTML(
                                    division
                                )}
                            </span>
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    brand
                                )}
                            </strong>
                        </td>

                        <td class="text-right sales-value">
                            ${currency(
                                amount
                            )}
                        </td>

                        <td class="remarks-cell">
                            ${escapeHTML(
                                sale.remarks ||
                                "—"
                            )}
                        </td>

                        <td>

                            <div class="action-buttons">

                                <button
                                    type="button"
                                    class="edit-btn"
                                    onclick="editSale('${sale.id}')"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    class="delete-btn"
                                    onclick="deleteSale('${sale.id}')"
                                >
                                    Delete
                                </button>

                            </div>

                        </td>

                    </tr>

                `;

            }
        )
        .join("");


    elements.filteredTotal.textContent =
        currency(total);

}


/* =========================================================
   SAVE / UPDATE
========================================================= */

async function handleSubmit(
    event
) {

    event.preventDefault();


    try {

        const saleDate =
            elements.saleDate.value;


        const divisionId =
            elements.saleDivision.value;


        const brandId =
            elements.saleBrand.value;


        const salesAmount =
            Number(
                elements.salesAmount.value
            );


        const remarks =
            elements.salesRemarks.value
                .trim();


        if (!saleDate) {

            throw new Error(
                "Please select a sale date."
            );

        }


        if (!divisionId) {

            throw new Error(
                "Please select a division."
            );

        }


        if (!brandId) {

            throw new Error(
                "Please select a brand."
            );

        }


        if (
            !Number.isFinite(
                salesAmount
            ) ||
            salesAmount < 0
        ) {

            throw new Error(
                "Please enter a valid sales amount."
            );

        }


        setSaving(true);


        const payload = {

            sale_date:
                saleDate,

            sales_amount:
                salesAmount,

            division_id:
                divisionId,

            brand_id:
                brandId,

            remarks:
                remarks || null,

            updated_at:
                new Date().toISOString()

        };


        let result;


        if (editingSaleId) {

            result =
                await supabaseClient
                    .from("sales")
                    .update(payload)
                    .eq(
                        "id",
                        editingSaleId
                    );

        }

        else {

            payload.created_by =
                currentUser.id;


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
                    currentUser.id,

                action:
                    editingSaleId
                        ? "UPDATE"
                        : "INSERT",

                table_name:
                    "sales",

                record_id:
                    editingSaleId ||
                    null,

                details: {

                    sale_date:
                        saleDate,

                    sales_amount:
                        salesAmount,

                    division_id:
                        divisionId,

                    brand_id:
                        brandId,

                    remarks:
                        remarks ||
                        null

                }

            }]);


        showMessage(
            editingSaleId
                ? "Sales record updated successfully."
                : "Sales record saved successfully.",
            "success"
        );


        resetForm();

        await loadSales();

    }

    catch (error) {

        console.error(
            "Save Sale Error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to save sales.",
            "error"
        );

    }

    finally {

        setSaving(false);

    }

}


/* =========================================================
   EDIT
========================================================= */

async function editSale(
    id
) {

    const sale =
        salesData.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!sale) {

        showMessage(
            "Sales record not found.",
            "error"
        );

        return;

    }


    editingSaleId =
        sale.id;


    elements.saleId.value =
        sale.id;


    elements.saleDate.value =
        sale.sale_date;


    elements.saleDivision.value =
        sale.division_id;


    renderBrandDropdown(
        elements.saleBrand,
        sale.brand_id || ""
    );


    elements.saleBrand.value =
        sale.brand_id || "";


    elements.salesAmount.value =
        sale.sales_amount;


    elements.salesRemarks.value =
        sale.remarks || "";


    elements.formMode.textContent =
        "EDITING";


    elements.cancelEditBtn
        .classList
        .remove("hidden");


    elements.saveSaleBtn.textContent =
        "Update Sales";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


window.editSale =
    editSale;


/* =========================================================
   DELETE
========================================================= */

async function deleteSale(
    id
) {

    const sale =
        salesData.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!sale) {

        showMessage(
            "Sales record not found.",
            "error"
        );

        return;

    }


    const brand =
        sale.brands?.brand_name ||
        "Not Assigned";


    const division =
        sale.divisions?.division_name ||
        "Unknown";


    const confirmed =
        window.confirm(

            `Delete this sales record?\n\n` +

            `Date: ${formatDate(
                sale.sale_date
            )}\n` +

            `Division: ${division}\n` +

            `Brand: ${brand}\n` +

            `Sales: ${currency(
                sale.sales_amount
            )}`

        );


    if (!confirmed) {

        return;

    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("sales")
                .delete()
                .eq(
                    "id",
                    id
                );


        if (error) {

            throw error;

        }


        /* AUDIT */

        await supabaseClient
            .from("audit_logs")
            .insert([{

                user_id:
                    currentUser.id,

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

                    brand_id:
                        sale.brand_id,

                    remarks:
                        sale.remarks ||
                        null

                }

            }]);


        showMessage(
            "Sales record deleted successfully.",
            "success"
        );


        await loadSales();

    }

    catch (error) {

        console.error(
            "Delete Error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to delete sales.",
            "error"
        );

    }

}


window.deleteSale =
    deleteSale;


/* =========================================================
   RESET FORM
========================================================= */

function resetForm() {

    editingSaleId =
        null;


    elements.saleId.value =
        "";


    elements.form.reset();


    setDefaultDate();


    elements.saleBrand.disabled =
        true;


    elements.saleBrand.innerHTML =
        '<option value="">Select Division First</option>';


    elements.formMode.textContent =
        "NEW ENTRY";


    elements.saveSaleBtn.textContent =
        "Save Sales";


    elements.cancelEditBtn
        .classList
        .add("hidden");

}


/* =========================================================
   FILTER CLEAR
========================================================= */

function clearFilters() {

    elements.filterFromDate.value =
        "";

    elements.filterToDate.value =
        "";

    elements.filterDivision.value =
        "";

    elements.filterBrand.value =
        "";

    elements.searchSales.value =
        "";


    loadSales();

}


/* =========================================================
   KPI
========================================================= */

function updateKPIs() {

    const today =
        getLocalDate();


    const currentMonth =
        today.substring(
            0,
            7
        );


    let todayTotal = 0;

    let monthTotal = 0;


    salesData.forEach(
        sale => {

            const amount =
                Number(
                    sale.sales_amount
                ) || 0;


            if (
                sale.sale_date ===
                today
            ) {

                todayTotal +=
                    amount;

            }


            if (
                String(
                    sale.sale_date
                ).startsWith(
                    currentMonth
                )
            ) {

                monthTotal +=
                    amount;

            }

        }
    );


    elements.todaySales.textContent =
        currency(todayTotal);


    elements.monthSales.textContent =
        currency(monthTotal);


    elements.transactionCount.textContent =
        salesData.length;


    updateSelectedDivisionTotal();

}


/* =========================================================
   SELECTED DIVISION TOTAL
========================================================= */

function updateSelectedDivisionTotal() {

    const divisionId =
        elements.saleDivision.value;


    if (!divisionId) {

        elements.selectedDivisionTotal.textContent =
            currency(0);

        return;

    }


    const total =
        salesData
            .filter(
                sale =>
                    String(
                        sale.division_id
                    ) ===
                    String(
                        divisionId
                    )
            )
            .reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.sales_amount
                    || 0
                    ),
                0
            );


    elements.selectedDivisionTotal.textContent =
        currency(total);

}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    try {

        await supabaseClient.auth.signOut();

    }

    finally {

        window.location.replace(
            "login.html"
        );

    }

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    message,
    type
) {

    elements.message.innerHTML = `

        <div class="message ${type}">

            ${escapeHTML(
                message
            )}

        </div>

    `;


    setTimeout(
        () => {

            elements.message.innerHTML =
                "";

        },
        4000
    );

}


/* =========================================================
   SAVING STATE
========================================================= */

function setSaving(
    saving
) {

    elements.saveSaleBtn.disabled =
        saving;


    elements.saveSaleBtn.textContent =
        saving
            ? "Saving..."
            : editingSaleId
                ? "Update Sales"
                : "Save Sales";

}


/* =========================================================
   HELPERS
========================================================= */

function sortDivisions(
    a,
    b
) {

    const indexA =
        divisionOrder.indexOf(
            a.division_name
        );


    const indexB =
        divisionOrder.indexOf(
            b.division_name
        );


    if (
        indexA === -1 &&
        indexB === -1
    ) {

        return a.division_name
            .localeCompare(
                b.division_name
            );

    }


    if (indexA === -1) return 1;

    if (indexB === -1) return -1;


    return indexA - indexB;

}


function currency(
    amount
) {

    return "৳" +
        new Intl.NumberFormat(
            "en-BD",
            {
                maximumFractionDigits: 2
            }
        ).format(
            Number(amount) || 0
        );

}


function formatDate(
    dateString
) {

    if (!dateString) {

        return "—";

    }


    const parts =
        String(
            dateString
        ).split("-");


    if (
        parts.length !== 3
    ) {

        return dateString;

    }


    return `${parts[2]}-${parts[1]}-${parts[0]}`;

}


function getLocalDate() {

    const date =
        new Date();


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


function debounce(
    callback,
    delay
) {

    let timer;


    return function () {

        clearTimeout(
            timer
        );


        timer =
            setTimeout(
                callback,
                delay
            );

    };

}