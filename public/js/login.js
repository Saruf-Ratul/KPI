document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to dashboard
    if (localStorage.getItem('kpi_token')) {
        window.location.href = '/';
        return;
    }

    // Apply saved theme
    if (localStorage.getItem('kpi_theme') === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
        loginBtn.disabled = true;
        loginBtn.textContent = 'Authenticating...';

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok && data.token) {
                // Save token
                localStorage.setItem('kpi_token', data.token);
                localStorage.setItem('kpi_user', data.username);
                // Redirect to dashboard
                window.location.href = '/';
            } else {
                throw new Error(data.error || 'Invalid credentials');
            }
        } catch (err) {
            errorMessage.textContent = err.message;
            errorMessage.style.display = 'block';
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        }
    });
});
