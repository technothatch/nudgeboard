const STORAGE_KEY = 'nudgeboard-items-v1';
const seedItems = [];
let items = loadItems();
let activeView = 'all';
let activeFilter = 'all';
let openMenuId = null;
let editingId = null;

const list = document.querySelector('#follow-up-list');
const emptyState = document.querySelector('#empty-state');
const modal = document.querySelector('#follow-up-modal');
const form = document.querySelector('#follow-up-form');
const confirmModal = document.querySelector('#confirm-modal');
let pendingDeleteId = null;

function offsetDate(days) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function loadItems() { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); const validItems = Array.isArray(saved) ? saved.filter(isValidItem).map(normalizeItem) : []; return validItems.length ? validItems : seedItems; } catch { return seedItems; } }
function saveItems() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); document.querySelector('#sync-label').textContent = 'Saved locally'; } catch { showToast('Could not save in this browser.'); } }
function formatDate(value) { const date = new Date(`${value}T12:00:00`); return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function daysFromToday(value) { const today = new Date(`${offsetDate(0)}T12:00:00`); const date = new Date(`${value}T12:00:00`); return Math.round((date - today) / 86400000); }
function dateLabel(value) { const days = daysFromToday(value); if (days < 0) return `${formatDate(value)} <span class="date-note">overdue</span>`; if (days === 0) return `${formatDate(value)} <span class="date-note">today</span>`; if (days === 1) return `${formatDate(value)} <span class="date-note">tomorrow</span>`; return formatDate(value); }
function statusLabel(item) { const days = daysFromToday(item.date); if (days < 0) return ['Overdue', 'today']; if (days === 0) return ['Nudge today', 'today']; if (days <= 3) return ['Coming up', 'soon']; return ['On the radar', '']; }
function getVisibleItems() {
  const query = document.querySelector('#search-input').value.trim().toLowerCase();
  return items.filter(item => {
    const inView = activeView === 'all' || (activeView === 'done' ? item.status === 'done' : activeView === 'waiting' ? item.status === 'open' : item.status === 'open' && daysFromToday(item.date) <= 3);
    const inFilter = activeFilter === 'all' || item.category === activeFilter;
    const matches = !query || [item.title, item.person, item.note].join(' ').toLowerCase().includes(query);
    return inView && inFilter && matches;
  }).sort((a, b) => a.status === 'done' ? 1 : b.status === 'done' ? -1 : a.date.localeCompare(b.date));
}
function render() {
  const visible = getVisibleItems();
  list.innerHTML = visible.map(item => {
    const [status, statusClass] = item.status === 'done' ? ['Closed', ''] : statusLabel(item);
    return `<article class="follow-up" data-id="${escapeHtml(item.id)}"><div class="follow-up-main"><span class="category-dot ${escapeHtml(item.category)}"></span><div><div class="follow-up-title">${escapeHtml(item.title)}</div><div class="follow-up-person">${escapeHtml(item.person || 'No person added')}${item.note ? ` <span class="follow-up-note">· ${escapeHtml(item.note)}</span>` : ''}</div></div></div><div class="follow-up-date ${statusClass}">${item.status === 'done' ? 'Closed' : dateLabel(item.date)}</div><span class="status-pill ${statusClass}">${status}</span><div class="row-actions"><button class="more-button" data-action="menu" aria-expanded="${openMenuId === item.id}" aria-label="Actions for ${escapeHtml(item.title)}">···</button>${openMenuId === item.id ? `<div class="row-menu"><button data-action="edit">Edit follow-up</button><button data-action="toggle">${item.status === 'done' ? 'Reopen loop' : 'Close loop'}</button><button data-action="nudge">Move nudge date</button><button class="delete" data-action="delete">Delete</button></div>` : ''}</div></article>`;
  }).join('');
  list.hidden = visible.length === 0;
  emptyState.hidden = visible.length !== 0;
  document.querySelector('#empty-title').textContent = items.length === 0 ? 'Start with one open loop.' : 'Nothing matches that view.';
  document.querySelector('#empty-copy').textContent = items.length === 0 ? 'Capture the next reply, decision, or errand you do not want to keep carrying in your head.' : 'Try another filter or search term.';
  updateCounts();
}
function updateCounts() { document.querySelector('#all-count').textContent = items.filter(i => i.status === 'open').length; document.querySelector('#due-count').textContent = items.filter(i => i.status === 'open' && daysFromToday(i.date) <= 3).length; document.querySelector('#waiting-count').textContent = items.filter(i => i.status === 'open').length; document.querySelector('#done-count').textContent = items.filter(i => i.status === 'done').length; }
function updateView(view) { activeView = view; const titles = { all: ['All follow-ups', 'Everything still in motion.'], due: ['Due soon', 'The loops asking for attention next.'], waiting: ['Waiting on others', 'Things that are outside your hands.'], done: ['Closed loop', 'A small archive of forward motion.'] }; document.querySelector('#view-title').textContent = titles[view][0]; document.querySelector('#view-subtitle').textContent = titles[view][1]; document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('is-active', button.dataset.view === view)); render(); }
function escapeHtml(value = '') { const element = document.createElement('div'); element.textContent = value; return element.innerHTML; }
function showToast(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('is-visible'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2200); }
function openForm(item = null) { editingId = item?.id || null; form.reset(); document.querySelector('#date-input').value = item?.date || offsetDate(1); document.querySelector('#title-input').value = item?.title || ''; document.querySelector('#person-input').value = item?.person || ''; document.querySelector('#category-input').value = item?.category || 'people'; document.querySelector('#note-input').value = item?.note || ''; document.querySelector('#modal-eyebrow').textContent = item ? 'Edit open loop' : 'New open loop'; document.querySelector('#modal-title').textContent = item ? 'Edit follow-up' : 'Add a follow-up'; document.querySelector('#save-button').textContent = item ? 'Save changes' : 'Save follow-up'; modal.showModal(); document.querySelector('#title-input').focus(); }
function closeForm() { editingId = null; modal.close(); }
function openDeleteConfirm(item) { pendingDeleteId = item.id; document.querySelector('#confirm-title').textContent = `Delete “${item.title}”?`; document.querySelector('#confirm-copy').textContent = 'This cannot be undone, but your exported backup will remain unchanged.'; confirmModal.showModal(); document.querySelector('#cancel-confirm').focus(); }
function closeDeleteConfirm() { pendingDeleteId = null; confirmModal.close(); }
function createId() { return globalThis.crypto?.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function isValidItem(item) { return item && typeof item === 'object' && typeof item.title === 'string' && item.title.trim() && typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && ['people', 'work', 'life'].includes(item.category) && ['open', 'done'].includes(item.status); }
function normalizeItem(item) { return { id: item.id || createId(), title: item.title.trim(), person: item.person || '', date: item.date, category: item.category, note: item.note || '', status: item.status }; }

document.querySelector('#today-label').textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => updateView(button.dataset.view)));
document.querySelector('#add-button').addEventListener('click', openForm);
document.querySelector('#empty-add-button').addEventListener('click', openForm);
document.querySelector('#search-input').addEventListener('input', () => { document.querySelector('#clear-search').hidden = !document.querySelector('#search-input').value; render(); });
document.querySelector('#clear-search').addEventListener('click', () => { document.querySelector('#search-input').value = ''; document.querySelector('#clear-search').hidden = true; render(); document.querySelector('#search-input').focus(); });
document.querySelector('#filter-button').addEventListener('click', () => { const menu = document.querySelector('#filter-menu'); menu.hidden = !menu.hidden; document.querySelector('#filter-button').setAttribute('aria-expanded', String(!menu.hidden)); });
document.querySelectorAll('#filter-menu button').forEach(button => button.addEventListener('click', () => { activeFilter = button.dataset.filter; document.querySelector('#filter-label').textContent = button.textContent.replace('All types', 'all').toLowerCase(); document.querySelectorAll('#filter-menu button').forEach(item => item.classList.toggle('is-selected', item === button)); document.querySelector('#filter-menu').hidden = true; render(); }));
list.addEventListener('click', event => { const action = event.target.closest('[data-action]')?.dataset.action; const row = event.target.closest('[data-id]'); if (!action || !row) return; const item = items.find(entry => entry.id === row.dataset.id); if (!item) return; if (action === 'menu') { openMenuId = openMenuId === item.id ? null : item.id; render(); return; } if (action === 'edit') { openMenuId = null; openForm(item); return; } if (action === 'toggle') { item.status = item.status === 'done' ? 'open' : 'done'; showToast(item.status === 'done' ? 'Loop closed. Nice.' : 'Loop reopened.'); } if (action === 'delete') { openMenuId = null; render(); openDeleteConfirm(item); return; } if (action === 'nudge') { const next = new Date(`${item.date}T12:00:00`); next.setDate(next.getDate() + 2); item.date = next.toISOString().slice(0, 10); showToast(`Nudge moved to ${formatDate(item.date)}.`); } openMenuId = null; saveItems(); render(); });
form.addEventListener('submit', event => { event.preventDefault(); const data = new FormData(form); const values = { title: data.get('title').trim(), person: data.get('person').trim(), date: data.get('date'), category: data.get('category'), note: data.get('note').trim() }; if (editingId) { const item = items.find(entry => entry.id === editingId); if (item) Object.assign(item, values); showToast('Changes saved.'); } else { items.push({ id: createId(), ...values, status: 'open' }); showToast('Follow-up added.'); } saveItems(); closeForm(); updateView(activeView); });
document.querySelector('#export-button').addEventListener('click', () => { const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'nudgeboard-backup.json'; link.click(); URL.revokeObjectURL(link.href); showToast('Backup downloaded.'); });
document.querySelector('#import-button').addEventListener('click', () => document.querySelector('#import-input').click());
document.querySelector('#import-input').addEventListener('change', async event => { try { if (!event.target.files[0]) return; const imported = JSON.parse(await event.target.files[0].text()); if (!Array.isArray(imported) || imported.some(item => !isValidItem(item))) throw new Error(); items = imported.map(normalizeItem); saveItems(); render(); showToast('Backup imported.'); } catch { showToast('That backup is not a valid Nudgeboard file.'); } event.target.value = ''; });
document.querySelector('#close-modal').addEventListener('click', closeForm);
document.querySelector('#cancel-modal').addEventListener('click', closeForm);
document.querySelector('#cancel-confirm').addEventListener('click', closeDeleteConfirm);
document.querySelector('#confirm-delete').addEventListener('click', () => { const item = items.find(entry => entry.id === pendingDeleteId); if (item) { items = items.filter(entry => entry.id !== item.id); saveItems(); render(); showToast('Follow-up removed.'); } closeDeleteConfirm(); });
document.addEventListener('click', event => { if (!event.target.closest('.row-actions') && !event.target.closest('#filter-button')) { openMenuId = null; document.querySelector('#filter-menu').hidden = true; document.querySelector('#filter-button').setAttribute('aria-expanded', 'false'); render(); } });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && confirmModal.open) { closeDeleteConfirm(); return; } if (event.key === 'Escape' && modal.open) { closeForm(); return; } if (event.key.toLowerCase() === 'n' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) openForm(); });
render();
