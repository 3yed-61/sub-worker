export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Redirect to panel if user is already logged in
      if (isAuthenticated(request) && (path === '/' || path === '/')) {
        return redirectToPanel();
      }

      // Allow public access to content URLs without authentication
      if (!isAuthenticated(request) && path !== '/' && !path.startsWith('/content/')) {
        return redirectToLogin();
      }

      // Routing based on the path
      if (request.method === 'GET' && path === '/') {
        return await handleHome(request, env);
      } else if (request.method === 'POST' && path === '/') {
        return await handleAuthentication(request, env);
      } else if (request.method === 'GET' && path === '/panel') {
        return handlePanelAccess(request);
      } else if (request.method === 'POST' && path === '/new') {
        return await handleContentCreation(request, env);
      } else if (request.method === 'POST' && path === '/edit') {
        return await handleContentEdit(request, env);
      }
      // New GET /edit route to display the edit page for a specific SUB
      else if (request.method === 'GET' && path === '/edit') {
        const uuid = url.searchParams.get('uuid');
        return await handleEditPage(uuid, env);
      } else if (request.method === 'POST' && path === '/delete') {
        return await handleContentDeletion(request, env);
      } else if (request.method === 'POST' && path === '/fetch') {
        return await handleFetchContent(request, env);
      } else if (request.method === 'POST' && path === '/logout') {
        return handleLogout();
      } else if (request.method === 'POST' && path === '/change-password') {
        return renderChangePasswordModal();
      } else if (request.method === 'POST' && path === '/set-new-password') {
        return await handleChangePassword(request, env);
      } else if (request.method === 'GET' && path.startsWith('/content/')) {
        const uuid = path.split('/content/')[1];
        return await handleDisplayContent(uuid, env);
      } else {
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        path: request.url,
        method: request.method,
      });
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};

// Home page logic
async function handleHome(request, env) {
  const passwordHash = await env.sub.get('password');
  return passwordHash ? renderLoginForm() : renderSetPasswordForm();
}

// Authentication handler
async function handleAuthentication(request, env) {
  const passwordHash = await env.sub.get('password');
  return passwordHash ? await processLogin(request, env) : await processSetPassword(request, env);
}

// Panel access validation
function handlePanelAccess(request) {
  return isAuthenticated(request) ? renderControlPanel() : redirectToLogin();
}

// Content creation
async function handleContentCreation(request, env) {
  const formData = await request.formData();
  const content = formData.get('content');
  let uuid = formData.get('uuid') || crypto.randomUUID();

  await env.sub.put(uuid, content);

  return renderContentCreationSuccess(uuid, request.url);
}

// Content editing
async function handleContentEdit(request, env) {
  const formData = await request.formData();
  const uuid = formData.get('uuid');
  const content = formData.get('content');

  if (!uuid || !content) {
    return new Response('UUID and content are required.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Save the updated content
  await env.sub.put(uuid, content);

  // Return success similar to content creation
  return renderContentCreationSuccess(uuid, request.url);
}

// Content deletion
async function handleContentDeletion(request, env) {
  const formData = await request.formData();
  const uuid = formData.get('uuid');

  if (!uuid) {
    return new Response('UUID is required.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  await env.sub.delete(uuid);
  return new Response('Content deleted successfully!', {
    status: 302,
    headers: {
      'Location': '/panel',  // Redirect to the main page
      'Content-Type': 'text/plain',
    },
  });
}

// Fetch content
async function handleFetchContent(request, env) {
  const formData = await request.formData();
  const uuid = formData.get('uuid');

  if (uuid === 'all') {
    // Handle fetching all SUBS
    return await handleFetchAllSubs(env);
  }

  const content = await env.sub.get(uuid);

  return content ? renderEditContentForm(uuid, content) : new Response('Content not found.', { status: 404 });
}

// Handle fetching and displaying all SUBs
async function handleFetchAllSubs(env) {
  // List all keys in the KV namespace
  const listResponse = await env.sub.list({ prefix: '', limit: 1000 }); // Adjust limit as needed

  // Filter out the 'password' key
  const subs = listResponse.keys.filter(key => key.name !== 'password').map(key => key.name);

  if (subs.length === 0) {
    return renderHTML(`
      <h1>📄 All SUBs</h1>
      <p>No subscriptions found.</p>
      <div class="actions">
        <a href="/panel" class="btn btn-secondary">Back to Panel</a>
      </div>
    `);
  }

  // Pagination variables
  const itemsPerPage = 20;
  const totalPages = Math.ceil(subs.length / itemsPerPage);
  const currentPage = 1; // For simplicity, start at page 1. Implement query parameter for dynamic pages if needed.

  // Slice the subs array for current page
  const paginatedSubs = subs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Generate HTML table rows
  const subsRowsHTML = paginatedSubs.map(subUuid => `
    <tr>
      <td>${subUuid}</td>
      <td>
        <a href="/edit?uuid=${encodeURIComponent(subUuid)}" class="btn btn-primary btn-sm">Edit</a>
        <form method="POST" action="/delete" style="display: inline;">
          <input type="hidden" name="uuid" value="${subUuid}">
          <button type="submit" class="btn btn-danger btn-sm" onclick="return confirm('Are you sure you want to delete this SUB?');">Delete</button>
        </form>
      </td>
    </tr>
  `).join('');

  // Pagination controls (if needed)
  let paginationHTML = '';
  if (totalPages > 1) {
    paginationHTML = '<div class="pagination">';
    for (let i = 1; i <= totalPages; i++) {
      paginationHTML += `<a href="/fetch-all?page=${i}" class="btn btn-secondary btn-sm ${i === currentPage ? 'active' : ''}">${i}</a> `;
    }
    paginationHTML += '</div>';
  }

  return renderHTML(`
    <h1>📄 All SUBS</h1>
    <table>
      <thead>
        <tr>
          <th>UUID</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${subsRowsHTML}
      </tbody>
    </table>
    ${paginationHTML}
    <div class="actions">
      <a href="/panel" class="btn btn-secondary">Back to Panel</a>
    </div>
  `);
}

// handler to display the edit page for a specific SUB
async function handleEditPage(uuid, env) {
  if (!uuid) {
    return new Response('UUID is required.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const content = await env.sub.get(uuid);

  if (!content) {
    return new Response('Content not found.', { status: 404 });
  }

  return renderHTML(`
    <h1>Edit Content for UUID: ${uuid}</h1>
    <form method="POST" action="/edit">
      <input type="hidden" name="uuid" value="${uuid}">
      <div class="input-group">
        <label for="edit-content">Edit Content:</label>
        <textarea id="edit-content" name="content" rows="4" required>${content}</textarea>
      </div>
      <button type="submit" class="btn btn-primary">Update Content</button>
    </form>
    <form method="POST" action="/delete" style="margin-top: 20px;">
      <input type="hidden" name="uuid" value="${uuid}">
      <button type="submit" class="btn btn-danger" onclick="return confirm('Are you sure you want to delete this SUB?');">Delete Sub</button>
    </form>
    <div class="actions" style="margin-top: 20px;">
      <a href="/panel" class="btn btn-secondary">Back to Panel</a>
    </div>
  `);
}

// Display content
async function handleDisplayContent(uuid, env) {
  const content = await env.sub.get(uuid);
  return content ? new Response(content, { status: 200, headers: { 'Content-Type': 'text/plain' } }) : new Response('Content not found.', { status: 404 });
}

// Process login
async function processLogin(request, env) {
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
    return redirectToPanel();
  } else {
    return renderLoginForm('Incorrect password! Please try again.');
  }
}

// Process set password
async function processSetPassword(request, env) {
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

  return redirectToHome('Password set successfully! Redirecting to login...');
}

// Change password
async function handleChangePassword(request, env) {
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

  return redirectToPanel('Password updated successfully! Redirecting to panel...');
}

// Logout handler
function handleLogout() {
  return new Response('Logged out successfully! Redirecting to login...', {
    status: 302,
    headers: {
      'Set-Cookie': 'authenticated=false; Max-Age=0; Path=/',
      'Location': '/',
      'Content-Type': 'text/plain',
    },
  });
}

// Helper functions

// Check if user is authenticated
function isAuthenticated(request) {
  const cookies = request.headers.get('Cookie') || '';
  return cookies.includes('authenticated=true');
}

// Redirect to panel
function redirectToPanel(message = 'Login successful! Redirecting to panel...') {
  return new Response(message, {
    status: 302,
    headers: {
      'Set-Cookie': `authenticated=true; Max-Age=3600; HttpOnly; Secure; SameSite=Strict; Path=/`,
      'Location': '/panel',
      'Content-Type': 'text/plain',
    },
  });
}

// Redirect to login
function redirectToLogin(message = 'Session expired! Redirecting to login...') {
  return new Response(message, {
    status: 302,
    headers: {
      'Location': '/',
      'Content-Type': 'text/plain',
    },
  });
}

// Redirect to home
function redirectToHome(message = 'Redirecting to login...') {
  return new Response(message, {
    status: 302,
    headers: {
      'Location': '/',
      'Content-Type': 'text/plain',
    },
  });
}

// Password hashing
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Render HTML templates

function renderSetPasswordForm() {
  return renderHTML(`
    <h1>🔐 Set Password</h1>
    <form method="POST" action="/">
      <div class="input-group">
        <label for="password">Choose a Password:</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit" class="btn btn-primary">Set Password</button>
    </form>
  `);
}

function renderLoginForm(error = '') {
  return renderHTML(`
    <h1>🔐 Login</h1>
    ${error ? `<p class="error">${error}</p>` : ''}
    <form method="POST" action="/">
      <div class="input-group">
        <label for="password">Enter Password:</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit" class="btn btn-primary">Login</button>
    </form>
  `);
}

function renderControlPanel() {
  return renderHTML(`
    <h1>⚙️ Manage Subscriptions</h1>
    <section class="content-section">
      <h2>🪄 Create New SUB</h2>
      <form method="POST" action="/new">
        <div class="input-group">
          <label for="new-content">Enter Content:</label>
          <textarea id="new-content" name="content" rows="4" required></textarea>
        </div>
        <div class="input-group">
          <label for="new-uuid">Enter UUID (optional):</label>
          <input type="text" id="new-uuid" name="uuid" placeholder="Leave blank to generate automatically">
        </div>
        <button type="submit" class="btn btn-primary">Create SUB</button>
      </form>
    </section>
    <section class="content-section">
      <h2>✍️ Edit Existing SUB</h2>
      <form method="POST" action="/fetch">
        <div class="input-group">
          <label for="edit-uuid">Enter UUID or "all":</label>
          <input type="text" id="edit-uuid" name="uuid" required placeholder='e.g., "all" to display all SUBs'>
        </div>
        <button type="submit" class="btn btn-secondary">Fetch Content</button>
      </form>
    </section>
    <footer class="footer">
      <a href="https://github.com/3yed-61" target="_blank"><i class="fa fa-github" style="font-size:30px;"></i></a>

      <form method="POST" action="/logout" style="display: inline;">
        <button type="submit" class="btn btn-danger">Log Out</button>
      </form>
      <button class="btn btn-info" onclick="openChangePasswordModal()">Change Password</button>
    </footer>

    ${renderChangePasswordModal()}
    <script>
      function openChangePasswordModal() {
        document.getElementById('change-password-modal').style.display = 'block';
      }
      function closeChangePasswordModal() {
        document.getElementById('change-password-modal').style.display = 'none';
      }
    </script>
  `);
}

function renderContentCreationSuccess(uuid, url) {
  const fullUrl = `${new URL(url).origin}/content/${uuid}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(fullUrl)}`;
  return renderHTML(`
    <h1>❇️ SUB Created Successfully!</h1>
    <p>Your Subscription has been created. You can share the link below:</p>
    <div class="input-group">
      <label for="sub-link">Link:</label>
      <input type="text" id="sub-link" value="${fullUrl}" readonly>
      <button type="button" class="btn btn-secondary" onclick="copyToClipboard()">Copy</button>
    </div>
    <div class="qr-code">
      <img src="${qrCodeUrl}" alt="QR Code">
    </div>
    <div class="actions">
      <a href="/panel" class="btn btn-secondary">Back to Panel</a>
    </div>
    <script>
      function copyToClipboard() {
        const copyText = document.getElementById("sub-link");
        copyText.select();
        copyText.setSelectionRange(0, 99999); // For mobile devices
        document.execCommand("copy");
        alert("Link copied to clipboard!");
      }
    </script>
  `);
}

function renderEditContentForm(uuid, content) {
  return renderHTML(`
    <h1>Edit Content for UUID: ${uuid}</h1>
    <form method="POST" action="/edit">
      <input type="hidden" name="uuid" value="${uuid}">
      <div class="input-group">
        <label for="edit-content">Edit Content:</label>
        <textarea id="edit-content" name="content" rows="4" required>${content}</textarea>
      </div>
      <button type="submit" class="btn btn-primary">Update Content</button>
    </form>
    <form method="POST" action="/delete" style="margin-top: 20px;">
      <input type="hidden" name="uuid" value="${uuid}">
      <button type="submit" class="btn btn-danger" onclick="return confirm('Are you sure you want to delete this SUB?');">Delete Sub</button>
    </form>
    <div class="actions" style="margin-top: 20px;">
      <a href="/panel" class="btn btn-secondary">Back to Panel</a>
    </div>
  `);
}

function renderChangePasswordModal() {
  return `
    <div id="change-password-modal" class="modal">
      <div class="modal-content">
        <span class="close" onclick="closeChangePasswordModal()">&times;</span>
        <h1>🔐 Change Password</h1>
        <form method="POST" action="/set-new-password">
          <div class="input-group">
            <label for="password">Enter New Password:</label>
            <input type="password" id="password" name="password" required>
          </div>
          <button type="submit" class="btn btn-primary">Set New Password</button>
        </form>
      </div>
    </div>
  `;
}

// Render all SUBs in a table format
function renderAllSubsTable(subs) {
  const subsRowsHTML = subs.map(subUuid => `
    <tr>
      <td>${subUuid}</td>
      <td>
        <a href="/edit?uuid=${encodeURIComponent(subUuid)}" class="btn btn-primary btn-sm">Edit</a>
        <form method="POST" action="/delete" style="display: inline;">
          <input type="hidden" name="uuid" value="${subUuid}">
          <button type="submit" class="btn btn-danger btn-sm" onclick="return confirm('Are you sure you want to delete this SUB?');">Delete</button>
        </form>
      </td>
    </tr>
  `).join('');

  return `
    <h1>📄 All SUBs</h1>
    <table>
      <thead>
        <tr>
          <th>UUID</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${subsRowsHTML}
      </tbody>
    </table>
    <div class="actions">
      <a href="/panel" class="btn btn-secondary">Back to Panel</a>
    </div>
  `;
}

function renderHTML(content) {
  return new Response(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
      <title>Secure Panel</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
        ${content}
      </div>
    </body>
    </html>
  `, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

function getStyles() {
  return `
    <style>
      :root {
        --primary-color: #4a90e2;
        --secondary-color: #f5a623;
        --info-color: #15939e;
        --background-color: #f8f9fa;
        --text-color: #333;
        --border-color: #e0e0e0;
        --modal-bg: rgba(0, 0, 0, 0.5);
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
        max-width: 800px;
        padding: 2rem;
        background-color: #fff;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        width: 90%;
        margin-top: 20px;
        margin-bottom: auto;
      }
      h1 {
        font-size: 1.8rem;
        margin-bottom: 1rem;
        color: #007bff;
        text-align: center;
      }
      h2 {
        font-size: 1.3rem;
        border-bottom: 2px solid var(--border-color);
        color: var(--primary-color);
        margin-bottom: 1.5rem;
        padding-bottom: 0.5rem;
      }
      
      .input-group {
        margin-bottom: 1rem;
      }
      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: bold;
      }
      input[type="text"],
      input[type="password"],
      textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        font-size: 1rem;
        box-sizing: border-box;
      }
      textarea {
        resize: vertical;
      }
      button, .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 5px;
        background-color: var(--primary-color);
        color: white;
        font-size: 1rem;
        cursor: pointer;
        margin-top: 10px;
        transition: background-color 0.3s ease;
      }
      button:hover, .btn:hover {
        background-color: #1a5276;
      }
      .btn-secondary {
        background-color: var(--secondary-color);
      }
      .btn-secondary:hover {
        background-color: #966615;
      }
      .btn-info {
        background-color: var(--info-color);
      }
      .btn-info:hover {
        background-color: #04464d;
      }
      .btn-danger {
        background-color: #dc3545;
      }
      .btn-danger:hover {
        background-color: #911723;
      }
      .btn-sm {
        padding: 5px 10px;
        font-size: 0.8rem;
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
        margin: 20px 0;
        padding: 1rem;
        background-color: #f1f1f1;
        text-align: center;
        position: relative;
        border-radius: 8px;
      }
      /* Table Styles */
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      table, th, td {
        border: 1px solid var(--border-color);
      }
      th, td {
        padding: 12px;
        text-align: left;
      }
      th {
        background-color: var(--secondary-color);
        color: white;
      }
      tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      /* Modal styles */
      .modal {
        display: none;
        position: fixed;
        z-index: 1;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: var(--modal-bg);
        padding-top: 60px;
      }
      .modal-content {
        background-color: #fefefe;
        margin: 5% auto;
        padding: 20px;
        border: 1px solid #888;
        width: 80%;
        max-width: 500px;
        border-radius: 10px;
      }
      .close {
        color: #aaa;
        float: right;
        font-size: 28px;
        font-weight: bold;
      }
      .close:hover,
      .close:focus {
        color: black;
        text-decoration: none;
        cursor: pointer;
      }
      .error {
        color: red;
        margin-bottom: 1rem;
        text-align: center;
      }
      @media (max-width: 600px) {
        .container {
          padding: 1rem;
        }
        th, td {
          padding: 8px;
        }
        button, .btn {
          font-size: 0.9rem;
          padding: 8px 16px;
        }
      }
      /* Pagination Styles */
      .pagination {
        margin-top: 20px;
        text-align: center;
      }
      .pagination a {
        margin: 0 5px;
        padding: 8px 12px;
        text-decoration: none;
        color: white;
        background-color: var(--secondary-color);
        border-radius: 4px;
        transition: background-color 0.3s ease;
      }
      .pagination a.active {
        background-color: var(--primary-color);
      }
      .pagination a:hover:not(.active) {
        background-color: #966615;
      }
    </style>
  `;
}
