# 项目长期记忆 (MEMORY.md)

## 现场安全 / 搭建信息概览 关键约定

### 两接口严格分工（2026-08-25 最终确认）
- **`getExhibitionProcess`**（`a/api/inspection/record/summary/getExhibitionProcess`）
  → **只驱动 `currentStageSteps`**（悬浮卡片 `ConstructFloatCards` + 地图序号徽章）。
  → **所有展馆都一样（全馆公共数据，不区分 hallId）**，全馆/选馆都调同一个、同一份返回。
  → 返回结构：`{data:[{name,completion,commence,...}]}`（data 直接是数组）。
  → **不要因"选馆"改走 `getExhibitionProcessDetail` 或 `getExhibitionProcessByHallId`**——用户明确该接口所有展馆数据相同。
- **`getExhibitionProcessDetail`**（`a/api/inspection/record/summary/getExhibitionProcessDetail`）
  → **只驱动 `exhibitionProcessData`**（搭建进程总览图表，LeftSidebar 消费）。
  → **搭建进程总览（当前/全部），按 hallId 区分**（全馆 hallId=undefined）。
  → 返回结构：`{data:{exhibitionId, categoryList:[{name,...}]}}`（步骤在 data.categoryList）。
- 两接口结构不同：Process 是 `data` 数组，Detail 是 `data.categoryList`。`App.tsx` 的 `unwrapCategoryList` 同时认两种（`data` 数组优先，否则 `data.categoryList`）。下游（LeftSidebar/ConstructFloatCards/CenterMap）直接 `Array.isArray` 消费纯数组，不再堆其他兼容。
- `ConstructFloatCards.tsx` 纯展示，收 `steps`（已是纯数组），`normalizeSteps` 只做 `name→title`。
- `currentStageSteps` 兜底：`CenterMap` 用 `currentStageSteps ?? exhibitionProcessData`（两者都应是纯数组）。
- 历史坑：曾重复写同一 state 互相覆盖。现 background 第一项=`getExhibitionProcess`、第二项=`getExhibitionProcessDetail`，各驱动各 state；polling 的 `currentStageConstructProcess` 任务已删除（不再用 Detail 写 currentStageSteps）；`loadExhibitionProcess`(allPeriod 切换) 用 `getExhibitionProcessDetail` 写 `exhibitionProcessData`。零冲突。

### 缓存陷阱（重要！已踩坑）
- 现场安全/搭建有 "60s 切换缓存"(moduleFetchCacheRef)。命中缓存时走 `refreshFromCache`，只恢复缓存里**显式存储**的字段。
- 任何需要跨"选展馆"持久化的 state，必须：① 在 fetch 后写进 `saveCache`，② 在 `refreshFromCache` 里恢复。否则刷新/切馆后该字段会丢（表现为"第一次有、切回来没有"）。
- 已知漏存过的字段：currentStageSteps。已修复：background .then 里 setCurrentStageSteps(exhibitionProcessData) 并写入 saveCache；refreshFromCache 增加恢复。

### 关键工序符号（现场安全选展馆）
- 接口 `a/api/checkDrawings/summary/list`(exhibitionId 必填, hallId 可选)。
- 字段映射：structureType 含"双层"→▲(#7DE3F7)、complexEngineering 含"复杂"→△(#FA8C16)、liftingPoint 含"包含"(吊点)→⊙(#2563EB)。riskAssessment 不显示。
- 渲染：HallMap 新增 boothMarks prop，绘在展位右上角无背景色。CenterMap 仅在 moduleMode==="SafetyOverview" 时传。

### 展位违规（未整改）与地图感叹号（2026-08-28 新增）
- 接口 `a/api/safety/safetyHeader/boothViolations?expoid=&hallId=`，前端 `screenApi.getBoothViolations(expoid, hallId?)`。
- 调用时机：现场安全模式**选展馆**分支（与 getCheckDrawingsSummary 同一请求组），全馆分支不调。state=`boothViolations`，已接入 saveCache/refreshFromCache（防切馆丢失）。
- 业务规则（用户确认）：
  - `hasUnfinishedRectify === true` → 该展位在地图显示**感叹号**。
  - **感叹号仅取决于 `hasUnfinishedRectify === true`（不分展位类型）。标摊（标准摊位）不显示感叹号。**
  - **标摊（`excompanytype` 为 `1`/数字1/含"标摊"）→ 仅按"一般风险"(low/蓝色)配色，不显示感叹号。**
  - **已废弃旧逻辑**：不再用 checkDrawingsSummary 的 `riskAssessment` 判定感叹号（2026-08-28 用户要求"完全为现在的逻辑"）。riskAssessment 现仅用于非标摊展位的取色。
  - 注意：接口返回的 `excompanytype` 是**数字**（1/2），isStandardBooth 用 String() 转换兼容。

### 未报图展位（2026-08-28 新增）
- 规则：**特装展位（excompanytype=2）且没有任何风险评级（未报图）→ 不展示色块，仅白色标边**（透明填充）。
- 判定：既无 checkDrawingsSummary 的 riskAssessment，也无 hasUnfinishedRectify=true。
- 实现：`useBoothColorStrategy` 的 ColorStrategy 新增 `unreportedBoothNos` 集合 → CenterMap 传给 HallMap → HallMap 绘制时跳过填充、strokeStyle='#ffffff'。
- 关键：boothNo key 归一化必须与 `normalizeKey` 一致（**仅 String().trim()，不做 toLowerCase**），否则匹配不上。
  - 感叹号图标 = `/img/隐患待整改.svg`，即 `MARK_ICONS.risk`（与 SafetyFloatCards 图例第5项「隐患待整改」同一个图），复用 `riskMarks` 渲染，未新增图标文件。
- 实现位置：`useBoothColorStrategy.ts` 的 `createSafetyOverviewStrategy(safetyRows, checkDrawingsSummary, boothViolations)`，新增 `BoothViolationRow` 类型与 `isStandardBooth()`。CenterMap 新增 `boothViolations` prop 并透传给 hook。

### 历史遗留 lint 错误（不要误以为是新 bug）
- src/components/CenterMap.tsx Line 386：safetyCarouselPictures 的 .filter 类型谓词报错（ts 2677），从项目一开始就存在，与本分支改动无关。

### 安全违规整改状态枚举（用户约定：可独立、不必与其他模块统一）
- 安全违规详情专属枚举（7 个）：WAIT_RECTIFY(0,待整改/限时整改)、CANCEL(1,已作废)、RECTIFYED(2,已整改)、NOTONTIME(3,未按时完成/立即整改)、RECTIFY_PART(4,部分整改)、NOT_RECTIFY(5,未整改/专项整改)、REFUSE_RECTIFY(15,拒不整改,后续废弃不用)。
- 权威实现位于 `src/components/Safety/modal/BoothModal.tsx` 的 `RECTIFY_COLORS` / `RECTIFY_LABELS` / `rectifyColor` / `rectifyLabel`（已覆盖全部 7 个，文案与枚举一致）。
- **用户明确：该枚举是安全违规详情专用，可独立于其他模块，不强制与 LeftSidebar 的 `rectifyCheckStatusColor` 等中文硬编码口径统一。** 后续不要为了"一致"而强行合并/改写两边。
