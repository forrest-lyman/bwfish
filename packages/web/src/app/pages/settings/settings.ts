import { Component } from '@angular/core';
import { Layout } from '../../components/layout/layout';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [Layout],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {}
