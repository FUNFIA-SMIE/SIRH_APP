import { Injectable } from '@angular/core';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { NavController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})

export class NotificationService {
  constructor(private navCtrl: NavController) { }


  // ─── INIT AU DÉMARRAGE ───────────────────────────────────────
  async init() {
    await this.requestPermission();
    await this.registerPushListeners();
  }

  // ─── DEMANDER LA PERMISSION ──────────────────────────────────
  async requestPermission() {
    const result = await PushNotifications.requestPermissions();
    if (result.receive === 'granted') {
      await PushNotifications.register();
    }
  }

  // ─── ÉCOUTER LES ÉVÉNEMENTS PUSH ────────────────────────────
  async registerPushListeners() {

    // Token FCM reçu → à envoyer à votre backend
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('FCM Token:', token.value);
      // TODO: envoyer token.value à votre API backend
      localStorage.setItem('fcm_token', token.value);
    });

    // Notification reçue en FOREGROUND (app ouverte)
    PushNotifications.addListener('pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Notification reçue:', notification);
        // Afficher une notification locale visuelle
        this.showLocalNotification(
          notification.title ?? 'SIRH',
          notification.body ?? ''
        );
      }
    );

    // Utilisateur clique sur la notification (app en arrière-plan)
    PushNotifications.addListener('pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Action notif:', action);
        // Naviguer selon le type de notif
        const data = action.notification.data;
        if (data?.type === 'conge') {
          this.navCtrl.navigateForward('/mes-absences');
        }
      }
    );
  }

  // ─── NOTIFICATION LOCALE (sans serveur) ─────────────────────
  async showLocalNotification(title: string, body: string) {
    await LocalNotifications.requestPermissions();
    await LocalNotifications.schedule({
      notifications: [{
        id: Date.now(),
        title,
        body,
        schedule: { at: new Date(Date.now() + 500) }, // dans 500ms
        sound: 'default',
        smallIcon: 'res://ic_stat_icon',
      }]
    });
  }

}
