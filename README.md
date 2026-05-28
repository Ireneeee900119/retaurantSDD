# restaurantSDD

高可用性、高併發餐飲點餐與管理平台。  
目前版本已完成 Phase 1 MVP，並加入 Phase 2/3 的高併發基礎：Redis 快取、BullMQ 非同步下單佇列、idempotency 防重複提交、health check、Docker Compose 一鍵啟動。

## 目前架構

```text
Browser
  |
  v
React + Vite frontend :5173
  |
  v
NestJS API :3000
  |         \
  |          -> Redis :6379
  |              - menu cache
  |              - BullMQ order queue
  |
  v
PostgreSQL :5432
```

核心能力：

- 菜單瀏覽：Redis 快取 `GET /api/v1/menu`
- 非同步下單：`POST /api/v1/orders` 先回 `QUEUED`，worker 背景寫入 DB
- 防重複下單：每筆訂單帶 `idempotencyKey`
- 高峰保護：queue 過深時回 `503`，避免系統被打爆
- 健康檢查：`GET /api/v1/health`

## 快速啟動

需要先打開 Docker Desktop。

```bash
cd /Users/linminrou/restaurantSDD
docker compose up -d --build
docker compose exec backend npx prisma db push
docker compose exec backend node dist/prisma/seed.js
```

開啟前端：

```text
http://localhost:5173
```

查看服務狀態：

```bash
docker compose ps
```

查看 logs：

```bash
docker compose logs -f
```

停止服務：

```bash
docker compose down
```

## Demo 流程

1. 打開 `http://localhost:5173`
2. 進入菜單頁
3. 加入品項到購物車
4. 送出訂單
5. 系統會產生訂單編號，例如 `ORD-XXXX`
6. 到追蹤頁輸入訂單編號查詢狀態

後端會使用 async order mode：

- API 收到訂單後快速回 `QUEUED`
- BullMQ worker 背景建立正式訂單
- 再查一次訂單會看到 `RECEIVED`

## 常用 API

健康檢查：

```bash
curl http://localhost:3000/api/v1/health
```

取得菜單：

```bash
curl http://localhost:3000/api/v1/menu
```

建立訂單：

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "idempotencyKey": "demo-order-001",
    "items": [
      { "menuItemId": "請替換成菜單 API 回傳的 item id", "quantity": 1 }
    ],
    "customerNote": "少冰"
  }'
```

查詢訂單：

```bash
curl http://localhost:3000/api/v1/orders/ORD-XXXX
```

店員更新狀態：

```bash
curl -X PATCH http://localhost:3000/api/v1/staff/orders/ORD-XXXX/status \
  -H "Content-Type: application/json" \
  -d '{"status":"PREPARING"}'
```

## 高併發測試

執行完整壓測：

```bash
node scripts/load-test-ha.mjs
```

壓測涵蓋四種情境：

1. 大量使用者同時瀏覽菜單
2. 大量使用者同時送出訂單
3. 使用者重複點擊送出
4. 尖峰超過容量時觸發 backpressure

可調整 API 位址：

```bash
API_BASE_URL=http://127.0.0.1:3000/api/v1 node scripts/load-test-ha.mjs
```

## 目前實測 Capacity

測試環境：本機 Docker Desktop、單一 backend instance、PostgreSQL、Redis、`ORDER_WORKER_CONCURRENCY=4`、`MAX_ORDER_QUEUE_DEPTH=1000`。

| 場景 | 實測結果 | 結論 |
|---|---:|---|
| 菜單讀取 | 500 concurrent，0 error | Redis 快取有效 |
| 菜單吞吐 | 約 600-1000 req/s | 適合大量瀏覽 |
| 下單收件 | 50 concurrent，0 error | 穩定收進 queue |
| 下單吞吐 | 約 300-430 accepted orders/s | API 可快速收單 |
| 實際 DB 寫入 | 約 50-70 orders/s | worker/DB 是主要瓶頸 |
| 重複送出 | 100 concurrent 同 key，0 error | 只產生 1 筆訂單 |
| 超載保護 | 500 concurrent / 1500 orders | 回 `503`，系統不崩 |

重要解讀：

- `503` 在 backpressure 測試中是預期行為，不是系統壞掉。
- 高併發下最重要的是「不崩、不漏單、不重複下單」。
- 目前安全 demo 區間：`500` 人同時看菜單、`50` 人同時送出訂單。

## 高可用與擴展方向

下一階段建議：

1. 加 nginx/load balancer
2. 啟動多個 backend replicas
3. 拆 `DATABASE_WRITE_URL` / `DATABASE_READ_URL` 到 primary + read replica
4. 提高 `ORDER_WORKER_CONCURRENCY`，並觀察 Postgres CPU/lock
5. 加 Prometheus/Grafana 或 cloud monitoring

## 專案結構

```text
backend/                 NestJS API
frontend/                React + Vite frontend
scripts/load-test-ha.mjs 高併發壓測腳本
specs/002-platform-arch/ Spec Kit 架構文件
docker-compose.yml       Postgres + Redis + backend + frontend
```

## Troubleshooting

Docker daemon 沒開：

```text
Cannot connect to the Docker daemon
```

解法：先打開 Docker Desktop，再重跑 `docker compose up -d --build`。

資料表不存在：

```bash
docker compose exec backend npx prisma db push
```

菜單沒有資料：

```bash
docker compose exec backend node dist/prisma/seed.js
```

查看 queue 狀態：

```bash
curl http://localhost:3000/api/v1/health
```

