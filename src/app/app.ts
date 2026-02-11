import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Intro } from './components/intro/intro';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Intro],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  showIntro = true; 

  onIntroFinished() {
    this.showIntro = false; 
  }
}