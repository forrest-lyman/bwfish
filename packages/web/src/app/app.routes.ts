import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home.page').then(m => m.HomePage),
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then(m => m.Profile),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings').then(m => m.Settings),
  },
  {
    path: 'fish/:id',
    loadComponent: () => import('./pages/fish/fish').then(m => m.Fish),
  },
  {
    path: 'techniques/:id',
    loadComponent: () => import('./pages/technique/technique').then(m => m.Technique),
  },
  {
    path: ':region/:port/:spot',
    loadComponent: () => import('./pages/spot/spot').then(m => m.Spot),
  },
  {
    path: ':region/:port',
    loadComponent: () => import('./pages/port/port').then(m => m.Port),
  },
  {
    path: ':region',
    loadComponent: () => import('./pages/region/region').then(m => m.Region),
  },
];
