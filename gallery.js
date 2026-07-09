/**
 * gallery.js — PhotoCollage page logic
 *
 * Structure:
 *   1. Configuration  ← edit this section to customise your gallery
 *   2. State
 *   3. DOM references
 *   4. Category navigation
 *   5. Gallery rendering
 *   6. Lightbox
 *   7. Event listeners
 *   8. Initialisation
 */

'use strict';

/* ================================================================
 * 1. CONFIGURATION
 * ────────────────────────────────────────────────────────────────
 * IMAGE_CAPTIONS  maps each image path to the caption shown in the
 *                 lightbox. Omit a path to show no caption.
 *
 * SECTIONS        defines the category tabs. Add, remove, or rename
 *                 sections freely — the "All" section (id: 'all') is
 *                 populated automatically from the rest, so never
 *                 edit its images array directly.
 * ================================================================ */

const IMAGE_CAPTIONS = {
    './img/1.JPG':   'A beautiful sunrise over the city skyline.',
    './img/2.JPG':   'Clouds forming unique patterns in the afternoon sky.',
    './img/3.JPG':   'Golden hour with vibrant colors.',
    './img/4.JPG':   'A dramatic storm approaching.',
    './img/5.JPG':   'Clear blue sky with a single bird.',
    './img/6.JPG':   'Sunset with pink and orange hues.',
    './img/7.jpg':   'Night sky filled with stars.',
    './img/8.jpg':   'Rain clouds gathering above.',
    './img/9.jpg':   'A rainbow after the rain.',
    './img/10.JPG':  'Wispy clouds on a summer day.',
    './img/11.JPG':  'Thunderstorm in the distance.',
    './img/12.JPG':  'Sky reflecting on a lake.',
    './img/13.JPG':  'Jet trails crossing the sky.',
    './img/14.JPG':  'Sun peeking through clouds.',
    './img/15.JPG':  'Dusk with deep blue tones.',
    './img/16.JPEG': 'Clouds illuminated by sunset.',
    './img/17.JPG':  'A flock of birds flying.',
    './img/18.JPG':  'Moon rising over the horizon.',
    './img/19.JPG':  'Clouds shaped like animals.',
    './img/20.JPG':  'Sky after a summer storm.',
    './img/21.JPG':  'Golden clouds at dawn.',
    './img/22.JPG':  'A clear sky with no clouds.',
    './img/23.JPG':  'Sunset with dramatic colors.',
    './img/24.JPG':  'Clouds forming a heart shape.',
    './img/25.JPG':  'Sky over the mountains.',
    './img/26.JPG':  'Sunset at the beach.',
    './img/27.JPG':  'Nightfall with city lights.',
};

const SECTIONS = [
    /* "All" is populated automatically — do not edit its images array */
    { id: 'all',       label: 'All',          images: [] },
    {
        id: 'sky',
        label: 'Sky / Nature',
        images: [
            './img/1.JPG',  './img/2.JPG',  './img/3.JPG',  './img/4.JPG',
            './img/5.JPG',  './img/6.JPG',  './img/7.jpg',  './img/8.jpg',
            './img/9.jpg',  './img/10.JPG', './img/11.JPG', './img/12.JPG',
            './img/13.JPG', './img/14.JPG', './img/15.JPG', './img/16.JPEG',
            './img/17.JPG', './img/18.JPG', './img/19.JPG', './img/20.JPG',
            './img/21.JPG', './img/22.JPG', './img/23.JPG', './img/24.JPG',
            './img/25.JPG', './img/26.JPG', './img/27.JPG',
        ],
    },
    {
        id: 'people',
        label: 'People',
        images: ['./img/5.JPG', './img/6.JPG', './img/7.jpg', './img/8.jpg'],
    },
    {
        id: 'freestyle',
        label: 'Freestyle',
        images: ['./img/9.jpg', './img/10.JPG'],
    },
];

/* Auto-populate "All" with deduplicated images from every other section */
SECTIONS[0].images = [...new Set(SECTIONS.slice(1).flatMap(s => s.images))];

/* ================================================================
 * 2. STATE
 * ================================================================ */

let activeSection = SECTIONS[0]; /* defaults to "All" */
let currentImages = [];           /* images in the active section */
let lbIndex       = 0;            /* lightbox: index of visible image */
let lbTouchStartX = 0;            /* lightbox: touch swipe origin */

/* ================================================================
 * 3. DOM REFERENCES
 *
 * Queried at the top level because gallery.js is loaded with `defer`,
 * which guarantees the DOM is fully parsed before this script runs.
 * ================================================================ */

const grid     = document.getElementById('galleryGrid');
const catNav   = document.getElementById('categoryNav');
const lightbox = document.getElementById('lightbox');
const lbImg    = document.getElementById('lbImg');
const lbCap    = document.getElementById('lbCaption');
const lbCtr    = document.getElementById('lbCounter');

/* ================================================================
 * 4. CATEGORY NAVIGATION
 *
 * Generates one pill button per section and wires up click handlers.
 * All behaviour lives here — the HTML carries no onclick attributes.
 * ================================================================ */

function buildCategoryNav() {
    SECTIONS.forEach((section, i) => {
        const pill = document.createElement('button');
        pill.classList.add('cat-pill');
        pill.textContent = section.label;
        pill.dataset.sectionId = section.id;
        pill.setAttribute('role', 'tab');

        if (i === 0) {
            pill.classList.add('active');
            pill.setAttribute('aria-selected', 'true');
        } else {
            pill.setAttribute('aria-selected', 'false');
        }

        pill.addEventListener('click', () => {
            document.querySelectorAll('.cat-pill').forEach(p => {
                p.classList.remove('active');
                p.setAttribute('aria-selected', 'false');
            });
            pill.classList.add('active');
            pill.setAttribute('aria-selected', 'true');
            activeSection = section;
            renderGallery();
        });

        catNav.appendChild(pill);
    });
}

/* ================================================================
 * 5. GALLERY RENDERING
 *
 * Rebuilds the masonry grid for the active section.
 * Uses DocumentFragment for a single DOM insertion (one reflow).
 * Entrance stagger is capped at 30 items × 35ms = 1050ms max.
 * Broken images are silently removed via onerror.
 * ================================================================ */

function renderGallery() {
    grid.innerHTML = '';
    currentImages  = activeSection.images;

    if (!currentImages.length) {
        grid.innerHTML = '<p class="empty-state">No photos in this section yet.</p>';
        return;
    }

    const frag = document.createDocumentFragment();

    currentImages.forEach((src, i) => {
        const item = document.createElement('div');
        item.classList.add('masonry-item');
        item.style.animationDelay = `${Math.min(i, 30) * 35}ms`;
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.setAttribute('aria-label', IMAGE_CAPTIONS[src] || `Photo ${i + 1}`);

        const img  = document.createElement('img');
        img.classList.add('masonry-img');
        img.src     = src;
        img.alt     = IMAGE_CAPTIONS[src] || '';
        img.loading = 'lazy';
        img.onerror = () => item.remove();

        item.appendChild(img);

        /* Both click and keyboard (Enter / Space) open the lightbox */
        item.addEventListener('click', () => openLightbox(i));
        item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLightbox(i);
            }
        });

        frag.appendChild(item);
    });

    grid.appendChild(frag);
}

/* ================================================================
 * 6. LIGHTBOX
 *
 * Key fixes over the reference darkbox implementation:
 *   • Clicking a second image while open now CHANGES the image
 *     (original toggled the box closed instead of switching).
 *   • Proper prev / next navigation within the current section.
 *   • Smooth crossfade between images (opacity dip on change).
 *   • Keyboard navigation: Escape, ←, →
 *   • Touch / swipe navigation
 * ================================================================ */

function openLightbox(index) {
    lbIndex = index;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderLightboxAt(lbIndex);
    /* Move focus inside the dialog for keyboard accessibility */
    lightbox.querySelector('.lb-close').focus();
}

function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
}

function renderLightboxAt(index) {
    const src = currentImages[index];
    /* Brief opacity dip creates a crossfade between images */
    lbImg.style.opacity = '0';
    setTimeout(() => {
        lbImg.src = src;
        lbImg.alt = IMAGE_CAPTIONS[src] || '';
        lbImg.onload = () => { lbImg.style.opacity = '1'; };
    }, 150);
    lbCap.textContent = IMAGE_CAPTIONS[src] || '';
    lbCtr.textContent = `${index + 1} / ${currentImages.length}`;
}

function lightboxNext() {
    lbIndex = (lbIndex + 1) % currentImages.length;
    renderLightboxAt(lbIndex);
}

function lightboxPrev() {
    lbIndex = (lbIndex - 1 + currentImages.length) % currentImages.length;
    renderLightboxAt(lbIndex);
}

/* ================================================================
 * 7. EVENT LISTENERS
 *
 * All behaviour is wired here — the HTML carries no onclick attrs.
 * ================================================================ */

/* Back navigation buttons */
document.querySelectorAll('[data-nav-back]').forEach(btn => {
    btn.addEventListener('click', () => {
        PageTransitions.navigateTo('./HappyBirthday.html');
    });
});

/* Lightbox controls */
document.querySelector('.lb-close').addEventListener('click', closeLightbox);
document.querySelector('.lb-prev').addEventListener('click', lightboxPrev);
document.querySelector('.lb-next').addEventListener('click', lightboxNext);

/* Click backdrop to close */
lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
});

/* Keyboard: Escape closes, arrows navigate */
document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowRight') lightboxNext();
    if (e.key === 'ArrowLeft')  lightboxPrev();
});

/* Touch swipe inside lightbox */
lightbox.addEventListener('touchstart', e => {
    lbTouchStartX = e.touches[0].clientX;
}, { passive: true });

lightbox.addEventListener('touchend', e => {
    const dx = lbTouchStartX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) dx > 0 ? lightboxNext() : lightboxPrev();
}, { passive: true });

/* ================================================================
 * 8. INITIALISATION
 * ================================================================ */

buildCategoryNav();
renderGallery();