import { api } from "@/lib/api";
import type { CreateFibeSubmissionDTO, CreateFibeSubmissionResponse } from "@/types/fibe";

type CreateOpts = {
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export async function createFibeSubmission(
  dto: CreateFibeSubmissionDTO,
  opts: CreateOpts = {}
): Promise<CreateFibeSubmissionResponse> {
  const headers: Record<string, string> = {};
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  const { data } = await api.post<CreateFibeSubmissionResponse>("/fibe/submissions", dto, {
    headers,
    signal: opts.signal,
  });

  return data;
}
