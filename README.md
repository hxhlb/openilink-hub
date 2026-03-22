# OpenILink Hub

多 Bot 管理与消息中继系统。通过扫码绑定微信 Bot，将消息实时转发给下游服务。

## 快速开始

```bash
docker compose up -d
```

访问 `http://localhost:9800`，首个注册用户自动成为管理员。

## 部署

### Docker Compose（推荐）

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: openilink
      POSTGRES_PASSWORD: <改为强密码>
      POSTGRES_DB: openilink
    volumes:
      - pgdata:/var/lib/postgresql/data

  hub:
    build: .
    ports:
      - "9800:9800"
    environment:
      DATABASE_URL: postgres://openilink:<密码>@postgres:5432/openilink?sslmode=disable
      RP_ORIGIN: https://hub.example.com    # 必须与实际访问地址一致
      RP_ID: hub.example.com                # 域名部分
      SECRET: <随机字符串>
      # OAuth（可选，见下方配置说明）
      # GITHUB_CLIENT_ID: ...
      # GITHUB_CLIENT_SECRET: ...
      # LINUXDO_CLIENT_ID: ...
      # LINUXDO_CLIENT_SECRET: ...
    depends_on:
      - postgres

volumes:
  pgdata:
```

前面加 nginx / Caddy 做 HTTPS 反代，将 443 转发到 9800。

### 直接运行

```bash
# 构建前端
cd web && npm ci && npm run build && cd ..

# 构建后端
go build -o openilink-hub .

# 运行
DATABASE_URL="postgres://user:pass@localhost:5432/openilink" \
RP_ORIGIN="https://hub.example.com" \
RP_ID="hub.example.com" \
SECRET="$(openssl rand -hex 32)" \
./openilink-hub
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LISTEN` | `:9800` | 监听地址 |
| `DATABASE_URL` | `postgres://localhost:5432/openilink` | PostgreSQL 连接串 |
| `RP_ORIGIN` | `http://localhost:9800` | 站点源地址，必须与浏览器访问地址一致（含协议） |
| `RP_ID` | `localhost` | WebAuthn RP ID，通常为域名 |
| `RP_NAME` | `OpenILink Hub` | 站点显示名称 |
| `SECRET` | `change-me-in-production` | 服务端密钥，生产环境必须修改 |
| `GITHUB_CLIENT_ID` | — | GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET` | — | GitHub OAuth Client Secret |
| `LINUXDO_CLIENT_ID` | — | LinuxDo OAuth Client ID |
| `LINUXDO_CLIENT_SECRET` | — | LinuxDo OAuth Client Secret |

## 配置 OAuth 登录

OAuth 为可选功能。配置后用户可使用第三方账号登录或绑定到已有账号。

### GitHub

1. 前往 [GitHub Developer Settings](https://github.com/settings/developers) → OAuth Apps → New OAuth App
2. 填写：
   - **Application name**: OpenILink Hub（随意）
   - **Homepage URL**: `https://hub.example.com`
   - **Authorization callback URL**: `https://hub.example.com/api/auth/oauth/github/callback`
3. 创建后获取 Client ID 和 Client Secret
4. 设置环境变量 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET`

### LinuxDo

1. 前往 [connect.linux.do](https://connect.linux.do) 创建应用
2. 回调地址填：`https://hub.example.com/api/auth/oauth/linuxdo/callback`
3. 获取 Client ID 和 Client Secret
4. 设置环境变量 `LINUXDO_CLIENT_ID` 和 `LINUXDO_CLIENT_SECRET`

### 注意事项

- 回调地址格式固定为 `{RP_ORIGIN}/api/auth/oauth/{provider}/callback`
- `RP_ORIGIN` 必须与实际访问地址完全一致（包括协议和端口）
- 未配置 Client ID 的 provider 不会出现在登录页
- 已登录用户可在「设置」页面绑定/解绑第三方账号

## 架构

```
用户 → 扫码绑定 Bot → Bot 收到微信消息 → 按 Channel 规则过滤 → WebSocket 推送到下游服务
                                                              ↑
                                          Channel (API Key 认证，可配过滤规则)
```

### Provider 扩展

Bot 连接通过 Provider 接口抽象（`internal/provider/`），当前实现了 iLink provider。新增 provider 只需：

1. 在 `internal/provider/<name>/` 下实现 `provider.Provider` 接口
2. 在 `init()` 中调用 `provider.Register("name", factory)`
3. 在 `main.go` 中 `import _ ".../<name>"` 注册

## License

MIT
