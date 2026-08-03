# neventec-bi 全量性能审查与 Cursor 改造指令

审查对象：`npcxl/neventec-bi`  
审查基线：`main` 分支，提交 `f09c1eda8aa1f72af73864146da58b885da868e8`（2026-08-03）  
项目：React 19 + TypeScript + Vite 6 + Ant Design 6 + ECharts 5 + GSAP 3 + Three.js

## 一、结论

当前卡顿不是一个点造成的，而是 4 类问题叠加：

1. **持续渲染过量**：`SeamlessVirtualList` 在每个 `requestAnimationFrame` 中调用 React `setState`。每个列表约 60 次 React 更新/秒，当前页面同时存在多个列表，是运行时持续卡顿的首要原因。
2. **请求重复且首屏加载过重**：首屏同时请求 14 个接口，随后模块副作用又重复请求当前模块；图片轮播还会再次请求图片接口。开发环境的 `React.StrictMode` 会让副作用问题显得更严重。
3. **根组件高频更新与同步持久化**：时钟每秒更新 `App`；服务端数据变化后多条 effect 会重复 `JSON.stringify` 并同步写 `localStorage`，阻塞主线程。
4. **首包和图形渲染过重**：未进入 3D 页面也会静态导入 Three.js、GSAP；ECharts 使用全量导入。展位图在缩放、移动、悬停时执行高频全量刷新。

建议先完成 P0～P2。仅这三步通常就能明显降低页面空闲 CPU 和交互卡顿，再处理请求、首包与图表。

## 二、已确认的代码问题

### P0：无缝列表每帧触发 React 重渲染（最高优先级）

文件：`src/components/SeamlessVirtuaList/index.tsx`

当前逻辑在 rAF 的 `tick` 中执行：

```ts
offsetRef.current += speed;
setOffset(offsetRef.current);
requestAnimationFrame(tick);
```

后果：

- 单个列表约 60 次 React render/秒。
- 展会页同时有报馆、缴费、未报到等多个滚动列表。
- 每帧重新计算 `visibleInfo`、切片 `loopData`、重新生成行节点。
- `pauseOnHover={false}`，卡顿会持续存在。

改造要求：

- rAF 内禁止调用 React `setState`。
- 每帧仅通过 DOM ref 更新容器 `style.transform`。
- 只有跨越整行边界、数据源变化或容器尺寸变化时才更新虚拟窗口 state。
- 页面不可见时暂停；恢复可见后继续。
- 支持 `prefers-reduced-motion`，该模式下关闭自动滚动。
- 数据不足一屏时不启动 rAF。
- 保留无缝循环、虚拟渲染、`speed`、`overscan` 和 hover 暂停能力。

推荐实现：维护 `offsetRef`、`lastTimestampRef`、`startIndex` state 和 `trackRef`。rAF 根据真实时间差计算位移，直接更新 `trackRef.current.style.transform`；只有 `Math.floor(offset/itemHeight)` 改变时更新 `startIndex`。不要简单换成整表 CSS 动画，因为长列表仍需要虚拟化。

验收：React Profiler 录制 10 秒空闲场景，无缝列表不再产生每帧 commit；每个列表约每跨一行才 commit 一次。

### P0：首屏请求 14 个接口，并立即重复请求

文件：`src/App.tsx`

`loadOverview()` 在首屏 `Promise.all` 中加载三个业务模块的 14 个接口，包括图片、安全、搭建和展会数据。另一个 `[hallMode, selectedHallId]` effect 在挂载后又请求当前展会模块；进入搭建模块时，模块 effect 与轮播 effect 会重复请求 `getBoothProgressPicture*`。

后果：

- 首屏网络、JSON 解析和 state 更新量过大。
- 任一接口失败会使整个 `Promise.all` 失败，已成功结果也无法落入页面。
- 接口重复，切换时可能出现旧请求与新请求竞争。
- 慢接口会让加载状态和用户操作相互影响。

改造要求：

- 首屏只请求当前可见模块所需数据：展馆基础信息、展位信息、展会页订单统计。
- 搭建、安全模块在首次进入时懒加载。
- 建立统一查询层，推荐 TanStack Query；如不新增依赖，至少实现 `requestKey -> data/promise/updatedAt` 的统一缓存与请求去重。
- 同一个 `requestKey` 在请求中时复用 Promise，不允许重复发起。
- 模块数据独立更新，使用 `Promise.allSettled` 或单请求落库，不能由一个失败接口拖垮全部数据。
- 图片接口只归轮播查询所有，删除模块 effect 中的重复图片请求。
- 切馆/切模块使用 AbortController；旧结果不得覆盖新选择。
- `React.StrictMode` 保留。不要通过移除 StrictMode 掩盖副作用不幂等问题。

验收：首次打开展会页没有同 URL/同参数重复请求；首屏不请求搭建、安全和轮播图片接口；切换模块首次加载一次，60 秒内返回不重复请求。

### P0：API 重试策略会放大卡顿

文件：`src/api.ts`

当前所有失败默认重试 4 次，并把 `404` 作为可重试状态；catch 对几乎所有网络错误继续重试。退避等待为 1.2、2.4、3.6、4.8 秒，且 `sleep()` 不能被 AbortSignal 立即取消。

改造要求：

- `404` 不重试；除非服务端明确约定最终一致性，否则 4xx 均不重试。
- 仅重试 GET 的网络错误、408、429、502、503、504；500 最多 1 次或按接口配置。
- 默认重试次数改为 1～2 次，并加入随机抖动。
- 解析并尊重 `Retry-After`。
- 实现 `abortableDelay(ms, signal)`，切换页面后立即停止等待。
- 为 fetch 增加真实请求超时，由请求层自己 abort；外层 `Promise.race` 超时但底层继续跑不可接受。
- AbortError 保持原始类型或统一的可识别错误类型，不要改写成普通 Error 后再次重试。

### P0：同步 localStorage 写入过于频繁

文件：`src/App.tsx`

当前至少存在三套持久化路径：状态变化后 250ms 写入、每 60 秒写入、另一个内存释放 effect 在依赖变化后立即通过 idle callback 写入。第二个 effect 的依赖覆盖几乎全部大对象，因此请求每返回一次都可能安排一次序列化与写入。

改造要求：

- 服务端查询结果不要存入 localStorage；查询缓存留在内存，必要时使用 IndexedDB。
- localStorage 仅保留轻量 UI 偏好：`exhibitionId`、`selectedHallId`、`hallMode`、`viewMode`。
- 合并为一个持久化 effect，1 秒防抖；新值与旧值相同不写。
- 删除两个重复的 60 秒“内存释放/持久化”effect，以及未启用的内存监控死代码。
- 禁止在 render 或高频 effect 中对大型 API 对象执行 `JSON.stringify`。

### P1：根组件时钟导致整棵页面每秒重新执行

文件：`src/App.tsx`

`currentTime` 位于 `App`，定时器每秒 `setCurrentTime(new Date())`。即使部分子组件使用 `memo`，根组件仍会每秒重新创建多组 props 对象、数组和 JSX；许多侧栏组件本身并未 memo。

改造要求：

- 把定时器和时间 state 完全下沉到 `CurrentTimeButton`，父组件不再持有 `currentTime`。
- `CurrentTimeButton` 自己每秒更新；手动刷新只更新自身。
- 将三个业务模块拆为 `ExhibitionDashboard`、`ConstructDashboard`、`SafetyDashboard`，各自 `memo`。
- 传给 memo 组件的对象、数组、回调保持引用稳定；不要为了 memo 滥用深比较。

验收：时钟跳秒时，React Profiler 中只有时间组件 commit，侧栏、地图、图表均不 commit。

### P1：3D 页面和图形库被静态打入首包

文件：`src/App.tsx`、`src/components/Hall3D/index.tsx`、所有 ECharts 组件

`Hall3D` 在 App 顶部静态导入，因此普通 BI 大屏也需要下载/解析 Three.js、GSAP 和 `@gsap/react`。ECharts 组件普遍使用 `import * as echarts from "echarts"`。

改造要求：

- `Hall3D` 改为 `React.lazy(() => import(...))`，只在 `view=hall3d` 时加载，外层加 Suspense。
- 三个业务模块也可按模块动态导入。
- ECharts 改用 `echarts/core`，只注册实际使用的 Bar、Pie、Custom、Grid、Tooltip、DataZoom、CanvasRenderer 等。
- `vite.config.ts` 配置稳定分包，但不要把所有 vendor 强行塞进一个大 chunk。
- 构建前后记录 JS raw/gzip 大小与首屏请求瀑布图。

### P1：CenterMap 在缩放和悬停时做高成本刷新

文件：`src/components/CenterMap.tsx`

已确认热点：

- Custom series 的每个展位在 `renderItem` 中创建 polygon/rect、文字、编号底板等多个图元。
- `datazoom` 每次事件都调用 `chart.getOption()` 和 `chart.getZr().refreshImmediately()`。
- mouseover 使用 16ms timer，然后对整 series `downplay` 再 `highlight`。
- ResizeObserver 回调未用 rAF 合并。
- 点击处理闭包使用 effect 创建时的 `points`，数据更新后可能读取旧数组。

改造要求：

- datazoom 使用事件参数或 ref 获取缩放值；用 rAF 节流，每帧最多一次，避免 `getOption()` 深拷贝。
- 不要无条件 `refreshImmediately()`；只有文字显隐阈值跨越时才刷新 series。
- hover 只有 dataIndex 真正改变时才更新；保存上一个 index，只 downplay 上一个、highlight 新的。
- ResizeObserver 用单个 rAF 合并，并在尺寸未改变时跳过 `chart.resize()`。
- 点击读取 `pointsRef.current`，消除陈旧闭包。
- `normalizeSafetyCoordResponse` 的 JSON.parse 加 try/catch，并对解析结果做缓存。
- 如果单馆展位超过约 500 个：默认缩放较小时只画色块，不画展商名/编号；放大后再显示文字。超过约 1500 个时评估 canvas 分层或服务端简化坐标。

### P1：图片轮播把全部图片复制两份并创建 Ant Design Image

文件：

- `src/components/Construct/ConstructCarousel.tsx`
- `src/components/Safety/ConstructCarousel.tsx`

`visibleCount` 被设置为全部图片数量，随后 `[...visiblePictures, ...visiblePictures]` 复制两份。图片较多时，会生成 2N 个卡片和 2N 个 Ant Design Image/预览实例。`loading="lazy"` 只能减少下载，不能减少 DOM 和 React 成本。

改造要求：

- DOM 中只保留“可见数量 + 两侧缓冲”，建议 8～12 张，循环复用节点。
- 图片接口分页；如果后端不能分页，前端数据可保留但不要全部挂 DOM。
- 缩略图使用原生 `img`，`decoding="async"`、`loading="lazy"`，设置确定宽高；点击时只创建一个预览 Modal。
- 对图片 URL 去重，限制单次展示总数，错误图片显示轻量占位。
- CSS 动画样式移到全局 CSS，不要每个轮播实例内嵌 `<style>`。
- 修正无效 Tailwind 类 `h-[full]`、`w-[full]` 为 `h-full`、`w-full`。

### P1：图表实例与窗口监听可进一步统一

文件：`src/components/Safety/LeftSidebar.tsx`、`src/components/Safety/RightSidebar.tsx`、Construct 侧栏等

当前页面存在约 6 个 ECharts 初始化点、多个 ResizeObserver/resize listener 和多个轮播定时器。

改造要求：

- 建立统一 `useEChart` hook：初始化一次、ResizeObserver+rAF 节流、卸载 dispose、页面不可见时暂停动画/tooltip。
- `setOption` 依赖稳定的数据 key，不把每次 render 新建的数组直接作为 effect 依赖。
- 数据未变化时不执行 `setOption`。
- 自动 tooltip、风险窗口轮播仅在页面可见且组件可见时运行。
- 修复 `appendToBody` tooltip 的清理，避免切换模块后残留 DOM。

### P2：CSS/GPU 合成层过多

文件：`src/index.css` 与各组件 Tailwind class

页面使用大量无限动画、`will-change`、backdrop blur、阴影、渐变和透明叠层。单个效果不一定严重，但在 1920×1080 大屏上叠加会提高 GPU 栅格化和合成成本。

改造要求：

- 删除未使用的 keyframes/class。
- 静态区域取消 `backdrop-blur`；仅弹窗遮罩或确有视觉需要的区域保留。
- `will-change` 只在动画即将运行时添加，停止后移除。
- 大面积背景不要同时叠多层 blur + shadow + radial gradient。
- `document.hidden` 时暂停 CSS 无限动画，可在根节点加 `.is-page-hidden * { animation-play-state: paused !important; }`，但注意不要影响加载动画状态。
- 支持 `prefers-reduced-motion`。

### P2：字体与重复资源

文件：`src/index.css`、`public/`、`img/`、`src/components/Exhibition/`

仓库已有 `public/PMZD-Nanbohui-Subset.ttf`，但 CSS 仍引用 `/庞门正道标题体2.0增强版.ttf`。仓库同时保存 `img/`、`public/img/` 和组件目录中的重复 PNG；部分文件 SHA 完全相同。

改造要求：

- CSS 改用子集字体并优先转 WOFF2；确认标题所需汉字齐全。
- 只保留运行时真正使用的 `public/img` 资源，删除重复副本前先用 `rg` 验证引用。
- PNG 用 WebP/AVIF 或可控 SVG；带透明的大背景按实际显示尺寸导出，不要无意义 @2x。
- 图片设置尺寸，避免解码后布局抖动。

### P2：构建与代码结构问题

文件：`vite.config.ts`、`package.json`、`src/App.tsx`

- `App.tsx` 约 2200 行，数据请求、缓存、持久化、页面布局和模块逻辑耦合。
- build 只有 `vite build`，没有 `tsc --noEmit`、lint 和测试。
- 构建插件每次 build 会直接修改 `package.json` 版本，容易产生脏工作区和不可重复构建。
- 存在空声明文件、tsbuildinfo 和生成的 `vite.config.d.ts` 等不应提交的生成物。
- `screenStore.ts` 与 App 自身状态体系并存，但主流程并未真正统一使用，增加维护成本。

改造要求：

- 新增 `typecheck`、`lint`、最小测试和 `build:analyze`。
- 构建不修改 package.json；版本由 CI 环境变量或 Git SHA 注入 `define`，再生成 version.json。
- App 拆为路由/外壳、查询 hooks、模块组件和轻量偏好 store。
- 选择一种状态方案：服务端状态归查询层，UI 状态归轻量 store/React；删除未使用的 `screenStore` 或正式接入，不能双轨。
- 清理未使用依赖：`ogl`、`styled-components`、`react-virtuoso`、`@iconify/react` 等必须通过引用检查后再决定删除。

## 三、推荐实施顺序

| 阶段 | 内容 | 风险 | 预期收益 |
|---|---|---:|---:|
| P0-1 | 修复 SeamlessVirtualList 每帧 setState | 中 | 极高 |
| P0-2 | 移除首屏与轮播重复请求，缩减重试 | 中 | 极高 |
| P0-3 | 合并/缩减 localStorage 持久化 | 低 | 高 |
| P1-1 | 时钟下沉，模块拆分与稳定 props | 低 | 中高 |
| P1-2 | Hall3D/业务模块懒加载，ECharts 按需 | 中 | 高（加载） |
| P1-3 | CenterMap 缩放、hover、resize 节流 | 中高 | 高（交互） |
| P1-4 | 图片轮播窗口化 | 中 | 高（图片多时） |
| P2 | CSS、字体、资源、工程化清理 | 低～中 | 中 |

不要把所有改动放进一个提交。每阶段单独提交、构建和回归；若某阶段指标恶化，可单独回退。

## 四、统一验收标准

在 Chrome 无扩展、1920×1080、同一 exhibitionId、同一数据量下，优化前后各测 3 次，记录中位数。

1. **空闲 CPU**：页面稳定 30 秒后，主线程不应持续被 React render 占满；目标平均 JS CPU 低于 5%。
2. **React commit**：无缝列表不再每帧 commit；时钟更新只影响时钟组件。
3. **网络**：首屏无重复 URL+参数请求；不预取未打开模块的大数据与图片。
4. **交互**：地图拖拽/缩放保持接近 55～60 FPS；无明显长任务，单个 long task 尽量低于 50ms。
5. **内存**：三个模块来回切换 20 次、运行 10 分钟后，GC 后 heap 和 DOM 节点不持续增长；相对稳定值增幅不超过 10%～15%。
6. **首包**：Three.js/GSAP 不进入普通大屏初始 chunk；输出每个 chunk 的 raw/gzip 大小。
7. **视觉与功能**：三模块、展馆切换、自动列表、轮播、地图缩放、展位详情、轮询、异常提示保持功能一致。

## 五、可直接粘贴给 Cursor 的执行提示词

```text
请对当前仓库 npcxl/neventec-bi 做分阶段性能优化。当前基线为 main 分支提交 f09c1eda8aa1f72af73864146da58b885da868e8。

目标：解决页面持续卡顿、首屏请求过多、模块切换卡顿、地图缩放掉帧和图片多时内存上涨。必须保持现有 UI 视觉、字段、接口参数、三大模块及展馆/展位交互不变。不要通过删除 React.StrictMode、关闭全部动画、减少业务数据、伪造数据来“优化”。

执行规则：
1. 先阅读 package.json、vite.config.ts、src/App.tsx、src/api.ts、src/components/SeamlessVirtuaList/index.tsx、src/components/CenterMap.tsx、三个模块的左右侧栏、两个 ConstructCarousel、Hall3D。
2. 先建立基线：npm ci、typecheck（若脚本不存在先用 npx tsc --noEmit）、npm run build，记录构建 chunk 大小；列出首屏请求和重复请求；用 React Profiler/Chrome Performance 记录 30 秒空闲状态。
3. 按下面阶段逐一修改。每个阶段单独提交；每阶段执行 typecheck、build 和对应回归。不要一次性重写全部项目。

阶段 A：修复 SeamlessVirtualList（第一优先级）
- rAF 内禁止 setState。
- 每帧只通过 trackRef 修改 transform。
- 仅跨行、数据变化或尺寸变化时更新虚拟窗口 state。
- 数据不足一屏时不启动 rAF；document.hidden 时暂停；支持 prefers-reduced-motion；保留无缝、虚拟化、speed、overscan、hover pause。
- 用 React Profiler 验证列表不再每帧 commit。

阶段 B：重构请求与重试
- 首屏只加载展会当前页必须的 gallery、booth、order 数据；搭建和安全模块首次进入再加载。
- 删除挂载后重复模块请求，以及搭建图片在模块 effect/轮播 effect 的重复请求。
- 实现统一 requestKey 缓存、in-flight Promise 去重、TTL 和 AbortController；可采用 TanStack Query，若不新增依赖则写小型 query cache。
- 一个接口失败不能丢弃其他成功结果，使用 allSettled 或独立落库。
- api.ts：404/普通 4xx 不重试；仅 GET 网络错误、408/429/502/503/504 重试 1～2 次；支持 Retry-After、jitter、abortable delay 和请求级 timeout；AbortError 不得再次重试。
- 保留 StrictMode 并保证 effect 幂等。

阶段 C：降低 React 与持久化开销
- 把 currentTime 和 interval 完全下沉到 CurrentTimeButton；时钟变化只渲染时间组件。
- 将三个模块拆成 memo 的 ExhibitionDashboard、ConstructDashboard、SafetyDashboard，保持 props 引用稳定。
- localStorage 只保存 exhibitionId、selectedHallId、hallMode、viewMode；合并为单个 1 秒防抖 effect，相同内容不写。
- 删除重复的 60 秒持久化/所谓内存释放 effect、未启用的内存监控和大对象 JSON.stringify。

阶段 D：拆包
- Hall3D 使用 React.lazy + Suspense，普通大屏首包不包含 three、gsap、@gsap/react。
- 三业务模块按需动态加载。
- ECharts 改为 echarts/core 按需注册图表、组件和 CanvasRenderer。
- vite 生成合理 chunk，不要做单一巨型 vendor chunk；构建不再修改 package.json。

阶段 E：CenterMap 热点
- datazoom 使用 ref/事件参数，rAF 节流；禁止每事件 getOption + refreshImmediately。
- 只有文字显隐阈值跨越时更新 series。
- hover index 未变化时不处理，只 downplay 上一个、highlight 新项。
- ResizeObserver rAF 合并且尺寸相同跳过。
- 点击从 pointsRef.current 取值，修复陈旧闭包。
- JSON.parse 容错与坐标缓存；大量展位时按缩放等级降低文字图元数量。

阶段 F：图片轮播
- 不再 [...pictures, ...pictures] 渲染全部 2N 节点，只渲染可见项+缓冲（约 8～12 项），节点循环复用。
- 缩略图用原生 img + loading=lazy + decoding=async + 固定尺寸，点击只创建一个预览弹窗。
- URL 去重、错误占位；样式移出组件；修正 h-[full]/w-[full]。

阶段 G：图表/CSS/资源/工程化
- 建统一 useEChart：一次初始化、ResizeObserver+rAF、不可见暂停、卸载 dispose；数据未变不 setOption。
- 删除未使用无限动画和长期 will-change，减少大面积 backdrop-blur，支持 reduced-motion，页面隐藏时暂停装饰动画。
- 使用 PMZD-Nanbohui-Subset 字体并转 WOFF2（确认字符完整），删除重复资源前必须 rg 全仓引用。
- 添加 typecheck、lint、最小单测/build:analyze；检查并清理真正未使用的依赖和生成物。

每阶段输出：
- 修改文件清单与原因；
- typecheck/build 结果；
- 优化前后指标；
- 风险与回滚点；
- 下一阶段建议。

最终验收：
- 30 秒空闲平均 JS CPU <5%；
- 列表无每帧 React commit；时钟只更新自身；
- 首屏无同 URL+参数重复请求，不加载未进入模块的图片/大数据；
- 地图拖拽缩放接近 55～60 FPS，尽量无 >50ms long task；
- 模块切换 20 次、运行 10 分钟后 GC 后 heap/DOM 不持续增长，增幅不超过稳定值 10%～15%；
- 普通首屏 chunk 不包含 Three.js/GSAP；
- 视觉、接口、交互与当前版本一致。
```

## 六、审查边界

本次为 GitHub 静态代码审查，结论中的“已确认”均来自当前仓库代码。真实接口耗时、服务端响应体大小、具体展位数量、图片分辨率和目标设备 GPU 需要在运行环境中补测。因此 Cursor 必须先建立基线再改，不能只看 Lighthouse 总分，也不能只以开发模式感受作为最终结论。

