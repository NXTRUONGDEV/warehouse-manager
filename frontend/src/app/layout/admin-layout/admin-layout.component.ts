import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet,CommonModule ],
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

  ngOnInit(): void {
    this.userName = sessionStorage.getItem('name') || 'Admin';
    this.isLoggedIn = !!sessionStorage.getItem('token');
  }

  logout(): void {
    sessionStorage.clear();
    window.location.href = '/dangnhap';
  }
}
