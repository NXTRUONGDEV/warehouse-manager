import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-guihang',
  standalone: true,                            // ✅ Đây là điều kiện bắt buộc
  imports: [CommonModule, FormsModule, HttpClientModule],  // ✅ Import các module cần
  templateUrl: './guihang.component.html',
  styleUrls: ['./guihang.component.css']
})
export class GuihangComponent {
    formData: any = {
    created_date: '',
    supplier_name: '',
    supplier_address: '',
    logo: null,
    products: []
  };

  generatedReceiptCode: string = ''; // để hiển thị mã phiếu sau khi gửi

  userId = sessionStorage.getItem('id');
  userEmail = sessionStorage.getItem('email');
  userInfo: any = {};
  today = new Date().toISOString().substring(0, 10);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.formData.created_date = this.today;
    this.addProduct();

    this.http.get<any>(`http://localhost:3000/api/user-info/${this.userId}`).subscribe({
      next: (res) => this.userInfo = res || {},
      error: () => alert('Không thể lấy thông tin người dùng.')
    });
  }

addProduct() {
  this.formData.products.push({
    product_name: '',
    product_type: '',
    product_code: '',
    unit: '',
    weight: 0,
    area: 0, // ✅ Thêm diện tích
    manufacture_date: '',
    expiry_date: '',
    quantity: 0,
    unit_price: 0,
    imageFile: null,
    preview: ''
  });
}


removeProduct(index: number) {
  this.formData.products.splice(index, 1);
}

onLogoChange(event: any): void {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();

    reader.onload = () => {
      this.formData.logoPreview = reader.result;
      this.formData.logo = file; // lưu file ảnh thật để gửi lên server
    };

    reader.readAsDataURL(file);
  }
}


  onProductImageChange(event: any, index: number): void {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();

    reader.onload = () => {
      // Lưu đường dẫn preview vào formData.products
      this.formData.products[index].preview = reader.result;
      this.formData.products[index].imageFile = file; // lưu file để upload về server nếu cần
    };

    reader.readAsDataURL(file);
  }
}


  calculateTotal() {
    return this.formData.products.reduce((sum: number, p: any) => {
      return sum + (p.quantity * p.unit_price);
    }, 0);
  }

submitForm() {
  if (!this.userInfo.full_name || !this.userInfo.phone || !this.userInfo.address) {
    alert('❌ Bạn cần cập nhật đầy đủ thông tin cá nhân trước khi gửi hàng.');
    return;
  }

  if (
    !this.formData.created_date ||
    !this.formData.supplier_name ||
    !this.formData.supplier_address ||
    !this.formData.logo
  ) {
    alert("❌ Vui lòng điền đầy đủ thông tin nhà cung cấp và logo.");
    return;
  }

  if (!this.formData.products || this.formData.products.length === 0) {
    alert("❌ Vui lòng thêm ít nhất 1 sản phẩm.");
    return;
  }

  const today = new Date();

  for (let i = 0; i < this.formData.products.length; i++) {
    const p = this.formData.products[i];

    if (
      !p.product_name ||
      !p.product_type ||
      !p.unit ||
      !p.weight ||
      !p.manufacture_date ||
      !p.expiry_date ||
      !p.quantity ||
      !p.unit_price ||
      !p.imageFile
    ) {
      alert(`❌ Vui lòng nhập đầy đủ thông tin cho sản phẩm số ${i + 1}.`);
      return;
    }

    if (+p.weight <= 0 || +p.quantity <= 0 || +p.unit_price <= 0) {
      alert(`❌ Các giá trị số phải lớn hơn 0 (sản phẩm số ${i + 1}).`);
      return;
    }

    const nsx = new Date(p.manufacture_date);
    const hsd = new Date(p.expiry_date);

    if (nsx >= hsd) {
      alert(`❌ Ngày sản xuất phải trước hạn sử dụng (sản phẩm số ${i + 1}).`);
      return;
    }

    const daysDiff = Math.floor((hsd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (hsd <= today) {
      alert(`❌ Hạn sử dụng phải sau ngày hiện tại (sản phẩm số ${i + 1}).`);
      return;
    }
    if (daysDiff < 30) {
      alert(`❌ Hạn sử dụng phải còn ít nhất 30 ngày (sản phẩm số ${i + 1}).`);
      return;
    }
  }

  // ✅ Cho phép ngày hẹn nhập hàng = ngày tạo
  if (!this.formData.appointment_date) {
    alert("❌ Vui lòng chọn ngày hẹn giao hàng.");
    return;
  }

  const form = new FormData();
  form.append('created_date', this.formData.created_date);
  form.append('supplier_name', this.formData.supplier_name);
  form.append('supplier_address', this.formData.supplier_address);
  form.append('meeting_date', this.formData.appointment_date);
  form.append('note', this.formData.note || '');
  form.append('email', this.userEmail || '');
  form.append('total_amount', this.calculateTotal().toString());
  form.append('logo', this.formData.logo);

  // 🧾 Thêm thông tin đại diện nhà cung cấp
  form.append('representative_name', this.formData.representative_name || '');
  form.append('representative_email', this.formData.representative_email || '');
  form.append('representative_phone', this.formData.representative_phone || '');

  // Ảnh từng sản phẩm
  this.formData.products.forEach((p: any, index: number) => {
    form.append(`product_image_${index}`, p.imageFile);
  });

  form.append('products', JSON.stringify(this.formData.products));

  this.http.post('http://localhost:3000/api/phieu-nhap', form).subscribe({
    next: (res: any) => {
      this.generatedReceiptCode = res.receipt_code;
      alert(`✅ Gửi phiếu chuyển hàng thành công!\n📄 Mã phiếu: ${res.receipt_code}`);
      window.location.reload();
    },
    error: (err) => {
      console.error(err);
      alert('❌ Gửi phiếu thất bại.');
    }
  });
}


  updateWeightAndArea(i: number) {
  const item = this.formData.products[i];
  const kg = Number(item.kg_per_unit || 0);
  const quantity = Number(item.quantity || 0);

  item.weight = kg * quantity;
  item.area = parseFloat(((item.weight / 500) * 2).toFixed(2));
}

}
