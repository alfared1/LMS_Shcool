import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { DemoRole, LanguageCode } from '../types/lms';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
export { app as firebaseApp };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export async function syncFirebaseUserProfile(params: {
  uid: string;
  displayName: string;
  email: string;
}): Promise<void> {
  const safeUid = params.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  if (!safeUid) return;

  const safeName = (params.displayName || 'Pengguna CendekiaEdu').trim().slice(0, 120);
  const publicPath = `users/${safeUid}`;
  const privatePath = `users/${safeUid}/private/info`;

  try {
    const publicRef = doc(db, 'users', safeUid);
    const existingSnap = await getDoc(publicRef);
    if (!existingSnap.exists()) {
      await setDoc(publicRef, {
        uid: safeUid,
        displayName: safeName,
        role: 'STUDENT',
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        publicRef,
        {
          displayName: safeName,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }

  if (params.email) {
    const safeEmail = params.email.trim().slice(0, 160);
    try {
      await setDoc(doc(db, 'users', safeUid, 'private', 'info'), {
        uid: safeUid,
        email: safeEmail,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, privatePath);
    }
  }
}

export async function syncUserPreferencesToFirestore(params: {
  uid: string;
  language: LanguageCode;
  lastActiveRole: DemoRole;
  favoriteSubjects?: string[];
}): Promise<void> {
  const safeUid = params.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  if (!safeUid) return;

  const prefPath = `userPreferences/${safeUid}`;
  const cleanSubjects = (params.favoriteSubjects || [])
    .map((s) => s.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 10);

  try {
    await setDoc(
      doc(db, 'userPreferences', safeUid),
      {
        uid: safeUid,
        language: params.language,
        lastActiveRole: params.lastActiveRole,
        favoriteSubjects: cleanSubjects,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, prefPath);
  }
}
