# Docker 微服務系統展示

以 Docker + Docker Compose 建置的一個小型微服務系統：瀏覽器請求先經過 **nginx 反向代理**，
再轉給 **Node.js API**，API 向 **PostgreSQL** 讀寫資料，最後由一個**簡易網頁**把整個系統的狀態呈現出來。

---

## 目錄

- [1. 系統架構](#1-系統架構)
- [2. 專案結構](#2-專案結構)
- [3. 快速開始](#3-快速開始)
- [4. Docker 學習筆記](#4-docker-學習筆記)
- [5. 各服務說明](#5-各服務說明)
- [6. 常用指令速查](#6-常用指令速查)
- [7. 疑難排解](#7-疑難排解)

---

## 1. 系統架構

```
                 Docker network: demo-net (bridge)
                 ┌────────────────────────────────────────────┐
  瀏覽器          │                                            │
   :8080  ───────┼──▶  ┌──────────┐   /api/   ┌──────────┐    │
                 │     │  nginx   │ ────────▶ │  Node.js │    │
                 │     │ (proxy + │           │   api    │    │
                 │     │  static) │           └────┬─────┘    │
                 │     └──────────┘                │ SQL      │
                 │                                 ▼          │
                 │                           ┌──────────┐      │
                 │                           │ Postgres │      │
                 │                           └──────────┘      │
                 └────────────────────────────────────────────┘
```

| 服務 | 映像 / 建置 | 角色 | 對外埠 |
|------|-------------|------|--------|
| `nginx` | `nginx:1.27-alpine` | Web server + 反向代理，服務靜態網頁 | `8080` → 容器 `80` |
| `api` | `./api`（自行建置） | Node.js + Express，提供 REST API | 僅內部 `3000` |
| `db` | `postgres:16-alpine` | 資料庫，儲存留言資料 | 僅內部 `5432` |
| `dev` | `.`（自行建置，選用） | Ubuntu 開發環境（Node/Python/Rust） | 不開放 |

> 只有 nginx 對外開放埠號，其餘服務都只在 Docker 內部網路 `demo-net` 互相溝通，
> 這是微服務常見的安全做法。

---

## 2. 專案結構

```
.
├── Dockerfile              # 通用開發環境映像 (Node.js / Python / Rust)
├── docker-compose.yml      # 微服務編排定義
├── .env                    # 資料庫帳密、對外埠號
├── .dockerignore
├── README.md               # 本文件
├── api/                    # Node.js API 服務
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── nginx/
│   └── default.conf        # 反向代理設定
├── web/
│   └── index.html          # 簡易網頁介面（純 HTML/CSS/JS）
└── db/
    └── init.sql            # 資料庫初始化 SQL
```

---

## 3. 快速開始

### 前置需求

- 已安裝 [Docker Desktop](https://www.docker.com/products/docker-desktop/)（含 Docker Compose）
- 確認可用：

```bash
docker --version
docker compose version
```

### 啟動

```bash
# 1. 建置映像並在背景啟動整個系統
docker compose up -d --build

# 2. 確認容器狀態（三個都要是 Up，db 要 healthy）
docker compose ps
```

開啟瀏覽器：<http://localhost:8080>

你會看到一個深色網頁，上面有三張卡片顯示 **nginx / API / PostgreSQL** 的即時狀態，
下方是可新增留言的留言板，資料會存進 PostgreSQL。

### 停止

```bash
docker compose down          # 停止並移除容器（資料保留在 volume）
docker compose down -v       # 連資料庫 volume 一起刪除（資料清空）
```

### 驗證反向代理是否生效

```bash
curl -i http://localhost:8080/api/info
```

回應標頭會出現 `X-Served-By: nginx-reverse-proxy`，代表請求確實先經過 nginx 才轉到 Node.js。

---

## 4. Docker 學習筆記

這節是這份作業的「學會用 Docker 並做記錄」部分。

### 4.1 Docker 是什麼？

- **映像（Image）**：一個唯讀的範本，內含程式 + 執行環境（例如 node:20-alpine、postgres:16）。
- **容器（Container）**：映像執行起來的實例，彼此隔離，可視為輕量級的虛擬機。
- **Dockerfile**：描述如何「建置」映像的腳本。
- **Docker Compose**：用一個 YAML 檔同時定義與啟動多個容器（多服務）。
- **Volume**：讓容器資料持久化（容器刪掉資料還在）。
- **Network**：讓容器之間可以用「服務名稱」互相找到彼此。

### 4.2 常用指令

```bash
# 映像
docker images                 # 列出本機映像
docker build -t myapp .       # 依 Dockerfile 建置映像
docker rmi myapp              # 刪除映像

# 容器
docker ps                     # 列出執行中的容器
docker ps -a                  # 列出所有容器（含已停止）
docker run -d -p 8080:80 nginx  # 跑一個 nginx，把主機 8080 對到容器 80
docker exec -it <容器> bash    # 進入容器內的 shell
docker logs <容器>            # 看容器日誌
docker stop <容器>            # 停止容器
docker rm <容器>              # 刪除容器

# Compose（在含 docker-compose.yml 的目錄執行）
docker compose up -d --build  # 建置並背景啟動
docker compose ps             # 列出此專案的容器
docker compose logs -f api    # 持續追蹤某服務的日誌
docker compose exec api sh    # 進入某服務的 shell
docker compose down           # 停止並移除
```

### 4.3 Dockerfile 常用指令

| 指令 | 用途 |
|------|------|
| `FROM` | 指定基礎映像 |
| `WORKDIR` | 設定容器內工作目錄 |
| `COPY` | 把本機檔案複製進映像 |
| `RUN` | 建置時執行指令（安裝套件等） |
| `ENV` | 設定環境變數 |
| `EXPOSE` | 宣告容器監聽的埠號（文件性質） |
| `CMD` | 容器啟動時執行的指令 |

### 4.4 `docker-compose.yml` 重點語法

```yaml
services:
  api:
    build: ./api              # 用資料夾內的 Dockerfile 建置
    environment:              # 環境變數（連線設定）
      DB_HOST: db             # 用「服務名稱」當主機名
    depends_on:               # 啟動順序（db 健康後才啟動 api）
      db:
        condition: service_healthy
    networks: [demo-net]      # 加入的網路
volumes:                      # 具名 volume（資料持久化）
  db-data:
networks:
  demo-net:
    driver: bridge
```

### 4.5 微服務的關鍵觀念（本專案體現）

1. **每個服務一個容器、各司其職**：nginx 只管流量，api 只管邏輯，db 只管資料。
2. **透過網路名稱互相溝通**：api 用 `db` 當主機名連資料庫，不需知道 IP。
3. **只有前端對外開放埠號**，其餘躲在內部網路，降低攻擊面。
4. **狀態與設定分離**：帳密放 `.env`，資料放 volume，映像本身不含機密。
5. **啟動順序與健康檢查**：用 `healthcheck` + `depends_on` 確保 db 準備好，api 才啟動。

---

## 5. 各服務說明

### nginx（`nginx/default.conf`）

- `location /`：服務 `web/index.html` 等靜態檔。
- `location /api/`：以 `proxy_pass http://api:3000;` 把請求轉給 API 容器。
- 額外回傳 `X-Served-By` 標頭，方便驗證代理確實生效。

### api（`api/server.js`）

以 Express 撰寫，提供：

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/health` | 健康檢查 |
| GET | `/api/info` | 回傳 API（hostname、Node 版本、uptime）與資料庫資訊 |
| GET | `/api/messages` | 取得留言列表 |
| POST | `/api/messages` | 新增留言 `{ "name": "...", "content": "..." }` |

啟動時會自動重試連線資料庫，並在必要時建立 `messages` 資料表。

### db（`db/init.sql`）

- 官方 `postgres:16-alpine` 映像。
- 容器**第一次**啟動時，`/docker-entrypoint-initdb.d/` 內的 `init.sql` 會自動執行，建立資料表並塞入示範資料。
- 資料存在具名 volume `db-data`，`docker compose down` 不會清掉。

### dev（`Dockerfile`，選用）

對應作業第 1 項的通用開發環境，內含 gcc / make / Python3 / Node.js / Rust 工具鏈。
預設不啟動，需要時用 profile 開啟：

```bash
docker compose --profile dev up -d --build
docker compose exec dev bash
python3 --version && node -v && rustc --version
```

---

## 6. 常用指令速查

```bash
docker compose up -d --build     # 建置並啟動全部
docker compose ps                # 看狀態
docker compose logs -f api       # 追 api 日誌
docker compose exec db psql -U appuser -d appdb   # 進資料庫
docker compose exec nginx sh     # 進 nginx 容器
docker compose restart api       # 重啟單一服務
docker compose down              # 關閉（保資料）
docker compose down -v           # 關閉並清空資料
```

---

## 7. 疑難排解

| 症狀 | 原因 / 解法 |
|------|-------------|
| 開 `localhost:8080` 沒反應 | 確認 `docker compose ps` 三個容器都是 Up；nginx 埠可能被占用，改 `.env` 的 `WEB_PORT` |
| 網頁顯示 API「錯誤」 | api 還沒連上 db。稍等幾秒重新整理，或 `docker compose logs api` 看訊息 |
| db 一直不是 healthy | 首次啟動 postgres 初始化較慢；`docker compose logs db` 檢查 |
| 改了 `init.sql` 沒生效 | 初始化只在 volume 為空時執行，需 `docker compose down -v` 再啟動 |
| 中文變亂碼 | 本機終端編碼問題；網頁與資料庫皆為 UTF-8，屬正常 |
| 埠號被占用 | 修改 `.env` 的 `WEB_PORT`（例如改成 8081）後重新 `up -d` |
