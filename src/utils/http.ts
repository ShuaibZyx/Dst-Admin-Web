import axios, {
    AxiosInstance,
    InternalAxiosRequestConfig,
    AxiosResponse,
    AxiosError,
} from 'axios';
import {message} from 'antd';
import i18next from '../locales/i18n.tsx';

// 创建 axios 实例
const http: AxiosInstance = axios.create({
    withCredentials: true,
    baseURL: '',
    timeout: 50000,
});

// 请求拦截器
http.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => config,
    (error: AxiosError): Promise<AxiosError> => Promise.reject(error)
);

// 响应拦截器
http.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => response,
    (error: AxiosError): Promise<AxiosError> => {
        const status = error.response?.status;

        console.log(status);

        if (status === 401 || status === 504) {
            // 并发多个 401/504（如 StrictMode 双跑或多接口同时失效）只保留一条提示：
            // antd 相同 key 的 message 会替换而非堆叠
            if (status === 504) {
                message.error({content: i18next.t('error.serverException'), key: 'serverException'});
            }
            if (status === 401) {
                message.warning({content: i18next.t('error.loginExpired'), key: 'loginExpired'});
            }

            // 清除本地登录信息
            localStorage.clear();

            // 跳转到登录页
            window.location.href = '/#/login';
        }

        return Promise.reject(error);
    }
);

export {http};