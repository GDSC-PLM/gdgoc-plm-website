"use client";
import { useState } from "react";
import { avp } from "@/content/public-content";
export function VideoPanel() {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative mx-auto aspect-video min-h-[14rem] w-full max-w-4xl overflow-hidden rounded-3xl border border-[#fbe29b]/25 bg-[radial-gradient(ellipse_at_70%_20%,#304479,transparent_65%),linear-gradient(135deg,#252145,#332035)] shadow-2xl">
      {playing && avp.src && !failed ? (
        <video
          className="size-full"
          src={avp.src}
          controls
          autoPlay
          playsInline
          preload="none"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <span className="absolute top-5 right-5 left-5 w-fit max-w-[calc(100%-2.5rem)] rounded-full border border-white/20 px-3 py-1 text-[10px] sm:text-xs">
            Official Community AVP • 2026
          </span>
          <div className="absolute inset-0 grid place-items-center">
            <button
              type="button"
              disabled={!avp.src || failed}
              onClick={() => setPlaying(true)}
              aria-label={
                failed
                  ? "Video unavailable"
                  : avp.src
                    ? "Play community video"
                    : "Community video not available yet"
              }
              className="grid size-14 place-items-center rounded-full bg-[#b6a1dc] text-xl text-[#090817] disabled:opacity-70"
            >
              ▶
            </button>
          </div>
          <p className="absolute right-5 bottom-5 left-5 text-xs sm:text-sm">
            {failed ? "Video unavailable. Please try again later." : avp.title}
          </p>
        </>
      )}
    </div>
  );
}
