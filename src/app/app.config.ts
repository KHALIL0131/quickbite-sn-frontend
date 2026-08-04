import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';

import { authInterceptor } from './interceptors/auth.interceptor';
import { erreurInterceptor } from './interceptors/erreur.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        erreurInterceptor
      ])
    )
  ]
};