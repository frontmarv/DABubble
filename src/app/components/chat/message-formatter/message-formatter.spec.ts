import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageFormatter } from './message-formatter';

describe('MessageFormatter', () => {
  let component: MessageFormatter;
  let fixture: ComponentFixture<MessageFormatter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageFormatter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MessageFormatter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
