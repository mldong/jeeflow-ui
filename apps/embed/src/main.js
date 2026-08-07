// iframe 壳占位（阶段 3）：token 注入 + postMessage + 白标
// 规划：
//  1. URL ?token= 或宿主 postMessage 注入登录态
//  2. 消息协议：办理完成/待办数变化 → 通知宿主刷新
//  3. 白标：host 传入 logo/主题色/站点名
import { createApp } from 'vue'

const app = createApp({
  template: '<div style="padding:24px;color:#888">jeeflow embed 壳（阶段 3 规划中）</div>',
})
app.mount('#app')
