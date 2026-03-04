import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
    const [ui, setUi] = useState({}); // 存放所有文案
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 请求你刚才在 LoginController 里写的那个接口
        axios.get('/login/config')
            .then(res => {
                if (res.data.code === 1) {
                    setUi(res.data.data); // 把后端 Map 存入状态
                }
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <ConfigContext.Provider value={ui}>
            {/* 确保文案加载完再渲染页面，防止看到空变量 */}
            {!loading ? children : <div style={{textAlign:'center', marginTop:200}}>Loading UI...</div>}
        </ConfigContext.Provider>
    );
};

export const useUI = () => useContext(ConfigContext);