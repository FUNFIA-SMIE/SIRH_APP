import { Component, OnInit } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class HomePage implements OnInit {
  constructor() {}
  token = localStorage.getItem('utilisateur');


  ngOnInit(): void {
    if(this.token){
      console.log('Token trouvé:', this.token);
    }
    else{
      console.log('Aucun token trouvé');
    }
  }



}
