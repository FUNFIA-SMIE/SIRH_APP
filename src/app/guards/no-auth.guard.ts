import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

@Injectable({ providedIn: 'root' })
export class NoAuthGuard implements CanActivate {
  constructor(private session: SessionService, private router: Router) {}

  canActivate(): boolean {
    if (!this.session.isLoggedIn()) {
      return true; // Accès autorisé à login
    }
    // Déjà connecté → retour au dashboard
    this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    return false;
  }
}