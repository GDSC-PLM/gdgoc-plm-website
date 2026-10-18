"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import type { HypeCounterState } from "@/features/hype/use-hype-counter";

export type HypeLabels = {
  count: string;
  hint: string;
  button: string;
  loading: string;
  unavailable: string;
  failed: string;
  throttled: string;
  storage: string;
  blocked: string;
  attention: string;
  hello: string;
  retry: string;
};

type HypeCounterProps = {
  labels: HypeLabels;
  motionAllowed: boolean;
  state: Pick<HypeCounterState, "count" | "status" | "feedback" | "retry">;
};

type RollingCountProps = {
  value: number;
  motionAllowed: boolean;
};

function RollingCount({ value, motionAllowed }: RollingCountProps) {
  const [snapshot, setSnapshot] = useState({ value, previous: null as number | null, rolling: false });

  // Keep the previous displayed value only for the outgoing visual row.
  if (value !== snapshot.value) {
    setSnapshot({ value, previous: snapshot.value, rolling: motionAllowed && value > snapshot.value });
  } else if (!motionAllowed && snapshot.rolling) {
    setSnapshot({ ...snapshot, rolling: false });
  }

  const rolling = snapshot.rolling && motionAllowed;
  const formattedValue = value.toLocaleString("en-US");

  const previousText = snapshot.previous?.toLocaleString("en-US") ?? "";

  return (
    <span className="inline-flex h-[1.5em] align-bottom" data-display-count={value}>
      <span className="sr-only">{formattedValue}</span>
      <span className="inline-flex" aria-hidden="true">
        {Array.from(formattedValue).map((digit, index) => {
          const place = formattedValue.length - 1 - index;
          if (digit === ",") return <span key={place}>,</span>;

          const previousDigit = previousText[previousText.length - 1 - place];
          const changed = rolling && digit !== previousDigit;

          return (
            <span className="relative inline-grid h-[1.5em] min-w-[1ch] overflow-hidden" key={place} data-count-digit={place}>
              {changed && previousDigit !== undefined && (
                <span
                  className="col-start-1 row-start-1 motion-safe:animate-out motion-safe:slide-out-to-bottom-full motion-safe:fill-mode-forwards motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]"
                  key={previousDigit}
                  data-count-outgoing
                >
                  {previousDigit}
                </span>
              )}
              <span
                className={cn(
                  "col-start-1 row-start-1",
                  changed && "motion-safe:animate-in motion-safe:slide-in-from-top-full motion-safe:fill-mode-backwards motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]",
                )}
                key={digit}
                data-count-incoming
                onAnimationEnd={() => setSnapshot((current) => current.value === value ? { ...current, rolling: false } : current)}
              >
                {digit}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

export function HypeCounter({ labels, state, motionAllowed }: HypeCounterProps) {
  const { count, status, feedback, retry } = state;
  const message =
    feedback ? labels[feedback] : status === "unavailable" ? labels.unavailable : "";

  return (
    <div className="mx-auto flex w-full max-w-80 flex-col text-center" data-hype-widget>
      <p
        className="flex min-h-8 flex-wrap items-baseline justify-center gap-x-1.5 text-(length:--count-size) leading-normal text-(--muted-lavender) md:min-h-11 md:items-center"
        data-hype-count
        aria-busy={status === "loading"}
      >
        <span
          className="text-(length:--number-size) font-medium text-(--white) tabular-nums"
          data-hype-number
          aria-label={status === "loading" ? labels.loading : undefined}
        >
          {status === "ready" && count !== null
            ? <RollingCount value={count} motionAllowed={motionAllowed} />
            : status === "loading"
              ? "···"
              : "—"}
        </span>
        <span>{labels.count}</span>
      </p>
      <div
        className="order-first mx-auto min-h-10 text-xs leading-normal text-(--muted-lavender) md:order-last"
        data-hype-feedback
        id="hype-feedback"
        role="status"
      >
        <p>{message}</p>
        {(status === "unavailable" || feedback === "storage" || feedback === "blocked") && (
          <button
            className="mt-1 rounded text-(--white) underline underline-offset-[0.2rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--star-yellow)"
            data-hype-retry
            onClick={retry}
            type="button"
          >
            {labels.retry}
          </button>
        )}
      </div>
      <noscript>Enable JavaScript to add your hype to the community count.</noscript>
    </div>
  );
}
