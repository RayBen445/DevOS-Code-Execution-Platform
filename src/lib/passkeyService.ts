/**
 * Passkey Service (WebAuthn — future-ready)
 *
 * Credential records are stored in Firestore at:
 *   passkeys/{userId}/credentials/{credentialId}
 *
 * Full WebAuthn registration/authentication flows will be wired here
 * once Firebase adds first-class passkey support or a custom FIDO2
 * server is provisioned.
 */
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface PasskeyCredential {
  id?: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceName?: string;
  createdAt?: any;
}

/** Store a new passkey credential for a user. */
export async function savePasskeyCredential(userId: string, cred: Omit<PasskeyCredential, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "passkeys", userId, "credentials"), {
    ...cred,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** List all passkey credentials for a user. */
export async function listPasskeyCredentials(userId: string): Promise<PasskeyCredential[]> {
  const snap = await getDocs(collection(db, "passkeys", userId, "credentials"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PasskeyCredential));
}

/** Delete a passkey credential. */
export async function deletePasskeyCredential(userId: string, credentialDocId: string): Promise<void> {
  await deleteDoc(doc(db, "passkeys", userId, "credentials", credentialDocId));
}
