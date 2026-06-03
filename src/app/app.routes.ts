import { Routes } from '@angular/router';

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
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
  },
  {
    path: 'demande-conge',
    loadComponent: () => import('./pages/demande-conge/demande-conge.page').then(m => m.DemandeCongePage),
  },
  {
    path: 'profils',
    loadComponent: () => import('./pages/profils/profils.page').then( m => m.ProfilsPage)
  },
  {
    path: 'validation',
    loadComponent: () => import('./pages/validation/validation.page').then( m => m.ValidationPage)
  },
  {
    path: 'mes-absences',
    loadComponent: () => import('./pages/mes-absences/mes-absences.page').then( m => m.MesAbsencesPage)
  },
];