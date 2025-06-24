// Trong file component (ví dụ thongtinkho.component.ts)
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-thongtinkho',
  standalone: true,
  imports: [RouterModule], // quan trọng!
  templateUrl: './thongtinkho.component.html',
})

export class ThongtinkhoComponent {}