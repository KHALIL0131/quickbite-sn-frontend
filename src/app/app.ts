import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>'
})
export class App implements OnInit {

  ngOnInit() {
    this.appliquerTheme();
    this.appliquerLangue();

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const prefs = localStorage.getItem('quickbite_prefs');
      const theme = prefs ? JSON.parse(prefs).theme : 'dark';
      if (theme === 'auto') this.appliquerTheme();
    });
  }

  appliquerTheme() {
    const prefs = localStorage.getItem('quickbite_prefs');
    let theme = 'dark';
    if (prefs) {
      theme = JSON.parse(prefs).theme || 'dark';
    }

    document.body.classList.remove('theme-dark', 'theme-light');

    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
    } else {
      document.body.classList.add('theme-dark');
    }
  }

  appliquerLangue() {
    const langue = localStorage.getItem('quickbite_langue') || 'fr';
    document.documentElement.lang = langue;
  }
}