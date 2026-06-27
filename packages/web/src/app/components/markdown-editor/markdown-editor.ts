import {
  AfterViewInit,
  Component,
  ElementRef,
  forwardRef,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import loader from '@monaco-editor/loader';
import type * as Monaco from 'monaco-editor';
import { registerMarkdownLanguageFeatures } from './monaco-markdown';

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  templateUrl: './markdown-editor.html',
  styleUrl: './markdown-editor.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownEditor),
      multi: true,
    },
  ],
})
export class MarkdownEditor implements AfterViewInit, OnDestroy, ControlValueAccessor {
  private container = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private editor?: Monaco.editor.IStandaloneCodeEditor;
  private resizeObserver?: ResizeObserver;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private pendingValue = '';
  private disabled = false;

  async ngAfterViewInit() {
    loader.config({ paths: { vs: '/monaco/vs' } });
    const monaco = await loader.init();
    registerMarkdownLanguageFeatures(monaco);

    const host = this.container().nativeElement;
    const editor = monaco.editor.create(host, {
      value: this.pendingValue,
      language: 'markdown',
      theme: 'bwfish-markdown',
      automaticLayout: true,
      wordWrap: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, monospace",
      fontSize: 13,
      lineHeight: 22,
      padding: { top: 12, bottom: 12 },
      tabSize: 2,
      insertSpaces: true,
      quickSuggestions: { other: true, comments: false, strings: true },
      suggestOnTriggerCharacters: true,
      wordBasedSuggestions: 'off',
      folding: true,
      renderLineHighlight: 'line',
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
    });

    this.editor = editor;

    editor.onDidChangeModelContent(() => {
      this.onChange(editor.getValue());
    });
    editor.onDidBlurEditorText(() => this.onTouched());
    editor.updateOptions({ readOnly: this.disabled });

    this.resizeObserver = new ResizeObserver(() => {
      editor.layout();
    });
    this.resizeObserver.observe(host);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.editor?.dispose();
  }

  writeValue(value: string | null): void {
    this.pendingValue = value ?? '';
    if (!this.editor) return;

    const current = this.editor.getValue();
    if (current !== this.pendingValue) {
      this.editor.setValue(this.pendingValue);
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.editor?.updateOptions({ readOnly: isDisabled });
  }
}
