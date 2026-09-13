模型、贴图、动画和挑染分区来自 `Magical-Land/src/main/resources/assets/magicaland`，保留原始文件与 MIT 许可（见 `LICENSE.txt`）。

网页预览在 `app/utils/pony` 中读取这些资源，按 Magical Land 的身体色阶、鬃毛分区、眼部配色和 12×12 可爱标志规则生成材质，并播放待机、眨眼、尾巴及耳朵动画。更新资源时请同步模型、两张贴图、动画及全部挑染分区。

Bedrock 模型的坐标、箱式 UV 与逐面 UV 转换参考 GeckoLib 4.8.3 的模型加载实现，其 MIT 许可见 `GECKOLIB-LICENSE.txt`。
