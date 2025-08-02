import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-lichsukiemke',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lichsukiemke.component.html',
  styleUrls: ['./lichsukiemke.component.css']
})
export class LichsukiemkeComponent implements OnInit {
  danhSachDot: any[] = [];
  moChiTiet: { [dotId: number]: boolean } = {};
  chiTietTheoDot: { [dotId: number]: any[] } = {};

  private BASE_URL = 'http://localhost:3000/api';

  boLoc = {
    maDot: '',
    tenDot: '',
    nguoiTao: '',
    ngayTao: '',
    stt: null  // Lọc chính xác theo số sản phẩm kiểm kê
  };


  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.taiDanhSachDot();
  }

  taiDanhSachDot() {
    this.http.get<any>(`${this.BASE_URL}/kiem-ke/danh-sach-dot`).subscribe({
      next: res => {
        if (res.success) {
          this.danhSachDot = res.data;
        }
      },
      error: err => console.error('❌ Lỗi tải danh sách đợt:', err)
    });
  }

  toggleChiTiet(dot: any) {
    const dotId = dot.id;

    if (this.moChiTiet[dotId]) {
      this.moChiTiet[dotId] = false;
      return;
    }

    this.moChiTiet[dotId] = true;

    if (!this.chiTietTheoDot[dotId]) {
      this.http.get<any>(`${this.BASE_URL}/kiem-ke/bao-cao-dot/${dotId}`).subscribe({
        next: res => {
          if (res.success) {
            const gop = this.gopSanPhamTheoMa(res.data);
            this.chiTietTheoDot[dotId] = gop;
          } else {
            this.chiTietTheoDot[dotId] = [];
          }
        },
        error: err => {
          console.error('❌ Lỗi chi tiết đợt:', err);
          this.chiTietTheoDot[dotId] = [];
        }
      });
    }
  }

  gopSanPhamTheoMa(danhSach: any[]): any[] {
    const map = new Map<string, any>();

    for (const sp of danhSach) {
      const key = sp.product_code;

      if (!map.has(key)) {
        map.set(key, { ...sp });  // copy ban đầu
      } else {
        const spDaCo = map.get(key);

        // Cộng dồn số lượng
        spDaCo.system_quantity += sp.system_quantity;
        spDaCo.actual_quantity =
          spDaCo.actual_quantity != null && sp.actual_quantity != null
            ? spDaCo.actual_quantity + sp.actual_quantity
            : null;

        // Gộp ghi chú nếu khác nhau (tuỳ ý)
        if (sp.ghi_chu && spDaCo.ghi_chu !== sp.ghi_chu) {
          spDaCo.ghi_chu = (spDaCo.ghi_chu || '') + ' | ' + sp.ghi_chu;
        }

        // Bạn có thể chọn gộp `checked_by_email` hoặc lấy cái đầu tiên
      }
    }

    return Array.from(map.values());
  }



  xuatExcel(dotId: number) {
    window.open(`${this.BASE_URL}/xuat-excel/kiem-ke/${dotId}`, '_blank');
  }

  isValidArray(data: any): boolean {
    return Array.isArray(data) && data.length > 0;
  }
 
  locDanhSachDot() {
    return this.danhSachDot.filter(dot => {
      const ngayTao = this.boLoc.ngayTao ? new Date(this.boLoc.ngayTao).toDateString() : null;
      const ngayDot = dot.created_at ? new Date(dot.created_at).toDateString() : '';

      const matchDot =
        (!this.boLoc.maDot || dot.ma_dot.toLowerCase().includes(this.boLoc.maDot.toLowerCase())) &&
        (!this.boLoc.tenDot || dot.ten_dot.toLowerCase().includes(this.boLoc.tenDot.toLowerCase())) &&
        (!this.boLoc.nguoiTao || dot.created_by_email?.toLowerCase().includes(this.boLoc.nguoiTao.toLowerCase())) &&
        (!this.boLoc.ngayTao || ngayDot === ngayTao);

      const chiTiet = this.chiTietTheoDot[dot.id];
      const soSP = Array.isArray(chiTiet) ? chiTiet.length : 0;

      const matchStt =
        this.boLoc.stt == null || soSP === +this.boLoc.stt;

      return matchDot && matchStt;
    });
  }

}
