import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type AppIconName =
  | 'apply'
  | 'book'
  | 'close'
  | 'document'
  | 'files'
  | 'generate'
  | 'loader'
  | 'login'
  | 'logout'
  | 'process'
  | 'save'
  | 'search'
  | 'session'
  | 'trash'
  | 'unit'
  | 'user';

const ICON_PATHS: Record<AppIconName, string[]> = {
  apply: ['M20 6 9 17 4 12'],
  book: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z'],
  close: ['M6 6 18 18', 'M18 6 6 18'],
  document: ['M6 2h9l5 5v15H6z', 'M14 2v6h6', 'M9 13h6', 'M9 17h6'],
  files: ['M8 2h8l4 4v12H8z', 'M16 2v5h4', 'M4 6v16h12'],
  generate: ['M12 2v4', 'M12 18v4', 'M4.9 4.9l2.8 2.8', 'M16.3 16.3l2.8 2.8', 'M2 12h4', 'M18 12h4', 'M4.9 19.1l2.8-2.8', 'M16.3 7.7l2.8-2.8'],
  loader: ['M21 12a9 9 0 1 1-6.2-8.6'],
  login: ['M10 17l5-5-5-5', 'M15 12H3', 'M21 3v18h-6'],
  logout: ['M14 7l5 5-5 5', 'M19 12H7', 'M3 3v18h6'],
  process: ['M12 3v3', 'M12 18v3', 'M4.2 7.5l2.6 1.5', 'M17.2 15l2.6 1.5', 'M4.2 16.5l2.6-1.5', 'M17.2 9l2.6-1.5', 'M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0'],
  save: ['M5 3h12l2 2v16H5z', 'M8 3v6h8V3', 'M8 17h8v4H8z'],
  search: ['M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14', 'M20 20l-4.3-4.3'],
  session: ['M6 3h12v18H6z', 'M9 8h6', 'M9 12h6', 'M9 16h4'],
  trash: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 14h10l1-14', 'M9 7V4h6v3'],
  unit: ['M4 7h16', 'M4 12h16', 'M4 17h16', 'M8 4v16'],
  user: ['M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10', 'M4 22a8 8 0 0 1 16 0'],
};

@Component({
  selector: 'app-icon',
  template: `
    <svg
      class="icon"
      [class.icon-spin]="name === 'loader'"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      @for (path of paths; track path) {
        <path [attr.d]="path" />
      }
    </svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      width: 1.1rem;
      height: 1.1rem;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
    }

    .icon {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .icon-spin {
      animation: icon-spin 0.9s linear infinite;
      transform-origin: center;
    }

    @keyframes icon-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppIcon {
  @Input({ required: true }) name: AppIconName = 'search';

  get paths(): string[] {
    return ICON_PATHS[this.name] ?? ICON_PATHS.search;
  }
}
