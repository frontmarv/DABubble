import { Component, ElementRef, ViewChild, EventEmitter, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrls: ['../login/login.scss', './signup.scss']
})
export class SignupComponent {
  private authService = inject(AuthService);
  private changeDetectorRef = inject(ChangeDetectorRef);

  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();
  @ViewChild('errormsg') errormsg!: ElementRef;

  signupStep: number = 1;
  isLoading: boolean = false;

  // --- NEU: Aufgeteilte Fehlermeldungen ---
  errorMessage: string = '';       // Für globale/Firebase Fehler (z.B. E-Mail schon vergeben)
  nameErrorMsg: string = '';
  emailErrorMsg: string = '';
  passwordErrorMsg: string = '';
  // ----------------------------------------

  fullName: string = '';
  email: string = '';
  password: string = '';
  isPrivacyPolicyAccepted = false;
  selectedAvatar: string = '/shared/profile-pics/unkown-user.svg';

  isNameValid: boolean = false;
  isEmailValid: boolean = false;
  isPasswordValid: boolean = false;

  readonly avatars = [
    '/shared/profile-pics/unkown-user.svg',
    '/shared/profile-pics/profile-pic1.svg',
    '/shared/profile-pics/profile-pic2.svg',
    '/shared/profile-pics/profile-pic3.svg',
    '/shared/profile-pics/profile-pic4.svg',
    '/shared/profile-pics/profile-pic5.svg',
    '/shared/profile-pics/profile-pic6.svg'
  ];

  // --- VALIDATION LOGIC ---

  /**
   * Validates the full name input field.
   * Checks for presence and character limit (30) and sets specific error messages.
   */
  validateName(): void {
    const name = this.fullName.trim();
    if (!name) {
      this.isNameValid = false;
      this.nameErrorMsg = 'Bitte Name eingeben';
      return;
    }
    if (name.length > 30) {
      this.isNameValid = false;
      this.nameErrorMsg = 'Name darf max. 30 Zeichen enthalten';
      return;
    }
    this.isNameValid = true;
    this.nameErrorMsg = '';
  }

  /**
   * Validates the email input field.
   * Checks format via regex, character limit (50) and sets specific error messages.
   */
  validateEmail(): void {
    const mail = this.email.trim();
    if (!mail || !this.isValidEmailFormat(mail)) {
      this.isEmailValid = false;
      this.emailErrorMsg = 'Bitte gültige E-Mail-Adresse eingeben';
      return;
    }
    if (mail.length > 50) {
      this.isEmailValid = false;
      this.emailErrorMsg = 'E-mail-Adresse darf max. 50 Zeichen enthalten';
      return;
    }
    this.isEmailValid = true;
    this.emailErrorMsg = '';
  }

  /**
   * Validates the password input field.
   * Checks for minimum length of 6 characters and sets specific error messages.
   */
  validatePassword(): void {
    if (!this.password || this.password.length < 6) {
      this.isPasswordValid = false;
      this.passwordErrorMsg = 'Passwort muss min. 6 Zeichen enthalten';
      return;
    }
    this.isPasswordValid = true;
    this.passwordErrorMsg = '';
  }

  /**
   * Checks the email against a standard RFC 5322 regex pattern.
   * @param email - The email string to test.
   * @returns {boolean} True if the format is valid.
   */
  private isValidEmailFormat(email: string): boolean {
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegex.test(email);
  }

  /**
   * Checks if all required fields and conditions (privacy policy) are met.
   * @returns {boolean} True if the form can be submitted.
   */
  isFormValid(): boolean {
    return this.isNameValid && this.isEmailValid && this.isPasswordValid && this.isPrivacyPolicyAccepted;
  }

  // --- STEP NAVIGATION & UI ---

  /**
   * Advances the signup process to the second step (Avatar selection).
   * Forces validation check just in case the user didn't trigger blur events.
   */
  nextStep(): void {
    this.validateName();
    this.validateEmail();
    this.validatePassword();

    if (this.isFormValid()) {
      this.signupStep = 2;
      this.errorMessage = '';
    }
  }

  /**
   * Returns the user to the first step of the signup process.
   */
  prevStep(): void {
    this.signupStep = 1;
    this.errorMessage = '';
    this.isLoading = false;
  }

  /**
   * Updates the selected avatar path.
   * @param avatar - The path to the selected image.
   */
  selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
  }

  // --- SUBMISSION ---

  /**
   * Orchestrates the final signup process by extracting names and calling AuthService.
   * @returns {Promise<void>}
   */
  async finishSignup(): Promise<void> {
    this.prepareForSubmission();
    const { firstName, lastName } = this.extractNames();

    const result = await this.authService.signup(
      this.email, this.password, firstName, lastName, this.selectedAvatar, 'offline'
    );

    this.handleSignupResult(result);
  }

  /**
   * Resets error messages and enables the loading spinner.
   */
  private prepareForSubmission(): void {
    this.errorMessage = '';
    this.isLoading = true;
  }

  /**
   * Splits the full name input into first and last name components.
   * @returns {object} An object containing firstName and lastName.
   */
  private extractNames(): { firstName: string, lastName: string } {
    const parts = this.fullName.trim().split(' ');
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || ''
    };
  }

  /**
   * Handles the response from the signup service attempt.
   * Emits success or updates error state.
   * @param result - The result object from the AuthService.
   */
  private handleSignupResult(result: any): void {
    this.isLoading = false;
    if (result.success) {
      this.success.emit();
    } else {
      this.errorMessage = result.error || 'Registrierung fehlgeschlagen.';
      this.changeDetectorRef.markForCheck();
      setTimeout(() => {
        this.scrollToErrorMsg();
      }, 5);
    }
  }

  /**
   * Scrolls the viewport to the global error message element.
   */
  scrollToErrorMsg(): void {
    if (this.errormsg) {
      this.errormsg.nativeElement.scrollIntoView({ behavior: 'auto' });
    }
  }
}