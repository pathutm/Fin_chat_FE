import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';

const authGuard = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoading()) {
    await authService.ensureInitialized();
  }

  if (authService.currentUser()) {
    return true;
  }

  return router.parseUrl('/login');
};

const loginGuard = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoading()) {
    await authService.ensureInitialized();
  }

  if (authService.currentUser()) {
    return router.parseUrl('/');
  }

  return true;
};

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () =>
      import('./features/auth/login-page.component').then(
        (m) => m.LoginPageComponent,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/chat/chat-page/chat-page.component').then(
            (m) => m.ChatPageComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
