export type UpdateStatus = "pending" | "approved" | "rejected" | "canceled";

export interface UpdateRequest {
  request_id: number;
  description: string;
  status: UpdateStatus;
  urgency: string;
  registered_at: string;
  center_name: string;
  requested_by_name: string | null;
  assigned_to_name: string | null;
  resolved_by_name?: string | null;
  resolved_at?: string | null;
  resolution_comment?: string | null;
}

export interface UpdatesApiResponse {
  requests: UpdateRequest[];
  total: number;
}
export interface UpdateCreateDTO {
  center_id: string;
  title: string;
  description: string;
  urgency: string;        
  created_by: number;
  status?: "pending"; 
}