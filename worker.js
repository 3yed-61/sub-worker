// Main entry point for the worker
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'GET' && path === '/') {
      const passwordHash = await env.sub.get('password');
      if (passwordHash) {
        return handleLoginPanel(); // Serve the login panel if password is already set
      } else {
        return handleSetPasswordPanel(); // Serve the set password panel for first-time users
      }
    } else if (request.method === 'POST' && path === '/') {
      const passwordHash = await env.sub.get('password');
      if (passwordHash) {
        return handleLogin(request, env); // Handle login for subsequent logins
      } else {
        return handleSetPassword(request, env); // Handle setting the password for the first time
      }
    } else if (request.method === 'GET' && path === '/panel') {
      return handlePanelAccess(request); // Check if user is authenticated to access the panel
    } else if (request.method === 'POST' && path === '/edit') {
      return handleEditContent(request, env); // Handle editing of existing content
    } else if (request.method === 'POST' && path === '/new') {
      return handleFormSubmission(request, env); // Handle submission of new content
    } else if (request.method === 'POST' && path === '/fetch') {
      return handleFetchContent(request, env); // Fetch content for editing
    } else if (request.method === 'GET' && path.startsWith('/content/')) {
      const uuid = path.split('/content/')[1];
      return handleDisplayContent(uuid, env); // Serve the saved content
    } else {
      return new Response('Not Found', { status: 404 });
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
      <title>Set Password</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
        <h1>Set Password</h1>
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
  return handleSuccess(htmlContent, CONTENT_TYPE.TEXT_HTML);
}

// Handle setting the password
async function handleSetPassword(request, env) {
  const formData = await request.formData();
  const password = formData.get('password');

  if (!password) {
    return new Response('Password is required.', {
      status: 400,
      headers: { 'Content-Type': CONTENT_TYPE.TEXT_PLAIN },
    });
  }

  // Hash the password before storing it
  const passwordHash = await hashPassword(password);
  await env.sub.put('password', passwordHash);

  // Redirect to the login page after setting the password
  const headers = new Headers({
    'Location': '/',
    'Content-Type': CONTENT_TYPE.TEXT_PLAIN,
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
      <title>Login</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
      <div class="heading-container">
        <h1>Login</h1>
        <span class="emoji">🔐</span>
      </div>
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
  return handleSuccess(htmlContent, CONTENT_TYPE.TEXT_HTML);
}

// Handle login
async function handleLogin(request, env) {
  const formData = await request.formData();
  const password = formData.get('password');

  if (!password) {
    return new Response('Password is required.', {
      status: 400,
      headers: { 'Content-Type': CONTENT_TYPE.TEXT_PLAIN },
    });
  }

  const storedHash = await env.sub.get('password');
  const inputHash = await hashPassword(password);

  if (storedHash === inputHash) {
    const headers = new Headers({
      'Set-Cookie': `authenticated=true; Max-Age=3600; Path=/`, // Set a simple authentication cookie
      'Location': '/panel', // Redirect to panel after successful login
      'Content-Type': CONTENT_TYPE.TEXT_PLAIN,
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
        <h1>Login</h1>
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
      headers: { 'Content-Type': CONTENT_TYPE.TEXT_HTML },
    });
  }
}

// Handle panel access
function handlePanelAccess(request) {
  if (isAuthenticated(request)) {
    return handleInputPanel(); // If authenticated, show the panel
  } else {
    return new Response('Redirecting to login...', {
      status: 302,
      headers: { 'Location': '/' }, // Redirect to the login page
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
      <title>Manage Subscriptions</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
      <div class="heading-container">
      <span class="emoji">⚙️</span>
      <h1>Manage Subscriptions</h1>
      </div>
    
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

        <section class="content-section">
          <h2>🪄Create New SUB</h2>
          <form method="POST" action="/new">
            <div class="input-group">
              <label for="new-content">Enter Content:</label>
              <textarea id="new-content" name="content" rows="4" required></textarea>
            </div>
            <div class="input-group">
              <label for="new-uuid">Enter UUID (optional):</label>
              <input type="text" id="new-uuid" name="uuid">
            </div>
            <button type="submit" class="btn btn-primary">Create SUB</button>
          </form>
        </section>
      </div>
    </body>
    </html>
  `;
  return handleSuccess(htmlContent, CONTENT_TYPE.TEXT_HTML);
}

// Handle form submission to create new sub
async function handleFormSubmission(request, env) {
  const formData = await request.formData();
  const content = formData.get('content');
  let uuid = formData.get('uuid');

  if (!uuid) {
    uuid = crypto.randomUUID(); // Generate a UUID if none is provided
  }

  await env.sub.put(uuid, content); // Store the content with the UUID

  const fullUrl = `${request.url.replace('/new', '')}/content/${uuid}`; // Correct URL to the content
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(fullUrl)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SUB Created</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
        <h1>SUB Created Successfully!</h1>
        <p>Your SUB has been created. You can share the link below:</p>
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
          copyText.setSelectionRange(0, 99999);
          document.execCommand("copy");
          alert("Link copied to clipboard!");
        }
      </script>
    </body>
    </html>
  `;
  return handleSuccess(htmlContent, CONTENT_TYPE.TEXT_HTML);
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
        </div>
      </body>
      </html>
    `;
    return handleSuccess(htmlContent, CONTENT_TYPE.TEXT_HTML);
  } else {
    return new Response('Content not found.', {
      status: 404,
      headers: { 'Content-Type': CONTENT_TYPE.TEXT_PLAIN },
    });
  }
}

// Handle editing of existing content
async function handleEditContent(request, env) {
  const formData = await request.formData();
  const uuid = formData.get('uuid');
  const content = formData.get('content');

  if (!uuid || !content) {
    return new Response('UUID and content are required.', {
      status: 400,
      headers: { 'Content-Type': CONTENT_TYPE.TEXT_PLAIN },
    });
  }

  await env.sub.put(uuid, content);

  const headers = new Headers({
    'Location': `/content/${uuid}`, // Redirect to the updated content
    'Content-Type': CONTENT_TYPE.TEXT_PLAIN,
  });
  return new Response('Content updated successfully! Redirecting...', {
    status: 302,
    headers,
  });
}

// Handle displaying content by UUID
async function handleDisplayContent(uuid, env) {
  const content = await env.sub.get(uuid);
  if (content) {
    return new Response(content, {
      status: 200,
      headers: { 'Content-Type': CONTENT_TYPE.TEXT_PLAIN },
    });
  } else {
    return new Response('Content not found.', {
      status: 404,
      headers: { 'Content-Type': CONTENT_TYPE.TEXT_PLAIN },
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

// Utility function to handle successful responses
function handleSuccess(content, contentType) {
  return new Response(content, {
    status: 200,
    headers: { 'Content-Type': contentType },
  });
}

// Styles for the HTML content
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
    width: 100%;
    padding: 2rem;
    background-color: #fff;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
  }

  .container:hover {
    box-shadow: 0 10px 14px rgba(0, 0, 0, 0.2);
  }
  
  .heading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 3rem;
  }
  
  h1 {
    font-family: 'Tahoma', , Geneva, Verdana, sans-serif;import
    font-size: 2rem;
    margin-bottom: 3rem;
    background: linear-gradient(#fab728, #f54900, #ed2b05);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-align: center;
    margin: 0;
  }
  
  .emoji {
    font-size: 1.7rem;
  }

  h2 {
    font-size: 1.5rem;
    border-bottom: 2px solid var(--border-color);
    color: var(--primary-color);
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
  }

  p {
    margin-bottom: 20px;
    color: #555;
  }

  .content-section {
    margin-bottom: 2rem;
  }

  .input-group {
    margin-bottom: 1rem;
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

  label {
    font-family: Arial, sans-serif;
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }

  input[type="text"],
  input[type="password"],
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 1rem;
  }

  textarea {
    resize: vertical;
  }

  .btn {
    display: inline-block;
    padding: 10px 15px;
    font-size: 14px;
    font-weight: bold;
    text-align: center;
    text-decoration: none;
    border-radius: 4px;
    cursor: pointer;
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

  .url-container {
    display: flex;
    align-items: center;
    margin-top: 1rem;
  }

  .url-container input[type="text"] {
    flex: 1;
    padding: 0.5rem;
    margin-right: 0.5rem;
    font-size: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .url-container button {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .url-container button:hover {
    background-color: #3a7bd5;
  }

  .qr-code {
    margin-top: 20px;
    text-align: center;
  }
  .actions {
    margin-top: 20px;
    text-align: center;
  }

  .actions .btn {
    padding: 10px 20px;
    text-decoration: none;
    color: white;
    background-color: #28a745;
    border-radius: 5px;
    transition: background-color 0.3s ease;
  }

  .actions .btn:hover {
    background-color: #218838;
  }
</style>
  `;
}

// Content type constants
const CONTENT_TYPE = {
  TEXT_HTML: 'text/html',
  TEXT_PLAIN: 'text/plain',
};
