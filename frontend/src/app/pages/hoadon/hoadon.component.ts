import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ⬅️ Thêm dòng này
import html2pdf from 'html2pdf.js';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-hoadon',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './hoadon.component.html',
  styleUrls: ['./hoadon.component.css']
})
export class HoadonComponent implements OnInit {
  hoaDonList: any[] = [];

  //Bộ lọc
  filteredHoaDonList: any[] = [];

    filter = {
    loai: '', // 'Phiếu nhập kho' | 'Phiếu xuất kho' | ''
    ngayBatDau: '',
    ngayKetThuc: '',
    tongTienMin: null,
    tongTienMax: null,
    trangThai: '',
    keyword: ''
  };

  xemChiTiet: boolean = false;              // Trạng thái xem chi tiết
  selectedHoaDon: any = null;              // Hóa đơn đang được chọn

  // Biến mở popup cập nhật
  capNhatMo: boolean = false;
  capNhatXuatMo: boolean = false;      // popup phiếu xuất
  phieuDangCapNhat: any = null;

  previewLogo: string | null = null;

  constructor(private http: HttpClient) {}

ngOnInit(): void {
  const userId = sessionStorage.getItem('id');
  if (userId) {
    this.http.get<any[]>(`http://localhost:3000/api/hoa-don/${userId}`).subscribe({
      next: (data) => {
        this.hoaDonList = data.map(hd => ({
          ...hd,
          daXuatHoaDon: !!hd.da_xuat_hoa_don
        }));
        this.locHoaDon(); // 👉 Áp dụng bộ lọc ban đầu
      },
      error: (err) => {
        console.error(err);
        alert('❌ Lỗi khi lấy danh sách hóa đơn');
      }
    });
  } else {
    alert('❌ Bạn cần đăng nhập!');
  }
}


  // Khi người dùng bấm "Xem chi tiết"
  xemChiTietHoaDon(hd: any) {
    const formatDate = (val: any): string | null => {
      if (!val) return null;
      const date = new Date(val);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0]; // yyyy-MM-dd
    };

    this.selectedHoaDon = hd;

    this.phieuDangCapNhat = {
      ...hd,
      created_date: formatDate(hd.created_date),
      meeting_date: formatDate(hd.meeting_date),
      delivery_date: formatDate(hd.delivery_date),
      products: (hd.products || []).map((sp: any) => ({
        ...sp,
        manufacture_date: formatDate(sp.manufacture_date),
        expiry_date: formatDate(sp.expiry_date),
      }))
    };

    // Render barcode sau khi DOM đã cập nhật
    setTimeout(() => {
      hd.products?.forEach((sp: any) => {
        const svgElement = document.getElementById('barcode-' + sp.product_code);
        if (svgElement) {
          JsBarcode(svgElement, sp.product_code, {
            format: "CODE128",
            displayValue: false,
            height: 40,
            width: 1.5,
            margin: 0
          });
        }
      });
    }, 100); // đợi DOM vẽ xong
  }

  // Đóng modal chi tiết
  dongChiTiet() {
    this.selectedHoaDon = null;
    this.xemChiTiet = false;
  }

  // ✅ Lấy class tương ứng với trạng thái thanh trạng thái
  getStepClass(trangThai: string, step: string): string {
    const steps = [
      'Đã gửi phiếu',
      'Đã duyệt',
      'Đã nhập hàng vào kho'
    ];
    const currentStepIndex = steps.indexOf(trangThai);
    const thisStepIndex = steps.indexOf(step);
    return currentStepIndex >= thisStepIndex ? 'step active' : 'step';
  }

getStepClassXuat(trangThai: string, step: string): string {
  const steps = ['Đã gửi phiếu', 'Đã duyệt', 'Đã xuất hàng khỏi kho'];  // đúng với tên bước 3
  const currentStepIndex = steps.indexOf(trangThai);
  const thisStepIndex = steps.indexOf(step);
  return currentStepIndex >= thisStepIndex ? 'step active' : 'step';
}


  
capNhatPhieuNhap(hd: any) {
  this.capNhatMo = true;
  this.capNhatXuatMo = false; // ❗ Tắt popup phiếu xuất nếu đang mở

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toISOString().substring(0, 10);
  };

  this.phieuDangCapNhat = {
    ...hd,
    created_date: formatDate(hd.created_date),
    meeting_date: formatDate(hd.meeting_date),
    products: hd.products.map((p: any) => ({
      ...p,
      manufacture_date: formatDate(p.manufacture_date),
      expiry_date: formatDate(p.expiry_date),
      preview_image: null
    }))
  };

  this.phieuDangCapNhat.products.forEach((sp: any, i: number) => {
    const weight = parseFloat(sp.weight) || 0;
    const quantity = parseFloat(sp.quantity) || 0;

    if ((!sp.kg_per_unit || sp.kg_per_unit === 0) && weight > 0 && quantity > 0) {
      sp.kg_per_unit = +(weight / quantity).toFixed(2);
    }

    this.capNhatKhoiLuongVaDienTich(i);
  });
}



  dongPopupCapNhat() {
    this.capNhatMo = false;
    this.phieuDangCapNhat = null;
    this.capNhatXuatMo = false;
    
  }


  luuCapNhatPhieu() {
    const phieu = this.phieuDangCapNhat;

    if (!phieu.supplier_address || !phieu.meeting_date) {
      alert("⚠️ Vui lòng nhập đầy đủ địa chỉ và ngày hẹn.");
      return;
    }

    this.http.put(`http://localhost:3000/api/phieu-nhap/${phieu.id}`, {
      supplier_name: phieu.supplier_name,
      supplier_address: phieu.supplier_address,
      meeting_date: phieu.meeting_date,
      supplier_account_email: phieu.supplier_account_email,
      logo_url: phieu.logo_url,
      note: phieu.note,
      note_admin: phieu.note_admin,
      products: phieu.products.map((sp: any) => ({
      ...sp,
      image_url: sp.preview_image ? sp.preview_image : sp.image_url
    }))
    }).subscribe(() => {
      alert('✅ Phiếu đã được cập nhật!');
      this.capNhatMo = false;
      this.phieuDangCapNhat = null;
      this.ngOnInit(); // reload lại danh sách
      this.selectedHoaDon = null;
      this.xemChiTiet = false;
    });
  }


  onLogoSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('image', file); // phải khớp với multer single('image')

      this.http.post<any>('http://localhost:3000/api/upload', formData).subscribe({
        next: (res) => {
          this.previewLogo = res.imageUrl; // ← Dùng để hiển thị
          this.phieuDangCapNhat.logo_url = res.imageUrl; // ← Gán URL ảnh trả về
        },
        error: (err) => {
          alert('❌ Upload logo thất bại');
          console.error(err);
        }
      });
    }
  }

  onProductImageSelected(event: any, product: any) {
    const file: File = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        product.preview_image = e.target.result; // Cho xem trước
        product.image_url = product.preview_image; // Gán luôn nếu muốn lưu base64
      };
      reader.readAsDataURL(file);
    }
  }

  getTongTien(phieu: any): number {
    if (!phieu || !phieu.products) return 0;
    return phieu.products.reduce((tong: number, sp: any) =>
      tong + ((sp.quantity || 0) * (sp.unit_price || 0)), 0);
  }

  getStepClassXuatKho(trangThai: string, step: string): string {
    const steps = [
      'Chờ xác nhận',
      'Xác nhận đơn hàng - Đang chuẩn bị',
      'Chuẩn bị xong - chờ giao hàng',
      'Hoàn tất giao hàng'
    ];
    const currentStep = steps.indexOf(trangThai);
    const thisStep = steps.indexOf(step);
    return currentStep >= thisStep ? 'step active' : 'step';
  }

  thanhToan(hd: any) {
  if (hd.trang_thai !== 'Chuẩn bị xong - chờ giao hàng') {
    alert('⚠️ Phiếu chưa sẵn sàng để thanh toán.');
    return;
  }

  // 👉 Ở đây bạn có thể gọi API thanh toán, hoặc điều hướng sang trang thanh toán
  alert(`✅ Sẵn sàng thanh toán cho phiếu: ${hd.receipt_code}`);
  
  // Ví dụ: this.router.navigate(['/thanh-toan', hd.id]);
}

// Xử lý mở popup cập nhật phiếu xuất
capNhatPhieuXuat(phieu: any) {
  this.capNhatXuatMo = true;
  this.capNhatMo = false;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toISOString().substring(0, 10); // yyyy-MM-dd
  };

  this.phieuDangCapNhat = {
    ...phieu,
    created_date: formatDate(phieu.created_date),
    delivery_date: formatDate(phieu.delivery_date), // ✅ Quan trọng
    products: (phieu.products || []).map((sp: any) => ({
      ...sp,
      manufacture_date: formatDate(sp.manufacture_date),
      expiry_date: formatDate(sp.expiry_date),
    }))
  };
}


capNhatKhoiLuongVaDienTich(index: number) {
  const sp = this.phieuDangCapNhat.products[index];
  const kgPerUnit = parseFloat(sp.kg_per_unit) || 0;
  const quantity = parseInt(sp.quantity) || 0;

  sp.weight = +(kgPerUnit * quantity).toFixed(2);     // Trọng lượng = khối lượng mỗi SP * số lượng
  sp.area = +(sp.weight / 250).toFixed(2);             // Giả định: 1m² chứa 250kg (bạn có thể thay đổi)
}

xuatHoaDonNhap(hd: any) {
  const element = document.getElementById('hoa-don-xuat-pdf');
  if (!element) return;

  const images = element.getElementsByTagName('img');
  const promises: Promise<void>[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img.complete) {
      promises.push(new Promise((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }));
    }
  }

  Promise.all(promises).then(() => {
    const opt = {
      margin: 0.2,
      filename: `${hd.receipt_code}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 1.2, useCORS: true },
      jsPDF: {
        unit: 'in',
        format: 'a3',
        orientation: 'landscape',
      },
    };

    html2pdf().set(opt).from(element).save().then(() => {
      // ✅ Sau khi xuất xong thì gọi API cập nhật trạng thái
      this.http.put(`http://localhost:3000/api/phieu-nhap/${hd.id}/xuat-hoa-don`, {})
        .subscribe(() => {
        hd.daXuatHoaDon = true;
      });
    });
  });
}

xuatHoaDonXuat(hd: any) {
  const element = document.getElementById('hoa-don-xuat-pdf');
  if (!element) return;

  const images = element.getElementsByTagName('img');
  const promises: Promise<void>[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img.complete) {
      promises.push(new Promise((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }));
    }
  }

  Promise.all(promises).then(() => {
    const opt = {
      margin: 0.2,
      filename: `${hd.receipt_code}_xuat.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 1.2, useCORS: true },
      jsPDF: {
        unit: 'in',
        format: 'a3',
        orientation: 'landscape',
      },
    };

    html2pdf().set(opt).from(element).save().then(() => {
      // ✅ Gọi API cập nhật trạng thái "đã xuất hóa đơn xuất"
      this.http.put(`http://localhost:3000/api/phieu-xuat/${hd.id}/xuat-hoa-don`, {})
        .subscribe(() => {
          hd.daXuatHoaDon = true;
        });
    });
  });
}

locHoaDon() {
  this.filteredHoaDonList = this.hoaDonList.filter(hd => {
    const ngayTao = new Date(hd.created_date || hd.created_at);
    const { loai, ngayBatDau, ngayKetThuc, tongTienMin, tongTienMax, trangThai, keyword } = this.filter;

    return (
      (!loai || hd.loai === loai) &&
      (!trangThai || hd.trang_thai === trangThai) &&
      (!ngayBatDau || new Date(ngayBatDau) <= ngayTao) &&
      (!ngayKetThuc || new Date(ngayKetThuc) >= ngayTao) &&
      (!tongTienMin || hd.total_amount >= tongTienMin) &&
      (!tongTienMax || hd.total_amount <= tongTienMax) &&
      (!keyword || hd.receipt_code?.toLowerCase().includes(keyword.toLowerCase()))
    );
  });
}

// xuatHoaDonNhapThongMinh
xuatHoaDonNhapThongMinh(hd: any) {
  const element = document.getElementById('hoa-don-xuat-pdf');
  if (!element) return;

  // Lưu trữ các thuộc tính CSS ban đầu
  const originalStyle = element.style.cssText;

  // Tạm thời loại bỏ padding và margin để giảm khoảng trắng
  element.style.padding = '0';
  element.style.margin = '0';
  element.style.boxSizing = 'border-box'; // Đảm bảo padding và border không thêm vào chiều rộng/cao

  const images = element.getElementsByTagName('img');
  const promises: Promise<void>[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img.complete) {
      promises.push(new Promise((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }));
    }
  }

  Promise.all(promises).then(() => {
    html2canvas(element, { scale: 2, useCORS: true }).then(canvas => {
      // Khôi phục lại style ban đầu sau khi đã chụp xong
      element.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/jpeg', 1.0);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [594, 420] // A2 landscape
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const padding = 0; // Đặt padding PDF là 0 vì khoảng trắng đã được loại bỏ trên HTML
      const contentWidth = pageWidth - 2 * padding;
      const contentHeight = pageHeight - 2 * padding;

      const imgRatio = canvas.width / canvas.height;
      const pdfRatio = contentWidth / contentHeight;

      let finalWidth = contentWidth;
      let finalHeight = contentHeight;

      if (imgRatio > pdfRatio) {
        finalHeight = contentWidth / imgRatio;
      } else {
        finalWidth = contentHeight * imgRatio;
      }

      const offsetX = (pageWidth - finalWidth) / 2;
      const offsetY = (pageHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, finalWidth, finalHeight);
      pdf.save(`${hd.receipt_code}.pdf`);

      this.http.put(`http://localhost:3000/api/phieu-nhap/${hd.id}/xuat-hoa-don`, {})
        .subscribe(() => {
          hd.daXuatHoaDon = true;
        });
    });
  });
}

// xuatHoaDonXuatThongMinh
xuatHoaDonXuatThongMinh(hd: any) {
  const element = document.getElementById('hoa-don-xuat-pdf');
  if (!element) return;

  // Lưu trữ các thuộc tính CSS ban đầu
  const originalStyle = element.style.cssText;

  // Tạm thời loại bỏ padding và margin để giảm khoảng trắng
  element.style.padding = '0';
  element.style.margin = '0';
  element.style.boxSizing = 'border-box'; // Đảm bảo padding và border không thêm vào chiều rộng/cao

  const images = element.getElementsByTagName('img');
  const promises: Promise<void>[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img.complete) {
      promises.push(new Promise((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }));
    }
  }

  Promise.all(promises).then(() => {
    html2canvas(element, { scale: 2, useCORS: true }).then(canvas => {
      // Khôi phục lại style ban đầu sau khi đã chụp xong
      element.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/jpeg', 1.0);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [594, 420] // A2 landscape
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const padding = 0; // Đặt padding PDF là 0
      const contentWidth = pageWidth - 2 * padding;
      const contentHeight = pageHeight - 2 * padding;

      const imgRatio = canvas.width / canvas.height;
      const pdfRatio = contentWidth / contentHeight;

      let finalWidth = contentWidth;
      let finalHeight = contentHeight;

      if (imgRatio > pdfRatio) {
        finalHeight = contentWidth / imgRatio;
      } else {
        finalWidth = contentHeight * imgRatio;
      }

      const offsetX = (pageWidth - finalWidth) / 2;
      const offsetY = (pageHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, finalWidth, finalHeight);
      pdf.save(`${hd.receipt_code}_xuat.pdf`);

      this.http.put(`http://localhost:3000/api/phieu-xuat/${hd.id}/xuat-hoa-don`, {})
        .subscribe(() => {
          hd.daXuatHoaDon = true;
        });
    });
  });
}




}
