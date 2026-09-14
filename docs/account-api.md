# 个人资料接口

修改资料和头像需要已登录的会话 Cookie，只能操作当前账户。成功后返回 `{ "user": { ... } }`，并更新当前会话；`user.avatarUrl` 为头像地址，未设置时为 `null`。

## 修改用户名

`PATCH /api/account`

请求类型为 `application/json`：

```json
{ "username": "new_name" }
```

用户名首尾空白会被去除，格式与注册一致：3–20 位字母、数字、下划线或连字符。名称不区分大小写查重，允许修改自己用户名的大小写。格式错误返回 `400 INVALID_USERNAME`，重名返回 `409 USERNAME_TAKEN`。

## 上传或更换头像

`PUT /api/account/avatar`

请求体为图片文件的二进制内容，`Content-Type` 必须为 `image/png`、`image/jpeg` 或 `image/webp`。文件上限为 2 MiB（2,097,152 字节）。

```js
await fetch('/api/account/avatar', {
  method: 'PUT',
  headers: { 'Content-Type': file.type },
  body: file
})
```

服务器检查文件大小和图片文件头。超出大小限制返回 `413 AVATAR_TOO_LARGE`，不支持的请求类型返回 `415 INVALID_AVATAR_TYPE`，空文件或文件头与类型不符返回 `400 INVALID_AVATAR`。

## 移除头像

`DELETE /api/account/avatar`

无需请求体。成功后 `user.avatarUrl` 为 `null`；重复删除同样成功。

## 获取头像

`GET /api/users/:id/avatar`

公开返回图片内容及对应的 `Content-Type`，支持 ETag 条件请求。用户不存在或尚未设置头像时返回 `404 AVATAR_NOT_FOUND`。使用会话返回的 `avatarUrl` 可在头像变更后刷新图片缓存。

头像保存在现有 SQLite 数据库的 `user_avatars` 表中，应用正常启动时自动创建，已有账户无需手动迁移。更换头像覆盖旧图片，删除用户时头像随账户删除。

## 游戏内账户信息

以下接口使用 `Authorization: Bearer <token>`，令牌由 Minecraft 登录授权流程签发，仅返回令牌所属账户的信息。令牌缺失、失效或过期时返回 `401`。响应均设置 `Cache-Control: private, no-store`。

`GET /api/auth/minecraft/profile` 返回当前名称和头像状态：

```json
{ "username": "current_name", "hasAvatar": true }
```

`GET /api/auth/minecraft/avatar` 返回 `128 × 128` 的 PNG 头像。服务端使用 `sharp` 读取已上传的 PNG、JPEG 或 WebP，按图片方向旋转后居中裁剪，保留透明通道。输入图片上限为 16,777,216 像素；无头像时返回 `404 AVATAR_NOT_FOUND`，图片损坏或超出像素上限时返回 `422 INVALID_AVATAR`。

模组的“编辑用户信息”打开网站 `/account` 页面，浏览器使用自己的登录会话。修改后在游戏账户信息页点击“刷新”，即可读取最新名称和头像。
