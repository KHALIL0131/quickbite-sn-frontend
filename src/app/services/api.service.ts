import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {

  private http = inject(HttpClient);
  private base = environment.apiUrl;

  /** GET — ex : get('commandes') ou get('plats', { categorie_id: 3 }) */
  get<T>(chemin: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(cle => {
        const valeur = params[cle];
        if (valeur !== null && valeur !== undefined && valeur !== '') {
          httpParams = httpParams.set(cle, String(valeur));
        }
      });
    }
    return this.http.get<T>(`${this.base}/${chemin}`, { params: httpParams });
  }

  /** POST — ex : post('commandes', donnees) */
  post<T>(chemin: string, corps: any): Observable<T> {
    return this.http.post<T>(`${this.base}/${chemin}`, corps);
  }

  /** PUT — ex : put('commandes/5/statut', { statut: 'livree' }) */
  put<T>(chemin: string, corps: any): Observable<T> {
    return this.http.put<T>(`${this.base}/${chemin}`, corps);
  }

  /** DELETE — ex : delete('commandes/5') */
  delete<T>(chemin: string): Observable<T> {
    return this.http.delete<T>(`${this.base}/${chemin}`);
  }

  /** Upload de fichier — le navigateur pose lui-même le Content-Type */
  upload<T>(chemin: string, formData: FormData): Observable<T> {
    return this.http.post<T>(`${this.base}/${chemin}`, formData);
  }

  /** URL complète d'une image uploadée */
  fichierUrl(dossier: string, nom: string): string {
    if (!nom) return '';
    return `${environment.serverUrl}/uploads/${dossier}/${nom}`;
  }
}