import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { FirebaseService } from './firebase.service';
import { User } from '../models/user.class';
import { sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  private firebaseService = inject(FirebaseService);

  currentFirebaseUser: FirebaseUser | null = null;
  isAuthenticated = false;

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentFirebaseUser = user;
      this.isAuthenticated = !!user;

      if (user) {
        this.firebaseService.subUser(user.uid);
      }
    });
  }

  async signup(email: string, password: string, firstName: string, lastName: string, avatar: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const uid = userCredential.user.uid;
      const cleanAvatar = avatar && avatar.trim() ? avatar.trim() : 'unkown-user.svg';

      const newUser = new User({
        uid,
        firstName,
        lastName,
        email,
        avatar: cleanAvatar
      });

      await this.firebaseService.addUser(newUser, uid);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  async login(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      return { success: true };
    } catch (error: any) {
      console.error('Login-Fehler:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  async guestLogin() {
    try {
      const userCredential = await signInAnonymously(this.auth);
      const uid = userCredential.user.uid;
      const guestUser = new User({
        uid,
        firstName: 'Gast',
        lastName: '',
        email: '',
        avatar: '/shared/profile-pics/unkown-user.svg'
      });

      await this.firebaseService.addUser(guestUser, uid);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Gast-Login fehlgeschlagen. Bitte versuche es erneut.' };
    }
  }

  async googleLogin() {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const userCredential = await signInWithPopup(this.auth, provider);
      const user = userCredential.user;
      const uid = user.uid;

      const nameParts = (user.displayName || 'Google User').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Google';
      const lastName = nameParts.slice(1).join(' ') || '';

      const photo =
        user.photoURL ||
        user.providerData?.[0]?.photoURL ||
        'unkown-user.svg';

      const googleUser = new User({
        uid,
        firstName,
        lastName,
        email: user.email || '',
        avatar: photo
      });

      await this.firebaseService.addUser(googleUser, uid); //überschreibt jedesmal die Daten in "users"
      return { success: true };
    } catch (error: any) {

      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return { success: false, error: '' };
      }

      return { success: false, error: 'Google-Login fehlgeschlagen. Bitte versuche es erneut.' };
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
    }
  }

  private getErrorMessage(errorCode: string): string {
    const errorMessages: { [key: string]: string } = {
      'auth/email-already-in-use': 'Diese E-Mail-Adresse wird bereits verwendet.',
      'auth/invalid-email': 'Ungültige E-Mail-Adresse.',
      'auth/operation-not-allowed': 'Diese Anmelde-Methode ist nicht aktiviert.',
      'auth/weak-password': 'Das Passwort ist zu schwach. Mindestens 6 Zeichen erforderlich.',
      'auth/user-disabled': 'Dieses Konto wurde deaktiviert.',
      'auth/user-not-found': 'Kein Benutzer mit dieser E-Mail-Adresse gefunden.',
      'auth/wrong-password': 'Falsches Passwort.',
      'auth/invalid-credential': 'Ungültige Anmeldedaten. Bitte überprüfe E-Mail und Passwort.',
      'auth/too-many-requests': 'Zu viele Anmeldeversuche. Bitte versuche es später erneut.',
      'auth/network-request-failed': 'Netzwerkfehler. Bitte überprüfe deine Internetverbindung.'
    };

    return errorMessages[errorCode] || 'Ein unbekannter Fehler ist aufgetreten.';
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  getCurrentUserId(): string | null {
    return this.currentFirebaseUser?.uid || null;
  }


  sendResetEmail(email: string) {
    const actionCodeSettings = {
      url: 'http://localhost:4200/new-pw', // route zu passwort reset
      handleCodeInApp: true,
    };
    return sendPasswordResetEmail(this.auth, email, actionCodeSettings);
  }

  confirmReset(code: string, newPassword: string) {
    return confirmPasswordReset(this.auth, code, newPassword);
  }





}
