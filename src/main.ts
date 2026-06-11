import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { addIcons } from 'ionicons';
import {
  cameraOutline, scanOutline, closeOutline, trashOutline, qrCodeOutline,
  phonePortraitOutline, desktopOutline, logInOutline, logOutOutline,
  timeOutline, closeCircleOutline, notificationsOutline, addCircleOutline,
  calendarOutline, documentTextOutline, personOutline, checkmarkCircle,
  calendarNumberOutline, shieldCheckmarkOutline, calculatorOutline, gridOutline,
  lockClosedOutline, eyeOutline, eyeOffOutline, businessOutline, warningOutline
} from 'ionicons/icons';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient()
  ],
});

// Register commonly used icons globally to avoid Ionicons load warnings
addIcons({
  cameraOutline, scanOutline, closeOutline, trashOutline, qrCodeOutline,
  phonePortraitOutline, desktopOutline, logInOutline, logOutOutline,
  timeOutline, closeCircleOutline, notificationsOutline, addCircleOutline,
  calendarOutline, documentTextOutline, personOutline, checkmarkCircle,
  calendarNumberOutline, shieldCheckmarkOutline, calculatorOutline, gridOutline,
  lockClosedOutline, eyeOutline, eyeOffOutline, businessOutline, warningOutline
});
