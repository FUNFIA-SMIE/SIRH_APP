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
import { ServiceSirh } from 'src/app/services/service-sirh';
import { SessionService } from 'src/app/services/session.service';

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
  lastScannedRaw: string | null = null;
  // Quand on veut ignorer la première détection identique (par ex. après "Scanner un autre")
  ignoreRaw: string | null = null;
  ignoreUntil: number | null = null;
  data_employe:any;
  
  constructor(
    private pointageService: PointageServices,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private ngZone: NgZone,
    private servc: ServiceSirh,
    private session: SessionService
  ) {}

  async ngOnInit() {
    this.detecterPlateforme();
    this.chargerHistoriqueLocal();
    // Charger aussi l'historique depuis le serveur (BDD) si possible
    this.chargerHistoriqueServeur();
    // Si l'utilisateur a demandé un reload+scan, lancer le scan après reload
    try {
      const auto = sessionStorage.getItem('auto_start_scan');
      if (auto === '1') {
        sessionStorage.removeItem('auto_start_scan');
        // attendre un court instant pour laisser Angular rendre la vue
        await new Promise(r => setTimeout(r, 400));
        await this.demarrerScan();
      }
    } catch (e) {
      console.warn('[Scanner] auto_start_scan check failed', e);
    }
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

    // Ignorer temporairement la même valeur scannée (évite rescan instantané)
    if (this.ignoreRaw && rawValue === this.ignoreRaw && Date.now() < (this.ignoreUntil || 0)) {
      console.warn('[Scanner] Ignorer détection identique pendant cooldown');
      // Si natif, relancer le scan après un petit délai pour permettre repositionnement
      if (this.estNatif) {
        try {
          await this.arreterScan();
        } catch {}
        await new Promise(r => setTimeout(r, 500));
        // Ne réinitialise pas ignoreRaw immédiatement; laisser la fenêtre expirer
        await this.demarrerScanNatif();
      }
      this.isLoading = false;
      return;
    }

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

    const utilisateur = this.session.getUser() || {};

    this.pointageService.enregistrerPointage(
      payload.employe_id,
      utilisateur.id,
      payload
    ).subscribe({
      next: (response) => {
        // Mémoriser le raw qui a produit ce pointage (pour éviter rescan immédiat)
        this.lastScannedRaw = this.lastDebug;
        this.resultatScan = response.pointage;
        this.employeInfo  = response.employe;
        // Récupérer le nom de la personne qui a scanné si disponible
        (async () => {
          try {
            const scannerId = response.pointage?.scanne_par;
            if (scannerId) {
              const emp = await this.servc.getEmployeeById(scannerId);
              if (emp) this.resultatScan!.scannerName = `${emp.prenom ?? ''} ${emp.nom ?? ''}`.trim() || emp.identifiant;
            }
          } catch (e) {
            console.warn('[Scanner] erreur fetch scanner name', e);
          }
        })();
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
    console.log("data",data)
    if (data) {
      this.historiqueScan = JSON.parse(data);
      // Préremplir les noms des employés pour l'affichage
      this.remplirNomsHistorique();
    }
  }

  async recuperer_nom_employe(id:any){
    try {
      const emp = await this.servc.getEmployeeById(id);
      this.data_employe = emp;
      const prenom = emp?.prenom ?? '';
      const nom = emp?.nom ?? '';
      const full = (prenom || nom) ? `${prenom} ${nom}`.trim() : (emp?.identifiant ?? null);
      return full;
    } catch (e) {
      console.warn('[Scanner] erreur recuperer_nom_employe', e);
      return null;
    }
  }

  // Remplir `displayName` / `prenom` / `nom` pour chaque entrée d'historique
  async remplirNomsHistorique() {
    if (!this.historiqueScan || this.historiqueScan.length === 0) return;
    const jobs = this.historiqueScan.map(async (s) => {
      try {
        if (s.prenom && s.nom) {
          s.displayName = `${s.prenom} ${s.nom}`.trim();
        } else {
          const emp = await this.servc.getEmployeeById(s.employe_id);
          if (emp) {
            s.prenom = emp.prenom ?? s.prenom;
            s.nom = emp.nom ?? s.nom;
            s.displayName = (emp.prenom || emp.nom) ? `${emp.prenom ?? ''} ${emp.nom ?? ''}`.trim() : (emp.identifiant ?? s.employe_id);
          } else {
            s.displayName = s.employe_id;
          }
        }

        // récupérer aussi le nom du scanneur (scanne_par) si présent
        if (s.scanne_par) {
          try {
            const sc = await this.servc.getEmployeeById(s.scanne_par);
            s.scannerName = sc ? ((sc.prenom || sc.nom) ? `${sc.prenom ?? ''} ${sc.nom ?? ''}`.trim() : sc.identifiant) : undefined;
          } catch (e) {
            s.scannerName = undefined;
          }
        }
      } catch (e) {
        console.warn('[Scanner] remplirNomsHistorique error', e);
        s.displayName = s.employe_id;
      }
    });
    await Promise.all(jobs);
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

  async reinitialiser() {
    // Arrêter toute caméra / scan en cours avant de réinitialiser l'état
    try {
      await this.arreterScan();
    } catch (e) {
      console.warn('[Scanner] erreur arreterScan lors de reinitialiser', e);
    }

    this.resultatScan = null;
    this.employeInfo  = null;
    this.erreur       = null;
    this.scanDone     = false;
    this.isLoading    = false;
    this.isScanning   = false;
    this.lastDebug    = null;
  }

  // Utilisé par le template pour s'assurer que la réinitialisation est terminée
  // avant de démarrer un nouveau scan.
  async scannerAutre() {
    await this.reinitialiser();
    // Empêcher la capture instantanée du QR précédent en bloquant temporairement
    // la détection identique pendant une courte fenêtre.
    if (this.lastScannedRaw) {
      this.ignoreRaw = this.lastScannedRaw;
      this.ignoreUntil = Date.now() + 3000; // ignorer pendant 3s
    }
    this.scanDone = true;
    await new Promise(r => setTimeout(r, 700));
    this.scanDone = false;
    await this.demarrerScan();
  }

  // Recharge la page puis déclenche un démarrage automatique du scan
  reloadThenScan() {
    try {
      sessionStorage.setItem('auto_start_scan', '1');
      // reload complet de la page pour réinitialiser l'état et la caméra
      location.reload();
    } catch (e) {
      console.warn('[Scanner] reloadThenScan failed, fallback start', e);
      // si reload impossible, tenter un fallback
      this.scannerAutre();
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  async chargerHistoriqueServeur() {
    try {
      const utilisateur = this.session.getUser() || {};
      // Preferer `employe_id` si présent (structure utilisateur différente selon poste), sinon fallback sur `id`
      const employeId = utilisateur.employe_id ?? utilisateur.id;
      if (!employeId) return;
      this.isLoading = true;

      this.pointageService.getPointages(employeId).subscribe({
        next: (pointages) => {
          // Fusionner les pointages serveur avec l'historique local en évitant les doublons
          const merged: Pointage[] = [...pointages];
          for (const p of this.historiqueScan) {
            if (!merged.find(m => m.id === p.id)) merged.push(p);
          }
          merged.sort((a, b) => new Date(b.date_heure).getTime() - new Date(a.date_heure).getTime());
          this.historiqueScan = merged.slice(0, 20);
          // Préremplir les noms des employés pour l'affichage
          this.remplirNomsHistorique();
          // Mettre à jour le stockage local pour garder une copie
          localStorage.setItem('historique_scan', JSON.stringify(this.historiqueScan));
          this.isLoading = false;
        },
        error: (err) => {
          console.warn('[Scanner] Erreur chargement historique serveur', err);
          this.isLoading = false;
          const msg = err?.status ? `Erreur ${err.status}: ${err?.error?.message || err.message || 'requête échouée'}` : (err?.message || 'Erreur réseau');
          this.toastCtrl.create({ message: 'Impossible de charger l\'historique : ' + msg, duration: 4000, color: 'danger' }).then(t => t.present());
        }
      });

    } catch (e) {
      console.warn('[Scanner] chargerHistoriqueServeur error', e);
      this.isLoading = false;
    }
  }
}
