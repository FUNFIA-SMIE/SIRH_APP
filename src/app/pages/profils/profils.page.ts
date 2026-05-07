import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  NavController,
  ToastController,
  ActionSheetController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkOutline,
  cameraOutline,
  personOutline,
  briefcaseOutline,
  mailOutline,
  chevronBackOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-profils',
  templateUrl: './profils.page.html',
  styleUrls: ['./profils.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ProfilsPage implements OnInit {

  // Modèle de données simplifié pour l'utilisateur
  employe: any = {
    nom: 'Rakoto',
    prenom: 'Jean',
    matricule: 'FUN-2024-001',
    nom_usage: '',
    email_perso: 'jean.rakoto@gmail.com',
    telephone_perso: '034 00 123 45',
    adresse: 'Lot IVG 152 Ambatoroka',
    ville: 'Antananarivo',
    code_postal: '101',
    email_pro: 'j.rakoto@funfia.mg',
    poste_id: 'Développeur Fullstack',
  };

  photoPreview: string | null = 'https://ui-avatars.com/api/?name=Jean+Rakoto&background=3b82f6&color=fff';
  isLoading: boolean = false;
  token: any;

  constructor(
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController
  ) {
    // Enregistrement des icônes Ionicons
    addIcons({
      checkmarkOutline,
      cameraOutline,
      personOutline,
      briefcaseOutline,
      mailOutline,
      chevronBackOutline
    });
  }

  ngOnInit() {

    const data = localStorage.getItem('utilisateur');
    if (data) {
      this.token = JSON.parse(data);
      this.photoPreview = this.token.photo_url || this.photoPreview;
    }

    console.log("Utilisateur connecté:", this.token);

  }

  // Gestion de la sélection de photo
  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  // Simulation de la sauvegarde
  async saveEmploye() {
    this.isLoading = true;

    // Simulation d'un délai réseau
    setTimeout(async () => {
      this.isLoading = false;

      const toast = await this.toastCtrl.create({
        message: 'Profil mis à jour avec succès !',
        duration: 2000,
        color: 'success',
        position: 'bottom'
      });
      toast.present();
    }, 1500);
  }
}