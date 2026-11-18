import {useEffect, useRef, useState} from "react";
import {SplitSkeleton} from '../../components/Skeletons.jsx';
import {useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {message, Skeleton, Tabs} from "antd";
import {parse} from "lua-json";

import {getMyModInfoList, getModInfo} from "../../api/modApi.jsx";
import ModList from "./ModList/index.jsx";

import Workshop from "./Workshop/index.jsx";
import {useLevelsStore} from "../../store/useLevelsStore";
import {useModPreferences} from "../../hooks/useModPreferences";


export default () => {

    const {cluster} = useParams()
    const { t, i18n } = useTranslation()

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('1')

    // 模组列表展示数据
    const [modList, setmodList] = useState([])
    const [modDataList, setModDataList] = useState([])
    // 模组默认的配置项 Module default configuration items
    const defaultConfigOptionsRef = useRef(new Map())
    // 模组配置项
    const modConfigOptionsRef = useRef({})

    const {getAllPreferences, applyPreference} = useModPreferences()

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const modInfoListResp = await getMyModInfoList(cluster)
            if (modInfoListResp.code !== 200) {
                message.warning(t('mod.fetch.error'))
                return
            }
            let modList = modInfoListResp.data
            if (modList === null) {
                modList = []
            }
            // 后端 mod_infos 可能存在同 modid 重复行（并发写入遗留），入口即去重
            modList = modList.filter((m, i, arr) => arr.findIndex(x => x.modid === m.modid) === i)
            setmodList([...modList])
            setModDataList([...modList])
            // modInfoListResp.data
            const loadedLevels = await reFlushLevels(cluster)
            const defaultLevel = findDefaultLevel(loadedLevels)
            if (defaultLevel) {
                await initModConfigList(defaultLevel.modoverrides, modList, setmodList, defaultConfigOptionsRef, modConfigOptionsRef)
            } else {
                setmodList([])
            }
            setLoading(false)
        }
        fetchData()

    }, [])

    const levels = useLevelsStore((state) => state.levels)
    const reFlushLevels = useLevelsStore((state) => state.reFlushLevels)

    function findDefaultLevel(levelList) {
        if (!Array.isArray(levelList) || levelList.length === 0) {
            return null
        }
        return levelList.find(level => level.uuid === 'Master') || levelList[0]
    }


    async function initModConfigList(modoverrides, subscribeModList, setModList, defaultConfigOptionsRef, modConfigOptionsRef) {
        const workshopMap = parseModoverrides(modoverrides);
        //console.log("workshopMap", workshopMap)

        // subscribeModList.push({
        //     mod_config: {
        //         author: "kelei",
        //         description: "禁用本地所有模组，tips: 这个只是个虚拟的模组，只是兼容了下。如果不知道是干什么用的请不要开启！！！ 不支持自定禁用某些模组 \n\n 请勿乱点！！！\n\n 如果要删除，对应模组配置里面的 client_mods_disabled = {\n" +
        //             "    configuration_options = {},\n" +
        //             "    enabled = true,\n" +
        //             "  },",
        //         name: "client_mods_disabled",
        //         configuration_options: []
        //     },
        //     enable: false,
        //     update: false,
        //     modid: "client_mods_disabled",
        //     installed: true,
        //     name: "client_mods_disabled",
        //     img: "https://steamuserimages-a.akamaihd.net/ugc/1829046490069435373/B2073D1E5B13DA00D29D316FC946C154C0854146/?imw=64&imh=64&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=true"
        //
        // })
        const modOptions = {}
        const visibleModList = []
        const subscribeModMap = new Map()
        subscribeModList.forEach(mod => {
            const {modid} = mod
            subscribeModMap.set(modid, mod)
            const options = mod.mod_config?.configuration_options
            if (typeof options === 'object' && options !== undefined && options !== null) {
                const defaultOptions = {}
                options?.forEach((item) => {
                    if (item.default !== '' && item.name !== "null" && item.name !== undefined) {
                        defaultOptions[item.name] = item.default
                    }
                })
                modOptions[modid] = defaultOptions
            }
            if (workshopMap.has(modid)) {
                mod.enable = true
                mod.installed = true
                visibleModList.push(mod)
            }
        });

        // 一次性获取所有模组的偏好配置
        const allPreferences = await getAllPreferences()

        if (allPreferences) {
            // 遍历所有模组，仅对未启用的模组应用已保存的偏好配置
            subscribeModList.forEach((mod) => {
                const {modid} = mod

                // 只有模组未启用时，才应用保存的偏好配置
                // 已启用的模组使用 workshopMap 中当前的配置（即实际生效的配置）
                if (!mod.enable) {
                    const defaultConfig = modOptions[modid] || {}
                    const savedPreference = allPreferences[modid]

                    if (savedPreference) {
                        // 智能合并：保留新增的配置项，同时应用已保存的偏好
                        const mergedConfig = applyPreference(modid, defaultConfig, savedPreference)
                        workshopMap.set(modid, mergedConfig)
                    }
                }
            })
        }

        // 如果当前世界的 modoverrides 中有未订阅/未安装的 mod，仍显示出来用于编辑或删除。
        workshopMap.forEach((value, key) => {
            if (subscribeModMap.get(key) === undefined) {
                console.log("not subscribe mod: ", key)
                visibleModList.push({
                    mod_config: {
                        author: "unknown",
                        name: "unknown"
                    },
                    name: "",
                    update: false,
                    modid: key,
                    installed: false,
                    enable: true
                })
            }
        });

        visibleModList.sort((a, b) => {
            if (a.enable === b.enable) {
                return 0;
            }
            if (a.enable) {
                return -1; // a在前
            }
            return 1; // b在前
        });

        setModList(visibleModList || [])
        defaultConfigOptionsRef.current = workshopMap
        modConfigOptionsRef.current = modOptions

        // 补全元数据：mods 目录下载/游戏自动下载的模组没有订阅记录，名字/图标缺失。
        // 异步拉取 Steam 元数据填充(顺带入库自愈，下次加载直接有)，不阻塞列表显示。
        // 按 modid 去重请求（同 modid 只请求一次，避免并发重复请求后端在写库竞态中插出重复行）；
        // 完成后基于“当前列表”合并并生成新对象：不覆盖用户等待期间的操作，且新引用能触发 ModItem 刷新本地 state。
        const needMetaIds = [...new Set(visibleModList
            .filter(m => !(m.name && m.img && m.img !== 'xxx'))
            .map(m => m.modid))]
        const metaMap = {}
        Promise.all(needMetaIds.map(async (modid) => {
            try {
                const resp = await getModInfo(i18n.language || 'zh', '', modid)
                if (resp && resp.code === 200 && resp.data) {
                    metaMap[modid] = resp.data
                }
            } catch (e) {
                // 元数据补全失败不影响列表
            }
        })).then(() => setModList(cur => cur.map(item => {
            const next = {...item}
            const meta = metaMap[item.modid]
            if (!meta) return next
            if (!next.name && meta.name) next.name = meta.name
            if ((!next.img || next.img === 'xxx') && meta.img) next.img = meta.img
            if (next.mod_config && next.mod_config.author === 'unknown' && (meta.auth || meta.mod_config?.author)) {
                next.mod_config = {
                    ...next.mod_config,
                    author: meta.mod_config?.author || meta.auth,
                    name: meta.name || next.mod_config.name,
                }
            }
            return next
        })))
    }

    function parseModoverrides(modoverrides) {
        console.log(modoverrides)
        try {
            const result = parse(modoverrides);
            const keys = Object.keys(result)
            const workshopMap = new Map();
            keys.forEach(workshopId => {
                workshopMap.set(workshopId.replace('workshop-', '').replace('"', '').replace('"', ''), {...result[workshopId].configuration_options})
            })
            console.log("modoverrides 解析对象", workshopMap)
            return workshopMap
        } catch (error) {
            return new Map()
        }
    }


    const items = [
        {
            key: '1',
            label: t('mod.Setting'),
            children: <ModList modList={modList} setModList={setmodList}
                               defaultConfigOptionsRef={defaultConfigOptionsRef}
                               modConfigOptionsRef={modConfigOptionsRef}
            />,
        },
        {
            key: '2',
            label: t('mod.Subscribe'),
            children: <Workshop addModList={setmodList} onAdded={() => setActiveTab('1')}/>,
        },
    ];

    return (
        <>
            {loading ? <SplitSkeleton leftRows={8} rightRows={6}/> : (<>                <Tabs activeKey={activeTab} items={items} onChange={(key) => {
                    setActiveTab(key)
                }}/>
            </>) }
        </>
    )
}