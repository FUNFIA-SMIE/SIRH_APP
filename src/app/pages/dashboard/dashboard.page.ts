import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  notificationsOutline, addCircleOutline, calendarOutline,
  documentTextOutline, personOutline, checkmarkCircle, time,
  calendarNumberOutline, logOutOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class DashboardPage implements OnInit {
  token: any = null;

  constructor(private navCtrl: NavController) {
    addIcons({
      notificationsOutline, addCircleOutline, calendarOutline,
      documentTextOutline, personOutline, checkmarkCircle, time,
      calendarNumberOutline, logOutOutline
    });
  }

  ngOnInit(): void {
    const data = localStorage.getItem('utilisateur');
    if (data) {
      this.token = JSON.parse(data);
    }
  }

  get userInitials(): string {
    if (!this.token) return '?';
    const p = this.token.prenom?.[0] ?? '';
    const n = this.token.nom?.[0] ?? '';
    return (p + n).toUpperCase();
  }

  navDemande() { this.navCtrl.navigateForward('/demande-conge'); }
  navProfil()  { this.navCtrl.navigateForward('/profils'); }

  logout() {
    localStorage.removeItem('utilisateur');
    this.navCtrl.navigateRoot('/login', { animationDirection: 'back' });
  }
}