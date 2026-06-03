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
  informationCircleOutline, arrowForwardOutline, paperPlaneOutline } from 'ionicons/icons';
import { ServiceSirh } from 'src/app/services/service-sirh';
import { DemandeAbsenceData, ServicesPdf } from 'src/app/services/services-pdf';

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
  today = new Date().toISOString().split('T')[0];
  dateDebutAffiche = this.formatDate(new Date());
  dateFinAffiche = this.formatDate(new Date());
  //today = new Date().toISOString();
  congeForm!: FormGroup;
  currentUser: any = null; // L'employé connecté
  typesConge: any[] = [];
  justificatifBase64: string | null = null;
  solde_restant: number = 0;
  token: any;
  formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
  formData: DemandeAbsenceData = {
    // Référence
    ref: '001/2026/RH',

    // Partie I - Salarié
    nom: 'RAKOTO',
    prenom: 'Jean Pierre',
    fonction: 'Technicien Informatique',
    societe: 'FUNFIA',
    matricule: 'EMP-2024-042',
    dateDemande: '19/05/2026',

    // Partie II - Période
    dateDepart: '22/05/2026',
    dateRetour: '24/05/2026',
    duree: '3 jours',

    // Type
    type: 'conge_paye',

    // Si congé payé
    droits: '25 jours',
    congePrisDurantLeMois: '0 jour',
    congeDemande: '3 jours',
    reliquat: '22 jours',

    // Si autorisation de sortie
    heureDepart: '',
    heureRetour: '',
    motif: '',
  };
  solde_par_employe: any;




  constructor(
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private fb: FormBuilder,
    private serviceSirh: ServiceSirh,
    private pdf: ServicesPdf
  ) {
    addIcons({informationCircleOutline,calendarOutline,arrowForwardOutline,paperPlaneOutline,documentAttachOutline,cloudUploadOutline,checkmarkCircleOutline,personOutline});
    this.initForm();
  }

  ngOnInit() {
    this.loadUserData();
    this.loadTypesConge();


  }

  goBack() {
  this.navCtrl.navigateBack('/dashboard', { animated: true });
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

    const data = localStorage.getItem('utilisateur');
    if (data) {
      this.token = JSON.parse(data);
    }

    console.log("Utilisateur connecté:", this.token);

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


  async getSoldeAffiche(): Promise<any> {


    if (!this.selectedEmploye) return 0;
    const typeId = this.congeForm.get('type_conge_id')?.value;
    if (!typeId) return 0;


    this.solde_par_employe = await this.serviceSirh.getSoldes(this.token.employe_id, typeId).toPromise();
    this.solde_par_employe = this.solde_par_employe[0].solde_restant;

    console.log('Soldes récupérés pour l\'employé', this.solde_par_employe);

    return this.solde_par_employe;

  }

  verifierDelaiDepot(): { valide: boolean; message: string } {
    const nb = this.calculerJours();
    const dateDebut = new Date(this.congeForm.get('date_debut')?.value);
    const aujourd_hui = new Date();
    aujourd_hui.setHours(0, 0, 0, 0);
    dateDebut.setHours(0, 0, 0, 0);
    const joursAvance = Math.round((dateDebut.getTime() - aujourd_hui.getTime()) / (1000 * 60 * 60 * 24));

    let delaiRequis = 0;
    let libelle = '';

    if (nb === 1) {
      delaiRequis = 0; // la veille ou le jour même
      libelle = 'la veille ou le jour même';
    } else if (nb <= 3) {
      delaiRequis = 7;
      libelle = '7 jours à l\'avance';
    } else if (nb <= 7) {
      delaiRequis = 10;
      libelle = '10 jours à l\'avance';
    } else if (nb <= 15) {
      delaiRequis = 21;
      libelle = '21 jours à l\'avance';
    } else {
      delaiRequis = 30;
      libelle = '30 jours à l\'avance';
    }

    if (joursAvance < delaiRequis) {
      return {
        valide: false,
        message: `Pour un congé de ${nb} jour(s), la demande doit être soumise ${libelle}.\n\nVous êtes à ${joursAvance} jour(s) du début — il manque ${delaiRequis - joursAvance} jour(s).`
      };
    }
    return { valide: true, message: '' };
  }

  async soumettreDemande(): Promise<void> {
    if (this.congeForm.invalid) return;

    const check = this.verifierDelaiDepot();
    if (!check.valide) {
      const alert = await this.alertCtrl.create({
        header: '⚠️ Délai de dépôt non respecté',
        message: check.message,
        buttons: [
          {
            text: 'Modifier les dates',
            role: 'cancel',
            cssClass: 'alert-btn-cancel'
          },
          {
            text: 'Soumettre quand même',
            cssClass: 'alert-btn-force',
            handler: () => this.envoyerDemande()
          }
        ]
      });
      await alert.present();
      return;
    }

    this.envoyerDemande();
  }

  private async envoyerDemande(): Promise<void> {
    this.pdf.generatePdf(this.formData);
    const v = this.congeForm.value;
    const payload = {
      id: crypto.randomUUID(),
      employe_id: this.token?.employe_id,
      type_conge_id: this.congeForm.get('type_conge_id')?.value,
      date_debut: v.date_debut,
      date_fin: v.date_fin,
      nb_jours: this.calculerJours(),
      motif: v.motif || null,
      demi_journee_debut: v.demi_journee_debut || false,
      demi_journee_fin: v.demi_journee_fin || false,
      justificatif: this.justificatifBase64 || null
    };

    this.serviceSirh.creerConge(payload).subscribe({
      next: () => {
        this.showToast('Demande envoyée avec succès !', 'success');
        this.closeCreationModal();
        this.justificatifBase64 = null;
      },
      error: (err) => {
        this.showToast(err.error.error || 'Une erreur est survenue', 'error');
      }
    });
  }

  getSoldeUnite(): string {
    return this.getTypeSelectionne()?.code === 'DISPO' ? 'H' : 'j';
  }


  getTypeSelectionne(): any {
    const typeId = this.congeForm.get('type_conge_id')?.value;
    return this.typesConge?.find((t: any) => t.id === typeId);
  }

  async onTypeChange() {
    const typeId = this.congeForm.get('type_conge_id')?.value;
    console.log('result brut:', this.token.employe_id);

    console.log('Type de congé sélectionné:', typeId, 'Employé sélectionné:', this.token);
    if (!typeId || !this.token?.employe_id) {
      this.solde_restant = 0;
      return;
    }
    try {
      const result = await this.serviceSirh.getSoldes(this.token.employe_id, typeId).toPromise();
      console.log('result brut:', result);
      this.solde_restant = result?.[0]?.solde_restant ?? 0;
    } catch (e) {
      this.solde_restant = 0;
    }
  }

calculerJours(): number {
  const values = this.congeForm.value;

  if (values.date_debut) this.dateDebutAffiche = this.formatDate(new Date(values.date_debut));
  if (values.date_fin)   this.dateFinAffiche   = this.formatDate(new Date(values.date_fin));

  const debut = new Date(values.date_debut);
  const fin = new Date(values.date_fin);

  if (isNaN(debut.getTime()) || isNaN(fin.getTime()) || fin < debut) return 0;

  const diffTime = fin.getTime() - debut.getTime();
  let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (values.demi_journee_debut) diffDays -= 0.5;
  if (values.demi_journee_fin)   diffDays -= 0.5;

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
  /*
    async soumettreDemande(): Promise<void> {
      if (this.congeForm.invalid) return;
      this.pdf.generatePdf(this.formData); // Génère le PDF avec les données du formulaire
  
  
      const v = this.congeForm.value;
  
      console.log('Form values', v);
      const typeId = this.congeForm.get('type_conge_id')?.value;
  
      // Préparation de l'objet pour le Backend (format snake_case comme la DB)
      const payload = {
        id: crypto.randomUUID(),
        employe_id: this.token?.employe_id,
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
      */
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