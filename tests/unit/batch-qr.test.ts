import { describe, expect, it } from "vitest";
import {
  generateBatchNumber,
  generateBatchQrCode,
  downloadBatchQrCode,
  createBatchWithQr,
  CODE_ALPHABET,
} from "@/lib/batch-qr";

describe("generateBatchNumber", () => {
  it("generates a valid batch number in default HC-YYYY-XXXXXX format", () => {
    const code = generateBatchNumber();
    const currentYear = new Date().getUTCFullYear();
    const regex = new RegExp(`^HC-${currentYear}-[${CODE_ALPHABET}]{6}$`);

    expect(code).toMatch(regex);
    expect(code.length).toBe(3 + 4 + 1 + 6); // HC-YYYY-XXXXXX = 14
  });

  it("does not contain confusing characters (0, O, 1, I)", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateBatchNumber();
      const suffix = code.split("-").pop()!;
      expect(suffix).not.toMatch(/[01IO]/);
    }
  });

  it("produces distinct batch numbers across successive calls", () => {
    const set = new Set<string>();
    const count = 100;
    for (let i = 0; i < count; i++) {
      set.add(generateBatchNumber());
    }
    expect(set.size).toBe(count);
  });

  it("respects custom prefix and custom year", () => {
    const code = generateBatchNumber({ prefix: "BATCH", year: 2028 });
    expect(code).toMatch(/^BATCH-2028-[A-Z2-9]{6}$/);
  });

  it("respects region parameter", () => {
    const code = generateBatchNumber({ region: "WB-PUR", year: 2026 });
    expect(code).toMatch(/^WB-PUR-2026-[A-Z2-9]{6}$/);

    const codeWithPrefix = generateBatchNumber({ prefix: "HC", region: "PUR", year: 2026 });
    expect(codeWithPrefix).toMatch(/^HC-PUR-2026-[A-Z2-9]{6}$/);
  });

  it("supports numeric sequential suffix padded with zeros", () => {
    const code1 = generateBatchNumber({ suffix: 7, year: 2026 });
    expect(code1).toBe("HC-2026-007");

    const code2 = generateBatchNumber({ suffix: 142, year: 2026 });
    expect(code2).toBe("HC-2026-142");
  });

  it("supports custom string suffix", () => {
    const code = generateBatchNumber({ suffix: "PREMIUM", year: 2026 });
    expect(code).toBe("HC-2026-PREMIUM");
  });

  it("supports custom suffix length", () => {
    const code = generateBatchNumber({ suffixLength: 8 });
    const suffix = code.split("-").pop()!;
    expect(suffix.length).toBe(8);
  });
});

describe("generateBatchQrCode", () => {
  it("generates QR code from a batch number string", () => {
    const batchNumber = "HC-2026-TEST99";
    const result = generateBatchQrCode(batchNumber);

    expect(result.batchNumber).toBe(batchNumber);
    expect(result.publicCode).toBe(batchNumber);
    expect(result.verificationUrl).toContain(`/verify/${batchNumber}`);
    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("</svg>");
    expect(result.dataUri).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(result.pixelSize).toBe(240);
  });

  it("supports custom baseUrl and token", () => {
    const result = generateBatchQrCode({
      batchNumber: "HC-2026-CUSTOM",
      baseUrl: "https://trace.example.com",
      token: "signed-token-xyz",
    });

    expect(result.verificationUrl).toBe("https://trace.example.com/verify/HC-2026-CUSTOM?t=signed-token-xyz");
    expect(result.svg).toContain("<svg");
  });

  it("auto-generates batch number if omitted", () => {
    const result = generateBatchQrCode({});
    expect(result.batchNumber).toMatch(/^HC-\d{4}-[A-Z2-9]{6}$/);
    expect(result.verificationUrl).toContain(result.batchNumber);
  });

  it("applies color presets and styling options", () => {
    const result = generateBatchQrCode("HC-2026-PRESET", {
      preset: "forest",
      pixelSize: 300,
      title: "Forest Honey Batch QR",
    });

    expect(result.svg).toContain('width="300"');
    expect(result.svg).toContain('height="300"');
    expect(result.svg).toContain("<title>Forest Honey Batch QR</title>");
  });
});

describe("downloadBatchQrCode", () => {
  it("returns safe response when called outside browser environment", async () => {
    const result = await downloadBatchQrCode("HC-2026-DOWNLOAD");
    expect(result.success).toBe(false);
    expect(result.format).toBe("svg");
    expect(result.filename).toBe("HC-2026-DOWNLOAD-qr.svg");
    expect(result.reason).toBe("browser_environment_required");
  });

  it("handles custom filename and png format options", async () => {
    const result = await downloadBatchQrCode({
      batchNumber: "HC-2026-PNG",
      format: "png",
      filename: "custom-label.png",
    });

    expect(result.success).toBe(false);
    expect(result.format).toBe("png");
    expect(result.filename).toBe("custom-label.png");
  });
});

describe("createBatchWithQr", () => {
  it("orchestrates batch number creation, QR generation and downloader", async () => {
    const batch = createBatchWithQr({ year: 2026 });

    expect(batch.batchNumber).toMatch(/^HC-2026-[A-Z2-9]{6}$/);
    expect(batch.qr.batchNumber).toBe(batch.batchNumber);
    expect(batch.qr.svg).toContain("<svg");
    expect(typeof batch.download).toBe("function");

    const dlResult = await batch.download("svg");
    expect(dlResult.filename).toBe(`${batch.batchNumber}-qr.svg`);
  });
});
