# jeeflow-ui — 流程中心（monorepo）

> jeeflow 工作流引擎的**通用流程前端**。目标：可集成到任意业务系统的流程中心组件
> （Vue3 同栈 npm 组件包 + 若依/异栈系统 iframe 壳）。
> 数据层完全基于**统一门面**（40 个 action，见 [规范 06 · 统一门面接口文档](https://jeeflow-doc.mldong.com/spec/06-facade.html)）——
> 后端框架无关，任意实现了 `/wf/**` 转发的后端均可对接。

## 仓库结构

```
jeeflow-ui/
├── packages/ui-kit/     # @mldong/jeeflow-ui 组件包（数据层已完成，组件阶段 1 拆出）
├── apps/demo/           # 演示站（薄壳：多后端切换 + 演示数据）
└── apps/embed/          # iframe 壳站点（阶段 3：token 注入 + postMessage + 白标）
```

## 快速开始（ui-kit 数据层）

```ts
import { JeeflowUiProvider, useJeeflowUi } from '@mldong/jeeflow-ui'

// 1. 注入配置（与后端门面的 3 个注入点前后端对称）
<JeeflowUiProvider :config="{
  baseUrl: 'http://localhost:8100',     // 后端门面地址
  getToken: () => store.token,          // 登录态
  getOperator: () => store.userId,      // 当前用户 → 门面 operator
  hasPermission: (codes) => hasAny(codes), // 权限码 → 按钮显隐
}">
  <App />
</JeeflowUiProvider>

// 2. 任意组件内调用 40 个 action
const { api, can } = useJeeflowUi()
const todos = await api.processTask.todoList({ pageNum: 1, pageSize: 10 })
await api.processTask.execute(taskId, SubmitType.AGREE, { tf_approvalComment: '同意' })
```

## 开发

```bash
pnpm install
pnpm dev          # 启动演示站（默认 :5173；端口占用时自动递增）
pnpm build        # 构建全部（ui-kit 库模式 + demo）

# embed iframe 壳（异栈系统接入样板）
cd apps/embed && pnpm dev      # 默认 :5176；public/host.html 为宿主示例页
```

## 阶段路线

| 阶段 | 内容 | 状态 |
|------|------|------|
| 0 | monorepo 骨架 + 数据层（types/api/provider/表单注册表） | ✅ |
| 1 | 核心组件拆出（全量页面/抽屉/人员选择器/工作台，ui-kit 内 40 action 全消费） | ✅ |
| 2 | npm 发布 `@mldong/jeeflow-ui` + demo 薄壳化 + 集成文档 | ⏳ |
| 3 | iframe 壳（embed）：URL+postMessage 双通道注入 + 事件上报 + 白标 | ✅ |

## 相关

- 统一门面接口文档：[jeeflow-doc · 规范 06](https://jeeflow-doc.mldong.com/spec/06-facade.html)
- 流程定义配置项参考：[jeeflow-doc · 规范 02](https://jeeflow-doc.mldong.com/spec/02-flow-definition.html)
- 设计器：[mldong-flow-designer-plus](https://www.npmjs.com/package/mldong-flow-designer-plus)（钉钉风格，canvas/dingtalk 双模式）
