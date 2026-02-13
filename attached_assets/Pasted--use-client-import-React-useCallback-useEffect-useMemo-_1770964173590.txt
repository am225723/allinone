"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rectsIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const STRING_SELECTOR_ORDER = ["#bow-string", ".bow-string", '[data-role="bow-string"]'];

/**
 * Calibration notes:
 * - nock height on string: STRING_NOCK_Y_FRAC
 * - arrow nock X fraction: ARROW_NOCK_X_FRAC
 * - bow horizontal position: BOW_LEFT_PX
 * - max pull distance: MAX_PULL_PX
 * - candle spacing region: CANDLE_REGION_START_PCT / CANDLE_REGION_END_PAD_PX
 */
const STRING_NOCK_Y_FRAC = 0.52;
const ARROW_DRAW_W = 292;
const ARROW_DRAW_H = 20;
const ARROW_NOCK_X_FRAC = 0.04;
const ARROW_NOCK_Y_FRAC = 0.5;
const RELEASE_Y_OFFSET_PX = -60;

// IMPORTANT: you want string on LEFT visually. If your bow.svg is reversed,
// keep BOW_MIRRORED true (it flips the svg so string appears left).
const BOW_MIRRORED = true;
const BOW_LEFT_PX = "clamp(20px, 7vw, 88px)";
const BOW_WIDTH = "clamp(220px, 26vw, 320px)";

const FALLBACK_STRING_X_FRAC = 0.155;
const FALLBACK_STRING_TOP_Y_FRAC = 0.11;
const FALLBACK_STRING_BOTTOM_Y_FRAC = 0.9;

const MAX_PULL_PX = 430;
const MIN_PULL_PX = 20;
const COMFORT_PULL_PX = 230;
const MAX_VERTICAL_AIM_PX = 142;
const CENTERLINE_MAGNET_BASE = 0.18;
const CENTERLINE_MAGNET_PULL = 0.45;

const SPRING_STIFFNESS = 90;
const SPRING_DAMPING = 13.5;

const STRING_VIBRATION_MS = 340;
const STRING_CURVE_STRENGTH = 0.38;
const STRING_GAP = 1.9;
const BOW_INWARD_BEND_X = 11;
const BOW_INWARD_BEND_Y = 14;

const GRAVITY = 1180;
const MIN_SHOT_SPEED = 560;
const MAX_SHOT_SPEED = 2600;
const ARROW_DRAG = 0.0014;

const CANDLE_DEFAULT_COUNT = 14;
const MAX_CANDLES_PER_ARROW = 2;
const CANDLE_REGION_START_PCT = 0.54;
const CANDLE_REGION_END_PAD_PX = 28;
const CANDLE_BOW_CLEARANCE_PX = 320;

const CANDLE_FLICKER_OUT_MS = 220;
const CANDLE_HITBOX_SCALE = 0.62;

const MIDPOINT_TEXT = "Are you gonna be a good boy?";
const COMPLETION_TEXT = "Good boy.";
const HIT_FLASH_TEXTS = ["Good.", "Again.", "Perfect form.", "That\u2019s it."];

const COMPLETE_MICRO_PAUSE_MS = 700;
const COMPLETE_AUTO_ADVANCE_MS = 520;

const ROTATE_OVERLAY_BREAKPOINT = 900;
const FORCE_LANDSCAPE_ON_MOBILE = false;

// Voice assets (Tier 1)
const VOICE_MIDPOINT_SRC = "/audio/archery-midpoint.mp3";
const VOICE_COMPLETE_SRC = "/audio/archery-complete.mp3";

// Duck amount for SFX while voice plays
const DUCK_WHILE_VOICE = 0.42;

export default function ArcheryGame({
  onComplete,
  candleCount = CANDLE_DEFAULT_COUNT,
  width = "100%",
  height = 420,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const bowWrapRef = useRef(null);
  const bowHostRef = useRef(null);

  const bowSvgRef = useRef(null);
  const detectedStringRef = useRef(null);
  const stringARef = useRef(null);
  const stringBRef = useRef(null);

  const simRef = useRef(null);
  const assetsRef = useRef({ arrow: null, candle: null, ready: false });

  const pointerIdRef = useRef(null);
  const completeLockedRef = useRef(false);
  const midpointTriggeredRef = useRef(false);

  const [assetsReady, setAssetsReady] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [hapticsOn, setHapticsOn] = useState(false);
  const [shotsUI, setShotsUI] = useState(0);
  const [remainingUI, setRemainingUI] = useState(candleCount);
  const [doneUI, setDoneUI] = useState(false);
  const [hitFlash, setHitFlash] = useState(null);
  const [callout, setCallout] = useState(null);

  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  const soundRef = useRef(false);
  const hapticRef = useRef(false);
  const rotateBlockedRef = useRef(false);

  // WebAudio (SFX)
  const audioCtxRef = useRef(null);
  const cueNodesRef = useRef([]);

  // Voice (Tier 1)
  const voiceElRef = useRef(null);
  const voiceUnlockedRef = useRef(false);
  const sfxDuckRef = useRef(1); // 1 = full, <1 = ducked
  const voiceIsPlayingRef = useRef(false);

  const calloutTimerRef = useRef(null);
  const hitFlashTimerRef = useRef(null);
  const completionTimerRef = useRef(null);
  const autoCompleteTimerRef = useRef(null);

  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    hapticRef.current = hapticsOn;
  }, [hapticsOn]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    const coarseMql = window.matchMedia?.("(pointer: coarse)");
    setIsCoarsePointer(coarseMql?.matches ?? false);

    const onCoarseChange = (event) => {
      setIsCoarsePointer(event.matches);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    coarseMql?.addEventListener?.("change", onCoarseChange);

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      coarseMql?.removeEventListener?.("change", onCoarseChange);
    };
  }, []);

  const showRotateOverlay =
    FORCE_LANDSCAPE_ON_MOBILE &&
    isCoarsePointer &&
    viewport.width > 0 &&
    viewport.width <= ROTATE_OVERLAY_BREAKPOINT &&
    viewport.height > viewport.width;

  useEffect(() => {
    rotateBlockedRef.current = showRotateOverlay;
  }, [showRotateOverlay]);

  const gameHeight = `clamp(260px, 62vh, ${Math.max(280, Number(height) || 420)}px)`;

  // -------------------------
  // VOICE: init + unlock
  // -------------------------
  const ensureVoiceEl = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!voiceElRef.current) {
      const el = new Audio();
      el.preload = "auto";
      el.crossOrigin = "anonymous";
      el.volume = 0.92;
      voiceElRef.current = el;

      el.addEventListener("ended", () => {
        voiceIsPlayingRef.current = false;
        sfxDuckRef.current = 1;
      });
      el.addEventListener("pause", () => {
        // pause can happen on stop/reset too
        voiceIsPlayingRef.current = false;
        sfxDuckRef.current = 1;
      });
    }
    return voiceElRef.current;
  }, []);

  const stopVoice = useCallback(() => {
    const el = ensureVoiceEl();
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
    } catch {
      // no-op
    }
    voiceIsPlayingRef.current = false;
    sfxDuckRef.current = 1;
  }, [ensureVoiceEl]);

  // iOS/mobile autoplay unlock:
  // call from first pointerdown OR when toggling sound on.
  const unlockVoicePlayback = useCallback(async () => {
    if (voiceUnlockedRef.current) return true;
    const el = ensureVoiceEl();
    if (!el) return false;

    try {
      // A tiny silent play/pause “unlocks” in many mobile browsers.
      // Not all browsers need it; harmless when it does nothing.
      el.src = VOICE_MIDPOINT_SRC;
      el.muted = true;
      await el.play();
      el.pause();
      el.currentTime = 0;
      el.muted = false;
      voiceUnlockedRef.current = true;
      return true;
    } catch {
      // If this fails, it can still succeed later once the browser is satisfied.
      el.muted = false;
      return false;
    }
  }, [ensureVoiceEl]);

  const playVoice = useCallback(
    async (src) => {
      if (!soundRef.current) return false;
      const el = ensureVoiceEl();
      if (!el) return false;

      // Don’t overlap: voice always wins.
      stopVoice();

      // Best effort unlock
      await unlockVoicePlayback();

      try {
        el.src = src;
        el.currentTime = 0;
        // duck SFX while voice plays
        sfxDuckRef.current = DUCK_WHILE_VOICE;
        voiceIsPlayingRef.current = true;

        await el.play();
        return true;
      } catch {
        // failed (blocked or missing)
        voiceIsPlayingRef.current = false;
        sfxDuckRef.current = 1;
        return false;
      }
    },
    [ensureVoiceEl, stopVoice, unlockVoicePlayback]
  );

  // -------------------------
  // WEB AUDIO (SFX)
  // -------------------------
  const cleanupAudioNodes = useCallback(() => {
    for (const node of cueNodesRef.current) {
      try {
        node.stop?.();
      } catch {}
      try {
        node.disconnect?.();
      } catch {}
    }
    cueNodesRef.current = [];
  }, []);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtxRef.current = new Ctx();
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  const resumeAudioContext = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }, [getAudioContext]);

  const vibrate = useCallback((pattern) => {
    if (!hapticRef.current) return;
    try {
      navigator?.vibrate?.(pattern);
    } catch {}
  }, []);

  // NOTE: all SFX respect sfxDuckRef.current
  const playSynthCue = useCallback(
    ({ root = 340, gain = 0.04, decay = 0.5, noise = 0.016, slower = false }) => {
      if (!soundRef.current) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      cleanupAudioNodes();

      const duck = sfxDuckRef.current || 1;
      const now = ctx.currentTime;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.linearRampToValueAtTime(gain * duck, now + 0.012);
      master.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      master.connect(ctx.destination);

      const noiseBuffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * noise)), ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.38;

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = slower ? 720 : 880;
      bandpass.Q.value = 1.3;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(gain * duck * 0.32, now + 0.004);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + noise + 0.03);

      noiseSource.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(master);

      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      oscA.type = "triangle";
      oscB.type = "sine";
      oscA.frequency.setValueAtTime(root, now);
      oscB.frequency.setValueAtTime(root * 1.5, now);

      const chordGain = ctx.createGain();
      chordGain.gain.setValueAtTime(0.0001, now);
      chordGain.gain.linearRampToValueAtTime(gain * duck * (slower ? 0.62 : 0.48), now + 0.02);
      chordGain.gain.exponentialRampToValueAtTime(0.0001, now + decay + (slower ? 0.22 : 0.1));

      oscA.connect(chordGain);
      oscB.connect(chordGain);
      chordGain.connect(master);

      noiseSource.start(now);
      noiseSource.stop(now + noise + 0.06);
      oscA.start(now);
      oscB.start(now);
      oscA.stop(now + decay + (slower ? 0.22 : 0.1));
      oscB.stop(now + decay + (slower ? 0.22 : 0.1));

      cueNodesRef.current = [noiseSource, oscA, oscB, bandpass, noiseGain, chordGain, master];
    },
    [cleanupAudioNodes, getAudioContext]
  );

  const playMidpointCue = useCallback(() => {
    playSynthCue({ root: 386, gain: 0.032, decay: 0.38, noise: 0.012, slower: false });
  }, [playSynthCue]);

  const playCompletionCue = useCallback(() => {
    playSynthCue({ root: 286, gain: 0.042, decay: 0.62, noise: 0.016, slower: true });
  }, [playSynthCue]);

  const playReleaseSnap = useCallback(() => {
    if (!soundRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const duck = sfxDuckRef.current || 1;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(630, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.09);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.028 * duck, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }, [getAudioContext]);

  const playHitTone = useCallback(
    (candleId) => {
      if (!soundRef.current) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const duck = sfxDuckRef.current || 1;
      const now = ctx.currentTime;

      const semitone = (candleId % 9) - 4;
      const root = 650 * Math.pow(2, semitone / 24);

      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      const gain = ctx.createGain();

      oscA.type = candleId % 2 === 0 ? "triangle" : "sine";
      oscB.type = candleId % 3 === 0 ? "sine" : "triangle";

      oscA.frequency.setValueAtTime(root, now);
      oscB.frequency.setValueAtTime(root * (1.45 + (candleId % 4) * 0.02), now);
      oscA.frequency.exponentialRampToValueAtTime(root * 0.64, now + 0.14);
      oscB.frequency.exponentialRampToValueAtTime(root * 0.88, now + 0.17);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.034 * duck, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      oscA.connect(gain);
      oscB.connect(gain);
      gain.connect(ctx.destination);

      oscA.start(now);
      oscB.start(now);
      oscA.stop(now + 0.2);
      oscB.stop(now + 0.2);
    },
    [getAudioContext]
  );

  // -------------------------
  // TIERED “VOICE OR FALLBACK”
  // -------------------------
  const speakOrFallback = useCallback(
    async (text, kind) => {
      if (!soundRef.current || typeof window === "undefined") return;

      // 1) Try recorded voice first
      const ok = await playVoice(kind === "completion" ? VOICE_COMPLETE_SRC : VOICE_MIDPOINT_SRC);
      if (ok) return;

      // 2) Speech synthesis fallback (best-effort)
      cleanupAudioNodes();
      const synth = window.speechSynthesis;
      const hasSpeech = synth && typeof window.SpeechSynthesisUtterance !== "undefined";
      if (hasSpeech) {
        try {
          synth.cancel();
          const voices = synth.getVoices?.() || [];

          // Choose a high-quality English voice if available
          const preferred = voices.find((v) => /natural|enhanced|premium|google|siri/i.test(`${v.name} ${v.voiceURI}`));
          const enVoice = preferred || voices.find((v) => /^en(-|_)/i.test(v.lang || "")) || voices[0] || null;

          const utter = new window.SpeechSynthesisUtterance(text);
          if (enVoice) utter.voice = enVoice;

          // “seductive-ish” pacing (still PG)
          utter.rate = kind === "completion" ? 0.74 : 0.82;
          utter.pitch = 0.9;
          utter.volume = 0.95;

          synth.speak(utter);
          return;
        } catch {
          // fall through to cue
        }
      }

      // 3) WebAudio cue fallback
      if (kind === "completion") playCompletionCue();
      else playMidpointCue();
    },
    [cleanupAudioNodes, playCompletionCue, playMidpointCue, playVoice]
  );

  const showCallout = useCallback((text, durationMs = 1700) => {
    if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current);

    setCallout({ key: `${Date.now()}-${Math.random()}`, text, durationMs });
    calloutTimerRef.current = setTimeout(() => setCallout(null), durationMs);
  }, []);

  const showHitFlash = useCallback(() => {
    if (hitFlashTimerRef.current) clearTimeout(hitFlashTimerRef.current);
    const text = HIT_FLASH_TEXTS[Math.floor(Math.random() * HIT_FLASH_TEXTS.length)];
    setHitFlash({ key: `${Date.now()}-${Math.random()}`, text });
    hitFlashTimerRef.current = setTimeout(() => setHitFlash(null), 760);
  }, []);

  const emitComplete = useCallback(
    (payload) => {
      if (completeLockedRef.current) return;
      completeLockedRef.current = true;

      if (typeof onComplete === "function") {
        try {
          onComplete(payload);
        } catch {}
      }

      try {
        window.dispatchEvent(new CustomEvent("archery:complete", { detail: payload }));
      } catch {}
    },
    [onComplete]
  );

  const finalizeCompletion = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;

    emitComplete({
      shots: sim.shots,
      timeMs: sim.startedAt && sim.finishedAt ? Math.max(0, sim.finishedAt - sim.startedAt) : null,
    });
  }, [emitComplete]);

  // -------------------------
  // LOAD IMAGES
  // -------------------------
  useEffect(() => {
    let cancelled = false;

    const arrow = new Image();
    const candle = new Image();

    arrow.src = "/game/arrow.png";
    candle.src = "/game/candle.png";

    let loaded = 0;
    const markLoaded = () => {
      loaded += 1;
      if (!cancelled && loaded === 2) {
        assetsRef.current = { arrow, candle, ready: true };
        setAssetsReady(true);
      }
    };

    arrow.onload = markLoaded;
    candle.onload = markLoaded;

    return () => {
      cancelled = true;
    };
  }, []);

  const findStringElement = useCallback((svg) => {
    for (const selector of STRING_SELECTOR_ORDER) {
      const found = svg.querySelector(selector);
      if (found) return found;
    }

    const vb = svg.viewBox?.baseVal;
    const vbH = vb?.height || 1;
    const vbW = vb?.width || 1;

    const candidates = Array.from(svg.querySelectorAll("path,line,polyline,rect"));
    let best = null;
    let bestScore = -Infinity;

    for (const el of candidates) {
      let bb;
      try {
        bb = el.getBBox();
      } catch {
        continue;
      }
      if (!bb) continue;

      const stroke = el.getAttribute("stroke");
      if (!stroke || stroke === "none") continue;
      if (bb.height < vbH * 0.45) continue;

      const score =
        bb.height / Math.max(1, bb.width) +
        (1 - clamp01(bb.width / vbW)) * 2 +
        clamp01((vbW * 0.7 - bb.x) / vbW);

      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    return best;
  }, []);

  const ensureStringPaths = useCallback(() => {
    const svg = bowSvgRef.current;
    if (!svg) return;

    const ensurePath = (existing, role) => {
      if (existing) return existing;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "rgba(44, 34, 25, 0.96)");
      path.setAttribute("stroke-width", "1.45");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("vector-effect", "non-scaling-stroke");
      path.setAttribute("data-role", role);
      path.style.pointerEvents = "none";
      path.style.mixBlendMode = "multiply";
      svg.appendChild(path);
      return path;
    };

    stringARef.current = ensurePath(stringARef.current, "sim-string-a");
    stringBRef.current = ensurePath(stringBRef.current, "sim-string-b");
  }, []);

  const getBowAnchors = useCallback(() => {
    const svg = bowSvgRef.current;
    const wrap = bowWrapRef.current;
    const container = containerRef.current;
    if (!svg || !wrap || !container) return null;

    const vb = svg.viewBox?.baseVal;
    const vbX = vb?.x || 0;
    const vbY = vb?.y || 0;
    const vbW = vb?.width || 1;
    const vbH = vb?.height || 1;

    let top;
    let bottom;

    const stringEl = detectedStringRef.current;
    if (stringEl) {
      try {
        const bb = stringEl.getBBox();
        top = { x: bb.x + bb.width * 0.5, y: bb.y };
        bottom = { x: bb.x + bb.width * 0.5, y: bb.y + bb.height };
      } catch {}
    }

    if (!top || !bottom) {
      const xFrac = BOW_MIRRORED ? 1 - FALLBACK_STRING_X_FRAC : FALLBACK_STRING_X_FRAC;
      top = { x: vbX + vbW * xFrac, y: vbY + vbH * FALLBACK_STRING_TOP_Y_FRAC };
      bottom = { x: vbX + vbW * xFrac, y: vbY + vbH * FALLBACK_STRING_BOTTOM_Y_FRAC };
    }

    const nockVB = {
      x: lerp(top.x, bottom.x, 0.5),
      y: lerp(top.y, bottom.y, STRING_NOCK_Y_FRAC),
    };

    const wrapRect = wrap.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const vbToContainer = (point) => {
      let nx = (point.x - vbX) / vbW;
      const ny = (point.y - vbY) / vbH;
      if (BOW_MIRRORED) nx = 1 - nx;
      return {
        x: wrapRect.left - containerRect.left + nx * wrapRect.width,
        y: wrapRect.top - containerRect.top + ny * wrapRect.height,
      };
    };

    return {
      vbX,
      vbY,
      vbW,
      vbH,
      topVB: top,
      bottomVB: bottom,
      nockVB,
      topPX: vbToContainer(top),
      bottomPX: vbToContainer(bottom),
      nockPX: vbToContainer(nockVB),
    };
  }, []);

  // Load bow.svg inline
  useEffect(() => {
    let cancelled = false;

    const loadBow = async () => {
      try {
        const response = await fetch("/game/bow.svg", { cache: "no-store" });
        const markup = await response.text();
        if (cancelled) return;

        const host = bowHostRef.current;
        if (!host) return;

        host.innerHTML = markup;

        const svg = host.querySelector("svg");
        if (!svg) return;

        bowSvgRef.current = svg;
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.display = "block";
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        const detected = findStringElement(svg);
        if (detected) {
          detectedStringRef.current = detected;
          detected.style.opacity = "0.12";
        }

        ensureStringPaths();
      } catch {}
    };

    loadBow();
    return () => {
      cancelled = true;
    };
  }, [ensureStringPaths, findStringElement]);

  const buildCandleLayout = useCallback(
    (W, H, releaseX) => {
      const list = [];
      const regionStart = Math.max(W * CANDLE_REGION_START_PCT, releaseX + CANDLE_BOW_CLEARANCE_PX);
      const regionEnd = W - CANDLE_REGION_END_PAD_PX;

      const candleH = clamp(H * 0.12, 34, 52);
      const candleW = candleH * (546 / 1208);

      const rowAnchors = [0.28, 0.43, 0.58, 0.73];

      for (let i = 0; i < candleCount; i += 1) {
        const t = candleCount <= 1 ? 0 : i / (candleCount - 1);
        const row = i % rowAnchors.length;
        const wave = Math.sin(i * 1.26) * 24;
        const zig = (i % 2 === 0 ? -1 : 1) * 16;

        const x = clamp(lerp(regionStart, regionEnd, t) + wave + zig, regionStart + 10, regionEnd - 10);
        const y = clamp(H * rowAnchors[row] + Math.cos(i * 0.82) * 13, candleH + 20, H - 26);

        list.push({
          id: i,
          x,
          y,
          baseX: x,
          baseY: y,
          w: candleW,
          h: candleH,
          state: "lit",
          fadeT: 0,
          flamePhase: Math.random() * Math.PI * 2,
          floatPhase: Math.random() * Math.PI * 2,
        });
      }

      return list;
    },
    [candleCount]
  );

  // -------------------------
  // MAIN SIM LOOP
  // -------------------------
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let rafId = 0;
    let last = performance.now();

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const initSim = () => {
      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;

      const release = { x: Math.max(130, W * 0.23), y: H * 0.52 + RELEASE_Y_OFFSET_PX };
      const candles = buildCandleLayout(W, H, release.x);

      simRef.current = {
        W,
        H,

        release,
        pull: { ...release },
        pullVel: { x: 0, y: 0 },

        aiming: false,
        done: false,
        completionQueued: false,

        bowAnchors: null,
        stringVibStart: 0,
        stringVibAmp: 0,

        arrows: [],
        particles: [],
        glowPulses: [],
        confetti: [],

        candles,
        extinguished: 0,

        shots: 0,
        startedAt: null,
        finishedAt: null,
      };

      pointerIdRef.current = null;
      completeLockedRef.current = false;
      midpointTriggeredRef.current = false;

      setShotsUI(0);
      setRemainingUI(candleCount);
      setDoneUI(false);
      setHitFlash(null);
      setCallout(null);
    };

    initSim();

    const pointerToLocal = (event) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const constrainPull = (sim, x, y) => {
      let dx = x - sim.release.x;
      let dy = y - sim.release.y;

      dx = Math.min(dx, -MIN_PULL_PX);
      dy = clamp(dy, -MAX_VERTICAL_AIM_PX, MAX_VERTICAL_AIM_PX);

      const dist = Math.hypot(dx, dy) || 1;
      const scale = dist > MAX_PULL_PX ? MAX_PULL_PX / dist : 1;
      dx *= scale;
      dy *= scale;

      const pullNorm = clamp01((Math.abs(dx) - MIN_PULL_PX) / (MAX_PULL_PX - MIN_PULL_PX));
      const magnet = CENTERLINE_MAGNET_BASE + CENTERLINE_MAGNET_PULL * pullNorm;

      return {
        x: sim.release.x + dx,
        y: lerp(sim.release.y + dy, sim.release.y, magnet),
      };
    };

    const snapToComfortZone = (sim, x, y) => {
      const comfort = { x: sim.release.x - COMFORT_PULL_PX, y: sim.release.y };
      const sx = lerp(x, comfort.x, 0.7);
      const sy = lerp(y, comfort.y, 0.68);
      return constrainPull(sim, sx, sy);
    };

    const launchFromPull = (sim) => {
      const dx = sim.pull.x - sim.release.x;
      const dy = sim.pull.y - sim.release.y;
      const dist = Math.hypot(dx, dy);
      const t = clamp01((dist - MIN_PULL_PX) / (MAX_PULL_PX - MIN_PULL_PX));
      const eased = 1 - Math.pow(1 - t, 2.2);
      const speed = lerp(MIN_SHOT_SPEED, MAX_SHOT_SPEED, eased);

      let vx = (-dx / (dist || 1)) * speed;
      let vy = (-dy / (dist || 1)) * speed;
      if (vx < 160) vx = 160;

      return { vx, vy, rot: Math.atan2(vy, vx), pullDist: dist };
    };

    const spawnHitSparks = (sim, x, y) => {
      const count = reducedMotion ? 10 : 24;
      for (let i = 0; i < count; i += 1) {
        sim.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 300,
          vy: (Math.random() - 0.75) * 340,
          life: 0.32 + Math.random() * 0.26,
          kind: "spark",
        });
      }
    };

    const spawnConfetti = (sim) => {
      if (sim.confetti.length > 0) return;
      const count = reducedMotion ? 18 : 40;
      const colors = ["#f3d089", "#d8b270", "#ffe2b0", "#f2c57e", "#f8e6c5"];
      for (let i = 0; i < count; i += 1) {
        sim.confetti.push({
          x: Math.random() * sim.W,
          y: -Math.random() * sim.H * 0.25,
          vx: (Math.random() - 0.5) * 24,
          vy: 16 + Math.random() * 28,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 2.8,
          size: 2.5 + Math.random() * 3.2,
          color: colors[i % colors.length],
          drift: Math.random() * Math.PI * 2,
        });
      }
    };

    const maybeTriggerMidpoint = (sim) => {
      if (midpointTriggeredRef.current) return;
      const midpoint = Math.ceil(candleCount / 2);
      if (sim.extinguished < midpoint) return;

      midpointTriggeredRef.current = true;
      showCallout(MIDPOINT_TEXT, 1800);
      // Voice clip preferred (then synth fallback then cue)
      speakOrFallback(MIDPOINT_TEXT, "midpoint");
    };

    const maybeQueueCompletion = (sim) => {
      if (sim.completionQueued || sim.extinguished !== candleCount) return;
      sim.completionQueued = true;
      sim.done = true;
      sim.finishedAt = performance.now();

      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);

      completionTimerRef.current = setTimeout(() => {
        showCallout(COMPLETION_TEXT, 1900);
        speakOrFallback(COMPLETION_TEXT, "completion");
        vibrate([16, 32, 18]);
        spawnConfetti(sim);
        setDoneUI(true);

        if (autoCompleteTimerRef.current) clearTimeout(autoCompleteTimerRef.current);
        autoCompleteTimerRef.current = setTimeout(() => {
          finalizeCompletion();
        }, COMPLETE_AUTO_ADVANCE_MS);
      }, COMPLETE_MICRO_PAUSE_MS);
    };

    const extinguishCandle = (sim, candle) => {
      if (candle.state !== "lit") return;
      candle.state = "fading";
      candle.fadeT = 0;
    };

    const completeCandleOut = (sim, candle) => {
      if (candle.state !== "fading") return;
      candle.state = "out";
      sim.extinguished += 1;
      setRemainingUI(Math.max(0, candleCount - sim.extinguished));

      spawnHitSparks(sim, candle.x, candle.y - candle.h * 0.92);
      sim.glowPulses.push({
        x: candle.x,
        y: candle.y - candle.h * 0.92,
        t: 0,
        life: reducedMotion ? 0.24 : 0.4,
      });

      showHitFlash();
      playHitTone(candle.id);
      vibrate([10]);

      maybeTriggerMidpoint(sim);
      maybeQueueCompletion(sim);
    };

    const updateBowStrings = (sim, nowMs, dt) => {
      const a = stringARef.current;
      const b = stringBRef.current;
      const anchors = sim.bowAnchors;
      if (!a || !b || !anchors) return;

      const wrapRect = bowWrapRef.current?.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      if (!wrapRect) return;

      let nx = (sim.pull.x - (wrapRect.left - containerRect.left)) / wrapRect.width;
      let ny = (sim.pull.y - (wrapRect.top - containerRect.top)) / wrapRect.height;
      nx = clamp(nx, -0.8, 1.2);
      ny = clamp(ny, -0.3, 1.3);
      if (BOW_MIRRORED) nx = 1 - nx;

      const pullVB = {
        x: anchors.vbX + nx * anchors.vbW,
        y: anchors.vbY + ny * anchors.vbH,
      };

      const dx = pullVB.x - anchors.nockVB.x;
      const dy = pullVB.y - anchors.nockVB.y;

      const pullT = clamp01(Math.abs(dx) / (MAX_PULL_PX * 0.84));

      const vibP = clamp01((nowMs - sim.stringVibStart) / STRING_VIBRATION_MS);
      const vibEnv = 1 - vibP;
      const vib =
        sim.stringVibAmp > 0 && vibP < 1 ? Math.sin(vibP * Math.PI * 20) * sim.stringVibAmp * vibEnv : 0;

      const inwardDir = BOW_MIRRORED ? -1 : 1;
      const tipTop = {
        x: anchors.topVB.x + inwardDir * BOW_INWARD_BEND_X * pullT,
        y: anchors.topVB.y + BOW_INWARD_BEND_Y * pullT,
      };
      const tipBottom = {
        x: anchors.bottomVB.x + inwardDir * BOW_INWARD_BEND_X * pullT,
        y: anchors.bottomVB.y - BOW_INWARD_BEND_Y * pullT,
      };

      const nockX = anchors.nockVB.x + dx + vib;
      const nockY = anchors.nockVB.y + dy;

      const c1x = lerp(tipTop.x, nockX, 0.48) - pullT * 46 * STRING_CURVE_STRENGTH;
      const c1y = lerp(tipTop.y, nockY, 0.42);
      const c2x = lerp(nockX, tipBottom.x, 0.52) - pullT * 46 * STRING_CURVE_STRENGTH;
      const c2y = lerp(nockY, tipBottom.y, 0.58);

      const offsetDir = BOW_MIRRORED ? -1 : 1;
      const offA = STRING_GAP * offsetDir;
      const offB = -STRING_GAP * offsetDir;

      const pathA =
        `M ${tipTop.x + offA} ${tipTop.y} ` +
        `Q ${c1x + offA} ${c1y} ${nockX + offA} ${nockY} ` +
        `Q ${c2x + offA} ${c2y} ${tipBottom.x + offA} ${tipBottom.y}`;
      const pathB =
        `M ${tipTop.x + offB} ${tipTop.y} ` +
        `Q ${c1x + offB} ${c1y} ${nockX + offB} ${nockY} ` +
        `Q ${c2x + offB} ${c2y} ${tipBottom.x + offB} ${tipBottom.y}`;

      a.setAttribute("d", pathA);
      b.setAttribute("d", pathB);

      const opacity = sim.aiming || vibP < 1 ? 0.88 : 0.66;
      const width = String(1.35 + pullT * 0.75);
      a.setAttribute("stroke-opacity", String(opacity));
      b.setAttribute("stroke-opacity", String(opacity));
      a.setAttribute("stroke-width", width);
      b.setAttribute("stroke-width", width);

      const bowWrap = bowWrapRef.current;
      if (bowWrap) {
        const bend = sim.aiming ? pullT : vibP < 1 ? vibEnv * 0.12 : 0;
        const sx = 1 - bend * 0.06;
        const sy = 1 + bend * 0.045;
        const skew = bend * 1.3 * (BOW_MIRRORED ? -1 : 1);
        bowWrap.style.transform = `scaleX(${BOW_MIRRORED ? -1 : 1}) scale(${sx}, ${sy}) skewY(${skew}deg)`;
      }

      if (!sim.aiming) {
        sim.stringVibAmp = Math.max(0, sim.stringVibAmp - dt * 32);
      }
    };

    const onPointerDown = (event) => {
      const sim = simRef.current;
      if (!sim || !assetsRef.current.ready || sim.done || rotateBlockedRef.current) return;
      if (pointerIdRef.current != null) return;
      if (sim.arrows.some((arrow) => arrow.alive)) return;

      // Audio unlock moments
      resumeAudioContext();
      unlockVoicePlayback();

      pointerIdRef.current = event.pointerId;
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {}

      const point = pointerToLocal(event);
      sim.aiming = true;
      sim.pull = snapToComfortZone(sim, point.x, point.y);
      sim.pullVel = { x: 0, y: 0 };

      if (!sim.startedAt) sim.startedAt = performance.now();

      event.preventDefault();
    };

    const onPointerMove = (event) => {
      const sim = simRef.current;
      if (!sim || sim.done || rotateBlockedRef.current) return;
      if (pointerIdRef.current !== event.pointerId) return;
      if (!sim.aiming) return;

      const point = pointerToLocal(event);
      sim.pull = constrainPull(sim, point.x, point.y);
      event.preventDefault();
    };

    const onPointerRelease = (event) => {
      const sim = simRef.current;
      if (!sim || sim.done || rotateBlockedRef.current) return;
      if (pointerIdRef.current !== event.pointerId) return;

      pointerIdRef.current = null;

      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {}

      if (!sim.aiming) return;
      sim.aiming = false;

      const launch = launchFromPull(sim);
      sim.arrows.push({
        x: sim.release.x,
        y: sim.release.y,
        vx: launch.vx,
        vy: launch.vy,
        rot: launch.rot,
        alive: true,
        hits: 0,
        hitIds: new Set(),
      });

      sim.shots += 1;
      setShotsUI(sim.shots);

      sim.stringVibStart = performance.now();
      sim.stringVibAmp = 13 + clamp01(launch.pullDist / MAX_PULL_PX) * 9;

      sim.pullVel.x = 720;
      sim.pullVel.y = 0;

      playReleaseSnap();
      vibrate([8, 12]);

      event.preventDefault();
    };

    const onPointerCancel = (event) => {
      const sim = simRef.current;
      if (!sim || pointerIdRef.current !== event.pointerId) return;
      pointerIdRef.current = null;
      sim.aiming = false;
      sim.pull = { ...sim.release };
      sim.pullVel = { x: 0, y: 0 };
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {}
    };

    const options = { passive: false };
    canvas.addEventListener("pointerdown", onPointerDown, options);
    canvas.addEventListener("pointermove", onPointerMove, options);
    canvas.addEventListener("pointerup", onPointerRelease, options);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("pointerleave", onPointerCancel);

    const update = (dt, nowMs) => {
      const sim = simRef.current;
      if (!sim) return;

      const rect = canvas.getBoundingClientRect();
      sim.W = rect.width;
      sim.H = rect.height;

      const anchors = getBowAnchors();
      if (anchors) {
        sim.bowAnchors = anchors;
        sim.release = {
          x: anchors.nockPX.x,
          y: anchors.nockPX.y + RELEASE_Y_OFFSET_PX,
        };
      }

      if (!sim.aiming) {
        const ax = -SPRING_STIFFNESS * (sim.pull.x - sim.release.x) - SPRING_DAMPING * sim.pullVel.x;
        const ay = -SPRING_STIFFNESS * (sim.pull.y - sim.release.y) - SPRING_DAMPING * sim.pullVel.y;
        sim.pullVel.x += ax * dt;
        sim.pullVel.y += ay * dt;
        sim.pull.x += sim.pullVel.x * dt;
        sim.pull.y += sim.pullVel.y * dt;
      }

      updateBowStrings(sim, nowMs, dt);

      for (const candle of sim.candles) {
        candle.flamePhase += dt * 7.4;
        candle.floatPhase += dt * 0.9;

        if (!sim.done) {
          const floatAmp = reducedMotion ? 1.2 : 3.8;
          candle.y = candle.baseY + Math.sin(candle.floatPhase + candle.id * 0.7) * floatAmp;
        } else {
          candle.y = candle.baseY;
        }

        if (candle.state === "fading") {
          candle.fadeT += dt;
          if (candle.fadeT * 1000 >= CANDLE_FLICKER_OUT_MS) {
            completeCandleOut(sim, candle);
          }
        }
      }

      for (const arrow of sim.arrows) {
        if (!arrow.alive) continue;

        arrow.vy += GRAVITY * dt;
        arrow.vx *= 1 - ARROW_DRAG;
        arrow.vy *= 1 - ARROW_DRAG * 0.5;
        arrow.x += arrow.vx * dt;
        arrow.y += arrow.vy * dt;
        arrow.rot = Math.atan2(arrow.vy, arrow.vx);

        if (!reducedMotion && sim.particles.length < 420) {
          sim.particles.push({
            x: arrow.x - Math.cos(arrow.rot) * 12,
            y: arrow.y - Math.sin(arrow.rot) * 12,
            vx: -arrow.vx * 0.06 + (Math.random() - 0.5) * 24,
            vy: -arrow.vy * 0.06 + (Math.random() - 0.5) * 24,
            life: 0.1 + Math.random() * 0.08,
            kind: "trail",
          });
        }

        if (arrow.x > sim.W + 400 || arrow.y > sim.H + 260 || arrow.y < -300) {
          arrow.alive = false;
          continue;
        }

        if (arrow.hits >= MAX_CANDLES_PER_ARROW) continue;

        const arrowBox = { x: arrow.x - 18, y: arrow.y - 9, w: 74, h: 18 };

        for (const candle of sim.candles) {
          if (arrow.hits >= MAX_CANDLES_PER_ARROW) break;
          if (candle.state !== "lit") continue;
          if (arrow.hitIds.has(candle.id)) continue;

          const candleBox = {
            x: candle.x - (candle.w * CANDLE_HITBOX_SCALE) / 2,
            y: candle.y - candle.h,
            w: candle.w * CANDLE_HITBOX_SCALE,
            h: candle.h,
          };

          if (rectsIntersect(arrowBox, candleBox)) {
            arrow.hitIds.add(candle.id);
            arrow.hits += 1;
            extinguishCandle(sim, candle);
            arrow.vx *= 0.84;
            arrow.vy *= 0.9;
          }
        }
      }

      sim.arrows = sim.arrows.filter((arrow) => arrow.alive);

      sim.particles = sim.particles.filter((p) => p.life > 0);
      for (const p of sim.particles) {
        p.vy += GRAVITY * 0.26 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }

      sim.glowPulses = sim.glowPulses.filter((pulse) => pulse.t < pulse.life);
      for (const pulse of sim.glowPulses) pulse.t += dt;

      for (const bit of sim.confetti) {
        bit.drift += dt * 1.1;
        bit.x += bit.vx * dt + Math.sin(bit.drift) * dt * 14;
        bit.y += bit.vy * dt;
        bit.rot += bit.vr * dt;

        if (bit.y > sim.H + 16) {
          bit.y = -8;
          bit.x = Math.random() * sim.W;
        }
        if (bit.x < -16) bit.x = sim.W + 12;
        if (bit.x > sim.W + 16) bit.x = -12;
      }
    };

    const drawFlame = (x, y, candle, alphaMult = 1) => {
      const flicker = 0.88 + Math.sin(candle.flamePhase) * 0.1 + Math.sin(candle.flamePhase * 2.4) * 0.06;
      const fw = candle.w * 0.43 * flicker;
      const fh = candle.h * 0.32 * flicker;

      ctx.save();
      ctx.globalAlpha = 0.18 * alphaMult;
      ctx.fillStyle = "#ffc36e";
      ctx.beginPath();
      ctx.ellipse(x, y, fw * 2.8, fh * 1.9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.94 * alphaMult;
      ctx.fillStyle = "#ffb341";
      ctx.beginPath();
      ctx.moveTo(x, y - fh);
      ctx.quadraticCurveTo(x + fw, y - fh * 0.08, x, y + fh);
      ctx.quadraticCurveTo(x - fw, y - fh * 0.08, x, y - fh);
      ctx.fill();

      ctx.globalAlpha = 0.88 * alphaMult;
      ctx.fillStyle = "#fff5d2";
      ctx.beginPath();
      ctx.ellipse(x, y - fh * 0.02, fw * 0.32, fh * 0.56, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawBackground = (sim) => {
      ctx.clearRect(0, 0, sim.W, sim.H);

      const base = ctx.createLinearGradient(0, 0, 0, sim.H);
      base.addColorStop(0, "rgba(39,30,21,0.96)");
      base.addColorStop(0.46, "rgba(63,48,33,0.92)");
      base.addColorStop(1, "rgba(20,14,10,0.96)");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, sim.W, sim.H);

      const glow = ctx.createRadialGradient(sim.W * 0.54, sim.H * 0.22, 32, sim.W * 0.54, sim.H * 0.34, sim.W * 0.88);
      glow.addColorStop(0, "rgba(255,220,154,0.22)");
      glow.addColorStop(0.34, "rgba(227,178,105,0.1)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, sim.W, sim.H);

      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = "rgba(251,231,190,0.68)";
      ctx.lineWidth = 1;
      for (let x = 14; x < sim.W; x += 34) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, sim.H);
        ctx.stroke();
      }
      for (let y = 16; y < sim.H; y += 34) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(sim.W, y);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = "rgba(244,225,186,0.24)";
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, sim.W - 20, sim.H - 20);
    };

    const drawCandles = (sim) => {
      const candleImg = assetsRef.current.candle;
      for (const candle of sim.candles) {
        if (candle.state === "out") continue;

        const flameX = candle.x;
        const flameY = candle.y - candle.h * 0.94;

        ctx.save();
        ctx.globalAlpha = 0.17;
        ctx.fillStyle = "#ffd08c";
        ctx.beginPath();
        ctx.ellipse(flameX, flameY, candle.w * 1.28, candle.h * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (candleImg) {
          ctx.drawImage(candleImg, candle.x - candle.w / 2, candle.y - candle.h, candle.w, candle.h);
        }

        let flameAlpha = 1;
        if (candle.state === "fading") {
          const t = clamp01((candle.fadeT * 1000) / CANDLE_FLICKER_OUT_MS);
          flameAlpha = 0.92 - t * 0.92 + Math.sin(candle.fadeT * 92) * 0.12;
          flameAlpha = clamp(flameAlpha, 0.08, 1);
        }

        drawFlame(flameX, flameY, candle, flameAlpha);
      }
    };

    const drawGlowPulses = (sim) => {
      for (const pulse of sim.glowPulses) {
        const t = clamp01(pulse.t / pulse.life);
        const inv = 1 - t;
        const radius = 12 + t * 34;

        ctx.save();
        ctx.globalAlpha = 0.24 * inv;
        const grad = ctx.createRadialGradient(pulse.x, pulse.y, 2, pulse.x, pulse.y, radius);
        grad.addColorStop(0, "rgba(255, 224, 164, 0.95)");
        grad.addColorStop(1, "rgba(255, 224, 164, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const drawNockedArrow = (sim) => {
      const arrowImg = assetsRef.current.arrow;
      if (!arrowImg) return;
      if (sim.done && !sim.aiming) return;
      if (!sim.aiming && sim.arrows.length > 0) return;

      const nock = sim.aiming ? sim.pull : sim.release;

      // While aiming: point arrow from pull->release (forward)
      const rot = sim.aiming ? Math.atan2(sim.release.y - sim.pull.y, sim.release.x - sim.pull.x) : 0;

      const drawX = -ARROW_DRAW_W * ARROW_NOCK_X_FRAC;
      const drawY = -ARROW_DRAW_H * ARROW_NOCK_Y_FRAC;

      ctx.save();
      ctx.globalAlpha = sim.aiming ? 0.99 : 0.9;
      ctx.translate(nock.x, nock.y);
      ctx.rotate(rot);
      ctx.drawImage(arrowImg, drawX, drawY, ARROW_DRAW_W, ARROW_DRAW_H);
      ctx.restore();
    };

    const drawTrajectory = (sim) => {
      if (!sim.aiming) return;
      const launch = launchFromPull(sim);

      let x = sim.release.x;
      let y = sim.release.y;
      let vx = launch.vx;
      let vy = launch.vy;

      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "rgba(249,235,204,0.88)";
      for (let i = 0; i < 24; i += 1) {
        const step = 0.016;
        vy += GRAVITY * step;
        vx *= 1 - ARROW_DRAG;
        vy *= 1 - ARROW_DRAG * 0.4;
        x += vx * step;
        y += vy * step;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.restore();
    };

    const drawFlyingArrows = (sim) => {
      const arrowImg = assetsRef.current.arrow;
      if (!arrowImg) return;

      const drawX = -ARROW_DRAW_W * ARROW_NOCK_X_FRAC;
      const drawY = -ARROW_DRAW_H * ARROW_NOCK_Y_FRAC;

      for (const arrow of sim.arrows) {
        ctx.save();
        ctx.translate(arrow.x, arrow.y);
        ctx.rotate(arrow.rot);
        ctx.drawImage(arrowImg, drawX, drawY, ARROW_DRAW_W, ARROW_DRAW_H);
        ctx.restore();
      }
    };

    const drawParticles = (sim) => {
      if (reducedMotion) return;
      for (const p of sim.particles) {
        ctx.save();
        ctx.globalAlpha = clamp01(p.life);
        ctx.fillStyle = p.kind === "trail" ? "#ffe8bd" : "#ffd18f";
        ctx.fillRect(p.x, p.y, 2, 2);
        ctx.restore();
      }
    };

    const drawConfetti = (sim) => {
      if (sim.confetti.length === 0) return;
      for (const bit of sim.confetti) {
        ctx.save();
        ctx.translate(bit.x, bit.y);
        ctx.rotate(bit.rot);
        ctx.fillStyle = bit.color;
        ctx.globalAlpha = 0.48;
        ctx.fillRect(-bit.size / 2, -bit.size / 2, bit.size, bit.size * 0.7);
        ctx.restore();
      }
    };

    const drawHud = (sim) => {
      ctx.save();
      ctx.fillStyle = "rgba(246,236,215,0.92)";
      ctx.font = "12px Georgia, serif";
      ctx.fillText(`Candles ${Math.max(0, candleCount - sim.extinguished)}/${candleCount}`, sim.W - 142, 20);
      ctx.restore();
    };

    const loop = (now) => {
      const sim = simRef.current;
      if (!sim) return;

      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      update(dt, now);
      drawBackground(sim);
      drawGlowPulses(sim);
      drawCandles(sim);
      drawNockedArrow(sim);
      drawTrajectory(sim);
      drawFlyingArrows(sim);
      drawParticles(sim);
      drawConfetti(sim);
      drawHud(sim);

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resizeCanvas);

      canvas.removeEventListener("pointerdown", onPointerDown, options);
      canvas.removeEventListener("pointermove", onPointerMove, options);
      canvas.removeEventListener("pointerup", onPointerRelease, options);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("pointerleave", onPointerCancel);
    };
  }, [
    buildCandleLayout,
    candleCount,
    finalizeCompletion,
    getBowAnchors,
    playHitTone,
    playReleaseSnap,
    reducedMotion,
    resumeAudioContext,
    showCallout,
    showHitFlash,
    speakOrFallback,
    unlockVoicePlayback,
    vibrate,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current);
      if (hitFlashTimerRef.current) clearTimeout(hitFlashTimerRef.current);
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
      if (autoCompleteTimerRef.current) clearTimeout(autoCompleteTimerRef.current);

      cleanupAudioNodes();
      stopVoice();

      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    };
  }, [cleanupAudioNodes, stopVoice]);

  const onContinue = useCallback(() => {
    finalizeCompletion();
  }, [finalizeCompletion]);

  // Also unlock voice when user flips Sound ON (gesture is the click)
  const onToggleSound = useCallback(
    async (next) => {
      setSoundOn(next);
      if (next) {
        resumeAudioContext();
        await unlockVoicePlayback();
      } else {
        stopVoice();
      }
    },
    [resumeAudioContext, stopVoice, unlockVoicePlayback]
  );

  return (
    <div
      ref={containerRef}
      style={{
        width,
        position: "relative",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <style>{`
        .archery-rotate-icon {
          width: 74px;
          height: 74px;
          border-radius: 16px;
          border: 2px solid rgba(248, 229, 190, 0.44);
          position: relative;
          animation: archeryRotatePulse 1.5s ease-in-out infinite;
        }

        .archery-rotate-icon::before,
        .archery-rotate-icon::after {
          content: "";
          position: absolute;
          width: 12px;
          height: 12px;
          border-top: 2px solid rgba(255, 239, 210, 0.8);
          border-right: 2px solid rgba(255, 239, 210, 0.8);
        }

        .archery-rotate-icon::before {
          top: -8px;
          right: -8px;
          transform: rotate(45deg);
        }

        .archery-rotate-icon::after {
          left: -8px;
          bottom: -8px;
          transform: rotate(225deg);
        }

        .archery-callout {
          animation-name: archeryCallout;
          animation-timing-function: ease;
          animation-fill-mode: both;
        }

        .archery-hit-flash {
          animation: archeryHitFlash 760ms ease both;
        }

        @keyframes archeryRotatePulse {
          0%,
          100% {
            transform: rotate(0deg);
            box-shadow: 0 0 0 rgba(251, 222, 173, 0.2);
          }
          45% {
            transform: rotate(90deg);
            box-shadow: 0 0 0 8px rgba(251, 222, 173, 0.06);
          }
        }

        @keyframes archeryCallout {
          0% { opacity: 0; transform: translateY(12px) scale(0.98); }
          18%, 70% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-8px) scale(1.01); }
        }

        @keyframes archeryHitFlash {
          0% { opacity: 0; transform: translateY(8px) scale(0.96); }
          22%, 58% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-6px) scale(1.02); }
        }

        @media (prefers-reduced-motion: reduce) {
          .archery-rotate-icon,
          .archery-callout,
          .archery-hit-flash { animation: none !important; }
        }
      `}</style>

      <div style={hudBar}>
        <div>
          <div style={title}>Extinguish the candles</div>
          <div style={subtitle}>Draw from anywhere, release to shoot. Max 2 candles per arrow.</div>
        </div>

        <div style={statusPills}>
          <span style={pill}>Shots: {shotsUI}</span>
          <span style={pill}>Left: {remainingUI}</span>
        </div>
      </div>

      <div style={arenaWrap}>
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: gameHeight,
            display: "block",
            touchAction: "none",
            pointerEvents: showRotateOverlay ? "none" : "auto",
            opacity: showRotateOverlay ? 0.42 : 1,
          }}
        />

        <div
          ref={bowWrapRef}
          style={{
            position: "absolute",
            left: BOW_LEFT_PX,
            top: 8,
            bottom: 8,
            width: BOW_WIDTH,
            transform: `scaleX(${BOW_MIRRORED ? -1 : 1})`,
            transformOrigin: "50% 52%",
            pointerEvents: "none",
            opacity: 0.99,
            filter:
              "drop-shadow(0 16px 30px rgba(0, 0, 0, 0.44)) drop-shadow(0 0 8px rgba(255, 226, 168, 0.18))",
          }}
        >
          <div
            ref={bowHostRef}
            style={{
              width: "100%",
              height: "100%",
              filter: "contrast(1.18) saturate(1.18) brightness(1.05)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(82% 62% at 42% 48%, rgba(255,238,203,0.14), rgba(0,0,0,0) 64%), linear-gradient(120deg, rgba(248,219,164,0.1), rgba(0,0,0,0) 34%)",
              mixBlendMode: "screen",
            }}
          />
        </div>

        <div style={toggleWrap}>
          <TogglePill label="Sound" value={soundOn} onChange={onToggleSound} />
          <TogglePill label="Haptics" value={hapticsOn} onChange={setHapticsOn} />
        </div>

        {!assetsReady && (
          <div style={assetBadge}>
            <span>Loading assets…</span>
          </div>
        )}

        {hitFlash && (
          <div style={hitFlashWrap}>
            <div className="archery-hit-flash" key={hitFlash.key} style={hitFlashText}>
              {hitFlash.text}
            </div>
          </div>
        )}

        {callout && (
          <div style={calloutWrap}>
            <div
              className="archery-callout"
              key={callout.key}
              style={{
                ...calloutCard,
                animationDuration: `${callout.durationMs}ms`,
              }}
            >
              {callout.text}
            </div>
          </div>
        )}

        {showRotateOverlay && (
          <div style={rotateOverlay}>
            <div style={rotateCard}>
              <div className="archery-rotate-icon" />
              <div style={rotateText}>Rotate your phone to landscape to shoot 🎯</div>
            </div>
          </div>
        )}

        {doneUI && (
          <div style={doneOverlay}>
            <div style={doneCard}>
              <div style={doneTitle}>Candles out ✅</div>
              <button type="button" style={continueBtn} onClick={onContinue}>
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TogglePill({ label, value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      style={{
        appearance: "none",
        borderRadius: 999,
        border: "1px solid rgba(250, 236, 203, 0.24)",
        background: value ? "rgba(224, 184, 119, 0.34)" : "rgba(21, 15, 11, 0.42)",
        color: "#fff9ec",
        fontSize: 12,
        padding: "6px 10px",
        cursor: "pointer",
      }}
    >
      {label}: {value ? "On" : "Off"}
    </button>
  );
}

const hudBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  padding: "10px 12px",
  color: "#f4e7ce",
};

const title = { fontSize: 15, fontWeight: 700 };
const subtitle = { fontSize: 12, opacity: 0.84 };

const statusPills = { display: "flex", gap: 8, alignItems: "center" };

const pill = {
  borderRadius: 999,
  border: "1px solid rgba(248, 232, 202, 0.2)",
  background: "rgba(22, 16, 12, 0.42)",
  padding: "6px 10px",
  fontSize: 12,
  color: "#f5e8cf",
};

const arenaWrap = {
  position: "relative",
  borderRadius: 22,
  overflow: "hidden",
  border: "1px solid rgba(245, 230, 198, 0.2)",
  boxShadow: "0 22px 56px rgba(0, 0, 0, 0.46)",
  background:
    "linear-gradient(165deg, rgba(84,59,36,0.38), rgba(16,12,8,0.64)), radial-gradient(128% 112% at 50% 8%, rgba(255,216,145,0.22), rgba(0,0,0,0.24))",
};

const toggleWrap = {
  position: "absolute",
  top: 10,
  left: 10,
  zIndex: 20,
  display: "flex",
  gap: 8,
};

const assetBadge = {
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 20,
  borderRadius: 999,
  border: "1px solid rgba(248, 232, 202, 0.2)",
  background: "rgba(22, 16, 12, 0.46)",
  color: "#f6e7c6",
  fontSize: 12,
  padding: "6px 10px",
};

const rotateOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 140,
  display: "grid",
  placeItems: "center",
  background: "rgba(10, 7, 5, 0.72)",
  backdropFilter: "blur(3px)",
  padding: 18,
};

const rotateCard = {
  width: "100%",
  maxWidth: 420,
  borderRadius: 20,
  border: "1px solid rgba(244, 225, 187, 0.28)",
  background: "linear-gradient(180deg, rgba(50,36,24,0.9), rgba(22,15,11,0.92))",
  boxShadow: "0 18px 44px rgba(0,0,0,0.46)",
  padding: "20px 18px",
  display: "grid",
  placeItems: "center",
  gap: 14,
  textAlign: "center",
  color: "#f8ead1",
};

const rotateText = { fontSize: 17, lineHeight: 1.35, fontWeight: 650 };

const hitFlashWrap = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 52,
  zIndex: 32,
  display: "grid",
  placeItems: "center",
  pointerEvents: "none",
};

const hitFlashText = {
  borderRadius: 999,
  border: "1px solid rgba(247, 225, 181, 0.34)",
  background: "rgba(28, 20, 14, 0.7)",
  color: "#ffeccc",
  fontWeight: 700,
  letterSpacing: "0.2px",
  fontSize: 14,
  padding: "7px 14px",
};

const calloutWrap = {
  position: "absolute",
  inset: 0,
  zIndex: 54,
  display: "grid",
  placeItems: "center",
  pointerEvents: "none",
  padding: 18,
};

const calloutCard = {
  maxWidth: 520,
  textAlign: "center",
  borderRadius: 16,
  border: "1px solid rgba(249, 226, 182, 0.36)",
  background: "linear-gradient(180deg, rgba(42,31,21,0.82), rgba(19,14,10,0.84))",
  color: "#fff0d3",
  fontSize: 23,
  fontWeight: 760,
  lineHeight: 1.22,
  letterSpacing: "0.2px",
  padding: "14px 18px",
  boxShadow: "0 18px 40px rgba(0, 0, 0, 0.4)",
};

const doneOverlay = {
  position: "absolute",
  inset: 0,
  zIndex: 65,
  background: "rgba(8, 6, 5, 0.56)",
  display: "grid",
  placeItems: "center",
  padding: 16,
};

const doneCard = {
  width: "100%",
  maxWidth: 360,
  borderRadius: 16,
  border: "1px solid rgba(246, 228, 193, 0.24)",
  background: "linear-gradient(180deg, rgba(49,35,24,0.82), rgba(23,15,11,0.86))",
  padding: 16,
  textAlign: "center",
  color: "#f8ead0",
};

const doneTitle = { fontSize: 19, marginBottom: 12, fontWeight: 700 };

const continueBtn = {
  width: "100%",
  borderRadius: 999,
  border: "1px solid rgba(246, 228, 193, 0.3)",
  background: "linear-gradient(90deg, rgba(206, 153, 83, 0.42), rgba(246, 206, 139, 0.3))",
  color: "#fffaf0",
  fontWeight: 700,
  fontSize: 14,
  padding: "10px 12px",
  cursor: "pointer",
};