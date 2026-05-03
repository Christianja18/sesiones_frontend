import { CommonModule, DOCUMENT } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { take, timeout } from 'rxjs';

import { CatalogOptionResponse, DisplayApiError } from '../../core/models/api.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AppIcon } from '../../shared/icon/icon';
import { CatalogFilters, CatalogosService, SearchCatalogKind } from './catalogos.service';

@Component({
  selector: 'app-catalog-picker',
  imports: [CommonModule, FormsModule, AppIcon],
  templateUrl: './catalog-picker.html',
  styleUrl: './catalog-picker.css',
})
export class CatalogPicker implements OnDestroy {
  @Input({ required: true }) label = '';
  @Input({ required: true }) kind: SearchCatalogKind = 'docentes';
  @Input() selectedOptions: CatalogOptionResponse[] = [];
  @Input() multi = false;
  @Input() disabled = false;
  @Input() filters: CatalogFilters = {};
  @Output() selectionChange = new EventEmitter<CatalogOptionResponse[]>();

  private readonly catalogosService = inject(CatalogosService);
  private readonly apiErrorService = inject(ApiErrorService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly document = inject(DOCUMENT);
  private readonly requestTimeoutMs = 15000;
  private readonly summaryWordLimit = 5;
  private previousBodyOverflow: string | null = null;

  frameOpen = false;
  loading = false;
  options: CatalogOptionResponse[] = [];
  searchText = '';
  apiError: DisplayApiError | null = null;
  private tempSelectedIds = new Set<string>();
  private requestSequence = 0;

  selectionText(): string {
    if (!this.selectedOptions.length) {
      return '';
    }

    if (!this.multi) {
      return this.optionName(this.selectedOptions[0]);
    }

    return this.selectedOptions
      .map((option, index) => `${this.label} ${index + 1}: ${this.truncateWords(this.optionName(option))}`)
      .join('\n');
  }

  ngOnDestroy(): void {
    this.unlockPageScroll();
  }

  openFrame(): void {
    if (this.disabled || !this.hasRequiredFilters()) {
      return;
    }

    this.lockPageScroll();
    this.frameOpen = true;
    this.apiError = null;
    this.searchText = '';
    this.tempSelectedIds = new Set(this.selectedOptions.map((option) => this.optionId(option)));
    this.loadOptions();
  }

  closeFrame(): void {
    this.requestSequence++;
    this.frameOpen = false;
    this.loading = false;
    this.unlockPageScroll();
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

  private truncateWords(text: string): string {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= this.summaryWordLimit) {
      return text;
    }
    return `${words.slice(0, this.summaryWordLimit).join(' ')}...`;
  }

  private loadOptions(): void {
    const requestId = ++this.requestSequence;
    this.loading = true;
    this.options = [];
    this.catalogosService.search(this.kind, this.filters).pipe(
      take(1),
      timeout({ first: this.requestTimeoutMs }),
    ).subscribe({
      next: (options) => {
        this.commitPickerState(requestId, () => {
          this.options = options;
          this.loading = false;
        });
      },
      error: (error: unknown) => {
        this.commitPickerState(requestId, () => {
          this.apiError = this.apiErrorService.toDisplayError(error);
          this.loading = false;
        });
      },
    });
  }

  private commitPickerState(requestId: number, applyState: () => void): void {
    setTimeout(() => {
      if (requestId !== this.requestSequence || !this.frameOpen) {
        return;
      }
      applyState();
      this.changeDetectorRef.detectChanges();
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

  private lockPageScroll(): void {
    const body = this.document.body;
    if (this.previousBodyOverflow === null) {
      this.previousBodyOverflow = body.style.overflow;
    }
    body.style.overflow = 'hidden';
  }

  private unlockPageScroll(): void {
    if (this.previousBodyOverflow === null) {
      return;
    }
    this.document.body.style.overflow = this.previousBodyOverflow;
    this.previousBodyOverflow = null;
  }
}
