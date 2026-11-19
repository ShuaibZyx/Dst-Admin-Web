import {Card, Col, Row, Skeleton} from 'antd';

// 排版匹配骨架：与真实页面同构（卡片网格/表格/表单），消除加载→内容的突变

// 卡片网格骨架（如面板总览：通栏卡 + 多列卡片）
export const GridSkeleton = ({panels = 4, rows = 5, banner = true}) => (
    <div>
        {banner && (
            <Card size="small" style={{marginBottom: 16}}>
                <Skeleton active title={false} paragraph={{rows: 1, width: ['40%', '65%', '55%']}}/>
            </Card>
        )}
        <Row gutter={[16, 16]}>
            {Array.from({length: panels}).map((_, i) => (
                <Col key={i} xs={24} md={i % 2 === 0 ? 10 : 14}>
                    <Card><Skeleton active title paragraph={{rows}}/></Card>
                </Col>
            ))}
        </Row>
    </div>
)

// 表格骨架（如备份列表/玩家日志/大厅列表/名单）
export const TableSkeleton = ({title = true, rows = 6, cols = 4}) => (
    <Card>
        {title && <Skeleton active title style={{width: 220, marginBottom: 16}} paragraph={false}/>}
        <Skeleton active title={false} paragraph={{rows: 1, width: Array(cols).fill('18%')}}/>
        <div style={{marginTop: 12}}>
            {Array.from({length: rows}).map((_, i) => (
                <Skeleton key={i} active title={false} paragraph={{rows: 1, width: Array(cols).fill('18%')}}/>
            ))}
        </div>
    </Card>
)

// 表单骨架（如房间设置/系统设置/个人信息）
export const FormSkeleton = ({fields = 5, title = true}) => (
    <Card>
        {title && <Skeleton active title style={{width: 180, marginBottom: 20}} paragraph={false}/>}
        {Array.from({length: fields}).map((_, i) => (
            <div key={i} style={{marginBottom: 20}}>
                <Skeleton active title={false} paragraph={{rows: 1, width: ['15%']}}/>
                <Skeleton active title={false} paragraph={{rows: 1, width: ['55%']}}/>
            </div>
        ))}
    </Card>
)

// 双栏骨架（如模组设置：列表 + 详情）
export const SplitSkeleton = ({leftRows = 8, rightRows = 6}) => (
    <Row gutter={[16, 16]}>
        <Col xs={24} md={10}>
            <Card><Skeleton active title paragraph={{rows: leftRows}}/></Card>
        </Col>
        <Col xs={24} md={14}>
            <Card><Skeleton active title paragraph={{rows: rightRows}}/></Card>
        </Col>
    </Row>
)

// ===== 页面/Tab 针对性骨架（与真实布局同构）=====

// OS 系统信息：五值横排（面板/内存/CPU/磁盘/显存）
export const OSSkeleton = () => (
    <Row gutter={[8, 8]}>
        {Array.from({length: 5}).map((_, i) => (
            <Col key={i} flex="1">
                <Card size="small">
                    <Skeleton active title={false} paragraph={{rows: 2, width: ['60%', '90%']}}/>
                </Card>
            </Col>
        ))}
    </Row>
)

// 世界列表：每世界一张卡（图标+名称 Tag+内存行+操作按钮）
export const WorldListSkeleton = ({items = 4}) => (
    <Card>
        <Skeleton active title style={{width: 160, marginBottom: 12}} paragraph={false}/>
        {Array.from({length: items}).map((_, i) => (
            <Card key={i} size="small" style={{marginBottom: 8}}>
                <Skeleton active title={false} paragraph={{rows: 2, width: ['30%', '55%']}}/>
            </Card>
        ))}
    </Card>
)

// 服务器日志：说明行 + 进度条 + 日志黑块 + 指令输入 + 按钮行
export const ServerLogSkeleton = () => (
    <Card>
        <Skeleton active title style={{width: 140, marginBottom: 12}} paragraph={false}/>
        <Skeleton active title={false} paragraph={{rows: 1, width: ['100%']}}/>
        <div style={{height: 304, background: 'rgba(128,128,128,0.08)', borderRadius: 6, margin: '12px 0'}}/>
        <Skeleton active title={false} paragraph={{rows: 1, width: ['100%']}}/>
        <div style={{display: 'flex', gap: 8, marginTop: 12}}>
            {[64, 64, 64].map((w, i) => (
                <Skeleton key={i} active title={false} paragraph={{rows: 1, width: [`${w}px`]}}/>
            ))}
        </div>
    </Card>
)

// 玩家列表：下拉+按钮工具栏 + 表格
export const PlayersSkeleton = () => (
    <Card>
        <Skeleton active title style={{width: 140, marginBottom: 12}} paragraph={false}/>
        <div style={{display: 'flex', gap: 8, marginBottom: 12}}>
            <Skeleton active title={false} paragraph={{rows: 1, width: ['180px']}}/>
            <Skeleton active title={false} paragraph={{rows: 1, width: ['100px']}}/>
        </div>
        {Array.from({length: 4}).map((_, i) => (
            <Skeleton key={i} active title={false} paragraph={{rows: 1, width: ['25%', '35%', '20%', '15%']}}/>
        ))}
    </Card>
)

// 模组设置：左列表 + 右详情
export const ModSplitSkeleton = () => (
    <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
            <Card>
                <Skeleton active title style={{width: 120}} paragraph={false}/>
                {Array.from({length: 8}).map((_, i) => (
                    <Skeleton key={i} active title={false} paragraph={{rows: 1, width: ['85%']}}/>
                ))}
            </Card>
        </Col>
        <Col xs={24} md={16}>
            <Card>
                <Skeleton active title style={{width: 200}} paragraph={{rows: 2}}/>
                <div style={{height: 12}}/>
                <Skeleton active title={false} paragraph={{rows: 6}}/>
            </Card>
        </Col>
    </Row>
)

// 世界设置：左世界竖列 + 页签条 + 图标选项网格 + 底栏按钮（与真实排布同构）
export const LevelEditorSkeleton = () => (
    <Card>
        <div style={{display: 'flex', gap: 16}}>
            <div style={{width: 240, flex: 'none'}}>
                {Array.from({length: 4}).map((_, i) => (
                    <Skeleton key={i} active title={false}
                              paragraph={{rows: 1, width: [`${55 + (i % 2) * 20}%`]}}/>
                ))}
            </div>
            <div style={{flex: 1, minWidth: 0}}>
                <Skeleton active title={false} paragraph={{rows: 1, width: ['45%']}}/>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16}}>
                    {Array.from({length: 12}).map((_, i) => (
                        <div key={i} style={{width: 118}}>
                            <Skeleton.Avatar active shape="square" size={64}/>
                            <Skeleton active title={false} paragraph={{rows: 1, width: ['70%']}}/>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        <div style={{display: 'flex', gap: 8, marginTop: 16}}>
            <Skeleton.Input active size="small" style={{width: 88}}/>
            <Skeleton.Input active size="small" style={{width: 88}}/>
            <Skeleton.Input active size="small" style={{width: 88}}/>
        </div>
    </Card>
)

// 行列表骨架（如添加模组弹窗：勾选框 + 图标 + 文本行）；行高压紧至 ~32px，贴近真实行观感
export const ListSkeleton = ({rows = 6}) => (
    <div>
        {Array.from({length: rows}).map((_, i) => (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px'}}>
                <Skeleton.Avatar active shape="square" size={14}/>
                <Skeleton.Avatar active shape="square" size={28}/>
                <Skeleton.Input active size="small" style={{width: `${40 + (i % 3) * 12}%`, height: 12}}/>
            </div>
        ))}
    </div>
)

// 详情抽屉骨架（头像+元信息 → 状态徽标行 → 页签条 → 正文段，与抽屉排布同构）
export const DetailSkeleton = () => (
    <div>
        <Skeleton active avatar title paragraph={{rows: 2, width: ['60%', '45%']}}/>
        <div style={{display: 'flex', gap: 8, margin: '12px 0'}}>
            <Skeleton.Input active size="small" style={{width: 90}}/>
            <Skeleton.Input active size="small" style={{width: 120}}/>
        </div>
        <Skeleton active title={false} paragraph={{rows: 1, width: ['30%']}}/>
        <Skeleton active title={false} paragraph={{rows: 5}}/>
    </div>
)
