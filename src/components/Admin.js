const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3999/api';


if (sessionStorage.getItem('isAdmin') !== 'true') {
    window.location.href = '/';
}

const formEl = document.getElementById('productForm');
const statusBar = document.getElementById('statusMsg');
const fetchBtn = document.getElementById('btnFetch');
const formWrap = document.getElementById('addProductContainer');
const openBtn = document.getElementById('showAddFormBtn');
const closeBtn = document.getElementById('closeFormBtn');

let editingId = null;

// ── Helpers ────────────────────────────────────────────────────────────────────
function displayStatus(msg, type) {
    statusBar.innerText = msg;
    statusBar.className = `mb-status-bar mb-status-${type}`;
    statusBar.style.display = 'block';
    setTimeout(() => { statusBar.style.display = 'none'; }, 5000);
}

function refreshPreview() {
    const name = document.getElementById('productName').value;
    const price = document.getElementById('productPrice').value;
    const img = document.getElementById('productImageUrl').value;
    const box = document.getElementById('preview');
    if (name || img) {
        box.style.display = 'block';
        document.getElementById('previewImg').src = img || '/1st slider.png';
        document.getElementById('previewName').innerText = name || 'Product Name';
        document.getElementById('previewPrice').innerText = price ? `₹${price}` : '';
    }
}

function resetForm() {
    editingId = null;
    formEl.reset();
    document.querySelector('.mb-btn-action').innerText = 'Add Product to Store';
    document.querySelector('.mb-btn-action').style.background = '#032A71';
    document.getElementById('preview').style.display = 'none';
}

// ── Open / Close form ──────────────────────────────────────────────────────────
openBtn?.addEventListener('click', () => {
    resetForm();
    formWrap.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
closeBtn?.addEventListener('click', () => { formWrap.style.display = 'none'; });

// ── Fetch metadata from URL ────────────────────────────────────────────────────
fetchBtn.addEventListener('click', async () => {
    const url = document.getElementById('productUrl').value;
    if (!url) return alert('Please enter a URL first');
    fetchBtn.innerText = 'Fetching...';
    fetchBtn.disabled = true;
    try {
        const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxy);
        const data = await res.json();
        const doc = new DOMParser().parseFromString(data.contents, 'text/html');
        const title = doc.querySelector('title')?.innerText || doc.querySelector('meta[property="og:title"]')?.content;
        const image = doc.querySelector('meta[property="og:image"]')?.content || doc.querySelector('meta[name="twitter:image"]')?.content;
        if (title) document.getElementById('productName').value = title.trim();
        if (image) document.getElementById('productImageUrl').value = image.trim();
        refreshPreview();
        displayStatus('Fetched metadata! Please verify.', 'ok');
    } catch {
        displayStatus('Could not auto-fetch info. Please fill manually.', 'fail');
    } finally {
        fetchBtn.innerText = 'Fetch Info';
        fetchBtn.disabled = false;
    }
});

['productName', 'productPrice', 'productImageUrl'].forEach(id =>
    document.getElementById(id).addEventListener('input', refreshPreview));

// ── Load product for editing ───────────────────────────────────────────────────
async function loadForEdit(id) {
    const res = await fetch(`${API}/products`);
    const list = await res.json();
    const item = list.find(p => String(p.id) === String(id));
    if (!item) return;

    editingId = id;
    formWrap.style.display = 'block';
    document.getElementById('productName').value = item.name || '';
    document.getElementById('productPrice').value = item.price || '';
    document.getElementById('productOldPrice').value = item.oldPrice || '';
    document.getElementById('productImageUrl').value = item.image || '';
    document.getElementById('productUrl').value = item.amazonLink || '';
    document.getElementById('mainCategory').value = item.mainCategory || 'Hampers';
    document.getElementById('subCategory').value = item.subCategory || 'All';
    document.getElementById('isBestSeller').checked = item.isBestSeller === true;

    const btn = document.querySelector('.mb-btn-action');
    btn.innerText = 'Update Product';
    btn.style.background = '#AA55A8';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshPreview();
}

// ── Delete product ─────────────────────────────────────────────────────────────
async function removeProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        await fetch(`${API}/products/${id}`, { method: 'DELETE' });
        displayStatus('Product deleted successfully', 'ok');
        loadProducts();
    } catch {
        displayStatus('Error deleting product.', 'fail');
    }
}

// ── Toggle best seller ─────────────────────────────────────────────────────────
async function switchBestSeller(id, isActive) {
    try {
        await fetch(`${API}/products/${id}/bestseller`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isBestSeller: !isActive })
        });
        displayStatus(!isActive ? 'Added to Best Sellers' : 'Removed from Best Sellers', 'ok');
        loadProducts();
    } catch {
        displayStatus('Error updating Best Seller status.', 'fail');
    }
}

// ── Render admin list ──────────────────────────────────────────────────────────
function renderList(products) {
    const listEl = document.getElementById('adminProductList');
    if (!listEl) return;
    if (!products.length) { listEl.innerHTML = '<p>No products found.</p>'; return; }

    listEl.innerHTML = products.map(p => `
        <div style="display:flex;justify-content:space-between;align-items:center;border:1px solid #f0e6ef;padding:15px;border-radius:12px;background:#fff;">
            <div style="display:flex;gap:15px;align-items:center;">
                <img src="${p.image || '/1st slider.png'}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;">
                <div>
                    <div style="font-weight:600;font-size:0.9rem;">${p.name}</div>
                    <div style="font-size:0.8rem;color:#6b5b66;">${p.mainCategory || ''} &gt; ${p.subCategory || ''}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;">
                <button class="star-toggle" data-id="${p.id}" data-active="${p.isBestSeller}"
                    style="background:${p.isBestSeller ? '#f7b731' : 'white'};color:${p.isBestSeller ? 'white' : '#f7b731'};border:1.5px solid #f7b731;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:0.8rem;font-weight:600;">
                    <i class="${p.isBestSeller ? 'fas' : 'far'} fa-star"></i>
                </button>
                <button class="edit-action" data-id="${p.id}"
                    style="background:#032A71;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.8rem;font-weight:600;">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="remove-action" data-id="${p.id}"
                    style="background:#ff4d4d;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:0.8rem;font-weight:600;">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>`).join('');

    listEl.querySelectorAll('.remove-action').forEach(btn =>
        btn.onclick = () => removeProduct(btn.dataset.id));
    listEl.querySelectorAll('.edit-action').forEach(btn =>
        btn.onclick = () => loadForEdit(btn.dataset.id));
    listEl.querySelectorAll('.star-toggle').forEach(btn =>
        btn.onclick = () => switchBestSeller(btn.dataset.id, btn.dataset.active === 'true'));
}

async function loadProducts() {
    try {
        const res = await fetch(`${API}/products`);
        const data = await res.json();
        renderList(data);
    } catch {
        document.getElementById('adminProductList').innerHTML = '<p style="color:red;">Failed to load products. Is the server running?</p>';
    }
}

// ── Clear all products ─────────────────────────────────────────────────────────
document.getElementById('clearAllBtn').onclick = async () => {
    if (!confirm('Delete ALL products? This cannot be undone.')) return;
    try {
        await fetch(`${API}/products`, { method: 'DELETE' });
        displayStatus('All products cleared successfully', 'ok');
        loadProducts();
    } catch {
        displayStatus('Error clearing products.', 'fail');
    }
};

// ── Submit form ────────────────────────────────────────────────────────────────
formEl.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('productName').value;
    const payload = {
        name,
        price: document.getElementById('productPrice').value,
        oldPrice: document.getElementById('productOldPrice').value || null,
        image: document.getElementById('productImageUrl').value,
        amazonLink: document.getElementById('productUrl').value,
        whatsappLink: `https://wa.me/971567475975?text=${encodeURIComponent("Hi! I'm interested in " + name)}`,
        mainCategory: document.getElementById('mainCategory').value,
        subCategory: document.getElementById('subCategory').value || 'All',
        isBestSeller: document.getElementById('isBestSeller').checked
    };

    try {
        if (editingId) {
            await fetch(`${API}/products/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            displayStatus('Product updated successfully!', 'ok');
        } else {
            await fetch(`${API}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            displayStatus('Product added successfully!', 'ok');
        }
        resetForm();
        formWrap.style.display = 'none';
        loadProducts();
    } catch {
        displayStatus('Error saving product. Is the server running?', 'fail');
    }
});

// ── Init ───────────────────────────────────────────────────────────────────────
loadProducts();
