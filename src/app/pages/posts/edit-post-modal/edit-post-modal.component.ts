import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Post } from '../../../services/api.models';

export interface EditPostDialogData {
  post: Post;
}

export interface EditPostDialogResult {
  post: Post;
}

@Component({
  selector: 'app-edit-post-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './edit-post-modal.component.html',
  styleUrls: ['./edit-post-modal.component.css']
})
export class EditPostModalComponent {
  editedPost: Post;
  originalMessageLink: string;

  constructor(
    public dialogRef: MatDialogRef<EditPostModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditPostDialogData
  ) {
    // Create a copy of the post to edit
    this.editedPost = { ...data.post };
    this.originalMessageLink = data.post.message_link;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    // If message_link has changed, clear chat_id and message_id
    if (this.editedPost.message_link !== this.originalMessageLink) {
      this.editedPost.chat_id = undefined;
      this.editedPost.message_id = undefined;
    }

    this.dialogRef.close({ post: this.editedPost });
  }

  isFormValid(): boolean {
    return !!(this.editedPost.message_link && this.editedPost.message_link.trim());
  }
}