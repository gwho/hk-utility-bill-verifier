/**
 * FILE: types/domain.ts
 * ROLE: TypeScript mirror of python-backend/models/domain.py
 * WHY: The iOS app needs typed representations of the same domain entities
 *      the backend produces. Keeping these in sync manually is error-prone —
 *      in a later stage we will generate these from the OpenAPI spec.
 *
 * TUTORIAL CONCEPT — FieldWithSource<T>:
 * Every value extracted from a scanned document is wrapped in this type.
 * It answers "where did this number come from?" for every field.
 * Without provenance, a discrepancy report is just accusations — with it,
 * you can point to the exact word on the exact page of the original bill.
 */

export type DocumentType = "official_bill" | "landlord_sheet";
export type UtilityType = "electricity" | "water" | "gas";
export type DocumentStatus = "pending" | "extracting" | "review_needed" | "done" | "failed";
export type AllocationMethodType = "equal_split" | "floor_area" | "occupancy" | "sub_meter" | "unknown";
export type DiscrepancyFlagType = "overcharge" | "undercharge" | "wrong_rate" | "usage_mismatch" | "missing_line_item" | "period_mismatch";
export type FlagSeverity = "info" | "warning" | "critical";
export type ComparisonStatus = "pending" | "running" | "done" | "failed";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * FieldWithSource<T> — the provenance wrapper.
 * Every extracted value carries: the value itself, where it was read from
 * (page + bbox), how confident the OCR is, and whether a human corrected it.
 */
export interface FieldWithSource<T> {
  value: T;
  raw_text: string;
  page: number;
  bbox: BoundingBox | null;
  confidence: number;       // 0.0–1.0
  corrected_by_user: boolean;
  correction_note: string;
}

export interface DateRange {
  start: string;  // ISO date string
  end: string;
}

export interface RateTier {
  unit_min: number;
  unit_max: number | null;
  rate: FieldWithSource<string>;  // Decimal as string
  description: string;
}

export interface OfficialBill {
  id: string;
  document_id: string;
  utility_type: UtilityType;
  billing_period: DateRange;
  meter_reading_start: FieldWithSource<number>;
  meter_reading_end: FieldWithSource<number>;
  usage: FieldWithSource<number>;
  rate_tiers: RateTier[];
  supply_charge: FieldWithSource<string> | null;
  fuel_adjustment: FieldWithSource<string> | null;
  gst_rate: number;
  total_billed: FieldWithSource<string>;
  currency: string;
}

export interface LandlordLineItem {
  description: FieldWithSource<string>;
  amount: FieldWithSource<string>;
  period: DateRange | null;
  unit_count: FieldWithSource<number> | null;
}

export interface LandlordChargeSheet {
  id: string;
  document_id: string;
  billing_period: DateRange;
  tenant_unit: string;
  utility_type: UtilityType;
  charges: LandlordLineItem[];
  total_charged: FieldWithSource<string>;
  currency: string;
}

export interface AllocationMethod {
  method: AllocationMethodType;
  parameters: Record<string, unknown>;
  reconstructed: boolean;
  reconstruction_confidence: number;
  notes: string;
}

export interface EvidenceRef {
  document_id: string;
  field_path: string;
  page: number;
  bbox: BoundingBox | null;
  excerpt: string;
}

export interface DiscrepancyFlag {
  flag_type: DiscrepancyFlagType;
  severity: FlagSeverity;
  official_value: unknown;
  landlord_value: unknown;
  delta: string;  // Decimal as string
  delta_currency: string;
  explanation: string;
  evidence_refs: EvidenceRef[];
}

export interface DiscrepancyReport {
  id: string;
  official_bill_id: string;
  landlord_sheet_id: string;
  allocation_method: AllocationMethod;
  flags: DiscrepancyFlag[];
  total_overcharge: string;
  total_undercharge: string;
  net_discrepancy: string;
  confidence: number;
  generated_at: string;
}

/** Summarised document record for list views */
export interface DocumentSummary {
  id: string;
  document_type: DocumentType;
  utility_type: UtilityType | null;
  original_filename: string | null;
  status: DocumentStatus;
  uploaded_at: string;
  total_billed?: string;
  total_charged?: string;
  billing_period?: DateRange;
  currency: string;
}

/** Summarised comparison report for list views */
export interface ReportSummary {
  id: string;
  comparison_run_id: string;
  total_overcharge: string;
  total_undercharge: string;
  flag_count: number;
  confidence: number;
  generated_at: string;
  official_bill_doc_id: string;
  landlord_sheet_doc_id: string;
}
