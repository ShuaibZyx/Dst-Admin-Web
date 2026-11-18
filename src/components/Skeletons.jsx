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
