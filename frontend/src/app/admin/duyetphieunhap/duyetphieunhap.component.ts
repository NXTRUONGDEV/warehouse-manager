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

  // Lấy thông tin người duyệt (admin hiện tại)
  adminName = sessionStorage.getItem('name') || '';
  adminEmail = sessionStorage.getItem('email') || '';

  // Phản hồi hệ thống nhập vào
  phanHoiHeThong: string = '';

  popupChonViTriMo: boolean = false;
  sanPhamDangChon: any = null;
  danhSachPallet: any[] = [];
  palletGridPopup: any[][] = [];

  phanBoCanConLai = 0;
  palletsDaChon: any[] = [];

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

  this.http.post<any>('http://localhost:3000/api/products-detail/check-multiple', {
    ma_san_pham: maSanPham
  }).subscribe(result => {
    this.danhSachMaTrung = result.duplicates || [];

    if (this.danhSachMaTrung !== null && this.danhSachMaTrung.length > 0) {
      alert(`❌ Không thể nhập kho! Mã trùng: ${this.danhSachMaTrung.join(', ')}`);
      return;
    }

    // ✅ Chuẩn bị danh sách gửi đi (chia theo từng pallet)
    const danhSachOK: any[] = [];

    for (let sp of this.danhSachSanPhamNhap) {
      const base = {
        product_code: sp.product_code,
        product_name: sp.product_name,
        product_type: sp.product_type,
        image_url: sp.image_url,
        unit: sp.unit,
        quantity: sp.quantity,
        unit_price: sp.unit_price,
        total_price: sp.total_price,
        manufacture_date: sp.manufacture_date,
        expiry_date: sp.expiry_date,
        supplier_name: this.selectedPhieu.supplier_name,
        logo_url: this.selectedPhieu.logo_url,
        old_product_code: sp.old_product_code || sp.product_code,
        receipt_code: this.selectedPhieu.receipt_code
      };

      const pallets = sp.ds_pallet || [];
      const soPallet = pallets.length || 1;
      const weightPer = sp.weight / soPallet;
      const areaPer = sp.area / soPallet;

      if (soPallet > 0) {
        for (const p of pallets) {
          danhSachOK.push({
            ...base,
            location: p.name,
            khu_vuc_id: sp.khu_vuc_id,
            weight: p.added_weight || weightPer,
            quantity: p.added_quantity, // ✅ PHẢI CÓ dòng này: số lượng tương ứng với khối lượng chia
            area: p.added_area || areaPer
          });
        }
      } else {
        danhSachOK.push({
          ...base,
          location: sp.location,
          khu_vuc_id: sp.khu_vuc_id,
          weight: sp.weight,
          area: sp.area
        });
      }
    }

    // ❌ Kiểm tra thiếu thông tin
    const isMissing = danhSachOK.some(sp =>
      !sp.product_code || !sp.product_name || !sp.product_type || !sp.unit ||
      !sp.unit_price || !sp.quantity || !sp.khu_vuc_id || !sp.location
    );

    if (isMissing) {
      alert("⚠️ Vui lòng nhập đủ thông tin cho tất cả sản phẩm!");
      return;
    }

    // ✅ Gửi vào API nhập kho
    this.http.post('http://localhost:3000/api/nhap-kho', {
      phieu_id: this.selectedPhieu.id,
      danh_sach_san_pham: danhSachOK
    }).subscribe(() => {
      // Cập nhật trạng thái
      this.http.put(`http://localhost:3000/api/phieu-nhap/${this.selectedPhieu.id}/hoan-tat`, {
        trang_thai: 'Đã nhập hàng vào kho'
      }).subscribe(() => {
        alert('📦 Nhập kho thành công!');
        this.popupNhapKhoMo = false;
        this.loadPhieu();
        this.selectedPhieu = null;
        this.danhSachMaTrung = null;
      });
    }, err => {
      alert('❌ Lỗi khi lưu hàng!');
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

/* Mới  */
moPopupChonViTri(sp: any) {
  if (!sp.khu_vuc_id) {
    alert('⚠️ Vui lòng chọn khu vực trước khi phân bổ vị trí pallet!');
    return;
  }

  this.sanPhamDangChon = sp;
  this.phanBoCanConLai = sp.weight; // hoặc tính toán theo nhu cầu
  this.palletsDaChon = [];

  this.layPalletTheoKhu(sp.khu_vuc_id);  // ✅ Chỉ gọi khi chắc chắn có khu_vuc_id
  this.popupChonViTriMo = true;
}

layPalletTheoKhu(khuVucId: number) {
  this.http.get<any[]>(`http://localhost:3000/api/kho/area/${khuVucId}`).subscribe({
    next: data => {
      // Reset trước
      this.danhSachPallet = data;

      // 🔁 Duyệt tất cả sản phẩm nhập
      for (const sp of this.danhSachSanPhamNhap) {
        if (sp.ds_pallet && sp.khu_vuc_id === khuVucId) {
          for (const p of sp.ds_pallet) {
            const pallet = data.find(x => x.name === p.name);
            if (pallet) {
              pallet.weightUsed += p.added_weight; // ✅ cộng thêm
            }
          }
        }
      }

      // Chia lại thành 10x10
      this.palletGridPopup = [];
      for (let i = 0; i < 100; i += 10) {
        this.palletGridPopup.push(data.slice(i, i + 10));
      }
    },
    error: err => console.error('❌ Lỗi khi lấy pallet:', err)
  });
}

chonPallet(pallet: any) {
  if (!this.sanPhamDangChon.ds_pallet) {
    this.sanPhamDangChon.ds_pallet = [];
  }

  const palletDaChonIndex = this.sanPhamDangChon.ds_pallet.findIndex(
    (p: any) => p.name === pallet.name
  );

  // 👉 Nếu đã chọn trước, thì bỏ chọn
  if (palletDaChonIndex !== -1) {
    const daThem = this.sanPhamDangChon.ds_pallet[palletDaChonIndex];
    pallet.weightUsed -= daThem.added_weight;
    this.sanPhamDangChon.ds_pallet.splice(palletDaChonIndex, 1);
    return;
  }

  const weightPerUnit = this.sanPhamDangChon.weight / this.sanPhamDangChon.quantity; // kg/thùng
  const quantityConLai = this.sanPhamDangChon.quantity - this.sanPhamDangChon.ds_pallet.reduce(
    (sum: number, p: { added_quantity: number }) => sum + p.added_quantity,
    0
  );

  const palletTrongKg = 500 - pallet.weightUsed;
  const quantityCoTheThem = Math.min(
    quantityConLai,
    Math.floor(palletTrongKg / weightPerUnit)
  );

  if (quantityCoTheThem <= 0) {
    alert('❌ Pallet không đủ chỗ hoặc đã phân hết số lượng!');
    return;
  }

  const weightThem = quantityCoTheThem * weightPerUnit;

  this.sanPhamDangChon.ds_pallet.push({
    name: pallet.name,
    added_quantity: quantityCoTheThem,
    added_weight: weightThem
  });

  pallet.weightUsed += weightThem;
}

xacNhanViTriHang() {
  const daChon: { name: string; added_weight: number; added_quantity: number }[] = this.sanPhamDangChon.ds_pallet || [];

  const tongKL = daChon.reduce((sum: number, p: { added_weight: number }) => sum + p.added_weight, 0);
  const tongSL = daChon.reduce((sum: number, p: { added_quantity: number }) => sum + p.added_quantity, 0);

  const requiredKL = this.sanPhamDangChon.weight;
  const requiredSL = this.sanPhamDangChon.quantity;
  const epsilon = 0.01;

  if (Math.abs(tongKL - requiredKL) > epsilon || tongSL !== requiredSL) {
    alert(`❌ Thiếu thông tin:
- Khối lượng đã phân: ${tongKL.toFixed(2)} / ${requiredKL} kg
- Số lượng đã phân: ${tongSL} / ${requiredSL} thùng`);
    return;
  }

  this.sanPhamDangChon.location = daChon.map((p: { name: string }) => p.name).join(', ');
  alert('✅ Đã xác nhận vị trí để hàng!');
  this.popupChonViTriMo = false;
}


laPalletDangChon(pallet: { name: string }): boolean {
  if (!this.sanPhamDangChon?.ds_pallet) return false;
  return this.sanPhamDangChon.ds_pallet.some((p: { name: string }) => p.name === pallet.name);
}


}
