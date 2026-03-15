import { Injectable, inject } from '@angular/core';
import { 
  Auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { FirebaseService } from './firebase.service';
import { User } from '../models/user.class';
import { sendPasswordResetEmail, confirmPasswordReset } from 'firebase/auth';

/**
 * Service responsible for handling all authentication-related tasks,
 * including email/password login, Google OAuth, and session state management.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  private firebaseService = inject(FirebaseService);

  /** Holds the current Firebase User object or null if not authenticated. */
  currentFirebaseUser: FirebaseUser | null = null;
  /** Reflects the current authentication status. */
  isAuthenticated = false;

  /**
   * Initializes the authentication state listener upon service creation.
   */
  constructor() {
    this.initAuthStateListener();
  }

  /**
   * Sets up a listener that triggers whenever the Firebase authentication state changes.
   * Syncs local state and subscribes to user data in Firestore if a user is logged in.
   */
  private initAuthStateListener(): void {
    onAuthStateChanged(this.auth, (user) => {
      this.currentFirebaseUser = user;
      this.isAuthenticated = !!user;
      if (user) {
        this.firebaseService.subUser(user.uid);
      }
    });
  }

  /**
   * Registers a new user with email and password, creates a corresponding 
   * Firestore document, and adds the user to the default welcome channel.
   * * @param email - User's email address.
   * @param pass - User's chosen password.
   * @param firstName - User's first name.
   * @param lastName - User's last name.
   * @param avatar - Path to the selected avatar image.
   * @param status - Initial online status.
   * @returns {Promise<{success: boolean, error?: string}>} Result of the signup attempt.
   */
  async signup(email: string, pass: string, firstName: string, lastName: string, avatar: string, status: string) {
    try {
      const { user } = await createUserWithEmailAndPassword(this.auth, email, pass);
      const cleanAvatar = avatar?.trim() || 'unkown-user.svg';
      const newUser = new User({ uid: user.uid, firstName, lastName, email, avatar: cleanAvatar, status });
      
      await this.firebaseService.addUser(newUser, user.uid);
      await this.addTargetUserToWelcomeChannel(user.uid);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Logs in a user with email and password and updates their status to 'online'.
   * * @param email - Registered email address.
   * @param pass - Corresponding password.
   * @returns {Promise<{success: boolean, error?: string}>} Result of the login attempt.
   */
  async login(email: string, pass: string) {
    try {
      const { user } = await signInWithEmailAndPassword(this.auth, email, pass);
      await this.firebaseService.updateSingleUser(user.uid, { status: 'online' });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Sets the user status to 'offline', signs out from Firebase, 
   * and navigates back to the login page.
   */
  async logout(): Promise<void> {
    try {
      await this.setOfflineStatus();
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Helper method to update the user's status to 'offline' in Firestore.
   */
  private async setOfflineStatus(): Promise<void> {
    const uid = this.currentFirebaseUser?.uid;
    if (uid) {
      await this.firebaseService.updateSingleUser(uid, { status: 'offline' });
    }
  }

  /**
   * Automatically adds a newly registered user to the 'Willkommen' or 'Allgemein' channel.
   * @param uid - The unique ID of the user.
   */
  private async addTargetUserToWelcomeChannel(uid: string): Promise<void> {
    const channels = this.firebaseService.channels();
    const welcomeChannel = channels.find(c => 
      c.name.toLowerCase() === 'willkommen' || c.name.toLowerCase() === 'allgemein'
    );
    if (welcomeChannel) {
      await this.firebaseService.addMemberToChannel(welcomeChannel.id, uid);
    }
  }

  /**
   * Initiates Google OAuth login via a popup. Handles new user creation 
   * if the Google account is not yet in the database.
   * * @returns {Promise<{success: boolean, canceled?: boolean, error?: string}>}
   */
  async googleLogin() {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const { user } = await signInWithPopup(this.auth, provider);
      await this.handleGoogleUserInDatabase(user);

      return { success: true };
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return { success: false, canceled: true };
      }
      return { success: false, error: 'Google-Login fehlgeschlagen.' };
    }
  }

  /**
   * Checks if a Google user exists in Firestore; creates a new entry if not.
   * @param firebaseUser - The user object returned by Firebase Google Auth.
   */
  private async handleGoogleUserInDatabase(firebaseUser: FirebaseUser): Promise<void> {
    const userExists = await this.firebaseService.checkUserExists(firebaseUser.uid);
    if (!userExists) {
      await this.createNewGoogleUser(firebaseUser);
    } else {
      await this.firebaseService.updateSingleUser(firebaseUser.uid, { status: 'online' });
    }
  }

  /**
   * Extracts name and photo from Google profile to create a new local user document.
   * @param fbUser - Firebase User object.
   */
  private async createNewGoogleUser(fbUser: FirebaseUser): Promise<void> {
    const { firstName, lastName } = this.extractGoogleNames(fbUser.displayName);
    const photo = fbUser.photoURL || fbUser.providerData?.[0]?.photoURL || 'unkown-user.svg';
    const newGoogleUser = new User({ 
      uid: fbUser.uid, firstName, lastName, email: fbUser.email || '', 
      avatar: photo, status: 'online' 
    });
    
    await this.firebaseService.addUser(newGoogleUser, fbUser.uid);
    await this.addTargetUserToWelcomeChannel(fbUser.uid);
  }

  /**
   * Splits a Google Display Name into first and last name components.
   * @param displayName - Raw name string from Google.
   */
  private extractGoogleNames(displayName: string | null): { firstName: string; lastName: string } {
    const nameParts = (displayName || 'Google User').trim().split(/\s+/);
    return { 
      firstName: nameParts[0] || 'Google', 
      lastName: nameParts.slice(1).join(' ') || '' 
    };
  }

  /**
   * Sends a password reset email to the specified address.
   * @param email - Target email address.
   */
  sendResetEmail(email: string) {
    return sendPasswordResetEmail(this.auth, email, { 
      url: 'http://localhost:4200/new-pw', 
      handleCodeInApp: true 
    });
  }

  /**
   * Confirms the password reset using the code received via email.
   * @param code - Reset code.
   * @param newPassword - The new password chosen by the user.
   */
  confirmReset(code: string, newPassword: string) {
    return confirmPasswordReset(this.auth, code, newPassword);
  }

  /** Checks if a user is currently logged in. */
  isLoggedIn() { return this.isAuthenticated; }
  /** Returns the current UID or null. */
  getCurrentUserId() { return this.currentFirebaseUser?.uid || null; }

  /**
   * Maps Firebase error codes to user-friendly German error messages.
   * @param errorCode - The code returned by Firebase Auth.
   */
  private getErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'auth/email-already-in-use': 'Diese E-Mail-Adresse wird bereits verwendet.',
      'auth/invalid-email': 'Ungültige E-Mail-Adresse.',
      'auth/weak-password': 'Passwort zu schwach.',
      'auth/user-not-found': 'Benutzer nicht gefunden.',
      'auth/wrong-password': 'Falsches Passwort.',
      'auth/invalid-credential': 'Ungültige Anmeldedaten.',
    };
    return errorMessages[errorCode] || 'Ein unbekannter Fehler ist aufgetreten.';
  }
}