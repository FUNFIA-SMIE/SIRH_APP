import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { PointageServices, Pointage, EmployeInfo, QrPayload } from '../../services/pointage-services';

// ── ZXing (import depuis @zxing/library, PAS @zxing/browser) ──
import {
  BrowserMultiFormatReader,
  NotFoundException,
  Result
} from '@zxing/library';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.page.html',
  styleUrls: ['./scanner.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
})
export class ScannerPage implements OnInit, OnDestroy {

  isScanning        = false;
  isLoading         = false;
  resultatScan: Pointage | null   = null;
  employeInfo: EmployeInfo | null = null;
  erreur: string | null           = null;
  historiqueScan: Pointage[]      = [];
  lastDebug: string | null        = null;

  estNatif = false;
  estWeb   = false;

  private codeReader: BrowserMultiFormatReader | null = null;
  private scanControls: any = null;
  private scanDone = false;

  constructor(
    private pointageService: PointageServices,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private ngZone: NgZone
  ) {}

  async ngOnInit() {
    this.detecterPlateforme();
    this.chargerHistoriqueLocal();
  }

  async ngOnDestroy() {
    await this.arreterScan();
  }

  detecterPlateforme() {
    this.estNatif = Capacitor.isNativePlatform();
    this.estWeb   = !this.estNatif;
    console.log('[Scanner] platform:', Capacitor.getPlatform(), '| natif:', this.estNatif);
  }

  async demarrerScan() {
    this.erreur       = null;
    this.resultatScan = null;
    this.employeInfo  = null;
    this.scanDone     = false;

    if (this.estNatif) {
      await this.demarrerScanNatif();
    } else {
      await this.demarrerScanWeb();
    }
  }

  async demarrerScanNatif() {
    try {
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== 'granted' && camera !== 'limited') {
        this.erreur = 'Permission caméra refusée.';
        return;
      }
      this.isScanning = true;
      document.body.classList.add('scanner-actif');
      const { barcodes } = await BarcodeScanner.scan();
      document.body.classList.remove('scanner-actif');
      this.isScanning = false;
      if (barcodes.length > 0) {
        const raw = barcodes[0].rawValue;
        if (typeof raw === 'string' && raw.length > 0) {
          await this.traiterQrCode(raw);
        } else {
          this.erreur = 'QR Code vide ou illisible.';
        }
      }
    } catch (err: any) {
      this.isScanning = false;
      document.body.classList.remove('scanner-actif');
      if (err?.message !== 'scan cancelled') {
        this.erreur = 'Erreur lors du scan. Réessayez.';
      }
    }
  }

  async demarrerScanWeb() {
    this.isScanning = true;

    // Laisser Angular rendre le <video> dans le DOM
    await new Promise(r => setTimeout(r, 400));

    const videoEl = document.getElementById('qr-video') as HTMLVideoElement;
    if (!videoEl) {
      this.erreur = 'Élément vidéo introuvable. Rechargez la page.';
      this.isScanning = false;
      return;
    }

    try {
      // Créer le lecteur SANS hints (plus compatible)
      this.codeReader = new BrowserMultiFormatReader();

      console.log('[Scanner] Démarrage ZXing sur videoEl=', videoEl);

      this.scanControls = await this.codeReader.decodeFromVideoDevice(
        null,
        videoEl,
        (result: Result | undefined, err: any) => {

          if (result && !this.scanDone) {
            this.scanDone = true;
            const text = result.getText();
            console.log('[Scanner] ✅ QR détecté =', text);

            this.ngZone.run(async () => {
              await this.arreterScanWeb();
              await this.traiterQrCode(text);
            });
            return;
          }

          // Logguer les vraies erreurs (pas les NotFoundException = frame vide normal)
          if (err && !(err instanceof NotFoundException)) {
            console.warn('[Scanner] ZXing frame error:', err?.message);
          }
        }
      );

      console.log('[Scanner] ZXing controls=', this.scanControls);

    } catch (err: any) {
      this.isScanning   = false;
      this.codeReader   = null;
      this.scanControls = null;
      console.error('[Scanner] Erreur démarrage:', err);

      if (err?.message?.toLowerCase().includes('permission')) {
        this.erreur = 'Permission caméra refusée. Autorisez l\'accès dans Firefox.';
      } else if (err?.message?.toLowerCase().includes('no cameras')) {
        this.erreur = 'Aucune caméra détectée.';
      } else {
        this.erreur = 'Impossible de démarrer la caméra : ' + (err?.message ?? 'erreur inconnue');
      }
    }
  }

  async arreterScanWeb() {
    try {
      if (this.scanControls && typeof this.scanControls.stop === 'function') {
        this.scanControls.stop();
      }
      // Couper manuellement le flux vidéo de la balise <video>
      const videoEl = document.getElementById('qr-video') as HTMLVideoElement;
      if (videoEl && videoEl.srcObject) {
        (videoEl.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        videoEl.srcObject = null;
      }
    } catch (e) {
      console.warn('[Scanner] arreterScanWeb:', e);
    }
    this.scanControls = null;
    this.codeReader   = null;
    this.isScanning   = false;
  }

  async arreterScan() {
    if (this.estNatif && this.isScanning) {
      try { await BarcodeScanner.stopScan(); } catch { }
      document.body.classList.remove('scanner-actif');
    }
    if (this.estWeb) {
      await this.arreterScanWeb();
    }
    this.isScanning = false;
  }

  async traiterQrCode(rawValue: string) {
    this.isLoading = true;
    this.erreur    = null;
    this.lastDebug = rawValue;
    console.log('[Scanner] traiterQrCode:', rawValue);

    let payload: QrPayload;
    try {
      payload = JSON.parse(rawValue);
    } catch {
      this.erreur    = 'QR Code illisible ou corrompu.';
      this.isLoading = false;
      return;
    }

    const validation = this.pointageService.validerQrPayload(payload);
    if (!validation.valide) {
      this.erreur    = validation.erreur ?? 'QR Code invalide.';
      this.isLoading = false;
      return;
    }

    const utilisateur = JSON.parse(localStorage.getItem('utilisateur') || '{}');

    this.pointageService.enregistrerPointage(
      payload.employe_id,
      utilisateur.id,
      payload
    ).subscribe({
      next: (response) => {
        this.resultatScan = response.pointage;
        this.employeInfo  = response.employe;
        this.ajouterHistoriqueLocal(response.pointage);
        this.afficherToast(response.pointage.type);
        this.isLoading = false;
      },
      error: (err) => {
        const msg = err?.error?.message;
        if (msg === 'QR Code expiré')              this.erreur = 'QR Code expiré. Demandez un nouveau code.';
        else if (msg?.includes('doublon'))         this.erreur = 'Ce pointage a déjà été enregistré récemment.';
        else if (msg === 'Compte employé inactif') this.erreur = 'Ce compte employé est inactif.';
        else                                       this.erreur = msg || 'Erreur serveur. Réessayez.';
        this.isLoading = false;
      }
    });
  }

  ajouterHistoriqueLocal(pointage: Pointage) {
    this.historiqueScan.unshift(pointage);
    if (this.historiqueScan.length > 20) this.historiqueScan = this.historiqueScan.slice(0, 20);
    localStorage.setItem('historique_scan', JSON.stringify(this.historiqueScan));
  }

  chargerHistoriqueLocal() {
    const data = localStorage.getItem('historique_scan');
    if (data) this.historiqueScan = JSON.parse(data);
  }

  async confirmerEffacerHistorique() {
    const alert = await this.alertCtrl.create({
      header: 'Effacer l\'historique',
      message: 'Voulez-vous effacer l\'historique local des scans ?',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Effacer', role: 'destructive',
          handler: () => {
            this.historiqueScan = [];
            localStorage.removeItem('historique_scan');
          }
        }
      ]
    });
    await alert.present();
  }

  async afficherToast(type: 'entree' | 'sortie') {
    const toast = await this.toastCtrl.create({
      message: type === 'entree' ? '✅ Entrée enregistrée' : '✅ Sortie enregistrée',
      duration: 2500,
      position: 'top',
      color: type === 'entree' ? 'success' : 'warning',
    });
    await toast.present();
  }

  reinitialiser() {
    this.resultatScan = null;
    this.employeInfo  = null;
    this.erreur       = null;
    this.scanDone     = false;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
