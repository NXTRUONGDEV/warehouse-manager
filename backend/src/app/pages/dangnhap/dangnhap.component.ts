import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dangnhap',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dangnhap.component.html',
  styleUrls: ['./dangnhap.component.css']
})
export class DangnhapComponent {
  activeTab: 'login' | 'register' = 'login';

  // Dữ liệu form đăng nhập
  loginData = { email: '', password: '' };

  // Dữ liệu form đăng ký
  registerData = { name: '', email: '', password: '', confirm: '' };

  constructor(private http: HttpClient, private router: Router) {}

  setTab(tab: 'login' | 'register') {
    this.activeTab = tab;
  }

  login() {
    this.http.post<{ token: string; role: string }>('http://localhost:3000/api/login', this.loginData).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('role', res.role);

        // Điều hướng theo role
        if (res.role === 'admin') this.router.navigate(['/admin/dashboard']);
        else if (res.role === 'staff') this.router.navigate(['/staff/thongtin']);
        else this.router.navigate(['/home']);
      },
      error: () => alert('Đăng nhập thất bại! Vui lòng kiểm tra lại email và mật khẩu.')
    });
  }

  register() {
    if (this.registerData.password !== this.registerData.confirm) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }

    // Gửi lên backend chỉ các trường cần thiết
    const payload = {
      name: this.registerData.name,
      email: this.registerData.email,
      password: this.registerData.password
    };

    this.http.post('http://localhost:3000/api/register', payload).subscribe({
      next: () => {
        alert('Đăng ký thành công! Vui lòng đăng nhập.');
        this.setTab('login');
        this.registerData = { name: '', email: '', password: '', confirm: '' }; // reset form
      },
      error: (err) => {
        // Có thể customize theo lỗi backend trả về
        alert(err.error?.message || 'Đăng ký thất bại! Email có thể đã tồn tại.');
      }
    });
  }
}
