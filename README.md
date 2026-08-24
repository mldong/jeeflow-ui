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

// 1. 注入配置（门面 3 点 + 宿主 adapters）
<JeeflowUiProvider :config="{
  baseUrl: 'http://localhost:8100',
  getToken: () => store.token,
  getOperator: () => store.userId,
  hasPermission: (codes) => hasAny(codes),
  adapters: {
    listUsers: (kw, ctx) => sysUserSelect(kw),   // 抄送/转办/委托；candidate+taskId 仍走引擎
    getDict: (code) => dictApi(code),            // SchemaForm ApiDict
    upload: (file) => oss.put(file),             // 附件；不传则只存文件名
  },
}">
  <App />
</JeeflowUiProvider>

// 2. 任意组件内调用 40 个 action
const { api, can } = useJeeflowUi()
const todos = await api.processTask.todoList({ pageNum: 1, pageSize: 10 })
await api.processTask.execute(taskId, SubmitType.AGREE, { tf_approvalComment: '同意' })
```

### 宿主 adapters

ui-kit **不调用**宿主 REST（无 `/sys/user/select`）。选人 / 角色 / 字典 / 上传由宿主注入；缺哪个，对应控件降级。

| adapter | 用途 | 不传时 |
|---------|------|--------|
| `listUsers(keyword, ctx)` | 抄送 / 转办 / 委托 / 指定下一处理人 / 设计器指派 | 选人提示「请注入 listUsers」 |
| `getUsersByIds(ids)` | 已选用户 chips 回显姓名 | 显示 userId |
| `listRoles(keyword)` | 设计器按角色指派 | 角色指派隐藏 |
| `getDict(code)` | SchemaForm `ApiDict` | 空下拉 |
| `upload(file)` | 发起附件 / SchemaForm `Upload` | 只存文件名 |

选人优先级：`scene=candidate` 且有 `taskId` → 门面 `processTask/candidatePage`；否则 `adapters.listUsers`。流程 JSON 的 `selectUserApi` 只作为 `ctx.apiHint`，ui-kit 不直接 fetch。

顶层 `listUsers` 仍可用（已废弃），会自动并入 `adapters.listUsers`。

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
| 2 | npm 发布 `@mldong/jeeflow-ui` + demo 薄壳化 + 集成文档 | ⏳ 文档已写，包未上 npm |
| 3 | iframe 壳（embed）：URL+postMessage 双通道注入 + 事件上报 + 白标 | ✅ |

## 集成（宿主怎么接）

能力边界、Vue 整页/拆组件、iframe、adapters：**以文档站为准**（npm 发布前也可按此对照源码）。

- 文档：[指南 13 · jeeflow-ui 流程中心](https://jeeflow-doc.mldong.com/guides/13-jeeflow-ui)
- 源码样板：`apps/demo`（同栈）、`apps/embed`（iframe）

`@mldong/jeeflow-ui` **尚未发布到 npm**，不要 `pnpm add`。需要本地试：clone 本仓 `pnpm install && pnpm dev`。

## 相关

- 统一门面接口文档：[jeeflow-doc · 规范 06](https://jeeflow-doc.mldong.com/spec/06-facade.html)
- 流程定义配置项参考：[jeeflow-doc · 规范 02](https://jeeflow-doc.mldong.com/spec/02-flow-definition.html)
- 设计器：[mldong-flow-designer-plus](https://www.npmjs.com/package/mldong-flow-designer-plus)（钉钉风格，canvas/dingtalk 双模式）

## License

Copyright © 2025-2026 mldong

Licensed under the Apache License, Version 2.0.
See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
