export type TraderType = "company" | "individual";
export type TraderStatus = "pending" | "approved" | "rejected" | "suspended";
export type AgreementStatus = "draft" | "active" | "expired" | "terminated";
export type CommissionType = "percentage" | "fixed" | "none";
export interface TraderProfile { id: number; trader_type: TraderType; business_name: string; slug: string; owner_full_name: string; phone: string; email: string; region: string; district: string; status: TraderStatus; is_verified: boolean; is_featured: boolean; created_at: string; updated_at: string; [key: string]: unknown; }
export interface TraderAgreement { id: number; trader: number; title: string; commission_type: CommissionType; commission_value: string; start_date: string; end_date: string | null; status: AgreementStatus; signed_by_trader: boolean; signed_by_platform: boolean; is_active_agreement?: boolean; [key: string]: unknown; }
export interface TraderDocument { id: number; trader: number; document_type: string; title: string; file: string; verified: boolean; uploaded_at: string; [key: string]: unknown; }
export interface TraderBranch { id: number; trader: number; name: string; phone: string; email: string; region: string; district: string; is_main_branch: boolean; is_active: boolean; [key: string]: unknown; }
