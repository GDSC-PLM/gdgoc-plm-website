"use client";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";
export function MediaImage(props: ImageProps) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span
      role="img"
      aria-label={props.alt || "Image unavailable"}
      className={props.className + " bg-[#231e38]"}
      style={props.fill ? { position: "absolute", inset: 0 } : undefined}
    />
  ) : (
    <Image {...props} alt={props.alt} onError={() => setFailed(true)} />
  );
}
