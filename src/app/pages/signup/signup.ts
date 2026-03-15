import { Component, EventEmitter, Output, inject, ChangeDetectorRef } from '@angular/core'; 
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

  signupStep: number = 1;
  errorMessage: string = '';
  isLoading: boolean = false;

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
   * Checks for presence and character limit (30).
   */
  validateName(): void {
    const name = this.fullName.trim();
    if (!name) return this.setValidationError('isNameValid', 'Bitte Name eingeben');
    if (name.length > 30) return this.setValidationError('isNameValid', 'Name darf max. 30 Zeichen enthalten');
    
    this.clearValidationError('isNameValid');
  }

  /**
   * Validates the email input field.
   * Checks format via regex and character limit (50).
   */
  validateEmail(): void {
    const mail = this.email.trim();
    if (!mail || !this.isValidEmailFormat(mail)) {
      return this.setValidationError('isEmailValid', 'Bitte gültige E-Mail-Adresse eingeben');
    }
    if (mail.length > 50) {
      return this.setValidationError('isEmailValid', 'E-mail-Adresse darf max. 50 Zeichen enthalten');
    }
    
    this.clearValidationError('isEmailValid');
  }

  /**
   * Validates the password input field.
   * Checks for minimum length of 6 characters.
   */
  validatePassword(): void {
    if (!this.password || this.password.length < 6) {
      return this.setValidationError('isPasswordValid', 'Passwort muss min. 6 Zeichen enthalten');
    }
    this.clearValidationError('isPasswordValid');
  }

  /**
   * Internal helper to set a validation error for a specific field.
   * @param field - The validation boolean flag.
   * @param msg - The error message to display.
   */
  private setValidationError(field: 'isNameValid' | 'isEmailValid' | 'isPasswordValid', msg: string): void {
    this[field] = false;
    this.errorMessage = msg;
  }

  /**
   * Internal helper to clear validation errors for a specific field.
   * @param field - The validation boolean flag.
   */
  private clearValidationError(field: 'isNameValid' | 'isEmailValid' | 'isPasswordValid'): void {
    this[field] = true;
    this.errorMessage = '';
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
   */
  nextStep(): void {
    if (this.isFormValid()) {
      this.signupStep = 2;
      this.errorMessage = '';
    } else {
      this.errorMessage = 'Bitte alle Felder korrekt ausfüllen';
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
    }
  }
}