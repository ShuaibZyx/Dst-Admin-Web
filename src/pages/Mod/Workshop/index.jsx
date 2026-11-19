/* eslint-disable react/prop-types */
import {useEffect, useState} from 'react';
import {Skeleton, Row, Col, Card, Input, Pagination, Button, message, Empty, Space, Spin} from 'antd';
import {StarFilled, HeartFilled, CloudDownloadOutlined, SearchOutlined, PlusOutlined} from '@ant-design/icons';
import {useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";

import {addSubscriptionApi, searchMod} from '../../../api/modApi.jsx';
import {format} from "../../../utils/dateUitls";
import {fShortenNumber} from "../../../utils/formatNumber";
import {GridSkeleton} from "../../../components/Skeletons.jsx";


const {Search} = Input;
const {Meta} = Card;

const extractAuthorId = (authorUrl) => {
    if (!authorUrl) return '';
    const match = authorUrl.match(/profiles\/(\d+)/);
    return match ? match[1] : '';
};

const badgeStyle = {
    background: 'rgba(0, 0, 0, 0.65)',
    color: '#fff',
    borderRadius: 4,
    padding: '1px 6px',
    fontSize: '12px',
    lineHeight: '18px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
}

const ModCard2 = ({modinfo, addModList, subscribe}) => {

    const { t } = useTranslation()

    const [loading, setLoading] = useState(false)
    const workshopUrl = `https://steamcommunity.com/sharedfiles/filedetails/?id=${modinfo.id}`
    const openWorkshop = () => window.open(workshopUrl, '_blank', 'noopener,noreferrer')
    const authorId = extractAuthorId(modinfo.author);
    const authorText = authorId || modinfo.author || '-'
    const favoriteCount = modinfo?.vote?.num ?? modinfo?.favorited ?? modinfo?.favorite ?? 0

    return (
        <Card
            key={modinfo.id}
            hoverable
            onClick={openWorkshop}
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
            }}
            cover={<div style={{padding: '12px 12px 0 12px', position: 'relative'}}>
                <a
                    target={'_blank'}
                    href={workshopUrl}
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}>
                    <img alt="example" style={{
                        height: 160,
                        objectFit: 'cover',
                        width: '100%'
                    }} src={modinfo.img} onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160"%3E%3Crect fill="%23f0f0f0" width="160" height="160"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}/>
                </a>
                <div style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 4,
                }}>
                    {modinfo.vote && (
                        <span style={badgeStyle}>
                            <StarFilled style={{color: '#faad14', fontSize: '12px'}}/>
                            {modinfo.vote.star} ({fShortenNumber(modinfo.vote.num)})
                        </span>
                    )}
                    <span style={badgeStyle}><HeartFilled style={{color: '#ff7875', fontSize: '12px'}}/> {fShortenNumber(favoriteCount)}</span>
                </div>
            </div>}
        >
            <Meta
                title={<div style={{
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>{modinfo.name}</div>}
                style={{marginBottom: 8}}
            />

            <div style={{
                fontSize: '12px',
                color: '#999',
                marginBottom: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}>
                {t('mod.author')}: {authorText}
            </div>

            <div style={{
                fontSize: '12px',
                color: '#999',
                marginBottom: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
            }}>
                <span>{t('mod.subscriptions')}: {fShortenNumber(modinfo.sub)}</span>
                <span>{format(modinfo.time * 1000)}</span>
            </div>

            <div style={{marginTop: 'auto'}}>
                <Button icon={<CloudDownloadOutlined/>}
                    loading={loading}
                    type="primary"
                    size={'small'}
                    block
                    onClick={(event) => {
                        event.stopPropagation()
                        subscribe(modinfo.id, modinfo.name, addModList, setLoading)
                    }}
                >
                    {t('mod.subscribe')}
                </Button>
            </div>
        </Card>
    )
}

export default ({addModList, onAdded}) => {

    const { t } = useTranslation()
    const { i18n } = useTranslation();
    const lang = i18n.language;

    const [modList, setModList] = useState([])
    const [pageSize, setPageSize] = useState(20)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [text, setText] = useState("")
    const [searching, setSearching] = useState(true)

    const [messageApi, contextHolder] = message.useMessage();
    const {cluster} = useParams()

    useEffect(() => {
        updateModList("", page, pageSize)
    }, [])

    const subscribe = (modId, modName, addModList, setLoading) => {
        messageApi.open({
            type: 'loading',
            content: `${t('mod.subscribing')} ${modName}`,
            duration: 0,
        });
        setLoading(true)
        // message.info(`正在订阅 ${modName}`)
        // 订阅 = 加入「我的订阅」库（不直接下载到模组设置）
        addSubscriptionApi(modId).then(data => {
            setTimeout(messageApi.destroy, 1);
            if (data.code === 200) {
                message.success(`${t('mod.subscribe.ok')} ${modName}`)
                if (onAdded) onAdded()
            } else {
                message.warning(`${t('mod.subscribe.error')} ${modName}`)
            }
            setLoading(false)
        }).catch(error => {
            setTimeout(messageApi.destroy, 1);
            message.warning(`${t('mod.subscribe.error')} ${modName}`)
            setLoading(false)
            console.log(error)
        })
    }

    const updateModList = (text, page, pageSize) => {
        setSearching(true)
        searchMod(lang, cluster, text, page, pageSize).then(data => {
            setModList(data.data.data)
            setPage(data.data.page)
            setPageSize(data.data.size)
            setTotal(data.data.total)
        }).catch(error => {
            console.log(error)
        }).finally(() => {
            setSearching(false)
        })
    }

    const onSearch = (text) => {
        setText(text)
        updateModList(text, 1, pageSize)
    }

    // 按 ID 添加：中文名搜不到时的可靠入口
    const [adding, setAdding] = useState(false)
    const addById = (value) => {
        const raw = (value || '').trim()
        // 支持粘贴创意工坊网址（自动取 id=）或纯数字 ID
        const m = raw.match(/id=(\d+)/) || raw.match(/^(\d+)$/)
        if (!m) {
            message.warning(t('mod.addById.invalid'))
            return
        }
        subscribe(m[1], m[1], addModList, setAdding)
    }

    const onShowSizeChange = (current, pageSize) => {
        setPageSize(pageSize)
        updateModList(text, current, pageSize)
    }

    const onChange = (page) => {
        updateModList(text, page, pageSize)
    }

    return (
        <>
            {contextHolder}

            <div style={{display: 'flex', gap: 12, marginBottom: 24}}>
                <Search
                    placeholder={t('mod.search.placeholder')}
                    allowClear
                    enterButton={<Button type="primary" icon={<SearchOutlined/>}>{t('mod.search.button')}</Button>}
                    loading={searching}
                    onSearch={onSearch}
                    style={{flex: 1}}
                />
                <Search
                    placeholder={t('mod.addById.placeholder')}
                    allowClear
                    enterButton={<Button type="primary" icon={<PlusOutlined/>}>{t('mod.addById.button')}</Button>}
                    loading={adding}
                    onSearch={addById}
                    style={{flex: 1}}
                />
            </div>

            {searching ? <GridSkeleton panels={3} rows={2} banner={false}/> : (<>
                {modList.length === 0 && !searching ? (
                    <Empty
                        description={t('mod.empty')}
                        style={{marginTop: '100px'}}
                    />
                ) : (
                    <>
                        <Row gutter={[16, 16]}>
                            {modList.map(modinfo => (
                                <Col key={modinfo.id} xs={24} sm={8} md={8} lg={4} xl={4}>
                                    <ModCard2 modinfo={modinfo} addModList={addModList} subscribe={subscribe}/>
                                </Col>
                            ))}
                        </Row>

                        {modList.length > 0 && (
                            <Pagination
                                onShowSizeChange={onShowSizeChange}
                                current={page}
                                pageSize={pageSize}
                                pageSizeOptions={['10', '20', '50', '100']}
                                showSizeChanger
                                showQuickJumper
                                onChange={onChange}
                                total={total}
                                style={{marginTop: '32px', marginBottom: '24px'}}
                            />
                        )}
                    </>
                )}
            </>)}
        </>
    );
};
