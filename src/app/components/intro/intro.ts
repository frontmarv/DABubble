import { Component, EventEmitter, OnInit, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-intro',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './intro.html',
  styleUrl: './intro.scss'
})
export class Intro implements OnInit {
  @Output() animationFinished = new EventEmitter<void>();
  private cdr = inject(ChangeDetectorRef);

  introPhase1 = false; 
  introPhase2 = false;
  introFadeOut = false; 

  ngOnInit() {
    setTimeout(() => {
      this.introPhase1 = true;
      this.cdr.detectChanges();
    }, 400);

    setTimeout(() => {
      this.introPhase2 = true;
      this.cdr.detectChanges();
    }, 1200);

    setTimeout(() => {
      this.introFadeOut = true;
      this.cdr.detectChanges();
    }, 2000);

    setTimeout(() => {
      this.animationFinished.emit();
    }, 2800);
  }
}