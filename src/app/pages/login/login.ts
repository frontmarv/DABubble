import { Component, afterNextRender, Output, signal, viewChild, ElementRef, EventEmitter, inject, Injector, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SignupComponent } from '../signup/signup';
import { Intro } from '../../components/intro/intro';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SignupComponent, Intro],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private changeDetectorRef = inject(ChangeDetectorRef);
  private chatService = inject(ChatService);
  private firebaseService = inject(FirebaseService);
  @Output() close = new EventEmitter<void>();
  private injector = inject(Injector);
  showSuccessMessage = signal(false);
  showSignup = signal(false);
  errorMessage: string = '';
  emailErrorMsg: string = '';
  passwordErrorMsg: string = '';
  isLoading: boolean = false;
  showIntro: boolean = true;
  scrollAnchor = viewChild<ElementRef>('scrollAnchor');
  loginEmail: string = '';
  loginPassword: string = '';

  /**
   * Checks session storage on initialization to determine if the intro animation
   * has already been played in the current session.
   */
  ngOnInit(): void {
    this.showIntro = sessionStorage.getItem('loginIntroPlayed') !== 'true';
  }

  /**
   * Prüft, ob die Login-Eingaben vorhanden sind.
   * @returns {boolean} True, wenn E-Mail und Passwort Text enthalten.
   */
  isLoginValid(): boolean {
    return this.loginEmail.trim().length > 0 && this.loginPassword.trim().length > 0;
  }

  /**
   * Sets the intro flag in session storage and hides the intro component 
   * once the animation finishes.
   */
  onIntroFinished(): void {
    sessionStorage.setItem('loginIntroPlayed', 'true');
    this.showIntro = false;
  }

  /**
   * Orchestrates the standard email and password login flow.
   * Validates inputs before calling the authentication service.
   * @returns {Promise<void>}
   */
  async login(): Promise<void> {
    if (!this.validateInputs()) return;
    const authRequest = this.authService.login(this.loginEmail, this.loginPassword);
    await this.executeAuthRequest(authRequest, 'Login failed.');
  }

  /**
   * Performs a login using predefined guest credentials.
   * @returns {Promise<void>}
   */
  async guestLogin(): Promise<void> {
    const authRequest = this.authService.login("gast@dabubble.com", "gast1234");
    await this.executeAuthRequest(authRequest, 'Guest login failed.');
  }

  /**
   * Handles the Google OAuth login process.
   * Includes a "safety net" listener for the window focus event to handle 
   * cases where the user closes the Google popup manually.
   * @returns {Promise<void>}
   */
  async googleLogin(): Promise<void> {
    this.resetErrorAndSetLoading();

    const handleFocus = () => {
      setTimeout(() => {
        if (this.isLoading) {
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        }
      }, 500);
      window.removeEventListener('focus', handleFocus);
    };
    window.addEventListener('focus', handleFocus);

    const result = await this.authService.googleLogin();

    window.removeEventListener('focus', handleFocus);
    this.handleAuthResult(result, 'Google login failed.');
  }

  // --- AUTHENTICATION HELPER ---

  /**
   * Validates that both email and password fields are populated.
   * NEU: Zeigt Fehler jetzt spezifisch an den betroffenen Feldern an.
   * @returns {boolean} True if inputs are valid.
   */
  private validateInputs(): boolean {
    this.emailErrorMsg = '';
    this.passwordErrorMsg = '';
    this.errorMessage = '';
    let isValid = true;
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!this.loginEmail || this.loginEmail.trim() === '') {
      this.emailErrorMsg = 'Bitte E-Mail eingeben.';
      isValid = false;
    } else if (!emailRegex.test(this.loginEmail)) {
      this.emailErrorMsg = 'Bitte gültige E-Mail-Adresse eingeben';
      isValid = false;
    }
    if (!this.loginPassword || this.loginPassword.trim() === '') {
      this.passwordErrorMsg = 'Bitte Passwort eingeben';
      isValid = false;
    } else if (this.loginPassword.length < 6) {
      this.passwordErrorMsg = 'Passwort muss min. 6 Zeichen enthalten';
      isValid = false;
    }

    return isValid;
  }

  /**
   * Executes an authentication promise and handles the UI state during the request.
   * @param {Promise<any>} authPromise - The promise from the auth service.
   * @param {string} defaultError - Fallback error message.
   * @returns {Promise<void>}
   */
  private async executeAuthRequest(authPromise: Promise<any>, defaultError: string): Promise<void> {
    this.resetErrorAndSetLoading();
    const result = await authPromise;
    this.handleAuthResult(result, defaultError);
  }

  /**
   * Clears existing error messages and sets the loading state to true.
   */
  private resetErrorAndSetLoading(): void {
    this.errorMessage = '';
    this.emailErrorMsg = '';
    this.passwordErrorMsg = '';
    this.isLoading = true;
  }

  /**
   * Processes the result of an authentication attempt.
   * Redirects on success or displays an error message on failure.
   * @param {any} result - The result object from the auth service.
   * @param {string} defaultError - Fallback error message.
   */
  private handleAuthResult(result: any, defaultError: string): void {
    this.isLoading = false;

    if (result.success) {
      this.firebaseService.setSelectedChannel('');
      this.chatService.activeConversation.set(null);
      this.router.navigate(['/main']);
    } else if (result.canceled) {
      this.errorMessage = '';
      this.changeDetectorRef.markForCheck();
    } else {
      this.errorMessage = result.error || defaultError;
      this.changeDetectorRef.markForCheck();
    }
  }

  /**
   * Toggles the visibility of the signup component and clears errors.
   */
  toggleSignup(): void {
    this.showSignup.update(value => !value);
    this.errorMessage = '';
    this.emailErrorMsg = '';
    this.passwordErrorMsg = '';
  }

  /**
   * Displays a success message upon successful signup and triggers the 
   * completion of the signup flow after a delay.
   */
  onSignupSuccess(): void {
    this.showSuccessMessage.set(true);
    setTimeout(() => {
      this.showSuccessMessage.set(false);
      this.showSignup.set(false);
      afterNextRender(() => {
        const element = this.scrollAnchor()?.nativeElement;
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, { injector: this.injector });
    }, 2500);
  }

}