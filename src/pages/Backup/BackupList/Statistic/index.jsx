import {useState} from 'react';
import {StatisticCard} from '@ant-design/pro-components';
import RcResizeObserver from 'rc-resize-observer';
import {useTranslation} from "react-i18next";

import './index.css';

const {Divider} = StatisticCard;

// eslint-disable-next-line react/prop-types
const BackupStatistic = ({size, data}) => {
    const {t} = useTranslation()
    const [responsive, setResponsive] = useState(false);

    return (
        <>
            <RcResizeObserver key="resize-observer" onResize={(offset) => {
                setResponsive(offset.width < 596);
            }}>
                <StatisticCard.Group
                    // className={theme === 'dark' ? 'dark' : ''}
                    direction={responsive ? 'column' : 'row'}>
                    <StatisticCard
                        statistic={{
                            title: t('backup.backup.number'),
                            value: size,
                        }}/>
                    <Divider type={responsive ? 'horizontal' : 'vertical'}/>
                    <StatisticCard statistic={{
                        title: t('backup.backup.size'),
                        // 备份大小统一保留两位小数（data 单位为 GB，<1GB 转 MB 展示）
                        value: data > 1
                            ? `${Number(data).toFixed(2)} GB`
                            : `${(Number(data) * 1024).toFixed(2)} MB`,
                    }}
                    />
                </StatisticCard.Group>
            </RcResizeObserver>
        </>
    )
}

export default BackupStatistic