import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceManagerComponent } from './invoice-manager.component';

describe('InvoiceManagerComponent', () => {
  let component: InvoiceManagerComponent;
  let fixture: ComponentFixture<InvoiceManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoiceManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
