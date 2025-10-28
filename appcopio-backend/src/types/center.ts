export type ActiveActivationRow = {
  activation_id: number;
  center_id: string;           // VARCHAR(10)
  started_at: string;          // timestamptz -> string en JS
  ended_at: string | null;
};