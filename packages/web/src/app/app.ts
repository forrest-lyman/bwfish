import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Loading } from './components/loading/loading';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Loading],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
