/* eslint-disable react/prop-types */
import {StatisticCard} from '@ant-design/pro-components';
import RcResizeObserver from 'rc-resize-observer';
import {useState} from 'react';
import {Progress, Tooltip} from 'antd';
import {useTranslation} from "react-i18next";
import {useLiveStream} from "../../../hooks/useLiveStream.js";

function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function formatData(data, num) {
    return toNumber(data).toFixed(num)
}

function roundTo(value, digits = 1) {
    const factor = 10 ** digits;
    return Math.round(toNumber(value) * factor) / factor;
}

function bytesToGB(bytes) {
    return toNumber(bytes) / 1024 / 1024 / 1024;
}

function clampPercent(value) {
    const num = toNumber(value);
    return Math.max(0, Math.min(100, num));
}

const {Statistic} = StatisticCard;

// 精简系统描述：如 "Windows 11 · x86_64"、"ubuntu · x86_64"
function compactOs(host) {
    const arch = host?.kernelArch || ''
    let platform = (host?.platform || '').replace(/^Microsoft\s+/i, '')
    platform = platform.replace(/\s+(Pro for Workstations|Pro|Enterprise|Education|Home|S|N|Standard|Datacenter|Server).*$/i, '')
    let name = platform || host?.os || '--'
    // os 分支也要去掉版本后缀（Windows 11 Pro for Workstations → Windows 11）
    name = name.replace(/\s+(Pro for Workstations|Pro|Enterprise|Education|Home|S|N|Standard|Datacenter|Server).*$/i, '')
    if (name === (host?.os || '') && name) {
        name = name.charAt(0).toUpperCase() + name.slice(1)
    }
    return arch ? `${name} · ${arch}` : name
}

export default () => {

    const {t} = useTranslation()
    const [responsive, setResponsive] = useState(false);
    const [systeminfo, setSysteminfo] = useState(null)
    const [loadError, setLoadError] = useState('')

    const hasSystemInfo = Boolean(systeminfo)
    const cpuUsedPercent = roundTo(clampPercent(systeminfo?.cpu?.cpuUsedPercent), 1);
    const cpuPercent = Array.isArray(systeminfo?.cpu?.cpuPercent) ? systeminfo.cpu.cpuPercent : []
    const cpuCores = systeminfo?.cpu?.cores ?? '--'
    const memTotalGB = bytesToGB(systeminfo?.mem?.total);
    const memUsedPercent = roundTo(clampPercent(systeminfo?.mem?.usedPercent), 1);
    const memUsedGB = bytesToGB(systeminfo?.mem?.used);
    const memAvailableGB = bytesToGB(systeminfo?.mem?.available);

    const diskDevices = Array.isArray(systeminfo?.disk?.devices) ? systeminfo.disk.devices : []
    const diskUniqueDevices = []
    const diskSeen = new Set()
    for (const item of diskDevices) {
        // gopsutil can report the same btrfs device through multiple bind/subvolume mountpoints.
        // Count the same device+total only once so the panel does not inflate disk capacity.
        const key = `${item?.device || item?.mountpoint || ''}:${item?.total || 0}`
        if (diskSeen.has(key)) continue
        diskSeen.add(key)
        diskUniqueDevices.push(item)
    }
    const diskTotal = diskUniqueDevices.map((item) => toNumber(item.total))
        .reduce((prev, curr) => prev + curr, 0) / 1024

    const diskFree = diskUniqueDevices.map((item) => {
        const total = toNumber(item.total)
        const usage = clampPercent(item.usage)
        return total - (total * usage * 0.01)
    }).reduce((prev, curr) => prev + curr, 0) / 1024

    const diskUsage = roundTo(diskTotal > 0 ? clampPercent((diskTotal - diskFree) / diskTotal * 100) : 0, 1);
    const panelMemUsageMB = toNumber(systeminfo?.panelMemUsage) / 1024;
    const gpu = systeminfo?.gpu || {}
    const gpuTotalMB = toNumber(gpu.totalMB)
    const gpuUsedMB = toNumber(gpu.usedMB)
    const gpuUsedPercent = gpuTotalMB > 0 ? roundTo(clampPercent(gpuUsedMB / gpuTotalMB * 100), 1) : 0
    const panelDescription = hasSystemInfo
        ? compactOs(systeminfo?.host)
        : (loadError || t('panel.loading'))

    // 系统信息走聚合 SSE（useLiveStream 多组件共享一条连接）
    useLiveStream({
        cluster: '',
        level: '',
        onSysInfo: (data) => {
            setSysteminfo(data)
            setLoadError('')
        },
    })


    return (
        <>
                <RcResizeObserver key="resize-observer" onResize={(offset) => {
                    setResponsive(offset.width < 596);
                }}>
                    <StatisticCard.Group
                        direction={responsive ? 'column' : 'row'}>
                        <StatisticCard
                            statistic={{
                                title: t('panel.panel'),
                                value: hasSystemInfo ? `${formatData(panelMemUsageMB, 2)} M` : '--',
                                description: <Tooltip title={panelDescription}><div style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{panelDescription}</div></Tooltip>,
                            }}
                        />


                        <StatisticCard statistic={{
                            title: t('panel.memoryUsage'),
                            value: hasSystemInfo ? `${formatData(memUsedGB, 2)} GB` : '--',
                            description: <Statistic title={t('panel.totalMem')}
                                                    value={hasSystemInfo ? `${formatData(memAvailableGB, 2)} / ${formatData(memTotalGB, 2)} GB` : '--'}/>,
                        }} chart={
                            <>
                                <Progress type="circle" percent={memUsedPercent}
                                          strokeColor={memUsedPercent > 70 ? 'red' : '#5BD171'} status='normal'
                                          width={70}
                                          strokeLinecap="butt" strokeWidth={8}/>
                            </>
                        } chartPlacement="left"/>

                        <StatisticCard statistic={
                            {
                                title: t('panel.cpuUsage'),
                                value: hasSystemInfo ? `${formatData(cpuUsedPercent, 1)} %` : '--',

                                description: <Statistic title={t('panel.cpuCores')}
                                                        value={`${cpuCores} `}/>,
                            }} chart={
                            <>
                                <Tooltip placement="rightTop" overlayStyle={{
                                    maxWidth: 460
                                }} title={(
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16, rowGap: 2, width: 420, maxWidth: '60vw'}}>
                                        {cpuPercent.map((value, index) =>
                                            // eslint-disable-next-line react/jsx-key
                                            <div>
                                                {t('panel.core', {index})}: {formatData(value, 1)}%<Progress
                                                percent={roundTo(clampPercent(value), 1)} size="small" strokeColor={'#5BD171'}
                                                status="active"/>
                                            </div>)}
                                    </div>)}>
                                    <Progress type="circle" percent={cpuUsedPercent}
                                              strokeColor={cpuUsedPercent > 70 ? 'red' : ''} status='normal'
                                              width={70}
                                              strokeLinecap="butt" strokeWidth={8}/>
                                </Tooltip>
                            </>
                        } chartPlacement="left"/>

                        <StatisticCard statistic={{
                            title: t('panel.diskFree'),
                            value: hasSystemInfo ? `${formatData(diskFree, 2)} GB` : '--',
                            description: <Statistic title={t('panel.totalDisk')}
                                                    value={hasSystemInfo ? `${formatData(diskTotal, 2)} GB` : '--'}/>,
                        }} chart={
                            <>
                                <Progress type="circle" percent={diskUsage}
                                          strokeColor={diskUsage > 90 ? 'red' : ''}
                                          status='normal' width={70} strokeLinecap="butt" strokeWidth={8}/>
                            </>
                        } chartPlacement="left"/>

                        <StatisticCard statistic={{
                            title: t('panel.gpuUsage'),
                            value: hasSystemInfo && gpuTotalMB > 0 ? `${formatData(gpuUsedMB / 1024, 2)} GB` : '--',
                            description: <Statistic title={t('panel.gpuTotal')}
                                                    value={hasSystemInfo && gpuTotalMB > 0 ? `${formatData(gpuTotalMB / 1024, 2)} GB` : '--'}/>,
                        }} chart={
                            <>
                                <Progress type="circle" percent={gpuUsedPercent}
                                          strokeColor={gpuUsedPercent > 90 ? 'red' : '#5BD171'}
                                          status='normal' width={70} strokeLinecap="butt" strokeWidth={8}/>
                            </>
                        } chartPlacement="left"/>
                    </StatisticCard.Group>
                </RcResizeObserver>
        </>
    )
}