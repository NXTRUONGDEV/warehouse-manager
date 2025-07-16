import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-taophieunhap',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './taophieunhap.component.html',
  styleUrls: ['./taophieunhap.component.css']
})
export class TaophieunhapComponent implements OnInit {
  danhSachPhieu: any[] = [];
  selectedPhieu: any = null;

  staffName = sessionStorage.getItem('name') || '';
  staffEmail = sessionStorage.getItem('email') || '';

  phanHoiStaff: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPhieu();
  }

  loadPhieu() {
    this.http.get<any[]>('http://localhost:3000/api/phieu-nhap').subscribe(data => {
      this.danhSachPhieu = data;
    });
  }

  xemChiTiet(phieu: any) {
    this.selectedPhieu = phieu;
    this.phanHoiStaff = phieu.note_staff || '';  // ✅ Lấy phản hồi staff nếu có
  }

  dongChiTiet() {
    this.selectedPhieu = null;
    this.phanHoiStaff = '';
  }

  hoanTatKiemTra() {
    const newStatus = 'Đã tạo phiếu - đợi duyệt';

    this.http.put(`http://localhost:3000/api/phieu-nhap/${this.selectedPhieu.id}/staff-cap-nhat`, {
      trang_thai: newStatus,
      note_staff: this.phanHoiStaff,
      staff_account_email: this.staffEmail,
      staff_account_name: this.staffName
    }).subscribe(() => {
      alert('✅ Hoàn tất kiểm tra , tạo đơn thành công!');
      this.selectedPhieu.trang_thai = newStatus;
      this.selectedPhieu.note_staff = this.phanHoiStaff;
      this.selectedPhieu.staff_account_email = this.staffEmail;
      this.selectedPhieu.staff_account_name = this.staffName;
    });
  }
}
