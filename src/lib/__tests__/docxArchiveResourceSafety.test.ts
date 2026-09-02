import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";
import {
  DocxArchiveResourceSafetyError,
  inspectDocxArchiveResourceSafety,
  validateLoadedDocxArchiveResources,
} from "../docxArchiveResourceSafety";

type FakeEntryOptions = {
  dir?: boolean;
  compressedSize?: unknown;
  uncompressedSize?: unknown;
  includePrivateData?: boolean;
};

const makeFakeEntry = ({
  dir = false,
  compressedSize = 100,
  uncompressedSize = 100,
  includePrivateData = true,
}: FakeEntryOptions = {}) => {
  const async = vi.fn();
  const entry: Record<string, unknown> = { dir, async };

  if (includePrivateData) {
    entry._data = { compressedSize, uncompressedSize };
  }

  return { entry, async };
};

const makeArchive = (
  entries: Array<[string, Record<string, unknown>]>,
): { files: Record<string, unknown> } => ({
  files: Object.fromEntries(entries),
});

describe("DOCX archive resource safety", () => {
  it("accepts an ordinary synthetic DOCX archive without expanding entries", async () => {
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
    );
    zip.folder("_rels")?.file(
      ".rels",
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>',
    );
    zip.folder("word")?.file(
      "document.xml",
      '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body></w:document>',
    );
    const arrayBuffer = await zip.generateAsync({
      type: "arraybuffer",
      compression: "DEFLATE",
    });

    await expect(
      inspectDocxArchiveResourceSafety(arrayBuffer),
    ).resolves.toBeUndefined();
  });

  it("rejects an excessive individual uncompressed entry before expansion", () => {
    const unsafe = makeFakeEntry({
      compressedSize: 2 * 1024 * 1024,
      uncompressedSize: 40 * 1024 * 1024,
    });

    expect(() =>
      validateLoadedDocxArchiveResources(
        makeArchive([["word/document.xml", unsafe.entry]]),
      ),
    ).toThrow(
      expect.objectContaining({
        name: "DocxArchiveResourceSafetyError",
        code: "entry_too_large",
      }),
    );
    expect(unsafe.async).not.toHaveBeenCalled();
  });

  it("rejects excessive cumulative uncompressed archive size", () => {
    const entries = ["one", "two", "three"].map((name) => [
      `word/${name}.xml`,
      makeFakeEntry({
        compressedSize: 2 * 1024 * 1024,
        uncompressedSize: 24 * 1024 * 1024,
      }).entry,
    ] as [string, Record<string, unknown>]);

    expect(() =>
      validateLoadedDocxArchiveResources(makeArchive(entries)),
    ).toThrow(expect.objectContaining({ code: "archive_too_large" }));
  });

  it("rejects excessive archive entry count", () => {
    const entries = Array.from({ length: 1_001 }, (_, index) => [
      `word/item-${index}.xml`,
      makeFakeEntry().entry,
    ] as [string, Record<string, unknown>]);

    expect(() =>
      validateLoadedDocxArchiveResources(makeArchive(entries)),
    ).toThrow(expect.objectContaining({ code: "entry_count_exceeded" }));
  });

  it("rejects an extreme compression-to-expansion ratio", () => {
    const unsafe = makeFakeEntry({
      compressedSize: 1024,
      uncompressedSize: 10 * 1024 * 1024,
    });

    expect(() =>
      validateLoadedDocxArchiveResources(
        makeArchive([["word/document.xml", unsafe.entry]]),
      ),
    ).toThrow(
      expect.objectContaining({ code: "expansion_ratio_exceeded" }),
    );
  });

  it("fails closed when private JSZip size metadata is absent", () => {
    const missing = makeFakeEntry({ includePrivateData: false });

    expect(() =>
      validateLoadedDocxArchiveResources(
        makeArchive([["word/document.xml", missing.entry]]),
      ),
    ).toThrow(
      expect.objectContaining({ code: "entry_metadata_unreadable" }),
    );
  });

  it.each([
    ["negative", -1, 100],
    ["NaN", Number.NaN, 100],
    ["infinite", Number.POSITIVE_INFINITY, 100],
    ["fractional", 1.5, 100],
    ["string", "100", 100],
    ["negative uncompressed", 100, -1],
    ["NaN uncompressed", 100, Number.NaN],
  ])(
    "fails closed on %s JSZip size metadata",
    (_label, compressedSize, uncompressedSize) => {
      const malformed = makeFakeEntry({
        compressedSize,
        uncompressedSize,
      });

      expect(() =>
        validateLoadedDocxArchiveResources(
          makeArchive([["word/document.xml", malformed.entry]]),
        ),
      ).toThrow(
        expect.objectContaining({ code: "entry_metadata_unreadable" }),
      );
    },
  );

  it("allows directory entries without requiring private content metadata", () => {
    const directory = makeFakeEntry({
      dir: true,
      includePrivateData: false,
    });
    const document = makeFakeEntry();

    expect(() =>
      validateLoadedDocxArchiveResources(
        makeArchive([
          ["word/", directory.entry],
          ["word/document.xml", document.entry],
        ]),
      ),
    ).not.toThrow();
    expect(directory.async).not.toHaveBeenCalled();
  });

  it("applies archive limits to irrelevant entries as well as DOCX XML", () => {
    const document = makeFakeEntry();
    const irrelevantBomb = makeFakeEntry({
      compressedSize: 2 * 1024 * 1024,
      uncompressedSize: 40 * 1024 * 1024,
    });

    expect(() =>
      validateLoadedDocxArchiveResources(
        makeArchive([
          ["word/document.xml", document.entry],
          ["customXml/irrelevant.bin", irrelevantBomb.entry],
        ]),
      ),
    ).toThrow(expect.objectContaining({ code: "entry_too_large" }));
    expect(irrelevantBomb.async).not.toHaveBeenCalled();
  });

  it("never calls entry async() while making the resource-safety decision", () => {
    const safe = makeFakeEntry({
      compressedSize: 500_000,
      uncompressedSize: 2_000_000,
    });

    validateLoadedDocxArchiveResources(
      makeArchive([["word/document.xml", safe.entry]]),
    );

    expect(safe.async).not.toHaveBeenCalled();
  });

  it("uses a dedicated error type without exposing JSZip internals", () => {
    const error = new DocxArchiveResourceSafetyError(
      "entry_metadata_unreadable",
    );

    expect(error.message).not.toContain("_data");
    expect(error.message).not.toContain("compressedSize");
    expect(error.message).not.toContain("uncompressedSize");
  });
});
