# Web Store Oversea Demo

一个用于充值商城海外版演示的纯前端项目，包含：

- `frontend`：C 端商城
- `admin`：管理后台
- `mock` / `shared`：模拟数据与公共逻辑

项目为纯前端 Mock，不依赖真实后端接口。

## 技术栈

- Vue 3
- Vite
- 原生 JavaScript

## 本地运行

安装依赖后直接启动：

```bash
npm install
npm run dev:frontend
```

管理后台单独启动：

```bash
npm run dev:admin
```

## 构建与预览

构建 C 端：

```bash
npm run build:frontend
```

构建管理后台：

```bash
npm run build:admin
```

构建完整 demo 并生成预览目录：

```bash
npm run build:demo
```

本地预览 demo：

```bash
npm run preview:demo
```

## 访问地址

开发环境下：

- C 端：`http://localhost:5173/`
- 管理后台：`http://localhost:5173/admin/`

demo 预览环境下：

- C 端：`http://localhost:4173/`
- 管理后台：`http://localhost:4173/admin/`

## 说明

- 这是前端演示项目，页面数据、支付流程、语言配置等均为 Mock 实现。
- `build:admin` 会把管理后台打到 `/admin/` 路径下，方便与 C 端同域预览。
