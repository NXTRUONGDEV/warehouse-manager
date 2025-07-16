// profile.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ProfileGuard implements CanActivate {
  constructor(private http: HttpClient, private router: Router) {}

  canActivate(): Observable<boolean> {
    const userId = sessionStorage.getItem('id');
    const role = sessionStorage.getItem('role');

    if (!userId) {
      this.dieuHuongTheoVaiTro(role);
      return of(false);
    }

    return this.http.get<any>(`http://localhost:3000/api/user-info/${userId}`).pipe(
      map(userInfo => {
        if (
          userInfo &&
          userInfo.full_name?.trim() &&
          userInfo.date_of_birth?.trim() &&
          userInfo.gender?.trim() &&
          userInfo.address?.trim() &&
          userInfo.phone?.trim()
        ) {
          // ✅ Lưu vào sessionStorage nếu cần
          sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
          return true;
        } else {
          alert('⚠️ Vui lòng cập nhật đầy đủ thông tin cá nhân để tiếp tục.');
          this.dieuHuongTheoVaiTro(role);
          return false;
        }
      }),
      catchError(err => {
        console.error('Lỗi khi kiểm tra thông tin:', err);
        alert('⚠️ Lỗi khi kiểm tra thông tin cá nhân.');
        this.dieuHuongTheoVaiTro(role);
        return of(false);
      })
    );
  }

  private dieuHuongTheoVaiTro(role: string | null) {
    if (role === 'admin') {
      this.router.navigate(['/admin/account-manager']);
    } else {
      this.router.navigate(['/staff/thongtin']);
    }
  }
}
