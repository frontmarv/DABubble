import { Component, Output, EventEmitter, ViewChild, ElementRef, inject } from '@angular/core';
import { PickerModule } from "@ctrl/ngx-emoji-mart";
import { ConnectedPosition } from '@angular/cdk/overlay';
import { OverlayModule } from '@angular/cdk/overlay';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-emoji-picker',
  imports: [PickerModule, OverlayModule],
  templateUrl: './emoji-picker.html',
  styleUrl: './emoji-picker.scss',
})
export class EmojiPicker {

  firebaseService = inject(FirebaseService);
  @Output() emojiSelected = new EventEmitter<string>();
  isOpen = false;
  positions: ConnectedPosition[] = [];

  desktopPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -5, offsetX: 70 },
    { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 5, offsetX: 70 }
  ];


  mobilePositions: ConnectedPosition[] = [
    { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 5 },
    { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -5 }
  ];

  breakpointObserver = inject(BreakpointObserver);

  constructor() {
    this.breakpointObserver
      .observe(['(max-width: 767px)'])
      .pipe(takeUntilDestroyed())
      .subscribe(result => {
        if (result.matches) {
          this.positions = this.mobilePositions;
        } else {
          this.positions = this.desktopPositions;
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
    console.log('Selected emoji:', event.emoji.native, 'Who reacted:', this.firebaseService.currentUser()?.uid);
    this.setHiddenEmojiPicker();
  }

}
