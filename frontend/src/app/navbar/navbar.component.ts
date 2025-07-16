import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

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
  soHoaDon: number = 0;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    const userId = sessionStorage.getItem('id');
    this.isLoggedIn = !!sessionStorage.getItem('token');

    if (userId) {
      // Lấy tên người dùng
      this.http.get<any>(`http://localhost:3000/api/users/${userId}`).subscribe({
        next: (data) => {
          this.userName = data.name?.trim() || 'Người dùng';
        },
        error: (err) => {
          console.error('❌ Lỗi khi lấy tên người dùng:', err);
          this.userName = 'Người dùng';
        }
      });

      // ✅ Gọi API tổng hợp hóa đơn và đếm số cần cảnh báo (!da_xuat_hoa_don)
      this.http.get<any[]>(`http://localhost:3000/api/hoa-don/${userId}`).subscribe({
        next: (data) => {
          this.soHoaDon = data.filter(p => p.trang_thai === 'Đã duyệt' && !p.da_xuat_hoa_don).length;
        },
        error: (err) => {
          console.error('❌ Lỗi khi lấy hóa đơn:', err);
        }
      });
    } else {
      this.userName = 'Người dùng';
    }
  }


  logout() {
    sessionStorage.clear();
    window.location.href = '/';
  }
}
