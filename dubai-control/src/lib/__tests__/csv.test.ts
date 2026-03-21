import { describe, it, expect } from "vitest";
import { parseCSV, validateLocationRow, parseAndValidateCSV } from "@/lib/csv";
import type { LocationCSVRow } from "@/lib/csv";
import type { Location } from "@/api/client";

describe("CSV Parsing — parseCSV", () => {
  it("parses valid CSV with correct headers", () => {
    const csv = `name,address,latitude,longitude,is_active
Dubai Mall,Downtown Dubai,25.1972,55.2744,true
DIFC Office,Gate District,25.2140,55.2788,true`;

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      name: "Dubai Mall",
      address: "Downtown Dubai",
      latitude: "25.1972",
      longitude: "55.2744",
      is_active: "true",
    });
  });

  it("throws on empty CSV", () => {
    expect(() => parseCSV("")).toThrow("CSV file is empty");
    expect(() => parseCSV("   \n  \n  ")).toThrow("CSV file is empty");
  });

  it("throws on invalid headers", () => {
    const csv = "id,title,description\n1,test,desc";
    expect(() => parseCSV(csv)).toThrow("Invalid CSV headers");
  });

  it("handles quoted values with commas", () => {
    const csv = `name,address,latitude,longitude,is_active
"Business Bay Tower","Building 4, Road 5, Business Bay",25.1850,55.2650,true`;

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].address).toBe("Building 4, Road 5, Business Bay");
  });

  it("defaults is_active to true when missing", () => {
    const csv = `name,address,latitude,longitude,is_active
Office,Sheikh Zayed,25.1,55.2,`;

    const rows = parseCSV(csv);
    expect(rows[0].is_active).toBe("true");
  });

  it("skips blank lines", () => {
    const csv = `name,address,latitude,longitude,is_active
Office A,Addr A,25.1,55.2,true

Office B,Addr B,25.2,55.3,false
`;

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
  });
});

describe("CSV Validation — validateLocationRow", () => {
  const makeRow = (overrides: Partial<LocationCSVRow> = {}): LocationCSVRow => ({
    name: "Test Location",
    address: "Dubai",
    latitude: "25.2048",
    longitude: "55.2708",
    is_active: "true",
    ...overrides,
  });

  it("validates a correct row", () => {
    const result = validateLocationRow(makeRow(), 1, []);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data.name).toBe("Test Location");
    expect(result.data.latitude).toBe(25.2048);
  });

  it("rejects missing name", () => {
    const result = validateLocationRow(makeRow({ name: "" }), 1, []);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Name is required");
  });

  it("rejects name > 100 chars", () => {
    const result = validateLocationRow(makeRow({ name: "A".repeat(101) }), 1, []);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("too long");
  });

  it("detects duplicate names (case-insensitive)", () => {
    const result = validateLocationRow(makeRow({ name: "Dubai Mall" }), 2, [
      "dubai mall",
    ]);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("Duplicate");
  });

  it("rejects invalid latitude", () => {
    const result = validateLocationRow(makeRow({ latitude: "999" }), 1, []);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("Invalid latitude");
  });

  it("rejects invalid longitude", () => {
    const result = validateLocationRow(makeRow({ longitude: "-200" }), 1, []);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("Invalid longitude");
  });

  it("rejects non-numeric coordinates", () => {
    const result = validateLocationRow(makeRow({ latitude: "abc" }), 1, []);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("Invalid latitude");
  });

  it("accepts empty optional fields", () => {
    const result = validateLocationRow(
      makeRow({ address: "", latitude: "", longitude: "" }),
      1,
      [],
    );
    expect(result.isValid).toBe(true);
  });

  it("parses is_active variations", () => {
    for (const val of ["true", "1", "yes"]) {
      const result = validateLocationRow(makeRow({ is_active: val }), 1, []);
      expect(result.data.is_active).toBe(true);
    }
    for (const val of ["false", "0", "no"]) {
      const result = validateLocationRow(makeRow({ is_active: val }), 1, []);
      expect(result.data.is_active).toBe(false);
    }
  });
});

describe("CSV — parseAndValidateCSV (integration)", () => {
  it("separates valid and invalid rows", () => {
    const csv = `name,address,latitude,longitude,is_active
Valid Location,Dubai,25.2,55.2,true
,Missing Name,25.2,55.2,true
Another Valid,Abu Dhabi,24.4,54.6,false`;

    const result = parseAndValidateCSV(csv, [] as Location[]);
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].errors).toContain("Name is required");
  });

  it("detects duplicates against existing names", () => {
    const csv = `name,address,latitude,longitude,is_active
Existing Location,Dubai,25.2,55.2,true`;

    const existingLocations: Location[] = [
      { id: 1, name: "Existing Location", address: null },
    ];
    const result = parseAndValidateCSV(csv, existingLocations);
    expect(result.duplicates).toHaveLength(1);
  });

  it("detects duplicates within the CSV itself", () => {
    const csv = `name,address,latitude,longitude,is_active
Office Alpha,Dubai,25.2,55.2,true
Office Alpha,Abu Dhabi,24.4,54.6,true`;

    const result = parseAndValidateCSV(csv, [] as Location[]);
    // First row is valid, second is a duplicate
    expect(result.valid).toHaveLength(1);
    expect(result.duplicates).toHaveLength(1);
  });
});
