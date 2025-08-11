import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { GuihangService } from '../../services/phieu-nhap.service'; // Đường dẫn đúng

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

  maSanPhamCanThem: string = '';

  constructor(private http: HttpClient, private guiHangService: GuihangService) {}

  ngOnInit() {
    const savedForm = this.guiHangService.getFormData();
    const savedProducts = this.guiHangService.getProducts();

    if (savedForm) {
      this.formData = { ...this.formData, ...savedForm };
    } else {
      this.formData.created_date = this.today;
    }

    if (savedProducts && savedProducts.length) {
      this.formData.products = savedProducts;
    } else {
      this.addProduct(); // nếu chưa có thì thêm mặc định
    }

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

    // ❗ Nếu không còn sản phẩm nào thuộc loại "có sẵn" (readonly: true)
    const stillHasReadonly = this.formData.products.some((p: any) => p.readonly);

    if (!stillHasReadonly) {
      // 👉 Xoá toàn bộ thông tin nhà cung cấp vì không còn sản phẩm liên quan
      this.formData.supplier_name = '';
      this.formData.logoPreview = '';
      this.formData.supplier_address = '';
      this.formData.representative_name = '';
      this.formData.representative_email = '';
      this.formData.representative_phone = '';
      this.formData.logo = null;
    }

    this.autoSave();
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
    // Check if each product has an image
    const sanPhamKhongCoAnh = this.formData.products.filter((p: any) => {
      return !(p.imageFile || p.preview || p.image_url);
    });

    if (sanPhamKhongCoAnh.length > 0) {
      const danhSach = sanPhamKhongCoAnh.map((_: any, idx: number) => `#${idx + 1}`).join(', ');
      alert(`❌ Các sản phẩm sau chưa có ảnh: ${danhSach}`);
      return;
    }

    // Validate user and supplier information
    if (!this.userInfo.full_name || !this.userInfo.phone || !this.userInfo.address) {
      alert('❌ Bạn cần cập nhật đầy đủ thông tin cá nhân trước khi gửi hàng.');
      return;
    }

    if (
      !this.formData.created_date ||
      !this.formData.supplier_name ||
      !this.formData.supplier_address ||
      !(this.formData.logo || this.formData.logoPreview)
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

      // Validate product details
      if (
        !p.product_name || !p.product_type || !p.unit || !p.weight ||
        !p.manufacture_date || !p.expiry_date || !p.quantity || !p.unit_price
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
      if (nsx >= hsd || hsd <= today) {
        alert(`❌ Ngày sản xuất phải < hạn sử dụng và hạn sử dụng phải sau hiện tại (sản phẩm số ${i + 1}).`);
        return;
      }

      if (!p.readonly) {
        const daysDiff = Math.floor((hsd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < 30) {
          alert(`❌ Hạn sử dụng phải còn ít nhất 30 ngày (sản phẩm số ${i + 1}).`);
          return;
        }
      }

      // Assign image_url if no new image but an old image exists
      if (!p.image_url && !p.imageFile && p.preview) {
        p.image_url = p.preview;
      }
    }

    // If no new logo, use the old logo
    if (!this.formData.logo && this.formData.logoPreview) {
      this.formData.logo = this.formData.logoPreview;
    }

    // Create FormData and send
    const form = new FormData();
    form.append('created_date', this.formData.created_date);
    form.append('supplier_name', this.formData.supplier_name);
    form.append('supplier_address', this.formData.supplier_address);
    form.append('meeting_date', this.formData.appointment_date);
    form.append('note', this.formData.note || '');
    form.append('email', this.userEmail || '');
    form.append('total_amount', this.calculateTotal().toString());
    form.append('representative_name', this.formData.representative_name || '');
    form.append('representative_email', this.formData.representative_email || '');
    form.append('representative_phone', this.formData.representative_phone || '');

    if (this.formData.logo instanceof File) {
      form.append('logo', this.formData.logo);
    } else if (typeof this.formData.logo === 'string') {
      form.append('logo_url', this.formData.logo);
    }

    this.formData.products.forEach((p: any, index: number) => {
      if (p.imageFile) {
        form.append(`product_image_${index}`, p.imageFile);
      }
      // Add other product data for each product, ensuring it matches backend expectation
      // If not doing a separate products array, ensure all product properties are sent
      // in the JSON.stringify('products') part.
    });

    // Sending the products array as a JSON string
    form.append('products', JSON.stringify(this.formData.products));

    this.http.post('http://localhost:3000/api/phieu-nhap', form).subscribe({
      next: (res: any) => {
        this.generatedReceiptCode = res.receipt_code;
        alert(`✅ Gửi phiếu chuyển hàng thành công!\n📄 Mã phiếu: ${res.receipt_code}`);
        this.guiHangService.clearFormData();
        this.guiHangService.clearProducts();
        window.location.reload();
      },
      error: (err) => {
        console.error(err);
        alert('❌ Gửi phiếu thất bại.');
      }
    });
  }

  // Khi người dùng thay đổi số lượng hoặc kg/sp, cập nhật lại trọng lượng và diện tích
  updateWeightAndArea(index: number): void {
    const item = this.formData.products[index];
    const quantity = Number(item.quantity) || 0;
    const kgPerUnit = Number(item.kg_per_unit) || 0;

    item.weight = +(quantity * kgPerUnit).toFixed(2);
    item.area = +(item.weight / 500 * 5).toFixed(2); // Mới: 500kg = 5m²
  }

  autoSave() {
    this.guiHangService.saveFormData(this.formData);
    this.guiHangService.setProducts(this.formData.products);
  }

  onFieldChange() {
    this.autoSave();
  }

  themSanPhamCoSan() {
    const code = this.maSanPhamCanThem.trim();
    if (!code) {
      alert("❌ Vui lòng nhập mã sản phẩm cần thêm.");
      return;
    }

    const isDuplicate = this.formData.products.some((p: any) => p.product_code === code);
    if (isDuplicate) {
      alert("⚠️ Mã sản phẩm đã tồn tại trong danh sách.");
      return;
    }

    this.http.get<any>(`http://localhost:3000/api/products-detail/by-code/${code}`).subscribe({
      next: (product) => {
        if (!product || !product.product_code) {
          alert("❌ Không tìm thấy sản phẩm có mã: " + code);
          return;
        }

        const newSupplier = product.supplier_name?.trim() || '';
        const currentSupplier = this.formData.supplier_name?.trim() || '';

        if (this.formData.products.length > 0 && currentSupplier && newSupplier && newSupplier !== currentSupplier) {
          alert(`❌ Nhà cung cấp của sản phẩm (${newSupplier}) không khớp với phiếu hiện tại (${currentSupplier}).`);
          return;
        }

        const newItem = {
          product_code: product.product_code,
          product_name: product.product_name,
          product_type: product.product_type,
          unit: product.unit,
          manufacture_date: product.manufacture_date?.substring(0, 10) || '',
          expiry_date: product.expiry_date?.substring(0, 10) || '',
          quantity: 0,
          unit_price: product.unit_price || 0,
          kg_per_unit: product.weight_per_unit || 0,
          weight: 0,
          area: 0,
          imageFile: null,
          preview: product.image_url || '',
          image_url: product.image_url || '',
          readonly: true,
          supplier_name: product.supplier_name || '',
          logo_url: product.logo_url || '',
          location: product.location || ''
        };

        this.formData.products.push(newItem);

        // Populate supplier info if not set
        if (!currentSupplier && newSupplier) {
          this.formData.supplier_name = newSupplier;
          this.formData.logoPreview = product.logo_url || '';
          this.formData.supplier_address = product.supplier_address || '';
          this.formData.representative_name = product.representative_name || '';
          this.formData.representative_email = product.representative_email || '';
          this.formData.representative_phone = product.representative_phone || '';
        }

        this.onFieldChange();
        this.maSanPhamCanThem = '';
      },
      error: (err) => {
        console.error(err);
        alert("❌ Không tìm thấy sản phẩm hoặc xảy ra lỗi khi truy vấn.");
      }
    });
  }


  resetForm() {
    if (confirm('⚠️ Bạn có chắc chắn muốn tạo lại? Toàn bộ dữ liệu sẽ bị mất.')) {
      // Xóa dữ liệu form
      this.formData = {
        created_date: this.today,
        supplier_name: '',
        supplier_address: '',
        logo: null,
        logoPreview: '',
        representative_name: '',
        representative_email: '',
        representative_phone: '',
        appointment_date: '',
        note: '',
        products: []
      };

      this.generatedReceiptCode = '';
      this.maSanPhamCanThem = '';

      // Tạo 1 khung nhập mới mặc định
      this.addProduct();

      // Xóa dữ liệu lưu tạm (localStorage nếu có)
      this.guiHangService.clearFormData();
      this.guiHangService.clearProducts();
    }
  }


  // Khi người dùng nhập tổng khối lượng (weight), tính ngược lại kg/sp
  updateKgPerUnit(index: number): void {
    const item = this.formData.products[index];
    const quantity = Number(item.quantity) || 0;
    const weight = Number(item.weight) || 0;

    if (quantity > 0) {
      item.kg_per_unit = +(weight / quantity).toFixed(2);
      item.area = +(weight / 500 * 5).toFixed(2); // Mới: 500kg = 5m²
    }
  }


}
