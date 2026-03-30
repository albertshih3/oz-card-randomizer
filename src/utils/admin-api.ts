export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  lastSignInAt: number | null;
}

export interface AnalyticsDayEntry {
  date: string;
  activeUsers: number;
  sessions: number;
  packGenerations: number;
  exports: number;
}

export interface AnalyticsPeriodTotals {
  activeUsers: number;
  sessions: number;
  packGenerations: number;
  exports: number;
}

export interface AnalyticsSummary {
  days: number;
  series: AnalyticsDayEntry[];
  current: AnalyticsPeriodTotals;
  prior: AnalyticsPeriodTotals;
}

export async function listUsers(token: string): Promise<AdminUser[]> {
  const res = await fetch("/api/users/list", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed (${res.status})`,
    );
  }
  const body = await res.json();
  if (!Array.isArray(body)) {
    throw new Error("Unexpected response format from /api/users/list");
  }
  return body as AdminUser[];
}

export async function inviteUser(token: string, email: string): Promise<void> {
  const res = await fetch("/api/users/invite", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed (${res.status})`,
    );
  }
}

export async function getAnalyticsSummary(
  token: string,
  days: number = 30,
): Promise<AnalyticsSummary> {
  const res = await fetch(`/api/analytics/summary?days=${days}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed (${res.status})`,
    );
  }
  return res.json() as Promise<AnalyticsSummary>;
}
