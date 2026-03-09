const URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
const ok = URL && !URL.includes('YOUR_SCRIPT_ID');

async function req(action, payload = {}) {
  if (!ok) return null;
  const u = `${URL}?action=${action}&payload=${encodeURIComponent(JSON.stringify(payload))}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const r = await fetch(u, { method: 'GET', redirect: 'follow', signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const t = await r.text();
    const d = JSON.parse(t);
    if (!d.success) throw new Error(d.error || 'Failed');
    return d;
  } catch(e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw e;
  }
}

async function postReq(action, payload = {}) {
  if (!ok) return null;
  const r = await fetch(URL, {
    method: 'POST',
    body: JSON.stringify({ action, payload }),
    redirect: 'follow'
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const t = await r.text();
  const d = JSON.parse(t);
  if (!d.success) throw new Error(d.error || 'Failed');
  return d;
}

function bg(action, payload) {
  if (!ok) return;
  req(action, payload).catch(e => console.warn('Sync:', e.message));
}

function bgPost(action, payload) {
  if (!ok) return;
  postReq(action, payload).catch(e => console.warn('Sync:', e.message));
}

export const isConnected = () => ok;

export async function fetchAll() {
  if (ok) {
    try {
      const r = await req('getAll');
      return { projects: r.projects||[], payments: r.payments||[], journal: r.journal||[] };
    } catch(e) { console.warn('Fetch failed:', e.message); }
  }
  return { projects: [], payments: [], journal: [] };
}

export function addProject(p) {
  const hasFiles = Array.isArray(p.documentData) && p.documentData.some(d => d.data);
  if (hasFiles) bgPost('addProject', p);
  else bg('addProject', p);
}
export function updateProject(id, u) { bg('updateProject', { id, ...u }); }
export function deleteProject(id) { bg('deleteProject', { id }); }
export function addPayment(p) {
  const hasProofs = Array.isArray(p.items) && p.items.some(it => it.proofData);
  if (hasProofs) bgPost('addPayment', p);
  else bg('addPayment', p);
}
export function updatePayment(id, u) { bg('updatePayment', { id, ...u }); }
export function deletePayment(id) { bg('deletePayment', { id }); }
export function addJournalPair(e) { bg('addJournalPair', e); }
export function deleteJournalEntry(id) { bg('deleteJournalEntry', { id }); }

export async function requestOtp(username, password) {
  if (!ok) return { success: false, error: 'Not connected to Google Sheets' };
  try {
    const r = await req('requestOtp', { username, password });
    return r || { success: false, error: 'No response from server' };
  } catch(e) {
    return { success: false, error: e.message || 'Request failed' };
  }
}

export async function verifyOtp(username, otp) {
  if (!ok) return { success: false, error: 'Not connected to Google Sheets' };
  try {
    const r = await req('verifyOtp', { username, otp });
    return r || { success: false, error: 'No response from server' };
  } catch(e) {
    return { success: false, error: e.message || 'Verification failed' };
  }
}
