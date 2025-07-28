import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PhieuMuaService } from '../../services/phieu-mua.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-muahang',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './muahang.component.html',
  styleUrls: ['./muahang.component.css']
})
export class MuahangComponent {
  formData: any = {
    created_date: '',
    receiver_name: '',
    receiver_address: '',
    logo: null,
    logoPreview: '',
    representative_email: '',
    representative_phone: '',
    representative_name: '',
    delivery_date: '', // đổi từ appointment_date
    note: '',
    products: []
  };

  generatedReceiptCode: string = '';
  userId = sessionStorage.getItem('id');
  userEmail = sessionStorage.getItem('email');
  userInfo: any = {};
  today = new Date().toISOString().substring(0, 10);

  constructor(
    private http: HttpClient,
    private phieuMuaService: PhieuMuaService,
    private router: Router
  ) {}

  ngOnInit() {
    const saved = this.phieuMuaService.getFormData();
    if (saved) {
      this.formData = saved;
    } else {
      this.formData.created_date = this.today;
      this.formData.products = this.phieuMuaService.getProducts();
      this.formData.appointment_date = this.today;
    }

    this.phieuMuaService.products$.subscribe(data => {
      this.formData.products = data;
    });

    this.http.get<any>(`http://localhost:3000/api/user-info/${this.userId}`).subscribe({
      next: (res) => this.userInfo = res || {},
      error: () => alert('❌ Không thể lấy thông tin người dùng.')
    });
  }

  addProduct() {
    this.formData.products.push({
      product_name: '',
      product_type: '',
      product_code: '',
      unit: '',
      weight: 0,
      weight_per_unit: 0,
      manufacture_date: '',
      expiry_date: '',
      quantity: '',
      unit_price: 0,
      imageFile: null,
      preview: ''
    });

    this.saveForm();
  }

  removeProduct(index: number) {
    this.formData.products.splice(index, 1);
    this.phieuMuaService.setProducts(this.formData.products);
    this.saveForm();
  }

    onLogoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.formData.logoPreview = reader.result as string;
        this.formData.logoFile = file;
      };
      reader.readAsDataURL(file);
    }
  }

  goLogo() {
    this.formData.logoPreview = null;
    this.formData.logoFile = null;

    // Xóa file input nếu muốn reset hoàn toàn:
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }


  onProductImageChange(event: any, index: number) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.formData.products[index].preview = reader.result;
        this.formData.products[index].imageFile = file;
        this.saveForm();
      };
      reader.readAsDataURL(file);
    }
  }

  onQuantityChange(index: number): void {
    const item = this.formData.products[index];

    if (item.quantity && item.weight_per_unit) {
      item.weight = item.quantity * item.weight_per_unit;
    }

    this.phieuMuaService.setProducts(this.formData.products);
    this.saveForm();
  }

  onFormChange(): void {
    this.saveForm();
  }

  saveForm(): void {
    this.phieuMuaService.saveFormData(this.formData);
  }

  calculateTotal() {
    return this.formData.products.reduce((sum: number, p: any) => {
      return sum + (p.quantity * p.unit_price);
    }, 0);
  }

  calculateTotalWeight(): number {
    return this.formData.products.reduce((total: number, item: any) => {
      return total + (item.weight || 0);
    }, 0);
  }

  submitForm() {
    if (!this.formData.products || this.formData.products.length === 0) {
      alert("❌ Vui lòng thêm ít nhất 1 sản phẩm.");
      return;
    }

    for (let i = 0; i < this.formData.products.length; i++) {
      const p = this.formData.products[i];

      

      if ( p.quantity <= 0 ) {
        alert(`❌ Số lượng phải > 0 (sản phẩm số ${i + 1}).`);
        return;
      }

      const nsx = new Date(p.manufacture_date);
      const hsd = new Date(p.expiry_date);
      const now = new Date();

      const phoneRegex = /^[0-9]{9,12}$/;
      if (!phoneRegex.test(this.userInfo.phone)) {
        alert('❌ Số điện thoại không hợp lệ.');
        return;
      }

      if (nsx >= hsd) {
        alert(`❌ NSX phải trước HSD (sản phẩm số ${i + 1}).`);
        return;
      }

      const daysDiff = Math.floor((hsd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (hsd <= now || daysDiff < 30) {
        alert(`Cảnh báo có sản phẩm sắp hết hạn (sản phẩm ${p.product_name}).`);
        
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0); // reset giờ

      const appointmentDate = new Date(this.formData.appointment_date);
      appointmentDate.setHours(0, 0, 0, 0);

      if (appointmentDate < today) {
        alert("❌ Ngày xuất kho không được nhỏ hơn ngày hôm nay.");
        return;
      } 
    }
this.formData.quantity = this.formData.products.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
    if (this.formData.quantity <= 0) {
      alert("❌ Tổng số lượng sản phẩm phải lớn hơn 0.");
      return;
    }
    // FormData
    const form = new FormData();

    form.append('created_date', this.formData.created_date);
    form.append('receiver_name', this.formData.receiver_name);
    form.append('receiver_address', this.formData.receiver_address);

    form.append('representative_name', this.formData.representative_name);
    form.append('representative_email', this.formData.representative_email);
    form.append('representative_phone', this.formData.representative_phone);

    form.append('staff_account_name', this.userInfo.full_name || '');
    form.append('staff_account_email', this.userEmail || '');
    form.append('quantity', this.formData.quantity || '');
    form.append('delivery_date', this.formData.appointment_date);
    form.append('user_id', this.userId || '');
    form.append('note', this.formData.note || '');
    form.append('total_amount', this.calculateTotal().toString());
    form.append('total_weight', this.calculateTotalWeight().toString());
    

    if (this.formData.logo) {
      form.append('logo', this.formData.logo);
    }

    this.formData.products.forEach((p: any, i: number) => {
      if (p.imageFile) {
        form.append(`product_image_${i}`, p.imageFile);
      }
    });

    form.append('products', JSON.stringify(this.formData.products));

    this.http.post<any>('http://localhost:3000/api/phieu-xuat', form).subscribe({
      next: (res) => {
        this.generatedReceiptCode = res.receipt_code;
        alert(`✅ Gửi phiếu thành công!\n📄 Mã phiếu: ${res.receipt_code}`);
        // Xoá dữ liệu sau khi gửi
        this.phieuMuaService.clearProducts();
        this.phieuMuaService.clearFormData();

        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.location.reload();
      },
      error: (err) => {
        console.error(err);
        alert("❌ Gửi thất bại.");
      }
    });
  }

  goToSanPhamCuakho() {
    this.router.navigate(['/sanphamcuakho']);
  }
}
