import { Injectable } from '@angular/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { NavController, Platform } from '@ionic/angular';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private socket!: Socket;
  private serverUrl = 'http://192.168.1.xxx:3000';
  private permissionGranted = false;

  constructor(
    private navCtrl: NavController,
    private platform: Platform
  ) {}

  // ─── INIT ────────────────────────────────────────────────────
  async init() {
    await this.platform.ready();
    await this.requestPermissions();
    await this.createChannel();
  }

  // ─── PERMISSIONS ─────────────────────────────────────────────
  async requestPermissions() {
    try {
      const { display } = await LocalNotifications.requestPermissions();
      this.permissionGranted = display === 'granted';
      console.log('Permission notifications:', display);
    } catch (e) {
      console.error('Erreur permission:', e);
    }
  }

  // ─── CANAL ANDROID (obligatoire Android 8+) ──────────────────
  async createChannel() {
    try {
      await LocalNotifications.createChannel({
        id: 'sirh_channel',
        name: 'SIRH Notifications',
        description: 'Notifications congés SIRH',
        importance: 5,        // IMPORTANCE_HIGH
        visibility: 1,        // PUBLIC
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#3b82f6',
      });
      console.log('✅ Canal créé');
    } catch (e) {
      console.error('Erreur création canal:', e);
    }
  }

  // ─── NOTIFICATION LOCALE ─────────────────────────────────────
  async showLocalNotification(title: string, body: string) {
    if (!this.permissionGranted) {
      await this.requestPermissions();
    }

    try {
      const options: ScheduleOptions = {
        notifications: [{
          id: Math.floor(Math.random() * 100000),
          title,
          body,
          channelId: 'sirh_channel',   // ← canal Android
          sound: 'default',
          smallIcon: 'res://ic_stat_icon_config_grey',
          iconColor: '#3b82f6',
          ongoing: false,
          autoCancel: true,
          schedule: { at: new Date(Date.now() + 300) },
        }]
      };
      await LocalNotifications.schedule(options);
      console.log('📩 Notification envoyée:', title);
    } catch (e) {
      console.error('Erreur notification:', e);
    }
  }

  // ─── SOCKET ──────────────────────────────────────────────────
  connectSocket(employe_id: string, is_manager = false) {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }

    this.socket = io(this.serverUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('🟢 Socket connecté:', this.socket.id);
      this.socket.emit('join', employe_id);
      if (is_manager) {
        this.socket.emit('join_managers');
      }
    });

    this.socket.on('statut_conge', (data: any) => {
      console.log('📩 Statut congé reçu:', data);
      this.showLocalNotification('Mise à jour congé', data.message);
    });

    this.socket.on('nouvelle_demande', (data: any) => {
      console.log('📋 Nouvelle demande reçue:', data);
      this.showLocalNotification('Nouvelle demande de congé', data.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔴 Socket déconnecté:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ Erreur socket:', err.message);
    });
  }

  disconnectSocket() {
    this.socket?.disconnect();
  }
}