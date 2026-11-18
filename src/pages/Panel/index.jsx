import React, {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Alert, Card, Col, Row, Skeleton, Tabs} from 'antd';
import {OSSkeleton, WorldListSkeleton, ServerLogSkeleton, PlayersSkeleton} from '../../components/Skeletons.jsx';
import {useLevelsStore} from "../../store/useLevelsStore.tsx";
import {getLevelStatusApi} from "../../api/level.jsx";
import {getClusters} from "../../api/dstConfigApi.jsx";
import GameOperator from "./GameOperator/index.jsx";
import RemoteControl from "./RemoteControl/index.jsx";
import {useParams} from "react-router-dom";
import RenderCustomCommands from "../CustomCommands/RenderCustomCommands.tsx";

const Panel = () => {

    const { t } = useTranslation()
    const { cluster, name } = useParams()
    const setLevels = useLevelsStore((state) => state.setLevels)
    const [loading, setLoading] = useState(true)

    // 无存档（未创建/导入）时面板功能不可用：拉一次存档列表判定
    const [hasCluster, setHasCluster] = useState(true)
    useEffect(() => {
        getClusters().then(resp => {
            const list = Array.isArray(resp) ? resp : (resp?.clusters || resp?.data?.clusters || [])
            setHasCluster(list.length > 0)
        }).catch(() => {})
    }, [])

    useEffect(()=>{
        // 静默刷新:切档时不再打回 Skeleton(闪屏),旧内容保留到新数据就绪
        getLevelStatusApi()
            .then(resp => {
                if (resp.code === 200) {
                    const levels = resp.data
                    const items = []
                    levels.forEach(level=>{
                        const item = {
                            key: level.uuid,
                            uuid: level.uuid,
                            levelName: level.levelName,
                            location: t('level.unknown'),
                            ps: level.ps,
                            Ps: level.Ps,
                            status: level.status,
                        }
                        items.push(item)
                    })
                    setLevels(items)
                }
                setLoading(false)
            })
    }, [cluster, name])

    const items = [
        {
            key: '1',
            label: t('panel.panel'),
            children: <GameOperator/>
        },
        {
            key: '2',
            label: t('panel.remote'),
            children: <RemoteControl/>,
        },
        {
            key: '3',
            label: t('panel.customCommands'),
            children: <RenderCustomCommands />,
        },
    ];

    // 存档切换器已迁移至服务器信息卡第一行(GameArchive)

    if (!hasCluster) {
        return (
            <Alert
                type="warning"
                showIcon
                message={t('panel.noCluster.title')}
                description={t('panel.noCluster.desc')}
            />
        )
    }

    // 面板总览针对性骨架：OS 五值条 + 世界卡 + 日志卡 + 玩家卡（与 GameOperator 同构）
    const PanelSkeleton = () => (
        <div>
            <OSSkeleton/>
            <Row gutter={[16, 16]} style={{marginTop: 16}}>
                <Col xs={24} md={10}><WorldListSkeleton items={4}/></Col>
                <Col xs={24} md={14}><ServerLogSkeleton/></Col>
                <Col xs={24} md={10}><Card><Skeleton active title paragraph={{rows: 5}}/></Card></Col>
                <Col xs={24} md={14}><PlayersSkeleton/></Col>
            </Row>
        </div>
    )

    return (
        <>
            {loading ? <PanelSkeleton/> : <Tabs items={items}/>}
        </>
    )
};

export default Panel