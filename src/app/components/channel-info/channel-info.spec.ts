import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChannelInfo } from './channel-info';

describe('ChannelInfo', () => {
  let component: ChannelInfo;
  let fixture: ComponentFixture<ChannelInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChannelInfo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChannelInfo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
