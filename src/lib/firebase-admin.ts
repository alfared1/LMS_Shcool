import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

if (!getApps().length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || firebaseConfig.projectId;

  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson) as ServiceAccount;
      initializeApp({
        credential: cert(parsed),
        projectId: parsed.projectId || projectId,
      });
    } catch (error) {
      console.warn('Invalid FIREBASE_SERVICE_ACCOUNT_JSON, falling back to projectId:', error);
      initializeApp({ projectId });
    }
  } else {
    initializeApp({ projectId });
  }
}

export const adminAuth = getAuth();
