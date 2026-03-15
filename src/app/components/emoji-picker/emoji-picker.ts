import { Component, Output, EventEmitter, inject } from '@angular/core';
import { PickerModule } from "@ctrl/ngx-emoji-mart";
import { ConnectedPosition } from '@angular/cdk/overlay';
import { OverlayModule } from '@angular/cdk/overlay';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  imports: [PickerModule, OverlayModule],
  templateUrl: './emoji-picker.html',
  styleUrl: './emoji-picker.scss',
})
export class EmojiPicker {
  firebaseService = inject(FirebaseService);
  private breakpointObserver = inject(BreakpointObserver);

  @Output() emojiSelected = new EventEmitter<string>();

  isOpen = false;
  positions: ConnectedPosition[] = [];

  private readonly mobileQuery = '(max-width: 767px)';

  private desktopPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -5, offsetX: 70 },
    { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 5, offsetX: 70 }
  ];

  private mobilePositions: ConnectedPosition[] = [
    { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 5 },
    { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -5 }
  ];


  /**
   * Initializes the responsive listener for overlay positioning.
   */
  constructor() {
    this.initResponsivePositions();
  }


  /**
   * Sets up the breakpoint observer to toggle between mobile and desktop positions.
   */
  private initResponsivePositions(): void {
    this.breakpointObserver
      .observe([this.mobileQuery])
      .pipe(takeUntilDestroyed())
      .subscribe(result => this.updateOverlayPositions(result.matches));
  }


  /**
   * Updates the active positions array based on the current screen width.
   * @param isMobile - Boolean indicating if the mobile breakpoint is active.
   */
  private updateOverlayPositions(isMobile: boolean): void {
    this.positions = isMobile ? this.mobilePositions : this.desktopPositions;
  }


  /**
   * Toggles the visibility state of the emoji picker.
   */
  toggleEmojiPicker(): void {
    this.isOpen = !this.isOpen;
  }


  /**
   * Explicitly closes the emoji picker.
   */
  setHiddenEmojiPicker(): void {
    this.isOpen = false;
  }


  /**
   * Processes the selected emoji and emits the native character.
   * @param event - The selection event from the emoji-mart picker.
   */
  handleSelection(event: any): void {
    if (event?.emoji?.native) {
      this.emojiSelected.emit(event.emoji.native);
    }
    this.setHiddenEmojiPicker();
  }
}