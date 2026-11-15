import { eq } from 'drizzle-orm';
import { db, isPostgresConfigured } from './index.ts';
import { users } from './schema.ts';
import { memoryStore } from './memory-store.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
  role?: string
) {
  if (!isPostgresConfigured()) {
    return memoryStore.getOrCreateUser(uid, email, displayName, role);
  }
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName ?? null,
        role: role || 'STUDENT',
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(displayName ? { displayName } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to upsert Firebase user in PostgreSQL:', error);
    throw new Error('Database user sync failed. Please try again later.', { cause: error });
  }
}

export async function getUsers() {
  if (!isPostgresConfigured()) {
    return memoryStore.getUsers();
  }
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Database query failed in getUsers:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateUserRoleByUid(uid: string, role: string) {
  if (!isPostgresConfigured()) {
    return memoryStore.updateUserRoleByUid(uid, role);
  }
  try {
    const updated = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.uid, uid))
      .returning();
    return updated[0] ?? null;
  } catch (error) {
    console.error('Database update failed in updateUserRoleByUid:', error);
    throw new Error('Database update failed. Please try again later.', { cause: error });
  }
}
