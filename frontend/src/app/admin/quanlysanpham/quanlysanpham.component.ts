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

  sanPhamCapNhat: any = {};
  hienPopupCapNhat: boolean = false;

  fileAnh: File | null = null;
  fileLogo: File | null = null;

  previewAnh: string | null = null;
  previewLogo: string | null = null;

  sanPhamDuocChon: any = null;
  hienPopupChiTiet = false;

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

  danhSachChiTietTheoMa: any[] = [];

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
        this.selectedType = '';
      },
      error: (err) => {
        console.error('❌ Lỗi lấy loại hàng theo khu vực:', err);
      }
    });
    this.layDanhSachSanPham();
  }

  layDanhSachSanPham() {
    const params: any = {};
    if (this.keyword) params.keyword = this.keyword;
    if (this.selectedType) params.product_type = this.selectedType;
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
    this.sanPhamDuocChon = { ...sp };
    const sl = Number(this.sanPhamDuocChon.quantity) || 0;
    const kg1 = Number(this.sanPhamDuocChon.weight_per_unit) || 0;
    const gia = Number(this.sanPhamDuocChon.unit_price) || 0;
    const tongKg = sl * kg1;
    const m2_moi_kg = 5 / 500;
    this.sanPhamDuocChon.weight = tongKg;
    this.sanPhamDuocChon.area = +(tongKg * m2_moi_kg).toFixed(2);
    this.sanPhamDuocChon.total_price = sl * gia;
    this.hienPopupChiTiet = true;
  }

  dongPopup() {
    this.hienPopupChiTiet = false;
  }

  xoaSanPham(product_code: string) {
    if (!confirm(`Bạn có chắc muốn xoá toàn bộ sản phẩm mã "${product_code}" không?`)) {
      return;
    }

    this.http.delete(`http://localhost:3000/api/products-detail/xoa-theo-ma/${product_code}`).subscribe({
      next: () => {
        alert('✅ Đã xoá toàn bộ sản phẩm thành công!');
        this.layDanhSachSanPham();
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
      this.spMoi.image = file;
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
      this.spMoi.logo = file;
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
      manufacture_date: sp.manufacture_date?.split('T')[0],
      expiry_date: sp.expiry_date?.split('T')[0],
      weight_per_unit: sp.weight_per_unit ?? 1,
      area_per_unit: sp.area_per_unit ?? (5 / 500),
    };

    this.previewAnh = sp.image_url;
    this.previewLogo = sp.logo_url;
    this.hienPopupCapNhat = true;

    this.http.get<any[]>(`http://localhost:3000/api/products-detail/all-by-code/${sp.product_code}`)
      .subscribe({
        next: (data) => {
          // 🆕 Sửa đổi quan trọng: lưu lại số lượng ban đầu của từng dòng
          this.danhSachChiTietTheoMa = data.map(item => ({
            ...item,
            initialQuantity: item.quantity, // Thêm thuộc tính mới để lưu số lượng ban đầu
          }));
          this.capNhatTongKhoiLuong();
        },
        error: (err) => {
          console.error('❌ Lỗi lấy chi tiết theo mã:', err);
          this.danhSachChiTietTheoMa = [];
        }
      });
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

capNhatSanPham(dongPopupSauKhiLuu: boolean = false) {
  const sp = this.sanPhamCapNhat;
  const formData = new FormData();

  // Log để kiểm tra dữ liệu gửi đi
  console.log('👉 Dữ liệu gửi cập nhật:', sp);

  formData.append('product_code', sp.product_code || '');
  formData.append('product_name', sp.product_name || '');
  formData.append('product_type', sp.product_type || '');
  formData.append('unit', sp.unit || '');
  formData.append('quantity', sp.quantity?.toString() || '0');
  formData.append('unit_price', sp.unit_price?.toString() || '0');
  formData.append('weight', sp.weight?.toString() || '0');
  formData.append('area', sp.area?.toString() || '0');
  formData.append('manufacture_date', sp.manufacture_date || '');
  formData.append('expiry_date', sp.expiry_date || '');
  formData.append('weight_per_unit', sp.weight_per_unit?.toString() || '0.5');
  formData.append('area_per_unit', sp.area_per_unit?.toString() || '0.002');
  formData.append('location', sp.location || '');
  formData.append('khu_vuc_id', sp.khu_vuc_id?.toString() || '');
  formData.append('supplier_name', sp.supplier_name || '');
  formData.append('receipt_code', sp.receipt_code || '');
  formData.append('image_url', sp.image_url || '');
  formData.append('logo_url', sp.logo_url || '');

  if (this.fileAnh) {
    console.log('📷 Có file ảnh đính kèm:', this.fileAnh.name);
    formData.append('image', this.fileAnh);
  }

  if (this.fileLogo) {
    console.log('🧾 Có file logo đính kèm:', this.fileLogo.name);
    formData.append('logo', this.fileLogo);
  }

  this.http.put(`http://localhost:3000/api/products-detail/${sp.id}`, formData).subscribe({
    next: () => {
      this.layDanhSachSanPham();
      alert('✅ Cập nhật thành công!');
      if (dongPopupSauKhiLuu) {
        this.dongPopupCapNhat();
      }
    },
    error: err => {
      console.error('❌ Lỗi khi cập nhật:', err);
      alert(err.error?.error || '❌ Lỗi: ' + err.message);
    }
  });
  
}



  capNhatSoLuongTheoDong(dong: any) {
    const id = dong.id;
    const newQuantity = Number(dong.quantity);

    if (isNaN(newQuantity) || newQuantity < 0) {
      alert('Số lượng không hợp lệ. Vui lòng nhập một số dương.');
      return;
    }

    // Gửi yêu cầu cập nhật số lượng đến API backend
    this.http.put(`http://localhost:3000/api/products-detail/update-quantity/${id}`, { quantity: newQuantity }).subscribe({
      next: (response: any) => {
        // Cập nhật lại dữ liệu hiển thị trên giao diện
        // Dữ liệu tổng đã được backend tính toán và trả về, nên bạn có thể cập nhật
        // những giá trị này.
        this.sanPhamCapNhat.quantity = response.total_quantity;
        this.sanPhamCapNhat.weight = response.total_weight;
        this.sanPhamCapNhat.area = response.total_area;

        // Cập nhật lại số lượng ban đầu của dòng vừa sửa
        dong.initialQuantity = newQuantity;

        // Cập nhật lại danh sách sản phẩm chính để hiển thị
        this.layDanhSachSanPham();
      },
      error: (err) => {
        console.error('❌ Lỗi cập nhật:', err);
        // Hiển thị thông báo lỗi từ backend
        alert('❌ Lỗi: ' + (err.error?.error || 'Không thể cập nhật số lượng.'));
        // Khôi phục lại số lượng cũ nếu có lỗi
        dong.quantity = dong.initialQuantity;
      }
    });
  }

  updateQuantity(id: number, quantity: number, onSuccess?: () => void) {
    this.http.put(`http://localhost:3000/api/products-detail/update-quantity/${id}`, { quantity })
      .subscribe({
        next: () => {
          alert('✅ Đã cập nhật số lượng!');
          if (onSuccess) onSuccess();
        },
        error: err => {
          console.error('❌ Lỗi cập nhật:', err);
          alert('❌ Lỗi cập nhật số lượng!');
        }
      });
  }


  hienThiGia(gia: number | string): string {
    const giaSo = typeof gia === 'string' ? parseFloat(gia) : gia;
    return Number.isInteger(giaSo) ? giaSo.toString() : giaSo.toFixed(2);
  }

  capNhatTongKhoiLuong() {
    const weightPerUnit = Number(this.sanPhamCapNhat.weight_per_unit) || 0;
    const totalQuantity = this.danhSachChiTietTheoMa.reduce((sum, dong) => sum + Number(dong.quantity || 0), 0);
    const totalWeight = totalQuantity * weightPerUnit;
    const area = +(totalWeight * (5 / 500)).toFixed(1);

    console.log('👉 Tổng SL:', totalQuantity);
    console.log('👉 Tổng khối lượng:', totalWeight, 'kg');
    console.log('👉 Diện tích tính được:', area, 'm²');

    this.sanPhamCapNhat.weight = +totalWeight.toFixed(1);
    this.sanPhamCapNhat.area = area;
  }
}
