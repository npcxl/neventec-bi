# neventec-bi API 参考文档

## 概述

API 基础路径由环境变量 `VITE_EHS_API_BASE_URL` 控制，默认 `/ehs-api`。
开发环境通过 Vite proxy 代理到 `https://glsz.s.369zhan.com`。

## 通用请求函数

文件：`src/api.ts`

```typescript
function request<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>
```

- 支持 GET/POST，内置自动重试（最多 4 次，间隔 1.2s/2.4s/3.6s/4.8s）
- 可重试状态码：404, 408, 429, 500, 502, 503, 504
- 支持 AbortSignal 取消请求

## 全部 API 接口列表

### 第一部分：展会信息概览

| 方法名 | 路径 | 说明 |
|--------|------|------|
| `getGalleryInfo(expoid, signal?)` | `a/api/gallery/galleryInfo` | 获取所有展馆信息 |
| `getGalleryInfoByHallId(hallId, signal?)` | `a/api/gallery/galleryInfo` | 获取指定展馆信息 |
| `getSceneBoothPageInfo(expoid, signal?)` | `a/api/sceneBoothNumber/pageInfo` | 特装展会申报情况（全部） |
| `getSceneBoothPageInfoByHallId(expoid, hallId, signal?)` | `a/api/sceneBoothNumber/pageInfo` | 特装展会申报情况（按展馆） |
| `getSceneBoothInfoByBoothNo(expoid, hallId, signal?)` | `a/api/sceneBoothNumber/pageInfo` | 按展位号查询 |
| `getSceneBoothDeclareType(expoid, signal?)` | `a/api/order/orderCollect` | 获取申报类别统计 |
| `getSceneBoothDeclareTypeByHallId(expoid, hallId, signal?)` | `a/api/order/orderCollect` | 获取申报类别展馆统计 |
| `getBoothScreenDetail(exhibitionId, boothNo, signal?)` | `a/api/booth/progress/screen/booth` | 中部大屏对应展位详情 |
| `getBoothExpense(expoid, signal?)` | `a/api/sceneBoothNumber/expense` | 展位费用缴纳 |
| `getBoothExpenseByHallId(expoid, hallId, signal?)` | `a/api/sceneBoothNumber/expense` | 指定展馆费用缴纳 |
| `getOrderCollect(expoid, signal?)` | `a/api/order/orderCollect` | 水电气网络申报 |
| `getOrderCollectByHallId(expoid, hallId, signal?)` | `a/api/order/orderCollect` | 指定展馆水电气网络申报 |

### 第二部分：安全信息概览

| 方法名 | 路径 | 说明 |
|--------|------|------|
| `getSafetyCollect(expoid, signal?)` | `a/api/safety/safetyHeader/collect` | 查处违规汇总 |
| `getSafetyCollectByHallId(expoid, hallId, signal?)` | `a/api/safety/safetyHeader/collect` | 指定展馆违规汇总 |
| `getSafetyPageInfo(expoid, signal?)` | `a/api/safety/safetyHeader/pageInfo` | 现场违规记录 |
| `getSafetyPageInfoByHallId(expoid, hallId, signal?)` | `a/api/safety/safetyHeader/pageInfo` | 指定展馆违规记录 |
| `getSafetyScreenBooth(expoid, hallId, boothNo?, signal?)` | `a/api/booth/progress/safetyScreen/booth` | 中部大屏安全数据 |
| `getViolationType(exhibitionId, signal?)` | `a/safety/safetyHeader/summary/getViolationType` | 违规风险等级 |
| `getViolationTypeByHallId(exhibitionId, hallId, signal?)` | `a/safety/safetyHeader/summary/getViolationType` | 指定展馆违规风险等级 |
| `getViolationRecord(exhibitionId, signal?)` | `a/safety/safetyHeader/summary/getViolationRisk` | 违规类型统计 |
| `getViolationRecordByHallId(exhibitionId, hallId, signal?)` | `a/safety/safetyHeader/summary/getViolationRisk` | 指定展馆违规类型统计 |
| `getViolationPictureByHallId(exhibitionId, signal?)` | `a/safety/safetyHeader/summary/getViolationRecord` | 现场违规图片（总览） |
| `getViolationPictureByHallIdAndBoothNo(exhibitionId, hallId, signal?)` | `a/safety/safetyHeader/summary/getViolationRecord` | 现场违规图片（指定展馆） |
| `getViolationPicture(exhibitionId, hallId, boothNo, signal?)` | `a/safety/safetyHeader/summary/getViolationRecord` | 点击图表弹出违规图片 |
| `getViolationSituation(exhibitionId, signal?)` | `a/safety/safetyHeader/summary/getRectificationSituation` | 违规整改情况 |
| `getRectificationSituationByHallId(exhibitionId, hallId, signal?)` | `a/safety/safetyHeader/summary/getRectificationSituation` | 指定展馆违规整改情况 |

### 第三部分：搭建信息概览

| 方法名 | 路径 | 说明 |
|--------|------|------|
| `getConstructOverview(exhibitionId, signal?)` | `a/api/booth/progress/summary/getConstructOverview` | 搭建情况总览 |
| `getConstructOverviewByHallId(exhibitionId, hallId, signal?)` | `a/api/booth/progress/summary/getConstructOverview` | 指定展馆搭建总览 |
| `getConstructProcess(exhibitionId, signal?)` | `a/api/inspection/record/summary/all` | 搭建进程明细 |
| `getConstructProcessByHallId(exhibitionId, hallId, signal?)` | `a/api/inspection/record/summary/all` | 指定展馆搭建进程明细 |
| `getConstructProcessByHallIdAndBoothNo(exhibitionId, hallId, boothNo, signal?)` | `a/api/inspection/record/summary/all` | 指定展位搭建进程明细 |
| `getConstructProcessByHallInfo(exhibitionId, hallId, boothNo, signal?)` | `/a/api/inspection/record/summary/info` | 搭建进程明细（info 版本） |
| `getScreenStatistics(hallId, signal?)` | `a/safety/safetyHeader/summary/getScreenStatistics` | 中部大屏统计 |
| `getConstructRecord(exhibitionId, signal?)` | `a/api/inspection/record/summary/getConstructRecord` | 展位搭建记录统计 |
| `getConstructRecordPage(exhibitionId, pageNum, pageSize, signal?)` | `a/api/inspection/record/summary/getConstructRecord/page` | 分页查询搭建记录 |
| `getConstructRecordByHallId(exhibitionId, hallId, signal?)` | `a/api/inspection/record/summary/getConstructRecord` | 指定展馆搭建记录 |
| `getBoothProgressPictureByBoothId(exhibitionId, boothId, signal?)` | `a/api/inspection/record/summary/getConstructRecord` | 展位搭建记录图片 |
| `getMaterialStatistics(exhibitionId, signal?)` | `a/api/booth/progress/summary/getMaterialStatistics` | 主体结构材质统计 |
| `getMaterialStatisticsByHallId(exhibitionId, hallId, signal?)` | `a/api/booth/progress/summary/getMaterialStatistics` | 指定展馆材质统计 |
| `getBoothProcess(exhibitionId, signal?)` | `a/api/inspection/record/summary/getBoothProgress` | 展位进程情况 |
| `getBoothProcessByHallId(exhibitionId, hallId, signal?)` | `a/api/inspection/record/summary/getBoothProgress` | 指定展馆展位进程 |
| `getExhibitionProcess(exhibitionId, signal?)` | `a/api/inspection/record/summary/getExhibitionProcess` | 展会进程情况（完成率） |
| `getExhibitionProcessByHallId(exhibitionId, hallId, signal?)` | `a/api/inspection/record/summary/getExhibitionProcess` | 指定展馆展会进程 |
| `getBoothDetail(exhibitionId, hallId, boothId, signal?)` | `a/api/booth/progress/screen/booth` | 获取展位详情 |
| `getBoothProgressPicture(exhibitionId, signal?)` | `a/api/inspection/record/summary/getConstructRecord` | 展位搭建记录统计图片 |
| `getBoothProgressPictureByHallId(exhibitionId, hallId, signal?)` | `a/api/inspection/record/summary/getConstructRecord` | 指定展馆搭建记录图片 |
| `getBoothProgressPictureByDetailBoothId(exhibitionId, boothNo, hallId, signal?)` | `a/api/inspection/record/summary/getConstructRecord` | 指定展位搭建记录图片 |
| `getSafetyCoordByHallId(hallId, signal?)` | `a/api/safety/coord/ByHallId` | 展厅可视化坐标数据 |

## 命名约定

- 大部分接口都有「全局」和「按展馆」两个版本
- 全局版本参数：`exhibitionId/expoid`
- 按展馆版本参数：`exhibitionId/expoid, hallId`
- 按展位版本参数：`exhibitionId/expoid, hallId, boothNo/boothId`
