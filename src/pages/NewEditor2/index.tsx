import * as monaco from 'monaco-editor'
import React, {useEffect, useRef, useImperativeHandle, forwardRef} from 'react';

interface MonacoEditorProps {
    value?: string;
    language?: string;
    theme?: string;
    options?: monaco.editor.IStandaloneEditorConstructionOptions;
    style?: React.CSSProperties;
    onChange?: (value: string) => void;
    onCursorChange?: (line: number) => void;
}

export interface MonacoEditorRef {
    getValue: () => string;
    setValue: (value: string) => void;
    revealLineInCenter: (line: number) => void;
    setBlockDecorations: (items: Array<{ startLine: number; endLine: number; className: string }>) => void;
}

const MonacoEditor2 = forwardRef<MonacoEditorRef, MonacoEditorProps>(({
                                                                          value = '',
                                                                          language = 'lua',
                                                                          theme = 'vs-dark',
                                                                          options = {},
                                                                          style = {},
                                                                          onChange,
                                                                          onCursorChange
                                                                      }, ref) => {
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const decorationsRef = useRef<string[]>([]);
    // 回调经 ref 转发：创建 effect 只跑一次，闭包不持旧回调
    const onCursorChangeRef = useRef(onCursorChange);
    onCursorChangeRef.current = onCursorChange;

    useEffect(() => {
        if (containerRef.current) {
            editorRef.current = monaco.editor.create(containerRef.current, {
                value,
                language,
                theme,
                automaticLayout: true,
                ...options,
            });

            editorRef.current.onDidChangeModelContent(() => {
                onChange?.(editorRef.current!.getValue());
            });
            editorRef.current.onDidChangeCursorPosition((e) => {
                onCursorChangeRef.current?.(e.position.lineNumber);
            });
        }

        return () => editorRef.current?.dispose();
    }, []);

    useImperativeHandle(ref, () => ({
        getValue: () => editorRef.current?.getValue() || '',
        setValue: (value: string) => {
            if (editorRef.current) {
                editorRef.current.setValue(value);
            }
        },
        revealLineInCenter: (line: number) => {
            const editor = editorRef.current;
            const model = editor?.getModel();
            if (!editor || !model) return;
            const target = Math.min(Math.max(line, 1), model.getLineCount());
            editor.setPosition({lineNumber: target, column: 1});
            editor.revealLineInCenter(target);
        },
        setBlockDecorations: (items) => {
            const editor = editorRef.current;
            const model = editor?.getModel();
            if (!editor || !model) return;
            const max = model.getLineCount();
            const next = (items || []).map(({startLine, endLine, className}) => {
                const start = Math.min(Math.max(startLine, 1), max);
                const end = Math.min(Math.max(endLine, start), max);
                return {
                    range: new monaco.Range(start, 1, end, model.getLineMaxColumn(end)),
                    options: {className, isWholeLine: true},
                };
            });
            decorationsRef.current = editor.deltaDecorations(decorationsRef.current, next);
        },
    }), []);

    return <div ref={containerRef} style={{width: '100%', height: '100%', ...style}}/>;
});

export default MonacoEditor2;