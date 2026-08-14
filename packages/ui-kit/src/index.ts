/**
 * @mldong/jeeflow-ui —— jeeflow 流程中心组件包
 *
 * 数据层（阶段 0）：
 *  - types.ts / api.ts / provider.ts / form-registry.ts
 *
 * 页面组件（阶段 1，管理系统形态，对齐 vben5-wf 8 菜单）：
 *  - layout/JfLayout（顶部 + 左侧菜单 + 内容区）
 *  - pages/ApplyListPage（发起申请）/ MyInstancePage / TodoPage / DonePage /
 *    CcListPage / ProcessDefinePage / ProcessDesignPage / SurrogatePage
 *  - drawers/StartDrawer / ApproveDrawer / InstanceDetailDrawer
 *  - ui/JfDrawer / JfBadge / JfFlowViewer
 */

export * from './types'
export * from './api'
export * from './provider'
export * from './form-registry'
export * from './helpers'

// UI 基件
export { default as JfDrawer } from './ui/JfDrawer.vue'
export { default as JfBadge } from './ui/JfBadge.vue'
export { default as JfFlowViewer } from './ui/JfFlowViewer.vue'
export { default as JfUserPicker } from './ui/JfUserPicker.vue'
export { default as JfIcon } from './ui/JfIcon.vue'
export { default as JfTabs } from './ui/JfTabs.vue'
export { default as JfApprovalRecord } from './ui/JfApprovalRecord.vue'
export { default as JfInitiateExtras } from './ui/JfInitiateExtras.vue'

// 布局
export { default as JfLayout } from './layout/JfLayout.vue'
export type { JfMenuItem } from './layout/JfLayout.vue'

// 抽屉
export { default as JfStartDrawer } from './drawers/StartDrawer.vue'
export { default as JfApproveDrawer } from './drawers/ApproveDrawer.vue'
export { default as JfInstanceDetailDrawer } from './drawers/InstanceDetailDrawer.vue'

// 页面组件
export { default as JfWorkbenchPage } from './pages/WorkbenchPage.vue'
export { default as JfApplyListPage } from './pages/ApplyListPage.vue'
export { default as JfMyInstancePage } from './pages/MyInstancePage.vue'
export { default as JfTodoPage } from './pages/TodoPage.vue'
export { default as JfDonePage } from './pages/DonePage.vue'
export { default as JfCcListPage } from './pages/CcListPage.vue'
export { default as JfProcessDefinePage } from './pages/ProcessDefinePage.vue'
export { default as JfProcessDesignPage } from './pages/ProcessDesignPage.vue'
export { default as JfSurrogatePage } from './pages/SurrogatePage.vue'

// 全局样式（宿主引入一次）
import './style.css'
