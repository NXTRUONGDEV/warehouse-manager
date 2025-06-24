import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ThongtinkhoComponent } from './pages/thongtinkho/thongtinkho.component';

export const routes: Routes = [
    {path:'',component: HomeComponent},
    {path: 'home', component: HomeComponent},
    { path: 'thongtinkho', component: ThongtinkhoComponent },
];
