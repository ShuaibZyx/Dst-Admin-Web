import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Col, Row} from 'antd';
import {useParams} from 'react-router-dom';
import {useTheme} from '../../hooks/useTheme';
import {buildModIndex, buildModNameMap, modIdAtLine} from '../../utils/modIndex';
import {getMyModInfoList} from '../../api/modApi.jsx';
import ModVisualEditor from './ModVisualEditor';

const MonacoEditor2 = React.lazy(() => import("../NewEditor2"));

// 模组双栏编辑（左代码/右可视化）：对 level.modoverrides 受控编辑、经 changeLevel 写回。
// 世界 tab（props 是加载快照）与创建台（草稿流、props 每键更新）共用。
const Modoverrides = (props) => {
    const {theme} = useTheme();
    const editorRef = useRef(null);
    const {cluster} = useParams();
    // 编辑期用本地 state 承接两个视图的每次改动——否则可视化表单读旧值，连续改动会互相覆盖
    const [text, setText] = useState(props.level?.modoverrides || '')
    const index = useMemo(() => buildModIndex(text), [text]);
    const [activeModId, setActiveModId] = useState(null);
    // 右卡滚动跟随：仅光标驱动的聚焦才推进（点右卡标题不触发，防回拉）
    const [focus, setFocus] = useState(null);
    const [nameMap, setNameMap] = useState({});
    const [editorReady, setEditorReady] = useState(0);
    // 右→左跳转（reveal+setPosition）引起的光标事件行号：不回拉右栏
    const revealedLineRef = useRef(null);

    useEffect(() => {
        const value = props.level?.modoverrides || ''
        // 等值跳过：草稿态父级每次键入都产新 props，无守卫会每键 setValue 打断光标
        const cur = editorRef.current ? editorRef.current.getValue() : text;
        if (value !== cur) {
            editorRef.current?.setValue(value)
            setText(value)
        }
    }, [props.level?.modoverrides]);

    // 模组名表 modid→name（搜索匹配 + 卡片标题）；失败降级空表（回退显示 id）
    useEffect(() => {
        getMyModInfoList(cluster || '').then((resp) => {
            if (resp?.code !== 200) return;
            setNameMap(buildModNameMap(resp.data));
        }).catch(() => setNameMap({}));
    }, [cluster]);

    // 活动模组被删/改掉（不在索引里）→ 清高亮
    useEffect(() => {
        if (activeModId && !index.some(b => b.id === activeModId)) setActiveModId(null);
    }, [index, activeModId]);

    // 块配色：交替淡底色区分边界，活动块金边；editorReady 兜住懒挂载晚于首跑的情况
    useEffect(() => {
        editorRef.current?.setBlockDecorations(index.map((b, i) => ({
            startLine: b.startLine,
            endLine: b.endLine,
            className: b.id === activeModId ? 'mod-block-active' : (i % 2 ? 'mod-block-alt' : 'mod-block-alt2'),
        })));
    }, [index, activeModId, editorReady]);

    // 左→右：光标跨进哪个模组块，右卡滚入并高亮（同块不触发，打字不跳；块外不改活动态——
    // setValue 等程序化移动会派生光标事件，命中块外不能把高亮清掉）
    const handleCursorChange = (line) => {
        const id = modIdAtLine(index, line);
        if (id) setActiveModId(prev => (prev === id ? prev : id));
        if (revealedLineRef.current === line) {
            revealedLineRef.current = null;
            return;
        }
        if (id) setFocus(f => ({id, tick: (f?.tick ?? 0) + 1}));
    };

    // 右→左：点卡片标题 → 代码滚到该模组块（reveal 内 setPosition 同块，不回拉右栏）
    const handleSelectMod = (id) => {
        setActiveModId(id);
        const block = index.find(b => b.id === id);
        if (block) {
            revealedLineRef.current = block.startLine;
            editorRef.current?.revealLineInCenter(block.startLine);
        }
    };

    return (<>
        {/* 左代码 / 右可视化：同一份 modoverrides 的两个视图，互为对照（可视化改动写回代码、代码改动重解析） */}
        <Row gutter={12} style={{flexWrap: 'nowrap'}}>
            <Col flex="auto">
                <React.Suspense fallback={null}><MonacoEditor2 ref={editorRef}
                                       value={text}
                                       theme={theme === 'dark' ? 'vs-dark' : ''}
                                       indentRainbow
                                       style={{
                                           "height": "calc(100vh - 365px)",
                                           "minHeight": "300px",
                                           "width": "100%"
                                       }}
                                       onReady={() => setEditorReady(v => v + 1)}
                                       onCursorChange={handleCursorChange}
                                       onChange={value => {
                                           setText(value)
                                           if (props.changeLevel) {
                                               props.changeLevel(props.levelName || '', {modoverrides: value})
                                           }
                                       }}
                /></React.Suspense>
            </Col>
            <Col flex="380px" style={{minWidth: 300}}>
                <ModVisualEditor
                    value={text}
                    nameMap={nameMap}
                    activeModId={activeModId}
                    focus={focus}
                    onSelectMod={handleSelectMod}
                    onChange={next => {
                        setText(next)
                        props.changeLevel?.(props.levelName || '', {modoverrides: next})
                        editorRef.current?.setValue(next)
                    }}
                />
            </Col>
        </Row>
    </>)
}

export default Modoverrides;
