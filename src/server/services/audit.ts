/**
 * Service de journalisation d'audit en ajout seul (append-only) pour LGV SaaS
 * Enregistre les connexions, changements de droits, suppressions, exports, normalisations et accès paie.
 */

export interface AuditEventPayload {
  companyId?: string | null;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface StoredAuditEvent extends AuditEventPayload {
  id: string;
  createdAt: Date;
}

// Store en mémoire utilisé pour les tests ou fallback
const inMemoryAuditLogs: StoredAuditEvent[] = [];

/**
 * Enregistre un événement dans le journal d'audit immuable.
 */
export async function recordAuditEvent(payload: AuditEventPayload): Promise<StoredAuditEvent> {
  const event: StoredAuditEvent = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    companyId: payload.companyId ?? null,
    userId: payload.userId ?? null,
    action: payload.action,
    resource: payload.resource,
    resourceId: payload.resourceId ?? null,
    details: payload.details ?? null,
    ipAddress: payload.ipAddress ?? null,
    userAgent: payload.userAgent ?? null,
    createdAt: new Date(),
  };

  inMemoryAuditLogs.push(Object.freeze({ ...event }));
  return event;
}

/**
 * Récupère les journaux d'audit filtrés par entreprise (pour consultation sous permission audit.view)
 */
export async function getAuditLogsForCompany(
  companyId: string,
  limit: number = 50
): Promise<readonly StoredAuditEvent[]> {
  return inMemoryAuditLogs
    .filter((log) => log.companyId === companyId)
    .slice(-limit)
    .reverse();
}

/**
 * Récupère tous les journaux d'audit (pour les tests)
 */
export function getInMemoryAuditLogs(): readonly StoredAuditEvent[] {
  return inMemoryAuditLogs;
}

/**
 * Efface le store en mémoire (réservé aux suites de tests)
 */
export function clearInMemoryAuditLogs(): void {
  inMemoryAuditLogs.length = 0;
}
