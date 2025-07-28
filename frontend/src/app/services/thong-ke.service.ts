import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThongKeService {
  private API_URL = 'http://localhost:3000/api/thong-ke';

  constructor(private http: HttpClient) {}

  thongKeTheoThang() {
    return this.http.get<any[]>(`${this.API_URL}/thang`);
  }

  thongKeTheoNgay() {
    return this.http.get<any[]>(`${this.API_URL}/ngay`);
  }
}
