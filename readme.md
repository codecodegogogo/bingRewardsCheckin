# Bing rewards 签到

一个基于 ScriptCat 的 Microsoft Rewards 自动任务脚本。

> 本脚本在拿到时已经是多手修改版本，原始作者和初始来源已无法确认。当前版本基于 MIT 许可证继续分发，详见文末说明。

## 一、安装

1. 安装 Chrome 或 Edge。
2. 安装 ScriptCat 脚本管理器。
3. 在 ScriptCat 中新建脚本，粘贴 `rewards-integrated.user.js` 的完整内容并保存。
4. 确认脚本已启用。

## 二、首次授权

1. 登陆你的ms账号
2. ScriptCat中启动脚本
3. 点击手动授权后复制新页面的地址栏
4. 在配置中粘贴授权码

## 三、任务开关

在 ScriptCat 的脚本设置中可以调整：

- 每日签入
- 新闻阅读
- 活动卡片
- 打卡/任务卡片
- 打卡页地址（可选，留空自动查找；每月变化无需手填）
- 打卡：自动打开页面点击（后台点击无效，默认开启）
- Quiz 自动答题
- PC/移动搜索
- 持续检测
- 锁定国区
- 搜索词来源
- 账号备注（通知中显示的账号名，留空则显示「未获取到」）
- 自定义 Webhook（地址、请求方法、认证方式、请求头、请求体）

如果只想先测试，建议先关闭搜索任务，只开启签入和活动卡片。

## 四、手动运行与自动运行

### 手动运行

点击脚本菜单中的 **立即运行**。

手动运行会清除本轮计数，重新从第 1/3 轮开始检查。

### 自动运行

脚本带后台定时配置：

```text
*/20 * * * *
```

也就是每 20 分钟检查一次。任务完成后会记录当日状态，避免重复执行。

## 五、Telegram 通知配置
看这里
https://github.com/codecodegogogo/Glados-Automatic-check-in#%E7%AC%AC-3-%E6%AD%A5%E5%88%9B%E5%BB%BA-telegram-%E6%9C%BA%E5%99%A8%E4%BA%BA

## 六、自定义 Webhook 请求体模板

**推荐使用令牌验证**

Telegram 上收到的消息由三部分组成：

```text
发送时间
脚本名
最终汇总通知
```

在「Webhook → 自定义请求体」里可以用对应的占位符拼出同样的内容：

- `{{time_json}}`：发送时间
- `{{title_json}}`：脚本名
- `{{content_json}}`：最终汇总通知全文

以 ntfy 为例，Webhook 地址填 `https://ntfy.sh`，请求方法选 `POST`，请求格式选 `application/json`，请求体填：

```json
{
  "topic": "bingrewards",
  "title": "{{title_json}}",
  "message": "{{time_json}}\n{{title_json}}\n{{content_json}}"
}
```

这样 Webhook 收到的内容就和 Telegram 上那条一致。如果只想要汇总通知、不要时间和脚本名，把 `message` 改成：

```json
"message": "{{content_json}}"
```

注意：

- `message` 里的 `\n` 要写成反斜杠加 n，不要直接换行，否则 JSON 会断开。
- 脚本没有 `{{message}}` 占位符，正文统一用 `{{content_json}}`；直接写 `{{message}}` 不会被替换。
- `topic` 里的 `lite` 换成你要订阅的主题，然后在 ntfy 客户端订阅同名主题。

### 添加新的 Webhook 服务器

Webhook 地址在脚本设置的「Webhook 地址」里填写。如果这个地址的域名没有在脚本头部声明过，还需要在 `@connect` 列表里加一行：

```js
// @connect      hooks.example.com
```

- 只写主机名，不要写 `https://`，也不要带路径。
- 子域名要写完整，比如 `hooks.example.com`，不要只写 `example.com`。
- 不建议写 `@connect *`，那等于放行所有域名。
- 保存脚本后，ScriptCat 可能会要求确认一次新域名权限。

## 七、MIT 修改声明

本项目基于一份已标注 MIT 许可证的多手修改版本继续维护。

拿到该脚本时，原作者、原始仓库和初始发布地址已经无法确认，因此无法提供准确的原作者署名。当前版本包含大量个人修改、功能调整和问题修复。

在可确认的范围内，本项目继续按 MIT 许可证分发：

```text
MIT License

Copyright (c) original author(s) unknown

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
