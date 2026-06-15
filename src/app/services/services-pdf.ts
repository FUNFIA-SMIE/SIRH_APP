import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

export interface DemandeAbsenceData {
  ref?: string;
  nom: string;
  prenom: string;
  fonction: string;
  societe: string;
  matricule: string;
  dateDemande: string;
  dateDepart: string;
  dateRetour: string;
  duree: string;
  type: 'conge_paye' | 'permission_exceptionnelle' | 'conge_sans_solde' | 'autorisation_sortie' | 'disponibilite' | 'autre';
  droits?: string;
  congePrisDurantLeMois?: string;
  congeDemande?: string;
  reliquat?: string;
  heureDepart?: string;
  heureRetour?: string;
  motif?: string;
}

@Injectable({ providedIn: 'root' })
export class ServicesPdf {
  private readonly BLUE = [0, 82, 156] as const;
  private readonly DARK_GRAY = [80, 80, 80] as const;
  private readonly BLACK = [0, 0, 0] as const;
  private readonly WHITE = [255, 255, 255] as const;
  private readonly LIGHT_GRAY = [240, 240, 240] as const;

  imagePath = 'assets/l.jpg';
  imageBase64: string | null = null;

  constructor(private http: HttpClient) {
    // Précharger l'image dès l'instanciation du service
    this.loadImageAsBase64();
  }

  // ─── CHARGEMENT IMAGE ────────────────────────────────────────────────────

  /**
   * Charge l'image locale et la convertit en Base64.
   * Retourne une Promise afin de pouvoir l'awaiter si nécessaire.
   */
  private loadImageAsBase64(): Promise<void> {
    return new Promise((resolve) => {
      this.http.get(this.imagePath, { responseType: 'blob' }).subscribe({
        next: (blob: Blob) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            this.imageBase64 = reader.result as string;
            resolve();
          };
          reader.onerror = () => {
            console.warn('ServicesPdf : impossible de lire le blob de l\'image.');
            resolve(); // on ne bloque pas la génération
          };
        },
        error: (err) => {
          console.error('ServicesPdf : erreur lors du chargement de l\'image :', err);
          resolve(); // on ne bloque pas la génération
        }
      });
    });
  }

  async generatePdf(data: DemandeAbsenceData): Promise<void> {
    if (!this.imageBase64) {
      await this.loadImageAsBase64();
    }
    this.buildDoc(data).save(`demande_absence_${data.nom}_${data.prenom}.pdf`);
  }

  /**
   * Retourne le PDF sous forme de data URL (ex. pour affichage dans un iframe).
   */
  async generatePdfDataUrl(data: DemandeAbsenceData): Promise<string> {
    if (!this.imageBase64) {
      await this.loadImageAsBase64();
    }
    return this.buildDoc(data).output('dataurlstring');
  }

  // ─── CONSTRUCTION DU DOCUMENT ─────────────────────────────────────────────

  private buildDoc(data: DemandeAbsenceData): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const marginL = 10;
    const marginR = 10;
    const cW = W - marginL - marginR;

    let y = 8;

    // ── EN-TÊTE ──────────────────────────────────────────────────────────────
    if (this.imageBase64) {
      const img = new Image();
      img.src = this.imageBase64;
      const ratio = img.naturalHeight / img.naturalWidth;
      const imgW = 20;
      const imgH = imgW * ratio;
      doc.addImage(this.imageBase64, 'PNG', marginL, y, imgW, imgH);
    } else {
      // Fallback texte si l'image est introuvable
      doc.setTextColor(...this.BLUE);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('FUNFIA', marginL + 13, y + 7, { align: 'center' });
    }

    doc.setTextColor(...this.BLUE);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text("DEMANDE D'ABSENCE", marginL + 30, y + 6);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`REF : ${data.ref ?? '..../.........../...............'}`, marginL + 30, y + 11);
    y += 18;

    // ── PARTIE I ─────────────────────────────────────────────────────────────
    y = this.sectionHeader(doc, 'I - PARTIE RESERVEE AU SALARIE DEMANDEUR :', marginL, y, cW);
    y = this.subHeader(doc, 'A - INFORMATIONS :', marginL, y, cW);
    y = this.field(doc, 'Nom(s)', data.nom, marginL, y, cW);
    y = this.field(doc, 'Et Prénom(s)', data.prenom, marginL, y, cW);
    y = this.twoFields(doc, 'Fonction', data.fonction, 'Société', data.societe, marginL, y, cW);
    y = this.twoFields(doc, 'Matricule', data.matricule, 'Date de la demande', data.dateDemande, marginL, y, cW);

    y = this.subHeader(doc, 'B - SIGNATURE DU DEMANDEUR :', marginL, y, cW);
    y = this.signatureBox(doc, marginL, y, cW, 12);
    y += 2;

    // ── PARTIE II ────────────────────────────────────────────────────────────
    y = this.sectionHeader(doc, 'II - PARTIE RESERVEE A LA DIRECTION DES RESSOURCES HUMAINES :', marginL, y, cW);
    y = this.subHeader(doc, "A - PERIODE D'ABSENCE :", marginL, y, cW);
    y = this.twoFields(doc, 'Date de départ', data.dateDepart, 'Date de retour', data.dateRetour, marginL, y, cW);
    y = this.field(doc, 'Durée', data.duree, marginL, y, cW);

    y = this.subHeader(doc, 'B - TYPE :', marginL, y, cW);
    y = this.checkboxRow(doc, data, marginL, y, cW);

    // Si congé payé
    y += 1;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text('• Si congé payé :', marginL + 3, y + 3.5);
    y += 6;
    y = this.twoFields(doc, 'Droits', data.droits ?? '', 'Congé pris durant le mois', data.congePrisDurantLeMois ?? '', marginL, y, cW);
    y = this.twoFields(doc, 'Congé demandé', data.congeDemande ?? '', 'Reliquat', data.reliquat ?? '', marginL, y, cW);

    // Si autorisation de sortie
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text('• Si autorisation de sortie :', marginL + 3, y + 3.5);
    y += 6;
    y = this.twoFields(doc, 'Heure de départ', data.heureDepart ?? '', 'Heure de retour', data.heureRetour ?? '', marginL, y, cW);
    y = this.field(doc, 'Motif de la demande', data.motif ?? '', marginL, y, cW);

    // Note permission exceptionnelle
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...this.DARK_GRAY);
    const noteLines = doc.splitTextToSize(
      "• Si permission exceptionnelle (*voir en verso les évènements accordés pour l'octroi d'une permission exceptionnelle, sous condition de la présentation d'une pièce justificative dès la reprise du service)",
      cW - 4
    );
    noteLines.forEach((line: string) => { doc.text(line, marginL + 3, y); y += 3.5; });

    y += 1;
    y = this.subHeader(doc, 'C - SIGNATURE DU RESPONSABLE DES RESSOURCES HUMAINES', marginL, y, cW);
    y = this.signatureBox(doc, marginL, y, cW, 10);
    y += 2;

    // ── PARTIE III ───────────────────────────────────────────────────────────
    y = this.sectionHeader(doc, 'III - PARTIE « AUTORISATION » :', marginL, y, cW);
    this.authTable(doc, marginL, y, cW);

    // Numéro de page
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text('1', W - marginR, 290, { align: 'right' });

    return doc;
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  private sectionHeader(doc: jsPDF, title: string, x: number, y: number, w: number): number {
    doc.setFillColor(...this.BLUE);
    doc.rect(x, y, w, 6, 'F');
    doc.setTextColor(...this.WHITE);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(title, x + w / 2, y + 4.2, { align: 'center' });
    return y + 7.5;
  }

  private subHeader(doc: jsPDF, title: string, x: number, y: number, w: number): number {
    doc.setFillColor(...this.LIGHT_GRAY);
    doc.rect(x, y, w, 5, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.rect(x, y, w, 5, 'S');
    doc.setTextColor(...this.BLUE);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(title, x + 2, y + 3.5);
    return y + 6.5;
  }

  private field(doc: jsPDF, label: string, value: string, x: number, y: number, w: number): number {
    const h = 6;
    doc.setDrawColor(200, 200, 200);
    doc.line(x, y + h, x + w, y + h);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text(`${label} :`, x + 2, y + 4);
    const lw = doc.getTextWidth(`${label} :`) + 3;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.BLACK);
    doc.text(value, x + lw + 1, y + 4);
    return y + h + 0.5;
  }

  private twoFields(
    doc: jsPDF,
    l1: string, v1: string,
    l2: string, v2: string,
    x: number, y: number, w: number
  ): number {
    const hw = (w - 3) / 2;
    const h = 6;

    doc.setDrawColor(200, 200, 200);

    // Champ gauche
    doc.line(x, y + h, x + hw, y + h);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text(`${l1} :`, x + 2, y + 4);
    const lw1 = doc.getTextWidth(`${l1} :`) + 3;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.BLACK);
    doc.text(v1, x + lw1 + 1, y + 4);

    // Champ droit
    const x2 = x + hw + 3;
    doc.line(x2, y + h, x2 + hw, y + h);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text(`${l2} :`, x2 + 2, y + 4);
    const lw2 = doc.getTextWidth(`${l2} :`) + 3;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.BLACK);
    doc.text(v2, x2 + lw2 + 1, y + 4);

    return y + h + 0.5;
  }

  private checkboxRow(doc: jsPDF, data: DemandeAbsenceData, x: number, y: number, w: number): number {
    const types = [
      { key: 'conge_paye', label: 'Congé payé' },
      { key: 'conge_sans_solde', label: 'Congé sans solde' },
      { key: 'disponibilite', label: 'Disponibilité' },
      { key: 'permission_exceptionnelle', label: 'Permission exceptionnelle' },
      { key: 'autorisation_sortie', label: 'Autorisation de sortie' },
      { key: 'autre', label: 'Autre' },
    ];

    const colW = w / 3;

    types.forEach((t, i) => {
      const cx = x + (i % 3) * colW + 3;
      const cy = y + Math.floor(i / 3) * 6;

      doc.setDrawColor(...this.BLUE);
      doc.rect(cx, cy, 3.5, 3.5, 'S');

      if (data.type === t.key) {
        doc.setFillColor(...this.BLUE);
        doc.rect(cx + 0.4, cy + 0.4, 2.7, 2.7, 'F');
      }

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.BLACK);
      doc.text(`: ${t.label}`, cx + 4.5, cy + 3);
    });

    return y + 14;
  }

  private signatureBox(doc: jsPDF, x: number, y: number, w: number, h: number): number {
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, w, h, 'S');
    return y + h + 1;
  }

  private authTable(doc: jsPDF, x: number, y: number, w: number): number {
    const rows = [
      'A - Avis du supérieur hiérarchique direct',
      'Avis du Directeur de département',
      'Avis du Directeur des Ressources Humaines',
    ];

    const leftW = w * 0.55;
    const rightW = w - leftW;
    const rowH = 14;

    rows.forEach((title, i) => {
      const ry = y + i * rowH;
      const fill = i % 2 === 0 ? 245 : 255;

      doc.setFillColor(fill, fill, fill);
      doc.rect(x, ry, leftW, rowH, 'FD');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.BLUE);
      doc.text(title + ' :', x + 2, ry + 4);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.BLACK);

      doc.rect(x + 2, ry + 6, 3, 3, 'S'); doc.text('Demande autorisée', x + 6, ry + 8.5);
      doc.rect(x + 2, ry + 10, 3, 3, 'S'); doc.text('Demande refusée', x + 6, ry + 12.5);

      doc.rect(x + leftW, ry, rightW, rowH, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.DARK_GRAY);
      doc.text('Signature :', x + leftW + 2, ry + 4);
    });

    return y + rows.length * rowH + 3;
  }
}