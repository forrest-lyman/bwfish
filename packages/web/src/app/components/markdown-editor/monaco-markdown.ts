import type { editor, languages } from 'monaco-editor';

let registered = false;

const markdownSnippets: Array<{
  label: string;
  insertText: string;
  documentation: string;
}> = [
  { label: 'Heading 1', insertText: '# ${1:Heading}', documentation: 'Level 1 heading' },
  { label: 'Heading 2', insertText: '## ${1:Heading}', documentation: 'Level 2 heading' },
  { label: 'Heading 3', insertText: '### ${1:Heading}', documentation: 'Level 3 heading' },
  { label: 'Bold', insertText: '**${1:text}**', documentation: 'Bold text' },
  { label: 'Italic', insertText: '*${1:text}*', documentation: 'Italic text' },
  { label: 'Link', insertText: '[${1:label}](${2:url})', documentation: 'Inline link' },
  { label: 'Image', insertText: '![${1:alt}](${2:url})', documentation: 'Image' },
  { label: 'Unordered list', insertText: '- ${1:item}', documentation: 'Bullet list item' },
  { label: 'Ordered list', insertText: '1. ${1:item}', documentation: 'Numbered list item' },
  { label: 'Blockquote', insertText: '> ${1:quote}', documentation: 'Blockquote' },
  { label: 'Inline code', insertText: '`${1:code}`', documentation: 'Inline code' },
  {
    label: 'Code block',
    insertText: '```${1:language}\n${2:code}\n```',
    documentation: 'Fenced code block',
  },
  { label: 'Horizontal rule', insertText: '---', documentation: 'Thematic break' },
  { label: 'Table', insertText: '| ${1:Header} |\n| --- |\n| ${2:Cell} |', documentation: 'Table' },
];

export function registerMarkdownLanguageFeatures(monaco: {
  editor: typeof editor;
  languages: typeof languages;
}) {
  if (registered) return;
  registered = true;

  monaco.editor.defineTheme('bwfish-markdown', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'header', foreground: '7ab8ff', fontStyle: 'bold' },
      { token: 'string.link', foreground: '4d9fff' },
      { token: 'markup.italic', fontStyle: 'italic' },
      { token: 'markup.bold', fontStyle: 'bold' },
      { token: 'comment', foreground: '6b7280' },
      { token: 'string', foreground: 'a5d6a7' },
    ],
    colors: {
      'editor.background': '#1a1a1a',
      'editor.foreground': '#e5e5e5',
      'editorLineNumber.foreground': '#525252',
      'editorLineNumber.activeForeground': '#a3a3a3',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#264f7844',
      'editorCursor.foreground': '#4d9fff',
      'editor.lineHighlightBackground': '#ffffff08',
    },
  });

  monaco.languages.registerCompletionItemProvider('markdown', {
    triggerCharacters: ['#', '*', '[', '-', '`', ':', '|'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      return {
        suggestions: markdownSnippets.map(snippet => ({
          label: snippet.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: snippet.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: snippet.documentation,
          range,
        })),
      };
    },
  });
}
