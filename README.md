# MemAI - AI 数字记忆管理助手

一个纯前端的照片智能整理 Demo 应用，帮助用户识别和清理低价值照片（截图、重复照片、模糊照片等），保留珍贵记忆。

## 功能特性

- **智能评分引擎**：基于记忆价值、稀缺价值、信息价值、画面质量四维加权评分
- **三分类系统**：自动将照片分为「保留」「待复核」「建议清理」三类
- **AI 解释**：为每张照片生成自然语言评分解释
- **批量操作**：支持批量移动、批量清理
- **iOS 风格设计**：极简 iOS 原生风格界面
- **纯前端实现**：无需后端，所有数据本地存储

## 技术栈

- 原生 JavaScript（无框架）
- Hash Router 前端路由
- 发布/订阅模式状态管理
- Tailwind CSS（CDN）
- LocalStorage 持久化

## 目录结构

```
memai-app/
├── index.html              # 入口 HTML
├── css/
│   ├── variables.css       # CSS 变量（设计系统）
│   └── styles.css          # 全局样式
├── js/
│   ├── utils.js            # 工具函数库
│   ├── photos_data.js      # 模拟照片数据（1000 张）
│   ├── store.js            # 状态管理（发布/订阅）
│   ├── router.js           # Hash 路由管理器
│   ├── scoring_engine.js   # 四维评分引擎
│   ├── category_engine.js  # 分类引擎
│   ├── explanation_engine.js # 解释引擎（模板生成）
│   ├── app.js              # 应用入口
│   └── pages/
│       ├── dashboard.js    # 首页看板
│       ├── scan.js         # 扫描页
│       ├── results.js      # 结果页
│       ├── photo_list.js   # 照片列表页
│       ├── detail.js       # 照片详情页
│       └── report.js       # 清理报告页
└── generate_data.py        # 模拟数据生成脚本
```

## 快速开始

### 方式一：直接打开

直接用浏览器打开 `index.html` 即可运行。

### 方式二：本地 HTTP 服务（推荐）

```bash
# 使用 Python
python -m http.server 8000

# 或使用 Node.js
npx serve .
```

然后访问 `http://localhost:8000`

## 数据说明

Demo 使用预构建的 1000 张模拟照片数据，包含：

- 风景旅行照（约 28%）
- 人物合照（约 22%）
- 日常随手拍（约 15%）
- 截图（约 35%）

数据分布经过精心设计，以展示产品的核心价值。

### 重新生成数据

```bash
python generate_data.py
```

## 用户流程

1. **首页（Dashboard）**：查看相册概览，点击「开始智能扫描」
2. **扫描页（Scan）**：动画展示扫描进度
3. **结果页（Results）**：查看三分类结果和 AI 洞察
4. **列表页（PhotoList）**：浏览各分类照片，支持批量选择
5. **详情页（Detail）**：查看单张照片评分详情和 AI 解释
6. **报告页（Report）**：清理完成后查看统计报告

## 评分模型

### 四维加权评分

| 维度 | 权重 | 满分 |
|------|------|------|
| 记忆价值 | 40% | 40 |
| 稀缺价值 | 25% | 25 |
| 信息价值 | 20% | 20 |
| 画面质量 | 15% | 15 |

### 分类阈值

- **保留**：总分 ≥ 58 分
- **待复核**：39 分 ≤ 总分 < 58 分
- **建议清理**：总分 < 39 分

## 部署

纯静态应用，可部署到任何静态托管服务：

- GitHub Pages
- Vercel
- Netlify
- 阿里云 OSS / 腾讯云 COS

将整个目录上传即可。

## 浏览器兼容性

- Chrome / Edge（推荐）
- Safari
- Firefox

移动端 iOS Safari 优化最佳。
