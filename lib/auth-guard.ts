import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { families } from './schema';
import { sessionOptions, type SessionData } from './session';

export async function requireUserId(): Promise<string> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.userId) throw new Error('Unauthorized');
  return session.userId;
}

async function resolveMemberIds(familyId: string): Promise<string[]> {
  const [fam] = await db
    .select({ memberIds: families.memberIds })
    .from(families)
    .where(eq(families.id, familyId));
  if (!fam) return [];
  return JSON.parse(fam.memberIds) as string[];
}

export async function assertFamilyMember(familyId: string): Promise<void> {
  const userId = await requireUserId();
  const members = await resolveMemberIds(familyId);
  if (!members.includes(userId)) throw new Error('Unauthorized');
}

// Verifies that the session user owns a row. Self-scoped rows require userId
// match; family-scoped rows require family membership.
export async function assertOwnership(
  row: { userId: string; familyId?: string | null; scope: string },
): Promise<void> {
  const userId = await requireUserId();
  if (row.scope === 'self') {
    if (row.userId !== userId) throw new Error('Unauthorized');
    return;
  }
  if (row.familyId) {
    const members = await resolveMemberIds(row.familyId);
    if (!members.includes(userId)) throw new Error('Unauthorized');
    return;
  }
  throw new Error('Unauthorized');
}
