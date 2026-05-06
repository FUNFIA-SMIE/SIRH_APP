import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AlertController, NavController,
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonList, IonItem, IonLabel, IonSelect, IonSelectOption, IonInput,
  IonTextarea, IonButton, IonCard, IonDatetimeButton, IonAvatar,
  IonBadge, IonGrid, IonRow, IonCol, IonIcon, IonModal, IonCheckbox, IonDatetime, IonNote
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  documentAttachOutline,
  cloudUploadOutline,
  checkmarkCircleOutline,
  calendarOutline,
  personOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { ServiceSirh } from 'src/app/services/service-sirh';

@Component({
  selector: 'app-demande-conge',
  templateUrl: './demande-conge.page.html',
  styleUrls: ['./demande-conge.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonList, IonItem, IonLabel, IonSelect, IonSelectOption, IonInput,
    IonTextarea, IonButton, IonCard, IonDatetimeButton, IonAvatar,
    IonBadge, IonGrid, IonRow, IonCol, IonIcon, IonModal, IonCheckbox, IonDatetime, IonNote
  ]
})
export class DemandeCongePage implements OnInit {
  congeForm!: FormGroup;
  currentUser: any = null; // L'employé connecté
  typesConge: any[] = [];
  justificatifBase64: string | null = null;
  solde_restant: number = 0;

  constructor(
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private fb: FormBuilder,
    private serviceSirh: ServiceSirh
  ) {
    addIcons({
      documentAttachOutline, cloudUploadOutline, checkmarkCircleOutline,
      calendarOutline, personOutline, informationCircleOutline
    });
    this.initForm();
  }

  ngOnInit() {
    this.loadUserData();
    this.loadTypesConge();

  }

  initForm(): void {
    this.congeForm = this.fb.group({
      type_conge_id: ['', Validators.required],
      date_debut: [new Date().toISOString(), Validators.required],
      date_fin: [new Date().toISOString(), Validators.required],
      demi_journee_debut: [false],
      demi_journee_fin: [false],
      motif: [''],
    });
  }

  async loadType_Conge() {
    this.typesConge = await this.serviceSirh.getTypes().toPromise();
    console.log("Types de congés:", this.typesConge);


  }

  loadUserData() {
    // Ici, vous récupérerez les infos de votre service Auth
    // Simulation d'un employé connecté :
    this.currentUser = {
      id: 123,
      nom: 'Mbodj',
      prenom: 'Awa',
      matricule: 'MAT-2024-009',
      poste: 'Analyste Développeur',
      photo_url: 'https://i.pravatar.cc/150?u=awa'
    };
  }

  async loadTypesConge() {
    // Simulation des types
    this.typesConge = [
      { id: 1, libelle: 'Congés Payés', solde: 22.5 },
      { id: 2, libelle: 'Permission', solde: 3 },
      { id: 3, libelle: 'Maladie', solde: 0 }
    ];

    this.typesConge = await this.serviceSirh.getTypes().toPromise();
    console.log("Types de congés:", this.typesConge);

  }

  onTypeChange() {
    const typeId = this.congeForm.get('type_conge_id')?.value;
    const selected = this.typesConge.find(t => t.id === typeId);
    this.solde_restant = selected ? selected.solde : 0;
  }

  // --- TA LOGIQUE DE CALCUL CONSERVÉE ---
  calculerJours(): number {
    const values = this.congeForm.value;
    const debut = new Date(values.date_debut);
    const fin = new Date(values.date_fin);
    if (isNaN(debut.getTime()) || isNaN(fin.getTime()) || fin < debut) return 0;

    const diffTime = fin.getTime() - debut.getTime();
    let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (values.demi_journee_debut) diffDays -= 0.5;
    if (values.demi_journee_fin) diffDays -= 0.5;

    return diffDays < 0 ? 0 : diffDays;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this.justificatifBase64 = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  /*
  async soumettreDemande() {
    if (this.congeForm.valid) {
      const payload = {
        ...this.congeForm.value,
        employe_id: this.currentUser.id,
        nb_jours: this.calculerJours(),
        justificatif: this.justificatifBase64
      };
      console.log("Envoi au serveur:", payload);
      this.navCtrl.navigateBack('/dashboard');
    }
  }
    */
  selectedEmploye: any | null = null;

  async soumettreDemande(): Promise<void> {
    if (this.congeForm.invalid) return;

    const v = this.congeForm.value;

    console.log('Form values', v);
    const typeId = this.congeForm.get('type_conge_id')?.value;

    // Préparation de l'objet pour le Backend (format snake_case comme la DB)
    const payload = {
      id: crypto.randomUUID(),
      employe_id: '4299b4a1-287a-419e-bd91-d8530ceddf29',
      type_conge_id: typeId,
      date_debut: v.date_debut,
      date_fin: v.date_fin,
      nb_jours: this.calculerJours(),
      motif: v.motif || null,
      demi_journee_debut: v.demi_journee_debut || false,
      demi_journee_fin: v.demi_journee_fin || false,
      justificatif: this.justificatifBase64 || null // La string Base64
    };

    this.serviceSirh.creerConge(payload).subscribe({
      next: (res) => {
        this.showToast('Demande envoyée avec succès !', 'success');
        //this.loadData();
        this.closeCreationModal(); this.justificatifBase64 = null; // Reset
      },
      error: (err) => {
        this.showToast(err.error.error || 'Une erreur est survenue', 'error');
      }
    });
  }
  notification: { message: string, type: 'success' | 'error' } | null = null;

  modalCreationVisible = false;

  showToast(message: string, type: 'success' | 'error') {
    this.notification = { message, type };
    setTimeout(() => this.notification = null, 4000); // Disparaît après 4s
  }
  fileName = '';

  closeCreationModal(): void {         // ← méthode manquante ajoutée
    this.modalCreationVisible = false;
    this.selectedEmploye = null;
    this.fileName = '';
  }


}