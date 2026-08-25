import { Injectable } from '@angular/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Platform } from '@ionic/angular';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private socket!: Socket;
  private serverUrl = 'https://backend-sirh.onrender.com';
  private permissionGranted = false;
  private channelCreated = false;

  constructor(private platform: Platform) {}

  // ─── INIT ─────────────────────────────────────────────────────
  async init(): Promise<void> {
    await this.platform.ready();
    await this.requestPermissions();
    if (!this.channelCreated) {
      await this.createChannel();
    }
  }

  // ─── PERMISSIONS ──────────────────────────────────────────────
  async requestPermissions(): Promise<void> {
    try {
      const result = await LocalNotifications.requestPermissions();
      this.permissionGranted = result.display === 'granted';
      console.log('Permission notifications:', result.display);
    } catch (e) {
      console.error('Erreur permission:', e);
      this.permissionGranted = false;
    }
  }

  // ─── CANAL ANDROID (obligatoire Android 8+) ───────────────────
  async createChannel(): Promise<void> {
    // Ignorer sur les plateformes ne supportant pas les canaux
    if (this.platform.is('cordova') === false && this.platform.is('capacitor') === false) {
      this.channelCreated = true;
      return;
    }

    try {
      await LocalNotifications.createChannel({
        id: 'sirh_channel',
        name: 'SIRH Notifications',
        description: 'Notifications congés SIRH',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#3b82f6',
      });
      this.channelCreated = true;
      console.log('✅ Canal créé');
    } catch (e) {
      console.error('Erreur création canal:', e);
      this.channelCreated = true;
    }
  }

  // ─── NOTIFICATION LOCALE ──────────────────────────────────────
  async showLocalNotification(title: string, body: string): Promise<void> {
    if (!this.permissionGranted) {
      await this.requestPermissions();
      if (!this.permissionGranted) {
        console.warn('Notification ignorée : permission refusée');
        return;
      }
    }

    if (!this.channelCreated) {
      await this.createChannel();
    }

    try {
      const options: ScheduleOptions = {
        notifications: [{
          id: Math.floor(Math.random() * 2147483647), // int32 max safe
          title,
          body,
          channelId: 'sirh_channel',
          // ✅ Icône standard Capacitor — fonctionne sans ressource custom
          smallIcon: 'ic_stat_notify',
          iconColor: '#3b82f6',
          ongoing: false,
          autoCancel: true,
          // ✅ Délai minimum 1s (Android ignore < 500ms)
          schedule: { at: new Date(Date.now() + 1000) },
        }]
      };
      await LocalNotifications.schedule(options);
      console.log('📩 Notification envoyée:', title);
    } catch (e) {
      console.error('Erreur notification:', e);
    }
  }

  // ─── SOCKET ───────────────────────────────────────────────────
  connectSocket(employe_id: string, is_manager = false): void {
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

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔴 Socket déconnecté:', reason);
    });

    this.socket.on('connect_error', (err: Error) => {
      console.error('❌ Erreur socket:', err.message);
    });
  }

  disconnectSocket(): void {
    this.socket?.disconnect();
  }
}