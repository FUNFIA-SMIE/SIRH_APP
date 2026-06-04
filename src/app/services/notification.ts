import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { NavController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {

  constructor(private navCtrl: NavController) { }

  // ─── INIT AU DÉMARRAGE ───────────────────────────────────────
  async init() {
    await LocalNotifications.requestPermissions();
  }

  // ─── NOTIFICATION LOCALE (sans Firebase) ────────────────────
  async showLocalNotification(title: string, body: string) {
    await LocalNotifications.schedule({
      notifications: [{
        id: Date.now(),
        title,
        body,
        schedule: { at: new Date(Date.now() + 500) },
        sound: 'default',
        smallIcon: 'res://ic_stat_icon',
      }]
    });
  }
}