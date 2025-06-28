import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-staff-layout',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './staff-layout.component.html',
  styleUrl: './staff-layout.component.css'
})
export class StaffLayoutComponent implements OnInit {

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

