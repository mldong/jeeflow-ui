/**
 * @mldong/jeeflow-ui —— jeeflow 流程中心组件包
 *
 * 数据层（阶段 0 骨架）：
 *  - types.ts          门面契约类型（规范 06 一一对应）
 *  - api.ts            40 action 封装（框架无关，依赖注入）
 *  - provider.ts       JeeflowUiProvider / useJeeflowUi（Vue 注入）
 *  - form-registry.ts  表单注册表 + SchemaForm 兜底
 *
 * 阶段 1 将新增：FlowList / StartDrawer / TodoList / ApproveDrawer /
 * InstanceDetail / FlowViewer 等组件（从 apps/demo 拆出）。
 */

export * from './types'
export * from './api'
export * from './provider'
export * from './form-registry'
