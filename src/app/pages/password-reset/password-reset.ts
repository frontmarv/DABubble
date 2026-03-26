import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';

@Component({
  selector: 'app-password-reset',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './password-reset.html',
  styleUrl: './password-reset.scss',
})
export class PasswordReset {
  private router = inject(Router);
  private auth = inject(Auth);

  errorMessage: string = '';
  showSuccessMessage: boolean = false;

  email: string = '';
  isEmailValid: boolean = false;

  /**
   * Validates the email input field on focus/blur events.
   * Checks for empty strings, correct email format, and maximum length.
   * @param {FocusEvent} event - The DOM focus event.
   */
  validateEmail(event: FocusEvent) {
    this.errorMessage = '';
    if (!this.email.trim() || !this.isValidEmail(this.email)) {
      this.isEmailValid = false;
      this.errorMessage = 'Bitte gültige E-Mail-Adresse eingeben';
      return;
    }
    if (this.email.length > 50) {
      this.isEmailValid = false;
      this.errorMessage = 'E-mail-Adresse darf max. 50 Zeichen enthalten';
      return;
    } else {
      this.isEmailValid = true;
      return true;
    }
  }

  /**
   * Helper method that uses a regular expression to verify the email format.
   * @param {string} email - The email string to validate.
   * @returns {boolean} True if the email format is valid.
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegex.test(email);
  }

  /**
   * Initiates the password reset process via Firebase Authentication.
   * On success, shows a success message and redirects the user to the login page.
   * @returns {Promise<void>}
   */
  async sendResetLink() {
    if (!this.isEmailValid) {
      return;
    }
    try {
      this.showSuccessMessage = true;
      this.isEmailValid = false;
      const actionCodeSettings = {
        url: 'http://dabubble.marvin-lenhart.com/reset-password',
        handleCodeInApp: false
      };
      await sendPasswordResetEmail(this.auth, this.email, actionCodeSettings);
      this.handleResetSuccess();
    } catch (error: any) {
      this.errorMessage = 'E-Mail konnte nicht gesendet werden. Bitte versuche es erneut.';
      return;
    }
  }

  /**
   * Internal helper to handle the post-email-sent logic.
   * Hides the success message and navigates back to the login screen after a delay.
   */
  private handleResetSuccess() {
    this.showSuccessMessage = false;
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 1500);
  }
}