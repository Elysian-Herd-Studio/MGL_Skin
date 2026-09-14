# 云预设接口

新上传的预设默认仅所属账号可见。用户在模组“云预设”或网站“我的皮肤”中开启公开展示后，预设才会进入公开皮肤库。再次上传同名预设会更新内容并保留公开设置。

## 读取预设

| 接口 | 行为 |
| --- | --- |
| `GET /api/skins` | 返回最近更新的最多 100 项公开预设，支持现有的 `q` 与 `kind` 过滤。 |
| `GET /api/account/skins?page=1&q=名称` | 返回当前账号的全部预设，每页 12 项，包括公开与不公开的内容。使用会话 Cookie 或 Minecraft Bearer 令牌登录。 |
| `GET /api/skins/:id` | 公开预设允许匿名读取；不公开预设需要所属账号的会话 Cookie 或 Minecraft Bearer 令牌。无权读取时返回 404。 |

每项预设包含布尔字段 `isPublic`。公开列表响应使用 `Cache-Control: no-store`，个人列表和详情使用 `private, no-store`。

## 上传预设

`POST /api/skins` 使用 Minecraft Bearer 令牌，接收 `{ "name": "名称", "data": "模型 JSON" }`。名称为 1–64 个字符，数据最多 1,000,000 个字符且必须为 JSON 对象。新建时服务端将可见性设为不公开，公开设置通过后续修改接口控制。

成功返回 `{ "id": 1, "name": "名称", "isPublic": false }`；覆盖上传返回原有的公开状态。

## 修改名称或公开状态

`PATCH /api/account/skins/:id` 使用会话 Cookie 或 Minecraft Bearer 令牌，只允许操作所属账号的预设。请求体至少包含 `name` 或 `isPublic` 中的一项：

```json
{ "isPublic": true }
```

`isPublic` 必须为布尔值，`false` 表示仅自己可见；省略的字段保留原值。成功返回 `id`、`name`、`isPublic` 和 `updated_at`。参数错误返回 400，同账号重名返回 409，不存在或无权修改返回 404。

## 数据库升级

正常打开 SQLite 或 PostgreSQL 数据库时，服务端自动补充 `skin_presets.is_public` 字段和公开列表索引。已有预设默认设为不公开，重复打开数据库保留后续设置。旧版客户端上传的新预设也默认不公开；个人云预设管理需要新版客户端。
