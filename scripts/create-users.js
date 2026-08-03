import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyClq7IWwAgJPAsAkhfiX6vzjXQK-h3UfRM",
  authDomain: "simulador-3362613.firebaseapp.com",
  projectId: "simulador-3362613",
  storageBucket: "simulador-3362613.firebasestorage.app",
  messagingSenderId: "953861702629",
  appId: "1:953861702629:web:78342682aaf3c96b59a50c",
  measurementId: "G-RGMN2PKJ5M"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const users = [
  "maicolgamer2001@gmail.com",
  "marce.joha21@gmail.com",
  "brocherogreys30@gmail.com",
  "dianayazminchuquin@gmail.com",
  "aleja_bush@hotmail.com",
  "nicolreyes040@gmail.com",
  "Sergioandrest@gmail.com",
  "mauricemoore@outlook.com",
  "ramirezxa@gmail.com",
  "dwindavidm@gmail.com",
  "juliomezasena@gmail.com"
];

const DEFAULT_PASSWORD = process.env.STUDENT_DEFAULT_PASSWORD;
if (!DEFAULT_PASSWORD) {
  console.error("Falta STUDENT_DEFAULT_PASSWORD en el entorno. Ejemplo: STUDENT_DEFAULT_PASSWORD='...' node scripts/create-users.js");
  process.exit(1);
}

async function createUsers() {
  console.log("Iniciando creación de usuarios...");
  let successCount = 0;

  for (const email of users) {
    try {
      let uid = null;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, DEFAULT_PASSWORD);
        uid = userCredential.user.uid;
        console.log(`✅ Creado en Auth: ${email} (UID: ${uid})`);
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          console.log(`⚠️  Auth: El usuario ${email} ya existe. Reseteando...`);
          // Para saber el uid sin SDK Admin, no es fácil desde cliente si no se loguea.
          // Iniciaremos sesión para obtener el UID.
        } else {
          throw authError;
        }
      }

      // Si existe, nos logueamos temporalmente para obtener el UID
      if (!uid) {
        const creds = await signInWithEmailAndPassword(auth, email, DEFAULT_PASSWORD).catch(e => null);
        if (creds) {
          uid = creds.user.uid;
        } else {
          console.warn(`   - No se pudo obtener UID de ${email} (probablemente ya cambió clave).`);
        }
      }

      if (uid) {
        // 2. Create Firestore Document
        await setDoc(doc(db, "users", uid), {
          email: email,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          streakCount: 0,
          lastStreakDate: null,
          progress: {}
        });
        console.log(`   - Documento Firestore creado/actualizado.`);
      }

      // 3. Send Password Reset Email
      await sendPasswordResetEmail(auth, email);
      console.log(`   - Correo de reseteo enviado.`);

      await signOut(auth);
      successCount++;
    } catch (error) {
      console.error(`❌ Error con ${email}:`, error.message);
    }
  }

  console.log(`\nProceso finalizado. ${successCount}/${users.length} usuarios nuevos creados exitosamente.`);
  process.exit(0);
}

createUsers();
