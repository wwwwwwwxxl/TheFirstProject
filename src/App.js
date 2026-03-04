import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, Descriptions, Spin, Form, Modal, Input, Button, Radio,
  Space, Card, message, DatePicker, Popconfirm, Layout,  Tooltip 
} from 'antd';
import { UserOutlined, LockOutlined, LogoutOutlined, SearchOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import './App.scss';
import { ConfigProvider, useUI } from './ConfigContext';

import { getRules } from './schema'; 

const { Header, Content } = Layout;


axios.defaults.baseURL = 'http://localhost:8080'; 

const App = () => {
  const ui = useUI();
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [form] = Form.useForm(); 
  const [modalForm] = Form.useForm(); 
  const [passwordForm] = Form.useForm(); 
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(2);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // --- 拦截器 ---
  useEffect(() => {
    const reqInterceptor = axios.interceptors.request.use(config => {
      const token = localStorage.getItem('token');
      if (token) config.headers.token = token; 
      return config;
    });

    const resInterceptor = axios.interceptors.response.use(
      res => res,
      err => {
        if (err.response && err.response.status === 401) {
          message.error("登录已过期，请重新登录");
          localStorage.removeItem('token');
          setIsLoggedIn(false);
        }
        return Promise.reject(err);
      }
    );

    return () => {
      axios.interceptors.request.eject(reqInterceptor);
      axios.interceptors.response.eject(resInterceptor);
    };
  }, []);
  
  // --- 业务请求 ---
  const fetchEmployees = useCallback(async (page = 1, size = 2, queryValues = {}) => {
    if (!isLoggedIn) return;
    setLoading(true);
    const body = {
      name: queryValues.name || null,
      gender: queryValues.gender || null,
      address: queryValues.address || null,
      number: queryValues.number || null,
      birthday: queryValues.birthday ? queryValues.birthday.format('YYYY-MM-DD') : null
    };
    try {
      const res = await axios.post('/emp/search', body, { params: { page, pageSize: size } });
      if (res.data.code === 1) {
        setData(res.data.pageResult.rows || []);
        setTotal(res.data.pageResult.total || 0);
      }
    } catch (e) { 
      message.error("获取数据失败");
    } finally { setLoading(false); }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) fetchEmployees(currentPage, pageSize, form.getFieldsValue());
  }, [isLoggedIn, currentPage, pageSize, fetchEmployees, form]);
  // --- 统一的重置并刷新函数 ---
  const resetToInitial = useCallback(() => {
    form.resetFields(); // 清空搜索框
    setCurrentPage(1);  // 回到第一页
    fetchEmployees(1, pageSize, {}); // 按照空条件重新拉取
  }, [form, pageSize,fetchEmployees]);


  // --- 操作函数 ---

  // 1. 修改密码成功后重置一切（因为要重新登录）
  const handleUpdatePassword = async (values) => {
    setLoading(true);
    try {
      const res = await axios.post(`/emp/updatePassword`, {
        id: editingId,
        password: values.newPassword 
      });
      if (res.data.code === 1) {
        message.success("PASSWORD更新成功，もう一回登録してください", 2);
        setTimeout(() => {
          localStorage.removeItem('token');
          setIsLoggedIn(false);
          form.resetFields();
          window.location.href = '/login';
           // 确保下次登录进来是空的
        }, 1500);
      }
    } catch (e) { message.error("操作失敗"); } finally { setLoading(false); }
  };

  // 2. 新增/修改成功后重置
  const handleFormSubmit = async (values) => {
    setLoading(true);
    const payload = {
      ...values,
      id: editingId,
      birthday: values.birthday ? values.birthday.format('YYYY-MM-DD') : null
    };
    if (editingId) delete payload.password;
    try {
      const res = editingId ? await axios.put('/emp', payload) : await axios.post('/emp', payload);
      if (res.data.code === 1) {
        message.success("操作成功");
        setIsModalOpen(false);
        resetToInitial(); // 【关键】操作完成后回到最初状态
      }
    } catch (err) { message.error("異常を報告します"); } finally { setLoading(false); }
  };

  // 3. 删除成功后重置
  const confirmDelete = async (id) => {
    try {
      const res = await axios.delete('/emp', { params: { id } });
      if (res.data.code === 1) {
        message.success("削除成功");
        resetToInitial(); // 【关键】删除后回到最初状态
      }
    } catch (e) { message.error("削除失敗"); }
  };

  const showEditModal = async (record) => {
    setEditingId(record.id);
    setLoading(true);
    try {
      const res = await axios.get(`/emp/search`, { params: { id: record.id } });
      if (res.data.code === 1) {
        const { password, ...fullData } = res.data.data;
        setIsModalOpen(true);
        modalForm.setFieldsValue({
          ...fullData,
          birthday: fullData.birthday ? dayjs(fullData.birthday) : null
        });
      }
    } catch (e) { message.error("情報取得失敗"); } finally { setLoading(false); }
  };

  const columns = [
    { title: '名字', dataIndex: 'name', key: 'name' },
    { title: '性別', dataIndex: 'gender', key: 'gender', width: 80 },
    { title: '電話', dataIndex: 'number', key: 'number' },
    { title: '住所', dataIndex: 'address', key: 'address', ellipsis: true },
    // 已将薪资替换为自我介绍
    { 
      title: '自己紹介', 
      dataIndex: 'introduce', 
      key: 'introduce', 
      ellipsis: true, 
      width: 200,
      render: (text) => (
        <Tooltip title={text}>
          {text}
        </Tooltip>
      )
    },
    { title: '操作', key: 'action', width: 260, render: (_, record) => (
      <Space>
        <Button type="link" size="small" onClick={() => {
          setIsDetailOpen(true); setDetailLoading(true);
          axios.get(`/emp/search`, { params: { id: record.id } }).then(res => {
            setDetailData(res.data.data); setDetailLoading(false);
          });
        }}>詳細</Button>
        <Button type="link" size="small" onClick={() => showEditModal(record)}>更新</Button>
        <Button type="link" size="small" onClick={() => { setEditingId(record.id); setIsPasswordModalOpen(true); passwordForm.resetFields(); }}>パスワード更新</Button>
        <Popconfirm title="削除を確認してください" onConfirm={() => confirmDelete(record.id)}>
          <Button type="link" size="small" danger>削除</Button>
        </Popconfirm>
      </Space>
    )}
  ];

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
        <Card title={<div style={{textAlign:'center'}}>system登録</div>} style={{ width: 380 }}>
          <Form onFinish={(v) => { 
            resetToInitial(); // 登录时也确保是初始状态
            const onLogin = async (vals) => {
              setLoginLoading(true);
              try {
                const res = await axios.post('/login', vals);
                if (res.data.code === 1) {
                  localStorage.setItem('token', res.data.data.token);
                  setIsLoggedIn(true);
                } else { message.error(res.data.msg); }
              } catch (e) { message.error("リンク失敗"); } finally { setLoginLoading(false); }
            };
            onLogin(v);
          }} layout="vertical" size="large">
            <Form.Item name="usernumber" rules={[{ required: true }]}><Input prefix={<UserOutlined />} placeholder="USERNUMBER" /></Form.Item>
            <Form.Item name="password" rules={[{ required: true }]}><Input.Password prefix={<LockOutlined />} placeholder="PASSWORD" /></Form.Item>
            <Button type="primary" htmlType="submit" block loading={loginLoading}>{ui.loginBtn}</Button>
          </Form>
        </Card>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#001529', padding: '0 24px' }}>
        <div style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>従業員管理</div>
        <Button icon={<LogoutOutlined />} onClick={() => { localStorage.removeItem('token'); setIsLoggedIn(false); }} danger>LOG　OUT</Button>
      </Header>

      <Content style={{ padding: '24px' }}>
        <Card style={{ marginBottom: 16 }}>
          <Form 
            form={form} 
            onFinish={() => { setCurrentPage(1); fetchEmployees(1, pageSize, form.getFieldsValue()); }} 
            layout="inline"
            style={{ gap: '10px' }}
          >
            <Form.Item name="name" label="名字"><Input placeholder="名字" style={{ width: 120 }} /></Form.Item>
            <Form.Item name="gender" label="性别">
              <Radio.Group optionType="button" options={[{label:'男', value:'男'}, {label:'女', value:'女'}]} />
            </Form.Item>
            <Form.Item name="number" label="電話"><Input placeholder="電話番号" style={{ width: 150 }} /></Form.Item>
            <Form.Item name="address" label="住所"><Input placeholder="住所" style={{ width: 150 }} /></Form.Item>
            <Form.Item name="birthday" label="誕生日"><DatePicker placeholder="日付" style={{ width: 150 }} /></Form.Item>
            
            <Form.Item>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} htmlType="submit">検索</Button>
                <Button icon={<ReloadOutlined />} onClick={resetToInitial}>再設定</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        <Card title="従業員情報" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); modalForm.resetFields(); setIsModalOpen(true); }}>新規登録</Button>}>
          <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ current: currentPage, pageSize: pageSize, total: total, onChange: (p, s) => { setCurrentPage(p); setPageSize(s); } }} />
        </Card>
      </Content>

      {/* 新增/修改弹窗 */}
      <Modal title={editingId ? "更新" : "新規登録"} open={isModalOpen} onOk={() => modalForm.submit()} onCancel={() => setIsModalOpen(false)} confirmLoading={loading} width={600}>
        <Form form={modalForm} onFinish={handleFormSubmit} layout="vertical">
          <Space size="large">
            <Form.Item name="name" label="名字" rules={getRules('name')}><Input style={{ width: 220 }} /></Form.Item>
            <Form.Item name="gender" label="性别" rules={getRules('gender')}><Radio.Group options={['男', '女']} /></Form.Item>
          </Space>
          <Space size="large">
            <Form.Item name="number" label="電話番号" rules={getRules('number')}><Input style={{ width: 220 }} /></Form.Item>
            <Form.Item name="birthday" label="誕生日" rules={getRules('birthday')}><DatePicker style={{ width: 220 }} /></Form.Item>
          </Space>
          {!editingId && (
            <Space size="large">
              <Form.Item name="usernumber" label="ユーザー番号" rules={getRules('usernumber')}><Input style={{ width: 220 }} /></Form.Item>
              <Form.Item name="password" label="初期パスワード" rules={getRules('password')}><Input.Password style={{ width: 220 }} /></Form.Item>
            </Space>
          )}
          <Space size="large">
            <Form.Item name="department" label="部门" rules={getRules('department')}><Input style={{ width: 220 }} /></Form.Item>
            <Form.Item name="salary" label="給料" rules={getRules('salary')}><Input prefix="￥" style={{ width: 220 }} /></Form.Item>
          </Space>
          <Form.Item name="address" label="住所" rules={getRules('address')}><Input.TextArea /></Form.Item>
          <Form.Item name="introduce" label="自己紹介"><Input.TextArea rows={4} /></Form.Item>
        </Form>
      </Modal>

      {/* 修改密码、详情弹窗保持不变... */}
      <Modal title="安全修改密码" open={isPasswordModalOpen} onOk={() => passwordForm.submit()} onCancel={() => setIsPasswordModalOpen(false)} confirmLoading={loading}>
        <Form form={passwordForm} onFinish={handleUpdatePassword} layout="vertical">
          <Form.Item name="newPassword" label="新しいパスワード" rules={[{ required: true }, { min: 6 }]}><Input.Password /></Form.Item>
          <Form.Item name="confirm" label="もう一回確認してください" dependencies={['newPassword']} rules={[{ required: true }, ({ getFieldValue }) => ({
            validator(_, value) { return !value || getFieldValue('newPassword') === value ? Promise.resolve() : Promise.reject('パスワードが一致（いっち）しません'); }
          })]}><Input.Password /></Form.Item>
        </Form>
      </Modal>

      <Modal title="詳細情報" open={isDetailOpen} onCancel={() => setIsDetailOpen(false)} footer={null}>
        <Spin spinning={detailLoading}>
          {detailData && (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="ユーザー番号">{detailData.usernumber}</Descriptions.Item>
              <Descriptions.Item label="名字">{detailData.name}</Descriptions.Item>
              <Descriptions.Item label="誕生日">{detailData.birthday}</Descriptions.Item>
              <Descriptions.Item label="給料">{detailData.salary}</Descriptions.Item>
              <Descriptions.Item label="自己紹介">{detailData.introduce}</Descriptions.Item>
            </Descriptions>
          )}
        </Spin>
      </Modal>
    </Layout>
  );
};

const RootApp = () => (
  <ConfigProvider>
    <App />
  </ConfigProvider>
);

export default RootApp;