import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { NavController } from '@ionic/angular';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private socket!: Socket;
  private serverUrl = 'http://192.168.88.46:3000'; // ← ton IP

  constructor(private navCtrl: NavController) { }

  async init() {
    await LocalNotifications.requestPermissions();
  }

  // ─── CONNEXION SOCKET ────────────────────────────────────────
  connectSocket(employe_id: string, is_manager = false) {
    this.socket = io(this.serverUrl, { transports: ['websocket'] });

    this.socket.on('connect', () => {
      console.log('🟢 Socket connecté');

      // Room personnelle
      this.socket.emit('join', employe_id);

      // Room managers si applicable
      if (is_manager) {
        this.socket.emit('join_managers');
      }
    });

    // ─── Changement statut (pour l'employé) ──────────────────
    this.socket.on('statut_conge', (data: any) => {
      console.log('📩 Statut congé:', data);
      this.showLocalNotification('Mise à jour congé', data.message);
    });

    // ─── Nouvelle demande (pour les managers) ────────────────
    this.socket.on('nouvelle_demande', (data: any) => {
      console.log('📋 Nouvelle demande:', data);
      this.showLocalNotification('Nouvelle demande de congé', data.message);
    });

    this.socket.on('disconnect', () => {
      console.log('🔴 Socket déconnecté');
    });
  }

  disconnectSocket() {
    this.socket?.disconnect();
  }

  // ─── NOTIFICATION LOCALE ─────────────────────────────────────
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