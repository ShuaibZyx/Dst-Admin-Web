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
    onReady?: () => void;
    indentRainbow?: boolean;
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
                                                                          onCursorChange,
                                                                          onReady,
                                                                          indentRainbow = false
                                                                      }, ref) => {
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const decorationsRef = useRef<string[]>([]);
    const indentDecorationsRef = useRef<string[]>([]);
    const indentTimerRef = useRef<number | undefined>(undefined);
    // 回调经 ref 转发：创建 effect 只跑一次，闭包不持旧回调
    const onCursorChangeRef = useRef(onCursorChange);
    onCursorChangeRef.current = onCursorChange;
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    const indentRainbowRef = useRef(indentRainbow);
    indentRainbowRef.current = indentRainbow;

    // 彩虹缩进（indent-rainbow 风格）：按层级列着色行首缩进区；输入防抖重算
    const updateIndentRainbow = () => {
        const editor = editorRef.current;
        const model = editor?.getModel();
        if (!editor || !model) return;
        if (!indentRainbowRef.current) {
            indentDecorationsRef.current = editor.deltaDecorations(indentDecorationsRef.current, []);
            return;
        }
        const unit = model.getOptions().tabSize || 4;
        const items: monaco.editor.IModelDeltaDecoration[] = [];
        for (let line = 1; line <= model.getLineCount(); line++) {
            const ws = model.getLineContent(line).match(/^[ \t]*/)?.[0] ?? '';
            const cols = ws.replace(/\t/g, ' '.repeat(unit)).length;
            for (let k = 0; k * unit + unit <= cols; k++) {
                items.push({
                    range: new monaco.Range(line, 1 + k * unit, line, 1 + (k + 1) * unit),
                    options: {inlineClassName: `indent-lvl-${k % 4}`},
                });
            }
        }
        indentDecorationsRef.current = editor.deltaDecorations(indentDecorationsRef.current, items);
    };
    const scheduleIndentRainbow = () => {
        if (indentTimerRef.current !== undefined) window.clearTimeout(indentTimerRef.current);
        indentTimerRef.current = window.setTimeout(() => {
            indentTimerRef.current = undefined;
            updateIndentRainbow();
        }, 150);
    };

    useEffect(() => () => {
        if (indentTimerRef.current !== undefined) window.clearTimeout(indentTimerRef.current);
    }, []);
    useEffect(() => {
        scheduleIndentRainbow();
    }, [indentRainbow]);

    useEffect(() => {
        if (containerRef.current) {
            editorRef.current = monaco.editor.create(containerRef.current, {
                value,
                language,
                theme,
                automaticLayout: true,
                // 括号层级配色 + 缩进导引线（写代码插件观感）
                bracketPairColorization: {enabled: true},
                guides: {indentation: true, highlightActiveIndentation: true},
                ...options,
            });

            editorRef.current.onDidChangeModelContent(() => {
                onChange?.(editorRef.current!.getValue());
                scheduleIndentRainbow();
            });
            editorRef.current.onDidChangeCursorPosition((e) => {
                onCursorChangeRef.current?.(e.position.lineNumber);
            });
            updateIndentRainbow();
            onReadyRef.current?.();
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