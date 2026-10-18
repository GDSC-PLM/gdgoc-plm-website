"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { HypeCounter, type HypeLabels } from "@/features/hype/components/hype-counter";
import { useHypeCounter } from "@/features/hype/use-hype-counter";

type LandingExperienceProps = {
  branding: ReactNode;
  socials: ReactNode;
  bird: ReactNode;
  surprises: ReactNode;
  hintArtwork: ReactNode;
  copy: ReactNode;
  backdrop: ReactNode;
  labels: HypeLabels;
};

type BirdMotion = "flutter" | "tap" | "hop" | "stretch";
type BirdPose = "rest" | "drift-up" | "drift-down" | BirdMotion | "settle";
type Attention = "none" | "head" | "body" | "tail";
type Reward = "orbit" | "code";
type Visit = { taps: number; orbitSeen: boolean; codeSeen: boolean; pending: Reward | null };
type SkyMode = "quiet" | "ambient" | "shower";
type PaperStage = "untraced" | "tracing" | "filled";
type ConstellationPose = "none" | "left-draw" | "left-fade" | "right-draw" | "right-fade";
type SkyPose = {
  mode: SkyMode;
  lane: number | null;
  travel: boolean;
  visible: boolean;
  glow: boolean;
};

const restingSky: SkyPose = { mode: "quiet", lane: null, travel: false, visible: false, glow: false };
const entranceDurationMs = 2_000;
const skyTiming = {
  launchMs: 40,
  glowFadeMs: 750,
  meteorFadeMs: 600,
  finishMs: 2_100,
  idleIntervalsMs: [12_000, 18_000, 15_000],
  starFirstMs: 5_000,
  starHoldMs: 1_600,
  starRestMs: 4_000,
} as const;

const clickSound = { pitches: [[650, 220], [720, 260], [580, 200]], peakGain: 0.025, durationSeconds: 0.035 } as const;
const milestoneSettings = { orbitAt: 5, codeAt: 15, orbitMs: 2_400, codeMs: 3_400, fadeMs: 400 } as const;
const visitKey = "gdgoc-bird-visit-v1";
const focusCorners = ["top-0 left-0 rounded-tl border-t-2 border-l-2", "top-0 right-0 rounded-tr border-t-2 border-r-2", "bottom-0 left-0 rounded-bl border-b-2 border-l-2", "right-0 bottom-0 rounded-br border-r-2 border-b-2"] as const;

function saveVisit(visit: Visit): void {
  try { sessionStorage.setItem(visitKey, JSON.stringify(visit)); } catch { /* Surprises can stay in memory when session storage is unavailable. */ }
}
const birdDriftDurationMs = 2_200;
const constellationTiming = { firstMs: 2_600, fadeMs: 8_000, resetMs: 9_800, nextMs: 14_000 } as const;
const birdMotionTiming = {
  flutter: { holdMs: 260, restMs: 700 },
  tap: { holdMs: 130, restMs: 650 },
  hop: { holdMs: 170, restMs: 800 },
  stretch: { holdMs: 280, restMs: 900 },
} satisfies Record<BirdMotion, { holdMs: number; restMs: number }>;

export function LandingExperience({ branding, socials, bird, surprises, hintArtwork, copy, backdrop, labels }: LandingExperienceProps) {
  const counter = useHypeCounter();
  const { canTap } = counter;
  const [birdPose, setBirdPose] = useState<BirdPose>("rest");
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [entered, setEntered] = useState(false);
  const [paperStage, setPaperStage] = useState<PaperStage>("untraced");
  const [constellationPose, setConstellationPose] = useState<ConstellationPose>("none");
  const [sky, setSky] = useState<SkyPose>(restingSky);
  const [twinklingStar, setTwinklingStar] = useState<number | null>(null);
  const [attention, setAttention] = useState<Attention>("none");
  const [reward, setReward] = useState<Reward | null>(null);
  const [rewardPhase, setRewardPhase] = useState<"start" | "active" | "fade">("start");
  const [glints, setGlints] = useState(false);
  const attentionRef = useRef<Attention>("none");
  const visit = useRef<Visit>({ taps: 0, orbitSeen: false, codeSeen: false, pending: null });
  const rewardBusy = useRef<Reward | null>(null);
  const glintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const lastSoundTime = useRef(-1);
  const skyBusy = useRef<SkyMode>("quiet");
  const skyTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const birdTimers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const clearBirdTimers = useCallback((): void => {
    birdTimers.current.forEach(clearTimeout);
    birdTimers.current.clear();
  }, []);

  const clearSkyTimers = useCallback((): void => {
    skyTimers.current.forEach(clearTimeout);
    skyTimers.current.clear();
    skyBusy.current = "quiet";
  }, []);

  const playSky = useCallback((mode: Exclude<SkyMode, "quiet">, lane = 0): void => {
    if (!motionAllowed || document.hidden || skyBusy.current === "shower") return;
    if (mode === "ambient" && skyBusy.current !== "quiet") return;
    if (skyBusy.current === "ambient") clearSkyTimers();

    skyBusy.current = mode;
    setSky({ mode, lane: mode === "ambient" ? lane : null, travel: false, visible: false, glow: mode === "shower" });

    function schedulePose(delayMs: number, pose: Partial<SkyPose>): void {
      const timer = setTimeout(() => {
        skyTimers.current.delete(timer);
        setSky((previous) => ({ ...previous, ...pose }));
      }, delayMs);
      skyTimers.current.add(timer);
    }

    // Give the starting pose a paint before moving the fixed set of meteor tracks.
    schedulePose(skyTiming.launchMs, { travel: true, visible: true });
    schedulePose(skyTiming.glowFadeMs, { glow: false });
    schedulePose(skyTiming.meteorFadeMs, { visible: false });
    const finish = setTimeout(() => {
      skyTimers.current.delete(finish);
      skyBusy.current = "quiet";
      setSky(restingSky);
    }, skyTiming.finishMs);
    skyTimers.current.add(finish);
  }, [clearSkyTimers, motionAllowed]);

  const playBirdMotion = useCallback((motion: BirdMotion): void => {
    if (!motionAllowed || document.hidden) return;
    if (motion === "flutter" && !entered) return;

    clearBirdTimers();
    setBirdPose(motion);
    const timing = birdMotionTiming[motion];
    const settle = setTimeout(() => {
      birdTimers.current.delete(settle);
      setBirdPose("settle");
    }, timing.holdMs);
    const rest = setTimeout(() => {
      birdTimers.current.delete(rest);
      setBirdPose("rest");
    }, timing.restMs);
    birdTimers.current.add(settle);
    birdTimers.current.add(rest);
  }, [clearBirdTimers, entered, motionAllowed]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    function syncMotion(): void {
      clearBirdTimers();
      setBirdPose("rest");
      clearSkyTimers();
      setSky(restingSky);
      setTwinklingStar(null);
      setConstellationPose("none");
      attentionRef.current = "none";
      setAttention("none");
      if (glintTimer.current) clearTimeout(glintTimer.current);
      setGlints(false);
      if (document.hidden) {
        rewardBusy.current = null;
        setReward(null);
        setRewardPhase("start");
      } else if (visit.current.pending) {
        rewardBusy.current = visit.current.pending;
        setReward(visit.current.pending);
        setRewardPhase("start");
        visit.current.pending = null;
        saveVisit(visit.current);
      }
      if (document.hidden || preference.matches) {
        setPaperStage("filled");
        setEntered(true);
      }
      setMotionAllowed(!preference.matches && !document.hidden);
    }

    const initial = setTimeout(syncMotion, 0);
    preference.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncMotion);
    return () => {
      clearTimeout(initial);
      clearBirdTimers();
      clearSkyTimers();
      preference.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
    };
  }, [clearBirdTimers, clearSkyTimers]);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(visitKey) ?? "null");
      if (typeof saved === "object" && saved !== null && "taps" in saved && typeof saved.taps === "number" &&
          Number.isSafeInteger(saved.taps) && saved.taps >= 0 && "orbitSeen" in saved && typeof saved.orbitSeen === "boolean" &&
          "codeSeen" in saved && typeof saved.codeSeen === "boolean" && "pending" in saved &&
          (saved.pending === null || saved.pending === "code" || saved.pending === "orbit")) {
        visit.current = { taps: saved.taps, orbitSeen: saved.orbitSeen, codeSeen: saved.codeSeen, pending: saved.pending };
      }
    } catch { /* A fresh visit is enough for optional visual discoveries. */ }
    return () => { if (glintTimer.current) clearTimeout(glintTimer.current); };
  }, []);

  useEffect(() => {
    if (!reward) return;
    const duration = reward === "orbit" ? milestoneSettings.orbitMs : milestoneSettings.codeMs;
    const show = setTimeout(() => {
      setRewardPhase("active");
      if (reward === "orbit") playSky("shower");
    }, 40);
    const fade = setTimeout(() => setRewardPhase("fade"), duration - milestoneSettings.fadeMs);
    const finish = setTimeout(() => {
      const next = visit.current.pending;
      visit.current.pending = null;
      rewardBusy.current = next;
      setReward(next);
      setRewardPhase("start");
      saveVisit(visit.current);
    }, duration);
    return () => { clearTimeout(show); clearTimeout(fade); clearTimeout(finish); };
  }, [reward, playSky]);

  useEffect(() => {
    const arrival = setTimeout(() => setEntered(true), entranceDurationMs);
    return () => clearTimeout(arrival);
  }, []);

  useEffect(() => {
    if (!motionAllowed || entered) return;
    const trace = setTimeout(() => setPaperStage("tracing"), 60);
    const fill = setTimeout(() => setPaperStage("filled"), 1_450);
    return () => {
      clearTimeout(trace);
      clearTimeout(fill);
    };
  }, [entered, motionAllowed]);

  useEffect(() => {
    if (!motionAllowed) return;
    let side: "left" | "right" = "left";
    let start: ReturnType<typeof setTimeout>;
    let fade: ReturnType<typeof setTimeout>;
    let reset: ReturnType<typeof setTimeout>;

    function traceConstellation(): void {
      setConstellationPose(side === "left" ? "left-draw" : "right-draw");
      fade = setTimeout(() => setConstellationPose(side === "left" ? "left-fade" : "right-fade"), constellationTiming.fadeMs);
      reset = setTimeout(() => setConstellationPose("none"), constellationTiming.resetMs);
      start = setTimeout(() => {
        side = side === "left" ? "right" : "left";
        traceConstellation();
      }, constellationTiming.nextMs);
    }

    start = setTimeout(traceConstellation, constellationTiming.firstMs);
    return () => {
      clearTimeout(start);
      clearTimeout(fade);
      clearTimeout(reset);
    };
  }, [motionAllowed]);

  useEffect(() => {
    if (!motionAllowed) return;
    let cycle = 0;
    let timer: ReturnType<typeof setTimeout>;

    function scheduleNextMeteor(): void {
      const delay = skyTiming.idleIntervalsMs[cycle % skyTiming.idleIntervalsMs.length];
      timer = setTimeout(() => {
        playSky("ambient", cycle % 3);
        cycle += 1;
        scheduleNextMeteor();
      }, delay);
    }

    scheduleNextMeteor();
    return () => clearTimeout(timer);
  }, [motionAllowed, playSky]);

  useEffect(() => {
    if (!motionAllowed) return;
    let star = 0;
    let brighten: ReturnType<typeof setTimeout>;
    let dim: ReturnType<typeof setTimeout>;

    function shine(): void {
      setTwinklingStar(star);
      dim = setTimeout(() => {
        setTwinklingStar(null);
        star = (star + 1) % 4;
        brighten = setTimeout(shine, skyTiming.starRestMs);
      }, skyTiming.starHoldMs);
    }

    brighten = setTimeout(shine, skyTiming.starFirstMs);
    return () => {
      clearTimeout(brighten);
      clearTimeout(dim);
    };
  }, [motionAllowed]);

  useEffect(() => {
    if (!motionAllowed || !entered || !["rest", "drift-up", "drift-down"].includes(birdPose)) return;
    const drift = setTimeout(() => {
      const nextPose = birdPose === "drift-up" ? "drift-down" : "drift-up";
      setBirdPose((previous) => previous === birdPose ? nextPose : previous);
    }, birdPose === "rest" ? 150 : birdDriftDurationMs);
    return () => clearTimeout(drift);
  }, [birdPose, entered, motionAllowed]);

  useEffect(() => {
    return () => {
      const context = audioContext.current;
      audioContext.current = null;
      if (context && context.state !== "closed") void context.close().catch(() => {});
    };
  }, []);

  function prepareAudio(): void {
    try {
      audioContext.current ??= new AudioContext();
      if (audioContext.current.state === "suspended") void audioContext.current.resume().catch(() => {});
    } catch { /* Counting remains available without audio. */ }
  }

  async function playClickSound(reaction: number): Promise<void> {
    try {
      const context = audioContext.current ?? new AudioContext();
      audioContext.current = context;
      if (context.state === "suspended") await context.resume();
      if (context.state !== "running" || document.hidden) return;

      const now = context.currentTime;
      if (now - lastSoundTime.current < 0.04) return;
      lastSoundTime.current = now;

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      const [highHz, lowHz] = clickSound.pitches[reaction];
      oscillator.frequency.setValueAtTime(highHz, now);
      oscillator.frequency.exponentialRampToValueAtTime(lowHz, now + clickSound.durationSeconds);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(clickSound.peakGain, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + clickSound.durationSeconds);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(now);
      oscillator.stop(now + clickSound.durationSeconds + 0.005);
    } catch {
      // Audio support must never prevent a tap from reaching the counter.
    }
  }

  function attend(zone: Attention): void {
    const next = motionAllowed && entered ? zone : "none";
    if (attentionRef.current === next) return;
    attentionRef.current = next;
    setAttention(next);
  }

  function discover(kind: Reward): void {
    if (rewardBusy.current) {
      if (kind === "code") visit.current.pending = kind;
    } else {
      rewardBusy.current = kind;
      setRewardPhase("start");
      setReward(kind);
    }
  }

  async function tap(): Promise<void> {
    prepareAudio();
    if (!await counter.queueTap()) return;

    setPaperStage("filled");
    setEntered(true);
    visit.current.taps += 1;
    const reaction = (visit.current.taps - 1) % 3;
    playBirdMotion((["tap", "hop", "stretch"] as const)[reaction]);
    setGlints(true);
    if (glintTimer.current) clearTimeout(glintTimer.current);
    glintTimer.current = setTimeout(() => setGlints(false), 300);
    void playClickSound(reaction);
    if (visit.current.taps >= milestoneSettings.orbitAt && !visit.current.orbitSeen) {
      visit.current.orbitSeen = true;
      discover("orbit");
    }
    if (visit.current.taps >= milestoneSettings.codeAt && !visit.current.codeSeen) {
      visit.current.codeSeen = true;
      discover("code");
    }
    saveVisit(visit.current);
  }

  return (
    <div
      className="group/sky relative flex min-h-full flex-col overflow-x-clip bg-[radial-gradient(ellipse_70%_85%_at_50%_80%,var(--indigo),var(--midnight))]"
      data-landing-experience
      data-entered={entered}
      data-paper={paperStage}
      data-constellation={constellationPose}
      data-sky={sky.mode}
      data-meteor-lane={sky.lane ?? "none"}
      data-flight={sky.travel ? "on" : "off"}
      data-meteors-visible={sky.visible}
      data-glow={sky.glow ? "on" : "off"}
      data-star={twinklingStar ?? "none"}
      data-motion={motionAllowed ? "on" : "off"}
      data-reward={reward ?? "none"}
      data-reward-phase={rewardPhase}
      data-glints={glints ? "on" : "off"}
    >
      {backdrop}
      <header className="relative z-10 flex shrink-0 justify-center px-(--page-x) pt-(--page-top) md:justify-start md:pb-10 motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-backwards motion-safe:duration-300 motion-safe:group-data-[entered=true]/sky:animate-none">
        <div className="flex min-h-11 min-w-0 max-w-full items-center">
          {branding}
        </div>
      </header>

      <main className="z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 pb-26 text-center max-md:py-2 [@media(max-height:450px)]:pb-6" aria-labelledby="landing-title">
        <div className="relative z-10 mb-1 w-full md:absolute md:top-(--page-top) md:left-1/2 md:mb-0 md:w-[clamp(12rem,23vw,20rem)] md:-translate-x-1/2">
          <HypeCounter labels={labels} state={counter} motionAllowed={motionAllowed} />
        </div>
        <div className="relative mx-auto grid h-(--bird-height) w-(--bird-width) place-items-center" data-hype-stage>
          {surprises}
          <button
            className="group/bird relative z-10 grid h-(--bird-height) w-(--bird-width) touch-manipulation place-items-center rounded-xl border-0 bg-transparent p-0 text-(--white) [--fold-duration:300ms] [--bird-ease:cubic-bezier(0.16,1,0.3,1)] [-webkit-tap-highlight-color:transparent] focus-visible:outline-none forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-4 forced-colors:focus-visible:outline-[CanvasText] disabled:cursor-default data-[pose=drift-up]:[--fold-duration:2200ms] data-[pose=drift-down]:[--fold-duration:2200ms] data-[pose=drift-up]:[--bird-ease:cubic-bezier(0.45,0,0.55,1)] data-[pose=drift-down]:[--bird-ease:cubic-bezier(0.45,0,0.55,1)] data-[pose=tap]:[--fold-duration:140ms] data-[pose=hop]:[--fold-duration:170ms] data-[pose=stretch]:[--fold-duration:280ms] data-[pose=settle]:[--fold-duration:420ms] data-[pose=settle]:[--bird-ease:cubic-bezier(0.34,1.56,0.64,1)]"
            aria-label={labels.button}
            aria-describedby="hype-hint hype-feedback"
            data-hype-button
            data-pose={birdPose}
            data-motion={motionAllowed ? "on" : "off"}
            data-attention={attention}
            disabled={!canTap}
            onClick={tap}
            onFocus={() => attend("head")}
            onBlur={() => attend("none")}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") attend("body");
            }}
            onPointerMove={(event) => {
              if (event.pointerType !== "mouse") return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const x = (event.clientX - bounds.left) / bounds.width;
              attend(x < 0.35 ? "head" : x > 0.65 ? "tail" : "body");
            }}
            onPointerLeave={(event) => attend(event.currentTarget.matches(":focus-visible") ? "head" : "none")}
            onPointerDown={(event) => { if (event.pointerType !== "mouse") attend("head"); }}
            onPointerUp={(event) => { if (event.pointerType !== "mouse") attend("none"); }}
            onPointerCancel={() => attend("none")}
            type="button"
          >
            <span
              className="grid size-full place-items-center motion-safe:transition-transform motion-safe:duration-(--fold-duration) motion-safe:ease-(--bird-ease) motion-safe:group-data-[pose=drift-up]/bird:-translate-y-0.5 motion-safe:group-data-[pose=drift-up]/bird:-rotate-[0.35deg] motion-safe:group-data-[pose=drift-down]/bird:translate-y-0.5 motion-safe:group-data-[pose=drift-down]/bird:rotate-[0.35deg] motion-safe:group-data-[pose=tap]/bird:-translate-y-0.5 motion-safe:group-data-[pose=tap]/bird:scale-[0.94] motion-safe:group-data-[pose=hop]/bird:translate-x-1 motion-safe:group-data-[pose=hop]/bird:-translate-y-1.5 motion-safe:group-data-[pose=hop]/bird:rotate-2 motion-safe:group-data-[pose=hop]/bird:scale-[0.98] motion-safe:group-data-[pose=stretch]/bird:-translate-y-0.5 motion-safe:group-data-[pose=stretch]/bird:scale-[1.015] group-data-[motion=off]/bird:transition-none"
              data-hype-artwork
            >
              <span className="grid size-full place-items-center motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-data-[attention=head]/bird:-translate-x-0.5 motion-safe:group-data-[attention=body]/bird:-rotate-1 motion-safe:group-data-[attention=tail]/bird:translate-x-0.5 group-data-[motion=off]/bird:transition-none">{bird}</span>
            </span>
            <span className="pointer-events-none absolute inset-1 text-(--lavender) opacity-0 group-focus-visible/bird:opacity-100 forced-colors:hidden" aria-hidden="true" data-bird-focus>
              {focusCorners.map((position) => <span className={`absolute size-3.5 border-current ${position}`} key={position} />)}
            </span>
          </button>
        </div>
        <div className="relative -mt-5 grid min-h-[3.333rem] w-48 max-w-full place-items-center motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-backwards motion-safe:duration-300 motion-safe:delay-600 motion-safe:group-data-[entered=true]/sky:animate-none md:-mt-9" data-hype-hint id="hype-hint">
          <span className={reward ? "invisible" : ""}>{hintArtwork}</span>
          <span className="absolute inset-0 grid place-items-center text-sm leading-snug text-(--lavender) italic transition-opacity duration-400 group-data-[reward-phase=fade]/sky:opacity-0" role="status" data-bird-caption>{reward === "orbit" ? labels.attention : reward === "code" ? labels.hello : ""}</span>
          <span className="sr-only">{labels.hint}</span>
        </div>
        {copy}
      </main>
      <footer className="relative z-10 flex shrink-0 justify-center px-(--page-x) pb-[max(1.5rem,env(safe-area-inset-bottom))] md:absolute md:top-(--page-top) md:right-(--page-x) md:max-w-[33%] md:p-0" data-landing-footer>
        {socials}
      </footer>
    </div>
  );
}
