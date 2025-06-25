import { Routes } from '@angular/router';

// Layouts
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';
import { StaffLayoutComponent } from './layout/staff-layout/staff-layout.component';

// User Pages
import { HomeComponent } from './pages/home/home.component';
import { ThongtinkhoComponent } from './pages/thongtinkho/thongtinkho.component';
import { GuihangComponent } from './pages/guihang/guihang.component';
import { MuahangComponent } from './pages/muahang/muahang.component';
import { DichvuComponent } from './pages/dichvu/dichvu.component';
import { HoadonComponent } from './pages/hoadon/hoadon.component';
import { DangnhapComponent } from './pages/dangnhap/dangnhap.component';

// Admin Pages
import { DashboardComponent } from './admin/dashboard/dashboard.component';

// Staff Pages
import { ThongtinComponent } from './staff/thongtin/thongtin.component';

export const routes: Routes = [
  // Người dùng (không có layout riêng)
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'thongtinkho', component: ThongtinkhoComponent },
  { path: 'guihang', component: GuihangComponent },
  { path: 'muahang', component: MuahangComponent },
  { path: 'dichvu', component: DichvuComponent },
  { path: 'hoadon', component: HoadonComponent },
  { path: 'dangnhap', component: DangnhapComponent },

  // Layout Staff
  {
    path: 'staff',
    component: StaffLayoutComponent,
    children: [
      { path: 'thongtin', component: ThongtinComponent },
      // thêm các route staff khác
    ]
  },

  // Layout Admin
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      // thêm các route admin khác
    ]
  },

  { path: '**', redirectTo: '' }
];
