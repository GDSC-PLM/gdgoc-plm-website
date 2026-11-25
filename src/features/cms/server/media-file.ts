import "server-only";

import { PDFArray, PDFDict, PDFDocument, PDFName, PDFStream, type PDFObject } from "pdf-lib";
import sharp from "sharp";

import type { CmsMediaMime } from "./schema";

const formats = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
const maxImageSize = 5 * 1024 * 1024;
const maxPdfSize = 10 * 1024 * 1024;
const maxPixels = 12_000_000;
const unsafePdfNames = new Set([
  "OpenAction", "AA", "JS", "JavaScript", "Launch", "EmbeddedFiles", "EmbeddedFile",
  "FileAttachment", "AcroForm", "XFA", "SubmitForm", "ImportData", "GoToR", "GoToE",
  "RichMedia", "Movie", "Sound", "Rendition", "3D", "Encrypt",
]);

export class CmsMediaError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export function isCmsMediaMime(value: string | null): value is CmsMediaMime {
  return value === "application/pdf" || (value !== null && Object.hasOwn(formats, value));
}

export async function readCmsMediaBody(request: Request, mime: CmsMediaMime) {
  const limit = mime === "application/pdf" ? maxPdfSize : maxImageSize;
  if (Number(request.headers.get("content-length")) > limit) {
    throw new CmsMediaError(413, "The file exceeds the upload limit.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new CmsMediaError(400, "Choose a file to upload.");

  const chunks: Buffer[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        void reader.cancel().catch(() => {});
        throw new CmsMediaError(413, "The file exceeds the upload limit.");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  if (length === 0) throw new CmsMediaError(400, "Choose a file to upload.");
  return Buffer.concat(chunks, length);
}

function hasImageSignature(data: Buffer, format: (typeof formats)[keyof typeof formats]) {
  if (format === "jpeg") return data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (format === "png") return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
}

async function validatePdf(data: Buffer) {
  if (!/^%PDF-[12]\.\d(?:\r\n?|\n)/.test(data.toString("latin1", 0, 16)) ||
      !/%%EOF[\t\r\n ]*$/.test(data.toString("latin1", Math.max(0, data.length - 1024)))) {
    throw new Error("PDF header or trailer");
  }
  const pdf = await PDFDocument.load(data, { throwOnInvalidObject: true, updateMetadata: false });
  const pageCount = pdf.getPageCount();
  if (pageCount < 1 || pageCount > 200) throw new Error("PDF page count");

  const pending = pdf.context.enumerateIndirectObjects().map(([, object]) => object);
  const visited = new Set<PDFObject>();
  while (pending.length > 0) {
    const object = pending.pop();
    if (!object || visited.has(object)) continue;
    visited.add(object);

    if (object instanceof PDFName && unsafePdfNames.has(object.decodeText())) {
      throw new Error("Interactive or attached PDF content");
    }
    if (object instanceof PDFStream) pending.push(object.dict);
    if (object instanceof PDFDict) {
      for (const [name, value] of object.entries()) pending.push(name, value);
    }
    if (object instanceof PDFArray) {
      for (let i = 0; i < object.size(); i++) pending.push(object.get(i));
    }
  }
}

export async function validateCmsMediaFile(input: Buffer, mime: CmsMediaMime) {
  try {
    if (mime === "application/pdf") {
      await validatePdf(input);
      return { data: input, width: null, height: null };
    }
    const format = formats[mime];
    if (!hasImageSignature(input, format)) throw new Error("Image signature");
    const image = sharp(input, { failOn: "warning", limitInputPixels: maxPixels });
    const { format: decodedFormat, width, height, pages } = await image.metadata();
    if (decodedFormat !== format || !width || !height || width > 4096 || height > 4096 ||
        width * height > maxPixels || (pages ?? 1) > 1) {
      throw new Error("Image format, dimensions or frames");
    }

    // Decode pixels and store a clean copy without embedded image metadata.
    const output = await image.autoOrient().toFormat(format).toBuffer({ resolveWithObject: true });
    if (output.data.length > maxImageSize) {
      throw new CmsMediaError(413, "The processed image exceeds the upload limit.");
    }
    return { data: output.data, width: output.info.width, height: output.info.height };
  } catch (error) {
    if (error instanceof CmsMediaError) throw error;
    throw new CmsMediaError(422, "File contents are invalid or use a format feature the CMS cannot accept.");
  }
}
