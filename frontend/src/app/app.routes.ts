import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { ProfileGuard } from './guards/profile.guard';


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
import { TrangcanhanComponent } from './pages/trangcanhan/trangcanhan.component';
import { SanphamcuakhoComponent } from './pages/sanphamcuakho/sanphamcuakho.component';

// Admin Pages
import { DashboardComponent } from './admin/dashboard/dashboard.component';
import { AccountManagerComponent } from './admin/account-manager/account-manager.component';
import { DuyetphieunhapComponent } from './admin/duyetphieunhap/duyetphieunhap.component';
import { DuyetphieuxuatComponent } from './admin/duyetphieuxuat/duyetphieuxuat.component';
import { QuanlysanphamComponent } from './admin/quanlysanpham/quanlysanpham.component';
import { InvoiceManagerComponent } from './admin/invoice-manager/invoice-manager.component';



// Staff Pages
import { ThongtinComponent } from './staff/thongtin/thongtin.component';
import { TaophieunhapComponent } from './staff/taophieunhap/taophieunhap.component';

export const routes: Routes = [
  // Người dùng (không có layout riêng)
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'thongtinkho', component: ThongtinkhoComponent },
  { path: 'guihang', component: GuihangComponent, canActivate: [AuthGuard] },
  { path: 'muahang', component: MuahangComponent, canActivate: [AuthGuard] },
  { path: 'dichvu', component: DichvuComponent },
  { path: 'hoadon', component: HoadonComponent },
  { path: 'dangnhap', component: DangnhapComponent },
  { path: 'trangcanhan', component: TrangcanhanComponent },
  { path: 'sanphamcuakho', component: SanphamcuakhoComponent },

  // Layout Staff
  {
    path: 'staff',
    component: StaffLayoutComponent,
    children: [
      { path: 'thongtin', component: ThongtinComponent },
      { path: 'taophieunhap', component: TaophieunhapComponent, canActivate: [AuthGuard, ProfileGuard] },
      // thêm các route staff khác
    ]
  },

  // Layout Admin
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'account-manager', component: AccountManagerComponent },
      { path: 'duyetphieunhap', component: DuyetphieunhapComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'duyetphieuxuat', component: DuyetphieuxuatComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'quanlysanpham', component: QuanlysanphamComponent },
      { path: 'invoice-manager', component: InvoiceManagerComponent },
      // thêm các route admin khác
    ]
  },

  { path: '**', redirectTo: '' }
];
