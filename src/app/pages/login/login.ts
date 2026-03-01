import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SignupComponent } from '../signup/signup';
import { Intro } from '../../components/intro/intro';

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

  showSignup: boolean = false;
  showSuccessMessage: boolean = false;
  errorMessage: string = '';
  isLoading: boolean = false;

  showIntro: boolean = true;

  loginEmail: string = '';
  loginPassword: string = '';

  ngOnInit(): void {
    const animationPlayed = sessionStorage.getItem('loginIntroPlayed');

    if (animationPlayed === 'true') {
      this.showIntro = false;
    } else {
      this.showIntro = true;
    }
  }

  onIntroFinished() {
    sessionStorage.setItem('loginIntroPlayed', 'true');
    this.showIntro = false;
  }

  async login() {
    this.errorMessage = '';
    if (!this.loginEmail || !this.loginPassword) {
      this.errorMessage = 'Bitte E-Mail und Passwort eingeben.';
      return;
    }
    this.isLoading = true;
    const result = await this.authService.login(this.loginEmail, this.loginPassword);
    if (result.success) {
      this.router.navigate(['/main']);
    } else {
      this.errorMessage = result.error || 'Login fehlgeschlagen.';
      this.changeDetectorRef.markForCheck();
      this.isLoading = false;
    }
  }

  async guestLogin() {
    this.errorMessage = '';
    this.isLoading = true;
    const result = await this.authService.login("gast@dabubble.com", "gast1234");

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
    this.showSuccessMessage = true;
    setTimeout(() => {
      this.showSuccessMessage = false;
      this.router.navigate(['/main']).then(() => {
        this.showSignup = false;
      });
    }, 2500);
  }
}