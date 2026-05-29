const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3999/api';


let catalog = [];
let swiperInstance = null;

let activePrimary = 'all';
let activeSecondary = 'all';

function displayPrice(val) { return '₹' + (parseFloat(val) || 0).toFixed(2); }

function sanitize(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, ch => ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : '&gt;');
}

async function apiGet(path) {
    try {
        const res = await fetch(API + path);
        if (!res.ok) return null;
        return res.json();
    } catch { return null; }
}

// ── Product Card ───────────────────────────────────────────────────────────────
function createItemCard(item) {
    const wasPrice = parseFloat(item.oldPrice);
    const nowPrice = parseFloat(item.price);
    const discount = !isNaN(wasPrice) && wasPrice > nowPrice
        ? Math.round(((wasPrice - nowPrice) / wasPrice) * 100) : 0;
    const photo = item.image || "/1st slider.png";
    const buyLink = item.amazonLink || `https://www.amazon.in/s?k=${encodeURIComponent((item.name || '') + ' gift')}`;
    const chatLink = item.whatsappLink || `https://wa.me/971567475975?text=${encodeURIComponent("Hi! I'm interested in " + (item.name || ''))}`;

    return `
        <div class="mb-reel-cell">
            <div class="mb-item-card">
                <a href="${buyLink}" target="_blank" style="display:block; text-decoration:none; color:inherit;">
                    <img class="mb-item-photo" src="${photo}" alt="${sanitize(item.name)}" onerror="this.src='/1st slider.png'">
                    <div class="mb-item-details">
                        <div class="mb-item-name">${sanitize(item.name)}</div>
                        <div class="mb-price-line">
                            ${wasPrice ? `<span class="mb-strike-price">${displayPrice(wasPrice)}</span>` : ''}
                            <span class="mb-live-price">${displayPrice(nowPrice)}</span>
                            ${discount > 0 ? `<span class="mb-save-tag">SAVE ${discount}%</span>` : ''}
                        </div>
                    </div>
                </a>
                <div class="mb-quick-actions">
                    <a href="${buyLink}" target="_blank" class="mb-action-btn mb-amazon-btn" title="Buy on Amazon"><i class="fab fa-amazon"></i></a>
                    <a href="${chatLink}" target="_blank" class="mb-action-btn mb-wa-btn" title="Inquire on WhatsApp"><i class="fab fa-whatsapp"></i></a>
                </div>
            </div>
        </div>`;
}

// ── Render ─────────────────────────────────────────────────────────────────────
function renderShopReel() {
    let items = catalog;
    if (activePrimary !== 'all') items = items.filter(p => p.mainCategory === activePrimary);
    if (activeSecondary !== 'all') items = items.filter(p => p.subCategory === activeSecondary);
    const el = document.getElementById('shopReelContainer');
    if (!el) return;
    el.innerHTML = items.length
        ? items.map(createItemCard).join('')
        : '<div style="text-align:center;padding:40px;width:100%;">No products found.</div>';
}

function renderBestsReel() {
    const items = catalog.filter(p => p.isBestSeller === true);
    const el = document.getElementById('bestsReelContainer');
    if (!el) return;
    el.innerHTML = items.length
        ? items.slice(0, 10).map(createItemCard).join('')
        : '<div style="text-align:center;padding:40px;width:100%;">No Best Sellers yet. Add some via the admin panel!</div>';
}

function refreshSecondaryTags() {
    const el = document.getElementById('secondaryTagsRow');
    if (!el) return;
    el.innerHTML = '';
    if (activePrimary === 'all') { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    const subs = [...new Set(
        catalog.filter(p => p.mainCategory === activePrimary && p.subCategory && p.subCategory !== 'All')
            .map(p => p.subCategory)
    )];

    const allTag = document.createElement('button');
    allTag.className = `mb-secondary-tag ${activeSecondary === 'all' ? 'active' : ''}`;
    allTag.textContent = 'All';
    allTag.onclick = () => { activeSecondary = 'all'; refreshSecondaryTags(); renderShopReel(); };
    el.appendChild(allTag);

    subs.forEach(sub => {
        const tag = document.createElement('button');
        tag.className = `mb-secondary-tag ${activeSecondary === sub ? 'active' : ''}`;
        tag.textContent = sub;
        tag.onclick = () => { activeSecondary = sub; refreshSecondaryTags(); renderShopReel(); };
        el.appendChild(tag);
    });
}

function buildPrimaryTags() {
    const el = document.getElementById('primaryTagsRow');
    if (!el) return;
    el.innerHTML = '';
    const groups = [...new Set(catalog.map(p => p.mainCategory).filter(Boolean))];

    const allTag = document.createElement('button');
    allTag.className = `mb-primary-tag ${activePrimary === 'all' ? 'active' : ''}`;
    allTag.textContent = 'All';
    allTag.onclick = () => { activePrimary = 'all'; activeSecondary = 'all'; buildPrimaryTags(); refreshSecondaryTags(); renderShopReel(); };
    el.appendChild(allTag);

    groups.forEach(grp => {
        const tag = document.createElement('button');
        tag.className = `mb-primary-tag ${activePrimary === grp ? 'active' : ''}`;
        tag.textContent = grp.charAt(0).toUpperCase() + grp.slice(1);
        tag.onclick = () => { activePrimary = grp; activeSecondary = 'all'; buildPrimaryTags(); refreshSecondaryTags(); renderShopReel(); };
        el.appendChild(tag);
    });
}

// ── Load Sections ──────────────────────────────────────────────────────────────
async function setupHeroSlider() {
    const banners = ["/1st slider.png", "/2nd slider.png", "/3rd slider.png"];
    const wrap = document.getElementById('heroSlides');
    if (!wrap) return;
    wrap.innerHTML = banners.map(img => `<div class="swiper-slide"><img src="${img}" alt="Hero"></div>`).join('');
    if (swiperInstance) swiperInstance.destroy(true, true);
    swiperInstance = new Swiper('.mb-hero-slider .heroSwiper', {
        loop: true,
        autoplay: { delay: 4000 },
        pagination: { el: '.hero-pagination', clickable: true }
    });
    const prevEl = document.getElementById('heroPrev');
    const nextEl = document.getElementById('heroNext');
    if (prevEl) prevEl.onclick = () => swiperInstance.slidePrev();
    if (nextEl) nextEl.onclick = () => swiperInstance.slideNext();
}

async function setupAnnounceBar() {
    const data = await apiGet('/config/topBarText');
    const msg = data?.text || "✨ Free Shipping ✨ | WhatsApp for Custom Hampers ✨ | 24H Delivery ✨";
    document.getElementById('announceText').innerHTML = Array(8).fill(`<span>${msg}</span>`).join('');
}

async function setupAbout() {
    const info = await apiGet('/config/about');
    if (info && info.image1) document.getElementById('aboutPhoto').src = info.image1;
    else document.getElementById('aboutPhoto').src = "/about_us_final.png";

    const expandBtn = document.getElementById('aboutExpandBtn');
    const body = document.getElementById('aboutBody');
    if (expandBtn && body) {
        expandBtn.onclick = () => {
            const open = body.classList.toggle('expanded');
            expandBtn.querySelector('span').innerText = open ? "Read Less" : "Read More";
            expandBtn.classList.toggle('active', open);
            const arrow = expandBtn.querySelector('i');
            arrow.classList.toggle('fa-chevron-down', !open);
            arrow.classList.toggle('fa-chevron-up', open);
        };
    }
}

async function setupCeo() {
    const info = await apiGet('/config/aboutCEO');
    if (info && info.text) document.getElementById('ceoContent').innerHTML = info.text;
    if (info && info.image) document.getElementById('ceoPhoto').src = info.image;
    else document.getElementById('ceoPhoto').src = "/about_us_final.png";

    const box = document.getElementById('ceoTextBox');
    const btn = document.getElementById('ceoExpandBtn');
    const icon = btn.querySelector('i');
    btn.onclick = () => {
        const open = box.classList.toggle('expanded');
        btn.childNodes[0].textContent = open ? 'Read Less ' : 'Read More ';
        btn.classList.toggle('active', open);
        icon.classList.toggle('fa-chevron-down', !open);
        icon.classList.toggle('fa-chevron-up', open);
    };
}

async function setupWhyChoose() {
    const info = await apiGet('/config/whychoose');
    if (info && info.title2) document.getElementById('whyHeading').innerText = info.title2;
    if (info && info.text2) document.getElementById('whyParagraph').innerHTML = info.text2;
    if (info && info.image2) document.getElementById('whyPhoto').src = info.image2;
    else document.getElementById('whyPhoto').src = "/why_us_banner.png";
}

async function setupBranding() {
    const info = await apiGet('/config/branding') || { logoText: "Moon Berry", logoUrl: "/moon_berry_logo.jpg" };
    const el = document.getElementById('storeLogo');
    el.innerHTML = info.logoUrl
        ? `<img class="mb-logo-img" src="${info.logoUrl}" alt="Logo">`
        : `<div style="font-size:1.8rem;font-weight:600;color:#032A71;">${info.logoText}</div>`;
    el.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupSidebar() {
    const toggleBtn = document.getElementById('menuToggleBtn');
    const sidebar = document.getElementById('sideNav');
    const backdrop = document.getElementById('sidebarBackdrop');
    const closeBtn = document.getElementById('sideNavClose');
    if (!toggleBtn || !sidebar || !backdrop || !closeBtn) return;

    const close = () => { sidebar.classList.remove('open'); backdrop.classList.remove('active'); };

    const goTo = (linkId, targetId) => {
        const link = document.getElementById(linkId);
        if (!link) return;
        link.onclick = ev => {
            ev.preventDefault();
            close();
            const target = targetId ? document.getElementById(targetId) : null;
            target ? target.scrollIntoView({ behavior: 'smooth', block: 'start' })
                : window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    };

    toggleBtn.onclick = () => { sidebar.classList.add('open'); backdrop.classList.add('active'); };
    closeBtn.onclick = close;
    backdrop.onclick = close;

    goTo('navHome');
    goTo('navCats', 'shopSection');
    goTo('navTopSellers', 'bestsSection');
    goTo('navAbout', 'aboutSection');
    goTo('navTeam', 'ceoSection');
    goTo('navReach', 'reachUs');
}

async function loadCatalog() {
    const data = await apiGet('/products');
    catalog = data || [];
    buildPrimaryTags();
    refreshSecondaryTags();
    renderShopReel();
    renderBestsReel();
}

function setupPartners() {
    const logos = ["/amazon-1.png", "/deliveroo.png", "/yellow.png", "/garrdefor.png"];
    const el = document.getElementById('partnerLogos');
    if (el) el.innerHTML = logos.map(src => `<img src="${src}" class="mb-partner-logo" alt="Partner">`).join('');
}

function setupSearch() {
    const trigger = document.querySelector('.mb-nav-actions .fa-search');
    const overlay = document.getElementById('searchOverlay');
    const closeBtn = document.getElementById('searchCloseBtn');
    const field = document.getElementById('searchField');
    const output = document.getElementById('searchOutput');

    if (trigger) trigger.onclick = () => overlay.classList.add('active');
    if (closeBtn) closeBtn.onclick = () => overlay.classList.remove('active');

    if (field && output) {
        field.oninput = () => {
            const q = field.value.trim().toLowerCase();
            if (!q) { output.innerHTML = ''; return; }
            const hits = catalog.filter(p => (p.name || '').toLowerCase().includes(q));
            output.innerHTML = hits.length
                ? hits.map(p => `<div style="padding:12px 20px;border-bottom:1px solid #f0e6ef;cursor:pointer;" onclick="window.open('${p.amazonLink || '#'}','_blank')">${sanitize(p.name)}</div>`).join('')
                : '<div style="padding:20px;color:#999;">No products found.</div>';
        };
    }
}

async function bootApp() {
    await Promise.all([
        setupHeroSlider(),
        setupAnnounceBar(),
        setupAbout(),
        setupCeo(),
        setupWhyChoose(),
        setupBranding()
    ]);
    setupPartners();
    setupSidebar();
    setupSearch();
    await loadCatalog();

    document.querySelector('.shop-prev')?.addEventListener('click', () =>
        document.getElementById('shopReelContainer').scrollBy({ left: -250, behavior: 'smooth' }));
    document.querySelector('.shop-next')?.addEventListener('click', () =>
        document.getElementById('shopReelContainer').scrollBy({ left: 250, behavior: 'smooth' }));
    document.querySelector('.bests-prev')?.addEventListener('click', () =>
        document.getElementById('bestsReelContainer').scrollBy({ left: -250, behavior: 'smooth' }));
    document.querySelector('.bests-next')?.addEventListener('click', () =>
        document.getElementById('bestsReelContainer').scrollBy({ left: 250, behavior: 'smooth' }));
}

document.addEventListener('DOMContentLoaded', bootApp);
