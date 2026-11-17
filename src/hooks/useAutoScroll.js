import {useEffect, useRef} from 'react'

// 日志容器自动滚动到底部（新内容保持跟踪）
export default function useAutoScroll(dep) {
    const ref = useRef(null)
    useEffect(() => {
        const el = ref.current
        if (el) el.scrollTop = el.scrollHeight
    }, [dep])
    return ref
}
