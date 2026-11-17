import {Space} from "antd";
import {useTranslation} from "react-i18next";

import {timestampToString} from "../../../utils/dateUitls";

const ModInfo = ({mod}) => {
    const {t} = useTranslation()
    return (
        <>
            <Space size={16} wrap>
                {mod?.img ? <img alt={mod?.name || mod?.modid || ''} src={mod.img}/> :
                    <div style={{width: 64, height: 64, borderRadius: 8, background: 'rgba(128,128,128,0.2)'}}/>}
                <div>
                    <span style={{
                        fontSize: '16px',
                        fontWeight: 500
                    }}>
                        {mod?.name ? mod.name.slice(0, 20) : mod?.modid}
                    </span>
                    <br/>
                    <span>{t('mod.modid')}:{mod?.modid}</span>
                    {mod?.mod_config?.author && mod.mod_config.author !== 'unknown' && <>
                        <br/>
                        <span>{t('mod.author')}: {mod.mod_config.author.slice(0, 20)}</span>
                    </>}
                </div>
                <div>
                    {mod?.mod_config?.version && <span>{t('mod.version')}: {mod.mod_config.version}</span>}
                    {Number.isFinite(mod?.last_time) && mod.last_time > 0 && <div>{t('mod.lasttime')}: {timestampToString(mod.last_time * 1000)}</div>}
                    <span>{mod?.mod_config?.dont_starve_compatible === true && <span>{t('mod.dst.compatible')}</span>}</span>
                    <span>{mod?.mod_config?.dont_starve_compatible === false && <span>-</span>}</span>
                </div>
            </Space>
            <br/><br/>
            <div>
                <span>
                    {mod?.mod_config?.description}
                </span>
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
