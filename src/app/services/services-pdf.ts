import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';


export interface DemandeAbsenceData {
  // Ref
  ref?: string;
 
  // Partie I - Informations salarié
  nom: string;
  prenom: string;
  fonction: string;
  societe: string;
  matricule: string;
  dateDemande: string;
 
  // Partie II - Période d'absence
  dateDepart: string;
  dateRetour: string;
  duree: string;
 
  // Type de congé
  type: 'conge_paye' | 'permission_exceptionnelle' | 'conge_sans_solde' | 'autorisation_sortie' | 'disponibilite' | 'autre';
 
  // Si congé payé
  droits?: string;
  congePrisDurantLeMois?: string;
  congeDemande?: string;
  reliquat?: string;
 
  // Si autorisation de sortie
  heureDepart?: string;
  heureRetour?: string;
  motif?: string;
}
 


@Injectable({
  providedIn: 'root',
})
export class ServicesPdf {
    private readonly BLUE = [0, 82, 156] as const;
  private readonly LIGHT_BLUE = [173, 216, 230] as const;
  private readonly DARK_GRAY = [80, 80, 80] as const;
  private readonly BLACK = [0, 0, 0] as const;
  private readonly WHITE = [255, 255, 255] as const;
  private readonly LIGHT_GRAY = [240, 240, 240] as const;
 
  generatePdf(data: DemandeAbsenceData): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const marginL = 12;
    const marginR = 12;
    const contentW = W - marginL - marginR;
 
    let y = 12;
 
    // ── HEADER ──────────────────────────────────────────────────────────────
    // Logo placeholder (blue square with "FUNFIA")
    doc.setFillColor(...this.BLUE);
    doc.roundedRect(marginL, y, 30, 18, 2, 2, 'F');
    doc.setTextColor(...this.WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('FUNFIA', marginL + 15, y + 8, { align: 'center' });
 
    // Title
    doc.setTextColor(...this.BLUE);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("DEMANDE D'ABSENCE", marginL + 35, y + 7);
 
    // Ref line
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`REF : ${data.ref ?? '..../.........../...............'}`, marginL + 35, y + 13);
 
    y += 25;
 
    // ── PARTIE I ─────────────────────────────────────────────────────────────
    y = this.drawSectionHeader(doc, 'I - PARTIE RESERVEE AU SALARIE DEMANDEUR :', marginL, y, contentW);
 
    // Sub-header A
    y = this.drawSubHeader(doc, 'A - INFORMATIONS :', marginL, y, contentW);
 
    // Fields
    y = this.drawField(doc, 'Nom(s)', data.nom, marginL, y, contentW);
    y = this.drawField(doc, 'Et Prénom(s)', data.prenom, marginL, y, contentW);
 
    // Two-column row
    const halfW = (contentW - 4) / 2;
    y = this.drawTwoFields(doc, 'Fonction', data.fonction, 'Société', data.societe, marginL, y, contentW);
    y = this.drawTwoFields(doc, 'Matricule', data.matricule, 'Date de la demande', data.dateDemande, marginL, y, contentW);
 
    // Sub-header B - Signature
    y = this.drawSubHeader(doc, 'B - SIGNATURE DU DEMANDEUR :', marginL, y, contentW);
    y = this.drawSignatureBox(doc, marginL, y, contentW, 18);
 
    y += 4;
 
    // ── PARTIE II ────────────────────────────────────────────────────────────
    y = this.drawSectionHeader(doc, 'II - PARTIE RESERVEE A LA DIRECTION DES RESSOURCES HUMAINES :', marginL, y, contentW);
 
    y = this.drawSubHeader(doc, 'A - PERIODE D\'ABSENCE :', marginL, y, contentW);
 
    y = this.drawTwoFields(doc, 'Date de départ', data.dateDepart, 'Date de retour', data.dateRetour, marginL, y, contentW);
    y = this.drawField(doc, 'Durée', data.duree, marginL, y, contentW);
 
    // B - TYPE
    y = this.drawSubHeader(doc, 'B - TYPE :', marginL, y, contentW);
    y = this.drawCheckboxRow(doc, data, marginL, y, contentW);
 
    // Si congé payé
    y += 2;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text('• Si congé payé :', marginL + 4, y + 4);
    y += 7;
 
    y = this.drawTwoFields(doc, 'Droits', data.droits ?? '', 'Congé pris durant le mois', data.congePrisDurantLeMois ?? '', marginL, y, contentW);
    y = this.drawTwoFields(doc, 'Congé demandé', data.congeDemande ?? '', 'Reliquat', data.reliquat ?? '', marginL, y, contentW);
 
    // Si autorisation de sortie
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text('• Si autorisation de sortie :', marginL + 4, y + 4);
    y += 7;
 
    y = this.drawTwoFields(doc, 'Heure de départ', data.heureDepart ?? '', 'Heure de retour', data.heureRetour ?? '', marginL, y, contentW);
    y = this.drawField(doc, 'Motif de la demande', data.motif ?? '', marginL, y, contentW);
 
    // Note permission exceptionnelle
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...this.DARK_GRAY);
    const noteLines = doc.splitTextToSize(
      "• Si permission exceptionnelle (*voir en verso les évènements accordés pour l'octroi d'une permission exceptionnelle, sous condition de la présentation d'une pièce justificative dès la reprise du service)",
      contentW - 6
    );
    noteLines.forEach((line: string) => {
      doc.text(line, marginL + 4, y);
      y += 4;
    });
 
    y += 2;
    y = this.drawSubHeader(doc, 'C - SIGNATURE DU RESPONSABLE DES RESSOURCES HUMAINES', marginL, y, contentW);
    y = this.drawSignatureBox(doc, marginL, y, contentW, 14);
 
    y += 4;
 
    // ── PARTIE III ───────────────────────────────────────────────────────────
    y = this.drawSectionHeader(doc, 'III - PARTIE « AUTORISATION » :', marginL, y, contentW);
 
    y = this.drawAuthorizationTable(doc, marginL, y, contentW);
 
    // Page number
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text('1', W - marginR, 290, { align: 'right' });
 
    doc.save(`demande_absence_${data.nom}_${data.prenom}.pdf`);
  }
 
  // ── HELPERS ───────────────────────────────────────────────────────────────
 
  private drawSectionHeader(doc: jsPDF, title: string, x: number, y: number, w: number): number {
    doc.setFillColor(...this.BLUE);
    doc.rect(x, y, w, 7, 'F');
    doc.setTextColor(...this.WHITE);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(title, x + w / 2, y + 4.8, { align: 'center' });
    return y + 9;
  }
 
  private drawSubHeader(doc: jsPDF, title: string, x: number, y: number, w: number): number {
    doc.setFillColor(...this.LIGHT_GRAY);
    doc.rect(x, y, w, 6, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.rect(x, y, w, 6, 'S');
    doc.setTextColor(...this.BLUE);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(title, x + 3, y + 4.2);
    return y + 8;
  }
 
  private drawField(doc: jsPDF, label: string, value: string, x: number, y: number, w: number): number {
    const lineH = 7;
    doc.setDrawColor(200, 200, 200);
    doc.line(x, y + lineH, x + w, y + lineH);
 
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text(`${label} :`, x + 2, y + 4.5);
 
    const labelW = doc.getTextWidth(`${label} :`) + 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.BLACK);
    doc.text(value, x + labelW + 2, y + 4.5);
 
    return y + lineH + 1;
  }
 
  private drawTwoFields(
    doc: jsPDF,
    label1: string, value1: string,
    label2: string, value2: string,
    x: number, y: number, w: number
  ): number {
    const halfW = (w - 4) / 2;
    const lineH = 7;
 
    // Field 1
    doc.setDrawColor(200, 200, 200);
    doc.line(x, y + lineH, x + halfW, y + lineH);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text(`${label1} :`, x + 2, y + 4.5);
    const lw1 = doc.getTextWidth(`${label1} :`) + 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.BLACK);
    doc.text(value1, x + lw1 + 2, y + 4.5);
 
    // Field 2
    const x2 = x + halfW + 4;
    doc.line(x2, y + lineH, x2 + halfW, y + lineH);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text(`${label2} :`, x2 + 2, y + 4.5);
    const lw2 = doc.getTextWidth(`${label2} :`) + 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.BLACK);
    doc.text(value2, x2 + lw2 + 2, y + 4.5);
 
    return y + lineH + 1;
  }
 
  private drawCheckboxRow(doc: jsPDF, data: DemandeAbsenceData, x: number, y: number, w: number): number {
    const types = [
      { key: 'conge_paye', label: 'Congé payé' },
      { key: 'conge_sans_solde', label: 'Congé sans solde' },
      { key: 'disponibilite', label: 'Disponibilité' },
      { key: 'permission_exceptionnelle', label: 'Permission exceptionnelle' },
      { key: 'autorisation_sortie', label: 'Autorisation de sortie' },
      { key: 'autre', label: 'Autre' },
    ];
 
    const colW = w / 3;
    let col = 0;
    let row = 0;
 
    types.forEach((t, i) => {
      const cx = x + (i % 3) * colW + 4;
      const cy = y + Math.floor(i / 3) * 7;
 
      // Checkbox
      doc.setDrawColor(...this.BLUE);
      doc.rect(cx, cy, 4, 4, 'S');
 
      if (data.type === t.key) {
        doc.setFillColor(...this.BLUE);
        doc.rect(cx + 0.5, cy + 0.5, 3, 3, 'F');
      }
 
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.BLACK);
      doc.text(`: ${t.label}`, cx + 5, cy + 3.5);
    });
 
    return y + 16;
  }
 
  private drawSignatureBox(doc: jsPDF, x: number, y: number, w: number, h: number): number {
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(...this.WHITE);
    doc.rect(x, y, w, h, 'S');
    return y + h + 2;
  }
 
  private drawAuthorizationTable(doc: jsPDF, x: number, y: number, w: number): number {
    const rows = [
      { title: 'A - Avis du supérieur hiérarchique direct' },
      { title: 'Avis du Directeur de département' },
      { title: 'Avis du Directeur des Ressources Humaines' },
    ];
 
    const leftW = w * 0.55;
    const rightW = w - leftW;
    const rowH = 16;
 
    rows.forEach((row, i) => {
      const ry = y + i * rowH;
 
      // Left cell
      doc.setFillColor(i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 245 : 255);
      doc.rect(x, ry, leftW, rowH, 'FD');
 
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.BLUE);
      doc.text(row.title + ' :', x + 3, ry + 5);
 
      // Checkboxes: Autorisée / Refusée
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.BLACK);
 
      doc.rect(x + 3, ry + 7, 3.5, 3.5, 'S');
      doc.text('Demande autorisée', x + 7.5, ry + 10);
 
      doc.rect(x + 3, ry + 11.5, 3.5, 3.5, 'S');
      doc.text('Demande refusée', x + 7.5, ry + 14.5);
 
      // Right cell - Signature
      doc.rect(x + leftW, ry, rightW, rowH, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.DARK_GRAY);
      doc.text('Signature :', x + leftW + 3, ry + 5);
    });
 
    return y + rows.length * rowH + 4;
  }

}
