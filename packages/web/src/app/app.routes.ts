import { Routes } from '@angular/router';
import { pageRouteData } from './store/page/page-route.util';

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
    path: 'activity',
    loadComponent: () => import('./pages/activity/activity').then(m => m.Activity),
  },
  {
    path: 'fish/:id',
    data: pageRouteData('fish', 'id'),
    loadComponent: () => import('./pages/fish/fish').then(m => m.Fish),
  },
  {
    path: 'techniques/:id',
    data: pageRouteData('techniques', 'id'),
    loadComponent: () => import('./pages/technique/technique').then(m => m.Technique),
  },
  {
    path: ':region/:port/:spot',
    data: pageRouteData('spots', 'spot'),
    loadComponent: () => import('./pages/spot/spot').then(m => m.Spot),
  },
  {
    path: ':region/:port',
    data: pageRouteData('ports', 'port'),
    loadComponent: () => import('./pages/port/port').then(m => m.Port),
  },
  {
    path: ':region',
    data: pageRouteData('regions', 'region'),
    loadComponent: () => import('./pages/region/region').then(m => m.Region),
  },
];
