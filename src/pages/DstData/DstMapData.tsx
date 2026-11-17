import {Button, Col, Image, message, Row, Space, Spin} from "antd";
import {ReloadOutlined} from '@ant-design/icons';
import { genDstMapApi } from "../../api/dstDataApi.ts";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { getLevelListApi } from "../../api/clusterLevelApi.jsx";
import { useEffect, useState } from "react";
import useIsMobile from "../../hooks/UseIsMobile";
import { useTranslation } from "react-i18next";
import i18next from "../../locales/i18n.tsx";
import { parse } from "lua-json";
import {Level} from "../../types";


type LevelDataOverride = {
    location?: string;
    overrides?: Record<string, string>;
};

function getLevelObject(value: string): LevelDataOverride {
    if (!value) return {};
    value = value.replace(/\n/g, "");
    try {
        return parse(value) as LevelDataOverride;
    } catch (error) {
        message.warning(i18next.t("level.warning.lua.error"));
        console.log(error);
        return {};
    }
}

export default () => {
    const { t } = useTranslation();
    const isMobile = useIsMobile();

    const [levels, setLevels] = useState<Level[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [generating, setGenerating] = useState(true);

    // 获取所有世界列表（使用 getLevelObject 解析 leveldataoverride）
    const fetchLevels = async () => {
        setGenerating(true);
        try {
            const resp = await getLevelListApi();
            if (resp.code === 200) {
                const newLevels: Level[] = resp.data.map((l: any) => {
                    // leveldataoverride 可能为空、"return {}" 等
                    const raw = (l.leveldataoverride && l.leveldataoverride.trim()) ? l.leveldataoverride : "";
                    let location: string = "forest"; // 默认 forest（和你之前逻辑一致）
                    try {
                        const parsed = getLevelObject(raw);
                        if (parsed && parsed.location) {
                            location = parsed.location;
                        } else {
                            // parsed 没有 location 时保持默认 forest（不依赖 uuid 判定）
                            // 如果你想在解析失败时根据 uuid 做兜底，可以在这里改成：
                            // location = l.uuid === "Caves" ? "cave" : "forest"
                        }
                    } catch (e) {
                        console.warn(`解析 leveldataoverride 失败: ${l.levelName}`, e);
                    }

                    return {
                        levelName: l.levelName,
                        uuid: l.uuid,
                        location: location as Level["location"],
                    };
                });

                setLevels(newLevels);
                // 打开页面即自动生成/刷新地图，保证预览总是可用（生成是增量的，已有图也会刷新）
                await Promise.all(newLevels.map(l => genDstMapApi(l.uuid).catch(() => null)))
                setImageUrls(newLevels.map(l => `/api/dst/map/image?levelName=${l.uuid}&t=${Date.now()}`));

            } else {
                message.error(t('dstData.map.fetchLevelsError'));
            }
        } catch (err) {
            console.error("获取世界列表失败", err);
            message.error(t('dstData.map.fetchLevelsError'));
        } finally {
            setGenerating(false);
        }
    };

    useEffect(() => {
        fetchLevels();
    }, []);

    // 刷新所有图片
    const refreshImage = () => {
        setImageUrls(levels.map(l => `/api/dst/map/image?levelName=${l.uuid}&t=${Date.now()}`));
    };

    // 生成所有地图
    const generateMaps = async () => {
        setGenerating(true);
        try {
            const results = await Promise.all(levels.map(l => genDstMapApi(l.uuid)));
            const failed = results.some((resp: { code: number }) => resp.code !== 200);
            if (failed) {
                message.warning(t('dstData.map.generateFailed'));
            } else {
                message.success(t('dstData.map.generateSuccess'));
                refreshImage();
            }
        } catch (err) {
            console.error("生成地图失败", err);
            message.error(t('dstData.map.generateError'));
        } finally {
            setGenerating(false);
        }
    };

    const box = isMobile ? 300 : 502;
    const loadingBox = (
        <div style={{width: box, height: box, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto"}}>
            <Spin size="large"/>
        </div>
    );

    return (
        <>
            <div>
                <Space size={24} wrap>
                    <Button icon={<ReloadOutlined/>} type="primary" onClick={generateMaps}>
                        {t('backup.refresh')}
                    </Button>
                </Space>
            </div>
            <br />
            <Row gutter={[16, 16]}>
                {levels.map((l, idx) => (
                    <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                    <div key={l.uuid} style={{ textAlign: "center" }}>
                        {(generating || !imageUrls[idx]) ? loadingBox : (
                            <Image
                                width={box}
                                height={box}
                                src={imageUrls[idx]}
                                placeholder={loadingBox}
                            />
                        )}
                        <div style={{marginTop: 8, fontSize: 15, fontWeight: 600}}>{l.levelName}</div>
                    </div>
                    </Col>
                ))}
            </Row>
        </>
    );
};
