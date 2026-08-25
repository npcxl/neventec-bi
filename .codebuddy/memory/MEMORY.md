# 项目长期记忆 (MEMORY.md)

## 现场安全 / 搭建信息概览 关键约定

### 地图序号徽章 (boothBadges) 的正确数据源
- 逻辑：用"搭建进度明细最新进程"(progressRows.latestLine 等) 去匹配"搭建进程悬浮卡片步骤"(exhibitionProcessData)，匹配上显示序号。
- **currentStageSteps（地图序号步骤）必须由 exhibitionProcessData 驱动**，不要再用 `getCurrentStageConstructProcess`(= getExhibitionProcess，带 hallId 返回空)。
- exhibitionProcessData 来自 `getExhibitionProcessDetail`（支持 hallId，选展馆时有值）。
- currentStageSteps 仅用于地图序号徽章（无其他消费方）。

### 缓存陷阱（重要！已踩坑）
- 现场安全/搭建有 "60s 切换缓存"(moduleFetchCacheRef)。命中缓存时走 `refreshFromCache`，只恢复缓存里**显式存储**的字段。
- 任何需要跨"选展馆"持久化的 state，必须：① 在 fetch 后写进 `saveCache`，② 在 `refreshFromCache` 里恢复。否则刷新/切馆后该字段会丢（表现为"第一次有、切回来没有"）。
- 已知漏存过的字段：currentStageSteps。已修复：background .then 里 setCurrentStageSteps(exhibitionProcessData) 并写入 saveCache；refreshFromCache 增加恢复。

### 关键工序符号（现场安全选展馆）
- 接口 `a/api/checkDrawings/summary/list`(exhibitionId 必填, hallId 可选)。
- 字段映射：structureType 含"双层"→▲(#7DE3F7)、complexEngineering 含"复杂"→△(#FA8C16)、liftingPoint 含"包含"(吊点)→⊙(#2563EB)。riskAssessment 不显示。
- 渲染：HallMap 新增 boothMarks prop，绘在展位右上角无背景色。CenterMap 仅在 moduleMode==="SafetyOverview" 时传。

### 历史遗留 lint 错误（不要误以为是新 bug）
- src/components/CenterMap.tsx Line 386：safetyCarouselPictures 的 .filter 类型谓词报错（ts 2677），从项目一开始就存在，与本分支改动无关。
