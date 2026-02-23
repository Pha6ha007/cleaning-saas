// dubai-control/src/lib/excel-export.ts
// Excel export utilities for Maintenance pages

import * as XLSX from "xlsx";
import type { MaintenanceTechnician } from "@/api/maintenance";
import type { ServiceContract, RecurringVisitTemplate } from "@/api/maintenance";

// ============================================================================
// Technicians Export
// ============================================================================

export function exportTechniciansToExcel(
  technicians: MaintenanceTechnician[],
  filename: string = "technicians.xlsx"
): void {
  const data = [
    // Header row
    ["Name", "Email", "Phone", "Status", "Total Visits", "SLA Violation Rate"],
    // Data rows
    ...technicians.map((tech) => [
      tech.full_name,
      tech.email || "",
      tech.phone || "",
      tech.is_active ? "Active" : "Inactive",
      tech.total_visits || 0,
      `${(tech.sla_violation_rate * 100).toFixed(1)}%`,
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 25 }, // Name
    { wch: 30 }, // Email
    { wch: 15 }, // Phone
    { wch: 10 }, // Status
    { wch: 12 }, // Total Visits
    { wch: 18 }, // SLA Violation Rate
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Technicians");

  XLSX.writeFile(workbook, filename);
}

// ============================================================================
// Contracts Export
// ============================================================================

export function exportContractsToExcel(
  contracts: ServiceContract[],
  filename: string = "contracts.xlsx"
): void {
  const data = [
    // Header row
    [
      "Contract Name",
      "Contract Number",
      "Type",
      "Customer",
      "Contact",
      "Location",
      "Status",
      "Start Date",
      "End Date",
      "Visits Included",
      "Days Remaining",
    ],
    // Data rows
    ...contracts.map((contract) => [
      contract.name,
      contract.contract_number || "",
      contract.contract_type,
      contract.customer_name || "",
      contract.customer_contact || "",
      contract.location?.name || "",
      contract.status,
      contract.start_date,
      contract.end_date || "",
      contract.visits_included || "",
      contract.days_remaining !== null && contract.days_remaining >= 0
        ? contract.days_remaining
        : "",
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 30 }, // Contract Name
    { wch: 18 }, // Contract Number
    { wch: 15 }, // Type
    { wch: 25 }, // Customer
    { wch: 20 }, // Contact
    { wch: 25 }, // Location
    { wch: 12 }, // Status
    { wch: 12 }, // Start Date
    { wch: 12 }, // End Date
    { wch: 15 }, // Visits Included
    { wch: 15 }, // Days Remaining
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contracts");

  XLSX.writeFile(workbook, filename);
}

// ============================================================================
// Recurring Schedules Export
// ============================================================================

export function exportSchedulesToExcel(
  schedules: RecurringVisitTemplate[],
  filename: string = "schedules.xlsx"
): void {
  const data = [
    // Header row
    [
      "Schedule Name",
      "Location",
      "Asset",
      "Frequency",
      "Interval (days)",
      "Start Date",
      "End Date",
      "Technician",
      "Category",
      "Checklist",
      "Status",
    ],
    // Data rows
    ...schedules.map((schedule) => [
      schedule.name,
      schedule.location?.name || "",
      schedule.asset?.name || "",
      schedule.frequency,
      schedule.interval_days || "",
      schedule.start_date,
      schedule.end_date || "",
      schedule.assigned_technician?.full_name || "",
      schedule.maintenance_category?.name || "",
      schedule.checklist_template?.name || "",
      schedule.is_active ? "Active" : "Inactive",
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 30 }, // Schedule Name
    { wch: 25 }, // Location
    { wch: 25 }, // Asset
    { wch: 12 }, // Frequency
    { wch: 15 }, // Interval (days)
    { wch: 12 }, // Start Date
    { wch: 12 }, // End Date
    { wch: 20 }, // Technician
    { wch: 20 }, // Category
    { wch: 25 }, // Checklist
    { wch: 10 }, // Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Schedules");

  XLSX.writeFile(workbook, filename);
}
