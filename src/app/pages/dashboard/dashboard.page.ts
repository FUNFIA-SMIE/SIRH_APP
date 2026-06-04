import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  notificationsOutline, addCircleOutline, calendarOutline,
  documentTextOutline, personOutline, checkmarkCircle, time,
  calendarNumberOutline, logOutOutline, shieldCheckmarkOutline, closeCircle, calculatorOutline
} from 'ionicons/icons';
import { ServiceSirh } from 'src/app/services/service-sirh';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { NotificationService } from 'src/app/services/notification';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class DashboardPage implements OnInit {
  token: any = null;
  historiques: any[] = [];
  solde_conges: any;
  private pollingSubscription?: Subscription;
  private dernierStatuts: Map<number, string> = new Map();

  constructor(
    private navCtrl: NavController,
    private srvc: ServiceSirh,
    private notifService: NotificationService
  ) {
    addIcons({
      notificationsOutline, addCircleOutline, calendarOutline,
      documentTextOutline, personOutline, checkmarkCircle, time,
      calendarNumberOutline, logOutOutline, shieldCheckmarkOutline, closeCircle, calculatorOutline
    });
  }

  get soldeAffiche(): number {
    return Math.max(0, this.solde_conges?.[0]?.soldes?.[0]?.solde_restant ?? 0);
  }

  get soldePercent(): number {
    const s = this.solde_conges?.[0]?.soldes?.[0]?.solde_restant ?? 0;
    return Math.min(100, Math.max(0, (s / 30) * 100));
  }

  async ngOnInit(): Promise<void> {
    const data = localStorage.getItem('utilisateur');
    if (data) {
      this.token = JSON.parse(data);
      this.historiques = await this.srvc.getHistorique(
        this.token.employe_id
      ).toPromise() as any[];
    }

    this.solde_conges = await this.srvc.solde_conges_employe().toPromise() as any[];
    this.solde_conges = this.solde_conges.filter(
      (p: any) => p.employe_id === this.token.employe_id
    );

    await this.notifService.init();
    await this.chargerDonnees();

    // ─── Vérifier si l'utilisateur est manager ───────────────
    const poste = await this.srvc.getPosteById(
      this.token.poste_id
    ).toPromise() as any;

    const is_manager = [
      'MEDECIN CHEF', 'MAJOR', 'Directeur Exécutif'
    ].includes(poste?.intitule);

    this.notifService.connectSocket(this.token.employe_id, is_manager);
  }

  ngOnDestroy() {
    this.notifService.disconnectSocket();
  }

  isAjustement(hist: any): boolean {
    return hist?.motif?.startsWith('[AJUSTEMENT MANUEL]');
  }

  getAjustementTexte(hist: any): string {
    return hist?.motif?.replace('[AJUSTEMENT MANUEL]', '').trim() || 'Ajustement de solde';
  }


  async chargerDonnees() {
    const data = localStorage.getItem('utilisateur');
    if (data) {
      this.token = JSON.parse(data);
      this.historiques = await this.srvc.getHistorique(this.token.employe_id).toPromise();
    }
    this.solde_conges = await this.srvc.solde_conges_employe().toPromise();
    this.solde_conges = this.solde_conges.filter(
      (p: any) => p.employe_id === this.token.employe_id
    );
  }

  // ─── POLLING TOUTES LES 30 SECONDES ─────────────────────────
  startPolling() {
    this.pollingSubscription = interval(30000).pipe(
      switchMap(() => this.srvc.getHistorique(this.token.employe_id))
    ).subscribe((nouvelles: any[]) => {
      this.detecterChangementsStatut(nouvelles);
      this.historiques = nouvelles;
    });
  }

  // ─── DÉTECTER UN CHANGEMENT ET NOTIFIER ─────────────────────
  detecterChangementsStatut(nouvelles: any[]) {
    nouvelles.forEach(conge => {
      const ancienStatut = this.dernierStatuts.get(conge.id);

      if (ancienStatut && ancienStatut !== conge.statut) {
        // Le statut a changé !
        const label = this.getStatutLabel(conge.statut);
        const emoji = conge.statut === 'approuve' ? '✅' : '❌';

        this.notifService.showLocalNotification(
          `${emoji} Congé ${label}`,
          `Votre demande du ${conge.date_debut} au ${conge.date_fin} a été ${label.toLowerCase()}.`
        );
      }

      // Mémoriser le statut actuel
      this.dernierStatuts.set(conge.id, conge.statut);
    });
  }

  get userInitials(): string {
    if (!this.token) return '?';
    const p = this.token.prenom?.[0] ?? '';
    const n = this.token.nom?.[0] ?? '';
    return (p + n).toUpperCase();
  }

  navDemande() { this.navCtrl.navigateForward('/demande-conge'); }
  navAbsences() { this.navCtrl.navigateForward('/mes-absences'); }
  navProfil() { this.navCtrl.navigateForward('/profils'); }
  navValidation() { this.navCtrl.navigateForward('/validation'); }

  logout() {
    localStorage.removeItem('utilisateur');
    localStorage.removeItem('token');

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