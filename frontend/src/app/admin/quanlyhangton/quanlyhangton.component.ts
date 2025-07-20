import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-quanlyhangton',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './quanlyhangton.component.html',
  styleUrls: ['./quanlyhangton.component.css']
})
export class QuanlyhangtonComponent implements OnInit {
  danhSachSanPham: any[] = [];
  selectedProduct: any = null;
  popupVisible: boolean = false;
  logHistory: { [productCode: string]: any[] } = {};
  loHangCungMa: any[] = [];
  sanPhamDangMoLog: string | null = null;
  demNguocMap: { [productCode: string]: string } = {};

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any[]>('http://localhost:3000/api/products-detail/filter')
      .subscribe(data => {
        this.danhSachSanPham = data;
      });
    
     this.http.get<any[]>('http://localhost:3000/api/products-detail/with-deducted')
      .subscribe(data => {
        this.danhSachSanPham = data;
        this.batDauDemNguoc();
      });
  }

  moPopupChiTiet(sp: any) {
    this.selectedProduct = sp;
    this.popupVisible = true;
    this.loadLoHang(sp.product_code);
  }

  dongPopup() {
    this.popupVisible = false;
    this.loHangCungMa = [];
  }

  loadLoHang(productCode: string) {
    this.http.get<any[]>(`http://localhost:3000/api/products-detail/by-code/${productCode}`).subscribe(data => {
      this.loHangCungMa = data;
    });
  }

  xemLichSu(sp: any, event: Event) {
    event.stopPropagation(); // chặn mở popup
    const code = sp.product_code;
    if (this.sanPhamDangMoLog === code) {
      this.sanPhamDangMoLog = null;
      return;
    }

    this.sanPhamDangMoLog = code;
    if (!this.logHistory[code]) {
      this.http.get<any[]>(`http://localhost:3000/api/log-tru-hang/${code}`)
        .subscribe(data => {
          this.logHistory[code] = data;
        });
    }
  }

  tinhTongDaTru(sp: any): number {
    const log = this.logHistory[sp.product_code];
    if (!log || !Array.isArray(log)) return 0;
    return log.reduce((sum, item) => sum + (item.quantity_deducted || 0), 0);
  }

  tinhSoNgayConLai(ngayHetHan: string): number {
  if (!ngayHetHan) return 0;
  const today = new Date();
  const expiry = new Date(ngayHetHan);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

batDauDemNguoc() {
  setInterval(() => {
    const now = new Date().getTime();
    this.danhSachSanPham.forEach(sp => {
      if (sp.expiry_date) {
        const expiryDate = new Date(sp.expiry_date);
        expiryDate.setHours(23, 59, 59, 999);
        const expiry = expiryDate.getTime();

        const distance = expiry - now;

        if (distance <= 0) {
          this.demNguocMap[sp.product_code] = '⛔ Đã hết hạn';
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);

          this.demNguocMap[sp.product_code] = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }
      }
    });
  }, 1000);
}

isWarning(productCode: string): boolean {
  const countdown = this.demNguocMap[productCode];
  if (!countdown || countdown === '⛔ Đã hết hạn') return false;

  const daysMatch = countdown.match(/^(\d+)d/);
  if (daysMatch && +daysMatch[1] < 30) {
    return true;
  }
  return false;
}

}
