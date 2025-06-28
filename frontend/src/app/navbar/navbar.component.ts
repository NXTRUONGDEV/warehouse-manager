import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  userName: string = '';
  isLoggedIn: boolean = false;

  ngOnInit() {
    const nameFromStorage = sessionStorage.getItem('name');
    this.userName = nameFromStorage ? nameFromStorage : 'Người dùng'; // 👈 fallback nếu null
    this.isLoggedIn = !!sessionStorage.getItem('token');
  }

  logout() {
    sessionStorage.clear();
    window.location.href = '/';
  }
}
