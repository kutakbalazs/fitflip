import { isNativePlatform } from "./native";

// Biometric (Face ID / Touch ID) re-login for the native app. After a normal
// email + password sign-in we stash the credentials in the device Keychain
// (secure storage); on the login screen the user can then unlock with Face ID
// instead of typing them again. Only for email/password accounts — OAuth
// (Google/Apple) has no password to store and re-auths through its own sheet.

const CRED_KEY = "ff-bio-cred";

type Creds = { email: string; password: string };

export async function biometricAvailable(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    const result = await BiometricAuth.checkBiometry();
    return result.isAvailable;
  } catch {
    return false;
  }
}

export async function saveBiometricCredentials(email: string, password: string): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { SecureStorage } = await import("@aparajita/capacitor-secure-storage");
    await SecureStorage.set(CRED_KEY, { email, password });
  } catch {
    // Non-fatal — biometric login simply won't be offered.
  }
}

export async function hasBiometricCredentials(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { SecureStorage } = await import("@aparajita/capacitor-secure-storage");
    const v = await SecureStorage.get(CRED_KEY);
    return !!v && typeof v === "object" && "email" in v && "password" in v;
  } catch {
    return false;
  }
}

export async function clearBiometricCredentials(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { SecureStorage } = await import("@aparajita/capacitor-secure-storage");
    await SecureStorage.remove(CRED_KEY);
  } catch {
    // ignore
  }
}

// Prompts Face ID / Touch ID; on success returns the stored credentials, else
// null (cancelled / failed / none stored).
export async function biometricLogin(reason: string): Promise<Creds | null> {
  if (!isNativePlatform()) return null;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    await BiometricAuth.authenticate({ reason });
    const { SecureStorage } = await import("@aparajita/capacitor-secure-storage");
    const v = await SecureStorage.get(CRED_KEY);
    if (v && typeof v === "object" && "email" in v && "password" in v) {
      const creds = v as Creds;
      if (creds.email && creds.password) return creds;
    }
    return null;
  } catch {
    return null;
  }
}
