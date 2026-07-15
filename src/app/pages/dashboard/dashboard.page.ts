import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  notificationsOutline, addCircleOutline, calendarOutline,
  documentTextOutline, personOutline, checkmarkCircle, time,
  calendarNumberOutline, logOutOutline, shieldCheckmarkOutline, closeCircle, calculatorOutline, refreshOutline, gridOutline
} from 'ionicons/icons';
import { ServiceSirh } from 'src/app/services/service-sirh';
import { SessionService } from 'src/app/services/session.service';
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
  status: boolean=false;

  constructor(
    private navCtrl: NavController,
    private srvc: ServiceSirh,
    private session: SessionService,
    private notifService: NotificationService
  ) {
    addIcons({
      notificationsOutline, addCircleOutline, calendarOutline,
      documentTextOutline, personOutline, checkmarkCircle, time,
      calendarNumberOutline, logOutOutline, shieldCheckmarkOutline, closeCircle, calculatorOutline, refreshOutline, gridOutline
    });
  }

  isRefreshing: boolean = false;

  get soldeAffiche(): number {
    return Math.max(0, this.solde_conges?.[0]?.soldes?.[0]?.solde_restant ?? 0);
  }

  async onRefresh() {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    try {
      await this.chargerDonnees();
    } catch (err) {
      console.error('Erreur onRefresh:', err);
    } finally {
      this.isRefreshing = false;
    }
  }

  get soldePercent(): number {
    const s = this.solde_conges?.[0]?.soldes?.[0]?.solde_restant ?? 0;
    return Math.min(100, Math.max(0, (s / 30) * 100));
  }

  async ngOnInit(): Promise<void> {
    try {
      const currentUser = this.session.getUser();
      
      if (!currentUser) {
        this.navCtrl.navigateRoot('/login', { animationDirection: 'back' });
        return;
      }

      this.token = currentUser;
      
      let poste: any = null;
      try {
        poste = await this.srvc.getPosteById(this.token.poste_id).toPromise() as any;
        
        if (poste?.intitule === 'Directeur Exécutif') {
          this.status = true;
        } else if (poste?.intitule === 'MEDECIN CHEF' || poste?.intitule === 'MAJOR' || poste?.intitule === 'DENTISTE') {
          this.status = true;
        }
      } catch (err) {
        console.error('Erreur chargement poste:', err);
        poste = null;
      }

      console.log("this.data", this.token)

      // ✅ init() AVANT tout le reste
      await this.notifService.init();
      await this.chargerDonnees();

      const is_manager = poste && ['MEDECIN CHEF', 'MAJOR', 'Directeur Exécutif'].includes(poste.intitule);

      // ✅ connectSocket seulement après que init() soit terminé
      this.notifService.connectSocket(this.token.employe_id, is_manager);
    } catch (err) {
      console.error('Erreur ngOnInit dashboard:', err);
      this.session.clearSession();
      this.navCtrl.navigateRoot('/login', { animationDirection: 'back' });
    }
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
    try {
      const currentUser = this.session.getUser();
      if (currentUser) {
        this.token = currentUser;
        this.historiques = await this.srvc.getHistorique(this.token.employe_id).toPromise();
      }
      this.solde_conges = await this.srvc.solde_conges_employe().toPromise();
      this.solde_conges = this.solde_conges.filter(
        (p: any) => p.employe_id === this.token.employe_id
      );


      console.log('Solde conges:', this.solde_conges);
      console.log(this.solde_conges?.[0]?.soldes?.[0]?.solde_restant);
    } catch (err) {
      console.error('Erreur chargerDonnees:', err);
      this.historiques = [];
      this.solde_conges = [];
    }
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
  NavSCAN(){this.navCtrl.navigateForward('/scan-code-qr');}
  NavSCAN_QR(){this.navCtrl.navigateForward('/scanner');}

  logout() {
    this.session.clearSession();
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