import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import jsPDF from 'jspdf';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
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
  imageRatio = 1;

  constructor(private http: HttpClient) {
    // Précharger l'image dès l'instanciation du service
    this.loadImageAsBase64();
  }

  // ─── CHARGEMENT IMAGE ────────────────────────────────────────────────────

  /**
   * Charge l'image locale et la convertit en Base64.
   * Retourne une Promise afin de pouvoir l'awaiter si nécessaire.
   */
  private imageLoadPromise: Promise<void> | null = null;
  isImageReady = false;

  private loadImageAsBase64(): Promise<void> {
    if (this.imageLoadPromise) {
      return this.imageLoadPromise;
    }
    this.imageLoadPromise = new Promise((resolve) => {
      this.http.get(this.imagePath, { responseType: 'blob' }).subscribe({
        next: (blob: Blob) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            this.imageBase64 = reader.result as string;
            const img = new Image();
            img.onload = () => {
              if (img.naturalWidth > 0) {
                this.imageRatio = img.naturalHeight / img.naturalWidth;
              }
              this.isImageReady = true;
              resolve();
            };
            img.onerror = () => {
              console.warn('ServicesPdf : impossible de charger les dimensions de l\'image.');
              this.isImageReady = true;
              resolve();
            };
            img.src = this.imageBase64!;
          };
          reader.onerror = () => {
            console.warn('ServicesPdf : impossible de lire le blob de l\'image.');
            this.isImageReady = true;
            resolve();
          };
        },
        error: (err) => {
          console.error('ServicesPdf : erreur lors du chargement de l\'image :', err);
          this.isImageReady = true;
          resolve();
        }
      });
    });
    return this.imageLoadPromise;
  }


  async generatePdf(data: DemandeAbsenceData): Promise<void> {
    await this.loadImageAsBase64();
    const doc = this.buildDoc(data);
    const fileName = `demande_absence_${data.nom}_${data.prenom}.pdf`;

    if (Capacitor.isNativePlatform()) {
      // Sur APK/iOS : on écrit le fichier puis on propose de l'ouvrir/partager
      const pdfBase64 = doc.output('datauristring').split(',')[1]; // on retire le préfixe data:...;base64,

      const result = await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Cache, // ou Directory.Documents selon vos besoins
      });

      await Share.share({
        title: 'Demande d\'absence',
        text: 'Voici votre demande d\'absence au format PDF',
        url: result.uri,
        dialogTitle: 'Partager ou ouvrir le PDF'
      });
    } else {
      // Sur navigateur web classique : téléchargement habituel
      doc.save(fileName);
    }
  }

  async generatePdfDataUrl(data: DemandeAbsenceData): Promise<string> {
    await this.loadImageAsBase64();
    return this.buildDoc(data).output('dataurlstring');
  }
  // ─── CONSTRUCTION DU DOCUMENT ─────────────────────────────────────────────

  private buildDoc(data: DemandeAbsenceData): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const marginL = 10;
    const marginR = 10;
    const cW = W - marginL - marginR;

    let y = 10;

    // ── EN-TÊTE ──────────────────────────────────────────────────────────────
    if (this.imageBase64) {
      const imgW = 20;
      const ratio = (this.imageRatio > 0 && isFinite(this.imageRatio)) ? this.imageRatio : 1;
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
    doc.text("DEMANDE D'ABSENCE", marginL + 32, y + 7);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`REF : ${'............./.........../...............'}`, marginL + 32, y + 13);
    y += 24; // plus d'air avant la première section

    // ── PARTIE I ─────────────────────────────────────────────────────────────
    y = this.sectionHeader(doc, 'I - PARTIE RESERVEE AU SALARIE DEMANDEUR :', marginL, y, cW);
    y += 1.5;
    y = this.subHeader(doc, 'A - INFORMATIONS :', marginL, y, cW);
    y = this.field(doc, 'Nom(s)', data.nom, marginL, y, cW);
    y = this.field(doc, 'Et Prénom(s)', data.prenom, marginL, y, cW);
    y = this.twoFields(doc, 'Fonction', data.fonction, 'Société', data.societe, marginL, y, cW);
    y = this.twoFields(doc, 'Matricule', data.matricule, 'Date de la demande', data.dateDemande, marginL, y, cW);

    y += 2;
    y = this.subHeader(doc, 'B - SIGNATURE DU DEMANDEUR :', marginL, y, cW);
    y = this.signatureBox(doc, marginL, y, cW, 14);
    y += 5; // respiration avant la section suivante

    // ── PARTIE II ────────────────────────────────────────────────────────────
    y = this.sectionHeader(doc, 'II - PARTIE RESERVEE A LA DIRECTION DES RESSOURCES HUMAINES :', marginL, y, cW);
    y += 1.5;
    y = this.subHeader(doc, "A - PERIODE D'ABSENCE :", marginL, y, cW);
    y = this.twoFields(doc, 'Date de début', data.dateDepart, 'Date fin', data.dateRetour, marginL, y, cW);
    y = this.field(doc, 'Durée', data.duree, marginL, y, cW);

    y += 2;
    y = this.subHeader(doc, 'B - TYPE :', marginL, y, cW);
    y += 1;
    y = this.checkboxRow(doc, data, marginL, y, cW);

    // Si congé payé
    y += 3;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text('• Si congé payé :', marginL + 3, y);
    y += 4.5;
    y = this.twoFields(doc, 'Droits', data.droits ?? '', 'Congé pris durant le mois', data.congePrisDurantLeMois ?? '', marginL, y, cW);
    y = this.twoFields(doc, 'Congé demandé', data.congeDemande ?? '', 'Reliquat', data.reliquat ?? '', marginL, y, cW);

    // Si autorisation de sortie
    y += 4;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text('• Si autorisation de sortie :', marginL + 3, y);
    y += 4.5;
    y = this.twoFields(doc, 'Heure de départ', data.heureDepart ?? '', 'Heure de retour', data.heureRetour ?? '', marginL, y, cW);
    y = this.field(doc, 'Motif de la demande', data.motif ?? '', marginL, y, cW);

    // Note permission exceptionnelle
    y += 3;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...this.DARK_GRAY);
    const noteLines = doc.splitTextToSize(
      "• Si permission exceptionnelle (*voir en verso les évènements accordés pour l'octroi d'une permission exceptionnelle, sous condition de la présentation d'une pièce justificative dès la reprise du service)",
      cW - 4
    );
    noteLines.forEach((line: string) => { doc.text(line, marginL + 3, y); y += 3.8; });

    y += 4;

    // ── PARTIE III ───────────────────────────────────────────────────────────
    y = this.sectionHeader(doc, 'III - PARTIE « AUTORISATION » :', marginL, y, cW);
    y += 1.5;
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
    doc.rect(x, y, w, 6.5, 'F');
    doc.setTextColor(...this.WHITE);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(title, x + w / 2, y + 4.5, { align: 'center' });
    return y + 6.5;
  }

  private subHeader(doc: jsPDF, title: string, x: number, y: number, w: number): number {
    doc.setFillColor(...this.LIGHT_GRAY);
    doc.rect(x, y, w, 5.5, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.rect(x, y, w, 5.5, 'S');
    doc.setTextColor(...this.BLUE);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(title, x + 2, y + 3.8);
    return y + 7.5;
  }

  private field(doc: jsPDF, label: string, value: string, x: number, y: number, w: number): number {
    const h = 7;
    doc.setDrawColor(200, 200, 200);
    doc.line(x, y + h, x + w, y + h);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text(`${label} :`, x + 2, y + 4.7);
    const lw = doc.getTextWidth(`${label} :`) + 3;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.BLACK);
    doc.text(value, x + lw + 1, y + 4.7);
    return y + h + 1.5;
  }

  private twoFields(
    doc: jsPDF,
    l1: string, v1: string,
    l2: string, v2: string,
    x: number, y: number, w: number
  ): number {
    const gap = 4;
    const hw = (w - gap) / 2;
    const h = 7;

    doc.setDrawColor(200, 200, 200);

    // Champ gauche
    doc.line(x, y + h, x + hw, y + h);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text(`${l1} :`, x + 2, y + 4.7);
    const lw1 = doc.getTextWidth(`${l1} :`) + 3;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.BLACK);
    doc.text(v1, x + lw1 + 1, y + 4.7);

    // Champ droit
    const x2 = x + hw + gap;
    doc.line(x2, y + h, x2 + hw, y + h);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.DARK_GRAY);
    doc.text(`${l2} :`, x2 + 2, y + 4.7);
    const lw2 = doc.getTextWidth(`${l2} :`) + 3;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.BLACK);
    doc.text(v2, x2 + lw2 + 1, y + 4.7);

    return y + h + 1.5;
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
    const rowH = 7.5;

    types.forEach((t, i) => {
      const cx = x + (i % 3) * colW + 3;
      const cy = y + Math.floor(i / 3) * rowH;

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

    return y + rowH * 2 + 1;
  }

  private signatureBox(doc: jsPDF, x: number, y: number, w: number, h: number): number {
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, w, h, 'S');
    return y + h + 1;
  }

  private authTable(doc: jsPDF, x: number, y: number, w: number): number {
    const rows = [
      'A - Avis du collaborateur',
      'B - Avis du supérieur hiérarchique direct',
      'C - Avis du Directeur Exécutif',
    ];

    const leftW = w * 0.55;
    const rightW = w - leftW;
    const rowH = 16;

    rows.forEach((title, i) => {
      const ry = y + i * rowH;
      const fill = i % 2 === 0 ? 245 : 255;

      doc.setFillColor(fill, fill, fill);
      doc.rect(x, ry, leftW, rowH, 'FD');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.BLUE);
      doc.text(title + ' :', x + 2, ry + 4.5);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.BLACK);

      doc.rect(x + 2, ry + 7, 3, 3, 'S'); doc.text('Demande autorisée', x + 6, ry + 9.5);
      doc.rect(x + 2, ry + 11.5, 3, 3, 'S'); doc.text('Demande refusée', x + 6, ry + 14);

      doc.rect(x + leftW, ry, rightW, rowH, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.DARK_GRAY);
      doc.text('Signature :', x + leftW + 2, ry + 4.5);
    });

    return y + rows.length * rowH + 3;
  }
}