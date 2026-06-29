import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { NavController } from '@ionic/angular';
import { SessionService } from 'src/app/services/session.service';
import { Capacitor } from '@capacitor/core';
import {
  BarcodeScanner,
  GoogleBarcodeScannerModuleInstallState
} from '@capacitor-mlkit/barcode-scanning';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.page.html',
  styleUrls: ['./loading.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, IonSpinner, IonIcon]
})
export class LoadingPage implements OnInit {

  etape: 'splash' | 'mlkit-install' | 'mlkit-done' | 'mlkit-error' = 'splash';
  progression = 0;
  progressionLabel = '';

  constructor(
    private navCtrl: NavController,
    private session: SessionService
  ) {}

  async ngOnInit() {
    // Laisser le splash s'afficher 1.5s avant de vérifier
    await new Promise(r => setTimeout(r, 1500));

    if (Capacitor.isNativePlatform()) {
      await this.gererMLKit();
    } else {
      await new Promise(r => setTimeout(r, 1500));
      this.naviguer();
    }
  }

  async gererMLKit() {
    try {
      const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (available) {
        this.naviguer();
        return;
      }

      // Afficher l'écran d'installation
      this.etape = 'mlkit-install';
      this.progression = 0;
      this.progressionLabel = 'Préparation...';

      await new Promise<void>((resolve, reject) => {
        BarcodeScanner.addListener(
          'googleBarcodeScannerModuleInstallProgress',
          (event: { state: GoogleBarcodeScannerModuleInstallState; progress?: number }) => {
            switch (event.state) {
              case GoogleBarcodeScannerModuleInstallState.PENDING:
                this.progressionLabel = 'En attente...';
                this.progression = 5;
                break;
              case GoogleBarcodeScannerModuleInstallState.DOWNLOADING:
                this.progression = event.progress ?? 30;
                this.progressionLabel = `Téléchargement ${Math.round(this.progression)}%`;
                break;
              case GoogleBarcodeScannerModuleInstallState.INSTALLING:
                this.progression = 90;
                this.progressionLabel = 'Installation...';
                break;
              case GoogleBarcodeScannerModuleInstallState.COMPLETED:
                this.progression = 100;
                this.progressionLabel = 'Terminé';
                BarcodeScanner.removeAllListeners();
                resolve();
                break;
              case GoogleBarcodeScannerModuleInstallState.FAILED:
              case GoogleBarcodeScannerModuleInstallState.CANCELED:
                BarcodeScanner.removeAllListeners();
                reject(new Error('Échec'));
                break;
            }
          }
        );
        BarcodeScanner.installGoogleBarcodeScannerModule().catch(reject);
      });

      this.etape = 'mlkit-done';
      await new Promise(r => setTimeout(r, 1000));
      this.naviguer();

    } catch {
      this.etape = 'mlkit-error';
      await new Promise(r => setTimeout(r, 2500));
      this.naviguer();
    }
  }

  async relancerInstallation() {
    this.etape = 'mlkit-install';
    this.progression = 0;
    await this.gererMLKit();
  }

  naviguer() {
    if (this.session.isLoggedIn()) {
      this.navCtrl.navigateRoot('/dashboard', { replaceUrl: true });
    } else {
      this.navCtrl.navigateRoot('/login', { replaceUrl: true });
    }
  }
}
