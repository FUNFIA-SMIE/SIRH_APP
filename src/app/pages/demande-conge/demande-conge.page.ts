import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonButtons, 
  IonBackButton, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonSelect, 
  IonSelectOption, 
  IonInput, 
  IonTextarea, 
  IonButton,
  AlertController,
  NavController
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-demande-conge',
  templateUrl: './demande-conge.page.html',
  styleUrls: ['./demande-conge.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonContent, 
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonButtons, 
    IonBackButton, 
    IonList, 
    IonItem, 
    IonLabel, 
    IonSelect, 
    IonSelectOption, 
    IonInput, 
    IonTextarea, 
    IonButton
  ]
})
export class DemandeCongePage implements OnInit {
  
  // Modèle pour stocker les données du formulaire
  demande = {
    type: '',
    dateDebut: '',
    dateFin: '',
    commentaire: ''
  };

  constructor(
    private alertCtrl: AlertController,
    private navCtrl: NavController
  ) { }

  ngOnInit() {}

  async onSubmit() {
    // Vérification simple
    if (!this.demande.type || !this.demande.dateDebut || !this.demande.dateFin) {
      const alert = await this.alertCtrl.create({
        header: 'Erreur',
        message: 'Veuillez remplir tous les champs obligatoires.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Ici, tu ajouteras plus tard l'appel à ton API (ta table conge)
    console.log('Demande envoyée :', this.demande);

    // Message de succès
    const successAlert = await this.alertCtrl.create({
      header: 'Succès !',
      message: 'Votre demande de congé a été soumise avec succès.',
      buttons: [{
        text: 'Super',
        handler: () => {
          // Retour automatique au Dashboard après validation
          this.navCtrl.navigateBack('/dashboard');
        }
      }]
    });

    await successAlert.present();
  }
}