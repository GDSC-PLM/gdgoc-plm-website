"use client";

import { MediaImage as Image } from "@/components/shared/media-image";
import { contentMedia } from "@/content/media";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  homeButtonClass,
  homeGames,
  homeHeadingClass,
  type HomeGame,
} from "@/app/_home/home-config";

function GameIcon({
  game,
  small = false,
}: {
  game: HomeGame;
  small?: boolean;
}) {
  return (
    <span
      className={
        small
          ? "relative size-11 shrink-0 overflow-hidden rounded-xl border-2 border-[#fbe29b]"
          : "relative h-14 w-[68px] shrink-0 overflow-hidden rounded-xl"
      }
    >
      <Image
        src={game.icon}
        width={400}
        height={400}
        alt=""
        unoptimized
        className={`absolute max-w-none ${game.iconClass}`}
      />
    </span>
  );
}

function GameRowContent({ game }: { game: HomeGame }) {
  return (
    <>
      <GameIcon game={game} />
      <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
        <span className="text-lg leading-snug font-semibold text-[#f5f3fa] sm:text-xl">
          {game.title}
        </span>
        <span className="truncate text-sm leading-relaxed text-[#b5accb]">
          {game.description}
        </span>
        <span className="flex items-center gap-1 text-xs leading-relaxed text-[#9c91b3]">
          <Image
            src="/home/games/bxs-user.svg"
            width={20}
            height={20}
            alt=""
            className="size-4"
          />
          Made by: {game.creator}
        </span>
      </span>
    </>
  );
}

function GameDetail({ game }: { game: HomeGame }) {
  const details = game.details;
  if (!details) return null;

  return (
    <div className="flex w-full flex-col gap-4 text-sm leading-relaxed text-[#d7d0e4]">
      <div className="relative h-28 shrink-0 overflow-hidden rounded-xl">
        <Image
          src={
            contentMedia[details.cover as keyof typeof contentMedia] ??
            details.cover
          }
          placeholder="blur"
          width={details.coverWidth}
          height={details.coverHeight}
          alt=""
          sizes="(min-width:1024px) 540px, 90vw"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/75" />
        <div className="absolute right-4 bottom-3 left-4 flex items-center gap-3">
          <GameIcon game={game} small />
          <div>
            <p className="font-(family-name:--font-landing) text-lg font-semibold text-white">
              {game.title}
            </p>
            <p className="text-xs font-medium text-[#fbe29b]">
              ★ Featured Game
            </p>
          </div>
        </div>
      </div>
      <div>
        <h4 className="mb-1 font-medium text-[#fbe29b]">About this game</h4>
        <p className="text-left">{details.description}</p>
      </div>
      <div className="border-l-3 border-[#c5b9ee] bg-white/3 px-4 py-3">
        <h4 className="mb-2.5 font-medium text-[#fbe29b]">How to Play</h4>
        <ol className="flex flex-col gap-1.5">
          {details.instructions.map((instruction, index) => (
            <li
              key={instruction}
              className="flex items-start gap-2.5 leading-5"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#fbe29b] text-[11px] font-bold text-[#141237]">
                {index + 1}
              </span>
              {instruction}
            </li>
          ))}
        </ol>
      </div>
      <div className="flex min-h-14 flex-wrap items-center gap-3 rounded-xl bg-white/4 px-4 py-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-[#fbe29b]">
          <Image
            src="/home/flappy-details/logo.png"
            width={887}
            height={521}
            alt=""
            className="h-auto w-8"
          />
        </span>
        <div>
          <p className="text-xs font-medium text-[#8377ac]">Made by</p>
          <p className="font-semibold text-[#ede9fe]">GDG Game Dev Team</p>
        </div>
        <p className="ml-auto text-xs font-medium text-[#8377ac]">
          GDG on Campus - PLM · 2025
        </p>
      </div>
    </div>
  );
}

function GamesPanel() {
  const [selectedGame, setSelectedGame] = useState<HomeGame | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastGame = useRef<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (selectedGame) headingRef.current?.focus({ preventScroll: true });
    else if (lastGame.current)
      triggerRefs.current.get(lastGame.current)?.focus({ preventScroll: true });
  }, [selectedGame]);

  function selectGame(game: HomeGame): void {
    lastGame.current = game.id;
    setSelectedGame(game);
  }

  const rowClass =
    "flex min-h-[92px] w-full items-center gap-3 rounded-xl border border-[#b6a1dc]/15 bg-white/3 px-4 py-3";

  return (
    <div
      className={`relative flex min-h-0 w-full min-w-0 max-h-full flex-col gap-4 rounded-2xl border border-[#b6a1dc]/25 bg-[#15112b]/90 p-4 shadow-[0_16px_64px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:p-6 ${selectedGame ? "h-full" : "h-fit"}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && selectedGame) {
          event.preventDefault();
          setSelectedGame(null);
        }
      }}
      data-games-panel
    >
      <h3
        ref={headingRef}
        tabIndex={-1}
        className={`w-full shrink-0 text-center text-xl leading-7 font-semibold text-[#eeeaf7] outline-none ${selectedGame ? "px-8" : ""}`}
      >
        {selectedGame?.title ?? "Games List"}
      </h3>
      {selectedGame && (
        <button
          type="button"
          aria-label="Close game details"
          onClick={() => setSelectedGame(null)}
          className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-[#b6a1dc] text-[#141237] transition-colors hover:bg-[#c5b9ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fbe29b]"
        >
          <Image
            src="/home/flappy-details/hugeicons-cancel01.svg"
            width={24}
            height={24}
            alt=""
          />
        </button>
      )}
      <div
        ref={scrollRef}
        className="min-h-0 w-full flex-1 pr-1"
        data-games-scroll
      >
        {selectedGame ? (
          <GameDetail game={selectedGame} />
        ) : (
          <ul className="flex w-full flex-col gap-3">
            {homeGames.map((game) => (
              <li key={game.id}>
                {game.details ? (
                  <button
                    type="button"
                    ref={(element) => {
                      if (element) triggerRefs.current.set(game.id, element);
                      else triggerRefs.current.delete(game.id);
                    }}
                    onClick={() => selectGame(game)}
                    className={`${rowClass} transition-colors hover:border-[#b6a1dc]/35 hover:bg-white/6 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#fbe29b]`}
                    aria-label={`View ${game.title} details`}
                  >
                    <GameRowContent game={game} />
                  </button>
                ) : (
                  <div className={`${rowClass} opacity-65`}>
                    <GameRowContent game={game} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {selectedGame?.details && (
        <a
          href={selectedGame.details.playUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${homeButtonClass} min-h-11 w-full shrink-0`}
        >
          Play {selectedGame.title}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </div>
  );
}

export function GamesSection({ artwork }: { artwork: ReactNode }) {
  return (
    <section
      id="games"
      aria-labelledby="games-title"
      className="relative isolate min-h-dvh w-full overflow-hidden bg-[#090817] font-(family-name:--font-home-body) text-[#eeeaf7]"
      data-home-section="games"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-40 select-none [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_70%,transparent)]"
        aria-hidden="true"
      >
        <div className="absolute top-1/2 left-1/2 h-[1024px] w-[1440px] -translate-1/2 scale-[max(calc(100vw/1440px),calc(100dvh/1024px))]">
          {artwork}
        </div>
      </div>
      <div className="relative z-10 mx-auto grid min-h-dvh w-full max-w-6xl grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto] gap-6 px-5 py-[clamp(1rem,4dvh,3rem)] sm:px-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:grid-rows-1 lg:items-center lg:gap-[clamp(2rem,6vw,6rem)]">
        <div className="flex min-w-0 flex-col items-center lg:items-start">
          <h2 id="games-title" className={homeHeadingClass}>
            Games
          </h2>
          <p className="mt-3 max-w-[420px] text-center text-sm leading-relaxed text-[#b5accb] sm:text-base lg:text-left lg:text-lg">
            Blast off into the cosmos. Compete solo or with friends in the games
            built by our very own community!
          </p>
          <Image
            src="/home/games/asset-haribot-in-trophy.svg"
            width={387.001}
            height={442.089}
            alt=""
            unoptimized
            className="mt-6 hidden h-[min(36dvh,320px)] w-auto max-w-full lg:block [@media(max-height:600px)]:hidden"
          />
        </div>
        <div className="flex min-h-0 w-full min-w-0 items-center">
          <GamesPanel />
        </div>
      </div>
    </section>
  );
}
