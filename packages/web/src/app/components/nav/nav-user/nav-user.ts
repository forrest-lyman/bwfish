import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav-user',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-user.html',
  styleUrl: './nav-user.scss',
})
export class NavUser {}
