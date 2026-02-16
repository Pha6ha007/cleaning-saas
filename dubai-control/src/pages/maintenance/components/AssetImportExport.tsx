// AssetImportExport.tsx
// Stage 16: Import/Export - Import and export assets via CSV/Excel

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import {
  exportAssets,
  importAssets,
  downloadAssetImportTemplate,
  maintenanceKeys,
  type ExportFormat,
  type ImportResult,
} from "@/api/maintenance";

interface AssetImportExportProps {
  canEdit: boolean;
}

export function AssetImportExport({ canEdit }: AssetImportExportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: (format: ExportFormat) => exportAssets(format),
    onSuccess: (blob, format) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `assets.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: `Assets exported to ${format.toUpperCase()}` });
    },
    onError: (error: Error) => {
      toast({ title: "Export failed", description: error.message, variant: "destructive" });
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: importAssets,
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.assets.all });
      if (result.errors.length === 0) {
        toast({
          title: "Import complete",
          description: `Created ${result.created}, updated ${result.updated} assets`,
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  // Download template mutation
  const templateMutation = useMutation({
    mutationFn: (format: ExportFormat) => downloadAssetImportTemplate(format),
    onSuccess: (blob, format) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asset_import_template.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Template downloaded" });
    },
    onError: (error: Error) => {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleCloseImport = () => {
    setIsImportOpen(false);
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-[6px]"
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1 h-4 w-4" />
              )}
              Export
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportMutation.mutate("csv")}>
              <FileText className="mr-2 h-4 w-4" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportMutation.mutate("xlsx")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Import Button */}
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-[6px]"
            onClick={() => setIsImportOpen(true)}
          >
            <Upload className="mr-1 h-4 w-4" />
            Import
          </Button>
        )}
      </div>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={handleCloseImport}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Assets</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file to import assets. Existing assets (matched by name + location) will be updated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Template download */}
            <div className="rounded-[6px] border border-dashed bg-gray-50 p-4">
              <p className="text-sm text-gray-600 mb-2">
                Download a template file with the correct format:
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-[6px]"
                  onClick={() => templateMutation.mutate("csv")}
                  disabled={templateMutation.isPending}
                >
                  <FileText className="mr-1 h-4 w-4" />
                  CSV Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-[6px]"
                  onClick={() => templateMutation.mutate("xlsx")}
                  disabled={templateMutation.isPending}
                >
                  <FileSpreadsheet className="mr-1 h-4 w-4" />
                  Excel Template
                </Button>
              </div>
            </div>

            {/* File input */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".csv,.xlsx"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-[6px] file:border-0 file:text-sm file:font-medium file:bg-[hsl(188,45%,24%)] file:text-white hover:file:bg-[hsl(188,45%,20%)] cursor-pointer"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            {/* Import result */}
            {importResult && (
              <div className={`rounded-[6px] p-4 ${importResult.errors.length > 0 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                <div className="flex items-start gap-2">
                  {importResult.errors.length > 0 ? (
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  )}
                  <div className="text-sm">
                    <p className="font-medium">
                      {importResult.errors.length > 0 ? "Import completed with warnings" : "Import successful"}
                    </p>
                    <p className="text-gray-600 mt-1">
                      Created: {importResult.created}, Updated: {importResult.updated}
                    </p>
                    {importResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium text-amber-700">Errors ({importResult.errors.length}):</p>
                        <ul className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                          {importResult.errors.slice(0, 10).map((err, idx) => (
                            <li key={idx} className="text-amber-700">
                              Row {err.row}: {err.error}
                            </li>
                          ))}
                          {importResult.errors.length > 10 && (
                            <li className="text-amber-700">
                              ... and {importResult.errors.length - 10} more errors
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseImport} className="rounded-[6px]">
              {importResult ? "Close" : "Cancel"}
            </Button>
            {!importResult && (
              <Button
                onClick={handleImport}
                disabled={!selectedFile || importMutation.isPending}
                className="bg-[hsl(188,45%,24%)] hover:bg-[hsl(188,45%,20%)] rounded-[6px]"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
