import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
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

  // ── Validation dates ────────────────────────────────────────
  dateDebutError = '';
  dateFinError = '';
  dateDebutInvalide = false;
  dateFinInvalide = false;

  nbJours = 0;

  poste: any = null;
  departement: any = null;

  constructor(
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private fb: FormBuilder,
    private serviceSirh: ServiceSirh,
    private pdf: ServicesPdf,
    private session: SessionService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    addIcons({
      informationCircleOutline, calendarOutline, arrowForwardOutline,
      paperPlaneOutline, documentAttachOutline, cloudUploadOutline,
      checkmarkCircleOutline, personOutline
    });
    this.initForm();
  }

  onDateChange(which: 'debut' | 'fin', event: any) {
    // ion-datetime peut émettre en dehors de la zone Angular; forcer
    // la mise à jour immédiatement pour que les affichages liés
    // (`dateDebutAffiche`, `dateFinAffiche`, `minDateFin`, `nbJours`)
    // soient recalculés.
    this.ngZone.run(() => {
      const val = event?.detail?.value ?? event?.target?.value;
      if (!val) return;
      if (which === 'debut') {
        this.congeForm.get('date_debut')?.setValue(val);
      } else {
        this.congeForm.get('date_fin')?.setValue(val);
      }
      this.recalculer();
      try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
    });
  }

  async ngOnInit() {
    await this.loadUserData();
    this.loadTypesConge();
    this.recalculer();
  }

  goBack() {
    this.navCtrl.navigateBack('/dashboard', { animated: true });
  }

  initForm(): void {
    this.congeForm = this.fb.group({
      type_conge_id: ['', Validators.required],
      date_debut: [this.toLocalDateString(new Date(), true), Validators.required],
      date_fin: [this.toLocalDateString(new Date(), true), Validators.required],
      demi_journee_debut: [false],
      demi_journee_fin: [false],
      motif: [''],
    });

    // Recalcule à chaque changement réel de valeur (pas à chaque cycle de rendu)
    this.congeForm.get('date_debut')?.valueChanges.subscribe(() => this.recalculer());
    this.congeForm.get('date_fin')?.valueChanges.subscribe(() => this.recalculer());
    this.congeForm.get('demi_journee_debut')?.valueChanges.subscribe(() => this.recalculer());
    this.congeForm.get('demi_journee_fin')?.valueChanges.subscribe(() => this.recalculer());
  }

  /**
   * Convertit une Date en chaîne LOCALE (jamais UTC), au format attendu
   * par ion-datetime / les inputs du formulaire.
   * ⚠️ Ne JAMAIS utiliser toISOString() ici : toISOString() renvoie une
   * date en UTC, ce qui peut faire "reculer" la date d'un jour selon
   * l'heure et le fuseau de l'utilisateur (ex: 01h00 à Madagascar = UTC+3
   * => toISOString() renvoie encore la veille).
   */
  private toLocalDateString(d: Date, withTime = false): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return withTime ? `${base}T00:00:00` : base;
  }

  private toMidnight(dateStr: string): Date {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // ── Recalcul centralisé (dates affichées + validation + nb jours) ────────
  recalculer(): void {
    const values = this.congeForm.value;
    if (values.date_debut) this.dateDebutAffiche = this.formatDate(new Date(values.date_debut));
    if (values.date_fin) this.dateFinAffiche = this.formatDate(new Date(values.date_fin));

    this.validerDateDebut();
    this.validerDateFin();

    if (!values.date_debut || !values.date_fin) { this.nbJours = 0; return; }

    const debut = this.toMidnight(values.date_debut);
    const fin = this.toMidnight(values.date_fin);

    if (isNaN(debut.getTime()) || isNaN(fin.getTime()) || fin < debut) {
      this.nbJours = 0;
      return;
    }

    // date_fin = jour de retour au bureau → PAS compté comme jour de congé
    let diffDays = Math.round((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24));

    // Demi-journée au départ : l'employé part l'après-midi → -0.5 jour
    if (values.demi_journee_debut) diffDays -= 0.5;

    // Demi-journée au retour : l'employé ne reprend que l'après-midi,
    // donc la matinée du jour de retour compte comme congé → +0.5 jour
    // ⚠️ À valider avec la RH selon la règle métier exacte. Si "Matin"
    // signifie au contraire "présent le matin, pas de demi-jour en plus",
    // inverser simplement le signe ci-dessous.
    if (values.demi_journee_fin) diffDays += 0.5;

    this.nbJours = diffDays < 0 ? 0 : diffDays;
    // Certaines mises à jour provenant d'ion-datetime peuvent se produire
    // hors du cycle de détection Angular; forcer la détection évite un
    // retard visuel après sélection de la date.
    try { this.cdr.detectChanges(); } catch (e) { /* noop */ }
  }

  async loadUserData() {
    const user = this.session.getUser();
    if (user) {
      this.token = user;
    }

    try {
      this.poste = await this.serviceSirh.getPosteById(this.token.poste_id).toPromise() as any;
      console.log(this.poste);
    } catch (err) {
      console.error('Erreur chargement poste:', err);
      this.poste = null;
    }

    try {
      this.departement = await this.serviceSirh.getDepartmentById(this.token.departement_id).toPromise() as any;
      console.log(this.departement);
    } catch (err) {
      console.error('Erreur chargement département:', err);
      this.departement = null;
    }

    // Données employé connecté
    this.currentUser = {
      id: this.token?.employe_id ?? 0,
      nom: this.token?.nom ?? '',
      prenom: this.token?.prenom ?? '',
      matricule: this.token?.matricule ?? '',
      poste: this.poste?.intitule ?? '',
      societe: this.token?.societe ?? 'FUNFIA',
      photo_url: 'https://i.pravatar.cc/150?u=awa'
    };

    // Une fois le poste/département connus, on revalide tout
    this.recalculer();
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

  // ── Validation jours interdits ───────────────────────────────
  private samediFinAutorise(): boolean {
    const codeDept = this.departement?.code;
    const intitulePoste = this.poste?.intitule;

    return codeDept === 'PARAMED' || codeDept === 'MED'
      || intitulePoste === 'MEDECIN CHEF' 
      || intitulePoste === 'MAJOR' 
      || intitulePoste === 'MEDECIN' 
      || intitulePoste === 'Assistante Dentaire' 
      || intitulePoste === "Agent d'Accueil"
      || intitulePoste === 'PARAMED'
      || intitulePoste === 'Agent de surface'
  }

  /**
   * Vérifie si l'après-midi d'aujourd'hui est encore disponible.
   * Considère que l'après-midi commence à 12h.
   */
  private isApresmidiDisponible(): boolean {
    const now = new Date();
    const heure = now.getHours();
    // L'après-midi commence à 12h00, donc elle n'est disponible que avant cette heure
    return heure < 12;
  }

  private validerDateDebut(): void {
    const ctrl = this.congeForm.get('date_debut');
    const val = ctrl?.value;
    if (!val) {
      this.dateDebutError = '';
      this.dateDebutInvalide = false;
      ctrl?.setErrors(null);
      return;
    }

    const jour = new Date(val).getDay(); // 0 = dimanche, 6 = samedi

    if (jour === 0 || jour === 6) {
      this.dateDebutError = 'Le congé ne peut pas commencer un samedi ou un dimanche.';
      this.dateDebutInvalide = true;
      ctrl?.setErrors({ jourInterdit: true });
      return;
    }

    // Vérifier que l'après-midi n'est pas déjà passée si demi-journée cochée et date = aujourd'hui
    const demiJourneeDebut = this.congeForm.get('demi_journee_debut')?.value;
    if (demiJourneeDebut) {
      const dateDebut = new Date(val);
      const aujourd = new Date();
      aujourd.setHours(0, 0, 0, 0);
      dateDebut.setHours(0, 0, 0, 0);

      // Si c'est aujourd'hui et demi-journée cochée
      if (dateDebut.getTime() === aujourd.getTime() && !this.isApresmidiDisponible()) {
        this.dateDebutError = 'Après-midi non disponible. Veuillez choisir une autre date ou décocher cette option.';
        this.dateDebutInvalide = true;
        ctrl?.setErrors({ apresmidiPassee: true });
        return;
      }
    }

    this.dateDebutError = '';
    this.dateDebutInvalide = false;
    ctrl?.setErrors(null);
  }

  private validerDateFin(): void {
    const ctrl = this.congeForm.get('date_fin');
    const val = ctrl?.value;
    if (!val) {
      this.dateFinError = '';
      this.dateFinInvalide = false;
      ctrl?.setErrors(null);
      return;
    }

    const jour = new Date(val).getDay(); // 0 = dimanche, 6 = samedi

    if (jour === 0) {
      this.dateFinError = 'Le retour ne peut pas être fixé un dimanche.';
      this.dateFinInvalide = true;
      ctrl?.setErrors({ jourInterdit: true });
      return;
    }

    if (jour === 6 && !this.samediFinAutorise()) {
      this.dateFinError = 'Le retour un samedi est réservé au personnel MEDECIN/PARAMED.';
      this.dateFinInvalide = true;
      ctrl?.setErrors({ jourInterdit: true });
      return;
    }

    this.dateFinError = '';
    this.dateFinInvalide = false;
    ctrl?.setErrors(null);
  }

  getSoldeUnite(): string {
    return this.getTypeSelectionne()?.code === 'DISPO' ? 'H' : 'j';
  }

  get typeSelectionne(): boolean {
    return !!this.congeForm.get('type_conge_id')?.value;
  }

  getTypeSelectionne(): any {
    const typeId = this.congeForm.get('type_conge_id')?.value;
    return this.typesConge?.find((t: any) => t.id === typeId);
  }

  // ── CONSTRUCTION DU formData pour le PDF ─────────────────────────────────
  private buildFormData(): DemandeAbsenceData {
    const v = this.congeForm.value;
    const typeObj = this.getTypeSelectionne();
    const nbJours = this.nbJours;
    const soldeTotal = typeObj?.solde ?? this.solde_restant;
    const reliquat = soldeTotal - nbJours;

    const typeKey = mapTypeConge(typeObj?.libelle ?? '');
    const isAutorisationSortie = typeKey === 'autorisation_sortie';

    return {
      ref: `${String(new Date().getMonth() + 1).padStart(3, '0')}/${new Date().getFullYear()}/RH`,

      nom: (this.currentUser?.nom ?? '').toUpperCase(),
      prenom: this.currentUser?.prenom ?? '',
      fonction: this.poste?.intitule ?? '',
      societe: this.currentUser?.societe ?? 'FUNFIA',
      matricule: this.currentUser?.matricule ?? this.token?.matricule ?? '',
      dateDemande: this.formatDate(new Date()),

      dateDepart: this.formatDate(new Date(v.date_debut)),
      dateRetour: this.formatDate(new Date(v.date_fin)),
      duree: `${nbJours} jour${nbJours > 1 ? 's' : ''}`,

      type: typeKey,

      droits: typeKey === 'conge_paye' ? `${soldeTotal} jour${soldeTotal > 1 ? 's' : ''}` : '',
      congePrisDurantLeMois: typeKey === 'conge_paye' ? '0 jour' : '',
      congeDemande: typeKey === 'conge_paye' ? `${nbJours} jour${nbJours > 1 ? 's' : ''}` : '',
      reliquat: typeKey === 'conge_paye' ? `${reliquat} jour${reliquat > 1 ? 's' : ''}` : '',

      heureDepart: isAutorisationSortie ? (v.heure_depart ?? '') : '',
      heureRetour: isAutorisationSortie ? (v.heure_retour ?? '') : '',

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

    this.recalculer(); // revalide au cas où
    if (this.dateDebutInvalide || this.dateFinInvalide) {
      const alert = await this.alertCtrl.create({
        header: '📅 Dates invalides',
        message: this.dateDebutError || this.dateFinError,
        buttons: [{ text: 'OK', role: 'cancel', cssClass: 'alert-btn-cancel' }]
      });
      await alert.present();
      return;
    }

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
        ]
      });
      await alert.present();
      return;
    }
    this.envoyerDemande();
  }

  private async envoyerDemande(): Promise<void> {
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
      nb_jours: this.nbJours,
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
            {
              text: 'OK', handler: () => {
                this.closeCreationModal();
                this.justificatifBase64 = null;
                this.navCtrl.navigateBack('/dashboard', { animated: true });
              }
            }
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
    const nb = this.nbJours;
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
        message: `Pour un congé de ${nb} jour(s), la demande doit être soumise ${libelle}.`
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

  get today(): string {
    return this.toLocalDateString(new Date());
  }

  get minDateFin(): string {
    const debut = this.congeForm?.get('date_debut')?.value;
    if (!debut) return this.today;
    const debutStr = this.toLocalDateString(new Date(debut));
    return debutStr > this.today ? debutStr : this.today;
  }
}