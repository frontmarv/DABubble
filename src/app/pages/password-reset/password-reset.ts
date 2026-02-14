import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-password-reset',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './password-reset.html',
  styleUrl: './password-reset.scss',
})



export class PasswordReset {
  constructor(private authService: AuthService) { }
  private router = inject(Router);
  resetStep: number = 1;
  errorMessage: string = '';
  showSuccessMessage: boolean = false;

  email: string = '';
  isEmailValid: boolean = false;

  newPassword: string = '';
  confirmNewPassword: string = '';
  doPasswordsMatch: boolean = false;

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
    }
    else {
      this.isEmailValid = true;
      return true
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegex.test(email);
  }

  async redirectToLogin() {
    if (!this.isEmailValid) {
      return;
    }
    try {
      this.showSuccessMessage = true;
      this.isEmailValid = false;
      await this.authService.sendResetEmail(this.email);
      setTimeout(() => {
        this.showSuccessMessage = false;
        this.router.navigate(['/login']);
      }, 2000);
    } catch (error: any) {
      this.errorMessage = 'E-Mail konnte nicht gesendet werden. Bitte versuche es erneut.';
      return;
    }
  }
}
