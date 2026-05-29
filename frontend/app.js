const LOGIN_API = 'http://localhost:3001/api/auth';
const LOGOUT_API = 'http://localhost:3002/api';
const TOKEN_KEY = 'auth.accessToken';

const authView = document.getElementById('auth-view');
const profileView = document.getElementById('profile-view');
const messageEl = document.getElementById('message');
const tabs = document.querySelectorAll('.tab');
const forms = {
  login: document.getElementById('login-form'),
  register: document.getElementById('register-form'),
};

function showMessage(text, type = 'success') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.hidden = false;
}

function clearMessage() {
  messageEl.hidden = true;
  messageEl.textContent = '';
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function showAuth() {
  authView.hidden = false;
  profileView.hidden = true;
}

function showProfile(user) {
  authView.hidden = true;
  profileView.hidden = false;
  document.getElementById('profile-email').textContent = user.email ?? '-';
  document.getElementById('profile-id').textContent = user.id ?? '-';
  document.getElementById('profile-last-login').textContent = user.lastLogin
    ? new Date(user.lastLogin).toLocaleString()
    : '-';
  document.getElementById('profile-created').textContent = user.createdAt
    ? new Date(user.createdAt).toLocaleString()
    : '-';
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    tabs.forEach((t) => t.classList.toggle('active', t === tab));
    Object.entries(forms).forEach(([name, form]) => {
      form.classList.toggle('active', name === target);
    });
    clearMessage();
  });
});

async function postJSON(url, body, { auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function getJSON(url, { auth = false } = {}) {
  const headers = {};
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include',
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

function extractError(data) {
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.map((e) => e.msg || e.message).filter(Boolean).join(' ');
  }
  return data?.message || 'Something went wrong';
}

forms.register.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();
  const formData = new FormData(forms.register);
  const payload = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const { ok, data } = await postJSON(`${LOGIN_API}/register`, payload);
  if (!ok) {
    showMessage(extractError(data), 'error');
    return;
  }

  setToken(data.data.accessToken);
  showMessage('Account created. Loading your profile…', 'success');
  await loadProfile();
});

forms.login.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();
  const formData = new FormData(forms.login);
  const payload = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const { ok, data } = await postJSON(`${LOGIN_API}/login`, payload);
  if (!ok) {
    showMessage(extractError(data), 'error');
    return;
  }

  setToken(data.data.accessToken);
  showMessage('Logged in. Loading your profile…', 'success');
  await loadProfile();
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  clearMessage();
  const { ok, data } = await postJSON(`${LOGOUT_API}/logout`, {}, { auth: true });
  clearToken();
  showAuth();
  if (ok) {
    showMessage(data.message || 'Logged out successfully', 'success');
  } else {
    showMessage(extractError(data) || 'Logged out locally', 'error');
  }
});

async function loadProfile() {
  if (!getToken()) {
    showAuth();
    return;
  }
  const { ok, data } = await getJSON(`${LOGIN_API}/me`, { auth: true });
  if (!ok) {
    clearToken();
    showAuth();
    showMessage(extractError(data) || 'Session expired', 'error');
    return;
  }
  showProfile(data.data.user);
}

loadProfile();
