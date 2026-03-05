import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser, } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { FirebaseService } from './firebase.service';
import { User } from '../models/user.class';
import { sendPasswordResetEmail, confirmPasswordReset } from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // --- INJECTIONS ---
  private auth = inject(Auth);
  private router = inject(Router);
  private firebaseService = inject(FirebaseService);

  // --- STATE ---
  currentFirebaseUser: FirebaseUser | null = null;
  isAuthenticated = false;

  constructor() {
    this.initAuthStateListener();
  }

  private initAuthStateListener() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentFirebaseUser = user;
      this.isAuthenticated = !!user;
      if (user) {
        this.firebaseService.subUser(user.uid);
      }
    });
  }

  // --- CORE AUTH METHODS ---

  async signup(
    email: string,
    pass: string,
    firstName: string,
    lastName: string,
    avatar: string,
    status: string
  ) {
    try {
      const { user } = await createUserWithEmailAndPassword(this.auth, email, pass);
      const cleanAvatar = avatar?.trim() || 'unkown-user.svg';

      const newUser = new User({
        uid: user.uid,
        firstName,
        lastName,
        email,
        avatar: cleanAvatar,
        status,
      });

      await this.firebaseService.addUser(newUser, user.uid);

      await this.addTargetUserToWelcomeChannel(user.uid);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  async login(email: string, pass: string) {
    try {
      const { user } = await signInWithEmailAndPassword(this.auth, email, pass);
      await this.firebaseService.updateSingleUser(user.uid, { status: 'online' });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  async logout(): Promise<void> {
    try {
      await this.setOfflineStatus();
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
      this.router.navigate(['/login']);
    }
  }

  private async setOfflineStatus() {
    const uid = this.currentFirebaseUser?.uid;
    if (uid) {
      await this.firebaseService.updateSingleUser(uid, { status: 'offline' });
    }
  }

  // auth.service.ts
  private async addTargetUserToWelcomeChannel(uid: string) {
    // Wir suchen den Channel, der "willkommen" heißt (oder "Allgemein" als Fallback)
    const channels = this.firebaseService.channels();
    const welcomeChannel = channels.find(
      (c) => c.name.toLowerCase() === 'willkommen' || c.name.toLowerCase() === 'allgemein'
    );

    if (welcomeChannel) {
      await this.firebaseService.addMemberToChannel(welcomeChannel.id, uid);
    }
  }

  // --- GOOGLE LOGIN (REFACTORED) ---

  async googleLogin() {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const { user } = await signInWithPopup(this.auth, provider);
      await this.handleGoogleUserInDatabase(user);

      return { success: true };
    } catch (error: any) {
      return this.handleGoogleError(error);
    }
  }

  private async handleGoogleUserInDatabase(firebaseUser: FirebaseUser) {
    const userExists = await this.firebaseService.checkUserExists(firebaseUser.uid);

    if (!userExists) {
      await this.createNewGoogleUser(firebaseUser);
    } else {
      await this.firebaseService.updateSingleUser(firebaseUser.uid, { status: 'online' });
    }
  }

  private async createNewGoogleUser(fbUser: FirebaseUser) {
    const { firstName, lastName } = this.extractGoogleNames(fbUser.displayName);
    const photo = fbUser.photoURL || fbUser.providerData?.[0]?.photoURL || 'unkown-user.svg';

    const newGoogleUser = new User({
      uid: fbUser.uid,
      firstName,
      lastName,
      email: fbUser.email || '',
      avatar: photo,
      status: 'online',
    });

    await this.firebaseService.addUser(newGoogleUser, fbUser.uid);
    await this.addTargetUserToWelcomeChannel(fbUser.uid);
  }

  private extractGoogleNames(displayName: string | null): { firstName: string; lastName: string } {
    const nameParts = (displayName || 'Google User').trim().split(/\s+/);
    return {
      firstName: nameParts[0] || 'Google',
      lastName: nameParts.slice(1).join(' ') || '',
    };
  }

  private handleGoogleError(error: any) {
    if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(error.code)) {
      return { success: false, error: '' };
    }
    return { success: false, error: 'Google-Login fehlgeschlagen. Bitte versuche es erneut.' };
  }

  // --- PASSWORD MANAGEMENT ---

  sendResetEmail(email: string) {
    const actionCodeSettings = {
      url: 'http://localhost:4200/new-pw',
      handleCodeInApp: true,
    };
    return sendPasswordResetEmail(this.auth, email, actionCodeSettings);
  }

  confirmReset(code: string, newPassword: string) {
    return confirmPasswordReset(this.auth, code, newPassword);
  }

  // --- UTILS & ERROR HANDLING ---

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  getCurrentUserId(): string | null {
    return this.currentFirebaseUser?.uid || null;
  }

  private getErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'auth/email-already-in-use': 'Diese E-Mail-Adresse wird bereits verwendet.',
      'auth/invalid-email': 'Ungültige E-Mail-Adresse.',
      'auth/operation-not-allowed': 'Diese Anmelde-Methode ist nicht aktiviert.',
      'auth/weak-password': 'Das Passwort ist zu schwach. Mindestens 6 Zeichen erforderlich.',
      'auth/user-disabled': 'Dieses Konto wurde deaktiviert.',
      'auth/user-not-found': 'Kein Benutzer mit dieser E-Mail-Adresse gefunden.',
      'auth/wrong-password': 'Falsches Passwort.',
      'auth/invalid-credential': 'Ungültige Anmeldedaten. Bitte überprüfe E-Mail und Passwort.',
      'auth/too-many-requests': 'Zu viele Anmeldeversuche. Bitte versuche es später.',
      'auth/network-request-failed': 'Netzwerkfehler. Bitte überprüfe deine Internetverbindung.',
    };

    return errorMessages[errorCode] || 'Ein unbekannter Fehler ist aufgetreten.';
  }
}
