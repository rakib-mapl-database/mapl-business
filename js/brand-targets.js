/* =========================================================
   MAPL BRAND TARGET MANAGEMENT
   Supabase tables:
   - divisions
   - brands
   - brand_targets
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

const moneyFormatter = new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 2
});

const currency = amount =>
    "৳" + moneyFormatter.format(Number(amount) || 0);

const elements = {
    month: document.getElementById("targetMonth"),
    division: document.getElementById("divisionSelect"),
    loadButton: document.getElementById("loadTargetsBtn"),
    saveButton: document.getElementById("saveAllTargetsBtn"),
    resetButton: document.getElementById("resetTargetsBtn"),
    tableBody: document.getElementById("targetTableBody"),
    message: document.getElementById("targetMessage"),
    totalTarget: document.getElementById("totalTarget"),
    brandsWithTarget: document.getElementById("brandsWithTarget"),
    selectedDivisionName: document.getElementById("selectedDivisionName"),
    heading: document.getElementById("targetHeading"),
    savedTotal: document.getElementById("savedTotal"),
    enteredTotal: document.getElementById("enteredTotal"),
    footerTotal: document.getElementById("footerTotal"),
    targetCountText: document.getElementById("targetCountText"),
    userName: document.getElementById("userName"),
    userRole: document.getElementById("userRole"),
    logoutButton: document.getElementById("logoutBtn")
};

let divisions = [];
let brands = [];
let savedTargets = new Map();
let originalValues = new Map();
let currentUser = null;
let isSaving = false;


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", initializeTargets);

async function initializeTargets() {
    try {
        if (!window.supabase || typeof supabaseClient === "undefined") {
            throw new Error(
                "Supabase client not found. Check js/config.js."
            );
        }

        const {
            data: { session },
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
            window.location.replace("login.html");
            return;
        }

        currentUser = session.user;

        await loadUserProfile();
        setDefaultMonth();
        await loadDivisions();
        await loadBrands();

        if (divisions.length && brands.length) {
            await loadTargets();
        } else {
            showMessage(
                "No active divisions or brands were found.",
                "error"
            );
        }

        attachEventListeners();

    } catch (error) {
        console.error("Target initialization error:", error);

        showMessage(
            error.message || "Failed to initialize target management.",
            "error"
        );
    }
}


/* =========================================================
   USER PROFILE
========================================================= */

async function loadUserProfile() {
    if (!currentUser) return;

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) {
        console.warn("Could not load profile:", error.message);
        return;
    }

    if (data) {
        elements.userName.textContent =
            data.full_name || data.email || "User";

        elements.userRole.textContent =
            String(data.role || "USER").toUpperCase();
    } else {
        elements.userName.textContent =
            currentUser.email || "User";
    }
}


/* =========================================================
   DEFAULT MONTH
========================================================= */

function setDefaultMonth() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    elements.month.value = `${year}-${month}`;
}


/* =========================================================
   LOAD DIVISIONS
========================================================= */

async function loadDivisions() {
    const { data, error } = await supabaseClient
        .from("divisions")
        .select("id, division_name, active")
        .eq("active", true);

    if (error) throw error;

    divisions = (data || []).sort((a, b) => {
        const indexA = divisionOrder.indexOf(a.division_name);
        const indexB = divisionOrder.indexOf(b.division_name);

        if (indexA === -1 && indexB === -1) {
            return a.division_name.localeCompare(b.division_name);
        }

        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return indexA - indexB;
    });

    elements.division.innerHTML = "";

    if (!divisions.length) {
        elements.division.innerHTML =
            '<option value="">No active divisions</option>';
        return;
    }

    divisions.forEach(division => {
        const option = document.createElement("option");

        option.value = division.id;
        option.textContent = division.division_name;

        elements.division.appendChild(option);
    });
}


/* =========================================================
   LOAD BRANDS
========================================================= */

async function loadBrands() {
    const { data, error } = await supabaseClient
        .from("brands")
        .select("id, brand_name, active")
        .eq("active", true);

    if (error) throw error;

    brands = (data || []).sort((a, b) =>
        a.brand_name.localeCompare(b.brand_name)
    );
}


/* =========================================================
   LOAD TARGETS
========================================================= */

async function loadTargets() {
    const divisionId = elements.division.value;
    const monthValue = elements.month.value;

    if (!divisionId || !monthValue) {
        showMessage("Select a month and division first.", "error");
        return;
    }

    setLoading(true);
    hideMessage();

    try {
        const targetMonth = `${monthValue}-01`;

        const { data, error } = await supabaseClient
            .from("brand_targets")
            .select(`
                id,
                division_id,
                brand_id,
                target_month,
                target_amount,
                remarks,
                updated_at
            `)
            .eq("division_id", divisionId)
            .eq("target_month", targetMonth);

        if (error) throw error;

        savedTargets.clear();

        (data || []).forEach(target => {
            savedTargets.set(
                target.brand_id,
                Number(target.target_amount) || 0
            );
        });

        originalValues = new Map(savedTargets);

        renderTargetTable();

    } catch (error) {
        console.error("Load targets error:", error);

        showMessage(
            error.message || "Unable to load brand targets.",
            "error"
        );
    } finally {
        setLoading(false);
    }
}


/* =========================================================
   RENDER TABLE
========================================================= */

function renderTargetTable() {
    const division = divisions.find(
        item => item.id === elements.division.value
    );

    const monthLabel = getMonthLabel(elements.month.value);

    elements.selectedDivisionName.textContent =
        division ? division.division_name : "—";

    elements.heading.textContent =
        `${division ? division.division_name : "Division"} — ${monthLabel} Brand Targets`;

    elements.tableBody.innerHTML = "";

    if (!brands.length) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-row">
                    No active brands found.
                </td>
            </tr>
        `;

        updateSummary();
        return;
    }

    brands.forEach((brand, index) => {
        const savedAmount = savedTargets.get(brand.id) || 0;

        const row = document.createElement("tr");
        row.dataset.brandId = brand.id;

        row.innerHTML = `
            <td>${index + 1}</td>

            <td class="brand-name"></td>

            <td class="amount saved-amount">
                ${currency(savedAmount)}
            </td>

            <td>
                <input
                    type="number"
                    class="brand-target-input"
                    data-brand-id="${brand.id}"
                    min="0"
                    step="0.01"
                    inputmode="decimal"
                    value="${savedAmount}"
                    aria-label="${escapeHtml(brand.brand_name)} target"
                >
            </td>

            <td>
                <span class="target-status saved status-label">
                    ${savedTargets.has(brand.id) ? "Saved" : "Not Set"}
                </span>
            </td>
        `;

        row.querySelector(".brand-name").textContent =
            brand.brand_name;

        elements.tableBody.appendChild(row);
    });

    elements.targetCountText.textContent =
        `${brands.length} active brands`;

    updateSummary();
}


/* =========================================================
   SUMMARY + DIRTY STATUS
========================================================= */

function updateSummary() {
    const inputs = [
        ...document.querySelectorAll(".brand-target-input")
    ];

    let total = 0;
    let count = 0;
    let savedTotal = 0;

    inputs.forEach(input => {
        const brandId = input.dataset.brandId;
        const value = getInputValue(input);

        total += value;

        if (value > 0) count++;

        savedTotal += savedTargets.get(brandId) || 0;

        const status = input
            .closest("tr")
            .querySelector(".status-label");

        const original = originalValues.get(brandId) || 0;

        if (value !== original) {
            status.textContent = "Modified";
            status.className = "target-status pending status-label";
        } else if (savedTargets.has(brandId)) {
            status.textContent = "Saved";
            status.className = "target-status saved status-label";
        } else {
            status.textContent = "Not Set";
            status.className = "target-status status-label";
        }
    });

    elements.totalTarget.textContent = currency(total);
    elements.brandsWithTarget.textContent = `${count} / ${brands.length}`;
    elements.savedTotal.textContent = currency(savedTotal);
    elements.enteredTotal.textContent = currency(total);
    elements.footerTotal.textContent = `Total: ${currency(total)}`;
}


/* =========================================================
   SAVE ALL TARGETS
========================================================= */

async function saveAllTargets() {
    if (isSaving) return;

    const divisionId = elements.division.value;
    const monthValue = elements.month.value;

    if (!divisionId || !monthValue) {
        showMessage("Select a month and division first.", "error");
        return;
    }

    const targetMonth = `${monthValue}-01`;

    const inputs = [
        ...document.querySelectorAll(".brand-target-input")
    ];

    const rows = [];

    for (const input of inputs) {
        const amount = getInputValue(input);

        if (!Number.isFinite(amount) || amount < 0) {
            showMessage(
                "Target must be a valid non-negative amount.",
                "error"
            );
            input.focus();
            return;
        }

        rows.push({
            division_id: divisionId,
            brand_id: input.dataset.brandId,
            target_month: targetMonth,
            target_amount: amount,
            created_by: currentUser ? currentUser.id : null
        });
    }

    if (!rows.length) {
        showMessage("No brand targets to save.", "error");
        return;
    }

    isSaving = true;
    elements.saveButton.disabled = true;
    elements.saveButton.textContent = "Saving...";

    try {
        const { error } = await supabaseClient
            .from("brand_targets")
            .upsert(rows, {
                onConflict: "division_id,brand_id,target_month"
            });

        if (error) throw error;

        await loadTargets();

        showMessage(
            `All ${rows.length} brand targets saved successfully.`,
            "success"
        );

    } catch (error) {
        console.error("Save targets error:", error);

        showMessage(
            error.message || "Failed to save targets.",
            "error"
        );
    } finally {
        isSaving = false;
        elements.saveButton.disabled = false;
        elements.saveButton.textContent = "Save All Targets";
    }
}


/* =========================================================
   RESET UNSAVED CHANGES
========================================================= */

function resetChanges() {
    const inputs = [
        ...document.querySelectorAll(".brand-target-input")
    ];

    inputs.forEach(input => {
        input.value = originalValues.get(input.dataset.brandId) || 0;
    });

    updateSummary();
    hideMessage();
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function attachEventListeners() {
    elements.loadButton.addEventListener("click", loadTargets);

    elements.division.addEventListener("change", loadTargets);

    elements.month.addEventListener("change", loadTargets);

    elements.saveButton.addEventListener("click", saveAllTargets);

    elements.resetButton.addEventListener("click", resetChanges);

    elements.tableBody.addEventListener("input", event => {
        if (event.target.classList.contains("brand-target-input")) {
            updateSummary();
        }
    });

    elements.logoutButton.addEventListener("click", logout);
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {
    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error("Logout error:", error);
        }
    } catch (error) {
        console.error("Logout failed:", error);
    } finally {
        window.location.replace("login.html");
    }
}


/* =========================================================
   HELPERS
========================================================= */

function getInputValue(input) {
    const value = Number(input.value);

    if (input.value.trim() === "") return 0;

    return Number.isFinite(value) ? value : NaN;
}

function getMonthLabel(value) {
    if (!value) return "Selected Month";

    const [year, month] = value.split("-").map(Number);

    return new Date(year, month - 1, 1).toLocaleDateString(
        "en-US",
        {
            month: "long",
            year: "numeric"
        }
    );
}

function showMessage(message, type = "info") {
    elements.message.textContent = message;
    elements.message.className = `target-message ${type}`;
}

function hideMessage() {
    elements.message.textContent = "";
    elements.message.className = "target-message";
}

function setLoading(loading) {
    elements.loadButton.disabled = loading;

    if (loading) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-row">
                    Loading brand targets...
                </td>
            </tr>
        `;
    } else {
        elements.loadButton.disabled = false;
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}