import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SignupComponent } from '../signup/signup';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SignupComponent], 
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  showSignup: boolean = false;
  showSuccessMessage: boolean = false;
  errorMessage: string = '';
  isLoading: boolean = false;

  loginEmail: string = '';
  loginPassword: string = '';

  async login() {
    this.errorMessage = '';

    if (!this.loginEmail || !this.loginPassword) {
      this.errorMessage = 'Bitte E-Mail und Passwort eingeben.';
      return;
    }

    this.isLoading = true;
    const result = await this.authService.login(this.loginEmail, this.loginPassword);
    this.isLoading = false;

    if (result.success) {
      this.router.navigate(['/main']);
    } else {
      this.errorMessage = result.error || 'Login fehlgeschlagen.';
    }
  }

  async guestLogin() {
    this.errorMessage = '';
    this.isLoading = true;

    const result = await this.authService.guestLogin();
    this.isLoading = false;

    if (result.success) {
      this.router.navigate(['/main']);
    } else {
      this.errorMessage = result.error || 'Gast-Login fehlgeschlagen.';
    }
  }

  async googleLogin() {
    this.errorMessage = '';
    this.isLoading = true;

    const result = await this.authService.googleLogin();
    this.isLoading = false;

    if (result.success) {
      this.router.navigate(['/main']);
    } else if (result.error) {
      this.errorMessage = result.error;
    }
  }

  toggleSignup() {
    this.showSignup = !this.showSignup;
    this.errorMessage = '';
  }

  onSignupSuccess() {
    this.showSignup = false;
    this.showSuccessMessage = true;
    setTimeout(() => {
      this.showSuccessMessage = false;
      this.router.navigate(['/main']);
    }, 2500);
  }
}