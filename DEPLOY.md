# 丰业膳食开单系统 - Netlify部署指南

## 🚀 快速部署

### 1. 准备部署
- 将此文件夹上传到GitHub仓库
- 或者直接拖拽到Netlify部署界面

### 2. Netlify配置
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Node version**: 18
- **重要**: 确保启用 `@netlify/plugin-nextjs` 插件（已在netlify.toml中配置）

### 3. 环境变量（可选）
如需自定义，在Netlify后台添加：
```
NEXT_PUBLIC_APP_NAME="丰业膳食开单系统"
```

## 📋 版本信息
- **版本**: 2号优化UI版本
- **更新时间**: 2025-01-08
- **主要功能**:
  - 语音开单系统
  - 客户管理
  - 订单报表
  - 打印功能
  - 移动端优化

## ⚡ 性能优化
- 平滑页面切换动画
- 移动端手势支持
- 客户选择强制流程
- 隐藏所有开发工具

## 🔧 技术栈
- Next.js 15.4.5
- TypeScript
- Tailwind CSS
- 阿里云通义千问AI API