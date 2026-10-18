/* =========================================================
   MAPL BRAND MANAGEMENT
   ========================================================= */

"use strict";


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let allBrands = [];

let editingBrandId = null;
let deletingBrandId = null;


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const brandModal = document.getElementById("brandModal");
const deleteModal = document.getElementById("deleteModal");

const brandForm = document.getElementById("brandForm");

const brandIdInput = document.getElementById("brandId");
const brandNameInput = document.getElementById("brandName");
const brandActiveInput = document.getElementById("brandActive");
const brandRemarksInput = document.getElementById("brandRemarks");

const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");

const statusText = document.getElementById("statusText");

const saveBrandBtn = document.getElementById("saveBrandBtn");
const saveBtnText = document.getElementById("saveBtnText");

const modalMessage = document.getElementById("modalMessage");

const messageBox = document.getElementById("messageBox");

const brandTableBody = document.getElementById("brandTableBody");

const totalBrands = document.getElementById("totalBrands");
const activeBrands = document.getElementById("activeBrands");
const inactiveBrands = document.getElementById("inactiveBrands");

const resultCount = document.getElementById("resultCount");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    try {

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient
        ) {

            throw new Error(
                "Supabase client is not available. Check js/config.js."
            );

        }


        await checkAuthentication();

        bindEvents();

        await loadBrands();

    } catch (error) {

        console.error(error);

        showMessage(
            error.message || "Unable to load Brand Management.",
            "error"
        );

    }

});


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function checkAuthentication() {

    const {
        data,
        error
    } = await supabaseClient.auth.getSession();


    if (error) {
        throw error;
    }


    const session = data?.session;


    if (!session) {

        window.location.replace("login.html");

        return;

    }


    currentUser = session.user;


    document.getElementById("userEmail").textContent =
        currentUser.email || "";


    /* =========================================
       LOAD PROFILE
    ========================================= */

    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", currentUser.id)
        .single();


    if (profileError) {

        throw new Error(
            "Unable to verify your administrator profile."
        );

    }


    currentProfile = profile;


    document.getElementById("userName").textContent =
        profile.full_name ||
        profile.email ||
        "Administrator";


    /* =========================================
       ADMIN CHECK
    ========================================= */

    if (profile.role !== "admin") {

        showMessage(
            "Access denied. Only administrators can manage brands.",
            "error"
        );

        setTimeout(() => {

            window.location.replace("admin.html");

        }, 1500);

        throw new Error(
            "Administrator access required."
        );

    }

}


/* =========================================================
   EVENTS
   ========================================================= */

function bindEvents() {

    /* Add Brand */

    document
        .getElementById("openAddModalBtn")
        .addEventListener("click", openAddModal);


    /* Close modal */

    document
        .getElementById("closeModalBtn")
        .addEventListener("click", closeBrandModal);


    document
        .getElementById("cancelBtn")
        .addEventListener("click", closeBrandModal);


    /* Form submit */

    brandForm.addEventListener(
        "submit",
        saveBrand
    );


    /* Status switch */

    brandActiveInput.addEventListener(
        "change",
        updateStatusText
    );


    /* Search */

    searchInput.addEventListener(
        "input",
        renderBrands
    );


    /* Status filter */

    statusFilter.addEventListener(
        "change",
        renderBrands
    );


    /* Clear search */

    document
        .getElementById("clearSearchBtn")
        .addEventListener("click", () => {

            searchInput.value = "";

            renderBrands();

            searchInput.focus();

        });


    /* Refresh */

    document
        .getElementById("refreshBtn")
        .addEventListener(
            "click",
            loadBrands
        );


    /* Logout */

    document
        .getElementById("logoutBtn")
        .addEventListener(
            "click",
            logout
        );


    /* Cancel delete */

    document
        .getElementById("cancelDeleteBtn")
        .addEventListener(
            "click",
            closeDeleteModal
        );


    /* Confirm delete */

    document
        .getElementById("confirmDeleteBtn")
        .addEventListener(
            "click",
            confirmDelete
        );


    /* Close modal by background */

    brandModal.addEventListener(
        "click",
        event => {

            if (event.target === brandModal) {
                closeBrandModal();
            }

        }
    );


    deleteModal.addEventListener(
        "click",
        event => {

            if (event.target === deleteModal) {
                closeDeleteModal();
            }

        }
    );


    /* ESC key */

    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {

                closeBrandModal();

                closeDeleteModal();

            }

        }
    );

}


/* =========================================================
   LOAD BRANDS
   ========================================================= */

async function loadBrands() {

    showTableLoading();


    const {
        data,
        error
    } = await supabaseClient
        .from("brands")
        .select(`
            id,
            brand_name,
            active,
            created_at
        `)
        .order("brand_name", {
            ascending: true
        });


    if (error) {

        console.error(error);

        showTableError(
            "Unable to load brands: " + error.message
        );

        return;

    }


    allBrands = data || [];


    updateSummary();

    renderBrands();

}


/* =========================================================
   SUMMARY
   ========================================================= */

function updateSummary() {

    const total = allBrands.length;

    const active = allBrands.filter(
        brand => brand.active === true
    ).length;

    const inactive = allBrands.filter(
        brand => brand.active !== true
    ).length;


    totalBrands.textContent = total;

    activeBrands.textContent = active;

    inactiveBrands.textContent = inactive;

}


/* =========================================================
   RENDER BRANDS
   ========================================================= */

function renderBrands() {

    const searchTerm =
        searchInput.value
            .trim()
            .toLowerCase();


    const filter =
        statusFilter.value;


    let filtered = allBrands.filter(
        brand => {

            const name =
                String(
                    brand.brand_name || ""
                ).toLowerCase();


            const matchesSearch =
                !searchTerm ||
                name.includes(searchTerm);


            let matchesStatus = true;


            if (filter === "active") {

                matchesStatus =
                    brand.active === true;

            }


            if (filter === "inactive") {

                matchesStatus =
                    brand.active !== true;

            }


            return (
                matchesSearch &&
                matchesStatus
            );

        }
    );


    resultCount.textContent =
        `${filtered.length} brand${filtered.length === 1 ? "" : "s"}`;


    if (!filtered.length) {

        brandTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-cell">
                    No brands found.
                </td>
            </tr>
        `;

        return;

    }


    brandTableBody.innerHTML =
        filtered
            .map((brand, index) =>
                createBrandRow(
                    brand,
                    index + 1
                )
            )
            .join("");

}


/* =========================================================
   CREATE TABLE ROW
   ========================================================= */

function createBrandRow(
    brand,
    index
) {

    const statusClass =
        brand.active
            ? "active"
            : "inactive";


    const statusTextValue =
        brand.active
            ? "Active"
            : "Inactive";


    const createdDate =
        formatDate(brand.created_at);


    return `
        <tr>

            <td>
                ${index}
            </td>

            <td>
                <div class="brand-name">
                    ${escapeHtml(
                        brand.brand_name
                    )}
                </div>
            </td>

            <td>

                <span class="status-badge ${statusClass}">

                    <span class="status-dot"></span>

                    ${statusTextValue}

                </span>

            </td>

            <td>
                ${createdDate}
            </td>

            <td>
                ${createdDate}
            </td>

            <td>

                <div class="action-buttons">

                    <button
                        class="action-btn edit"
                        title="Edit Brand"
                        onclick="openEditModal('${brand.id}')">

                        ✎

                    </button>


                    <button
                        class="action-btn delete"
                        title="Delete Brand"
                        onclick="openDeleteModal('${brand.id}')">

                        🗑

                    </button>

                </div>

            </td>

        </tr>
    `;

}


/* =========================================================
   ADD MODAL
   ========================================================= */

function openAddModal() {

    editingBrandId = null;

    brandForm.reset();


    brandIdInput.value = "";

    brandActiveInput.checked = true;

    updateStatusText();


    modalTitle.textContent =
        "Add New Brand";


    modalSubtitle.textContent =
        "Create a new product brand.";


    saveBtnText.textContent =
        "Save Brand";


    clearModalMessage();


    brandModal.classList.add("show");


    setTimeout(() => {

        brandNameInput.focus();

    }, 100);

}


/* =========================================================
   EDIT MODAL
   ========================================================= */

function openEditModal(id) {

    const brand =
        allBrands.find(
            item => item.id === id
        );


    if (!brand) {

        showMessage(
            "Brand not found.",
            "error"
        );

        return;

    }


    editingBrandId = id;


    brandIdInput.value =
        brand.id;


    brandNameInput.value =
        brand.brand_name || "";


    brandActiveInput.checked =
        brand.active === true;


    brandRemarksInput.value = "";


    updateStatusText();


    modalTitle.textContent =
        "Edit Brand";


    modalSubtitle.textContent =
        "Update brand information.";


    saveBtnText.textContent =
        "Update Brand";


    clearModalMessage();


    brandModal.classList.add("show");


    setTimeout(() => {

        brandNameInput.focus();

        brandNameInput.select();

    }, 100);

}


/* =========================================================
   CLOSE BRAND MODAL
   ========================================================= */

function closeBrandModal() {

    brandModal.classList.remove("show");

    editingBrandId = null;

    clearModalMessage();

}


/* =========================================================
   STATUS TEXT
   ========================================================= */

function updateStatusText() {

    statusText.textContent =
        brandActiveInput.checked
            ? "Active"
            : "Inactive";

}


/* =========================================================
   SAVE BRAND
   ========================================================= */

async function saveBrand(event) {

    event.preventDefault();


    const brandName =
        brandNameInput.value.trim();


    const active =
        brandActiveInput.checked;


    if (!brandName) {

        showModalMessage(
            "Please enter a brand name.",
            "error"
        );

        brandNameInput.focus();

        return;

    }


    if (brandName.length < 2) {

        showModalMessage(
            "Brand name must contain at least 2 characters.",
            "error"
        );

        return;

    }


    /* =========================================
       DUPLICATE CHECK
    ========================================= */

    const duplicate =
        allBrands.find(brand => {

            const existingName =
                String(
                    brand.brand_name || ""
                )
                    .trim()
                    .toLowerCase();


            const newName =
                brandName.toLowerCase();


            return (
                existingName === newName &&
                brand.id !== editingBrandId
            );

        });


    if (duplicate) {

        showModalMessage(
            `Brand "${duplicate.brand_name}" already exists.`,
            "error"
        );

        return;

    }


    setSavingState(true);


    try {

        if (editingBrandId) {

            /* =========================================
               UPDATE
            ========================================= */

            const {
                error
            } = await supabaseClient
                .from("brands")
                .update({
                    brand_name: brandName,
                    active: active
                })
                .eq(
                    "id",
                    editingBrandId
                );


            if (error) {
                throw error;
            }


            closeBrandModal();


            showMessage(
                `Brand "${brandName}" updated successfully.`,
                "success"
            );


        } else {

            /* =========================================
               INSERT
            ========================================= */

            const {
                error
            } = await supabaseClient
                .from("brands")
                .insert({
                    brand_name: brandName,
                    active: active
                });


            if (error) {
                throw error;
            }


            closeBrandModal();


            showMessage(
                `Brand "${brandName}" added successfully.`,
                "success"
            );

        }


        await loadBrands();


    } catch (error) {

        console.error(error);


        let errorMessage =
            error.message ||
            "Unable to save brand.";


        if (
            errorMessage
                .toLowerCase()
                .includes("duplicate")
        ) {

            errorMessage =
                "This brand name already exists.";

        }


        showModalMessage(
            errorMessage,
            "error"
        );


    } finally {

        setSavingState(false);

    }

}


/* =========================================================
   SAVING STATE
   ========================================================= */

function setSavingState(isSaving) {

    saveBrandBtn.disabled =
        isSaving;


    saveBtnText.textContent =
        isSaving
            ? "Saving..."
            : (
                editingBrandId
                    ? "Update Brand"
                    : "Save Brand"
            );

}


/* =========================================================
   DELETE MODAL
   ========================================================= */

function openDeleteModal(id) {

    const brand =
        allBrands.find(
            item => item.id === id
        );


    if (!brand) {

        showMessage(
            "Brand not found.",
            "error"
        );

        return;

    }


    deletingBrandId =
        brand.id;


    document.getElementById(
        "deleteBrandName"
    ).textContent =
        brand.brand_name;


    deleteModal.classList.add("show");

}


/* =========================================================
   CLOSE DELETE MODAL
   ========================================================= */

function closeDeleteModal() {

    deleteModal.classList.remove("show");

    deletingBrandId = null;

}


/* =========================================================
   CONFIRM DELETE
   ========================================================= */

async function confirmDelete() {

    if (!deletingBrandId) {
        return;
    }


    const brand =
        allBrands.find(
            item => item.id === deletingBrandId
        );


    if (!brand) {

        closeDeleteModal();

        return;

    }


    const deleteButton =
        document.getElementById(
            "confirmDeleteBtn"
        );


    deleteButton.disabled = true;

    deleteButton.textContent =
        "Deleting...";


    try {

        const {
            error
        } = await supabaseClient
            .from("brands")
            .delete()
            .eq(
                "id",
                deletingBrandId
            );


        if (error) {

            /* =========================================
               FOREIGN KEY / SALES REFERENCE
            ========================================= */

            if (
                error.code === "23503" ||
                (
                    error.message &&
                    error.message
                        .toLowerCase()
                        .includes("foreign key")
                )
            ) {

                throw new Error(
                    `Brand "${brand.brand_name}" is already used in sales records. It cannot be permanently deleted. Please edit the brand and set it to Inactive instead.`
                );

            }


            throw error;

        }


        closeDeleteModal();


        showMessage(
            `Brand "${brand.brand_name}" deleted successfully.`,
            "success"
        );


        await loadBrands();


    } catch (error) {

        console.error(error);


        closeDeleteModal();


        showMessage(
            error.message ||
            "Unable to delete brand.",
            "error"
        );


    } finally {

        deleteButton.disabled = false;

        deleteButton.textContent =
            "Delete Brand";

    }

}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

    const button =
        document.getElementById(
            "logoutBtn"
        );


    button.disabled = true;

    button.textContent =
        "Signing Out...";


    try {

        await supabaseClient.auth.signOut();

        window.location.replace(
            "login.html"
        );

    } catch (error) {

        console.error(error);

        button.disabled = false;

        button.textContent =
            "Sign Out";

    }

}


/* =========================================================
   TABLE LOADING
   ========================================================= */

function showTableLoading() {

    brandTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="loading-cell">
                Loading brands...
            </td>
        </tr>
    `;

}


/* =========================================================
   TABLE ERROR
   ========================================================= */

function showTableError(message) {

    brandTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-cell">
                ${escapeHtml(message)}
            </td>
        </tr>
    `;

}


/* =========================================================
   MAIN MESSAGE
   ========================================================= */

function showMessage(
    message,
    type = "info"
) {

    messageBox.textContent =
        message;

    messageBox.className =
        `message-box ${type}`;


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    clearTimeout(
        showMessage.timeout
    );


    showMessage.timeout =
        setTimeout(() => {

            messageBox.className =
                "message-box";

            messageBox.textContent =
                "";

        }, 5000);

}


/* =========================================================
   MODAL MESSAGE
   ========================================================= */

function showModalMessage(
    message,
    type = "error"
) {

    modalMessage.textContent =
        message;

    modalMessage.className =
        `modal-message ${type}`;

}


/* =========================================================
   CLEAR MODAL MESSAGE
   ========================================================= */

function clearModalMessage() {

    modalMessage.textContent =
        "";

    modalMessage.className =
        "modal-message";

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }


    const date =
        new Date(dateString);


    if (Number.isNaN(date.getTime())) {
        return "-";
    }


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}