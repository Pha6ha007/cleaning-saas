// Customer Portal Contracts Page (Stage 16)
// List of customer's service contracts

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  FileText,
  Loader2,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { getCustomerContracts, customerKeys } from "@/api/customer";

export default function CustomerContracts() {
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: customerKeys.contracts.list(),
    queryFn: getCustomerContracts,
  });

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      );
    }
    if (status === "expired") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2.5 py-1 text-xs font-medium text-gray-500">
          <XCircle className="h-3 w-3" />
          Expired
        </span>
      );
    }
    return (
      <span className="rounded-full bg-gray-500/10 px-2.5 py-1 text-xs font-medium text-gray-500">
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Contracts</h1>
        <p className="text-sm text-muted-foreground">
          {contracts.length} contract{contracts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Contracts List */}
      {contracts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 font-medium text-foreground">No contracts</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No service contracts for your locations
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => (
            <Link
              key={contract.id}
              to={`/customer/contracts/${contract.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-4">
                <div className="hidden h-12 w-12 items-center justify-center rounded-lg bg-purple-600/10 sm:flex">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-foreground">{contract.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {contract.location.name}
                    </span>
                    <span>{contract.contract_type_display}</span>
                    {contract.start_date && contract.end_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(contract.start_date).toLocaleDateString()} -{" "}
                        {new Date(contract.end_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {getStatusBadge(contract.status, contract.is_active)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
