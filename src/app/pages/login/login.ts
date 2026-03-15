import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
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

  showSignup: boolean = false;
  showSuccessMessage: boolean = false;
  errorMessage: string = '';
  isLoading: boolean = false;
  showIntro: boolean = true;

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
   * Sets the intro flag in session storage and hides the intro component 
   * once the animation finishes.
   */
  onIntroFinished(): void {
    sessionStorage.setItem('loginIntroPlayed', 'true');
    this.showIntro = false;
  }

  // --- LOGIN METHODS ---

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
   * @returns {boolean} True if inputs are valid.
   */
  private validateInputs(): boolean {
    this.errorMessage = '';
    if (!this.loginEmail || !this.loginPassword) {
      this.errorMessage = 'Please enter email and password.';
      return false;
    }
    return true;
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

  // --- SIGNUP LOGIC ---

  /**
   * Toggles the visibility of the signup component and clears errors.
   */
  toggleSignup(): void { 
    this.showSignup = !this.showSignup; 
    this.errorMessage = ''; 
  }

  /**
   * Displays a success message upon successful signup and triggers the 
   * completion of the signup flow after a delay.
   */
  onSignupSuccess(): void { 
    this.showSuccessMessage = true; 
    setTimeout(() => this.completeSignupFlow(), 2500); 
  }

  /**
   * Finalizes the signup process by navigating to the main view and 
   * resetting the signup state.
   */
  private completeSignupFlow(): void {
    this.showSuccessMessage = false;
    this.router.navigate(['/main']).then(() => { 
      this.showSignup = false; 
    });
  }
}