// AUTO-GENERATED STUB — replace with:
// supabase gen types typescript --local > src/types/supabase.ts
//
// This stub provides minimal type safety until the CLI-generated version is available.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          subscription_status: 'free' | 'active' | 'canceled'
          role: 'user' | 'admin'
          email_capture_consented_at: string | null
        }
        Insert: {
          id: string
          email: string
          created_at?: string
          subscription_status?: 'free' | 'active' | 'canceled'
          role?: 'user' | 'admin'
          email_capture_consented_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          subscription_status?: 'free' | 'active' | 'canceled'
          role?: 'user' | 'admin'
          email_capture_consented_at?: string | null
        }
      }
      cases: {
        Row: {
          id: string
          user_id: string
          created_at: string
          issue_type: 'denial' | 'billing' | 'access'
          state: 'CA' | 'TX' | 'NY'
          status: 'open' | 'in_progress' | 'completed' | 'archived'
          entry_source: 'denial_decoder' | 'direct' | 'seo'
          review_state: 'not_required' | 'pending' | 'approved'
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          issue_type: 'denial' | 'billing' | 'access'
          state: 'CA' | 'TX' | 'NY'
          status?: 'open' | 'in_progress' | 'completed' | 'archived'
          entry_source?: 'denial_decoder' | 'direct' | 'seo'
          review_state?: 'not_required' | 'pending' | 'approved'
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          issue_type?: 'denial' | 'billing' | 'access'
          state?: 'CA' | 'TX' | 'NY'
          status?: 'open' | 'in_progress' | 'completed' | 'archived'
          entry_source?: 'denial_decoder' | 'direct' | 'seo'
          review_state?: 'not_required' | 'pending' | 'approved'
        }
      }
      documents: {
        Row: {
          id: string
          case_id: string
          file_type: 'pdf' | 'jpg' | 'png'
          uploaded_at: string
          parse_status: 'pending' | 'parsed' | 'failed' | 'unsupported'
          extraction_confidence: number | null
          storage_path: string
        }
        Insert: {
          id?: string
          case_id: string
          file_type: 'pdf' | 'jpg' | 'png'
          uploaded_at?: string
          parse_status?: 'pending' | 'parsed' | 'failed' | 'unsupported'
          extraction_confidence?: number | null
          storage_path: string
        }
        Update: {
          id?: string
          case_id?: string
          file_type?: 'pdf' | 'jpg' | 'png'
          uploaded_at?: string
          parse_status?: 'pending' | 'parsed' | 'failed' | 'unsupported'
          extraction_confidence?: number | null
          storage_path?: string
        }
      }
      extraction_outputs: {
        Row: {
          id: string
          document_id: string
          case_id: string
          user_id: string
          extracted_at: string
          confidence_score: number
          flagged_for_review: boolean
          scrubbed_payload: Json
        }
        Insert: {
          id?: string
          document_id: string
          case_id: string
          user_id: string
          extracted_at?: string
          confidence_score: number
          flagged_for_review?: boolean
          scrubbed_payload?: Json
        }
        Update: {
          id?: string
          document_id?: string
          case_id?: string
          user_id?: string
          extracted_at?: string
          confidence_score?: number
          flagged_for_review?: boolean
          scrubbed_payload?: Json
        }
      }
      artifacts: {
        Row: {
          id: string
          case_id: string
          user_id: string
          artifact_type: 'denial_appeal'
          created_at: string
          release_state: 'draft' | 'review_required' | 'released' | 'archived'
          disclaimer_version: string
          content_hash: string
          storage_path: string
        }
        Insert: {
          id?: string
          case_id: string
          user_id: string
          artifact_type?: 'denial_appeal'
          created_at?: string
          release_state?: 'draft' | 'review_required' | 'released' | 'archived'
          disclaimer_version: string
          content_hash: string
          storage_path: string
        }
        Update: {
          id?: string
          case_id?: string
          user_id?: string
          artifact_type?: 'denial_appeal'
          created_at?: string
          release_state?: 'draft' | 'review_required' | 'released' | 'archived'
          disclaimer_version?: string
          content_hash?: string
          storage_path?: string
        }
      }
      review_queue: {
        Row: {
          id: string
          artifact_id: string
          case_id: string
          created_at: string
          reviewed_at: string | null
          reviewer_id: string | null
          decision: 'pending' | 'approved' | 'rejected' | 'edited'
          risk_reason: string | null
        }
        Insert: {
          id?: string
          artifact_id: string
          case_id: string
          created_at?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          decision?: 'pending' | 'approved' | 'rejected' | 'edited'
          risk_reason?: string | null
        }
        Update: {
          id?: string
          artifact_id?: string
          case_id?: string
          created_at?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          decision?: 'pending' | 'approved' | 'rejected' | 'edited'
          risk_reason?: string | null
        }
      }
      resource_routes: {
        Row: {
          id: string
          state_code: 'CA' | 'TX' | 'NY'
          issue_type: 'denial' | 'billing' | 'access'
          resource_name: string
          url: string
          verified_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          state_code: 'CA' | 'TX' | 'NY'
          issue_type: 'denial' | 'billing' | 'access'
          resource_name: string
          url: string
          verified_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          state_code?: 'CA' | 'TX' | 'NY'
          issue_type?: 'denial' | 'billing' | 'access'
          resource_name?: string
          url?: string
          verified_at?: string
          is_active?: boolean
        }
      }
      metric_events: {
        Row: {
          id: string
          occurred_at: string
          event_type: 'tool_use' | 'page_view' | 'signup' | 'conversion'
          source_page: string
          tool_name: string | null
          case_id: string | null
        }
        Insert: {
          id?: string
          occurred_at?: string
          event_type: 'tool_use' | 'page_view' | 'signup' | 'conversion'
          source_page: string
          tool_name?: string | null
          case_id?: string | null
        }
        Update: {
          id?: string
          occurred_at?: string
          event_type?: 'tool_use' | 'page_view' | 'signup' | 'conversion'
          source_page?: string
          tool_name?: string | null
          case_id?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id: string
          status: 'active' | 'canceled' | 'past_due'
          current_period_end: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id: string
          status: 'active' | 'canceled' | 'past_due'
          current_period_end: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          status?: 'active' | 'canceled' | 'past_due'
          current_period_end?: string
        }
      }
      denial_codes: {
        Row: {
          id: string
          code: string
          category: 'labs' | 'imaging' | 'surgery' | 'dme' | 'pharmacy' | 'mental_health' | 'prior_auth' | 'coordination' | 'timely_filing' | 'other'
          plain_language_explanation: string
          recommended_action: string
          source: string
          updated_at: string
          common_causes: string | null
          appeal_angle: string | null
          related_codes: string[] | null
          tool_cta_id: string | null  // intentionally loose; use ToolCtaId from domain.ts at call sites
        }
        Insert: {
          id?: string
          code: string
          category: 'labs' | 'imaging' | 'surgery' | 'dme' | 'pharmacy' | 'mental_health' | 'prior_auth' | 'coordination' | 'timely_filing' | 'other'
          plain_language_explanation: string
          recommended_action: string
          source: string
          updated_at?: string
          common_causes?: string | null
          appeal_angle?: string | null
          related_codes?: string[] | null
          tool_cta_id?: string | null  // intentionally loose; use ToolCtaId from domain.ts at call sites
        }
        Update: {
          id?: string
          code?: string
          category?: 'labs' | 'imaging' | 'surgery' | 'dme' | 'pharmacy' | 'mental_health' | 'prior_auth' | 'coordination' | 'timely_filing' | 'other'
          plain_language_explanation?: string
          recommended_action?: string
          source?: string
          updated_at?: string
          common_causes?: string | null
          appeal_angle?: string | null
          related_codes?: string[] | null
          tool_cta_id?: string | null  // intentionally loose; use ToolCtaId from domain.ts at call sites
        }
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Views: {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Functions: {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Enums: {}
  }
}
