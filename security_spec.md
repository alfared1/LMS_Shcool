# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. Every document in `/users/{userId}` must have `uid == userId == request.auth.uid`, valid bounded string fields, and cannot self-escalate `role` beyond `'STUDENT'` on creation.
2. PII (`email`) is strictly isolated in `/users/{userId}/private/{docId}` and readable/writable only by the owning user or a verified admin.
3. `/admins/{userId}` is read-only for the owner/admin and never writable from client SDKs.
4. `/userPreferences/{userId}` is owned strictly by `userId == request.auth.uid`, enforces `favoriteSubjects.size() <= 10`, and uses server `request.time` for `updatedAt`.
5. `/studyBookmarks/{bookmarkId}` enforces `userId == request.auth.uid` on creation, `resource.data.userId == request.auth.uid` on `get`/`list`/`delete`, and disallows mutation (`update: false`).

## 2. The "Dirty Dozen" Attack Payloads (All Must Return `PERMISSION_DENIED`)
1. **Privilege Escalation on Create (`/users/{uid}`)**: `{ "uid": "u1", "displayName": "Attacker", "role": "SCHOOL_ADMIN", "updatedAt": "<server>" }` -> Blocked (`role == 'STUDENT'`).
2. **Self-Role Update (`/users/{uid}`)**: `{ "role": "SCHOOL_ADMIN", "updatedAt": "<server>" }` -> Blocked (`affectedKeys().hasOnly(['displayName', 'updatedAt'])`).
3. **Ghost Field Shadow Write (`/users/{uid}`)**: `{ "uid": "u1", "displayName": "User", "role": "STUDENT", "isVerified": true, "updatedAt": "<server>" }` -> Blocked (`keys().hasOnly(...)`).
4. **PII Cross-User Read (`/users/victim/private/info`)**: `get()` by `attacker` -> Blocked (`isOwner(userId) || isAdmin()`).
5. **Unverified Email Spoof**: Write with `request.auth.token.email == 'alfathblv@gmail.com'` and `email_verified == false` -> Blocked (`isEmailVerified()`).
6. **Client-Forged Timestamp (`/userPreferences/{uid}`)**: `{ "updatedAt": "2020-01-01T00:00:00Z" }` -> Blocked (`incoming().updatedAt == request.time`).
7. **Unbounded Array Resource Exhaustion (`/userPreferences/{uid}`)**: `favoriteSubjects` with 15 items -> Blocked (`size() <= 10`).
8. **Invalid Array Element Type (`/userPreferences/{uid}`)**: `favoriteSubjects: [12345]` -> Blocked (`favoriteSubjects[0] is string`).
9. **ID Poisoning (`/studyBookmarks/AAAA...200chars`)**: Document ID > 128 chars or containing `$` -> Blocked (`isValidId(bookmarkId)`).
10. **Identity Spoofing (`/studyBookmarks/bm1`)**: `{ "userId": "victim_uid", ... }` -> Blocked (`incoming().userId == request.auth.uid`).
11. **Blanket List Query Scraping (`/studyBookmarks`)**: `list` query without `where('userId', '==', auth.uid)` -> Blocked (`resource.data.userId == request.auth.uid`).
12. **Admin Self-Grant (`/admins/attacker`)**: `setDoc` on `/admins/attacker` -> Blocked (`allow write: if false`).
