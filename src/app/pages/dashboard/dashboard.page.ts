import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
// Ajoutez IonPopover dans les imports
import {
  IonicModule,
  NavController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  notificationsOutline, addCircleOutline, calendarOutline,
  documentTextOutline, settingsOutline, checkmarkCircle, time
} from 'ionicons/icons';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class DashboardPage {
  navProfil() {
    this.navCtrl.navigateForward('/profils');
  }
  constructor(private navCtrl: NavController) {
    addIcons({
      notificationsOutline, addCircleOutline, calendarOutline,
      documentTextOutline, settingsOutline, checkmarkCircle, time
    });
  }

  navDemande() {
    this.navCtrl.navigateForward('/demande-conge');
  }
}