# MGL Skin

基于 Nuxt、Vuetify 和 SQLite 的小马皮肤库，支持动态预览、个人资料和管理员控制台。

## 安装与运行

使用 Node.js 22.13 或以上版本运行服务，通过 Bun 安装依赖：

```bash
bun install
```

开发环境：

```bash
bun run dev
```

默认开发地址为 `http://localhost:4300`。

生产环境：

```bash
bun run build
node .output/server/index.mjs
```

生产运行时，通过进程管理器、容器或系统环境变量提供配置。建议将 `NUXT_DATABASE_PATH` 设置为构建目录之外的绝对路径，并持久化该文件所在目录。默认使用当前工作目录下的 `.data/mgl.sqlite`。

## 首次初始化

新安装首次访问网站时会自动进入 `/setup`，需要填写：

- 管理员用户名、邮箱、密码及确认密码。之后使用邮箱与密码登录。
- 站点对外地址，用于生成邮箱验证和密码重置链接。
- 邮件发送方式、服务预设、发件人和相应凭据。

完成后自动登录管理员并进入 `/admin`。管理员已通过邮箱验证，不依赖邮件服务才能首次登录。管理员账户、站点设置和初始化状态会一起保存，完成后关闭初始化入口，重启不会重复初始化。

`NUXT_SESSION_PASSWORD` 可用于提供固定的会话加密密钥，长度至少为 32 个字符。生产环境未设置时，服务会自动生成并持久化到 SQLite，无需手动创建密钥。

已有用户的数据库视为已经初始化，升级不会重新开放管理员创建入口。原有账户、用户组及管理员邮箱白名单继续有效。

## 管理员控制台

- `/admin`：查看用户、管理员、共享皮肤、待验证邮箱数量及邮件配置状态。
- `/admin/users`：搜索用户、调整用户组、修改邮箱验证状态和删除用户。
- `/admin/settings`：修改站点地址、邮件服务，并向当前管理员邮箱发送测试邮件。

控制台页面和管理接口均校验管理员权限。接口从数据库读取当前用户组，管理员被降级后旧会话也无法继续调用管理接口。

## 邮件配置

API 和 SMTP 均提供 Resend 预设，也可以选择自定义服务。

| 发送方式 | Resend 预设 |
| --- | --- |
| API | `https://api.resend.com/emails`，填写 Resend API 密钥 |
| SMTP | `smtp.resend.com`，默认端口 `465`、SSL / TLS，用户名 `resend`，密码为 Resend API 密钥 |

Resend 发件地址需属于已验证域名。测试地址 `onboarding@resend.dev` 只能发送给 Resend 账户邮箱。

自定义 SMTP 支持 SSL / TLS、STARTTLS 和不加密连接；无需认证的服务可同时留空用户名和密码。

自定义 API 使用 HTTP POST、`Authorization: Bearer <密钥>`，接口需支持以下 Resend 兼容 JSON 格式，并通过非成功 HTTP 状态码或 `error` 字段返回失败：

```json
{
  "from": "MGL Skin <hello@example.com>",
  "to": ["user@example.com"],
  "subject": "邮件主题",
  "html": "<p>邮件内容</p>"
}
```

控制台不会返回已保存的 API 密钥或 SMTP 密码。修改设置时，连接地址、端口、加密方式和用户名不变，凭据留空即可沿用原值；切换连接时需要重新输入凭据。

测试邮件使用表单中的当前配置，不会自动保存设置。发送失败会显示错误，不会以控制台输出代替发送成功。

数据库中的设置优先于旧版 `NUXT_RESEND_API_KEY`、`NUXT_MAIL_FROM` 和 `NUXT_PUBLIC_SITE_URL` 环境变量。SQLite 同时保存账户、邮件凭据和自动生成的会话密钥，应放在非公开的持久化目录中。
