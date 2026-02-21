import { Component, Output, EventEmitter, ViewChild, ElementRef, inject } from '@angular/core';
import { PickerModule } from "@ctrl/ngx-emoji-mart";
import { ConnectedPosition } from '@angular/cdk/overlay';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'app-emoji-picker',
  imports: [PickerModule, OverlayModule],
  templateUrl: './emoji-picker.html',
  styleUrl: './emoji-picker.scss',
})
export class EmojiPicker {

  @Output() emojiSelected = new EventEmitter<string>();

  isOpen = false;

  toggle() {
    this.isOpen = !this.isOpen;
  }

  setHidden() {
    this.isOpen = false;
  }

  handleSelection(event: any) {
    this.emojiSelected.emit(event.emoji.native);
    console.log('Selected emoji:', event.emoji.native);
    this.setHidden();
  }

  // Definition, wie das Overlay am Button "kleben" soll
  positions: ConnectedPosition[] = [
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'end',
      overlayY: 'bottom',
      offsetY: -10,
      offsetX: -70
    },
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'end',
      overlayY: 'top',
      offsetY: 5,
      offsetX: 70
    }
  ];

}
