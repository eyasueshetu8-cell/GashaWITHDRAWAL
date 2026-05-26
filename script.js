const API_URL = "http://localhost:3000";

// Toggle Modals (Open/Close)
function toggleModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.toggle('hidden');
    }
}

// Unified Authentication Function
async function handleAuth(type) {
    // These IDs must match the 'id' attributes on your HTML input tags
    const username = document.getElementById(`${type}-username`).value;
    const password = document.getElementById(`${type}-password`).value;

    if (!username || !password) {
        alert("Please fill in all fields");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            if (type === 'login' && data.token) {
                // Store the login token in the browser
                localStorage.setItem('gasha_token', data.token);
                localStorage.setItem('gasha_user', username);
                location.reload(); // Refresh to show logged-in state
            } else {
                toggleModal('register-modal'); // Close reg modal after success
            }
        } else {
            alert("Error: " + data.message);
        }
    } catch (error) {
        console.error("Connection error:", error);
        alert("Server is offline. Did you run 'node server.js'?");
    }
}

// Optional: Check if user is already logged in on page load
window.onload = () => {
    const savedUser = localStorage.getItem('gasha_user');
    if (savedUser) {
        console.log("Welcome back, " + savedUser);
        // You could update the UI here to show a "Deposit" button instead of Login
    }
};