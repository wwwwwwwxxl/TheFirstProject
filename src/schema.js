export const detailedInfSchema = {
  properties: {
    name: { title: "姓名", required: true, max: 30 },
    usernumber: { title: "工号", required: true, min: 6 , max : 6 , pattern: /^[0-9]+$/ },
    password: { title: "密码", required: true, min: 6 ,max : 30},
    salary: { title: "工资", required: true, pattern: /^[1-9]\d{0,2}(,\d{3})*$/},
    department: { title: "部门", required: true }, 
    birthday: { title: "生日", required: true },
    address: { title: "地址", required: true },
    number: { title: "电话", required: true, pattern: /^0[789]0\d{8}$/},
    introduce: { title: "简介", required: false, max: 200 },
    gender: { title: "性别", required: true, enum: ['男', '女'] },
  }
};

// 转换工具：将 Schema 转换为 Ant Design 的 rules
export const getRules = (field) => {
  const config = detailedInfSchema.properties[field];
  if (!config) return [];

  const rules = [];
  if (config.required) {
    rules.push({ required: true, message: `请输入${config.title}` });
  }
  if (config.min) {
    rules.push({ min: config.min, message: `${config.title}至少${config.min}位` });
  }
  if (config.max) {
    rules.push({ max: config.max, message: `${config.title}最多${config.max}位` });
  }
  if (config.pattern) {
    rules.push({ pattern: config.pattern, message: `${config.title}格式不正确` });
  }
  return rules;
};