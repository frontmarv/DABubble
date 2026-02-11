import { Component, EventEmitter, Output, inject } from '@angular/core';
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

  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  signupStep: number = 1;
  errorMessage: string = '';
  isLoading: boolean = false;

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

    this.signupStep = 2;
  }

  prevStep() {
    this.signupStep = 1;
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
      this.success.emit(); 
    } else {
      this.errorMessage = result.error || 'Registrierung fehlgeschlagen.';
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}