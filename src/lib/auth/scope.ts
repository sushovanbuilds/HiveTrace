import type { UserRole } from "@/lib/auth/roles";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Who may read across organisation boundaries.
 *
 * One definition, because the alternative is what this codebase had: the same
 * `["ADMIN", "INVESTIGATOR", "LAB"].includes(role)` literal inlined in eight
 * handlers, where adding a role means finding all eight and a missed one is a
 * silent cross-tenant leak.
 *
 * The three are here for distinct reasons:
 *   - ADMIN        — regulator role in this deployment (FSSAI enforcement).
 *   - INVESTIGATOR — an adulteration pattern spans suppliers by definition; an
 *                    investigation scoped to one organisation cannot see it.
 *   - LAB          — a lab tests other organisations' batches, so its own
 *                    organisationId is never the batch's owner.
 *
 * Producer roles (BEEKEEPER, COLLECTOR, PROCESSOR, DISTRIBUTOR) and CONSUMER
 * are deliberately absent.
 */
export const CROSS_TENANT_ROLES: readonly UserRole[] = ["ADMIN", "INVESTIGATOR", "LAB"];

export function seesAllOrganisations(role: UserRole): boolean {
  return CROSS_TENANT_ROLES.includes(role);
}

/**
 * A `where` fragment restricting a query to what this user may read.
 *
 * Spread into a Prisma `where`. Empty for cross-tenant roles, which is the whole
 * point — the caller does not branch.
 */
export function ownScope(user: SessionUser): { organisationId?: string } {
  return seesAllOrganisations(user.role) ? {} : { organisationId: user.organisationId };
}

/**
 * The same restriction for a model that reaches its owner through a relation,
 * e.g. Hive → Farm or QualityTest → Batch.
 */
export function ownScopeVia<K extends string>(
  user: SessionUser,
  relation: K,
): Record<K, { organisationId: string }> | Record<string, never> {
  if (seesAllOrganisations(user.role)) return {};
  return { [relation]: { organisationId: user.organisationId } } as Record<
    K,
    { organisationId: string }
  >;
}

/**
 * Whether this user may read a specific record they have already loaded.
 *
 * Callers answer a failed check with 404, not 403: for a batch code, confirming
 * that a record exists but belongs to someone else is itself the disclosure.
 */
export function canRead(user: SessionUser, record: { organisationId: string }): boolean {
  return seesAllOrganisations(user.role) || record.organisationId === user.organisationId;
}
