/* =========================================================
   MAPL SALES ANALYSIS
   TARGET MANAGEMENT
   Supabase + GitHub Pages
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
let currentProfile = null;
let divisions = [];
let targetChanges = {};


// =========================================================
// INITIALIZE
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {

    try {

        await checkAuthentication();

        setupEventListeners();

        await loadUserProfile();

        await loadDivisions();

    } catch (error) {

        console.error("Target Management Error:", error);

        showMessage(
            error.message || "Unable to load target management.",
            "error"
        );

    }

});


// =========================================================
// AUTHENTICATION
// =========================================================

async function checkAuthentication() {

    const {
        data,
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        throw error;
    }

    if (!data.session) {

        window.location.href = "login.html";

        return;

    }

    currentUser = data.session.user;

}


// =========================================================
// USER PROFILE
// =========================================================

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

        console.error("Profile error:", error);

        return;

    }


    currentProfile = data;


    const userName =
        document.getElementById("userName");

    const userRole =
        document.getElementById("userRole");


    if (userName) {

        userName.textContent =
            data.full_name || "Administrator";

    }


    if (userRole) {

        userRole.textContent =
            String(data.role || "ADMIN").toUpperCase();

    }


    /*
        Target management permission
    */

    if (
        data.role !== "admin" &&
        data.role !== "manager"
    ) {

        alert(
            "You do not have permission to manage targets."
        );

        window.location.href = "admin.html";

        return;

    }

}


// =========================================================
// EVENT LISTENERS
// =========================================================

function setupEventListeners() {

    const saveButton =
        document.getElementById("saveAllTargetsBtn");


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveAllTargets
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


// =========================================================
// LOAD DIVISIONS
// =========================================================

async function loadDivisions() {

    showLoading();


    const {
        data,
        error
    } = await supabaseClient

        .from("divisions")

        .select(
            "id, division_name, monthly_target, active"
        )

        .eq("active", true);


    if (error) {

        console.error(
            "Division loading error:",
            error
        );

        throw error;

    }


    divisions = data || [];


    /*
        IMPORTANT:
        Never alphabetically sort divisions.
    */

    divisions.sort((a, b) => {

        const aIndex =
            divisionOrder.indexOf(a.division_name);

        const bIndex =
            divisionOrder.indexOf(b.division_name);


        const safeA =
            aIndex === -1 ? 999 : aIndex;

        const safeB =
            bIndex === -1 ? 999 : bIndex;


        return safeA - safeB;

    });


    renderTargetTable();

    updateSummary();

}


// =========================================================
// RENDER TARGET TABLE
// =========================================================

function renderTargetTable() {

    const tbody =
        document.getElementById("targetTableBody");


    if (!tbody) return;


    if (!divisions.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6"
                    style="text-align:center;">
                    No active divisions found.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML = "";


    divisions.forEach((division, index) => {

        const target =
            Number(division.monthly_target || 0);


        const formattedTarget =
            formatCurrency(target);


        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                ${index + 1}
            </td>


            <td>
                <strong class="target-division">
                    ${escapeHtml(
                        division.division_name
                    )}
                </strong>
            </td>


            <td>
                <strong>
                    ${formattedTarget}
                </strong>
            </td>


            <td>

                <input
                    type="number"
                    class="target-input"
                    data-division-id="${division.id}"
                    data-original="${target}"
                    value="${target}"
                    min="0"
                    step="0.01"
                    aria-label="${escapeHtml(
                        division.division_name
                    )} target"
                >

            </td>


            <td>

                <span
                    id="change-${division.id}"
                    class="target-change same"
                >
                    No Change
                </span>

            </td>


            <td>

                <span
                    id="status-${division.id}"
                    class="target-status saved"
                >
                    Saved
                </span>

            </td>

        `;


        tbody.appendChild(row);


        const input =
            row.querySelector(".target-input");


        input.addEventListener(
            "input",
            () => {

                handleTargetChange(
                    division.id,
                    input.value
                );

            }
        );

    });

}


// =========================================================
// HANDLE TARGET CHANGE
// =========================================================

function handleTargetChange(
    divisionId,
    value
) {

    const input =
        document.querySelector(
            `.target-input[data-division-id="${divisionId}"]`
        );


    if (!input) return;


    const original =
        Number(
            input.dataset.original || 0
        );


    let newValue =
        Number(value || 0);


    if (newValue < 0) {

        newValue = 0;

        input.value = 0;

    }


    const difference =
        newValue - original;


    const changeElement =
        document.getElementById(
            `change-${divisionId}`
        );


    const statusElement =
        document.getElementById(
            `status-${divisionId}`
        );


    if (difference === 0) {

        delete targetChanges[divisionId];


        if (changeElement) {

            changeElement.textContent =
                "No Change";

            changeElement.className =
                "target-change same";

        }


        if (statusElement) {

            statusElement.textContent =
                "Saved";

            statusElement.className =
                "target-status saved";

        }


        return;

    }


    targetChanges[divisionId] =
        newValue;


    if (changeElement) {

        const sign =
            difference > 0 ? "+" : "";

        changeElement.textContent =
            sign + formatCurrency(difference);

        changeElement.className =
            difference > 0
                ? "target-change increase"
                : "target-change decrease";

    }


    if (statusElement) {

        statusElement.textContent =
            "Changed";

        statusElement.className =
            "target-status changed";

    }

}


// =========================================================
// SAVE ALL TARGETS
// =========================================================

async function saveAllTargets() {

    const saveButton =
        document.getElementById(
            "saveAllTargetsBtn"
        );


    const changes =
        Object.keys(targetChanges);


    /*
        Nothing changed
    */

    if (!changes.length) {

        showMessage(
            "No target changes to save.",
            "error"
        );

        return;

    }


    /*
        Disable button
    */

    if (saveButton) {

        saveButton.disabled = true;

        saveButton.textContent =
            "Saving...";

    }


    clearMessage();


    try {

        /*
            Check permission
        */

        if (
            !currentProfile ||
            (
                currentProfile.role !== "admin" &&
                currentProfile.role !== "manager"
            )
        ) {

            throw new Error(
                "You do not have permission to update targets."
            );

        }


        /*
            Save one by one
        */

        for (const divisionId of changes) {

            const newTarget =
                Number(
                    targetChanges[divisionId]
                );


            if (
                Number.isNaN(newTarget) ||
                newTarget < 0
            ) {

                throw new Error(
                    "Invalid target amount found."
                );

            }


            const division =
                divisions.find(
                    item =>
                        item.id === divisionId
                );


            if (!division) {

                throw new Error(
                    "Division not found."
                );

            }


            const oldTarget =
                Number(
                    division.monthly_target || 0
                );


            /*
                UPDATE SUPABASE
            */

            const {
                data,
                error
            } = await supabaseClient

                .from("divisions")

                .update({
                    monthly_target: newTarget
                })

                .eq("id", divisionId)

                .select()
                .single();


            if (error) {

                console.error(
                    "Target update error:",
                    error
                );

                throw new Error(
                    `Failed to update ${division.division_name}: ${error.message}`
                );

            }


            /*
                Update local data
            */

            division.monthly_target =
                Number(
                    data.monthly_target
                );


            /*
                AUDIT LOG
            */

            await createAuditLog({

                action: "UPDATE_TARGET",

                table_name: "divisions",

                record_id: divisionId,

                details: {

                    division:
                        division.division_name,

                    old_target:
                        oldTarget,

                    new_target:
                        newTarget

                }

            });

        }


        /*
            Clear changes
        */

        targetChanges = {};


        /*
            Re-render
        */

        renderTargetTable();

        updateSummary();


        /*
            Success
        */

        showMessage(
            "All target changes have been saved successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Save targets error:",
            error
        );


        showMessage(
            error.message ||
            "Failed to save targets.",
            "error"
        );


        /*
            Reload database values
            so UI doesn't remain misleading.
        */

        try {

            await loadDivisions();

        } catch (reloadError) {

            console.error(
                "Reload error:",
                reloadError
            );

        }


    } finally {

        if (saveButton) {

            saveButton.disabled = false;

            saveButton.textContent =
                "Save All Targets";

        }

    }

}


// =========================================================
// AUDIT LOG
// =========================================================

async function createAuditLog({
    action,
    table_name,
    record_id,
    details
}) {

    try {

        const {
            error
        } = await supabaseClient

            .from("audit_logs")

            .insert({

                user_id:
                    currentUser
                        ? currentUser.id
                        : null,

                action:
                    action,

                table_name:
                    table_name,

                record_id:
                    record_id,

                details:
                    details

            });


        if (error) {

            /*
                Audit failure should NOT
                cancel a successful target update.
            */

            console.warn(
                "Audit log failed:",
                error.message
            );

        }

    } catch (error) {

        console.warn(
            "Audit log exception:",
            error
        );

    }

}


// =========================================================
// UPDATE SUMMARY
// =========================================================

function updateSummary() {

    const activeDivisions =
        divisions.filter(
            division => division.active !== false
        );


    const totalTarget =
        activeDivisions.reduce(
            (sum, division) =>
                sum +
                Number(
                    division.monthly_target || 0
                ),
            0
        );


    const averageTarget =
        activeDivisions.length
            ? totalTarget /
              activeDivisions.length
            : 0;


    const totalTargetElement =
        document.getElementById(
            "totalTarget"
        );


    const activeDivisionsElement =
        document.getElementById(
            "activeDivisions"
        );


    const averageTargetElement =
        document.getElementById(
            "averageTarget"
        );


    const targetStatusElement =
        document.getElementById(
            "targetStatus"
        );


    const totalDivisionsElement =
        document.getElementById(
            "totalDivisions"
        );


    const activeTargetAmountElement =
        document.getElementById(
            "activeTargetAmount"
        );


    const lastUpdatedElement =
        document.getElementById(
            "lastUpdated"
        );


    if (totalTargetElement) {

        totalTargetElement.textContent =
            formatCurrency(totalTarget);

    }


    if (activeDivisionsElement) {

        activeDivisionsElement.textContent =
            activeDivisions.length;

    }


    if (averageTargetElement) {

        averageTargetElement.textContent =
            formatCurrency(averageTarget);

    }


    if (targetStatusElement) {

        targetStatusElement.textContent =
            activeDivisions.length
                ? "Active"
                : "Inactive";

    }


    if (totalDivisionsElement) {

        totalDivisionsElement.textContent =
            divisions.length;

    }


    if (activeTargetAmountElement) {

        activeTargetAmountElement.textContent =
            formatCurrency(totalTarget);

    }


    if (lastUpdatedElement) {

        lastUpdatedElement.textContent =
            formatDateTime(new Date());

    }

}


// =========================================================
// LOADING STATE
// =========================================================

function showLoading() {

    const tbody =
        document.getElementById(
            "targetTableBody"
        );


    if (!tbody) return;


    tbody.innerHTML = `

        <tr>

            <td
                colspan="6"
                style="text-align:center;"
            >

                Loading target data...

            </td>

        </tr>

    `;

}


// =========================================================
// MESSAGE
// =========================================================

function showMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "targetMessage"
        );


    if (!element) return;


    if (type === "success") {

        element.innerHTML = `

            <div class="target-success">

                ✓ ${escapeHtml(message)}

            </div>

        `;

    } else {

        element.innerHTML = `

            <div class="target-error">

                ⚠ ${escapeHtml(message)}

            </div>

        `;

    }


    /*
        Automatically hide success message
    */

    if (type === "success") {

        setTimeout(() => {

            clearMessage();

        }, 5000);

    }

}


// =========================================================
// CLEAR MESSAGE
// =========================================================

function clearMessage() {

    const element =
        document.getElementById(
            "targetMessage"
        );


    if (element) {

        element.innerHTML = "";

    }

}


// =========================================================
// LOGOUT
// =========================================================

async function logout() {

    const confirmed =
        confirm(
            "Are you sure you want to sign out?"
        );


    if (!confirmed) return;


    try {

        await supabaseClient.auth.signOut();

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }


    window.location.href =
        "login.html";

}


// =========================================================
// CURRENCY
// =========================================================

function formatCurrency(amount) {

    return "৳" +
        Number(amount || 0).toLocaleString(
            "en-BD",
            {
                maximumFractionDigits: 2
            }
        );

}


// =========================================================
// DATE TIME
// =========================================================

function formatDateTime(date) {

    return date.toLocaleString(
        "en-BD",
        {
            year: "numeric",

            month: "short",

            day: "2-digit",

            hour: "2-digit",

            minute: "2-digit"
        }
    );

}


// =========================================================
// HTML ESCAPE
// =========================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}