import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-account-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-manager.component.html',
  styleUrls: ['./account-manager.component.css']
})
export class AccountManagerComponent implements OnInit {
  users: any[] = [];
  filteredUsers: any[] = []; // 👈 dùng để hiển thị

  searchKeyword: string = '';
  selectedRole: string = '';

  constructor(private http: HttpClient) {}

  // Quản lý form
  showUserInfoForm = false;
  showAccountForm = false;

  // Thông tin người dùng hiện tại
  userInfo: any = null;
  userId = sessionStorage.getItem('id');
  today = new Date().toISOString().split('T')[0];
  selectedUser: any = null;

  formData = {
    full_name: '',
    date_of_birth: '',
    gender: '',
    address: '',
    phone: ''
  };

  selectedFile: File | null = null;

  // Dữ liệu thêm tài khoản mới
  newUser = {
    name: '',
    email: '',
    password: '',
    role: 'user'
  };

  ngOnInit(): void {
    this.loadUsers();
    this.loadUserInfo();
  }

  loadUsers() {
    this.http.get<any[]>('http://localhost:3000/api/users').subscribe({
    next: data => {
      this.users = data;
      this.filteredUsers = data; // ban đầu hiển thị tất cả
    },
    error: err => console.error('Lỗi lấy dữ liệu user:', err)
  });
  }

  loadUserInfo() {
    this.http.get(`http://localhost:3000/api/user-info/${this.userId}`).subscribe((data: any) => {
      this.userInfo = data;
      if (data) {
        this.formData = {
          full_name: data.full_name || '',
          date_of_birth: data.date_of_birth ? data.date_of_birth.split('T')[0] : '',
          gender: data.gender || '',
          address: data.address || '',
          phone: data.phone || ''
        };
      }
    });
  }

  //bộ lọc
  filterUsers() {
  const keyword = this.searchKeyword.trim().toLowerCase();
  const role = this.selectedRole;

  this.filteredUsers = this.users.filter(user => {
    const nameMatch = user.name.toLowerCase().includes(keyword);
    const roleMatch = !role || user.role === role;
    return nameMatch && roleMatch;
  });
}

  toggleUserInfoForm() {
    this.showUserInfoForm = !this.showUserInfoForm;
  }

  toggleAccountForm() {
    this.showAccountForm = !this.showAccountForm;
  }

  submitForm() {
    if (!this.newUser.name || !this.newUser.email || !this.newUser.password || !this.newUser.role) {
      alert('⚠️ Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    this.http.post('http://localhost:3000/api/users', this.newUser).subscribe({
      next: (res: any) => {
        alert('✅ Đã thêm tài khoản!');
        this.users.push(res.user);
        this.showAccountForm = false;
        this.newUser = { name: '', email: '', password: '', role: 'user' };
        window.location.reload();
      },
      error: () => alert('❌ Lỗi khi thêm tài khoản.')
    });
  }

  themTaiKhoan() {
    const name = prompt('Nhập tên tài khoản:');
    const email = prompt('Nhập email:');
    const password = prompt('Nhập mật khẩu:');
    const role = prompt('Nhập vai trò (user / staff / admin):');

    if (!name || !email || !password || !role) {
      alert('⚠️ Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    this.http.post('http://localhost:3000/api/users', { name, email, password, role }).subscribe({
      next: (res: any) => {
        alert('✅ Đã thêm tài khoản!');
        this.users.push(res.user);
      },
      error: () => alert('❌ Lỗi khi thêm tài khoản.')
    });
  }

xemThongTin(user: any) {
  // Gọi API để lấy thông tin chi tiết từ bảng user_info (liên kết với users qua user_id)
  this.http.get(`http://localhost:3000/api/user-info/${user.id}`).subscribe({
    next: (userInfo: any) => {
      // Gộp thông tin từ bảng `users` và bảng `user_info`
      this.selectedUser = {
        ...user,
        full_name: userInfo?.full_name,
        date_of_birth: userInfo?.date_of_birth ? userInfo.date_of_birth.split('T')[0] : '',
        gender: userInfo?.gender,
        address: userInfo?.address,
        phone: userInfo?.phone,
        image_url: userInfo?.image_url
      };
    },
    error: (err) => {
      console.error('❌ Lỗi khi lấy thông tin chi tiết:', err);
      // Nếu không có user_info, vẫn hiển thị thông tin cơ bản
      this.selectedUser = user;
    }
  });
}


  xoaTaiKhoan(userId: number) {
    const currentUserId = Number(sessionStorage.getItem('id'));
    if (userId === currentUserId) {
      alert('⚠️ Bạn không thể xoá chính tài khoản đang đăng nhập!');
      return;
    }

    if (confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      this.http.delete(`http://localhost:3000/api/users/${userId}`).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== userId);
          alert('✅ Đã xóa tài khoản!');
        },
        error: () => alert('❌ Lỗi khi xóa tài khoản.')
      });
    }
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  submitInfo() {
    const birthDate = new Date(this.formData.date_of_birth);
    const today = new Date();

    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    const isUnder20 = age < 20 || (age === 20 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)));

    if (isUnder20) {
      alert('⚠️ Người dùng phải đủ 20 tuổi trở lên!');
      return;
    }

    const phonePattern = /^\d{1,11}$/;
    if (!phonePattern.test(this.formData.phone)) {
      alert('⚠️ Số điện thoại không hợp lệ (tối đa 11 số và chỉ chứa số).');
      return;
    }

    const form = new FormData();
    form.append('user_id', this.userId!);
    form.append('full_name', this.formData.full_name);
    form.append('date_of_birth', this.formData.date_of_birth);
    form.append('gender', this.formData.gender);
    form.append('address', this.formData.address);
    form.append('phone', this.formData.phone);

    if (this.selectedFile) {
      form.append('avatar', this.selectedFile);
    }

    this.http.post('http://localhost:3000/api/user-info', form).subscribe(() => {
      alert('✅ Cập nhật thông tin thành công!');
      this.showUserInfoForm = false;
      this.selectedFile = null;
      this.ngOnInit();
    });
  }
}
