import { Component, OnInit } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { SessionService } from '../services/session.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class HomePage implements OnInit {
  token: any = null;

  constructor(private session: SessionService) {}

  ngOnInit(): void {
    this.token = this.session.getUser();
    if(this.token){
      console.log('Token trouvé:', this.token);
    }
    else{
      console.log('Aucun token trouvé');
    }
  }



}
