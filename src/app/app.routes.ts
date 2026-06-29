import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { NoAuthGuard } from './guards/no-auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'loading',
    pathMatch: 'full',
  },
  {
    path: 'loading',
    // On charge le composant directement, pas le module
    loadComponent: () => import('./pages/loading/loading.page').then(m => m.LoadingPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
    canActivate: [NoAuthGuard],

  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
    canActivate: [AuthGuard],
  },
  {
    path: 'demande-conge',
    loadComponent: () => import('./pages/demande-conge/demande-conge.page').then(m => m.DemandeCongePage),
    canActivate: [AuthGuard],
  },
  {
    path: 'profils',
    loadComponent: () => import('./pages/profils/profils.page').then(m => m.ProfilsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'validation',
    loadComponent: () => import('./pages/validation/validation.page').then(m => m.ValidationPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'mes-absences',
    loadComponent: () => import('./pages/mes-absences/mes-absences.page').then(m => m.MesAbsencesPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'scan-code-qr',
    loadComponent: () => import('./pages/scan-code-qr/scan-code-qr.page').then(m => m.ScanCodeQRPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'scanner',
    loadComponent: () => import('./pages/scanner/scanner.page').then(m => m.ScannerPage),
    canActivate: [AuthGuard]
  },
];