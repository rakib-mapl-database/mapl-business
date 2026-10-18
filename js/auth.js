const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

function showMessage(message, type = "error") {
    loginMessage.textContent = message;
    loginMessage.className = `login-message ${type}`;
}

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const email = document
            .getElementById("email")
            .value
            .trim();

        const password = document
            .getElementById("password")
            .value;

        if (!email || !password) {
            showMessage("Please enter email and password.");
            return;
        }

        loginButton.disabled = true;
        loginButton.textContent = "Signing in...";

        showMessage("", "");

        try {

            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            if (error) {
                throw error;
            }

            if (!data.user) {
                throw new Error("User authentication failed.");
            }

            /*
             * Get user's profile and role
             */

            const { data: profile, error: profileError } =
                await supabaseClient
                    .from("profiles")
                    .select("id, full_name, email, role")
                    .eq("id", data.user.id)
                    .single();

            if (profileError) {
                await supabaseClient.auth.signOut();
                throw new Error(
                    "Profile not found. Please contact administrator."
                );
            }

            /*
             * Role validation
             */

            const allowedRoles = [
                "admin",
                "manager",
                "viewer"
            ];

            if (!allowedRoles.includes(profile.role)) {

                await supabaseClient.auth.signOut();

                throw new Error(
                    "Your account does not have a valid system role."
                );
            }

            /*
             * Save basic session information
             */

            sessionStorage.setItem(
                "mapl_user_role",
                profile.role
            );

            sessionStorage.setItem(
                "mapl_user_name",
                profile.full_name || ""
            );

            sessionStorage.setItem(
                "mapl_user_email",
                profile.email || ""
            );

            showMessage(
                `Welcome ${profile.full_name || "User"}!`,
                "success"
            );

            /*
             * Redirect
             */

            setTimeout(() => {
                window.location.href = "admin.html";
            }, 700);

        } catch (error) {

            console.error("Login Error:", error);

            showMessage(
                error.message || "Login failed. Please try again.",
                "error"
            );

            loginButton.disabled = false;
            loginButton.textContent = "Sign In";
        }

    });
}