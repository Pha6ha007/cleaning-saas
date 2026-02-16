// AssetDocuments.tsx
// Stage 15: Asset Documents - Upload, view, and manage asset documents

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
  File,
  Image,
  FileWarning,
  Plus,
  X,
} from "lucide-react";
import { format } from "date-fns";
import {
  getAssetDocuments,
  uploadAssetDocument,
  deleteAssetDocument,
  maintenanceKeys,
  type AssetDocument,
  type DocumentType,
} from "@/api/maintenance";

interface AssetDocumentsProps {
  assetId: number;
  canEdit: boolean;
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "warranty", label: "Warranty Document" },
  { value: "certificate", label: "Certificate" },
  { value: "inspection", label: "Inspection Report" },
  { value: "photo", label: "Photo" },
  { value: "other", label: "Other" },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <Image className="h-5 w-5 text-blue-500" />;
  }
  if (mimeType === "application/pdf") {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  return <File className="h-5 w-5 text-gray-500" />;
}

export function AssetDocuments({ assetId, canEdit }: AssetDocumentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    document_type: "other" as DocumentType,
    description: "",
    file: null as File | null,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: [...maintenanceKeys.assets.detail(assetId), "documents"],
    queryFn: () => getAssetDocuments(assetId),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (input: { name: string; document_type: DocumentType; description: string; file: File }) =>
      uploadAssetDocument(assetId, input),
    onSuccess: () => {
      toast({ title: "Document uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: [...maintenanceKeys.assets.detail(assetId), "documents"] });
      setIsUploadOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteAssetDocument,
    onSuccess: () => {
      toast({ title: "Document deleted" });
      queryClient.invalidateQueries({ queryKey: [...maintenanceKeys.assets.detail(assetId), "documents"] });
      setDeleteConfirm(null);
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setUploadForm({
      name: "",
      document_type: "other",
      description: "",
      file: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm((prev) => ({
        ...prev,
        file,
        name: prev.name || file.name.replace(/\.[^/.]+$/, ""), // Use filename without extension as default name
      }));
    }
  };

  const handleUpload = () => {
    if (!uploadForm.file || !uploadForm.name.trim()) {
      toast({ title: "Please provide a name and select a file", variant: "destructive" });
      return;
    }

    uploadMutation.mutate({
      name: uploadForm.name.trim(),
      document_type: uploadForm.document_type,
      description: uploadForm.description.trim(),
      file: uploadForm.file,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(188,45%,24%)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[hsl(188,45%,24%)]">
          Documents ({documents.length})
        </h3>
        {canEdit && (
          <Button
            onClick={() => setIsUploadOpen(true)}
            size="sm"
            className="bg-[hsl(188,45%,24%)] hover:bg-[hsl(188,45%,20%)] rounded-[6px]"
          >
            <Plus className="mr-1 h-4 w-4" />
            Upload
          </Button>
        )}
      </div>

      {/* Documents list */}
      {documents.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <FileWarning className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">No documents uploaded</p>
          {canEdit && (
            <Button
              onClick={() => setIsUploadOpen(true)}
              variant="outline"
              size="sm"
              className="mt-3 rounded-[6px]"
            >
              <Upload className="mr-1 h-4 w-4" />
              Upload First Document
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-[6px] border bg-white p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {getFileIcon(doc.mime_type)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {doc.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {doc.document_type_display}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>{format(new Date(doc.uploaded_at), "MMM d, yyyy")}</span>
                    {doc.uploaded_by && (
                      <>
                        <span>•</span>
                        <span>{doc.uploaded_by.full_name}</span>
                      </>
                    )}
                  </div>
                  {doc.description && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {doc.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {doc.file_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => window.open(doc.file_url!, "_blank")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteConfirm(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* File input */}
            <div>
              <Label>File</Label>
              <div className="mt-1">
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                  className="rounded-[6px]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max 10MB. PDF, images, or documents.
                </p>
              </div>
            </div>

            {/* Document name */}
            <div>
              <Label>Document Name</Label>
              <Input
                value={uploadForm.name}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter document name"
                className="mt-1 rounded-[6px]"
              />
            </div>

            {/* Document type */}
            <div>
              <Label>Document Type</Label>
              <Select
                value={uploadForm.document_type}
                onValueChange={(value) =>
                  setUploadForm((prev) => ({ ...prev, document_type: value as DocumentType }))
                }
              >
                <SelectTrigger className="mt-1 rounded-[6px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Add notes about this document"
                className="mt-1 rounded-[6px]"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadOpen(false);
                resetForm();
              }}
              className="rounded-[6px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending || !uploadForm.file || !uploadForm.name.trim()}
              className="bg-[hsl(188,45%,24%)] hover:bg-[hsl(188,45%,20%)] rounded-[6px]"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this document? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="rounded-[6px]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
              className="rounded-[6px]"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
