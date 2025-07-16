import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { FilterProductCodePipe } from './filter-product-code.pipe'; // Đường dẫn đúng nhé


@Component({
  selector: 'app-duyetphieunhap',
  standalone: true,
  imports: [CommonModule, FormsModule,  FilterProductCodePipe],
  templateUrl: './duyetphieunhap.component.html',
  styleUrls: ['./duyetphieunhap.component.css']
})
export class DuyetphieunhapComponent implements OnInit {
  danhSachPhieu: any[] = [];
  selectedPhieu: any = null;
  popupNhapKhoMo: boolean = false;
  danhSachSanPhamNhap: any[] = [];
  filterCode: string = '';
  danhSachKhuVuc: any[] = [];
  danhSachMaTrung: string[] | null = null; // null: chưa kiểm tra, []: không trùng, ['A1']...

  //bộ lọc
  filter = {
  keyword: '',
  ngayBatDau: '',
  ngayKetThuc: '',
  trangThai: ''
  };

  danhSachPhieuGoc: any[] = []; // dữ liệu gốc từ API

  maCanKiemTra: string = '';
  ketQuaSanPham: any = null;

  kiemTraTrongKho() {
    if (!this.maCanKiemTra) {
      this.ketQuaSanPham = null;
      return;
    }

    this.http.get<any>(`http://localhost:3000/api/products-detail/check-ma/${this.maCanKiemTra}`).subscribe(res => {
      if (res.exists) {
        this.ketQuaSanPham = res.product;
      } else {
        this.ketQuaSanPham = {};
      }
    }, err => {
      console.error('Lỗi kiểm tra sản phẩm:', err);
      this.ketQuaSanPham = {};
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


  // Lấy thông tin người duyệt (admin hiện tại)
  adminName = sessionStorage.getItem('name') || '';
  adminEmail = sessionStorage.getItem('email') || '';

  // Phản hồi hệ thống nhập vào
  phanHoiHeThong: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPhieu();
  }

    loadPhieu() {
    this.http.get<any[]>('http://localhost:3000/api/phieu-nhap').subscribe(data => {
      this.danhSachPhieuGoc = data;
      this.locPhieu(); // Gọi hàm lọc ngay sau khi load
    });
  }

  locPhieu() {
  const { keyword, ngayBatDau, ngayKetThuc, trangThai } = this.filter;

  this.danhSachPhieu = this.danhSachPhieuGoc.filter(p => {
    const matchKeyword =
      !keyword ||
      p.receipt_code.toLowerCase().includes(keyword.toLowerCase()) ||
      p.supplier_name.toLowerCase().includes(keyword.toLowerCase());

    const matchNgayBatDau = !ngayBatDau || new Date(p.created_date) >= new Date(ngayBatDau);
    const matchNgayKetThuc = !ngayKetThuc || new Date(p.created_date) <= new Date(ngayKetThuc);

    const matchTrangThai = !trangThai || p.trang_thai === trangThai;

    return matchKeyword && matchNgayBatDau && matchNgayKetThuc && matchTrangThai;
  });
}


  xemChiTiet(phieu: any) {
    this.selectedPhieu = phieu;
    this.phanHoiHeThong = phieu.note_admin || ''; // Lấy phản hồi hệ thống nếu có
  }

  dongChiTiet() {
    this.selectedPhieu = null;
    this.phanHoiHeThong = '';
  }

  hoanTatKiemTra() {
    const newStatus = 'Đã duyệt';

    this.http.put(`http://localhost:3000/api/phieu-nhap/${this.selectedPhieu.id}/admin-cap-nhat`, {
      trang_thai: newStatus,
      note_admin: this.phanHoiHeThong,
      admin_account_email: this.adminEmail,
      admin_account_name: this.adminName
    }).subscribe(() => {
      alert('✅ Cập nhật thành công!');
      // Cập nhật lại trên UI
      this.selectedPhieu.trang_thai = newStatus;
      this.selectedPhieu.note_admin = this.phanHoiHeThong;
      this.selectedPhieu.admin_account_email = this.adminEmail;
      this.selectedPhieu.admin_account_name = this.adminName;
    });
    console.log({
      id: this.selectedPhieu.id,
      trang_thai: newStatus,
      note_admin: this.phanHoiHeThong,
      admin_account_email: this.adminEmail,
      admin_account_name: this.adminName
    });
    window.location.reload();

  }

  // Gọi API để mở popup xác nhận
moPopupNhapKho() {
  console.log('📢 Đã gọi mở popup');
  this.popupNhapKhoMo = true;

  // Lấy danh sách sản phẩm của phiếu nhập
  this.http.get<any[]>(`http://localhost:3000/api/phieu-nhap/${this.selectedPhieu.id}/san-pham`)
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

// Xác nhận nhập kho chính thức
xacNhanNhapKhoChinhThuc() {
  const maSanPham = this.danhSachSanPhamNhap.map(sp => sp.product_code);

  // 🔍 Gọi API kiểm tra mã trùng
  this.http.post<any>('http://localhost:3000/api/products-detail/check-multiple', {
    ma_san_pham: maSanPham
  }).subscribe(result => {
    this.danhSachMaTrung = result.duplicates || [];

    // ❌ Có mã trùng → báo lỗi và ngưng lại
    if (this.danhSachMaTrung && this.danhSachMaTrung.length > 0) {
      alert(`❌ Không thể nhập kho! Các mã sau đã tồn tại: ${this.danhSachMaTrung.join(', ')}`);
      return;
    }

    // ✅ Chuẩn bị danh sách sản phẩm
    const danhSachOK = this.danhSachSanPhamNhap.map(sp => {
      const oldCode = sp.old_product_code || sp.product_code;
      return {
        ...sp,
        supplier_name: this.selectedPhieu.supplier_name,
        logo_url: this.selectedPhieu.logo_url,
        old_product_code: oldCode,
        receipt_code: this.selectedPhieu.receipt_code
      };
    });

    // ❌ Kiểm tra thiếu thông tin
    const thongTinThieu = danhSachOK.some(sp =>
      !sp.product_code || !sp.product_name || !sp.product_type || !sp.unit ||
      !sp.unit_price || !sp.quantity || !sp.khu_vuc_id
    );
    if (thongTinThieu) {
      alert("⚠️ Vui lòng nhập đầy đủ thông tin cho tất cả sản phẩm!");
      return;
    }

    // ✅ Gửi nhập kho
    this.http.post('http://localhost:3000/api/nhap-kho', {
      phieu_id: this.selectedPhieu.id,
      danh_sach_san_pham: danhSachOK
    }).subscribe(() => {
      // ✅ Cập nhật trạng thái
      this.http.put(`http://localhost:3000/api/phieu-nhap/${this.selectedPhieu.id}/hoan-tat`, {
        trang_thai: 'Đã nhập hàng vào kho'
      }).subscribe(() => {
        alert('📦 Nhập kho thành công và trạng thái phiếu đã cập nhật!');
        this.popupNhapKhoMo = false;
        this.loadPhieu();
        this.selectedPhieu = null;
        this.danhSachMaTrung = null; // Reset lại
      });
    }, err => {
      alert('❌ Lỗi khi nhập kho!');
      console.error(err);
    });
  }, err => {
    alert('❌ Lỗi khi kiểm tra mã trùng!');
    console.error(err);
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


}
