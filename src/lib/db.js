import { db } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export const getUserData = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      console.warn("Usuario no encontrado en la base de datos.");
      return null;
    }
  } catch (error) {
    console.error("Error obteniendo datos del usuario:", error);
    throw error;
  }
};

export const updateLastLogin = async (uid) => {
  try {
    await updateDoc(doc(db, "users", uid), {
      lastLogin: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error actualizando último login:", error);
  }
};

export const updateStreak = async (uid, currentStreakCount, lastStreakDate) => {
  // Lógica de ejemplo para actualizar racha
  const today = new Date().toISOString().split('T')[0];
  
  if (lastStreakDate === today) {
    // Ya practicó hoy, la racha se mantiene igual
    return currentStreakCount;
  }

  // Si fue ayer, suma 1. Si no, reinicia a 1.
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak = 1;
  if (lastStreakDate === yesterdayStr) {
    newStreak = currentStreakCount + 1;
  }

  try {
    await updateDoc(doc(db, "users", uid), {
      streakCount: newStreak,
      lastStreakDate: today
    });
    return newStreak;
  } catch (error) {
    console.error("Error actualizando racha:", error);
    return currentStreakCount;
  }
};
