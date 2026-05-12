import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  notificationsOutline, addCircleOutline, calendarOutline,
  documentTextOutline, personOutline, checkmarkCircle, time,
  calendarNumberOutline, logOutOutline
} from 'ionicons/icons';
import { ServiceSirh } from 'src/app/services/service-sirh';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class DashboardPage implements OnInit {
  token: any = null;
  historiques: any;
  solde_conges: any;

  constructor(
    private navCtrl: NavController,
    private srvc: ServiceSirh
  ) {
    addIcons({
      notificationsOutline, addCircleOutline, calendarOutline,
      documentTextOutline, personOutline, checkmarkCircle, time,
      calendarNumberOutline, logOutOutline
    });
  }

  async ngOnInit(): Promise<void> {
    const data = localStorage.getItem('utilisateur');
    if (data) {
      this.token = JSON.parse(data);
      this.historiques = await this.srvc.getHistorique(this.token.employe_id).toPromise();
      console.log(this.historiques, this.token)

    }
    this.solde_conges = await this.srvc.solde_conges_employe().toPromise();
    console.log("Données reçues = ", this.solde_conges);

    // On utilise === pour comparer l'ID de l'employé
    this.solde_conges = this.solde_conges.filter((p: any) => {
      return p.employe_id === this.token.employe_id;
    });

    console.log("Solde filtré = ", this.solde_conges);

  }

  get userInitials(): string {
    if (!this.token) return '?';
    const p = this.token.prenom?.[0] ?? '';
    const n = this.token.nom?.[0] ?? '';
    return (p + n).toUpperCase();
  }

  navDemande() { this.navCtrl.navigateForward('/demande-conge'); }
  navProfil() { this.navCtrl.navigateForward('/profils'); }

  logout() {
    localStorage.removeItem('utilisateur');
    this.navCtrl.navigateRoot('/login', { animationDirection: 'back' });
  }

  getStatutColor(statut: string): string {
    switch (statut) {
      case 'valide':
        return 'success';   // Vert
      case 'refuse':
        return 'danger';    // Rouge
      case 'en_attente':    // Adaptez selon vos valeurs réelles
        return 'warning';   // Orange
      case 'brouillon':
        return 'medium';    // Gris
      default:
        return 'primary';
    }
  }

  // Retourne la classe CSS (success, warn, danger)
  getStatutClass(statut: string): string {
    const map: any = {
      'approuve': 'success',
      'brouillon': 'medium',
      'refuse': 'danger',
      'en_attente_manager': 'warn' // Ajustez selon vos valeurs exactes en base
    };
    return map[statut] || 'warn';
  }

  // Retourne l'icône Ionic correspondante
  getStatutIcon(statut: string): string {
    const map: any = {
      'approuve': 'checkmark-circle',
      'refuse': 'close-circle',
      'brouillon': 'document-outline'
    };
    return map[statut] || 'time';
  }

  // Retourne un texte plus "humain" pour le badge
  getStatutLabel(statut: string): string {
    const map: any = {
      'approuve': 'Approuvé',
      'refuse': 'Refusé',
      'brouillon': 'Brouillon',
      'en_attente_manager': 'En cours'
    };
    return map[statut] || statut;
  }
}