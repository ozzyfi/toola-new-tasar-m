/**
 * Veritabanı tipleri.
 *
 * Tek doğruluk kaynağı: `src/integrations/supabase/types.ts`
 * (Lovable Cloud her migration sonrası bu dosyayı otomatik günceller.)
 *
 * Bu dosya, kısa ve anlamlı isimlerle erişim için re-export sağlar.
 *
 * Örnek kullanım:
 *   import type { Machine, WorkOrder, NewWorkOrder } from "@/types/db";
 */

import type { Database, Tables, TablesInsert, TablesUpdate, Enums } from "@/integrations/supabase/types";

// Row tipleri (SELECT sonucu)
export type Profile = Tables<"profiles">;
export type UserRole = Tables<"user_roles">;
export type Machine = Tables<"machines">;
export type Technician = Tables<"technicians">;
export type WorkOrder = Tables<"work_orders">;
export type WorkOrderPart = Tables<"work_order_parts">;
export type MasterProfile = Tables<"master_profiles">;
export type CorrectionRule = Tables<"correction_rules">;
export type Correction = Tables<"corrections">;
export type LearningCase = Tables<"learning_cases">;
export type DiagnosisSession = Tables<"diagnosis_sessions">;
export type MachineServiceHistory = Tables<"machine_service_history">;
export type MachineLog = Tables<"machine_logs">;
export type RepairVideo = Tables<"repair_videos">;

// Insert tipleri
export type NewProfile = TablesInsert<"profiles">;
export type NewMachine = TablesInsert<"machines">;
export type NewTechnician = TablesInsert<"technicians">;
export type NewWorkOrder = TablesInsert<"work_orders">;
export type NewWorkOrderPart = TablesInsert<"work_order_parts">;
export type NewMasterProfile = TablesInsert<"master_profiles">;
export type NewCorrectionRule = TablesInsert<"correction_rules">;
export type NewCorrection = TablesInsert<"corrections">;
export type NewLearningCase = TablesInsert<"learning_cases">;
export type NewDiagnosisSession = TablesInsert<"diagnosis_sessions">;
export type NewMachineServiceHistory = TablesInsert<"machine_service_history">;
export type NewMachineLog = TablesInsert<"machine_logs">;
export type NewRepairVideo = TablesInsert<"repair_videos">;

// Update tipleri
export type UpdateProfile = TablesUpdate<"profiles">;
export type UpdateMachine = TablesUpdate<"machines">;
export type UpdateWorkOrder = TablesUpdate<"work_orders">;
export type UpdateDiagnosisSession = TablesUpdate<"diagnosis_sessions">;

// Enum
export type AppRole = Enums<"app_role">;

// Yardımcı: diagnosis_sessions.turns için tipli yapı
export type DiagnosisTurn = {
  role: "user" | "ai" | "system";
  text: string;
  ts: number;
  type?: "diagnosis" | string;
  steps?: unknown;
  source_ref?: string;
};

// closing_notes JSON şekilleri (ariza | bakim | parca | diger)
export type ClosingNotesAriza = { ariza: string; neden: string; yapilan: string; sure: string };
export type ClosingNotesBakim = { yapilanBakim: string; periyod: string; notlar: string };
export type ClosingNotesParca = { parca: string; nedenDeg: string; parcaNo: string };
export type ClosingNotesDiger = { islem: string; aciklama: string; notlar2: string };
export type ClosingNotes = ClosingNotesAriza | ClosingNotesBakim | ClosingNotesParca | ClosingNotesDiger;

// SOP step (repair_videos.sop_steps öğesi)
export type SopStep = {
  step: number;
  text: string;
  time?: string;
  confidence?: number;
  safety_note?: string;
};

export type { Database };
