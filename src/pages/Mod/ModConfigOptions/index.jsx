import {useEffect, useState} from "react";
import {Space, Tag} from "antd";
import {useTranslation} from "react-i18next";
import {useParams} from "react-router-dom";

import {http} from "../../../utils/http";
import {timestampToString} from "../../../utils/dateUitls";
import {renderBb} from "../../../utils/bbCode.jsx";

const ModInfo = ({mod}) => {
    const {t} = useTranslation()
    const {cluster} = useParams()
    // 简介/徽标取数与「我的订阅」详情同源：同一次订阅详情请求拿 workshop.description 与 enabledWorlds 等
    const [detail, setDetail] = useState(null)
    useEffect(() => {
        setDetail(null)
        if (!mod?.modid) return
        http.get(`/api/mod/subscription/detail/${mod.modid}`, {headers: {Cluster: cluster || ''}})
            .then(r => setDetail(r.data?.data || {}))
            .catch(() => setDetail({}))
    }, [mod?.modid, cluster])

    const desc = detail?.workshop?.description || mod?.mod_config?.description
    const compatTags = [mod?.mod_config?.client_only_mod ? t('mod.mySubs.compatClientOnly') : null].filter(Boolean)
    return (
        <>
            <Space size={16} wrap>
                {mod?.img ? <img alt={mod?.name || mod?.modid || ''} src={mod.img}/> :
                    <div style={{width: 64, height: 64, borderRadius: 8, background: 'rgba(128,128,128,0.2)'}}/>}
                {/* 原排版的三行两列配对（标题↔版本、工坊↔最后更新、作者↔兼容）：
                    显式占位成对齐网格，标题行更高也不会把左右两列顶错位 */}
                <div style={{display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 16, alignItems: 'baseline', rowGap: 2}}>
                    {/* 模组名用主题金与后续元信息区分 */}
                    <span style={{fontSize: '16px', fontWeight: 500, color: '#E8C46A'}}>{mod?.name ? mod.name.slice(0, 20) : mod?.modid}</span>
                    <span>{mod?.mod_config?.version ? `${t('mod.version')}: ${mod.mod_config.version}` : ''}</span>
                    <span>{t('mod.modid')}:{mod?.modid}</span>
                    <span>{Number.isFinite(mod?.last_time) && mod.last_time > 0 ? `${t('mod.lasttime')}: ${timestampToString(mod.last_time * 1000)}` : ''}</span>
                    <span>{mod?.mod_config?.author && mod.mod_config.author !== 'unknown' ? `${t('mod.author')}: ${mod.mod_config.author.slice(0, 20)}` : ''}</span>
                    <span>{mod?.mod_config?.dont_starve_compatible === true ? t('mod.dst.compatible') : ''}</span>
                </div>
            </Space>
            {/* 状态徽标（同我的订阅详情）：可更新 / 启用世界（Master / Caves / …）/ 仅客户端 */}
            {(detail?.hasUpdate || (detail?.enabledWorlds || []).length > 0 || compatTags.length > 0) && (
                <div style={{marginTop: 12, display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                    {detail?.hasUpdate && <Tag color="orange">{t('mod.mySubs.hasUpdate')}</Tag>}
                    {(detail?.enabledWorlds || []).length > 0 && (
                        <Tag color="cyan">{detail.enabledWorlds.join(' / ')}</Tag>
                    )}
                    {compatTags.map(x => <Tag color="geekblue" key={x}>{x}</Tag>)}
                </div>
            )}
            <br/><br/>
            {/* 简介样式同步自我的订阅详情：BBCode 渲染 + pre-wrap 排版（滚动由外层 56vh 容器负责，不再内滚） */}
            <div style={{whiteSpace: 'pre-wrap', lineHeight: 1.7}}>
                {desc && renderBb(desc)}
            </div>
        </>
    )
}

// 右侧模组详情面板：仅展示信息与创意工坊入口；「选项/更新」操作在列表条目上
export default ({mod}) => {
    const {t} = useTranslation()

    return (
        <>
            {!mod.installed && <>
                <span>{t('mod.notInstalled')}</span>
            </>
            }

            {(mod.installed && mod.modid === null || mod.modid === undefined) ? (
                <span>{t('mod.choose.please')}</span>
            ) : (
                <>
                    <div
                        style={{
                            height: '56vh',
                            overflowY: 'auto',
                            overflowX: 'auto',
                        }}
                    >
                        <ModInfo mod={mod}/>
                    </div>


                </>
            )}
        </>
    )
}
