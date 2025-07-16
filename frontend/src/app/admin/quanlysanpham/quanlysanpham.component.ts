import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quanlysanpham',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quanlysanpham.component.html',
  styleUrls: ['./quanlysanpham.component.css']
})
export class QuanlysanphamComponent implements OnInit {
  danhSachSanPham: any[] = [];
  danhSachKhuVuc: any[] = [];
  loaiHang: string[] = [];
 
  sanPhamCapNhat: any = {};            // Dữ liệu sản phẩm đang chỉnh sửa
  hienPopupCapNhat: boolean = false;   // Hiển thị popup cập nhật hay không

  fileAnh: File | null = null;         // File ảnh sản phẩm mới
  fileLogo: File | null = null;        // File logo NCC mới

  previewAnh: string | null = null;    // Link preview ảnh sản phẩm
  previewLogo: string | null = null;   // Link preview logo NCC

  
  // Popup chi tiết
  sanPhamDuocChon: any = null;
  hienPopupChiTiet = false;

  // Bộ lọc
  keyword = '';
  selectedType = '';
  selectedKhuVuc = '';
  fromDate = '';
  toDate = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  hienPopupThem = false;

  spMoi: any = {
  product_code: '',
  product_name: '',
  product_type: '',
  unit: '',
  image_url: 'Chưa có ảnh',
  quantity: 0,
  weight: 0,
  area: 0,
  unit_price: 0,
  total_price: 0,
  manufacture_date: '',
  expiry_date: '',
  khu_vuc_id: '',
  location: '',
  supplier_name: 'T&H Warehouse Manager',
  logo_url: 'http://localhost:3000/uploads/logogpt.png',
  receipt_code: ''
};

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.layDanhSachSanPham();
    this.layKhuVuc();
    this.layLoaiHangTuDB();
  }

  onKhuVucChange() {
  const params: any = {};

  if (this.selectedKhuVuc) {
    params.khu_vuc_id = this.selectedKhuVuc;
  }

  this.http.get<string[]>('http://localhost:3000/api/products-detail/types', { params }).subscribe({
    next: (data) => {
      this.loaiHang = data;
      this.selectedType = ''; // reset loại khi đổi khu
    },
    error: (err) => {
      console.error('❌ Lỗi lấy loại hàng theo khu vực:', err);
    }
  });

  // Lọc lại danh sách sản phẩm nếu muốn
  this.layDanhSachSanPham();
}


  layDanhSachSanPham() {
    const params: any = {};
    if (this.keyword) params.keyword = this.keyword;
    if (this.selectedType) params.product_type = this.selectedType;  // ✅ CHỈNH ĐÚNG TÊN
    if (this.selectedKhuVuc) params.khu_vuc_id = this.selectedKhuVuc;
    if (this.fromDate) params.fromDate = this.fromDate;
    if (this.toDate) params.toDate = this.toDate;
    if (this.minPrice !== null) params.minPrice = this.minPrice;
    if (this.maxPrice !== null) params.maxPrice = this.maxPrice;


    this.http.get<any[]>('http://localhost:3000/api/products-detail/filter', { params }).subscribe(
      (data) => this.danhSachSanPham = data,
      (err) => console.error('❌ Lỗi lọc sản phẩm:', err)
    );
  }

  layKhuVuc() {
    this.http.get<any[]>('http://localhost:3000/api/khu-vuc').subscribe(
      (data) => this.danhSachKhuVuc = data,
      (err) => console.error('❌ Lỗi khi lấy khu vực:', err)
    );
  }

  layLoaiHangTuDB() {
    this.http.get<string[]>('http://localhost:3000/api/products-detail/types').subscribe({
      next: (data) => this.loaiHang = data,
      error: (err) => console.error('❌ Lỗi lấy loại hàng:', err)
    });
  }

  moPopupChiTiet(sp: any) {
    this.sanPhamDuocChon = sp;
    this.hienPopupChiTiet = true;
  }

  dongPopup() {
    this.hienPopupChiTiet = false;
  }

  xoaSanPham(id: number) {
  if (!confirm('Bạn có chắc muốn xoá sản phẩm này không?')) {
    return;
  }

  this.http.delete(`http://localhost:3000/api/products-detail/${id}`).subscribe({
    next: () => {
      alert('✅ Xoá sản phẩm thành công!');
      this.layDanhSachSanPham();  // Tải lại danh sách sản phẩm sau khi xoá
    },
    error: (err) => {
      alert('❌ Lỗi khi xoá sản phẩm: ' + err.message);
    }
  });
}


  moPopupThemSanPham() {
  this.hienPopupThem = true;
}

dongPopupThem() {
  this.hienPopupThem = false;
}

chonFileAnh(event: any) {
  const file = event.target.files[0];
  if (file) {
    this.spMoi.image = file; // Gửi file thật lên backend

    const reader = new FileReader();
    reader.onload = () => {
      this.previewAnh = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
}

chonFileLogo(event: any) {
  const file = event.target.files[0];
  if (file) {
    this.spMoi.logo = file; // Gửi file thật lên backend

    const reader = new FileReader();
    reader.onload = () => {
      this.previewLogo = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
}

themSanPham() {
  const formData = new FormData();

  console.log('Dữ liệu spMoi:', this.spMoi);
  
  Object.keys(this.spMoi).forEach(key => {
    const val = this.spMoi[key];
    if (val !== undefined && typeof val !== 'object') {
      formData.append(key, val);
    }
  });

  if (this.fileAnh) formData.append('image', this.fileAnh);
  if (this.fileLogo) formData.append('logo', this.fileLogo);

  this.http.post('http://localhost:3000/api/products-detail', formData).subscribe({
    next: () => {
      alert('✅ Nhập thành công!');
      this.hienPopupThem = false;
      this.fileAnh = null;
      this.fileLogo = null;
      this.previewAnh = null;
      this.previewLogo = null;
      this.spMoi = {};
      this.layDanhSachSanPham();
    },
    error: err => {
      console.error('Lỗi khi gọi API:', err);
      alert('❌ Lỗi: ' + (err.error?.error || err.message));
    }
  });
}

moPopupCapNhat(sp: any) {
  this.sanPhamCapNhat = {
    ...sp,
    manufacture_date: sp.manufacture_date?.split('T')[0], // lấy "YYYY-MM-DD"
    expiry_date: sp.expiry_date?.split('T')[0]
  };
  this.previewAnh = sp.image_url;
  this.previewLogo = sp.logo_url;
  this.hienPopupCapNhat = true;
}


dongPopupCapNhat() {
  this.hienPopupCapNhat = false;
}

chonFileAnhCapNhat(event: any) {
  const file = event.target.files[0];
  if (file) {
    this.fileAnh = file;

    const reader = new FileReader();
    reader.onload = e => this.previewAnh = reader.result as string;
    reader.readAsDataURL(file);
  }
}

chonFileLogoCapNhat(event: any) {
  const file = event.target.files[0];
  if (file) {
    this.fileLogo = file;

    const reader = new FileReader();
    reader.onload = e => this.previewLogo = reader.result as string;
    reader.readAsDataURL(file);
  }
}


// 👉 Hàm cập nhật sản phẩm
capNhatSanPham() {
  const formData = new FormData();
  const sp = this.sanPhamCapNhat;

  // Gửi các trường text
  Object.keys(sp).forEach(key => {
    const val = sp[key];
    if (val !== undefined && typeof val !== 'object') {
      formData.append(key, val);
    }
  });

  // Gửi file nếu có
  if (this.fileAnh) formData.append('image', this.fileAnh);
  if (this.fileLogo) formData.append('logo', this.fileLogo);

  // Gửi request PUT đến backend
  this.http.put(`http://localhost:3000/api/products-detail/${sp.id}`, formData).subscribe({
    next: () => {
      alert('✅ Cập nhật thành công!');
      this.dongPopupCapNhat();
      this.layDanhSachSanPham();
    },
    error: err => {
    if (err.status === 400 && err.error?.error) {
      alert(err.error.error); // hiện: ⚠️ Mã sản phẩm đã tồn tại!
    } else {
      alert('❌ Lỗi: ' + err.message);
    }
  }
  });
}

}
