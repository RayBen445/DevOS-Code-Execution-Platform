import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  multiFactor,
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  MultiFactorError,
  type User,
  type MultiFactorResolver,
} from "firebase/auth";
export type { MultiFactorResolver };
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export const signInWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    if (
      error.code === "auth/cancelled-popup-request" ||
      error.code === "auth/popup-closed-by-user"
    ) {
      console.log("Sign-in popup closed or cancelled by user.");
      return;
    }
    console.error("Firebase Auth Error:", error);
    throw error;
  }
};

export const signInWithGithub = async () => {
  try {
    await signInWithPopup(auth, githubProvider);
  } catch (error: any) {
    if (
      error.code === "auth/cancelled-popup-request" ||
      error.code === "auth/popup-closed-by-user"
    ) {
      console.log("Sign-in popup closed or cancelled by user.");
      return;
    }
    console.error("Firebase Auth Error:", error);
    throw error;
  }
};

export const signUpWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const signInWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);

export const logout = () => signOut(auth);

// ── Email verification ────────────────────────────────────────────────────────
/** Send a verification email to the currently signed-in user. */
export const sendVerificationEmail = (user: User) =>
  firebaseSendEmailVerification(user, {
    url: `${window.location.origin}/projects`,
  });

// ── Password reset ────────────────────────────────────────────────────────────
/** Send a password-reset email. No auth required. */
export const sendPasswordReset = (email: string) =>
  firebaseSendPasswordResetEmail(auth, email, {
    url: `${window.location.origin}/`,
  });

// ── TOTP MFA helpers ──────────────────────────────────────────────────────────

/**
 * Start TOTP enrollment for the given user.
 * Returns a TotpSecret whose `generateQrCodeUrl()` gives an otpauth:// URI
 * that can be displayed as a QR code.
 */
export async function startTotpEnrollment(user: User) {
  const session = await multiFactor(user).getSession();
  return TotpMultiFactorGenerator.generateSecret(session);
}

/**
 * Finish TOTP enrollment: verify the OTP the user entered, then enroll.
 * @param displayName  Friendly name shown in the authenticator app (e.g. "DevOS")
 */
export async function finishTotpEnrollment(
  user: User,
  secret: ReturnType<typeof TotpMultiFactorGenerator.generateSecret> extends Promise<infer T> ? T : never,
  otp: string,
  displayName = "DevOS"
) {
  const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, otp);
  await multiFactor(user).enroll(assertion, displayName);
}

/** Unenroll (disable) all TOTP factors on the user's account. */
export async function disableTotp(user: User) {
  const enrolled = multiFactor(user).enrolledFactors;
  for (const factor of enrolled) {
    if (factor.factorId === TotpMultiFactorGenerator.FACTOR_ID) {
      await multiFactor(user).unenroll(factor);
    }
  }
}

/** Returns true if the user currently has TOTP MFA enrolled. */
export function isTotpEnabled(user: User): boolean {
  return multiFactor(user).enrolledFactors.some(
    (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID
  );
}

// ── MFA sign-in resolver ──────────────────────────────────────────────────────

/** Cast a Firebase auth error to a MultiFactorError resolver (or null). */
export function getMfaResolver(error: unknown): MultiFactorResolver | null {
  try {
    return getMultiFactorResolver(auth, error as MultiFactorError);
  } catch {
    return null;
  }
}

/**
 * Complete a sign-in that was interrupted by an MFA challenge.
 * @param resolver  The resolver obtained from `getMfaResolver`
 * @param otp       The 6-digit TOTP code the user entered
 */
export async function resolveTotpSignIn(resolver: MultiFactorResolver, otp: string) {
  const hint = resolver.hints.find(
    (h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID
  );
  if (!hint) throw new Error("No TOTP factor found on this account.");
  const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, otp);
  return resolver.resolveSignIn(assertion);
}

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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We do not throw the error here to prevent crashing the React app on async snapshot listeners.
  // The caller should handle the UI state (e.g. setting loading to false, showing "Not Found").
}

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
