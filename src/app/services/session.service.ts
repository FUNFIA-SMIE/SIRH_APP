import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly USER_KEY = 'utilisateur';
  private readonly TOKEN_KEY = 'token';
  private user: any | null = null;

  constructor() {
    this.loadSession();
  }

  private loadSession(): void {
    const data = localStorage.getItem(this.USER_KEY);
    this.user = data ? JSON.parse(data) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.getUser();
  }

  getUser(): any | null {
    if (!this.user) {
      this.loadSession();
    }
    return this.user;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setSession(token: string, utilisateur: any): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(utilisateur));
    this.user = utilisateur;
  }

  clearSession(): void {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    this.user = null;
  }

  getUserId(): string | null {
    const user = this.getUser();
    return user?.employe_id ?? user?.id ?? null;
  }
}
