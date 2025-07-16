import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './admin-layout.component.html',
  styleUrls: [
    '../../../assets/css/bootstrap.min.css',
    '../../../assets/css/kaiadmin.min.css',
    '../../../assets/css/demo.css',
    './admin-layout.component.css'
  ]
})
export class AdminLayoutComponent implements OnInit {
  userName: string = '';
  isLoggedIn: boolean = false;
  isSidebarCollapsed: boolean = false; // ✅ Biến điều khiển sidebar

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const userId = sessionStorage.getItem('id');
    this.isLoggedIn = !!sessionStorage.getItem('token');

    if (userId) {
      this.http.get<any>(`http://localhost:3000/api/users/${userId}`).subscribe({
        next: (data) => {
          this.userName = data.name?.trim() || 'Admin';
          sessionStorage.setItem('name', this.userName);
        },
        error: () => {
          this.userName = 'Admin';
        }
      });
    } else {
      this.userName = 'Admin';
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout(): void {
    sessionStorage.clear();
    window.location.href = '/dangnhap';
  }
}
