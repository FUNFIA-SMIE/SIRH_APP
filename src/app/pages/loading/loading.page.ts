import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonSpinner,IonIcon } from '@ionic/angular/standalone';
import { IonicModule, NavController } from '@ionic/angular';
import { SessionService } from 'src/app/services/session.service';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.page.html',
  styleUrls: ['./loading.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, IonSpinner, IonIcon]
})
export class LoadingPage implements OnInit {

constructor(
  private navCtrl: NavController,
  private session: SessionService
) {}

  ngOnInit() {
    setTimeout(() => {
      if (this.session.isLoggedIn()) {
        this.navCtrl.navigateRoot('/dashboard', { replaceUrl: true });
      } else {
        this.navCtrl.navigateRoot('/login', { replaceUrl: true });
      }
    }, 3000);
  }
}
