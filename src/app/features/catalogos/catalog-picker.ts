import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, take, timeout } from 'rxjs';

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
  private readonly requestTimeoutMs = 15000;

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
      .map((option) => `${this.optionId(option)} - ${this.optionName(option)}`)
      .join(' | ');
  }

  openFrame(): void {
    if (this.disabled || !this.hasRequiredFilters()) {
      return;
    }

    this.frameOpen = true;
    this.apiError = null;
    this.searchText = '';
    this.tempSelectedIds = new Set(this.selectedOptions.map((option) => this.optionId(option)));
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

    return this.options.filter((option) => {
      const id = this.optionId(option).toLowerCase();
      const name = this.optionName(option).toLowerCase();
      return id.includes(term) || name.includes(term);
    });
  }

  isTempSelected(option: CatalogOptionResponse): boolean {
    return this.tempSelectedIds.has(this.optionId(option));
  }

  toggleOption(option: CatalogOptionResponse): void {
    if (!this.multi) {
      this.selectionChange.emit([option]);
      this.closeFrame();
      return;
    }

    const optionId = this.optionId(option);
    if (this.tempSelectedIds.has(optionId)) {
      this.tempSelectedIds.delete(optionId);
      return;
    }
    this.tempSelectedIds.add(optionId);
  }

  applyMultiSelection(): void {
    const selected = this.options.filter((option) => this.tempSelectedIds.has(this.optionId(option)));
    this.selectionChange.emit(selected);
    this.closeFrame();
  }

  clearSelection(): void {
    this.selectionChange.emit([]);
  }

  optionId(option: CatalogOptionResponse): string {
    return String(option.id ?? '').trim();
  }

  optionName(option: CatalogOptionResponse): string {
    return String(option.nombre ?? '').trim();
  }

  private loadOptions(): void {
    this.loading = true;
    this.options = [];
    this.catalogosService.search(this.kind, this.filters).pipe(
      take(1),
      timeout({ first: this.requestTimeoutMs }),
      finalize(() => {
        this.loading = false;
      }),
    ).subscribe({
      next: (options) => {
        this.options = options;
      },
      error: (error: unknown) => {
        this.apiError = this.apiErrorService.toDisplayError(error);
      },
    });
  }

  private hasRequiredFilters(): boolean {
    if (this.kind === 'competencias') {
      return this.hasPositiveFilter(this.filters.areaId);
    }
    if (this.kind === 'capacidades') {
      return this.hasPositiveFilter(this.filters.competenciaId);
    }
    if (this.kind === 'desempenos') {
      return this.hasPositiveFilter(this.filters.gradoId) && this.hasPositiveFilter(this.filters.competenciaId);
    }
    return true;
  }

  private hasPositiveFilter(value: number | null | undefined): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }
}
