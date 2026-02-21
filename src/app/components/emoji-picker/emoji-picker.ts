import { Component, Output, EventEmitter, ViewChild, ElementRef, inject } from '@angular/core';
import { PickerModule } from "@ctrl/ngx-emoji-mart";
import { ConnectedPosition } from '@angular/cdk/overlay';
import { OverlayModule } from '@angular/cdk/overlay';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-emoji-picker',
  imports: [PickerModule, OverlayModule],
  templateUrl: './emoji-picker.html',
  styleUrl: './emoji-picker.scss',
})
export class EmojiPicker {

  @Output() emojiSelected = new EventEmitter<string>();
  isOpen = false;
  positions: ConnectedPosition[] = [];

  // Deine bisherigen Desktop-Positionen
  private desktopPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -5, offsetX: 70 },
    { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 5, offsetX: 70 }
  ];

  // Mobile Positionen (schlichter, direkt unter/über dem Button, zentriert)
  private mobilePositions: ConnectedPosition[] = [
    { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 5 },
    { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -5 }
  ];

  private breakpointObserver = inject(BreakpointObserver);

  constructor() {
    // Überwacht die Bildschirmgröße und tauscht die Positionen dynamisch aus
    this.breakpointObserver
      .observe(['(max-width: 767px)'])
      .pipe(takeUntilDestroyed()) // Modernes Angular Cleanup (ab v16)
      .subscribe(result => {
        if (result.matches) {
          this.positions = this.mobilePositions; // Wir sind auf Mobile
        } else {
          this.positions = this.desktopPositions; // Wir sind auf Desktop
        }
      });
  }

    toggleEmojiPicker() {
    this.isOpen = !this.isOpen;
  }

  setHiddenEmojiPicker() {
    this.isOpen = false;
  }

  handleSelection(event: any) {
    this.emojiSelected.emit(event.emoji.native);
    console.log('Selected emoji:', event.emoji.native);
    this.setHiddenEmojiPicker();
  }

}
