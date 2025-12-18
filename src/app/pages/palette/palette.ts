import { Component, OnInit, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PalettesService } from '../../services/palettes.service';
import { AuthService } from '../../services/auth.service';
import { Palette as PaletteModel } from '../../services/api.models';
import { EmojiPickerComponent } from './emoji-picker/emoji-picker.component';

@Component({
  selector: 'app-palette',
  imports: [CommonModule, FormsModule, EmojiPickerComponent],
  templateUrl: './palette.html',
  styleUrl: './palette.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PalettePage implements OnInit {

  palettes: PaletteModel[] = [];
  loading = false;
  error = '';
  selected_palette?: PaletteModel | null = null;

  // Allowed emojis for palette creation
  allowedEmojis = ['❤','👍','👎','🔥','🥰','👏','😁','🤔','🤯','😱','🤬','😢','🎉','🤩','🤮','💩','🙏','👌','🕊','🤡','🥱','🥴','😍','🐳','❤‍🔥','🌚','🌭','💯','🤣','⚡','🍌','🏆','💔','🤨','😐','🍓','🍾','💋','🖕','😈','😴','😭','🤓','👻','👨‍💻','👀','🎃','🙈','😇','😨','🤝','✍','🤗','🫡','🎅','🎄','☃','💅','🤪','🗿','🆒','💘','🙉','🦄','😘','💊','🙊','😎','👾','🤷‍♂','🤷','🤷‍♀','😡'];

  // Create/Edit form state
  showCreateForm = false;
  showEditForm = false;
  showEmojiPicker = false;
  editingPalette?: PaletteModel | null = null;
  formName = '';
  formDescription = '';
  formEmojis = '';
  formOrdered = false;
  formSubmitting = false;
  formError = '';
  isEditingEmojis = false; // Track if emoji picker is for create or edit form

  constructor(private palettesService: PalettesService, private cdr: ChangeDetectorRef, private authService: AuthService) {}

  ngOnInit() {
    this.fetchPalettes();
  }

  fetchPalettes() {
    this.loading = true;
    this.palettesService.getPalettes().subscribe(
      (data) => {
        this.palettes = data;
        console.log('Loaded palettes:', data);
        console.log('Palette details:', data.map(p => ({ 
          palette_name: p.palette_name, 
          ordered: p.ordered, 
          emojis: p.emojis,
          description: p.description 
        })));
        
        // After loading palettes, try to restore previously selected palette
        this.restoreSelectedPalette();
        
        this.loading = false;
      },
      (err) => {
        this.error = 'Не вдалося завантажити набори емоцій.';
        console.error(err);
        this.loading = false;
      }
    );
  }

  restoreSelectedPalette() {
    try {
      const raw = localStorage.getItem('selected_palette');
      if (raw) {
        const savedPalette = JSON.parse(raw) as PaletteModel;
        // Verify that the saved palette still exists in the list
        const exists = this.palettes.find(p => p.palette_name === savedPalette.palette_name);
        if (exists) {
          this.selected_palette = exists;
          console.log('Restored selected palette:', this.selected_palette.palette_name);
        } else {
          // Saved palette no longer exists, clear it
          console.warn('Selected palette no longer exists, clearing...');
          this.selected_palette = null;
          localStorage.removeItem('selected_palette');
        }
      }
    } catch (e) {
      console.warn('Failed to restore saved palette', e);
      this.selected_palette = null;
    }
  }

  selectPalette(p: PaletteModel) {
    this.selected_palette = p;
    try {
      localStorage.setItem('selected_palette', JSON.stringify(p));
    } catch (e) {
      console.warn('Failed to persist selected palette', e);
    }
  }

  isSelected(p: PaletteModel) {
    return this.selected_palette && this.selected_palette.palette_name === p.palette_name;
  }

  // Create palette form
  openCreateForm() {
    if (this.isGuest()) return;
    this.showCreateForm = true;
    this.showEditForm = false;
    this.formName = '';
    this.formDescription = '';
    this.formEmojis = '';
    this.formOrdered = false;
    this.formError = '';
    this.isEditingEmojis = false;
  }

  cancelCreateForm() {
    this.showCreateForm = false;
    this.formName = '';
    this.formDescription = '';
    this.formEmojis = '';
    this.formOrdered = false;
    this.formError = '';
  }

  submitCreateForm() {
    if (this.isGuest()) return;
    if (!this.formName.trim() || !this.formEmojis.trim()) {
      this.formError = 'Будь ласка, заповніть усі поля.';
      return;
    }

    const emojis = this.formEmojis.split(/[\s,]+/).filter(e => e.trim());
    if (emojis.length === 0) {
      this.formError = 'Будь ласка, введіть хоча б один емодзі.';
      return;
    }

    // Validate that all emojis are in the allowed list
    const invalidEmojis = emojis.filter(e => !this.allowedEmojis.includes(e));
    if (invalidEmojis.length > 0) {
      this.formError = `Недопустимі емодзі: ${invalidEmojis.join(', ')}. Будь ласка, використовуйте тільки дозволені емодзі.`;
      return;
    }

    this.formSubmitting = true;
    this.formError = '';

    this.palettesService.createPalette({
      palette_name: this.formName,
      description: this.formDescription || undefined,
      emojis: emojis,
      ordered: this.formOrdered
    }).subscribe(
      (res) => {
        console.log('Palette created:', res);
        this.formSubmitting = false;
        this.cancelCreateForm();
        this.fetchPalettes();
      },
      (err) => {
        console.error('Error creating palette:', err);
        console.error('Error response:', err.error);
        
        let errorMessage = 'Помилка при створенні палети.';
        
        // Handle validation errors from backend
        if (err.error?.detail) {
          if (Array.isArray(err.error.detail)) {
            errorMessage = err.error.detail.map((e: any) => {
              if (typeof e === 'string') return e;
              if (e.msg) return e.msg;
              if (e.message) return e.message;
              return JSON.stringify(e);
            }).join('; ');
          } else if (typeof err.error.detail === 'string') {
            errorMessage = err.error.detail;
          }
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        }
        
        this.formError = errorMessage;
        this.formSubmitting = false;
      }
    );
  }

  // Edit palette form
  openEditForm(p: PaletteModel) {
    if (this.isGuest()) return;
    console.log('Opening edit form for palette:', p);
    this.editingPalette = p;
    this.formName = p.palette_name;
    this.formDescription = p.description || '';
    this.formEmojis = p.emojis.join(' ');
    this.formOrdered = p.ordered || false;
    console.log('Form fields set:', {
      formName: this.formName,
      formDescription: this.formDescription,
      formEmojis: this.formEmojis,
      formOrdered: this.formOrdered
    });
    this.showEditForm = true;
    this.showCreateForm = false;
    this.formError = '';
    this.isEditingEmojis = true;
    // Force change detection to ensure checkbox state is rendered
    this.cdr.markForCheck();
  }

  cancelEditForm() {
    this.showEditForm = false;
    this.editingPalette = null;
    this.formName = '';
    this.formDescription = '';
    this.formEmojis = '';
    this.formOrdered = false;
    this.formError = '';
  }

  submitEditForm() {
    if (this.isGuest()) return;
    if (!this.formName.trim() || !this.formEmojis.trim()) {
      this.formError = 'Будь ласка, заповніть усі поля.';
      return;
    }

    const emojis = this.formEmojis.split(/[\s,]+/).filter(e => e.trim());
    if (emojis.length === 0) {
      this.formError = 'Будь ласка, введіть хоча б один емодзі.';
      return;
    }

    // Validate that all emojis are in the allowed list
    const invalidEmojis = emojis.filter(e => !this.allowedEmojis.includes(e));
    if (invalidEmojis.length > 0) {
      this.formError = `Недопустимі емодзі: ${invalidEmojis.join(', ')}. Будь ласка, використовуйте тільки дозволені емодзі.`;
      return;
    }

    if (!this.editingPalette || this.editingPalette.palette_name === undefined || this.editingPalette.palette_name === null) {
      this.formError = 'Помилка: ID палети не знайден.';
      console.error('Editing palette:', this.editingPalette);
      return;
    }

    this.formSubmitting = true;
    this.formError = '';

    // Always send at least the fields that might have changed
    const updateData: any = {};

    // Always include emojis and ordered
    updateData.emojis = emojis;
    updateData.ordered = this.formOrdered;

    // Add description
    if (this.formDescription && this.formDescription.trim()) {
      updateData.description = this.formDescription;
    } else {
      updateData.description = null;  // Clear description if empty
    }

    // Include palette_name if changed
    if (this.formName !== this.editingPalette.palette_name) {
      updateData.palette_name = this.formName;
    }

    console.log('Updating palette:', this.editingPalette.palette_name);
    console.log('Update data:', updateData);
    
    this.palettesService.updatePalette(this.editingPalette.palette_name, updateData).subscribe(
      (res) => {
        console.log('Palette updated:', res);
        this.formSubmitting = false;
        this.cancelEditForm();
        this.fetchPalettes();
      },
      (err) => {
        console.error('Error updating palette:', err);
        console.error('Error response:', err.error);
        
        let errorMessage = 'Помилка при оновленні палети.';
        
        // Handle validation errors from backend
        if (err.error?.detail) {
          if (Array.isArray(err.error.detail)) {
            errorMessage = err.error.detail.map((e: any) => {
              if (typeof e === 'string') return e;
              if (e.msg) return e.msg;
              if (e.message) return e.message;
              return JSON.stringify(e);
            }).join('; ');
          } else if (typeof err.error.detail === 'string') {
            errorMessage = err.error.detail;
          }
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        }
        
        this.formError = errorMessage;
        this.formSubmitting = false;
      }
    );
  }

  // Delete palette
  deletePalette(p: PaletteModel) {
    if (this.isGuest()) return;
    if (!confirm(`Ви впевнені, що хочете видалити палету "${p.palette_name}"?`)) {
      return;
    }

    if (!p || p.palette_name === undefined || p.palette_name === null) {
      console.error('Palette ID not found', p);
      alert('Помилка: ID палети не знайдено.');
      return;
    }

    this.palettesService.deletePalette(p.palette_name).subscribe(
      (res) => {
        console.log('Palette deleted:', res);
        
        // If we deleted the selected palette, clear it
        if (this.isSelected(p)) {
          this.selected_palette = null;
          localStorage.removeItem('selected_palette');
        }
        
        this.fetchPalettes();
      },
      (err) => {
        console.error('Error deleting palette:', err);
        alert('Помилка при видаленні палети.');
      }
    );
  }

  // Emoji picker methods
  openEmojiPicker() {
    this.showEmojiPicker = true;
  }

  closeEmojiPicker() {
    this.showEmojiPicker = false;
  }

  onEmojiSelected(emoji: string) {
    // Add emoji to formEmojis list
    if (this.formEmojis.trim()) {
      this.formEmojis += ' ' + emoji;
    } else {
      this.formEmojis = emoji;
    }
    // Keep picker open for multiple selections
  }

  onEmojiPickerClosed() {
    this.closeEmojiPicker();
  }

  // Check if current user is admin
  isAdmin(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'admin';
  }

  // Check if current user is guest
  isGuest(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'guest';
  }

}
