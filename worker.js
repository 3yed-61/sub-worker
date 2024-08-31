export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === 'GET' && path === '/') {
        const passwordHash = await env.sub.get('password');
        return passwordHash ? handleLoginPanel() : handleSetPasswordPanel();
      } else if (request.method === 'POST' && path === '/') {
        const passwordHash = await env.sub.get('password');
        return passwordHash ? handleLogin(request, env) : handleSetPassword(request, env);
      } else if (request.method === 'GET' && path === '/panel') {
        return handlePanelAccess(request);
      } else if (request.method === 'POST' && path === '/new') {
        return handleFormSubmission(request, env);
      } else if (request.method === 'POST' && path === '/edit') {
        return handleEditContent(request, env);
      } else if (request.method === 'POST' && path === '/delete') {
        return handleDeleteContent(request, env);
      } else if (request.method === 'POST' && path === '/fetch') {
        return handleFetchContent(request, env);
      } else if (request.method === 'POST' && path === '/logout') {
        return handleLogout();
      } else if (request.method === 'POST' && path === '/change-password') {
        return handleChangePasswordPanel();
      } else if (request.method === 'POST' && path === '/set-new-password') {
        return handleSetNewPassword(request, env);
      } else if (request.method === 'GET' && path.startsWith('/content/')) {
        const uuid = path.split('/content/')[1];
        return handleDisplayContent(uuid, env);
      } else {
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Error occurred:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};

// Serve the set password panel
function handleSetPasswordPanel() {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://services.3yed.space/images/services.png" rel="icon" type="image/png">
      <title>Set Password</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
        <h1>🔐 Set Password</h1>
        <form method="POST" action="/">
          <div class="input-group">
            <label for="password">Choose a Password:</label>
            <input type="password" id="password" name="password" required>
          </div>
          <button type="submit" class="btn btn-primary">Set Password</button>
        </form>
      </div>
    </body>
    </html>
  `;
  return new Response(htmlContent, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

// Handle setting the password
async function handleSetPassword(request, env) {
  const formData = await request.formData();
  const password = formData.get('password');

  if (!password) {
    return new Response('Password is required.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const passwordHash = await hashPassword(password);
  await env.sub.put('password', passwordHash);

  const headers = new Headers({
    'Location': '/',
    'Content-Type': 'text/plain',
  });
  return new Response('Password set successfully! Redirecting to login...', {
    status: 302,
    headers,
  });
}

// Serve the login panel
function handleLoginPanel() {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://services.3yed.space/images/services.png" rel="icon" type="image/png">
      <title>Login</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
        <h1>🔐 Login</h1>
        <form method="POST" action="/">
          <div class="input-group">
            <label for="password">Enter Password:</label>
            <input type="password" id="password" name="password" required>
          </div>
          <button type="submit" class="btn btn-primary">Login</button>
        </form>
      </div>
    </body>
    </html>
  `;
  return new Response(htmlContent, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

// Handle login
async function handleLogin(request, env) {
  const formData = await request.formData();
  const password = formData.get('password');

  if (!password) {
    return new Response('Password is required.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const storedHash = await env.sub.get('password');
  const inputHash = await hashPassword(password);

  if (storedHash === inputHash) {
    const headers = new Headers({
      'Set-Cookie': `authenticated=true; Max-Age=3600; HttpOnly; Secure; Path=/`,
      'Location': '/panel',
      'Content-Type': 'text/plain',
    });
    return new Response('Login successful! Redirecting to panel...', {
      status: 302,
      headers,
    });
  } else {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <link href="https://services.3yed.space/images/services.png" rel="icon" type="image/png">
        <title>Login</title>
        ${getStyles()}
      </head>
      <body>
        <div class="container">
          <h1>🔐 Login</h1>
          <p style="color: red;">Incorrect password! Please try again.</p>
          <form method="POST" action="/">
            <div class="input-group">
              <label for="password">Enter Password:</label>
              <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="btn btn-primary">Login</button>
          </form>
        </div>
      </body>
      </html>
    `;
    return new Response(htmlContent, {
      status: 403,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// Handle panel access
function handlePanelAccess(request) {
  if (isAuthenticated(request)) {
    return handleInputPanel();
  } else {
    return new Response('Redirecting to login...', {
      status: 302,
      headers: { 'Location': '/' },
    });
  }
}

// Check if the user is authenticated
function isAuthenticated(request) {
  const cookies = request.headers.get('Cookie') || '';
  return cookies.includes('authenticated=true');
}

// Serve the input panel after successful login
function handleInputPanel() {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://services.3yed.space/images/logo1.png" rel="icon" type="image/png">
      <title>Panel</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
        <h1>⚙️ Manage Subscriptions</h1>
        <section class="content-section">
          <h2>🪄Create SUB</h2>
          <form method="POST" action="/new">
            <div class="input-group">
              <label for="new-content">Enter Content:</label>
              <textarea id="new-content" name="content" rows="4" required></textarea>
            </div>
            <div class="input-group">
              <label for="new-uuid">Enter UUID (optional):</label>
              <input type="text" id="new-uuid" name="uuid">
            </div>
            <button type="submit" class="btn btn-primary">Create Content</button>
          </form>
        </section>
        <section class="content-section">
          <h2>✍️Edit Existing SUB</h2>
          <form method="POST" action="/fetch" id="fetch-form">
            <div class="input-group">
              <label for="edit-uuid">Enter UUID:</label>
              <input type="text" id="edit-uuid" name="uuid" required>
            </div>
            <button type="submit" class="btn btn-secondary">Fetch Content</button>
          </form>
          <form method="POST" action="/edit" id="edit-form" style="display: none;">
            <div class="input-group">
              <label for="edit-content">Edit Content:</label>
              <textarea id="edit-content" name="content" rows="4"></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Update Content</button>
          </form>
        </section>
      </div>
      <!-- Footer section for Logout and Change Password buttons -->
      <footer class="footer">
        <form method="POST" action="/logout" style="display: inline;">
          <button type="submit" class="btn btn-danger">Log Out</button>
        </form>
        <form method="POST" action="/change-password" style="display: inline; margin-left: 10px;">
          <button type="submit" class="btn btn-secondary">Change Password</button>
        </form>
      </footer>
    </body>
    </html>
  `;
  return new Response(htmlContent, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

// Handle logout
function handleLogout() {
  const headers = new Headers({
    'Set-Cookie': 'authenticated=false; Max-Age=0; Path=/',
    'Location': '/',
    'Content-Type': 'text/plain',
  });
  return new Response('Logged out successfully! Redirecting to login...', {
    status: 302,
    headers,
  });
}

// Serve the change password panel
function handleChangePasswordPanel() {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://services.3yed.space/images/services.png" rel="icon" type="image/png">
      <title>Change Password</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
        <h1>🔐 Change Password</h1>
        <form method="POST" action="/set-new-password">
          <div class="input-group">
            <label for="password">Enter New Password:</label>
            <input type="password" id="password" name="password" required>
          </div>
          <button type="submit" class="btn btn-primary">Set New Password</button>
        </form>
      </div>
    </body>
    </html>
  `;
  return new Response(htmlContent, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

// Handle setting a new password
async function handleSetNewPassword(request, env) {
  const formData = await request.formData();
  const password = formData.get('password');

  if (!password) {
    return new Response('Password is required.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const passwordHash = await hashPassword(password);
  await env.sub.put('password', passwordHash);

  const headers = new Headers({
    'Location': '/panel',
    'Content-Type': 'text/plain',
  });
  return new Response('Password updated successfully! Redirecting to panel...', {
    status: 302,
    headers,
  });
}

// Handle form submission to create new content
async function handleFormSubmission(request, env) {
  const formData = await request.formData();
  const content = formData.get('content');
  let uuid = formData.get('uuid');

  if (!uuid) {
    uuid = crypto.randomUUID();
  }

  await env.sub.put(uuid, content);

  const fullUrl = `${new URL(request.url).origin}/content/${uuid}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(fullUrl)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://services.3yed.space/images/services.png" rel="icon" type="image/png">
      <title>Content Created</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
        <h1>❇️ SUB Created Successfully!</h1>
        <p>Your Subscription has been created. You can share the link below:</p>
        <div class="input-group">
          <label for="sub-link">Link:</label>
          <input type="text" id="sub-link" value="${fullUrl}" readonly>
          <button onclick="copyToClipboard()">Copy</button>
        </div>
        <div class="qr-code">
          <img src="${qrCodeUrl}" alt="QR Code">
        </div>
        <div class="actions">
          <a href="/panel" class="btn btn-secondary">Back to Panel</a>
        </div>
      </div>
      <script>
        function copyToClipboard() {
          const copyText = document.getElementById("sub-link");
          copyText.select();
          document.execCommand("copy");
          alert("Link copied to clipboard!");
        }
      </script>
    </body>
    </html>
  `;
  return new Response(htmlContent, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

// Handle fetching content by UUID for editing
async function handleFetchContent(request, env) {
  const formData = await request.formData();
  const uuid = formData.get('uuid');
  const content = await env.sub.get(uuid);

  if (content) {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://services.3yed.space/images/services.png" rel="icon" type="image/png">
        <title>Edit Content</title>
        ${getStyles()}
      </head>
      <body>
        <div class="container">
          <h1>Edit Content for UUID: ${uuid}</h1>
          <form method="POST" action="/edit">
            <input type="hidden" name="uuid" value="${uuid}">
            <div class="input-group">
              <label for="edit-content">Edit Content:</label>
              <textarea id="edit-content" name="content" rows="4">${content}</textarea>
            </div>
            <button type="submit" class="btn btn-primary">Update Content</button>
          </form>
          <form method="POST" action="/delete" style="margin-top: 20px;">
            <input type="hidden" name="uuid" value="${uuid}">
            <button type="submit" class="btn btn-danger">Delete Content</button>
          </form>
          <div class="actions" style="margin-top: 20px;">
            <a href="/panel" class="btn btn-secondary">Back to Panel</a>
          </div>
        </div>
      </body>
      </html>
    `;
    return new Response(htmlContent, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  } else {
    return new Response('Content not found.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Handle editing of existing content to display link and QR code after update
async function handleEditContent(request, env) {
  const formData = await request.formData();
  const uuid = formData.get('uuid');
  const content = formData.get('content');

  if (!uuid || !content) {
    return new Response('UUID and content are required.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  await env.sub.put(uuid, content);

  const fullUrl = `${new URL(request.url).origin}/content/${uuid}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(fullUrl)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://services.3yed.space/images/services.png" rel="icon" type="image/png">
      <title>Content Updated</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
        <h1>✅ Content Updated Successfully!</h1>
        <p>Your content has been updated. You can share the link below:</p>
        <div class="input-group">
          <label for="sub-link">Link:</label>
          <input type="text" id="sub-link" value="${fullUrl}" readonly>
          <button onclick="copyToClipboard()">Copy</button>
        </div>
        <div class="qr-code">
          <img src="${qrCodeUrl}" alt="QR Code">
        </div>
        <div class="actions">
          <a href="/panel" class="btn btn-secondary">Back to Panel</a>
        </div>
      </div>
      <script>
        function copyToClipboard() {
          const copyText = document.getElementById("sub-link");
          copyText.select();
          document.execCommand("copy");
          alert("Link copied to clipboard!");
        }
      </script>
    </body>
    </html>
  `;
  return new Response(htmlContent, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

// Handle deletion of content
async function handleDeleteContent(request, env) {
  const formData = await request.formData();
  const uuid = formData.get('uuid');

  if (!uuid) {
    return new Response('UUID is required.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  try {
    await env.sub.delete(uuid);
    return new Response('Subscription deleted successfully!', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    return new Response('Failed to delete content.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Handle displaying content by UUID
async function handleDisplayContent(uuid, env) {
  const content = await env.sub.get(uuid);
  if (content) {
    return new Response(content, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } else {
    return new Response('Content not found.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Utility function to hash the password using SHA-256
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// CSS styles
function getStyles() {
  return `
    <style>
    :root {
      --primary-color: #4a90e2;
      --secondary-color: #f5a623;
      --background-color: #f8f9fa;
      --text-color: #333;
      --border-color: #e0e0e0;
    }
    body {
      background-color: var(--background-color);
      color: var(--text-color);
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      max-width: 600px;
      padding: 2rem;
      background-color: #fff;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      width: 90%;
      margin-top: 20px;
      margin-bottom: auto; /* Push the footer to the bottom */
    }
    .container:hover {
      box-shadow: 0 10px 14px rgba(0, 0, 0, 0.2);
    }
    h1 {
      font-size: 1.8rem;
      margin-bottom: 1rem;
      color: #007bff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    h2 {
      font-size: 1.3rem;
      border-bottom: 2px solid var(--border-color);
      color: var(--primary-color);
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
    }
    p {
      margin-bottom: 20px;
      color: #555;
    }
    .input-group {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
    }
    input[type="text"],
    input[type="password"],
    textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 1rem;
    }
    textarea {
      resize: vertical;
    }
    .input-group button {
      padding: 8px 16px;
      border: none;
      border-radius: 5px;
      background-color: #007bff;
      color: white;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.3s ease;
      margin-top: 10px;
    }
    .btn {
      padding: 10px 15px;
      font-size: 1rem;
      text-align: center;
      border-radius: 4px;
      cursor: pointer;
      border: none;
      color: #fff;
    }
    .btn-primary {
      background-color: var(--primary-color);
      color: #fff;
    }

    .btn-primary:hover {
      background-color: #3a7bd5;
    }

    .btn-secondary {
      background-color: var(--secondary-color);
      color: #fff;
    }
    .btn-secondary:hover {
      background-color: #e69512;
    }
    .btn-danger {
      background-color: #dc3545;
    }
    .btn-danger:hover {
      background-color: #c72433;
    }
    .content-section {
      margin-bottom: 2rem;
    }
    .qr-code {
      margin-top: 20px;
      text-align: center;
    }
    .actions {
      margin-top: 20px;
      text-align: center;
    }
    .footer {
      width: 100%;
      padding: 1rem;
      background-color: #f1f1f1;
      text-align: center;
      position: fixed;
      bottom: 0;
      left: 0;
    }
    @media (max-width: 600px) {
      .container {
        padding: 1rem;
      }
    }
    </style>
  `;
}
