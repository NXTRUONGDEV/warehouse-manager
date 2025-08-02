import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartDataset, ChartOptions, ChartType } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl:'./dashboard.component.html',
  styleUrls: [
    '../../../assets/css/bootstrap.min.css',
    '../../../assets/css/kaiadmin.min.css',
    '../../../assets/css/demo.css'
  ]
})
export class DashboardComponent implements OnInit {
  danhSachPhieu: any[] = [];
  danhSachPhieuGoc: any[] = [];
  tongPhieuNhap: number = 0;
  tongPhieuXuat: number = 0;
  sapHetList: any[] = [];

  barChartType: ChartType = 'bar';
  barChartLabels: string[] = [];
  barChartData: ChartDataset<'bar'>[] = [];

  barChartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      }
    }
  };

  filterType = 'thang';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPhieu();
    this.laySoHoaDon();
    this.loadSanPhamSapHet();
    this.layDuLieuNhapXuat();
  }

  loadPhieu() {
    this.http.get<any[]>('http://localhost:3000/api/phieu-xuat').subscribe(data => {
      this.danhSachPhieuGoc = data;
      this.danhSachPhieu = [...data];
    });
  }

  laySoHoaDon() {
    this.http.get<any>('http://localhost:3000/api/tong-phieu-nhap-xuat').subscribe({
      next: (res) => {
        this.tongPhieuNhap = res.tong_phieu_nhap;
        this.tongPhieuXuat = res.tong_phieu_xuat;
      },
      error: (err) => {
        console.error('❌ Lỗi khi lấy tổng phiếu:', err);
      }
    });
  }

  loadSanPhamSapHet() {
    this.http.get<any[]>('http://localhost:3000/api/products-detail/sap-het').subscribe({
      next: (data) => {
        this.sapHetList = data;
      },
      error: (err) => {
        console.error('❌ Lỗi khi lấy sản phẩm sắp hết:', err);
      }
    });
  }
//barchart thống kê nhập xuất
  layDuLieuNhapXuat() {
    const url = `http://localhost:3000/api/thong-ke?type=${this.filterType}`;
    this.http.get<any[]>(url).subscribe(data => {
      const labelSet = new Set<string>();
      const nhapMap = new Map<string, number>();
      const xuatMap = new Map<string, number>();

      data.forEach(item => {
        const label = item.label 
          ? (this.filterType === 'ngay' ? this.formatDate(item.label) : item.label)
          : '';

        labelSet.add(label);
        if (item.loai === 'nhap') {
          nhapMap.set(label, +item.tong);
        } else if (item.loai === 'xuat') {
          xuatMap.set(label, +item.tong);
        }
      });

      const sortedLabels = Array.from(labelSet).sort();
      this.barChartLabels = sortedLabels;

      const nhapData = sortedLabels.map(label => nhapMap.get(label) || 0);
      const xuatData = sortedLabels.map(label => xuatMap.get(label) || 0);

      this.barChartData = [
        { data: nhapData, label: 'Nhập kho', backgroundColor: '#4CAF50' },
        { data: xuatData, label: 'Xuất kho', backgroundColor: '#F44336' }
      ];
    }, error => {
      console.error('❌ Lỗi khi lấy dữ liệu nhập/xuất:', error);
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }



}