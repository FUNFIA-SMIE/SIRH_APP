import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule } from '@angular/forms';
import { IonSelectOption, IonBadge, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonIcon, IonModal, IonButton } from '@ionic/angular/standalone';
import { ServiceSirh } from 'src/app/services/service-sirh';
import { NavController, IonTextarea } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, searchOutline, briefcaseOutline, calendarOutline,
  timeOutline, chatbubbleOutline, closeOutline, checkmarkOutline,
  alertCircleOutline, closeCircleOutline, checkmarkCircleOutline,
  checkmarkDoneCircleOutline, informationCircleOutline, documentTextOutline, calculatorOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-validation',
  templateUrl: './validation.page.html',
  styleUrls: ['./validation.page.scss'],
  standalone: true,
  imports: [IonBadge, IonTextarea, IonButton, IonModal, IonSelectOption, IonIcon, IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class ValidationPage implements OnInit {
  demandeEnCours: any;
  motifRefusError: any;
  modalRefusVisible: any;
  motifRefus: any;
  allDemandes: any[] = [];
  filtered: any[] = [];
  typesConge: any[] = [];
  searchQuery = '';
  filterStatut = '';
  filterType = '';
  solde_par_employe: any;
  token: any;
  data_: any;
  notification: { message: string, type: 'success' | 'error' } | null = null;
  @ViewChild(IonModal) modal!: IonModal;

  get countEnAttente() {
    return this.allDemandes.filter((d: any) =>
      d.statut === 'en_attente_manager' || d.statut === 'en_attente_rh'
    ).length;
  }

  get totalJoursDemandes() {
    return Math.round(this.allDemandes.reduce((s: any, d: any) => s + d.nbJours, 0));
  }
  goBack() {
    this.navCtrl.navigateBack('/dashboard', { animated: true });
  }
  get countApprouves() {
    return this.allDemandes.filter((d: any) => d.statut === 'approuve').length;
  }

  get countRefuses() {
    return this.allDemandes.filter((d: any) => d.statut === 'refuse').length;
  }
  constructor(

    private fb: FormBuilder,
    private service: ServiceSirh,
    //private pdf: ServicesPdf,
    private navCtrl: NavController
  ) {

    addIcons({ arrowBackOutline, searchOutline, checkmarkDoneCircleOutline, briefcaseOutline, calendarOutline, timeOutline, chatbubbleOutline, calculatorOutline, closeOutline, checkmarkOutline, alertCircleOutline, closeCircleOutline, documentTextOutline, checkmarkCircleOutline, informationCircleOutline });
  }

  async ngOnInit() {
    await this.loadData();

    this.data_ = localStorage.getItem('utilisateur');
    if (this.data_) {
      this.token = JSON.parse(this.data_);
      const poste = await this.service.getPosteById(this.token.poste_id).toPromise() as any;

      if (poste.intitule === 'Directeur Exécutif') {
        this.filterStatut = 'en_attente_rh';      // ← filterStatut, pas searchQuery
      } else if (poste.intitule === 'MEDECIN CHEF' || poste.intitule === 'MAJOR') {
        this.filterStatut = 'en_attente_manager';
      }
      // Autres rôles → pas de filtre par défaut, tout s'affiche

      this.applyFilters(); // ← un seul appel après avoir défini le filtre
    }

  }

  applyFilters(): void {
    if (!this.allDemandes) return;

    console.log('=== DEBUG FILTRES ===');
    console.log('searchQuery:', this.searchQuery);
    console.log('filterStatut:', this.filterStatut);
    console.log('filterType:', this.filterType);
    console.log('allDemandes count:', this.allDemandes.length);
    console.log('sample statut:', this.allDemandes[0]?.statut);
    console.log('sample typeConge.libelle:', this.allDemandes[0]?.typeConge?.libelle);
    console.log('typesConge libelles:', this.typesConge?.map((t: any) => t.libelle));

    const q = this.searchQuery.toLowerCase().trim();
    const st = this.filterStatut;
    const ty = this.filterType;

    this.filtered = this.allDemandes.filter((d: any) => {
      const nom = (d.employe?.nom || '').toLowerCase();
      const prenom = (d.employe?.prenom || '').toLowerCase();
      const typeLibelle = (d.typeConge?.libelle || '').toLowerCase();

      const matchQuery = !q || nom.includes(q) || prenom.includes(q) || typeLibelle.includes(q);
      const matchStatut = !st || d.statut === st;
      const matchType = !ty || (d.typeConge?.libelle || '').trim() === ty.trim();

      console.log(`[${d.id}] statut="${d.statut}" matchStatut=${matchStatut} | type="${d.typeConge?.libelle}" matchType=${matchType}`);

      return matchQuery && matchStatut && matchType;
    });

    console.log('filtered count:', this.filtered.length);
  }
  // ── Ajouter ces méthodes dans DemandeEnAttenteComponent ──────

  ouvrirModalRefus(d: any) {
    this.demandeEnCours = d;
    this.motifRefus = '';
    this.motifRefusError = false;
    this.modal.present();
  }

  closeModal() {
    this.modal.dismiss();
    this.demandeEnCours = null;
    this.motifRefus = '';
    this.motifRefusError = false;
  }

  async confirmerRefus() {

    const data_ = localStorage.getItem('utilisateur');
    if (data_) {
      this.token = JSON.parse(data_);
      console.log(this.token.poste_id);
    }

    if (!this.motifRefus || !this.motifRefus.trim()) {
      this.motifRefusError = true;
      return;
    }
    if (this.demandeEnCours) {
      const departement = await this.service.getDepartmentById(this.demandeEnCours.departement_id).toPromise() as any;
      const poste = await this.service.getPosteById(this.token.poste_id).toPromise() as any;
      console.log('Département pour la demande', departement);
      console.log('Poste pour la demande', poste);

      if (departement.code === 'PARAMED' || departement.code === 'MED') {

        if (this.demandeEnCours.statut === 'en_attente_manager') {
          // Bloquer si l'utilisateur n'est pas le responsable du département
          if (departement.responsable_id !== this.token.employe_id) {
            alert("La demande n'est pas encore approuvée par son manager.");
            return;
          }
          // Bloquer si c'est le Directeur Exécutif (ne gère pas cette étape)
          if (poste.intitule === 'Directeur Exécutif') {
            alert("La demande n'est pas encore approuvée par son manager.");
            return;
          }
          // ✅ Passe à l'étape suivante
          this.refuser_demande();
          return; // 🔴 IMPORTANT : évite de tomber dans le this.approuver_demande final
        }

        if (this.demandeEnCours.statut === 'en_attente_rh') {
          // Bloquer si ce n'est PAS le Directeur Exécutif
          if (poste.intitule !== 'Directeur Exécutif') {
            alert("La demande doit être approuvée par le Directeur Exécutif.");
            return;
          }
          // ✅ Approbation finale (corrigé : 'approuve' au lieu de 'en_attente_rh')
          this.refuser_demande()
          return; // 🔴 IMPORTANT
        }

        // Statut non géré dans MED/PARAMED
        return;
      }

      this.refuser_demande();

    }
  }


  private refuser_demande() {
    this.service.valider_conges({
      id: this.demandeEnCours.id,
      statut: 'refuse',
      commentaire: this.motifRefus.trim()
    }).subscribe({
      next: () => {
        this.showToast('Demande refusée', 'error');
        this.loadData();
        this.closeModal();
      },
      error: (err: any) => this.showToast(err.error?.error || 'Erreur', 'error')
    });
  }


  showToast(message: string, type: 'success' | 'error') {
    this.notification = { message, type };
    setTimeout(() => this.notification = null, 3000);
  }

  isLoading = false; // ← ajouter avec les autres propriétés

  async loadData(): Promise<void> {
    this.isLoading = true;
    try {
      this.allDemandes = [];
      this.filtered = [];

      const rawDemandes = await this.service.getAllConges_liste().toPromise() || [];
      this.typesConge = await this.service.getTypes().toPromise() || [];

      this.allDemandes = rawDemandes.map((d: any) => ({
        ...d,
        employe: {
          nom: d.nom || '',
          prenom: d.prenom || '',
          matricule: d.matricule || '',
          poste: d.poste || 'Collaborateur',
          photo_url: d.photo_url || null,
        },
        typeConge: {
          libelle: d.type_conge || '',
          code: d.code_type || '',
        },
        dateDebut: new Date(d.date_debut),
        dateFin: new Date(d.date_fin),
        nbJours: Number(d.nb_jours) || 0,
        commentaireRefus: d.commentaire_refus || null,
      }));

      this.applyFilters();
    } catch (e) {
      console.error('Erreur loadData', e);
    } finally {
      this.isLoading = false; // ← INDISPENSABLE
    }
  }

  /*
    approuver(d: any) {
      
      this.service.valider_conges(d.id, null).subscribe({
        next: () => {
          this.showToast('Demande approuvée !', 'success');
          this.loadData();
        },
        error: (err: any) => this.showToast(err.error?.error || 'Erreur', 'error')
      });
    }
  */
  // ── Actions liste ─────────────────────────────────────────
  async approuver(d: any): Promise<void> {
    const data_ = localStorage.getItem('utilisateur');
    if (data_) {
      this.token = JSON.parse(data_);
      console.log(this.token.poste_id);
    }

    console.log('Approbation demandée pour', d.departement_id);

    const departement = await this.service.getDepartmentById(d.departement_id).toPromise() as any;
    const poste = await this.service.getPosteById(this.token.poste_id).toPromise() as any;
    console.log('Département pour la demande', departement);
    console.log('Poste pour la demande', poste);


    if (departement.code === 'PARAMED' || departement.code === 'MED') {

      if (d.statut === 'en_attente_manager') {
        // Bloquer si l'utilisateur n'est pas le responsable du département
        if (departement.responsable_id !== this.token.employe_id) {
          alert("La demande n'est pas encore approuvée par son manager.");
          return;
        }
        // Bloquer si c'est le Directeur Exécutif (ne gère pas cette étape)
        if (poste.intitule === 'Directeur Exécutif') {
          alert("La demande n'est pas encore approuvée par son manager.");
          return;
        }
        // ✅ Passe à l'étape suivante
        this.approuver_demande(d, 'en_attente_rh');
        return; // 🔴 IMPORTANT : évite de tomber dans le this.approuver_demande final
      }

      if (d.statut === 'en_attente_rh') {
        // Bloquer si ce n'est PAS le Directeur Exécutif
        if (poste.intitule !== 'Directeur Exécutif') {
          alert("La demande doit être approuvée par le Directeur Exécutif.");
          return;
        }
        // ✅ Approbation finale (corrigé : 'approuve' au lieu de 'en_attente_rh')
        this.approuver_demande(d, 'approuve');
        return; // 🔴 IMPORTANT
      }

      // Statut non géré dans MED/PARAMED
      return;
    }

    // Département hors MED/PARAMED → approbation directe
    this.approuver_demande(d, 'approuve');
  }

  approuver_demande(d: any, etat: string): void {
    const data = {
      id: d.id,
      commentaire: 'Approuvé via le portail',
      statut: etat
    };
    console.log('Approuver', data);
    this.service.valider_conges(data).subscribe({
      next: (res) => {
        this.allDemandes = this.allDemandes.filter((item: { id: any }) => item.id !== d.id);
        this.applyFilters(); // ✅ Une seule fois, dans le callback
      },
      error: (err) => {
        console.error('Erreur validation:', err);
        alert('Impossible de valider le congé : ' + (err.error?.error || 'Erreur serveur'));
      }
    });
    // 🔴 Supprimé : this.applyFilters() ici était prématuré
  }


  accentColor(statut: string): string {
    const map: Record<string, string> = {
      en_attente_manager: '#f59e0b',
      en_attente_rh: '#3b82f6',
      approuve: '#10b981',
      refuse: '#ef4444',
      annule: '#94a3b8',
      brouillon: '#cbd5e1',
    };
    return map[statut] ?? '#cbd5e1';
  }

  statutLabel(statut: string): string {
    const map: Record<string, string> = {
      en_attente_manager: 'Att. Manager',
      en_attente_rh: 'Att. RH',
      approuve: 'Approuvé',
      refuse: 'Refusé',
      annule: 'Annulé',
      brouillon: 'Brouillon',
    };
    return map[statut] ?? statut;
  }

  statutBadgeClass(statut: string): string {
    const map: Record<string, string> = {
      en_attente_manager: 'badge-amber',
      en_attente_rh: 'badge-blue',
      approuve: 'badge-green',
      refuse: 'badge-red',
      annule: 'badge-gray',
      brouillon: 'badge-gray',
    };
    return map[statut] ?? 'badge-gray';
  }

  avatarStyle(i: number): object {
    const palette = [
      { background: '#EEF2FF', color: '#4338CA' },
      { background: '#FFF7ED', color: '#C2410C' },
      { background: '#F0FDF4', color: '#15803D' },
      { background: '#FDF4FF', color: '#9333EA' },
      { background: '#ECFEFF', color: '#0E7490' },
      { background: '#FEF2F2', color: '#DC2626' },
    ];
    return palette[i % palette.length];
  }

  initiales(nom: string): string {
    return nom ? nom.charAt(0).toUpperCase() : '?';
  }

  isAjustement(d: any): boolean {
    return d?.motif?.startsWith('[AJUSTEMENT MANUEL]');
  }

  getAjustementTexte(d: any): string {
    return d?.motif?.replace('[AJUSTEMENT MANUEL]', '').trim() || 'Ajustement de solde';
  }


}
