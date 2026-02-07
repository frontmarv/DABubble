import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  showSignup: boolean = false;
  signupStep: number = 1;
  showSuccessMessage: boolean = false; 

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

  constructor(private router: Router) {}
  
  login() {
    this.router.navigate(['/main']);
  }
  
  guestLogin() {
    this.router.navigate(['/main']);
  }

  toggleSignup() {
    this.showSignup = !this.showSignup;
    this.signupStep = 1; 
  }

  nextStep() {
    this.signupStep++;
  }

  prevStep() {
    this.signupStep--;
  }
  
  selectAvatar(avatar: string) {
    this.selectedAvatar = avatar;
  }

  finishSignup() {
    this.showSuccessMessage = true;

    setTimeout(() => {
        this.showSuccessMessage = false;
        this.router.navigate(['/main']);
    }, 2500); 
  }
}