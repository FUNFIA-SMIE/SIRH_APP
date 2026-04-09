import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonContent, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonIcon, 
  IonButton, 
  NavController 
} from '@ionic/angular/standalone'; // Import standalone
import { addIcons } from 'ionicons';
import { personOutline, lockClosedOutline } from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonList, IonItem, IonLabel, 
    IonInput, IonIcon, IonButton, CommonModule
  ]
})
export class LoginPage {

  constructor(private navCtrl: NavController) {
    // Initialisation des icônes pour le mode Standalone
    addIcons({ personOutline, lockClosedOutline });
  }

  onLogin() {
    // Ici, tu pourras ajouter ta logique de vérification (API)
    console.log('Connexion en cours...');

    // Navigation vers le Dashboard
    // navigateRoot remplace l'historique (l'utilisateur ne peut pas revenir au login en arrière)
    this.navCtrl.navigateRoot('/dashboard', {
      animated: true,
      animationDirection: 'forward'
    });
  }
}