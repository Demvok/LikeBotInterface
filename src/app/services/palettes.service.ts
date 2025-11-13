import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Palette } from './api.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PalettesService {

  private apiUrl = `${environment.apiUrl}/palettes`;

  constructor(private http: HttpClient) {}

  /**
   * Fetch all palettes from backend. Returns empty array on error.
   */
  getPalettes(): Observable<Palette[]> {
    return this.http.get<Palette[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error fetching palettes:', error);
        return of([]);
      })
    );
  }

  /**
   * Fetch single palette by id
   */
  getPalette(palette_name: string): Observable<Palette> {
    return this.http.get<Palette>(`${this.apiUrl}/${palette_name}`);
  }

  /**
   * Create a new palette
   */
  createPalette(palette: Omit<Palette, 'palette_id' | 'created_at' | 'updated_at'>): Observable<{ message: string; palette_name: string }> {
    // Backend expects query parameters, not JSON body
    let params = new HttpParams()
      .set('palette_name', palette.palette_name)
      .set('emojis', palette.emojis.join(','))  // Convert array to comma-separated string
      .set('ordered', palette.ordered ? 'true' : 'false');  // Use 'ordered' not 'order'
    
    if (palette.description) {
      params = params.set('description', palette.description);
    }
    
    console.log('createPalette called with:', palette);
    console.log('Query params:', params.toString());
    
    return this.http.post<{ message: string; palette_name: string }>(this.apiUrl, {}, { params }).pipe(
      catchError((error) => {
        console.error('Error creating palette:', error);
        console.error('Error detail:', error.error);
        throw error;
      })
    );
  }

  /**
   * Update an existing palette
   */
  updatePalette(palette_name: string, palette: Partial<Palette>): Observable<{ message: string }> {
    let params = new HttpParams();
    
    if (palette.emojis && palette.emojis.length > 0) {
      params = params.set('emojis', palette.emojis.join(','));
    }
    
    if (palette.ordered !== undefined) {
      params = params.set('ordered', palette.ordered ? 'true' : 'false');
    }
    
    if (palette.description !== undefined) {
      params = params.set('description', palette.description);
    }
    
    console.log('updatePalette called with:', palette_name, palette);
    console.log('Query params:', params.toString());
    
    return this.http.put<{ message: string }>(`${this.apiUrl}/${palette_name}`, {}, { params }).pipe(
      catchError((error) => {
        console.error('Error updating palette:', error);
        throw error;
      })
    );
  }

  /**
   * Delete a palette
   */
  deletePalette(palette_name: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${palette_name}`).pipe(
      catchError((error) => {
        console.error('Error deleting palette:', error);
        throw error;
      })
    );
  }

}
