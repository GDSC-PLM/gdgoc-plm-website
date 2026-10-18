import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { ImageResponse } from "next/og.js";
import { createElement } from "react";

const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
const sharp = nextRequire("sharp");
const root = new URL("../", import.meta.url);
const asset = (path) => new URL(path, root);
const midnight = "#090817";
const mark = await readFile(asset("public/brand/gdg-mark.svg"));

/** @param {{ size: number, png: Buffer }[]} images @returns {Buffer} */
function makeIco(images) {
  const directorySize = 6 + images.length * 16;
  const header = Buffer.alloc(directorySize);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = directorySize;
  images.forEach(({ size, png }, index) => {
    const entry = 6 + index * 16;
    header[entry] = size;
    header[entry + 1] = size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(({ png }) => png)]);
}

async function writeIcons() {
  const images = await Promise.all([16, 32, 48].map(async (size) => ({
    size,
    png: await sharp(mark, { density: 384 }).resize(size, size).png().toBuffer(),
  })));
  await writeFile(asset("src/app/favicon.ico"), makeIco(images));
  await writeFile(asset("src/app/icon.svg"), mark);
  await sharp(mark, { density: 384 }).resize(512, 512).png().toFile(fileURLToPath(asset("public/brand/gdg-mark-512.png")));
  for (const [size, path] of [[180, "src/app/apple-icon.png"], [192, "public/brand/icon-192.png"], [512, "public/brand/icon-512.png"]]) {
    await sharp(mark, { density: 384 }).resize(size, size).flatten({ background: midnight }).png().toFile(fileURLToPath(asset(path)));
  }
}

async function writeShareImage() {
  // A build-time tool only: the deployed site serves the resulting static PNG.
  // Use Google Fonts' static 600-weight WOFF; next/og cannot parse this font's variable TTF.
  const fontUrl = "https://fonts.gstatic.com/s/googlesansflex/v23/t5sJIQcYNIWbFgDgAAzZ34auoVyXkJCOvp3SFWJbN5hF8Ju1x6sKCyp0l9sI40swNJwInycYAJzz0p7kJ4qFQOJBOjLvDSndo0SKMpKSTzwliVdHAy4bxTDHg_ugnAakpxWcycg.woff";
  const fontResponse = await fetch(fontUrl, { signal: AbortSignal.timeout(30_000) });
  if (!fontResponse.ok) throw new Error(`Unable to download the Google Sans Flex source font (${fontResponse.status}).`);
  const font = await fontResponse.arrayBuffer();
  const logo = `data:image/svg+xml;base64,${mark.toString("base64")}`;
  const element = createElement("div", {
    style: {
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", backgroundColor: midnight,
      backgroundImage: "radial-gradient(ellipse at 50% 80%, #211b3b 0%, #090817 70%)",
      color: "#eeeaf7", fontFamily: "Google Sans Flex", fontWeight: 600,
    },
  },
  createElement("img", { src: logo, width: 176, height: 176, alt: "" }),
  createElement("div", { style: { display: "flex", marginTop: 12, fontSize: 76, letterSpacing: "-0.035em" } }, "GDGoC PLM"));
  const response = new ImageResponse(element, { width: 1200, height: 630, fonts: [{ name: "Google Sans Flex", data: font, weight: 600, style: "normal" }] });
  const png = Buffer.from(await response.arrayBuffer());
  await sharp(png).png({ compressionLevel: 9 }).toFile(fileURLToPath(asset("src/app/opengraph-image.png")));
}

await mkdir(asset("public/brand/"), { recursive: true });
await writeIcons();
await writeShareImage();
console.log("Generated GDG favicon, Apple/manifest icons, organization logo, and 1200 × 630 share image.");
