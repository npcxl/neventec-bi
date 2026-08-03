# neventec-bi 项目架构参考

## 项目概览

- **名称**：`db-demo`（neventec-bi）
- **类型**：展会BI监控大屏（Exhibition Business Intelligence Dashboard）
- **技术栈**：React 19 + TypeScript + Vite 6 + Ant Design 6 + ECharts 5 + GSAP 3 + Three.js + TailwindCSS 3
- **开发端口**：9527
- **API 代理**：`/ehs-api` → `https://glsz.s.369zhan.com`

## 目录结构

```
src/
├── main.tsx                     # 入口：ReactDOM.createRoot + ConfigProvider(中文) + version.json
├── App.tsx                      # 主组件：状态中心，三大模块切换，78KB
├── api.ts                       # API 层：fetch 封装 + 自动重试 + 全部接口定义
├── api.d.ts                     # API 类型声明（空）
├── index.css                    # 全局样式 + TailwindCSS
├── vite-env.d.ts               # Vite 类型声明
├── state/                       # 空目录
├── store/
│   └── screenStore.ts           # 轻量级 Store（useState），展馆/展位/安全数据
├── hooks/
│   ├── useSequentialApiPolling.ts    # 顺序轮询引擎
│   ├── useBoothColorStrategy.ts      # 展位颜色策略（展会/搭建/安全）
│   ├── useConstructProgress.ts       # 搭建进度数据处理
│   ├── useGroupedProgress.ts         # 分组进度计算
│   ├── useHallOverviewMap.ts         # 展馆总览数据映射
│   └── useHallSorter.ts              # 展馆名称智能排序
└── components/
    ├── CenterMap.tsx                 # 核心地图：ECharts custom series 渲染展位
    ├── DashboardHeader.tsx           # 标题栏（带自动换行）
    ├── HallOverviewMap.tsx           # 数据总览展馆卡片网格
    ├── Animation/demo1.tsx           # 动画演示
    ├── back-001/index.tsx            # 后台故障页
    ├── Button2/                      # 模块切换按钮组件
    ├── Buttons/                      # 展馆标签按钮组件
    ├── Construct/                    # 搭建信息概览模块
    │   ├── ConstructCarousel.tsx     # 搭建进度图片轮播
    │   ├── LeftSidebar.tsx           # 搭建总览 + 进度明细
    │   └── RightSidebar.tsx          # 材质/展位进展/进程情况
    ├── Exhibition/                   # 展会信息概览模块
    │   ├── LeftSidebar.tsx           # 展位总览 + 特装报馆
    │   └── RightSidebar.tsx          # 费用缴纳 + 未报到 + 水电气订单
    ├── Hall3D/index.tsx              # Three.js 3D 展馆（备用）
    ├── Loading/                      # 加载动画组件
    ├── Safety/                       # 安全信息概览模块
    │   ├── ConstructCarousel.tsx     # 安全现场图片轮播
    │   ├── LeftSidebar.tsx           # 违规汇总饼图 + 违规记录
    │   └── RightSidebar.tsx          # 违规风险等级 + 类型统计
    ├── Scan/                         # 扫描线动画组件
    └── SeamlessVirtuaList/           # 无缝虚拟滚动列表
```

## 三大业务模块

### 1. ExhibitionOverview（展会概况总览）
- 左侧：展位情况总览（总数、面积、特装/标准）+ 特装展位报馆列表
- 中间：CenterMap 展馆地图
- 右侧：费用缴纳（已缴/未缴）+ 未报到展位 + 水电气订单柱状图

### 2. ConstructOverview（搭建信息概览）
- 左侧：搭建总览（6种状态卡片）+ 搭建进度明细列表
- 中间：CenterMap（紧凑模式）+ 底部搭建进度图片轮播
- 右侧：主体结构材质环形图 + 展位进展饼图 + 展会进程进度条

### 3. SafetyOverview（现场安全总览）
- 左侧：查处违规汇总环形图 + 现场违规记录列表
- 中间：CenterMap（紧凑模式）+ 底部安全现场图片轮播
- 右侧：违规风险等级柱状图 + 违规类型饼图

## 核心数据流

```
URL param (exhibitionId) → App.tsx 初始化
    ↓
loadOverview() 并行调用 14 个 API
    ↓
数据存入 state（galleryRows, boothRows, safetyRows, constructData 等）
    ↓
useSequentialApiPolling 每 90s 轮询刷新
    ↓
数据通过 props 传递给各子组件（LeftSidebar, RightSidebar, CenterMap）
```

## 关键设计模式

### 1. 缓存策略
- **sessionStorage 持久化**：App.tsx 中 `createPersistedState/writePersistedState` 以 `exhibitionId` 为 key
- **60s 模块缓存**：`moduleFetchCacheRef` 避免重复请求
- **screenStore**：展馆数据 TTL 60 秒缓存

### 2. 轮询机制
- `useSequentialApiPolling`：顺序执行任务，单任务失败不影响其他
- 支持页面可见性检测（页面不可见时跳过）
- 防止并发轮询（runningRef 锁）

### 3. 错误处理
- API 层 4 次自动重试
- 轮询中单个任务超时/失败不中断整个周期
- AbortSignal 贯穿所有请求，组件卸载时自动取消

### 4. 布局模式
- 响应式三栏布局：`grid-cols-[minmax(320px,26%)_minmax(0,48%)_minmax(320px,26%)]`
- 使用 `clamp()` 实现流体尺寸
- 深色科技风主题（深蓝黑 + 青蓝发光边框）

### 5. 展位颜色策略
- 展会模式：按缴费状态着色
- 搭建模式：按搭建进度状态着色
- 安全模式：按整改状态着色
- 实现：`useBoothColorStrategy` hook
