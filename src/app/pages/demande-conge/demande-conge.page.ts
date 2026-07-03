import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AlertController, NavController,
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonList, IonItem, IonLabel, IonSelect, IonSelectOption, IonInput,
  IonTextarea, IonButton, IonCard, IonDatetimeButton, IonAvatar,
  IonBadge, IonGrid, IonRow, IonCol, IonIcon, IonModal, IonCheckbox, IonDatetime, IonNote, IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  documentAttachOutline, cloudUploadOutline, checkmarkCircleOutline,
  calendarOutline, personOutline, informationCircleOutline,
  arrowForwardOutline, paperPlaneOutline
} from 'ionicons/icons';
import { ServiceSirh } from 'src/app/services/service-sirh';
import { SessionService } from 'src/app/services/session.service';
import { DemandeAbsenceData, ServicesPdf } from 'src/app/services/services-pdf';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Mappe le code interne du type de congé (venant de l'API ou du libellé)
 * vers la clé attendue par DemandeAbsenceData.
 */
function mapTypeConge(
  libelle: string
): DemandeAbsenceData['type'] {
  const l = libelle?.toLowerCase() ?? '';
  if (l.includes('payé') || l.includes('paye')) return 'conge_paye';
  if (l.includes('sans solde')) return 'conge_sans_solde';
  if (l.includes('permission') || l.includes('exceptionnelle')) return 'permission_exceptionnelle';
  if (l.includes('autorisation') || l.includes('sortie')) return 'autorisation_sortie';
  if (l.includes('disponibilité') || l.includes('disponibilite')) return 'disponibilite';
  return 'autre';
}

@Component({
  selector: 'app-demande-conge',
  templateUrl: './demande-conge.page.html',
  styleUrls: ['./demande-conge.page.scss'],
  standalone: true,
  imports: [IonSpinner,
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

  congeForm!: FormGroup;
  currentUser: any = null;
  typesConge: any[] = [];
  justificatifBase64: string | null = null;
  solde_restant = 0;
  token: any;

  // PDF preview
  pdfPreviewUrlSafe: SafeResourceUrl | null = null;
  pdfModalOpen = false;

  selectedEmploye: any | null = null;
  notification: { message: string; type: 'success' | 'error' } | null = null;
  modalCreationVisible = false;
  fileName = '';

  constructor(
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private fb: FormBuilder,
    private serviceSirh: ServiceSirh,
    private pdf: ServicesPdf,
    private session: SessionService,
    private sanitizer: DomSanitizer
  ) {
    addIcons({
      informationCircleOutline, calendarOutline, arrowForwardOutline,
      paperPlaneOutline, documentAttachOutline, cloudUploadOutline,
      checkmarkCircleOutline, personOutline
    });
    this.initForm();
  }

  async ngOnInit() {
    await this.loadUserData();
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
  poste: any = null;

  async loadUserData() {
    const user = this.session.getUser();
    if (user) {
      this.token = user;
    }

    try {
      this.poste = await this.serviceSirh.getPosteById(this.token.poste_id).toPromise() as any;
      console.log(this.poste)

    } catch (err) {
      console.error('Erreur chargement poste:', err);
      this.poste = null;
    }


    // Données employé connecté (à remplacer par votre service Auth)
    this.currentUser = {
      id: this.token?.employe_id ?? 0,
      nom: this.token?.nom ?? '',
      prenom: this.token?.prenom ?? '',
      matricule: this.token?.matricule ?? '',
      poste: this.poste?.intitule ?? '',
      societe: this.token?.societe ?? 'FUNFIA',
      photo_url: 'https://i.pravatar.cc/150?u=awa'
    };
  }

  async loadTypesConge() {
    try {
      this.typesConge = await this.serviceSirh.getTypes().toPromise();
    } catch {
      this.typesConge = [
        { id: 1, libelle: 'Congés Payés', solde: 22.5 },
        { id: 2, libelle: 'Permission', solde: 3 },
        { id: 3, libelle: 'Maladie', solde: 0 }
      ];
    }
  }

  async onTypeChange() {
    const typeId = this.congeForm.get('type_conge_id')?.value;
    if (!typeId || !this.token?.employe_id) { this.solde_restant = 0; return; }
    try {
      const result = await this.serviceSirh.getSoldes(this.token.employe_id, typeId).toPromise();
      this.solde_restant = result?.[0]?.solde_restant ?? 0;
    } catch { this.solde_restant = 0; }
  }

  calculerJours(): number {
    const values = this.congeForm.value;
    if (values.date_debut) this.dateDebutAffiche = this.formatDate(new Date(values.date_debut));
    if (values.date_fin) this.dateFinAffiche = this.formatDate(new Date(values.date_fin));

    const debut = new Date(values.date_debut);
    const fin = new Date(values.date_fin);
    if (isNaN(debut.getTime()) || isNaN(fin.getTime()) || fin < debut) return 0;

    let diffDays = Math.round((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (values.demi_journee_debut) diffDays -= 0.5;
    if (values.demi_journee_fin) diffDays -= 0.5;
    return diffDays < 0 ? 0 : diffDays;
  }

  getSoldeUnite(): string {
    return this.getTypeSelectionne()?.code === 'DISPO' ? 'H' : 'j';
  }

  getTypeSelectionne(): any {
    const typeId = this.congeForm.get('type_conge_id')?.value;
    return this.typesConge?.find((t: any) => t.id === typeId);
  }

  // ── CONSTRUCTION DU formData pour le PDF ─────────────────────────────────
  private buildFormData(): DemandeAbsenceData {
    const v = this.congeForm.value;
    const typeObj = this.getTypeSelectionne();
    const nbJours = this.calculerJours();
    const soldeTotal = typeObj?.solde ?? this.solde_restant;
    const reliquat = soldeTotal - nbJours;

    // Détermine la clé de type à partir du libellé renvoyé par l'API
    const typeKey = mapTypeConge(typeObj?.libelle ?? '');

    // Heure de départ/retour uniquement pour autorisation de sortie
    const isAutorisationSortie = typeKey === 'autorisation_sortie';

    return {
      // Référence auto-générée
      ref: `${String(new Date().getMonth() + 1).padStart(3, '0')}/${new Date().getFullYear()}/RH`,

      // ── Partie I : données employé connecté ──
      nom: (this.currentUser?.nom ?? '').toUpperCase(),
      prenom: this.currentUser?.prenom ?? '',
      fonction: this.poste?.intitule ?? '',
      societe: this.currentUser?.societe ?? 'FUNFIA',
      matricule: this.currentUser?.matricule ?? this.token?.matricule ?? '',
      dateDemande: this.formatDate(new Date()),

      // ── Partie II : période saisie dans le formulaire ──
      dateDepart: this.formatDate(new Date(v.date_debut)),
      dateRetour: this.formatDate(new Date(v.date_fin)),
      duree: `${nbJours} jour${nbJours > 1 ? 's' : ''}`,

      // ── Type coché ──
      type: typeKey,

      // ── Si congé payé : soldes ──
      droits: typeKey === 'conge_paye' ? `${soldeTotal} jour${soldeTotal > 1 ? 's' : ''}` : '',
      congePrisDurantLeMois: typeKey === 'conge_paye' ? '0 jour' : '',
      congeDemande: typeKey === 'conge_paye' ? `${nbJours} jour${nbJours > 1 ? 's' : ''}` : '',
      reliquat: typeKey === 'conge_paye' ? `${reliquat} jour${reliquat > 1 ? 's' : ''}` : '',

      // ── Si autorisation de sortie : heures ──
      heureDepart: isAutorisationSortie ? (v.heure_depart ?? '') : '',
      heureRetour: isAutorisationSortie ? (v.heure_retour ?? '') : '',

      // ── Motif (tous types) ──
      motif: v.motif ?? '',
    };
  }
  isGeneratingPdf = false;
  // ── Aperçu PDF ────────────────────────────────────────────────────────────
  async previewPdf() {
    this.isGeneratingPdf = true;
    try {
      const url = await this.pdf.generatePdfDataUrl(this.buildFormData());
      this.pdfPreviewUrlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.pdfModalOpen = true;
    } catch (e) {
      this.showToast("Impossible de générer l'aperçu PDF", 'error');
    } finally {
      this.isGeneratingPdf = false;
    }
  }

  // ── Soumission avec vérification du délai ────────────────────────────────
  async soumettreDemande(): Promise<void> {
    if (this.congeForm.invalid) return;

    // Si type 'maladie' sélectionné, justificatif obligatoire
    const typeObj = this.getTypeSelectionne();
    const libelle = (typeObj?.libelle || '').toLowerCase();
    const estMaladie = libelle.includes('malad') || libelle.includes('maladie') || libelle.includes('sick');
    if (estMaladie && !this.justificatifBase64) {
      const alert = await this.alertCtrl.create({
        header: '📎 Justificatif requis',
        message: 'Pour un congé de maladie, un justificatif médical est obligatoire. Veuillez joindre un fichier.',
        buttons: [
          { text: 'OK', role: 'cancel', cssClass: 'alert-btn-cancel' }
        ]
      });
      await alert.present();
      return;
    }

    const check = this.verifierDelaiDepot();
    if (!check.valide) {
      const alert = await this.alertCtrl.create({
        header: '⚠️ Délai de dépôt non respecté',
        message: check.message,
        buttons: [
          { text: 'Modifier les dates', role: 'cancel', cssClass: 'alert-btn-cancel' },
          //{ text: 'Soumettre quand même', cssClass: 'alert-btn-force', handler: () => this.envoyerDemande() }
        ]
      });
      await alert.present();
      return;
    }
    this.envoyerDemande();
  }

  private async envoyerDemande(): Promise<void> {
    // Génère et télécharge le PDF avec les vraies données

    this.isGeneratingPdf = true;

    try {
      await this.pdf.generatePdf(this.buildFormData());
    } finally {
      this.isGeneratingPdf = false;
    }
    const v = this.congeForm.value;
    const payload = {
      id: crypto.randomUUID(),
      employe_id: this.token?.employe_id,
      type_conge_id: v.type_conge_id,
      date_debut: v.date_debut,
      date_fin: v.date_fin,
      nb_jours: this.calculerJours(),
      motif: v.motif || null,
      demi_journee_debut: v.demi_journee_debut || false,
      demi_journee_fin: v.demi_journee_fin || false,
      justificatif: this.justificatifBase64 || null
    };

    this.serviceSirh.creerConge(payload).subscribe({
      next: async () => {
        const alert = await this.alertCtrl.create({
          header: '✅ Succès',
          message: 'Votre demande de congé a été envoyée avec succès !',
          buttons: [
            { text: 'OK', handler: () => {
              this.closeCreationModal();
              this.justificatifBase64 = null;
              this.navCtrl.navigateBack('/dashboard', { animated: true });
            }}
          ]
        });
        await alert.present();
      },
      error: async (err) => {
        const alert = await this.alertCtrl.create({
          header: '❌ Erreur',
          message: err.error?.error || 'Une erreur est survenue lors de l\'envoi de la demande. Veuillez réessayer.',
          buttons: [
            { text: 'OK', role: 'cancel' }
          ]
        });
        await alert.present();
      }
    });
  }

  // ── Vérification délai ────────────────────────────────────────────────────
  verifierDelaiDepot(): { valide: boolean; message: string } {
    const nb = this.calculerJours();
    const dateDebut = new Date(this.congeForm.get('date_debut')?.value);
    const aujourd_hui = new Date(); aujourd_hui.setHours(0, 0, 0, 0); dateDebut.setHours(0, 0, 0, 0);
    const joursAvance = Math.round((dateDebut.getTime() - aujourd_hui.getTime()) / 86400000);

    let delaiRequis = 0, libelle = '';
    if (nb <= 1) { delaiRequis = 0; libelle = 'la veille ou le jour même'; }
    else if (nb <= 3) { delaiRequis = 7; libelle = '7 jours à l\'avance'; }
    else if (nb <= 7) { delaiRequis = 10; libelle = '10 jours à l\'avance'; }
    else if (nb <= 15) { delaiRequis = 21; libelle = '21 jours à l\'avance'; }
    else { delaiRequis = 30; libelle = '30 jours à l\'avance'; }

    if (joursAvance < delaiRequis) {
      return {
        valide: false,
        message: `Pour un congé de ${nb} jour(s), la demande doit être soumise ${libelle}.\n\nVous êtes à ${joursAvance} jour(s) du début — il manque ${delaiRequis - joursAvance} jour(s).`
      };
    }
    return { valide: true, message: '' };
  }

  // ── Fichier justificatif ──────────────────────────────────────────────────
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.fileName = file.name;
      const reader = new FileReader();
      reader.onload = () => this.justificatifBase64 = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  // ── Utilitaires ───────────────────────────────────────────────────────────
  formatDate(d: Date): string {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  showToast(message: string, type: 'success' | 'error') {
    this.notification = { message, type };
    setTimeout(() => this.notification = null, 4000);
  }

  closeCreationModal(): void {
    this.modalCreationVisible = false;
    this.selectedEmploye = null;
    this.fileName = '';
  }
}