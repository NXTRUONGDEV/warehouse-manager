
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-duyetphieuxuat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './duyetphieuxuat.component.html',
  styleUrls: ['./duyetphieuxuat.component.css']
})
export class DuyetphieuxuatComponent implements OnInit {
  danhSachPhieu: any[] = [];
  danhSachPhieuGoc: any[] = []; // ✅ THÊM DÒNG NÀY

  selectedPhieu: any = null;
  popupNhapKhoMo: boolean = false;
  danhSachSanPhamNhap: any[] = [];
  filterCode: string = '';
  danhSachKhuVuc: any[] = [];
  danhSachMaTrung: string[] | null = null; // null: chưa kiểm tra, []: không trùng, ['A1']...

  maCanKiemTra: string = '';
  ketQuaSanPham: any = null;

  // Lấy thông tin người duyệt (admin hiện tại)
  adminName = sessionStorage.getItem('name') || '';
  adminEmail = sessionStorage.getItem('email') || '';

  // Phản hồi hệ thống nhập vào
  phanHoiHeThong: string = '';

  filter = {
  keyword: '',
  ngayBatDau: '',
  ngayKetThuc: '',
  trangThai: ''
};

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPhieu();
  }

  loadPhieu() {
    this.http.get<any[]>('http://localhost:3000/api/phieu-xuat').subscribe(data => {
      this.danhSachPhieuGoc = data;
      this.danhSachPhieu = [...data];
    });
  }

  locPhieu() {
  const { keyword, ngayBatDau, ngayKetThuc, trangThai } = this.filter;

  this.danhSachPhieu = this.danhSachPhieuGoc.filter(p => {
    const matchKeyword = !keyword ||
      p.receipt_code.toLowerCase().includes(keyword.toLowerCase()) ||
      p.receiver_name.toLowerCase().includes(keyword.toLowerCase());

    const matchTrangThai = !trangThai || p.trang_thai === trangThai;

    const created = new Date(p.created_date);
    const matchNgayBatDau = !ngayBatDau || created >= new Date(ngayBatDau);
    const matchNgayKetThuc = !ngayKetThuc || created <= new Date(ngayKetThuc);

    return matchKeyword && matchTrangThai && matchNgayBatDau && matchNgayKetThuc;
  });
}


  xemChiTiet(phieu: any) {
    this.selectedPhieu = phieu;
    this.phanHoiHeThong = phieu.note_admin || '';

    // 👇 Lấy sản phẩm chi tiết của phiếu
    this.http.get<any[]>(`http://localhost:3000/api/phieu-xuat/${phieu.id}/san-pham`)
      .subscribe(data => {
        this.selectedPhieu.products = data.map(sp => ({
          ...sp,
          manufacture_date: sp.manufacture_date?.slice(0, 10),
          expiry_date: sp.expiry_date?.slice(0, 10),
          total_price: sp.unit_price * sp.quantity
        }));
      }, err => {
        console.error('❌ Không lấy được danh sách sản phẩm của phiếu xuất', err);
        this.selectedPhieu.products = []; // để tránh lỗi undefined
      });
  }


  dongChiTiet() {
    this.selectedPhieu = null;
    this.phanHoiHeThong = '';
  }

  hoanTatKiemTra() {
    if (!this.selectedPhieu || !this.selectedPhieu.products || this.selectedPhieu.products.length === 0) {
      alert('❌ Không có sản phẩm nào để kiểm tra.');
      return;
    }

    const checkPromises = this.selectedPhieu.products.map((sp: any) => {
      return this.http.get<any>(`http://localhost:3000/api/products-detail/check-available/${sp.product_code}/${sp.quantity}`).toPromise();
    });

    Promise.all(checkPromises).then(results => {
      const khongDuHang = results.filter(r => !r.enough);

      if (khongDuHang.length > 0) {
        const danhSach = khongDuHang.map(sp => sp.product_code).join(', ');
        alert(`❌ Không thể duyệt phiếu vì các sản phẩm sau không đủ số lượng trong kho: ${danhSach}`);
        return;
      }

      // Nếu đủ thì cập nhật trạng thái
      const newStatus = 'Đã duyệt';

      this.http.put(`http://localhost:3000/api/phieu-xuat/${this.selectedPhieu.id}/admin-cap-nhat`, {
        trang_thai: newStatus,
        note_admin: this.phanHoiHeThong,
        admin_account_email: this.adminEmail,
        admin_account_name: this.adminName
      }).subscribe(() => {
        alert('✅ Kiểm tra hoàn tất! Trạng thái đã cập nhật sang "Đã duyệt". Bạn có thể xuất hàng.');

        // ✅ Cập nhật thông tin hiển thị
        this.selectedPhieu.trang_thai = newStatus;
        this.selectedPhieu.note_admin = this.phanHoiHeThong;
        this.selectedPhieu.admin_account_email = this.adminEmail;
        this.selectedPhieu.admin_account_name = this.adminName;

        // ✅ Tự động đóng popup
        this.popupNhapKhoMo = false;
      });
    }).catch(err => {
      console.error('❌ Lỗi kiểm tra số lượng sản phẩm:', err);
      alert('❌ Lỗi khi kiểm tra số lượng sản phẩm.');
    });
  }



  capNhatThanhTien(sp: any) {
    const unitPrice = Number(sp.unit_price) || 0;
    const quantity = Number(sp.quantity ?? 1); // nếu undefined thì mặc định là 1
    sp.total_price = unitPrice * quantity;
    this.capNhatTongTien();
  }

  capNhatTongTien() {
    let total = 0;
    for (let sp of this.danhSachSanPhamNhap) {
      total += sp.total_price || 0;
    }
    if (this.selectedPhieu) {
      this.selectedPhieu.total_amount = total;
    }
  }

  kiemTraTrongKho() {
      if (!this.maCanKiemTra) {
        this.ketQuaSanPham = null;
        return;
      }

      this.http.get<any>(`http://localhost:3000/api/products-detail/check-ma/${this.maCanKiemTra}`).subscribe(res => {
        if (res.exists) {
          const product = res.product;

          // 👇 Chuyển kiểu rõ ràng, tránh undefined hoặc string
          product.quantity = Number(product.quantity) || 0;
          product.unit_price = Number(product.unit_price) || 0;
          product.weight_per_unit = Number(product.weight_per_unit) || 0;

          // 👇 Tính tổng khối lượng và tổng tiền
          product.total_weight = product.quantity * product.weight_per_unit;
          product.total_price = product.quantity * product.unit_price;

          this.ketQuaSanPham = product;
        } else {
          this.ketQuaSanPham = {};
        }
      }, err => {
        console.error('Lỗi kiểm tra sản phẩm:', err);
        this.ketQuaSanPham = {};
      });
    }


  // Xác nhận xuất kho chính thức
  xacNhanXuatKhoChinhThuc() {
    if (!this.selectedPhieu) return;

    const id = this.selectedPhieu.id;
    this.http.post(`http://localhost:3000/api/phieu-xuat/xac-nhan-xuat-kho/${id}`, {}).subscribe({
      next: (res: any) => {
        alert(res.message || '✔️ Xác nhận thành công');
        this.selectedPhieu.trang_thai = 'Đã xuất hàng khỏi kho';
        this.popupNhapKhoMo = false;
        
      },
      error: (err) => {
        alert(err.error?.message || '❌ Lỗi khi xác nhận xuất kho');
      }
    });
  }

//Những chức năng này chưa kiểm chứng

  // Gọi API để mở popup xác nhận
  moPopupNhapKho() {
    console.log('📢 Đã gọi mở popup');
    this.popupNhapKhoMo = true;

    // Lấy danh sách sản phẩm của phiếu nhập
    this.http.get<any[]>(`http://localhost:3000/api/phieu-xuat/${this.selectedPhieu.id}/san-pham`)
      .subscribe(data => {
        this.danhSachSanPhamNhap = data.map(sp => ({
          ...sp,
          old_product_code: sp.product_code, // 👈 lưu mã cũ
          trung_ma: false,
          // Định dạng lại ngày để phù hợp với input type="date"
          manufacture_date: sp.manufacture_date ? sp.manufacture_date.slice(0, 10) : '',
          expiry_date: sp.expiry_date ? sp.expiry_date.slice(0, 10) : ''
        }));
      }, err => {
        console.error('❌ Lỗi khi lấy sản phẩm phiếu:', err);
      });

    // Lấy danh sách khu vực kho
    this.http.get<any[]>('http://localhost:3000/api/khu-vuc')
      .subscribe(data => {
        this.danhSachKhuVuc = data;
      }, err => {
        console.error('❌ Lỗi khi lấy khu vực:', err);
      });
  }

  // Đóng popup
  dongPopup() {
    this.popupNhapKhoMo = false;
    this.danhSachSanPhamNhap = [];
  }

  kiemTraTrungMa(sp: any) {
    if (!sp.product_code) {
      sp.trung_ma = false;
      return;
    }

    this.http.get<any>(`http://localhost:3000/api/products-detail/check-ma/${sp.product_code}`)
      .subscribe(data => {
        sp.trung_ma = data.exists; // ✅ Gán chính xác
      }, error => {
        sp.trung_ma = false;
      });
  }

  onFileSelected(event: any, sp: any) {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('image', file);

      this.http.post<any>('http://localhost:3000/api/upload', formData).subscribe(res => {
        sp.image_url = res.imageUrl; // Lưu đường dẫn ảnh mới
      });
    }
  }

  huyPhieu(p: any) {
    if (p.trang_thai === 'Đã gửi phiếu') {
      this.http.put(`http://localhost:3000/api/phieu-xuat-kho/${p.id}/huy`, { trang_thai: 'Đã hủy' }).subscribe({
        next: () => {
          p.trang_thai = 'Đã hủy';
        },
        error: () => {
          alert('Hủy phiếu thất bại, vui lòng thử lại');
        }
      });
    }
  }


}
