import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from './Environment';

// ─── MODÈLES ─────────────────────────────────────────────────
export interface Pointage {
  id: string;
  employe_id: string;
  type: 'entree' | 'sortie';
  date_heure: string;   // correspond à "heure" en BDD, renommé par le backend
  scanne_par?: string;
  conge_id?: string;
  created_at?: string;
  nom?: string;
  prenom?: string;
  displayName?: string;
  scannerName?: string;
}

export interface EmployeInfo {
  id: string;
  nom: string;
  prenom: string;
  poste?: string;
}

export interface ScanResponse {
  pointage: Pointage;
  employe: EmployeInfo;
}

export interface ResumePointages {
  nb_entrees: number;
  nb_sorties: number;
  total_heures: number;
  heures_max: number;
  heures_restantes: number;
}

export interface QrPayload {
  employe_id: string;
  utilisateur_id: string;
  fenetre: number;
  signature: string;
}

@Injectable({ providedIn: 'root' })
export class PointageServices {

  private readonly API = environment.apiUrl; // ex: 'http://localhost:3000/api'

  constructor(private http: HttpClient) {}

  // ─── HEADERS ───────────────────────────────────────────────
  private get headers(): HttpHeaders {
    const token = localStorage.getItem('token');
    if (!token) return new HttpHeaders();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ─── GÉNÉRER LE QR PAYLOAD ─────────────────────────────────
  genererQrPayload(employeId: string, utilisateurId: string): QrPayload {
    const fenetre = Math.floor(Date.now() / (15 * 60 * 1000));
    const signature = btoa(`${employeId}_${fenetre}_${environment.qrSecret}`);
    return { employe_id: employeId, utilisateur_id: utilisateurId, fenetre, signature };
  }

  // ─── VALIDER LE QR PAYLOAD (côté client, avant envoi API) ──
  validerQrPayload(payload: QrPayload): { valide: boolean; erreur?: string } {
    const fenetreActuelle = Math.floor(Date.now() / (15 * 60 * 1000));
    if (Math.abs(payload.fenetre - fenetreActuelle) > 1) {
      return { valide: false, erreur: 'QR Code expiré. Demandez un nouveau code.' };
    }
    const signatureAttendue = btoa(
      `${payload.employe_id}_${payload.fenetre}_${environment.qrSecret}`
    );
    if (payload.signature !== signatureAttendue) {
      return { valide: false, erreur: 'QR Code invalide.' };
    }
    return { valide: true };
  }

  // ─── LISTE POINTAGES DU MOIS ───────────────────────────────
  getPointages(employeId: string, depuis?: Date): Observable<Pointage[]> {
    const dateDebut = depuis ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const params = new HttpParams()
      .set('employe_id', employeId)
      .set('depuis', dateDebut.toISOString());

    return this.http
      .get<Pointage[]>(`${this.API}/pointages`, { headers: this.headers, params })
      .pipe(
        map(data => data.sort(
          (a, b) => new Date(b.date_heure).getTime() - new Date(a.date_heure).getTime()
        )),
        catchError(err => throwError(() => err))
      );
  }

  // ─── ENREGISTRER UN POINTAGE (scan) ───────────────────────
  enregistrerPointage(
    employeId: string,
    scannePar: string,
    qrPayload: QrPayload
  ): Observable<ScanResponse> {
    return this.http
      .post<ScanResponse>(
        `${this.API}/pointages`,
        { employe_id: employeId, scanne_par: scannePar, qr_payload: qrPayload },
        { headers: this.headers }
      )
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── RÉSUMÉ MENSUEL ────────────────────────────────────────
  getResume(employeId: string): Observable<ResumePointages> {
    return this.http
      .get<ResumePointages>(`${this.API}/pointages/resume/${employeId}`, { headers: this.headers })
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── SUPPRIMER ─────────────────────────────────────────────
  supprimerPointage(id: string): Observable<{ message: string; id: string }> {
    return this.http
      .delete<{ message: string; id: string }>(`${this.API}/pointages/${id}`, { headers: this.headers })
      .pipe(catchError(err => throwError(() => err)));
  }

  // ─── CALCULER HEURES LOCALEMENT ────────────────────────────
calculerHeures(pointages: Pointage[]): number {
  if (!pointages || pointages.length === 0) return 0;

  // Trier par ordre chronologique croissant (06:02 puis 06:08)
  const sorted = [...pointages].sort(
    (a, b) => new Date(a.date_heure).getTime() - new Date(b.date_heure).getTime()
  );

  let totalMs = 0;
  let lastExit: Pointage | null = null; // On stocke la dernière SORTIE désormais

  // Coupler chaque 'entree' (retour) avec la 'sortie' précédente
  for (const p of sorted) {
    if (p.type === 'sortie') {
      lastExit = p; // L'employé sort, on lance le chrono
    } else if (p.type === 'entree') {
      if (lastExit) {
        // L'employé revient, on calcule le temps passé dehors
        const diff = new Date(p.date_heure).getTime() - new Date(lastExit.date_heure).getTime();
        if (diff > 0) totalMs += diff;
        lastExit = null; // Reset pour la prochaine sortie
      }
    }
  }

  console.log("Total MS passées dehors :", totalMs);

  return totalMs / (1000 * 3600);
}
}