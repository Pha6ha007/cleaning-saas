// dubai-control/src/lib/csv.ts
// CSV utilities for importing/exporting locations

import type { Location } from "@/api/client";

// ============================================================================
// Types
// ============================================================================

export interface LocationCSVRow {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  is_active: string;
}

export interface ParsedLocation {
  data: Partial<Location>;
  isValid: boolean;
  errors: string[];
  rowNumber: number;
}

export interface CSVParseResult {
  valid: ParsedLocation[];
  invalid: ParsedLocation[];
  duplicates: ParsedLocation[];
}

// ============================================================================
// CSV Parsing
// ============================================================================

/**
 * Parse CSV string to array of rows
 */
export function parseCSV(csvContent: string): LocationCSVRow[] {
  const lines = csvContent.split("\n").filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }

  // Parse header
  const header = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

  // Validate header
  const expectedHeaders = ["name", "address", "latitude", "longitude", "is_active"];
  const headerValid = expectedHeaders.every((h) => header.includes(h));

  if (!headerValid) {
    throw new Error(
      `Invalid CSV headers. Expected: ${expectedHeaders.join(", ")}`
    );
  }

  // Parse data rows
  const rows: LocationCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseCSVLine(line);

    if (values.length === 0) continue; // Skip empty lines

    const row: LocationCSVRow = {
      name: values[0] || "",
      address: values[1] || "",
      latitude: values[2] || "",
      longitude: values[3] || "",
      is_active: values[4] || "true",
    };

    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values.map((v) => v.replace(/^"|"$/g, "")); // Remove quotes
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate and parse location row
 */
export function validateLocationRow(
  row: LocationCSVRow,
  rowNumber: number,
  existingNames: string[]
): ParsedLocation {
  const errors: string[] = [];

  // Validate name (required)
  const name = row.name.trim();
  if (!name) {
    errors.push("Name is required");
  } else if (name.length > 100) {
    errors.push("Name too long (max 100 characters)");
  }

  // Check for duplicates (case-insensitive)
  if (name && existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
    errors.push(`Duplicate name "${name}"`);
  }

  // Validate address (optional, max 500 chars)
  const address = row.address.trim();
  if (address.length > 500) {
    errors.push("Address too long (max 500 characters)");
  }

  // Validate latitude (optional, -90 to 90)
  let latitude: number | undefined;
  if (row.latitude.trim()) {
    latitude = parseFloat(row.latitude);
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      errors.push("Invalid latitude (must be between -90 and 90)");
    }
  }

  // Validate longitude (optional, -180 to 180)
  let longitude: number | undefined;
  if (row.longitude.trim()) {
    longitude = parseFloat(row.longitude);
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      errors.push("Invalid longitude (must be between -180 and 180)");
    }
  }

  // Validate is_active (optional, boolean)
  const isActiveStr = row.is_active.trim().toLowerCase();
  const isActive = isActiveStr === "true" || isActiveStr === "1" || isActiveStr === "yes";

  const data: Partial<Location> = {
    name,
    address: address || undefined,
    latitude,
    longitude,
    is_active: isActive,
  };

  return {
    data,
    isValid: errors.length === 0,
    errors,
    rowNumber,
  };
}

/**
 * Parse and validate entire CSV file
 */
export function parseAndValidateCSV(
  csvContent: string,
  existingLocations: Location[]
): CSVParseResult {
  const rows = parseCSV(csvContent);

  if (rows.length === 0) {
    throw new Error("No data rows found in CSV");
  }

  if (rows.length > 100) {
    throw new Error("Maximum 100 locations per import");
  }

  // Get existing location names for duplicate detection
  const existingNames = existingLocations.map((loc) => loc.name);
  const importNames: string[] = [];

  const valid: ParsedLocation[] = [];
  const invalid: ParsedLocation[] = [];
  const duplicates: ParsedLocation[] = [];

  rows.forEach((row, index) => {
    const parsed = validateLocationRow(row, index + 2, [...existingNames, ...importNames]); // +2 for header and 1-based

    if (parsed.isValid) {
      valid.push(parsed);
      importNames.push(parsed.data.name!);
    } else {
      // Check if error is duplicate
      if (parsed.errors.some((e) => e.includes("Duplicate"))) {
        duplicates.push(parsed);
      } else {
        invalid.push(parsed);
      }
    }
  });

  return { valid, invalid, duplicates };
}

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Convert locations to CSV string
 */
export function locationsToCSV(locations: Location[]): string {
  const headers = ["name", "address", "latitude", "longitude", "is_active"];
  const rows = locations.map((loc) => [
    escapeCSVValue(loc.name),
    escapeCSVValue(loc.address || ""),
    loc.latitude?.toString() || "",
    loc.longitude?.toString() || "",
    loc.is_active ? "true" : "false",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Escape CSV value (add quotes if needed)
 */
function escapeCSVValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate CSV template
 */
export function generateCSVTemplate(): string {
  const headers = ["name", "address", "latitude", "longitude", "is_active"];
  const examples = [
    [
      "Example Office",
      "123 Sheikh Zayed Rd, Dubai",
      "25.2048",
      "55.2708",
      "true",
    ],
    [
      "Example Warehouse",
      "Industrial Area 5",
      "25.1234",
      "55.3456",
      "true",
    ],
  ];

  return [headers.join(","), ...examples.map((e) => e.join(","))].join("\n");
}

/**
 * Read CSV file from File input
 */
export function readCSVFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}
