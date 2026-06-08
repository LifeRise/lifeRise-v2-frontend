import { apiGet } from './client';
import { getApiBaseUrl } from './config';
import type { DashboardOverview } from './types';

export async function fetchDashboardOverview(opts?: {
  companyId?: number;
  signal?: AbortSignal;
}): Promise<DashboardOverview> {
  const qs = opts?.companyId != null ? `?company_id=${opts.companyId}` : '';
  return apiGet<DashboardOverview>(getApiBaseUrl('manager'), `/api/admin/dashboard/overview${qs}`, {
    signal: opts?.signal,
  });
}
