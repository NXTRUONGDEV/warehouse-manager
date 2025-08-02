import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { ProfileGuard } from './guards/profile.guard';
import { UserOnlyGuard } from './guards/user-only.guard';


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
import { KiemkehanghoaComponent } from './pages/kiemkehanghoa/kiemkehanghoa.component';

// Admin Pages
import { DashboardComponent } from './admin/dashboard/dashboard.component';
import { AccountManagerComponent } from './admin/account-manager/account-manager.component';
import { DuyetphieunhapComponent } from './admin/duyetphieunhap/duyetphieunhap.component';
import { DuyetphieuxuatComponent } from './admin/duyetphieuxuat/duyetphieuxuat.component';
import { QuanlysanphamComponent } from './admin/quanlysanpham/quanlysanpham.component';
import { InvoiceManagerComponent } from './admin/invoice-manager/invoice-manager.component';
import { LocationManagerComponent } from './admin/location-manager/location-manager.component';
import { QuanlyhangtonComponent } from './admin/quanlyhangton/quanlyhangton.component';
import { QuanlynccComponent } from './admin/quanlyncc/quanlyncc.component';
import { LichsukiemkeComponent } from './admin/lichsukiemke/lichsukiemke.component';



// Staff Pages
import { ThongtinComponent } from './staff/thongtin/thongtin.component';
import { TaophieunhapComponent } from './staff/taophieunhap/taophieunhap.component';

export const routes: Routes = [
  // Người dùng (không có layout riêng)
  { path: '', component: HomeComponent, canActivate: [UserOnlyGuard] },
  { path: 'home', component: HomeComponent },
  { path: 'thongtinkho', component: ThongtinkhoComponent },
  { path: 'guihang', component: GuihangComponent, canActivate: [AuthGuard] },
  { path: 'muahang', component: MuahangComponent, canActivate: [AuthGuard] },
  { path: 'dichvu', component: DichvuComponent },
  { path: 'hoadon', component: HoadonComponent, canActivate: [AuthGuard] },
  { path: 'dangnhap', component: DangnhapComponent },
  { path: 'trangcanhan', component: TrangcanhanComponent, canActivate: [AuthGuard] },
  { path: 'sanphamcuakho', component: SanphamcuakhoComponent, canActivate: [AuthGuard] },
  { path: 'kiemkehanghoa', component: KiemkehanghoaComponent, canActivate: [AuthGuard] },

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
      { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'account-manager', component: AccountManagerComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'duyetphieunhap', component: DuyetphieunhapComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'duyetphieuxuat', component: DuyetphieuxuatComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'quanlysanpham', component: QuanlysanphamComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'invoice-manager', component: InvoiceManagerComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'location-manager', component: LocationManagerComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'quanlyhangton', component: QuanlyhangtonComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'quanlyncc', component: QuanlynccComponent, canActivate: [AuthGuard, ProfileGuard] },
      { path: 'lichsukiemke', component: LichsukiemkeComponent, canActivate: [AuthGuard, ProfileGuard] },
      // thêm các route admin khác
    ]
  },

  { path: '**', redirectTo: '' }
];
