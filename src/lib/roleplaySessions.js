import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function saveRoleplaySession(uid, { scenarioId, technicalScore, serviceScore, transcript }) {
  try {
    await addDoc(collection(db, 'users', uid, 'roleplaySessions'), {
      scenarioId,
      technicalScore,
      serviceScore,
      transcript,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error guardando sesión de roleplay:', error);
  }
}
