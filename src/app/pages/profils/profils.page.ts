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
import { ServiceSirh } from 'src/app/services/service-sirh';

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
    intitule_poste: '',
    photo_url: '',
    organisation_id:''
  };

  photoPreview: string | null = 'https://ui-avatars.com/api/?name=Jean+Rakoto&background=3b82f6&color=fff';
  isLoading: boolean = false;
  token: any;
  poste: any;

  constructor(
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private srvc: ServiceSirh
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

  async ngOnInit() {



    const data = localStorage.getItem('utilisateur');
    if (data) {
      this.token = JSON.parse(data);
      this.photoPreview = this.token.photo_url || this.photoPreview;
    }

    console.log("Utilisateur connecté:", this.token);

    this.poste = await this.srvc.getAllEmployees().toPromise();

    this.poste = this.poste.filter((data: any) => data.employe_id === this.token.employe_id);
    console.log("poste", this.poste)
    this.employe = {
      nom: 'Rakoto',
      prenom: 'Jean',
      matricule: 'FUN-2024-001',
      nom_usage: this.poste[0].prenom_employe,
      email_perso: this.poste[0].email_perso,
      telephone_perso: this.poste[0].telephone_perso,
      adresse: this.poste[0].adresse,
      ville: this.poste[0].ville,
      code_postal: this.poste[0].code_postal,
      email_pro: this.poste[0].email_pro,
      poste_id: this.poste[0].prenom_employe,
      intitule_poste: this.poste[0].intitule_poste,
      photo_url: this.poste[0].photo_url,
      organisation_id:null
    };



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

    // Uniquement les champs personnels modifiables par l'employé
    const champsPersonnels = {
      nom_usage: this.employe.nom_usage,
      email_perso: this.employe.email_perso,
      telephone_perso: this.employe.telephone_perso,
      adresse: this.employe.adresse,
      ville: this.employe.ville,
      code_postal: this.employe.code_postal,
      photo_url: this.photoPreview,
      organisation_id:'0226b11d-fa98-499c-a856-37f919df0fa5'
    };

    try {
      await this.srvc.updateEmploye(this.token.employe_id, champsPersonnels).toPromise();

      // Mettre à jour le localStorage avec les nouvelles données
      this.token = { ...this.token, ...champsPersonnels };
      localStorage.setItem('utilisateur', JSON.stringify(this.token));

      const toast = await this.toastCtrl.create({
        message: 'Profil mis à jour avec succès !',
        duration: 2000,
        color: 'success',
        position: 'bottom'
      });
      toast.present();

    } catch (err) {
      console.error('Erreur lors de la mise à jour :', err);
      const toast = await this.toastCtrl.create({
        message: 'Erreur lors de la mise à jour. Réessayez.',
        duration: 3000,
        color: 'danger',
        position: 'bottom'
      });
      toast.present();

    } finally {
      this.isLoading = false;
    }
  }


}