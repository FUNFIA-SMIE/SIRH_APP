import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonSelectOption, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonIcon, IonModal, IonButton, IonBadge } from '@ionic/angular/standalone';
import {
  arrowBackOutline, searchOutline, briefcaseOutline, calendarOutline,
  timeOutline, chatbubbleOutline, closeOutline, checkmarkOutline,
  alertCircleOutline, closeCircleOutline, checkmarkCircleOutline,
  checkmarkDoneCircleOutline, informationCircleOutline, documentTextOutline, calculatorOutline
} from 'ionicons/icons';
import { NavController, IonTextarea } from '@ionic/angular/standalone';
import { ServiceSirh } from 'src/app/services/service-sirh';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-mes-absences',
  templateUrl: './mes-absences.page.html',
  styleUrls: ['./mes-absences.page.scss'],
  standalone: true,
  imports: [IonBadge, IonTextarea, IonButton, IonModal, IonSelectOption, IonIcon, IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class MesAbsencesPage implements OnInit {
  typesConge: any;
  notification: { message: string, type: 'success' | 'error' } | null = null;
  isLoading = false;
  constructor(
    private navCtrl: NavController,
    private service: ServiceSirh

  ) {
    addIcons({ arrowBackOutline, searchOutline, checkmarkDoneCircleOutline, briefcaseOutline, calendarOutline, timeOutline, chatbubbleOutline, calculatorOutline, alertCircleOutline, documentTextOutline, closeOutline, checkmarkOutline, closeCircleOutline, checkmarkCircleOutline, informationCircleOutline });
  }

  allDemandes: any[] = [];
  filtered: any[] = [];

  get countEnAttente() {
    return this.allDemandes.filter((d: any) =>
      d.statut === 'en_attente_manager' || d.statut === 'en_attente_rh'
    ).length;
  }

  get totalJoursDemandes() {
    return this.allDemandes.reduce((s: any, d: any) => {
      // Si la demande est refusée, on n'ajoute rien
      if (d.statut === 'refuse') {
        return s;
      }
      // Sinon, on ajoute le nombre exact de jours (ex: 0.5, 1, 1.5...)
      return s + d.nbJours;
    }, 0);
  }

  get countApprouves() {
    return this.allDemandes.filter((d: any) => d.statut === 'approuve').length;
  }

  get countRefuses() {
    return this.allDemandes.filter((d: any) => d.statut === 'refuse').length;
  }


async loadData(): Promise<void> {
  this.isLoading = true;
  try {
    this.allDemandes = [];
    this.filtered = [];
    this.data_ = localStorage.getItem('utilisateur');
    if (this.data_) {
      this.token = JSON.parse(this.data_);
    }

    let rawDemandes = await this.service.getAllConges_liste().toPromise() || [];
    rawDemandes = rawDemandes.filter((d: any) => d.employe_id === this.token.employe_id);

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
  data_: any;
  token: any;
  filterStatut = '';
  searchQuery = '';
  filterType = '';

  async ngOnInit() {
    await this.loadData();
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

  goBack() {
    this.navCtrl.navigateBack('/dashboard', { animated: true });
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

  isAjustement(d: any): boolean {
    return d?.motif?.startsWith('[AJUSTEMENT MANUEL]');
  }

  getAjustementTexte(d: any): string {
    return d?.motif?.replace('[AJUSTEMENT MANUEL]', '').trim() || 'Ajustement de solde';
  }
}