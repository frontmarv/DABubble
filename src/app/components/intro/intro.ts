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


  /**
   * Starts the multi-phase animation sequence on component initialization.
   */
  ngOnInit(): void {
    this.startAnimationSequence();
  }


  /**
   * Orchestrates the timing for each animation phase.
   */
  private startAnimationSequence(): void {
    this.schedulePhase(() => this.introPhase1 = true, 400);
    this.schedulePhase(() => this.introPhase2 = true, 1200);
    this.schedulePhase(() => this.introFadeOut = true, 2000);
    this.scheduleFinish(2800);
  }


  /**
   * Executes a state change after a specific delay and triggers change detection.
   * @param action - The function that updates the state.
   * @param delay - Time in milliseconds to wait before execution.
   */
  private schedulePhase(action: () => void, delay: number): void {
    setTimeout(() => {
      action();
      this.cdr.detectChanges();
    }, delay);
  }


  /**
   * Signals the parent component that the entire animation has completed.
   * @param delay - Total duration until the finish event is emitted.
   */
  private scheduleFinish(delay: number): void {
    setTimeout(() => {
      this.animationFinished.emit();
    }, delay);
  }
}