import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CatalogOptionResponse, DisplayApiError } from '../../core/models/api.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { CatalogFilters, CatalogosService, SearchCatalogKind } from './catalogos.service';

@Component({
  selector: 'app-catalog-picker',
  imports: [CommonModule, FormsModule],
  templateUrl: './catalog-picker.html',
  styleUrl: './catalog-picker.css',
})
export class CatalogPicker {
  @Input({ required: true }) label = '';
  @Input({ required: true }) kind: SearchCatalogKind = 'docentes';
  @Input() selectedOptions: CatalogOptionResponse[] = [];
  @Input() multi = false;
  @Input() disabled = false;
  @Input() filters: CatalogFilters = {};
  @Output() selectionChange = new EventEmitter<CatalogOptionResponse[]>();

  private readonly catalogosService = inject(CatalogosService);
  private readonly apiErrorService = inject(ApiErrorService);

  frameOpen = false;
  loading = false;
  options: CatalogOptionResponse[] = [];
  searchText = '';
  apiError: DisplayApiError | null = null;
  private tempSelectedIds = new Set<string>();

  selectionText(): string {
    if (!this.selectedOptions.length) {
      return '';
    }

    return this.selectedOptions
      .map((option) => `${option.id} - ${option.nombre}`)
      .join(' | ');
  }

  openFrame(): void {
    if (this.disabled) {
      return;
    }

    this.frameOpen = true;
    this.apiError = null;
    this.searchText = '';
    this.tempSelectedIds = new Set(this.selectedOptions.map((option) => option.id));
    this.loadOptions();
  }

  closeFrame(): void {
    this.frameOpen = false;
  }

  filteredOptions(): CatalogOptionResponse[] {
    const term = this.searchText.trim().toLowerCase();
    if (!term) {
      return this.options;
    }

    return this.options.filter((option) =>
      option.id.toLowerCase().includes(term) || option.nombre.toLowerCase().includes(term),
    );
  }

  isTempSelected(option: CatalogOptionResponse): boolean {
    return this.tempSelectedIds.has(option.id);
  }

  toggleOption(option: CatalogOptionResponse): void {
    if (!this.multi) {
      this.selectionChange.emit([option]);
      this.closeFrame();
      return;
    }

    if (this.tempSelectedIds.has(option.id)) {
      this.tempSelectedIds.delete(option.id);
      return;
    }
    this.tempSelectedIds.add(option.id);
  }

  applyMultiSelection(): void {
    const selected = this.options.filter((option) => this.tempSelectedIds.has(option.id));
    this.selectionChange.emit(selected);
    this.closeFrame();
  }

  clearSelection(): void {
    this.selectionChange.emit([]);
  }

  private loadOptions(): void {
    this.loading = true;
    this.catalogosService.search(this.kind, this.filters).subscribe({
      next: (options) => {
        this.options = options;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.apiError = this.apiErrorService.toDisplayError(error);
        this.loading = false;
      },
    });
  }
}
