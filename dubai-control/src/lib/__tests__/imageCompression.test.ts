import { describe, it, expect } from "vitest";
import { isImageFile, getFileSizeMB, validateImageSize } from "@/lib/imageCompression";

describe("imageCompression utilities", () => {
  function makeFile(type: string, sizeBytes: number): File {
    const buffer = new ArrayBuffer(sizeBytes);
    return new File([buffer], "test", { type });
  }

  describe("isImageFile", () => {
    it("returns true for image/jpeg", () => {
      expect(isImageFile(makeFile("image/jpeg", 100))).toBe(true);
    });

    it("returns true for image/png", () => {
      expect(isImageFile(makeFile("image/png", 100))).toBe(true);
    });

    it("returns true for image/webp", () => {
      expect(isImageFile(makeFile("image/webp", 100))).toBe(true);
    });

    it("returns false for application/pdf", () => {
      expect(isImageFile(makeFile("application/pdf", 100))).toBe(false);
    });

    it("returns false for text/plain", () => {
      expect(isImageFile(makeFile("text/plain", 100))).toBe(false);
    });
  });

  describe("getFileSizeMB", () => {
    it("returns correct MB for 1MB file", () => {
      const file = makeFile("image/jpeg", 1024 * 1024);
      expect(getFileSizeMB(file)).toBe(1);
    });

    it("returns correct MB for 5MB file", () => {
      const file = makeFile("image/jpeg", 5 * 1024 * 1024);
      expect(getFileSizeMB(file)).toBe(5);
    });

    it("returns 0 for empty file", () => {
      const file = makeFile("image/jpeg", 0);
      expect(getFileSizeMB(file)).toBe(0);
    });
  });

  describe("validateImageSize", () => {
    it("accepts file under default 10MB limit", () => {
      const file = makeFile("image/jpeg", 5 * 1024 * 1024);
      expect(validateImageSize(file)).toBe(true);
    });

    it("accepts file exactly at limit", () => {
      const file = makeFile("image/jpeg", 10 * 1024 * 1024);
      expect(validateImageSize(file)).toBe(true);
    });

    it("rejects file over default 10MB limit", () => {
      const file = makeFile("image/jpeg", 11 * 1024 * 1024);
      expect(validateImageSize(file)).toBe(false);
    });

    it("uses custom limit", () => {
      const file = makeFile("image/jpeg", 3 * 1024 * 1024);
      expect(validateImageSize(file, 2)).toBe(false);
      expect(validateImageSize(file, 5)).toBe(true);
    });
  });
});
