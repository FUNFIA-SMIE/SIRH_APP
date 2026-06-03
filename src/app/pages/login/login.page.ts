import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonIcon,
  IonButton,
  IonSpinner,
  NavController,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personOutline, lockClosedOutline, eyeOutline, eyeOffOutline, businessOutline, shieldCheckmarkOutline, warningOutline, logInOutline } from 'ionicons/icons';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonList, IonItem, IonLabel,
    IonInput, IonIcon, IonButton, IonSpinner,
    CommonModule, FormsModule
  ]
})
export class LoginPage {

  identifiant: string = '';
  mot_de_passe: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;
  errorMessage: string = ''; // <--- Add this line
  private apiUrl = 'http://localhost:3000';

  constructor(
    private navCtrl: NavController,
    private http: HttpClient,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private router: Router
  ) {
    addIcons({shieldCheckmarkOutline,personOutline,lockClosedOutline,warningOutline,logInOutline,businessOutline,eyeOutline,eyeOffOutline});
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  // ─── Afficher une alerte d'erreur ──────────────────────────────────────────
  private async showErrorAlert(titre: string, message: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: titre,
      message,
      buttons: [
        {
          text: 'Réessayer',
          role: 'cancel',
          cssClass: 'alert-btn-retry',
        }
      ],
      cssClass: 'alert-login-error',
    });
    await alert.present();
  }

  async onLogin(): Promise<void> {
    // Reset error message at the start of a new attempt
    this.errorMessage = '';

    // Local validation
    if (!this.identifiant.trim()) {
      this.errorMessage = 'Identifiant requis'; // Trigger template error state
      await this.showErrorAlert('Champ manquant', 'Veuillez saisir votre identifiant.');
      return;
    }
    if (!this.mot_de_passe.trim()) {
      this.errorMessage = 'Mot de passe requis'; // Trigger template error state
      await this.showErrorAlert('Champ manquant', 'Veuillez saisir votre mot de passe.');
      return;
    }

    this.isLoading = true;

    this.http.post<any>(`${this.apiUrl}/auth/login`, {
      identifiant: this.identifiant.trim(),
      mot_de_passe: this.mot_de_passe.trim()
    }).subscribe({
      next: async (res) => {
        this.isLoading = false;
        localStorage.setItem('token', res.token);
        localStorage.setItem('utilisateur', JSON.stringify(res.utilisateur));
/*
        const toast = await this.toastCtrl.create({
          message: `Bienvenue ${res.utilisateur.prenom} ${res.utilisateur.nom} 👋`,
          duration: 2500,
          color: 'success',
          position: 'top',
        });
        await toast.present();
*/
        this.router.navigateByUrl('/dashboard', {
          //animated: true,
          //animationDirection: 'forward'
        });
      },

      error: async (err) => {
        this.isLoading = false;

        let titre: string;
        let message: string;

        switch (err.status) {
          case 401:
            titre = '⛔ Identifiants incorrects';
            message = 'Identifiant ou mot de passe incorrect.';
            break;
          case 403:
            titre = '🔒 Accès refusé';
            message = err?.error?.error || 'Votre compte est désactivé.';
            break;
          case 0:
          case 504:
            titre = '📡 Serveur inaccessible';
            message = 'Impossible de joindre le serveur.';
            break;
          default:
            titre = '❌ Erreur';
            message = 'Une erreur est survenue.';
        }

        // IMPORTANT: This updates the UI template
        this.errorMessage = message;

        await this.showErrorAlert(titre, message);
      }
    });
  }
}