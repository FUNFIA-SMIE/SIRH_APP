import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';

@Injectable({
  providedIn: 'root',
})
export class PushNotification {

  constructor(private http: HttpClient) { }

  async initPush(userId: string) {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      await this.http.post('https://backend-sirh.onrender.com', {
        userId,
        token: token.value
      }).toPromise();
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Erreur registration push : ', err);
    });

    PushNotifications.addListener('pushNotificationReceived', (notif) => {
      console.log('Notification reçue app ouverte : ', notif);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notif) => {
      console.log('Action sur la notification : ', notif);
    });
  }

}
