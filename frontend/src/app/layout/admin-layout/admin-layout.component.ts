import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet], // 👈 KHÔNG cần DashboardComponent
  templateUrl: './admin-layout.component.html',
  styleUrls: [
    
    '../../../assets/css/bootstrap.min.css',
    '../../../assets/css//kaiadmin.min.css',
    '../../../assets/css//demo.css'
    
  ]
})
export class AdminLayoutComponent {}
