import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-location-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './location-manager.component.html',
  styleUrls: ['./location-manager.component.css']
})
export class LocationManagerComponent implements OnInit {
  selectedAreaIndex = 0;

  totalWeight = 0;
  totalArea = 0;

  areas: any[] = [];
  pallets: any[] = [];

  palletGrid: any[][] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchOverviewAndAreas();
  }

  fetchOverviewAndAreas() {
    this.http.get<any>('http://localhost:3000/api/kho/overview').subscribe({
      next: res => {
        // Gán thống kê kho
        this.totalWeight = res.overview.tong_suc_chua_kg;
        this.totalArea = res.overview.tong_suc_chua_m2;

        // Gán danh sách khu vực
        this.areas = res.areas;

        // Gọi lần đầu luôn pallet cho khu vực 0
        if (this.areas.length > 0) {
          this.onAreaChange(0);
        }
      },
      error: err => {
        console.error('❌ Lỗi API:', err);
      }
    });
  }

  onAreaChange(index: number) {
    this.selectedAreaIndex = index;
    const khuVucId = this.areas[index]?.khu_vuc_id;

    this.http.get<any[]>(`http://localhost:3000/api/kho/area/${khuVucId}`).subscribe({
      next: data => {
        this.pallets = data;
        this.generatePalletGrid();
      },
      error: err => console.error('❌ Lỗi lấy pallet:', err)
    });
  }

  generatePalletGrid() {
    this.palletGrid = [];
    for (let i = 0; i < this.pallets.length; i += 10) {
      this.palletGrid.push(this.pallets.slice(i, i + 10));
    }
  }

  get selectedArea() {
    return this.areas[this.selectedAreaIndex] || {};
  }

  get currentWeightUsed() {
    return this.pallets.reduce((acc, p) => acc + (p.weightUsed || 0), 0);
  }

  get currentAreaUsed() {
    return this.pallets.reduce((acc, p) => acc + (p.areaUsed || 0), 0);
  }
}
