document.addEventListener('DOMContentLoaded', () => {
    showContainer('login-container');

    document.getElementById('login-form').addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(this);
        fetch('/login', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    });

    document.getElementById('create-account-form').addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(this);
        fetch('/create-account', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            if (data.message.includes('Account created successfully')) {
                showContainer('login-container');
            }
        })
        .catch(error => console.error('Error:', error));
    });

    document.getElementById('forgot-password-form').addEventListener('input', function() {
        const email = document.getElementById('forgot-email').value;
        const code = document.getElementById('verification-code').value;
        if (email && code) {
            fetch('/verify-code', {
                method: 'POST',
                body: JSON.stringify({ email, code }),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.valid) {
                    document.getElementById('next-button').disabled = false;
                } else {
                    document.getElementById('next-button').disabled = true;
                }
            })
            .catch(error => console.error('Error:', error));
        } else {
            document.getElementById('next-button').disabled = true;
        }
    });

    document.getElementById('new-password-form').addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(this);
        fetch('/reset-password', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            if (data.message === 'Password reset successful.') {
                showContainer('login-container');
            }
        })
        .catch(error => console.error('Error:', error));
    });

    document.getElementById('admin-login-form').addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(this);
        fetch('/admin-login', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAdminPage(data.users);
            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    });
});

function showContainer(containerId) {
    const containers = document.querySelectorAll('.container');
    containers.forEach(container => container.style.display = 'none');
    document.getElementById(containerId).style.display = 'block';
}

function showNewPasswordForm() {
    const email = document.getElementById('forgot-email').value;
    const code = document.getElementById('verification-code').value;
    document.getElementById('hidden-email').value = email;
    document.getElementById('hidden-code').value = code;
    showContainer('new-password-container');
}

function showAdminPage(users) {
    const userList = document.getElementById('user-list');
    userList.innerHTML = '';

    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.textContent = `Username: ${user.username}, Email: ${user.email}`;
        userList.appendChild(userDiv);
    });

    showContainer('admin-page-container');
}

function logout() {
    fetch('/logout', {
        method: 'POST'
    })
    .then(() => {
        showContainer('login-container');
    })
    .catch(error => console.error('Error:', error));
}

function approveAll() {
    fetch('/approve-users', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
    })
    .catch(error => console.error('Error:', error));
}
