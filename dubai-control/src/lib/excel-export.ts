// dubai-control/src/lib/excel-export.ts
// Excel export utilities for Maintenance pages

import type { MaintenanceTechnician } from "@/api/maintenance";
import type { ServiceContract, RecurringVisitTemplate } from "@/api/maintenance";

type XLSXModule = typeof import("xlsx");

let xlsxModulePromise: Promise<XLSXModule> | null = null;

function getXlsx(): Promise<XLSXModule> {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("xlsx");
  }
  return xlsxModulePromise;
}

async function writeSheetFile(
  data: Array<Array<string | number>>,
  sheetName: string,
  filename: string,
  cols: Array<{ wch: number }>
): Promise<void> {
  const XLSX = await getXlsx();
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet["!cols"] = cols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

// ============================================================================
// Technicians Export
// ============================================================================

export async function exportTechniciansToExcel(
  technicians: MaintenanceTechnician[],
  filename: string = "technicians.xlsx"
): Promise<void> {
  const data = [
    ["Name", "Email", "Phone", "Status", "Total Visits", "SLA Violation Rate"],
    ...technicians.map((tech) => [
      tech.full_name,
      tech.email || "",
      tech.phone || "",
      tech.is_active ? "Active" : "Inactive",
      tech.total_visits || 0,
      `${(tech.sla_violation_rate * 100).toFixed(1)}%`,
    ]),
  ];

  await writeSheetFile(data, "Technicians", filename, [
    { wch: 25 },
    { wch: 30 },
    { wch: 15 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
  ]);
}

// ============================================================================
// Contracts Export
// ============================================================================

export async function exportContractsToExcel(
  contracts: ServiceContract[],
  filename: string = "contracts.xlsx"
): Promise<void> {
  const data = [
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

  await writeSheetFile(data, "Contracts", filename, [
    { wch: 30 },
    { wch: 18 },
    { wch: 15 },
    { wch: 25 },
    { wch: 20 },
    { wch: 25 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
  ]);
}

// ============================================================================
// Recurring Schedules Export
// ============================================================================

export async function exportSchedulesToExcel(
  schedules: RecurringVisitTemplate[],
  filename: string = "schedules.xlsx"
): Promise<void> {
  const data = [
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

  await writeSheetFile(data, "Schedules", filename, [
    { wch: 30 },
    { wch: 25 },
    { wch: 25 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 20 },
    { wch: 25 },
    { wch: 10 },
  ]);
}
