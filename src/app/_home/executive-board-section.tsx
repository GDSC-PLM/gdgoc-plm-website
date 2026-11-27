"use client";

import { MediaImage as Image } from "@/components/shared/media-image";
import { contentMedia } from "@/content/media";
import Link from "next/link";
import { motion } from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import {
  boardMembers,
  homeButtonClass,
  homeHeadingClass,
  type BoardGroup,
  type BoardMember,
} from "@/app/_home/home-config";

const boardTiming = {
  revealSeconds: 0.6,
  staggerSeconds: 0.07,
  closeMs: 300,
} as const;
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void): () => void {
  const preference = window.matchMedia(reducedMotionQuery);
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}

function readMotionPreference(): boolean {
  return window.matchMedia(reducedMotionQuery).matches;
}

function serverMotionPreference(): boolean {
  return true;
}

const deputyConstellations = [
  {
    file: "constellation.svg",
    className: "top-[183.706px] left-[111.91px] h-[46.905px] w-[61.949px]",
    inset: "inset-[-24.34%_-11.94%_-25.1%_-19.04%]",
  },
  {
    file: "constellation1.svg",
    className: "top-[18.069px] left-[113.907px] h-[51.469px] w-[58.358px]",
    inset: "inset-[-12.06%_-14.91%_-22.74%_-19.49%]",
  },
  {
    file: "constellation2.svg",
    className: "top-[188.725px] left-[27.977px] h-[47.355px] w-[62.505px]",
    inset: "inset-[-25.21%_-18.83%_-25.01%_-18.75%]",
  },
  {
    file: "constellation3.svg",
    className:
      "top-[24.432px] left-[19.983px] h-[44.573px] w-[64.855px] -rotate-[3.06deg]",
    inset: "inset-[-27.7%_-18.97%_-28.17%_-14.08%]",
  },
] as const;

function DeputyBack() {
  return (
    <div className="absolute inset-0 rounded-[20px] border border-[#f5f3fa]/50 bg-[linear-gradient(91.218deg,rgba(105,64,134,0.5)_1.044%,rgba(194,106,140,0.5)_35.602%,rgba(225,177,156,0.5)_47.425%,rgba(242,134,125,0.35)_64.704%,rgba(92,30,59,0.5)_95.625%)] shadow-[0_0_14px_rgba(241,207,128,0.45)]">
      <div className="absolute top-[15px] left-[11px] h-[230px] w-[168px] rounded-[20px] border border-[#f5f3fa]/50 bg-[linear-gradient(155.527deg,#2f1948_10.164%,#431d4c_64.279%,#72315b_95.258%)]" />
      <Image
        src="/home/deputy-back/card-deputy-unflipped.svg"
        width={0.642412}
        height={1.15299}
        alt=""
        className="absolute top-[39.22px] left-[51.994px]"
        unoptimized
      />
      <div className="absolute top-[66.755px] left-[38.968px] h-[111.429px] w-[111.909px]">
        <div className="absolute inset-[-11.67%_-11.62%]">
          <Image
            src="/home/deputy-back/ellipse616.svg"
            width={138}
            height={137}
            alt=""
            className="size-full"
            unoptimized
          />
        </div>
      </div>
      <div className="absolute top-[55.211px] left-[27.977px] h-[134.517px] w-[133.892px] opacity-40">
        <div className="absolute inset-[-9.66%_-9.71%]">
          <Image
            src="/home/deputy-back/ellipse625.png"
            width={160}
            height={161}
            alt=""
            className="size-full"
            sizes="160px"
          />
        </div>
      </div>
      <div className="absolute top-[92.465px] left-[64.947px] h-[62.129px] w-[60.888px]">
        <div className="absolute inset-[-19.31%_-19.71%]">
          <Image
            src="/home/deputy-back/card-moon.svg"
            width={85}
            height={86}
            alt=""
            className="size-full"
            unoptimized
          />
        </div>
      </div>
      {deputyConstellations.map(({ file, className, inset }) => (
        <div key={file} className={`absolute ${className}`}>
          <div className={`absolute ${inset}`}>
            <Image
              src={`/home/deputy-back/${file}`}
              width={80}
              height={70}
              alt=""
              unoptimized
              className="size-full"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MemberFace({
  member,
  group,
}: {
  member: BoardMember;
  group: BoardGroup;
}) {
  const deputy = group === "deputies";

  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-[20px] border border-[#f5f3fa]/50 ${deputy ? "bg-[linear-gradient(91.218deg,rgba(105,64,134,0.5)_1.044%,rgba(194,106,140,0.5)_35.602%,rgba(225,177,156,0.5)_47.425%,rgba(242,134,125,0.35)_64.704%,rgba(92,30,59,0.5)_95.625%)]" : "bg-[linear-gradient(91.218deg,rgba(73,138,244,0.5)_1.044%,rgba(197,185,238,0.5)_35.602%,rgba(245,243,250,0.5)_47.425%,rgba(197,185,238,0.5)_64.704%,rgba(105,64,134,0.5)_95.625%)]"}`}
    >
      <div
        className={`absolute top-[16px] left-[11px] h-[230px] w-[168px] rounded-[20px] border border-[#f5f3fa]/50 ${deputy ? "bg-[linear-gradient(155.527deg,#2f1948_10.164%,#431d4c_64.279%,#72315b_95.258%)]" : "bg-[linear-gradient(155.527deg,#142559_10.164%,#232b69_64.279%,#694086_95.258%)]"}`}
      />
      <div className="absolute top-[15px] left-3 h-[230px] w-[168px] overflow-hidden rounded-[20px]">
        <Image
          src={
            contentMedia[member.portrait as keyof typeof contentMedia] ??
            member.portrait
          }
          placeholder="blur"
          width={720}
          height={1080}
          alt=""
          sizes="180px"
          className="absolute top-0 -left-[0.29%] h-[105.15%] w-[100.2%] max-w-none"
        />
      </div>
      <div
        className={`absolute top-[109px] left-px h-[151px] w-[188px] rounded-b-2xl ${deputy ? "bg-[linear-gradient(0.762deg,#2f1948_13.665%,rgba(47,25,72,0.8)_62.106%,rgba(47,25,72,0.4)_80.447%,transparent_89.787%)]" : "bg-[linear-gradient(0.762deg,#142559_13.665%,rgba(20,37,89,0.8)_62.106%,rgba(20,37,89,0.137)_80.447%,transparent_89.787%)]"}`}
      />
      <div className="absolute inset-x-1 bottom-4 px-2 text-center">
        <p className="text-[16px] leading-tight font-bold text-white">
          {member.name}
        </p>
        <p className="mt-[8px] text-[14px] leading-snug font-medium text-[#d7d0e4]">
          {member.role}
        </p>
      </div>
    </div>
  );
}

function MemberCard({
  member,
  group,
  revealed,
  index,
  reducedMotion,
  directory,
}: {
  member: BoardMember;
  group: BoardGroup;
  revealed: boolean;
  index: number;
  reducedMotion: boolean;
  directory: boolean;
}) {
  return (
    <li
      className={directory ? "relative aspect-[190/260] w-full max-w-[10rem] [container-type:inline-size] [perspective:1000px]" : "relative h-[13.6875rem] w-[10rem] shrink-0 [container-type:inline-size] [perspective:1000px] lg:aspect-[190/260] lg:h-auto lg:w-full lg:max-w-[170px] lg:justify-self-center"}
      aria-label={`${member.name}, ${member.role}`}
    >
      <div className="absolute top-0 left-0 h-[260px] w-[190px] origin-top-left scale-[calc(100cqw/190px)]">
        <motion.div
          className="relative size-full [transform-style:preserve-3d]"
          initial={false}
          animate={{ rotateY: revealed ? 180 : 0 }}
          transition={{
            duration: reducedMotion
              ? 0
              : revealed
                ? boardTiming.revealSeconds
                : boardTiming.closeMs / 1000,
            delay:
              reducedMotion || !revealed
                ? 0
                : index * boardTiming.staggerSeconds,
          }}
        >
          <div
            className="absolute inset-0 [backface-visibility:hidden]"
            aria-hidden="true"
          >
            {group === "deputies" ? (
              <DeputyBack />
            ) : (
              <div className="absolute inset-[-5.5%_-7.53%]">
                <Image
                  src={member.back}
                  width={218.6}
                  height={288.6}
                  alt=""
                  className="size-full"
                  unoptimized
                />
              </div>
            )}
          </div>
          <div
            className="absolute inset-0 rotate-y-180 [backface-visibility:hidden]"
            aria-hidden="true"
          >
            <MemberFace member={member} group={group} />
          </div>
        </motion.div>
      </div>
    </li>
  );
}

export function ExecutiveBoardSection({
  artwork,
  frame,
  directory = false,
}: {
  artwork: ReactNode;
  frame: ReactNode;
  directory?: boolean;
}) {
  const [selectedGroup, setSelectedGroup] = useState<BoardGroup>("executives");
  const [displayedGroup, setDisplayedGroup] =
    useState<BoardGroup>("executives");
  const [revealed, setRevealed] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    readMotionPreference,
    serverMotionPreference,
  );
  const rowRef = useRef<HTMLUListElement>(null);
  const tabsRef = useRef<Partial<Record<BoardGroup, HTMLButtonElement>>>({});
  const visibleRef = useRef(false);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        visibleRef.current = true;
        setRevealed(true);
        observer.disconnect();
      },
      { threshold: 0.2 },
    );
    observer.observe(row);
    return () => {
      observer.disconnect();
      if (switchTimer.current) clearTimeout(switchTimer.current);
    };
  }, []);

  function selectGroup(group: BoardGroup): void {
    if (group === selectedGroup) return;
    if (switchTimer.current) clearTimeout(switchTimer.current);
    setSelectedGroup(group);
    if (reducedMotion || !visibleRef.current) {
      setDisplayedGroup(group);
      setRevealed(visibleRef.current);
      return;
    }
    setRevealed(false);
    switchTimer.current = setTimeout(() => {
      setDisplayedGroup(group);
      switchTimer.current = setTimeout(() => setRevealed(true), 40);
    }, boardTiming.closeMs);
  }

  function navigateTabs(event: KeyboardEvent<HTMLDivElement>): void {
    let group: BoardGroup;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight")
      group = selectedGroup === "executives" ? "deputies" : "executives";
    else if (event.key === "Home") group = "executives";
    else if (event.key === "End") group = "deputies";
    else return;
    event.preventDefault();
    selectGroup(group);
    tabsRef.current[group]?.focus();
  }

  return (
    <section
      id="executive-board"
      aria-labelledby="board-title"
      className="relative isolate min-h-[600px] w-full overflow-hidden bg-[#090817] font-(family-name:--font-home-body) text-[#eeeaf7]"
      data-home-section="board"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-45 select-none [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_70%,transparent)]"
        aria-hidden="true"
      >
        <div className="absolute top-1/2 left-1/2 h-[1058px] w-[1440px] -translate-1/2 scale-[max(calc(100vw/1440px),calc(100dvh/1058px))]">
          {artwork}
        </div>
      </div>
      <div className={`relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col [justify-content:safe_center] gap-6 py-[clamp(1rem,4dvh,3rem)] lg:gap-8 ${directory ? "" : "px-5 sm:px-8"}`}>
        <div className="flex shrink-0 flex-col items-center text-center">
          <h2 id="board-title" className={homeHeadingClass}>
            Executive Board
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#b5accb] sm:text-base">
            Meet the dedicated team behind every initiative, workshop, and event
          </p>
          {!directory && (
            <Link
              href="/team"
              className={`${homeButtonClass} mt-5 w-full max-w-[14rem]`}
            >
              View Full Board
            </Link>
          )}
        </div>
        <div className="flex w-full shrink-0 flex-col gap-4">
          <div
            role="tablist"
            aria-label="Executive Board"
            onKeyDown={navigateTabs}
            className="relative mx-auto flex min-h-12 w-full max-w-[340px] flex-wrap shrink-0 rounded-full border border-[#b6a1dc]/30 bg-[#14112b]/80 p-1 lg:mr-6 lg:ml-auto"
          >
            {(["executives", "deputies"] as const).map((group) => {
              const active = selectedGroup === group;
              return (
                <button
                  key={group}
                  ref={(element) => {
                    if (element) tabsRef.current[group] = element;
                  }}
                  id={`board-tab-${group}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="board-members"
                  tabIndex={active ? 0 : -1}
                  onClick={() => selectGroup(group)}
                  className={`relative flex min-w-[min(8rem,100%)] flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fbe29b] sm:text-base ${active ? "bg-[#b6a1dc]/18 text-[#eeeaf7] ring-1 ring-inset ring-[#b6a1dc]/35" : "text-[#a39bb5] hover:text-[#eeeaf7]"}`}
                >
                  <Image
                    src={
                      group === "executives"
                        ? "/home/board/selected-thumb.svg"
                        : "/home/board/moon.svg"
                    }
                    width={35}
                    height={35}
                    alt=""
                    unoptimized
                    className="size-7 shrink-0"
                  />
                  {group === "executives" ? "Executives" : "Deputies"}
                </button>
              );
            })}
          </div>
          <div
            id="board-members"
            role="tabpanel"
            aria-labelledby={`board-tab-${selectedGroup}`}
            className={directory ? "relative" : "relative rounded-xl border border-[#b6a1dc]/15 bg-[#14112b]/35 px-4 py-3 lg:border-0 lg:bg-transparent lg:px-8 lg:py-6"}
          >
            {frame}
            <ul
              ref={rowRef}
              tabIndex={0}
              aria-label={
                selectedGroup === "executives" ? "Executives" : "Deputies"
              }
              className={
                directory
                  ? "relative grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 md:grid-cols-3 py-2"
                  : "relative flex gap-5 overflow-x-auto py-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fbe29b] lg:grid lg:grid-cols-6 lg:overflow-visible lg:p-0"
              }
              data-board-revealed={revealed}
              data-board-group={displayedGroup}
            >
              {boardMembers[displayedGroup].map((member, index) => (
                <MemberCard
                  key={index}
                  member={member}
                  group={displayedGroup}
                  revealed={revealed}
                  index={index}
                  reducedMotion={Boolean(reducedMotion)}
                  directory={directory}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
