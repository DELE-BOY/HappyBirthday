/**
 * sounds.js — Shared sound-effect module
 *
 * All effects are synthesized at runtime via the Web Audio API — no
 * external audio files, no licensing concerns, zero network requests,
 * works immediately on GitHub Pages with nothing extra to upload.
 *
 * Usage (include this script on any page, then call directly):
 *   SoundFX.playRustle()   — paper/envelope opening   (index.html)
 *   SoundFX.playSwoosh()   — light page-turn whoosh    (HappyBirthday.html)
 *   SoundFX.playCorrect()  — success chime             (Welcome.html)
 *   SoundFX.playWrong()    — error buzz                (Welcome.html)
 *
 * The shared AudioContext is created lazily on first call. Since every
 * call site here is triggered from within a click/keypress handler, this
 * satisfies browser autoplay policies without any extra unlock step.
 */

const SoundFX = (function () {
    'use strict';

    let ctx = null;

    /** Lazily creates (or resumes) the single shared AudioContext. */
    function getContext() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    /**
     * Generates a short buffer of white noise — the raw material for the
     * rustle/swoosh effects, shaped afterward by a bandpass filter sweep
     * and a gain envelope.
     */
    function createNoiseBuffer(audioCtx, durationSec) {
        const sampleRate = audioCtx.sampleRate;
        const length     = Math.floor(sampleRate * durationSec);
        const buffer     = audioCtx.createBuffer(1, length, sampleRate);
        const data       = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        return buffer;
    }

    /**
     * playRustle() — envelope opening.
     * Filtered noise burst with a rising-then-falling bandpass sweep,
     * simulating paper crinkling as the flap lifts. ~450ms.
     */
    function playRustle() {
        const audioCtx = getContext();
        const now      = audioCtx.currentTime;
        const dur      = 0.45;

        const noise  = audioCtx.createBufferSource();
        noise.buffer = createNoiseBuffer(audioCtx, dur);

        const filter = audioCtx.createBiquadFilter();
        filter.type    = 'bandpass';
        filter.Q.value = 0.7;
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.linearRampToValueAtTime(2600, now + dur * 0.55);
        filter.frequency.linearRampToValueAtTime(1400, now + dur);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.04);
        gain.gain.linearRampToValueAtTime(0.16, now + dur * 0.6);
        gain.gain.linearRampToValueAtTime(0, now + dur);

        noise.connect(filter).connect(gain).connect(audioCtx.destination);
        noise.start(now);
        noise.stop(now + dur);
    }

    /**
     * playSwoosh() — light page-turn whoosh for card navigation.
     * Shorter, quieter, higher-pitched sibling of playRustle() so
     * repeated clicks on Previous/Next don't become fatiguing. ~220ms.
     */
    function playSwoosh() {
        const audioCtx = getContext();
        const now      = audioCtx.currentTime;
        const dur      = 0.22;

        const noise  = audioCtx.createBufferSource();
        noise.buffer = createNoiseBuffer(audioCtx, dur);

        const filter = audioCtx.createBiquadFilter();
        filter.type    = 'bandpass';
        filter.Q.value = 0.9;
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.linearRampToValueAtTime(3400, now + dur * 0.5);
        filter.frequency.linearRampToValueAtTime(2000, now + dur);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
        gain.gain.linearRampToValueAtTime(0, now + dur);

        noise.connect(filter).connect(gain).connect(audioCtx.destination);
        noise.start(now);
        noise.stop(now + dur);
    }

    /**
     * playCorrect() — success chime for a correct riddle answer.
     * Three-note ascending major arpeggio (C5, E5, G5), sine tones,
     * quick decay per note. ~380ms total.
     */
    function playCorrect() {
        const audioCtx = getContext();
        const now      = audioCtx.currentTime;
        const notes    = [523.25, 659.25, 783.99]; // C5, E5, G5
        const step     = 0.09;

        notes.forEach((freq, i) => {
            const start = now + i * step;
            const osc   = audioCtx.createOscillator();
            const gain  = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

            osc.connect(gain).connect(audioCtx.destination);
            osc.start(start);
            osc.stop(start + 0.24);
        });
    }

    /**
     * playWrong() — error buzz for a wrong riddle answer.
     * Two-tone descending square-wave blip — short and clearly negative
     * without being harsh. ~260ms.
     */
    function playWrong() {
        const audioCtx = getContext();
        const now      = audioCtx.currentTime;

        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(140, now + 0.24);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

        osc.connect(gain).connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.27);
    }

    return { playRustle, playSwoosh, playCorrect, playWrong };

}());

window.SoundFX = SoundFX;