// dubai-control/src/pages/maintenance/components/LocationImportModal.tsx
// Preview modal for CSV import

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import type { ParsedLocation } from "@/lib/csv";
import type { Location } from "@/api/client";

interface LocationImportModalProps {
  validLocations: ParsedLocation[];
  invalidLocations: ParsedLocation[];
  duplicateLocations: ParsedLocation[];
  onConfirm: (locations: Partial<Location>[]) => Promise<void>;
  onCancel: () => void;
}

export function LocationImportModal({
  validLocations,
  invalidLocations,
  duplicateLocations,
  onConfirm,
  onCancel,
}: LocationImportModalProps) {
  const [isImporting, setIsImporting] = useState(false);

  const totalValid = validLocations.length;
  const totalInvalid = invalidLocations.length + duplicateLocations.length;
  const canImport = totalValid > 0;

  const handleConfirm = async () => {
    setIsImporting(true);
    try {
      const locationsToImport = validLocations.map((loc) => loc.data);
      await onConfirm(locationsToImport);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Import Preview
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Review locations before importing
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isImporting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex gap-6">
            {totalValid > 0 && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-foreground">
                  {totalValid} valid location{totalValid !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            {totalInvalid > 0 && (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-foreground">
                  {totalInvalid} error{totalInvalid !== 1 ? "s" : ""} found
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Preview Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Valid Locations */}
            {validLocations.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Valid Locations ({validLocations.length})
                </h4>
                <div className="rounded-lg border border-green-200 bg-green-50/50 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-green-100/50 border-b border-green-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-green-900">
                          Row
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-green-900">
                          Name
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-green-900">
                          Address
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-green-900">
                          Coordinates
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-green-900">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-green-200">
                      {validLocations.map((loc, idx) => (
                        <tr key={idx} className="hover:bg-green-100/30">
                          <td className="px-3 py-2 text-green-700">
                            {loc.rowNumber}
                          </td>
                          <td className="px-3 py-2 font-medium text-green-900">
                            {loc.data.name}
                          </td>
                          <td className="px-3 py-2 text-green-700">
                            {loc.data.address || "—"}
                          </td>
                          <td className="px-3 py-2 text-green-700 font-mono text-xs">
                            {loc.data.latitude && loc.data.longitude
                              ? `${loc.data.latitude?.toFixed(4)}, ${loc.data.longitude?.toFixed(4)}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-green-700">
                            {loc.data.is_active ? "Active" : "Inactive"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Invalid Locations */}
            {invalidLocations.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-red-700 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Invalid Locations ({invalidLocations.length})
                </h4>
                <div className="rounded-lg border border-red-200 bg-red-50/50 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-red-100/50 border-b border-red-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-red-900">
                          Row
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-red-900">
                          Name
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-red-900">
                          Errors
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-200">
                      {invalidLocations.map((loc, idx) => (
                        <tr key={idx} className="hover:bg-red-100/30">
                          <td className="px-3 py-2 text-red-700">
                            {loc.rowNumber}
                          </td>
                          <td className="px-3 py-2 font-medium text-red-900">
                            {loc.data.name || "(empty)"}
                          </td>
                          <td className="px-3 py-2 text-red-700">
                            {loc.errors.join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Duplicate Locations */}
            {duplicateLocations.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-amber-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Duplicate Locations ({duplicateLocations.length})
                </h4>
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-amber-100/50 border-b border-amber-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-amber-900">
                          Row
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-amber-900">
                          Name
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-amber-900">
                          Issue
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-200">
                      {duplicateLocations.map((loc, idx) => (
                        <tr key={idx} className="hover:bg-amber-100/30">
                          <td className="px-3 py-2 text-amber-700">
                            {loc.rowNumber}
                          </td>
                          <td className="px-3 py-2 font-medium text-amber-900">
                            {loc.data.name}
                          </td>
                          <td className="px-3 py-2 text-amber-700">
                            {loc.errors.join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-card px-6 py-4 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canImport || isImporting}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Import {totalValid} Location{totalValid !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
