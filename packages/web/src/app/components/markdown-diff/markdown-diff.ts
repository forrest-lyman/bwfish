import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  viewChild,
} from '@angular/core';
import loader from '@monaco-editor/loader';
import type * as Monaco from 'monaco-editor';
import { registerMarkdownLanguageFeatures } from '../markdown-editor/monaco-markdown';

@Component({
  selector: 'app-markdown-diff',
  standalone: true,
  imports: [],
  templateUrl: './markdown-diff.html',
  styleUrl: './markdown-diff.scss',
})
export class MarkdownDiff implements AfterViewInit, OnDestroy {
  original = input('');
  modified = input('');

  private container = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private diffEditor?: Monaco.editor.IStandaloneDiffEditor;
  private monaco?: typeof Monaco;
  private originalModel?: Monaco.editor.ITextModel;
  private modifiedModel?: Monaco.editor.ITextModel;
  private resizeObserver?: ResizeObserver;
  private ready = false;

  constructor() {
    effect(() => {
      const original = this.original();
      const modified = this.modified();
      if (!this.ready) return;
      this.updateModels(original, modified);
    });
  }

  async ngAfterViewInit() {
    loader.config({ paths: { vs: '/monaco/vs' } });
    const monaco = await loader.init();
    registerMarkdownLanguageFeatures(monaco);

    const host = this.container().nativeElement;
    const diffEditor = monaco.editor.createDiffEditor(host, {
      theme: 'bwfish-markdown',
      automaticLayout: true,
      readOnly: true,
      renderSideBySide: true,
      wordWrap: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, monospace",
      fontSize: 13,
      lineHeight: 22,
      padding: { top: 12, bottom: 12 },
      renderOverviewRuler: false,
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
    });

    this.diffEditor = diffEditor;
    this.monaco = monaco;
    this.updateModels(this.original(), this.modified());
    this.ready = true;

    this.resizeObserver = new ResizeObserver(() => {
      diffEditor.layout();
    });
    this.resizeObserver.observe(host);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.originalModel?.dispose();
    this.modifiedModel?.dispose();
    this.diffEditor?.dispose();
  }

  private updateModels(original: string, modified: string) {
    if (!this.monaco || !this.diffEditor) return;

    if (!this.originalModel) {
      this.originalModel = this.monaco.editor.createModel(original, 'markdown');
      this.modifiedModel = this.monaco.editor.createModel(modified, 'markdown');
      this.diffEditor.setModel({
        original: this.originalModel,
        modified: this.modifiedModel,
      });
      return;
    }

    if (this.originalModel.getValue() !== original) {
      this.originalModel.setValue(original);
    }
    if (this.modifiedModel!.getValue() !== modified) {
      this.modifiedModel!.setValue(modified);
    }
  }
}
