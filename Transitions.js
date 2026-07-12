/**
 * transitions.js — Shared page transition module
 *
 * Option B: Fade to destination theme colour (standard pages)
 * Option C: Theatrical curtain reveal (HappyBirthday.html)
 *
 * Architecture:
 *   - Every page includes this script in <head> (blocking load)
 *   - init() runs on DOMContentLoaded and handles the ARRIVAL animation
 *   - navigateTo() handles the EXIT animation (always a colour fade)
 *   - Curtain pages: two red velvet panels slide apart on arrival
 *   - Standard pages: flat colour overlay fades out on arrival
 *
 * Usage: PageTransitions.navigateTo('./Page.html')
 */

const PageTransitions = (function () {
    'use strict';

    /* ------------------------------------------------------------------
     * Theme colour map
     * The overlay fades TO this colour on exit, and FROM it on arrival.
     * The destination colour should match (or complement) that page's
     * background, creating a seamless "arriving somewhere" feeling.
     * ------------------------------------------------------------------ */
    const THEME = {
        'index.html':         '#125b77', // envelope — deep blue
        'Welcome.html':       '#125b77', // riddle gate — same deep blue
        'HappyBirthday.html': '#0d0d0d', // birthday — near-black (matches dark bg)
        'PhotoCollage.html':  '#080808', // gallery — near-black, seamless from birthday page
    };

    /* Pages that receive a theatrical curtain reveal on arrival
     * instead of the standard flat-overlay fade. */
    const CURTAIN_PAGES = new Set(['HappyBirthday.html']);

    const FADE_DURATION    = 360;  // ms — flat overlay fade
    const CURTAIN_DURATION = 1500; // ms — curtain slide (slow, theatrical)
    const CURTAIN_DELAY    = 500;  // ms — held-breath pause before curtains open
    /*
     * Total curtain time: 500 + 1500 = 2000ms.
     * HappyBirthday.html's animated squares and balloons take 2-3s to
     * fully initialise, so the curtain naturally acts as a preloader buffer —
     * the page is alive and colourful by the time the curtains complete
     * their reveal.
     */

    let overlay = null;

    /** Returns just the filename from the current URL. */
    function currentPage() {
        const seg = window.location.pathname.split('/').pop();
        return seg || 'index.html';
    }

    /**
     * Builds the full-viewport colour overlay and appends it to <body>.
     * Starts fully opaque. Caller decides when/how it fades.
     */
function buildOverlay(color) {
        const el = document.createElement('div');
        el.id = 'pt-overlay';
        el.setAttribute('aria-hidden', 'true');
        Object.assign(el.style, {
            position:      'fixed',
            inset:         '0',
            zIndex:        '99999',
            background:    color,
            opacity:       '1',
            pointerEvents: 'none',
            transition:    `opacity ${FADE_DURATION}ms ease`,
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
        });

        /*
         * Connecting motif — a small centred 💌 that rides the overlay's
         * own opacity (no separate animation needed: as a child with no
         * opacity of its own, it visually fades in/out in lockstep with
         * its parent). Ties the index.html envelope and Welcome.html
         * envelope together during the color-fade moment, instead of
         * leaving a blank colour with nothing happening.
         */
        const motif = document.createElement('span');
        motif.textContent = '💌';
        motif.setAttribute('aria-hidden', 'true');
        Object.assign(motif.style, {
            fontSize:  'clamp(28px, 6vw, 52px)',
            filter:    'drop-shadow(0 4px 12px rgba(0,0,0,0.25))',
        });
        el.appendChild(motif);

        document.body.appendChild(el);
        return el;
    }

    /**
     * Builds and animates theatrical curtain panels that slide apart
     * to reveal the page content. Called on arrival at CURTAIN_PAGES.
     *
     * Visual design: deep red velvet with fabric-fold shading, gold
     * inner trim, and a warm light ray that expands from the centre split.
     *
     * Implementation note: panels are built SYNCHRONOUSLY before any
     * rAF call, ensuring they appear in the first browser paint and
     * prevent any flash of the underlying page content.
     */
    function buildAndOpenCurtains() {
        /* Fabric fold effect: repeating gradient simulates gathered drape.
         * The 'dir' parameter mirrors the pattern for each panel. */
        const fabricGradient = (dir) => `
            linear-gradient(to bottom, rgba(255,255,255,0.025) 0%, rgba(0,0,0,0.28) 100%),
            repeating-linear-gradient(
                to ${dir},
                #3d0000 0px, #620000 18px, #850000 38px,
                #8B0000 50px, #7a0000 62px, #5c0000 78px, #3d0000 96px
            )
        `;

        const panelBase = `
            position: fixed;
            top: 0;
            height: 100%;
            width: 50.5%;
            z-index: 99998;
            pointer-events: none;
            will-change: transform;
            transition: transform ${CURTAIN_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1);
        `;

        const leftPanel  = document.createElement('div');
        const rightPanel = document.createElement('div');
        const valance    = document.createElement('div');
        const lightRay   = document.createElement('div');

        [leftPanel, rightPanel, valance, lightRay].forEach(el =>
            el.setAttribute('aria-hidden', 'true')
        );

        leftPanel.style.cssText = panelBase + `
            left: 0;
            background: ${fabricGradient('right')};
            border-right: 2px solid rgba(201,169,79,0.75);
            box-shadow: inset -4px 0 12px rgba(0,0,0,0.3);
        `;

        rightPanel.style.cssText = panelBase + `
            right: 0;
            background: ${fabricGradient('left')};
            border-left: 2px solid rgba(201,169,79,0.75);
            box-shadow: inset 4px 0 12px rgba(0,0,0,0.3);
        `;

        /* Gold valance — the decorative rod at the top of the curtain */
        valance.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 26px;
            z-index: 99999;
            pointer-events: none;
            background: linear-gradient(to bottom, #e0b830, #c9a94f 55%, #8a6e1a);
            box-shadow: 0 3px 10px rgba(0,0,0,0.45);
            will-change: transform;
            transition: transform ${CURTAIN_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1);
        `;

        /* Warm light ray that widens from the centre as the curtains part */
        lightRay.style.cssText = `
            position: fixed;
            top: 0; left: 50%;
            transform: translateX(-50%);
            width: 0; height: 100%;
            z-index: 99997;
            pointer-events: none;
            background: radial-gradient(
                ellipse at 50% 20%,
                rgba(255, 220, 130, 0.14) 0%,
                rgba(255, 200, 80, 0.06)  40%,
                transparent 70%
            );
            will-change: width;
            transition: width ${CURTAIN_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1);
        `;

        /* Append in z-order: light ray first (lowest), then panels, then valance */
        document.body.appendChild(lightRay);
        document.body.appendChild(leftPanel);
        document.body.appendChild(rightPanel);
        document.body.appendChild(valance);

        /* Brief anticipation pause, then open */
        setTimeout(() => {
            leftPanel.style.transform  = 'translateX(-100%)';
            rightPanel.style.transform = 'translateX(100%)';
            valance.style.transform    = 'translateY(-100%)';
            lightRay.style.width       = '220%';
        }, CURTAIN_DELAY);

        /* Clean up DOM elements and re-enable overlay for future navigateTo calls */
        const cleanupAt = CURTAIN_DELAY + CURTAIN_DURATION + 120;
        setTimeout(() => {
            leftPanel.remove();
            rightPanel.remove();
            valance.remove();
            lightRay.remove();
            if (overlay) {
                overlay.style.transition = `opacity ${FADE_DURATION}ms ease`;
            }
        }, cleanupAt);
    }

    /**
     * Initialise — runs on every page load (via DOMContentLoaded).
     *
     * Curtain pages: flat overlay is built (invisible) for future exit
     * use; curtain panels handle the arrival reveal.
     *
     * Standard pages: overlay starts opaque, fades to transparent.
     */
    function init() {
        const page  = currentPage();
        const color = THEME[page] || '#0d0d0d';

        if (CURTAIN_PAGES.has(page)) {
            /* Build overlay but keep it invisible — curtains reveal the page */
            overlay = buildOverlay(color);
            overlay.style.transition = 'none';
            overlay.style.opacity    = '0';
            buildAndOpenCurtains();

        } else {
            /* Standard fade-in: overlay starts opaque, fades out */
            overlay = buildOverlay(color);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    overlay.style.opacity = '0';
                });
            });
        }
    }

    /**
     * navigateTo(href) — Public API.
     *
     * Fades the overlay IN using the destination page's theme colour,
     * then navigates once the overlay is fully opaque.
     *
     * Always resets the overlay transition in case it was cleared
     * during a curtain sequence.
     *
     * @param {string} href — destination URL
     */
    function navigateTo(href) {
        const filename = href.replace(/^.*[\\/]/, '').split('?')[0] || 'index.html';
        const color    = THEME[filename] || '#0d0d0d';

        if (overlay) {
            overlay.style.pointerEvents = 'all';
            overlay.style.background    = color;
            overlay.style.transition    = `opacity ${FADE_DURATION}ms ease`; // always restore
        }

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (overlay) overlay.style.opacity = '1';
            });
        });

        setTimeout(() => {
            window.location.href = href;
        }, FADE_DURATION + 60);
    }

    /* Auto-initialise as soon as the DOM is ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { navigateTo };

}());