import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

// --- COMPONENTS ---
import { SignupComponent } from '../signup/signup';
import { Intro } from '../../components/intro/intro';

// --- SERVICES ---
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SignupComponent, Intro],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  // --- INJECTIONS ---
  private authService = inject(AuthService);
  private router = inject(Router);
  private changeDetectorRef = inject(ChangeDetectorRef);

  // --- UI STATE ---
  showSignup: boolean = false;
  showSuccessMessage: boolean = false;
  errorMessage: string = '';
  isLoading: boolean = false;
  showIntro: boolean = true;

  // --- FORM STATE ---
  loginEmail: string = '';
  loginPassword: string = '';

  // --- LIFECYCLE & INTRO ---

  ngOnInit(): void {
    this.showIntro = sessionStorage.getItem('loginIntroPlayed') !== 'true';
  }

  onIntroFinished() {
    sessionStorage.setItem('loginIntroPlayed', 'true');
    this.showIntro = false;
  }

  // --- LOGIN METHODS ---

  async login() {
    if (!this.validateInputs()) return;
    const authRequest = this.authService.login(this.loginEmail, this.loginPassword);
    await this.executeAuthRequest(authRequest, 'Login fehlgeschlagen.');
  }

  async guestLogin() {
    const authRequest = this.authService.login("gast@dabubble.com", "gast1234");
    await this.executeAuthRequest(authRequest, 'Gast-Login fehlgeschlagen.');
  }

  async googleLogin() {
    const authRequest = this.authService.googleLogin();
    await this.executeAuthRequest(authRequest, 'Google-Login fehlgeschlagen.');
  }

  // --- AUTHENTICATION HELPER ---

  private validateInputs(): boolean {
    this.errorMessage = '';
    if (!this.loginEmail || !this.loginPassword) {
      this.errorMessage = 'Bitte E-Mail und Passwort eingeben.';
      return false;
    }
    return true;
  }

  private async executeAuthRequest(authPromise: Promise<any>, defaultError: string) {
    this.resetErrorAndSetLoading();
    const result = await authPromise;
    this.handleAuthResult(result, defaultError);
  }

  private resetErrorAndSetLoading() {
    this.errorMessage = '';
    this.isLoading = true;
  }

  private handleAuthResult(result: any, defaultError: string) {
    this.isLoading = false;
    
    if (result.success) {
      this.router.navigate(['/main']);
    } else {
      this.errorMessage = result.error || defaultError;
      this.changeDetectorRef.markForCheck();
    }
  }

  // --- SIGNUP LOGIC ---

  toggleSignup() {
    this.showSignup = !this.showSignup;
    this.errorMessage = '';
  }

  onSignupSuccess() {
    this.showSuccessMessage = true;
    setTimeout(() => this.completeSignupFlow(), 2500);
  }

  private completeSignupFlow() {
    this.showSuccessMessage = false;
    this.router.navigate(['/main']).then(() => {
      this.showSignup = false;
    });
  }
}