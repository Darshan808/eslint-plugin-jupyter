/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A module with enough code that moving it into its own chunk is worthwhile.
 */

export interface ITableOptions {
  rows: number;
  columns: number;
  caption?: string;
}

export class HeavyTable {
  constructor(options: ITableOptions) {
    this._rows = options.rows;
    this._columns = options.columns;
    this._caption = options.caption ?? '';
    this._cells = [];
    this._selection = null;
    this.reset();
  }

  get rows(): number {
    return this._rows;
  }

  get columns(): number {
    return this._columns;
  }

  get caption(): string {
    return this._caption;
  }

  reset(): void {
    this._cells = [];
    for (let row = 0; row < this._rows; row++) {
      const line: string[] = [];
      for (let column = 0; column < this._columns; column++) {
        line.push('');
      }
      this._cells.push(line);
    }
    this._selection = null;
  }

  getCell(row: number, column: number): string {
    if (row < 0 || row >= this._rows) {
      throw new RangeError(`Row ${row} is outside the table`);
    }
    if (column < 0 || column >= this._columns) {
      throw new RangeError(`Column ${column} is outside the table`);
    }
    return this._cells[row][column];
  }

  setCell(row: number, column: number, value: string): void {
    if (row < 0 || row >= this._rows) {
      throw new RangeError(`Row ${row} is outside the table`);
    }
    if (column < 0 || column >= this._columns) {
      throw new RangeError(`Column ${column} is outside the table`);
    }
    this._cells[row][column] = value;
  }

  select(row: number, column: number): void {
    this._selection = { row, column };
  }

  clearSelection(): void {
    this._selection = null;
  }

  toCSV(separator = ','): string {
    return this._cells
      .map(line =>
        line
          .map(cell =>
            cell.includes(separator) ? `"${cell.replace(/"/g, '""')}"` : cell
          )
          .join(separator)
      )
      .join('\n');
  }

  fromCSV(text: string, separator = ','): void {
    const lines = text.split('\n').filter(line => line.length > 0);
    this._rows = lines.length;
    this._columns = 0;
    this._cells = lines.map(line => {
      const parsed = line.split(separator).map(cell => cell.trim());
      this._columns = Math.max(this._columns, parsed.length);
      return parsed;
    });
  }

  transpose(): void {
    const transposed: string[][] = [];
    for (let column = 0; column < this._columns; column++) {
      const line: string[] = [];
      for (let row = 0; row < this._rows; row++) {
        line.push(this._cells[row][column] ?? '');
      }
      transposed.push(line);
    }
    this._cells = transposed;
    const rows = this._rows;
    this._rows = this._columns;
    this._columns = rows;
  }

  insertRow(at: number): void {
    if (at < 0 || at > this._rows) {
      throw new RangeError(`Cannot insert a row at ${at}`);
    }
    const line: string[] = [];
    for (let column = 0; column < this._columns; column++) {
      line.push('');
    }
    this._cells.splice(at, 0, line);
    this._rows += 1;
  }

  removeRow(at: number): void {
    if (at < 0 || at >= this._rows) {
      throw new RangeError(`Cannot remove the row at ${at}`);
    }
    this._cells.splice(at, 1);
    this._rows -= 1;
  }

  insertColumn(at: number): void {
    if (at < 0 || at > this._columns) {
      throw new RangeError(`Cannot insert a column at ${at}`);
    }
    for (const line of this._cells) {
      line.splice(at, 0, '');
    }
    this._columns += 1;
  }

  removeColumn(at: number): void {
    if (at < 0 || at >= this._columns) {
      throw new RangeError(`Cannot remove the column at ${at}`);
    }
    for (const line of this._cells) {
      line.splice(at, 1);
    }
    this._columns -= 1;
  }

  sortByColumn(column: number, descending = false): void {
    if (column < 0 || column >= this._columns) {
      throw new RangeError(`Column ${column} is outside the table`);
    }
    this._cells.sort((left, right) => {
      const a = left[column] ?? '';
      const b = right[column] ?? '';
      const order = a.localeCompare(b, undefined, { numeric: true });
      return descending ? -order : order;
    });
  }

  find(query: string): Array<{ row: number; column: number }> {
    const matches: Array<{ row: number; column: number }> = [];
    for (let row = 0; row < this._rows; row++) {
      for (let column = 0; column < this._columns; column++) {
        if (this._cells[row][column].includes(query)) {
          matches.push({ row, column });
        }
      }
    }
    return matches;
  }

  toMarkdown(): string {
    const header = this._cells[0] ?? [];
    const divider = header.map(() => '---');
    const body = this._cells.slice(1);
    const render = (line: string[]) => `| ${line.join(' | ')} |`;
    return [render(header), render(divider), ...body.map(render)].join('\n');
  }

  columnWidths(): number[] {
    const widths: number[] = [];
    for (let column = 0; column < this._columns; column++) {
      let widest = 0;
      for (let row = 0; row < this._rows; row++) {
        widest = Math.max(widest, (this._cells[row][column] ?? '').length);
      }
      widths.push(widest);
    }
    return widths;
  }

  fillDown(column: number): void {
    if (column < 0 || column >= this._columns) {
      throw new RangeError(`Column ${column} is outside the table`);
    }
    let last = '';
    for (let row = 0; row < this._rows; row++) {
      const value = this._cells[row][column];
      if (value.length > 0) {
        last = value;
      } else {
        this._cells[row][column] = last;
      }
    }
  }

  replaceAll(query: string, replacement: string): number {
    let count = 0;
    for (let row = 0; row < this._rows; row++) {
      for (let column = 0; column < this._columns; column++) {
        const cell = this._cells[row][column];
        if (cell.includes(query)) {
          this._cells[row][column] = cell.split(query).join(replacement);
          count += 1;
        }
      }
    }
    return count;
  }

  private _rows: number;
  private _columns: number;
  private _caption: string;
  private _cells: string[][];
  private _selection: { row: number; column: number } | null;
}
