import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router, RouterLink } from '@angular/router'; 
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], 
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  showSignup: boolean = false;
  signupStep: number = 1;
  showSuccessMessage: boolean = false; 
  errorMessage: string = '';
  isLoading: boolean = false;

  loginEmail: string = '';
  loginPassword: string = '';
  fullName: string = '';
  email: string = '';
  password: string = '';
  privacyPolicy = false;
  
  avatars = [
    '/shared/profile-pics/profile-pic1.svg',
    '/shared/profile-pics/profile-pic2.svg',
    '/shared/profile-pics/profile-pic3.svg',
    '/shared/profile-pics/profile-pic4.svg',
    '/shared/profile-pics/profile-pic5.svg',
    '/shared/profile-pics/profile-pic6.svg'
  ];
  selectedAvatar: string = '/shared/profile-pics/profile-pic1.svg';
  
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
    this.signupStep = 1; 
    this.errorMessage = '';
    this.resetForm();
  }

  nextStep() {
    this.errorMessage = '';
    
    if (!this.fullName.trim()) {
      this.errorMessage = 'Bitte gib deinen Namen ein.';
      return;
    }
    
    if (!this.email.trim() || !this.isValidEmail(this.email)) {
      this.errorMessage = 'Bitte gib eine gültige E-Mail-Adresse ein.';
      return;
    }
    
    if (!this.password || this.password.length < 6) {
      this.errorMessage = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
      return;
    }
    
    if (!this.privacyPolicy) {
      this.errorMessage = 'Bitte akzeptiere die Datenschutzerklärung.';
      return;
    }

    this.signupStep++;
  }

  prevStep() {
    this.signupStep--;
    this.errorMessage = '';
  }
  
  selectAvatar(avatar: string) {
    this.selectedAvatar = avatar;
  }

  async finishSignup() {
    this.errorMessage = '';
    this.isLoading = true;

    const nameParts = this.fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const result = await this.authService.signup(
      this.email,
      this.password,
      firstName,
      lastName,
      this.selectedAvatar
    );

    this.isLoading = false;

    if (result.success) {
      this.showSuccessMessage = true;

      setTimeout(() => {
        this.showSuccessMessage = false;
        this.router.navigate(['/main']);
      }, 2500); 
    } else {
      this.errorMessage = result.error || 'Registrierung fehlgeschlagen.';
      this.signupStep = 1; 
    }
  }

  private resetForm() {
    this.loginEmail = '';
    this.loginPassword = '';
    this.fullName = '';
    this.email = '';
    this.password = '';
    this.privacyPolicy = false;
    this.selectedAvatar = '/shared/profile-pics/profile-pic1.svg';
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}