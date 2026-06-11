import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { interval, Subscription } from 'rxjs';
import { PointageServices, Pointage, QrPayload } from '../../services/pointage-services';
import { ServiceSirh } from 'src/app/services/service-sirh';




@Component({
  selector: 'app-qrcode',
  templateUrl: './scan-code-qr.page.html',
  styleUrls: ['./scan-code-qr.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, QRCodeComponent],
})

export class ScanCodeQRPage implements OnInit, OnDestroy {

  utilisateur: any | null = null;
  qrData = '';
  tempsRestant = 15 * 60;
  pointages: Pointage[] = [];
  heuresUtilisees = 0;
  isLoading = false;
  segmentValue = 'qrcode';
  readonly HEURES_MAX_MOIS = 4;

  private timerSub!: Subscription;
  poste: any;

  constructor(
    private pointageService: PointageServices,
    private service:ServiceSirh
    ) { }

  async ngOnInit() {
    await this.chargerUtilisateur();
    this.demarrerTimer();
    this.chargerPointages();
  }

  ngOnDestroy() {
    this.timerSub?.unsubscribe();
  }

  // ─── UTILISATEUR ───────────────────────────────────────────
  async chargerUtilisateur() {
    const data = localStorage.getItem('utilisateur');
    if (data) {
      this.utilisateur = JSON.parse(data);
      this.poste = await this.service.getPosteById(this.utilisateur.poste_id).toPromise() as any;

      this.genererQrCode();
    }
  }

  // ─── QR CODE ───────────────────────────────────────────────
  genererQrCode() {
    if (!this.utilisateur) return;
    const payload: QrPayload = this.pointageService.genererQrPayload(
      this.utilisateur.employe_id,
      this.utilisateur.id
    );
    this.qrData = JSON.stringify(payload);
  }

  // ─── TIMER 15 MIN ──────────────────────────────────────────
  demarrerTimer() {
    const now = Date.now();
    const debutFenetre = Math.floor(now / (15 * 60 * 1000)) * (15 * 60 * 1000);
    this.tempsRestant = 15 * 60 - Math.floor((now - debutFenetre) / 1000);

    this.timerSub = interval(1000).subscribe(() => {
      this.tempsRestant--;
      if (this.tempsRestant <= 0) {
        this.tempsRestant = 15 * 60;
        this.genererQrCode();
      }
    });
  }

  // ─── POINTAGES ─────────────────────────────────────────────
  chargerPointages() {
    if (!this.utilisateur) return;
    this.isLoading = true;

    this.pointageService.getPointages(this.utilisateur.employe_id).subscribe({
      next: (data: any[]) => {
        this.pointages = data;
        this.heuresUtilisees = this.pointageService.calculerHeures(data);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  // ─── GETTERS ───────────────────────────────────────────────
  get nbEntrees(): number { return this.pointages.filter(p => p.type === 'entree').length; }
  get nbSorties(): number { return this.pointages.filter(p => p.type === 'sortie').length; }
  get pourcentageHeures(): number { return Math.min((this.heuresUtilisees / this.HEURES_MAX_MOIS) * 100, 100); }
  get minutesRestantes(): number { return Math.floor(this.tempsRestant / 60); }
  get secondesRestantes(): number { return this.tempsRestant % 60; }

  segmentChanged(event: any) { this.segmentValue = event.detail.value; }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
