// ==UserScript==
// @name         Bing rewards 签到
// @namespace    https://rewards.bing.com/
// @version      1.7
// @description  每天在后台自动完成 Microsoft Rewards 任务
// @author       leon
// @icon         https://bing.com/th?id=OMR.icon-96.png&pid=Rewards
// @license      MIT
// @crontab      */20 * * * *
// @background
// @connect      bing.com
// @connect      login.live.com
// @connect      rewards.bing.com
// @connect      prod.rewardsplatform.microsoft.com
// @connect      hotapi.nntool.cc
// @connect      hot.baiwumm.com
// @connect      cnxiaobai.com
// @connect      disp-qryapi.3g.qq.com
// @connect      qyapi.weixin.qq.com
// @connect      oapi.dingtalk.com
// @connect      open.feishu.cn
// @connect      push.i-i.me
// @connect      api.day.app
// @connect      api.telegram.org
// @connect      instabox.tech
// @match        https://login.live.com/oauth20_desktop.srf*
// @match        https://rewards.bing.com/*
// @match        https://www.bing.com/*
// @match        https://cn.bing.com/*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_cookie
// @grant        GM_info
// @grant        GM_log
// @grant        GM_registerMenuCommand
// @storageName  BingRewardsAuto_Shared
// ==/UserScript==

/* global GM_cookie, GM_getValue, GM_setValue, GM_addValueChangeListener, GM_xmlhttpRequest, GM_log, GM_info, GM_notification, GM_openInTab, unsafeWindow */

/* ==UserConfig==
Config:
    keep:
        title: 持续检测（全部完成后是否继续）
        type: checkbox
        default: true
    accountLabel:
        title: 账号备注
        type: text
        description: 通知中显示的账号名，留空则显示「未获取到」
    lock:
        title: 锁定国区（非大陆IP自动停止）
        type: checkbox
        default: true
    span:
        title: 搜索间隔（秒）
        type: number
        default: 30
        min: 30
        unit: ±15秒
    api:
        title: 搜索词接口（offline为随机搜索词）
        type: select
        default: offline
        values: [offline, hot.nntool.cc, hot.baiwumm.com, hot.cnxiaobai.com]
    code:
        title: 授权码链接
        type: textarea
        description: 粘贴 login.live.com 跳转后的完整URL
Tasks:
    sign:
        title: 每日签入
        type: checkbox
        default: true
    read:
        title: 新闻阅读
        type: checkbox
        default: true
    promos:
        title: 活动卡片
        type: checkbox
        default: true
    punchcard:
        title: 打卡/任务卡片
        type: checkbox
        default: true
    punchcardUrl:
        title: 打卡页地址（可选，留空自动查找）
        type: text
        description: 打卡页地址每月会变，一般留空即可；脚本会自动查找本月入口
    punchcardAutoOpen:
        title: 打卡：自动打开页面点击（后台点击无效）
        type: checkbox
        default: true
    quiz:
        title: Quiz 自动答题
        type: checkbox
        default: true
    search:
        title: PC/移动搜索
        type: checkbox
        default: true
Notice:
    bro:
        title: 浏览器通知（当前脚本）
        type: checkbox
        default: true
    wework:
        title: 企业微信消息推送（群机器人）
        type: text
        password: true
        description: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    dingding:
        title: 钉钉群机器人（不加签，关键词：#）
        type: text
        password: true
        description: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    feishu:
        title: 飞书群机器人（不加签，关键词：#）
        type: text
        password: true
        description: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    pushme:
        title: PushMe（push.i-i.me）
        type: text
        password: true
        description: xxxxxxxxxxxxxxxxxxxx
    bark:
        title: Bark（bark.day.app）
        type: text
        password: true
        description: xxxxxxxxxxxxxxxxxxxx
    telegramToken:
        title: Telegram Bot Token
        type: text
        password: true
        description: 通过 @BotFather 创建机器人后获取，例如 123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    telegramChatId:
        title: Telegram Chat ID
        type: text
        description: 先给机器人发一条消息，再通过 @userinfobot 获取数字 ID
Webhook:
    enabled:
        title: 启用自定义 Webhook
        type: switch
        default: false
    url:
        title: Webhook 地址
        type: text
        description: '接收通知的完整 URL，支持 {{content_url}} 等占位符'
    method:
        title: 请求方法
        type: select
        default: POST
        values: [POST, GET, PUT]
    contentType:
        title: 请求格式
        type: select
        default: application/json
        values: [application/json, application/x-www-form-urlencoded]
    authType:
        title: 认证方式
        type: select
        default: 不使用
        values: [不使用, 密码登录, 账号登录, 令牌]
    username:
        title: 账号
        type: text
        description: 认证方式选「账号登录」时填写
    password:
        title: 密码
        type: text
        password: true
        description: 认证方式选「密码登录」或「账号登录」时填写
    token:
        title: 令牌
        type: text
        password: true
        description: 认证方式选「令牌」时填写，作为 Bearer Token 发送
    headers:
        title: 自定义请求头（JSON）
        type: textarea
        description: '例如 {"X-Custom": "value"}，留空则不添加'
    body:
        title: 自定义请求体
        type: textarea
        description: '支持 {{title}}、{{content}}、{{time}}、{{script}}；留空则发送默认 JSON'
==/UserConfig== */

(function() {
    'use strict';

    // 授权码自动捕获
    if (typeof location !== "undefined" && location.hostname === "login.live.com" && location.pathname === "/oauth20_desktop.srf") {
        const code = new URLSearchParams(location.search).get("code");
        if (code) {
            GM_setValue("Config.code", location.href);
            GM_setValue("Config.token", false);
            GM_notification({ title: "🟢 授权成功", text: "授权码已捕获，可关闭此页" });
            try { history.replaceState({}, "", "about:blank"); } catch(_) {}
            setTimeout(() => { try { window.close(); } catch(_) {} }, 200);
        }
        return;
    }

    const RewardsAuto = {
        // UA: pc=Edge桌面, mobile=Edge移动, app=BingSapphire真机抓包
        ua: {
            pc: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
            mobile: "Mozilla/5.0 (Linux; Android 16; Redmi K20 Pro Build/BP4A.251205.006; ) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.132 Mobile Safari/537.36 EdgA/131.0.0.0",
            // App 端 UA（来自真实抓包数据，Redmi K20 Pro + BingSapphire）
            app: "Mozilla/5.0 (Linux; Android 16; Redmi K20 Pro Build/BP4A.251205.006; ) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.132 Mobile Safari/537.36 BingSapphire/32.6.2110003560",
        },
        appConfig: {
            rewardsAppId: "SAAndroid/32.6.2110003560",
            channel: "SAAndroid",                       // 渠道：Android 版 Bing App
            offerIds: {
                dailyCheckIn: "Gamification_Sapphire_DailyCheckIn",  // 每日签到标识
                readArticle: "ENUS_readarticle3_30points",           // 阅读任务标识
            }
        },
        searchPool: [
            "what is the weather forecast tomorrow",
            "how do I make sourdough bread at home",
            "where can I find cheap flights to tokyo",
            "why is the sky blue scientific explanation",
            "how to learn rust programming in 2026",
            "what time does the world cup final start",
            "how to fix a leaky kitchen faucet step by step",
            "what are the best vr games of 2026",
            "how to start a vegetable garden in spring",
            "where to watch new movies this week",
            "how to take care of a bonsai tree",
            "what is the difference between python async and threading",
            "how to meditate properly for beginners",
            "what is the origin of halloween traditions",
            "how do solar panels actually work",
            "what is the best mechanical keyboard for typing",
            "how to tie a windsor knot tie",
            "what causes northern lights aurora borealis",
            "how to brew the perfect espresso at home",
            "what are the symptoms of vitamin d deficiency",
            "how to sleep better naturally tonight",
            "why do cats purr when they are happy",
            // 地点/新闻/购物意图
            "best coffee shops in san francisco downtown",
            "italian restaurants near times square",
            "tokyo cherry blossom season 2026 forecast",
            "rtx 5070 ti benchmark vs rtx 4080 super",
            "iphone 17 release date and features",
            "tesla stock price today nasdaq",
            "best noise cancelling headphones under 300",
            "fastest electric cars 0 to 60 mph",
            "vintage camera brands collectors guide",
            "budget gaming laptop with rtx 4070 2026",
            // 操作指南/食谱
            "easy chocolate chip cookies recipe from scratch",
            "30 minute home workout routine no equipment",
            "stretching exercises for lower back pain relief",
            "easy origami crane folding instructions",
            "git rebase vs merge which one to use",
            "markdown cheat sheet with examples",
            "japanese hiragana chart pronunciation",
            "ancient rome history quick overview",
            "pomodoro technique for focus and productivity",
            "healthy breakfast ideas under 10 minutes",
            // 中文搜索词
            "天气预报", "今日新闻热点", "美食食谱家常菜", "旅游攻略", "健康养生知识",
            "科技资讯", "电影推荐", "股票行情", "体育赛事", "历史上的今天"
        ],
        // 热搜API配置
        apiConfig: {
            mode: GM_getValue("Config.api", "offline"),
            arr: [
                ["hot.baiwumm.com", {
                    url: "https://hot.baiwumm.com/api/",
                    hot: ["weibo", "douyin", "baidu", "toutiao", "thepaper", "qq", "netease", "zhihu"],
                }],
                ["hot.cnxiaobai.com", {
                    url: "https://cnxiaobai.com/DailyHotApi/",
                    hot: ["weibo", "douyin", "baidu", "toutiao", "thepaper", "qq-news", "netease-news", "zhihu"],
                }],
                ["hot.nntool.cc", {
                    url: "https://hotapi.nntool.cc/",
                    hot: ["weibo", "douyin", "baidu", "toutiao", "thepaper", "qq-news", "netease-news", "zhihu"],
                }],
            ],
            url: "",
            hot: [],
            wordList: [],
            wordIndex: 0,
        },
        skipPatterns: [
            "referral", "refer and earn", "sweepstake", "entries",
            "install the", "set bing as your default", "bing wallpaper",
            "punch card", "ancient coin", "sea of thieves", "rewards extension",
            "redemption goal", "order history", "claim your gift", "shop to earn",
            "set goal", "Available tomorrow", "Offer is Locked", "Earn -1 points"
        ],
        skipHrefs: [
            "sweepstakes/", "referandearn", "aka.ms/win", "workinprogress",
            "punchcard", "microsoft-store", "goal/all", "orderhistory",
            "/redeem", "/redeemgoal", "xbox.com/rewards"
        ],
        state: {
            token: false,
            region: "CN",
            host: "www.bing.com",
            dateNowNum: 0,
            dateNowStr: "",
            pcProgress: 0,
            pcMax: 90,
            mobileProgress: 0,
            mobileMax: 60,
            sendMSG: "",
            lastSearchProgress: -1,
            restrictedTimes: 0,
            ip: "",
            ipInfo: "",
            startTime: 0,
            accountName: "",
        }
    };

    const Webhooks = [
        {
            name: "企业微信",
            url: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=",
            key: GM_getValue("Notice.wework", false),
            msg: {
                "msgtype": "text",
                "text": {
                    get content() {
                        return `> ${new Date().toLocaleString()}\n\n ## ${GM_info.script.name}\n ${RewardsAuto.state.sendMSG}`
                    }
                },
            },
        },
        {
            name: "钉钉",
            url: "https://oapi.dingtalk.com/robot/send?access_token=",
            key: GM_getValue("Notice.dingding", false),
            msg: {
                "msgtype": "markdown",
                "markdown": {
                    "title": GM_info.script.name,
                    get text() {
                        return `> ${new Date().toLocaleString()}\n ### ${GM_info.script.name}\n ${RewardsAuto.state.sendMSG}`
                    }
                },
            },
        },
        {
            name: "飞书",
            url: "https://open.feishu.cn/open-apis/bot/v2/hook/",
            key: GM_getValue("Notice.feishu", false),
            msg: {
                "msg_type": "interactive",
                "card": {
                    "schema": "2.0",
                    "header": {
                        "title": {
                            "tag": "plain_text",
                            "content": GM_info.script.name
                        },
                        "template": "orange"
                    },
                    "body": {
                        "elements": [{
                            "tag": "markdown",
                            "text_align": "center",
                            get content() {
                                return `#### ${new Date().toLocaleString()}\n ${RewardsAuto.state.sendMSG}`
                            }
                        }]
                    }
                }
            },
        },
        {
            name: "PushMe",
            url: "https://push.i-i.me/?push_key=",
            key: GM_getValue("Notice.pushme", false),
            msg: {
                "type": "markdown",
                "title": `${GM_info.script.name}[#rewards!https://rewards.bing.com/rewards.png]`,
                get content() {
                    return `\n ${RewardsAuto.state.sendMSG}`
                }
            },
        },
        {
            name: "Bark",
            url: "https://api.day.app/",
            key: GM_getValue("Notice.bark", false),
            msg: {
                "group": "rewards",
                "icon": "https://rewards.bing.com/rewards.png",
                "title": GM_info.script.name,
                get markdown() {
                    return `\n ${RewardsAuto.state.sendMSG}`
                }
            },
        },
        {
            name: "Telegram",
            type: "telegram",
            url: "https://api.telegram.org/bot",
            get key() {
                return GM_getValue("Notice.telegramToken", "");
            },
            get chatId() {
                return String(GM_getValue("Notice.telegramChatId", "")).trim();
            },
            msg: {
                disable_web_page_preview: true,
                get chat_id() {
                    return String(GM_getValue("Notice.telegramChatId", "")).trim();
                },
                get text() {
                    return `${new Date().toLocaleString()}\n${GM_info.script.name}\n${RewardsAuto.state.sendMSG}`;
                }
            }
        },
    ];

    const Utils = {
        // 日志输出（带通知支持）
        log(icon, msg, push = false) {
            GM_log(`${icon} ${msg}`);
            if (push && GM_getValue("Notice.bro", true)) {
                GM_notification({
                    title: GM_info.script.name + ` ${icon}`,
                    text: msg,
                    onclick: () => GM_openInTab("https://rewards.bing.com/dashboard", { active: true })
                });
            }
            // 发送到外部通知接口
            if (push) {
                RewardsAuto.state.sendMSG = `${icon} ${msg}`;
                return this.sendWebhook();
            }
        },

        // 今日累计统计（持久化，按日期自动重置）
        getTodayStats() {
            const today = Utils.getTodayNum();
            const stats = GM_getValue("Config.todayStats", null);
            if (!stats || stats.date !== today) {
                return { date: today, promosClaimed: 0, readCount: 0, warnings: [] };
            }
            stats.promosClaimed = stats.promosClaimed || 0;
            stats.readCount = stats.readCount || 0;
            if (!Array.isArray(stats.warnings)) stats.warnings = [];
            return stats;
        },
        saveTodayStats(stats) {
            GM_setValue("Config.todayStats", stats);
        },
        // 今日已点击的打卡子任务链接（按日期自动重置）
        getPunchCardClicked(date = Utils.getTodayNum()) {
            const data = GM_getValue("Config.punchCardClicked", null);
            if (!data || data.date !== date || !Array.isArray(data.urls)) {
                return { date, urls: [] };
            }
            return data;
        },
        // 从任意文本（页面源码、RSC 数据、接口响应）中提取本月打卡页地址
        extractPunchUrl(text) {
            if (!text || !/punchcard|monthlypc/i.test(text)) return "";
            const clean = String(text)
                .replace(/\\\//g, "/")
                .replace(/\\u002F/gi, "/")
                .replace(/\\"/g, '"')
                .replace(/&amp;/g, "&");

            // 1) 完整路径
            const full = clean.match(/(?:https?:\/\/rewards\.bing\.com)?\/earn\/quest\/[A-Za-z0-9_-]+/i);
            if (full && /punchcard|monthlypc/i.test(full[0])) {
                return full[0].startsWith("http") ? full[0] : `https://rewards.bing.com${full[0]}`;
            }

            // 2) questId 字段
            const questIds = [...clean.matchAll(/"questId"\s*:\s*"([^"]+)"/gi)].map(m => m[1]);
            const monthlyQuest = questIds.find(id => /punchcard|monthlypc/i.test(id));
            if (monthlyQuest) return `https://rewards.bing.com/earn/quest/${monthlyQuest}`;

            // 3) 下划线分隔的任务标识符（quest ID 通常形如 ENWW_pcparent_FY27_BingMonthlyPC_Nov_punchcard）
            const ids = clean.match(/[A-Za-z0-9]+(?:_[A-Za-z0-9]+){2,}/g) || [];
            const idMatch = ids.find(id =>
                id.length >= 12 && /[A-Z]/.test(id) && /punchcard|monthlypc/i.test(id)
            );
            if (idMatch) return `https://rewards.bing.com/earn/quest/${idMatch}`;

            return "";
        },
        addTodayWarning(msg) {
            const stats = this.getTodayStats();
            if (!stats.warnings.includes(msg)) {
                stats.warnings.push(msg);
                this.saveTodayStats(stats);
            }
        },
        // 构建今日累计明细（跨轮次、跨运行）
        getTodayDetailLines() {
            const today = RewardsAuto.state.dateNowNum || Utils.getTodayNum();
            const stats = this.getTodayStats();
            const lines = [];

            if (TaskManager.signDate === today && TaskManager.signPoint >= 0) {
                lines.push(`💻 签入: +${TaskManager.signPoint} 积分`);
            }
            if (TaskManager.readDate === today) {
                lines.push(`📖 阅读: 完成${stats.readCount > 0 ? `（${stats.readCount} 篇）` : ""}`);
            } else if (stats.readCount > 0) {
                lines.push(`📖 阅读: 已读 ${stats.readCount} 篇`);
            }
            if (stats.promosClaimed > 0) {
                lines.push(`🧩 活动卡片: 已领取 ${stats.promosClaimed} 个`);
            }

            const processed = GM_getValue("Config.dailySetProcessed", []);
            const dailySetCount = Array.isArray(processed)
                ? processed.filter(item => item?.date === today).length
                : 0;
            if (dailySetCount > 0) {
                lines.push(`📅 每日活动: 已点击 ${dailySetCount} 个`);
            }

            const punchCard = this.getPunchCardClicked(today);
            if (punchCard.urls.length > 0) {
                lines.push(`🎯 打卡任务: 已点击 ${punchCard.urls.length} 个`);
            }

            lines.push(...stats.warnings);
            return lines;
        },

        // 发送webhook通知
        async sendWebhook() {
            await Promise.all([
                ...Webhooks.map(async (i) => {
                    if (!i.key) return;
                    const safeKey = String(i.key).trim();
                    if (i.type === "telegram" && !i.chatId) return;
                    const targetUrl = i.type === "telegram"
                        ? `${i.url}${safeKey}/sendMessage`
                        : (safeKey.startsWith("http") ? safeKey : i.url + safeKey);
                    try {
                        const result = await this.xhr({
                            method: "POST",
                            url: targetUrl,
                            headers: {
                                "content-type": "application/json; charset=UTF-8",
                            },
                            data: JSON.stringify(i.msg),
                        });
                        if (result) GM_log(`🔵 「${i.name}」消息推送完成`);
                    } catch (e) {
                        GM_log(`🔴 「${i.name}」消息推送出错: ${e.message}`);
                    }
                }),
                this.sendCustomWebhook()
            ]);
        },

        // 发送自定义 Webhook
        async sendCustomWebhook() {
            if (!GM_getValue("Webhook.enabled", false)) return;
            const rawUrl = String(GM_getValue("Webhook.url", "")).trim();
            if (!rawUrl) return;

            const method = String(GM_getValue("Webhook.method", "POST")).toUpperCase();
            const contentType = String(GM_getValue("Webhook.contentType", "application/json"));
            const authType = String(GM_getValue("Webhook.authType", "不使用"));
            const username = String(GM_getValue("Webhook.username", ""));
            const password = String(GM_getValue("Webhook.password", ""));
            const token = String(GM_getValue("Webhook.token", ""));
            const title = GM_info.script.name;
            const content = RewardsAuto.state.sendMSG;
            const time = new Date().toLocaleString();

            const jsonEscape = (s) => JSON.stringify(String(s)).slice(1, -1);
            const fill = (s) => String(s).replace(
                /\{\{(title|content|time|script|title_json|content_json|time_json|content_url)\}\}/g,
                (match, key) => {
                    switch (key) {
                        case "title": return title;
                        case "content": return content;
                        case "time": return time;
                        case "script": return title;
                        case "title_json": return jsonEscape(title);
                        case "content_json": return jsonEscape(content);
                        case "time_json": return jsonEscape(time);
                        case "content_url": return encodeURIComponent(content);
                        default: return match;
                    }
                }
            );

            const url = fill(rawUrl);

            // 请求头：默认 content-type，再合并用户自定义 JSON
            const headers = { "content-type": `${contentType}; charset=UTF-8` };
            const rawHeaders = String(GM_getValue("Webhook.headers", "")).trim();
            if (rawHeaders) {
                try {
                    const extra = JSON.parse(rawHeaders);
                    if (extra && typeof extra === "object" && !Array.isArray(extra)) {
                        for (const [key, value] of Object.entries(extra)) {
                            const name = String(key).toLowerCase();
                            if (["__proto__", "constructor", "prototype"].includes(name)) continue;
                            headers[name] = value;
                        }
                    }
                } catch (e) {
                    GM_log(`🔴 「自定义 Webhook」请求头 JSON 解析失败: ${e.message}`);
                }
            }

            // 认证：密码登录 / 账号登录 / 令牌
            const toBase64 = (s) => {
                try {
                    return btoa(s);
                } catch {
                    const bytes = new TextEncoder().encode(s);
                    let binary = "";
                    for (const b of bytes) binary += String.fromCharCode(b);
                    return btoa(binary);
                }
            };
            if (authType === "账号登录" && username) {
                headers["authorization"] = `Basic ${toBase64(`${username}:${password}`)}`;
            } else if (authType === "密码登录" && password) {
                headers["authorization"] = `Basic ${toBase64(`:${password}`)}`;
            } else if (authType === "令牌" && token) {
                headers["authorization"] = `Bearer ${token}`;
            }

            // 请求体：默认 JSON，支持自定义模板
            let data;
            if (method !== "GET") {
                const customBody = String(GM_getValue("Webhook.body", "")).trim();
                if (customBody) {
                    data = fill(customBody);
                } else if (contentType === "application/x-www-form-urlencoded") {
                    data = `title=${encodeURIComponent(title)}&content=${encodeURIComponent(content)}&time=${encodeURIComponent(time)}&script=${encodeURIComponent(title)}`;
                } else {
                    data = JSON.stringify({ title, content, time, script: title });
                }
            }

            try {
                const result = await this.xhr({ method, url, headers, data });
                if (result) GM_log("🔵 「自定义 Webhook」消息推送完成");
            } catch (e) {
                GM_log(`🔴 「自定义 Webhook」消息推送出错: ${e.message}`);
            }
        },

        // 封装 GM_xmlhttpRequest，15秒超时；GET 自动跟随重定向
        xhr(options, _redirects = 0) {
            return new Promise((resolve, reject) => {
                const start = Date.now();
                const isGetLike = !options.method || options.method.toUpperCase() === "GET";
                GM_xmlhttpRequest({
                    ...options,
                    timeout: 15000,
                    onload: (res) => {
                        const cost = ((Date.now() - start) / 1000).toFixed(2);
                        if (res.status >= 200 && res.status < 300) {
                            resolve(res.responseText);
                        } else if ([301, 302, 307, 308].includes(res.status)) {
                            const match = res.responseHeaders?.match(/Location:\s*(.*?)\s*\r?\n/i);
                            if (isGetLike && match && _redirects < 5) {
                                try {
                                    const nextUrl = new URL(match[1], options.url).toString();
                                    resolve(this.xhr({ ...options, url: nextUrl }, _redirects + 1));
                                    return;
                                } catch (_) {}
                            }
                            resolve(match ? match[1] : false);
                        } else {
                            reject(new Error(`HTTP ${res.status}，用时 ${cost} 秒`));
                        }
                    },
                    onerror: (err) => {
                        const cost = ((Date.now() - start) / 1000).toFixed(2);
                        reject(new Error(`${err?.error || "网络错误"}，用时 ${cost} 秒`));
                    },
                    ontimeout: () => {
                        const cost = ((Date.now() - start) / 1000).toFixed(2);
                        reject(new Error(`请求超时，用时 ${cost} 秒`));
                    }
                });
            });
        },

        randomRange(min, max) {
            return Math.floor(Math.random() * (max - min + 1) + min);
        },

        getTimestamp() {
            return Date.now();
        },

        getTodayNum() {
            const d = new Date();
            return Number(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`);
        },

        getTodayStr() {
            const d = new Date();
            return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
        },

        // 服务端日期可能是 09/07/2026（补零），本地是 9/7/2026（不补零），
        // 直接字符串比较会漏掉当天全部卡片，因此统一去掉前导零再比。
        sameDateStr(a, b) {
            const norm = (s) => {
                if (!s) return "";
                const m = String(s).trim().match(/^(\d{1,2})\D(\d{1,2})\D(\d{2,4})$/);
                if (!m) return String(s).trim();
                return `${Number(m[1])}/${Number(m[2])}/${m[3].length === 2 ? "20" + m[3] : m[3]}`;
            };
            return norm(a) === norm(b);
        },

        getRandomUUID() {
            return crypto.randomUUID().replace(/-/g, "").toUpperCase();
        },

        isJSON(s) {
            try { const j = JSON.parse(s); return Array.isArray(j) || (typeof j === "object" && j !== null); }
            catch { return false; }
        },

        delay(ms) {
            return new Promise(r => setTimeout(r, ms));
        },

        // 防封号核心：所有操作间必须使用随机延迟
        randomDelay(min = 3000, max = 8000) {
            return this.delay(this.randomRange(min, max));
        },

        waitForElement(selector, timeout = 30000) {
            return new Promise((resolve, reject) => {
                const element = document.querySelector(selector);
                if (element) return resolve(element);

                const observer = new MutationObserver((_, obs) => {
                    const el = document.querySelector(selector);
                    if (el) { obs.disconnect(); resolve(el); }
                });
                observer.observe(document.body, { childList: true, subtree: true });

                setTimeout(() => {
                    observer.disconnect();
                    const el = document.querySelector(selector);
                    el ? resolve(el) : reject(new Error(`等待元素超时: ${selector}`));
                }, timeout);
            });
        },

        waitForElementsByText(containerSelector, textPatterns, timeout = 30000) {
            return new Promise((resolve, reject) => {
                const findElements = () => {
                    const containers = document.querySelectorAll(containerSelector);
                    const results = [];
                    for (const container of containers) {
                        const text = container.textContent || "";
                        for (const pattern of textPatterns) {
                            if (text.includes(pattern)) {
                                results.push({ element: container, pattern });
                                break;
                            }
                        }
                    }
                    return results;
                };

                const found = findElements();
                if (found.length > 0) return resolve(found);

                const observer = new MutationObserver((_, obs) => {
                    const found = findElements();
                    if (found.length > 0) { obs.disconnect(); resolve(found); }
                });
                observer.observe(document.body, { childList: true, subtree: true });

                setTimeout(() => {
                    observer.disconnect();
                    const found = findElements();
                    found.length > 0 ? resolve(found) : reject(new Error("等待文本元素超时"));
                }, timeout);
            });
        }
    };

    const API = {
        async getToken(url, maxRetries = 3) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const res = await Utils.xhr({ url });
                    if (!Utils.isJSON(res)) {
                        if (attempt < maxRetries) {
                            await Utils.delay(3210);
                            continue;
                        }
                        return false;
                    }
                    const data = JSON.parse(res);
                    if (data.error) {
                        Utils.log("🔴", `Token错误: ${data.error} - ${data.error_description || ''}`);
                        if (["invalid_grant","invalid_request"].includes(data.error)) {
                            GM_setValue("Config.token", false);
                            GM_setValue("Config.code", "");
                        }
                        return false;
                    }
                    if (data.refresh_token && data.access_token) {
                        GM_setValue("Config.token", data.refresh_token);
                        GM_setValue("Config.tokenTime", Utils.getTimestamp());
                        RewardsAuto.state.token = data.access_token;
                        return true;
                    }
                    if (attempt < maxRetries) {
                        await Utils.delay(3210);
                        continue;
                    }
                    return false;
                } catch (e) {
                    if (e.message.includes("400") || e.message.includes("401")) {
                        GM_setValue("Config.token", false);
                        GM_setValue("Config.code", "");
                        return false;
                    }
                    if (attempt < maxRetries) {
                        await Utils.delay(3210);
                        continue;
                    }
                    Utils.log("🔴", `Token请求失败: ${e.message}`);
                    return false;
                }
            }
            return false;
        },

        // 401 自动刷新 Token 并重试
        async withTokenRetry(requestFn) {
            let token = RewardsAuto.state.token;
            if (!token) return null;
            try {
                return await requestFn(token);
            } catch (e) {
                if (e.message && e.message.includes("401")) {
                    Utils.log("🟡", "Token 过期，自动刷新...");
                    RewardsAuto.state.token = null;
                    const refreshed = await this.renewToken();
                    if (!refreshed) return null;
                    return await requestFn(RewardsAuto.state.token);
                }
                throw e;
            }
        },

        async renewToken() {
            if (!GM_getValue("Tasks.sign", true) && !GM_getValue("Tasks.read", true)) return true;
            
            let refreshToken = GM_getValue("Config.token", false);
            const tokenTime = GM_getValue("Config.tokenTime", 0);
            
            // Token 超过 7 天提前续期
            if (tokenTime > 0) {
                const days = (Utils.getTimestamp() - tokenTime) / (1000 * 60 * 60 * 24);
                if (days > 7) {
                    Utils.log("🟡", `Token已${Math.floor(days)}天，提前续期`);
                    refreshToken = false;
                }
            }

            const authUrl = "https://login.live.com/oauth20_authorize.srf?client_id=0000000040170455&response_type=code&scope=service::prod.rewardsplatform.microsoft.com::MBI_SSL&redirect_uri=https://login.live.com/oauth20_desktop.srf";

            // 自动获取授权码
            const fetchCode = async (msg) => {
                GM_setValue("Config.code", "");
                Utils.log("🟡", `${msg}，尝试自动获取授权码...`);
                
                try {
                    const res = await new Promise((resolve, reject) => {
                        GM_xmlhttpRequest({
                            method: "GET", url: authUrl,
                            headers: { "User-Agent": typeof navigator !== "undefined" ? navigator.userAgent : RewardsAuto.ua.pc },
                            onload: (r) => resolve(r),
                            onerror: () => reject(new Error("请求失败")),
                            ontimeout: () => reject(new Error("超时")),
                            timeout: 15000
                        });
                    });
                    const finalUrl = res.finalUrl || "";
                    const code = new URL(finalUrl).searchParams.get("code");
                    if (code) {
                        Utils.log("🟢", "自动获取授权码成功");
                        return [code];
                    }
                } catch (e) {
                    Utils.log("🟡", `自动获取失败: ${e.message}`);
                }

                // 手动授权引导
                Utils.log("🟡", "请手动完成授权...");
                GM_openInTab(authUrl, { active: true, insert: true, setParent: true });
                GM_notification({
                    text: "完成后粘贴地址栏URL到脚本设置的「授权码链接」",
                    title: "🟡 需要授权", timeout: 0
                });

                // 等待用户粘贴授权码（最长 3 分钟）
                for (let i = 0; i < 180; i++) {
                    await Utils.delay(1000);
                    const code = GM_getValue("Config.code", "");
                    const match = code?.match(/M\.[^&]+/);
                    if (match) {
                        Utils.log("🟢", "授权码获取成功");
                        return [decodeURIComponent(match[0])];
                    }
                }
                Utils.log("🔴", "授权码获取超时");
                Utils.addTodayWarning("⚠️ 授权码获取超时");
                return false;
            };

            // 根据是否有 refreshToken 决定获取方式
            if (!refreshToken) {
                const codeMatch = await fetchCode("检测到授权码为空");
                if (!codeMatch) return false;
                const url = `https://login.live.com/oauth20_token.srf?client_id=0000000040170455&code=${encodeURIComponent(codeMatch[0])}&redirect_uri=https://login.live.com/oauth20_desktop.srf&grant_type=authorization_code`;
                const token = await this.getToken(url);
                if (!token) {
                    const retry = await fetchCode("授权码失效");
                    if (!retry) return false;
                    return await this.renewToken();
                }
                Utils.log("🟢", "Token获取成功！");
                return true;
            } else {
                const url = `https://login.live.com/oauth20_token.srf?client_id=0000000040170455&refresh_token=${encodeURIComponent(refreshToken)}&scope=service::prod.rewardsplatform.microsoft.com::MBI_SSL&grant_type=REFRESH_TOKEN`;
                const token = await this.getToken(url);
                if (!token) {
                    const retry = await fetchCode("Token失效");
                    if (!retry) return false;
                    return await this.renewToken();
                }
                return true;
            }
        },

        // 从 rewards.bing.com/earn 页面解析积分和搜索配额
        async getRewardsInfo(maxRetries = 3) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const html = await Utils.xhr({ url: "https://rewards.bing.com/earn" });
                    const clean = html.replace(/\\"/g, '"');
                    
                    // 尝试从Next.js RSC数据中解析
                    let balance = 0;
                    let pcMax = 60, pcCur = 0, mobMax = 0, mobCur = 0;
                    let dailyOffer = 0;
                    
                    // 方法1: 从RSC JSON数据中解析
                    const rscMatch = clean.match(/"pointsCounters":\{[^}]*"pc":\{"max":(\d+),"progress":(\d+)\}[^}]*"mobile":\{"max":(\d+),"progress":(\d+)\}[^}]*"dailyOffer":(\d+)[^}]*"totalPoints":(\d+)/);
                    if (rscMatch) {
                        pcMax = parseInt(rscMatch[1]);
                        pcCur = parseInt(rscMatch[2]);
                        mobMax = parseInt(rscMatch[3]);
                        mobCur = parseInt(rscMatch[4]);
                        dailyOffer = parseInt(rscMatch[5]);
                        balance = parseInt(rscMatch[6]);
                    } else {
                        // 方法2: 传统格式解析
                        const balMatch = clean.match(/"balance":(\d+)/) || clean.match(/"availablePoints":(\d+)/) || clean.match(/"totalPoints":(\d+)/);
                        if (balMatch) balance = parseInt(balMatch[1]);
                        
                        const idx = clean.indexOf('"pointsCounters":{');
                        if (idx !== -1) {
                            let start = idx + 17, depth = 0, end = start;
                            for (let i = start; i < clean.length; i++) {
                                if (clean[i] === '{') depth++;
                                if (clean[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
                            }
                            try {
                                const pts = JSON.parse(clean.substring(start, end));
                                pcMax = pts.pc?.max ?? 60;
                                pcCur = pts.pc?.progress ?? 0;
                                mobMax = pts.mobile?.max ?? 0;
                                mobCur = pts.mobile?.progress ?? 0;
                                dailyOffer = pts.dailyOffer ?? 0;
                            } catch {}
                        }
                    }
                    
                    // 如果balance为0，尝试其他匹配方式
                    if (balance === 0) {
                        const balMatch2 = clean.match(/"balance":(\d+)/) || clean.match(/"availablePoints":(\d+)/);
                        if (balMatch2) balance = parseInt(balMatch2[1]);
                    }

                    // 解析今日积分明细
                    const todayDetails = [];
                    
                    // 方法1: 从RSC数据中解析活动卡片
                    const activityCardsMatch = clean.match(/"activityCards":\[([^\]]+)\]/);
                    if (activityCardsMatch) {
                        try {
                            const cardsStr = activityCardsMatch[1];
                            const cardRegex = /"title":"([^"]+)".*?"points":(\d+).*?"isCompleted":(true|false)/g;
                            let cardMatch;
                            while ((cardMatch = cardRegex.exec(cardsStr)) !== null) {
                                const title = cardMatch[1];
                                const points = parseInt(cardMatch[2]);
                                const isCompleted = cardMatch[3] === "true";
                                if (points > 0 && isCompleted) {
                                    todayDetails.push({ title, points });
                                }
                            }
                        } catch {}
                    }
                    
                    // 方法2: 从HTML中解析搜索进度
                    const searchHtmlMatch = clean.match(/必应搜索.*?<span[^>]*>(\d+)<\/span>.*?<span[^>]*>\/(\d+)<\/span>/);
                    if (searchHtmlMatch) {
                        todayDetails.push({ 
                            title: '必应搜索', 
                            points: parseInt(searchHtmlMatch[1]),
                            max: parseInt(searchHtmlMatch[2])
                        });
                    }
                    
                    // 方法3: 从RSC数据中解析搜索进度
                    const searchRscMatch = clean.match(/"combinedSearch":\{[^}]*"progress":(\d+)[^}]*"max":(\d+)/);
                    if (searchRscMatch && !todayDetails.some(d => d.title === '必应搜索')) {
                        todayDetails.push({
                            title: '必应搜索',
                            points: parseInt(searchRscMatch[1]),
                            max: parseInt(searchRscMatch[2])
                        });
                    }
                    
                    // 添加dailyOffer到今日明细
                    if (dailyOffer > 0) {
                        todayDetails.push({ title: '优惠', points: dailyOffer });
                    }
                    
                    // 匹配其他活动（如"优惠"）
                    const otherActivityRegex = /<p>([^<]+)<\/p><\/div><div[^>]*>(\d+)<\/div>/g;
                    let otherMatch;
                    while ((otherMatch = otherActivityRegex.exec(clean)) !== null) {
                        const title = otherMatch[1];
                        const points = parseInt(otherMatch[2]);
                        if (points > 0 && !todayDetails.some(d => d.title === title)) {
                            todayDetails.push({ title, points });
                        }
                    }

                    // 解析历史积分
                    const history = {
                        month: 0,
                        year: 0,
                        lifetime: 0
                    };
                    
                    // 方法1: 从RSC数据中解析历史积分
                    const historyRscMatch = clean.match(/"pointsHistory":\{[^}]*"thisMonth":\{"earn":(\d+)[^}]*"thisYear":\{"earn":(\d+)[^}]*"lifetime":\{"earn":(\d+)/);
                    if (historyRscMatch) {
                        history.month = parseInt(historyRscMatch[1]);
                        history.year = parseInt(historyRscMatch[2]);
                        history.lifetime = parseInt(historyRscMatch[3]);
                    } else {
                        // 方法2: 从HTML中解析历史积分
                        const monthHtmlMatch = clean.match(/本月.*?(\d[\d,]*)<\/div>/);
                        const yearHtmlMatch = clean.match(/今年.*?(\d[\d,]*)<\/div>/);
                        const lifetimeHtmlMatch = clean.match(/生存期.*?(\d[\d,]*)<\/div>/);
                        
                        // JSON格式
                        const monthJsonMatch = clean.match(/"monthlyPoints":(\d+)/);
                        const yearJsonMatch = clean.match(/"yearlyPoints":(\d+)/);
                        const lifetimeJsonMatch = clean.match(/"lifetimePoints":(\d+)/);
                        
                        if (monthHtmlMatch) {
                            history.month = parseInt(monthHtmlMatch[1].replace(/,/g, ''));
                        } else if (monthJsonMatch) {
                            history.month = parseInt(monthJsonMatch[1]);
                        }
                        
                        if (yearHtmlMatch) {
                            history.year = parseInt(yearHtmlMatch[1].replace(/,/g, ''));
                        } else if (yearJsonMatch) {
                            history.year = parseInt(yearJsonMatch[1]);
                        }
                        
                        if (lifetimeHtmlMatch) {
                            history.lifetime = parseInt(lifetimeHtmlMatch[1].replace(/,/g, ''));
                        } else if (lifetimeJsonMatch) {
                            history.lifetime = parseInt(lifetimeJsonMatch[1]);
                        }
                    }

                    return {
                        balance,
                        pc: { progress: pcCur, max: pcMax },
                        mobile: { progress: mobCur, max: mobMax },
                        dailyOffer,
                        todayDetails,
                        history
                    };
                } catch (e) {
                    if (attempt < maxRetries) {
                        await Utils.delay(3210);
                        continue;
                    }
                    Utils.log("🔴", `仪表盘获取失败: ${e.message}`);
                    return false;
                }
            }
            return false;
        },

        // 获取当前登录账号（用于通知中区分账号，由用户手动填写）
        async getAccountName() {
            if (RewardsAuto.state.accountName) return RewardsAuto.state.accountName;

            // 使用用户在脚本设置中填写的账号备注
            const configuredLabel = String(GM_getValue("Config.accountLabel", "")).trim();
            if (configuredLabel) {
                RewardsAuto.state.accountName = configuredLabel;
                return configuredLabel;
            }
            return "";
        },

        async signApp() {
            const region = GM_getValue("Config.lock", true) ? "cn" : RewardsAuto.state.region.toLowerCase();
            try {
                const res = await this.withTokenRetry(token => Utils.xhr({
                    method: "POST",
                    url: "https://prod.rewardsplatform.microsoft.com/dapi/me/activities",
                    headers: {
                        "content-type": "application/json; charset=UTF-8",
                        "user-agent": RewardsAuto.ua.app,
                        "authorization": `Bearer ${token}`,
                        "x-rewards-appid": RewardsAuto.appConfig.rewardsAppId,
                        "x-rewards-ismobile": "true",
                        "x-rewards-country": region,
                        "x-rewards-partnerid": "startapp",
                        "x-rewards-flights": "rwgobig"
                    },
                    data: JSON.stringify({
                        amount: 1, id: Utils.getRandomUUID(),
                        type: 103,
                        country: region,
                        channel: RewardsAuto.appConfig.channel
                    })
                }));
                if (Utils.isJSON(res)) return JSON.parse(res).response?.activity?.p || 0;
            } catch (e) {
                Utils.log("🔴", `App签入失败: ${e.message}`);
            }
            return -1;
        },

        async signPC() {
            try {
                const res = await Utils.xhr({
                    method: "POST",
                    url: "https://rewards.bing.com/api/reportactivity?X-Requested-With=XMLHttpRequest",
                    headers: {
                        "content-type": "application/x-www-form-urlencoded",
                        "user-agent": RewardsAuto.ua.pc,  // 使用 PC 端 UA
                        "referer": "https://rewards.bing.com/"
                    },
                    data: "id=Gamification_DailyCheckIn&hash=1&activityAmount=1"
                });
                if (Utils.isJSON(res)) {
                    const data = JSON.parse(res);
                    return data.points || 0;
                }
            } catch (e) {
                Utils.log("🟡", `PC签入失败: ${e.message}`);
            }
            return -1;
        },

        async appActivity(type, offerid) {
            const region = GM_getValue("Config.lock", true) ? "cn" : RewardsAuto.state.region.toLowerCase();
            const body = {
                amount: 1,
                country: region,
                id: Utils.getRandomUUID(),
                type: type,
                channel: RewardsAuto.appConfig.channel
            };
            if (offerid) {
                body.attributes = { offerid: offerid };
            }
            try {
                const res = await this.withTokenRetry(token => Utils.xhr({
                    method: "POST",
                    url: "https://prod.rewardsplatform.microsoft.com/dapi/me/activities",
                    headers: {
                        "content-type": "application/json; charset=UTF-8",
                        "user-agent": RewardsAuto.ua.app,
                        "authorization": `Bearer ${token}`,
                        "x-rewards-appid": RewardsAuto.appConfig.rewardsAppId,
                        "x-rewards-ismobile": "true",
                        "x-rewards-country": region
                    },
                    data: JSON.stringify(body)
                }));
                if (Utils.isJSON(res)) {
                    const data = JSON.parse(res);
                    const points = data.response?.activity?.p || 0;
                    const isDuplicate = data.response?.isDuplicate || false;
                    const balance = data.response?.balance || 0;
                    return { points, isDuplicate, balance };
                }
            } catch (e) {
                Utils.log("🔴", `App活动失败(${offerid}): ${e.message}`);
            }
            return null;
        },

        async getReadProgress() {
            try {
                const res = await this.withTokenRetry(token => Utils.xhr({
                    url: "https://prod.rewardsplatform.microsoft.com/dapi/me?channel=SAAndroid&options=613",
                    headers: {
                        "content-type": "application/json; charset=UTF-8",
                        "user-agent": RewardsAuto.ua.app,
                        "authorization": `Bearer ${token}`,
                        "x-rewards-appid": RewardsAuto.appConfig.rewardsAppId,
                        "x-rewards-ismobile": "true"
                    }
                }));
                if (Utils.isJSON(res)) {
                    const promos = JSON.parse(res).response?.promotions || [];
                    const task = promos.find(x => x.attributes?.offerid === RewardsAuto.appConfig.offerIds.readArticle);
                    if (task && task.attributes) return { progress: parseInt(task.attributes.progress) || 0, max: parseInt(task.attributes.max) || 30 };
                }
            } catch (e) {
                Utils.log("🔴", `阅读进度获取失败: ${e.message}`);
            }
            return false;
        },


        // 执行阅读
        async doRead() {
            const region = GM_getValue("Config.lock", true) ? "cn" : RewardsAuto.state.region.toLowerCase();
            try {
                await this.withTokenRetry(token => Utils.xhr({
                    method: "POST",
                    url: "https://prod.rewardsplatform.microsoft.com/dapi/me/activities",
                    headers: {
                        "content-type": "application/json; charset=UTF-8",
                        "user-agent": RewardsAuto.ua.app,
                        "authorization": `Bearer ${token}`,
                        "x-rewards-appid": RewardsAuto.appConfig.rewardsAppId,
                        "x-rewards-ismobile": "true",
                        "x-rewards-country": region
                    },
                    data: JSON.stringify({
                        amount: 1, country: region, id: Utils.getRandomUUID(),
                        type: 101, attributes: { offerid: RewardsAuto.appConfig.offerIds.readArticle }
                    })
                }));
                return true;
            } catch (e) {
                Utils.log("🔴", `阅读请求失败: ${e.message}`);
                return false;
            }
        },

        // 多层级解析：activityCards → promotionCards → 全局扫描 → HTML data 属性
        async discoverCards() {
            const cards = [];
            const dashboardCards = [];
            try {
                // 每日活动优先读取 dashboard 的 dailySetItems，保留正确的页面来源。
                const dashHtml = await Utils.xhr({ url: "https://rewards.bing.com/dashboard" });
                const cleanDash = dashHtml.replace(/\\\"/g, '"');
                const marker = '"dailySetItems":';
                const markerIndex = cleanDash.indexOf(marker);
                if (markerIndex !== -1) {
                    let start = markerIndex + marker.length;
                    while (start < cleanDash.length && /\s/.test(cleanDash[start])) start++;
                    if (cleanDash[start] === "[") {
                        let depth = 1;
                        let end = start + 1;
                        while (depth > 0 && end < cleanDash.length) {
                            if (cleanDash[end] === "[") depth++;
                            else if (cleanDash[end] === "]") depth--;
                            end++;
                        }
                        const items = JSON.parse(cleanDash.slice(start, end).replace(/\\\"/g, '"'));
                        for (const item of items) {
                            if (!item || item.points <= 0 || item.isCompleted) continue;
                            if (item.date && !Utils.sameDateStr(item.date, RewardsAuto.state.dateNowStr)) continue;
                            const offerId = item.offerId || item.offerid;
                            if (!offerId || !item.hash || /locked/i.test(offerId)) continue;
                            dashboardCards.push({
                                title: item.title || item.name || "每日活动",
                                points: Number(item.points) || 0,
                                offerId,
                                hash: item.hash,
                                kind: "daily",
                                type: "dashboard",
                                url: "https://rewards.bing.com/dashboard"
                            });
                        }
                    }
                }

                const html = await Utils.xhr({ url: "https://rewards.bing.com/earn" });
                if (!html) throw new Error("earn 页面返回空");

                // unescape 版本供 RSC 解析使用
                const clean = html.replace(/\\"/g, '"');

                // ---------- 动态提取 next-action（供 claimCard 使用） ----------
                const naMatch = html.match(/name":"next-action"[^}]*"value":"([a-f0-9]{40,})"/)
                    || html.match(/next-action["']\s*:\s*["']([a-f0-9]{40,})["']/)
                    || clean.match(/"next-action"[^"]*"([a-f0-9]{40,})"/);
                if (naMatch) {
                    RewardsAuto._nextAction = naMatch[1];
                    Utils.log("🟢", `动态 next-action: ${naMatch[1].slice(0, 12)}…`);
                }

                // ---------- 辅助：从字符串提取单张卡片对象 ----------
                const parseCard = (obj) => {
                    const offerIdMatch = obj.match(/"offerId":"([^"]+)"/i)
                        || obj.match(/"offerid":"([^"]+)"/i)
                        || obj.match(/"offer_id":"([^"]+)"/i);
                    const hashMatch = obj.match(/"hash":"([^"]+)"/)
                        || obj.match(/"activityId":"([^"]+)"/)
                        || obj.match(/"id":"([^"]+)"/);
                    if (!offerIdMatch || !hashMatch) return null;

                    const offerId = offerIdMatch[1];
                    const hash = hashMatch[1];
                    const pointsMatch = obj.match(/"points":(\d+)/);
                    const isCompletedMatch = obj.match(/"isCompleted":(true|false)/i)
                        || obj.match(/"completed":(true|false)/i)
                        || obj.match(/"state":"(completed|CLAIMED)"/i);
                    const titleMatch = obj.match(/"title":"([^"]+)"/)
                        || obj.match(/"name":"([^"]+)"/)
                        || obj.match(/"displayName":"([^"]+)"/);

                    const points = pointsMatch ? parseInt(pointsMatch[1]) : 0;
                    const isCompleted = isCompletedMatch
                        ? (isCompletedMatch[1] === "true" || isCompletedMatch[1] === "completed" || isCompletedMatch[1] === "CLAIMED")
                        : false;
                    if (isCompleted) return null;

                    const title = titleMatch ? titleMatch[1] : "";

                    const skip = RewardsAuto.skipPatterns.some(p =>
                        title.toLowerCase().includes(p.toLowerCase()) ||
                        offerId.toLowerCase().includes(p.toLowerCase())
                    );
                    if (skip) return null;

                    let kind = "unknown";
                    if (/quiz|trivia/i.test(offerId)) kind = "quiz";
                    else if (/puzzle/i.test(offerId)) kind = "puzzle";
                    else if (/image/i.test(offerId)) kind = "image_creator";
                    else if (/explore|search/i.test(offerId)) kind = "explore_search";
                    else if (/dailyset|daily/i.test(offerId)) kind = "daily";
                    else if (/streak/i.test(offerId)) kind = "streak";
                    else kind = "open_only";

                    return { title, points, offerId, hash, kind };
                };

                // ---------- 方法1: activityCards 数组 ----------
                const m1 = clean.match(/"activityCards":\[([\s\S]*?)\](?=,"|,"[a-z]|}$)/i);
                if (m1) {
                    Utils.log("🧩", "命中 activityCards 数组");
                    const cardObjRegex = /\{[^{}]*\}/g;
                    let m;
                    while ((m = cardObjRegex.exec(m1[1])) !== null) {
                        const card = parseCard(m[0]);
                        if (card && card.points > 0) cards.push(card);
                    }
                }

                // ---------- 方法2: promotionCards / promotions 数组 ----------
                if (cards.length === 0) {
                    const m2 = clean.match(/"(?:promotionCards|promotions|dailySet|cards)":\[([\s\S]*?)\](?=,"|,"[a-z]|}$)/i);
                    if (m2) {
                        Utils.log("🧩", "命中 promotionCards/promotions 数组");
                        const cardObjRegex = /\{[^{}]*\}/g;
                        let m;
                        while ((m = cardObjRegex.exec(m2[1])) !== null) {
                            const card = parseCard(m[0]);
                            if (card && card.points > 0) cards.push(card);
                        }
                    }
                }

                // ---------- 方法3: 全局扫描含 offerId+hash 的对象（平衡括号匹配） ----------
                if (cards.length === 0) {
                    Utils.log("🧩", "全局扫描 RSC payload 中的卡片对象");
                    const seen = new Set();
                    const offerIdRe = /"offerId"|"offerid"|"offer_id"/gi;
                    let m;
                    while ((m = offerIdRe.exec(clean)) !== null) {
                        let start = m.index;
                        while (start > 0 && clean[start] !== '{') start--;
                        if (clean[start] !== '{') continue;
                        let depth = 0, end = start;
                        for (let i = start; i < clean.length; i++) {
                            if (clean[i] === '{') depth++;
                            if (clean[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
                        }
                        if (depth !== 0) continue;
                        const obj = clean.slice(start, end);
                        if (!/"(?:hash|activityId|id)"\s*:/.test(obj)) continue;
                        const key = obj.slice(0, 80);
                        if (seen.has(key)) continue;
                        seen.add(key);
                        const card = parseCard(obj);
                        if (card && card.points > 0) cards.push(card);
                    }
                }

                // ---------- 方法4: 从 Next.js RSC flight payload 中提取 ----------
                if (cards.length === 0) {
                    Utils.log("🧩", "尝试解析 RSC flight payload");
                    // RSC 格式: 数字:{JSON}\n
                    const flightRegex = /\d+:(\{[\s\S]*?"(?:offerId|offerid)"[\s\S]*?\})\n/g;
                    let m;
                    const seen = new Set();
                    while ((m = flightRegex.exec(clean)) !== null) {
                        const key = m[1].slice(0, 80);
                        if (seen.has(key)) continue;
                        seen.add(key);
                        const card = parseCard(m[1]);
                        if (card && card.points > 0) cards.push(card);
                    }
                }

                // ---------- 方法5: 从 HTML data-* 属性中提取 ----------
                if (cards.length === 0) {
                    Utils.log("🧩", "尝试从 HTML data 属性中提取卡片");
                    const dataRegex = /data-offer-id="([^"]+)"[^>]*data-hash="([^"]+)"/gi;
                    let m;
                    while ((m = dataRegex.exec(html)) !== null) {
                        const offerId = m[1];
                        const hash = m[2];
                        const skip = RewardsAuto.skipPatterns.some(p => offerId.toLowerCase().includes(p.toLowerCase()));
                        if (skip) continue;
                        cards.push({ title: "", points: 1, offerId, hash, kind: "open_only" });
                    }
                }

                if (cards.length === 0) {
                    // 输出前 500 字符供调试
                    const snippet = clean.slice(0, 500).replace(/[\r\n]+/g, ' ');
                    Utils.log("🟡", `所有方法均未命中，页面前500字符: ${snippet}`);
                }
            } catch (e) {
                Utils.log("🔴", `卡片解析失败: ${e.message}`);
                if (dashboardCards.length === 0 && cards.length === 0) return null;
            }
            const merged = [...dashboardCards, ...cards.map(card => ({
                ...card,
                type: card.type || "earn",
                url: card.url || "https://rewards.bing.com/earn"
            }))];
            const unique = [];
            const seen = new Set();
            const todayDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
            for (const card of merged) {
                const offerId = card?.offerId || "";
                // Incomplete cards are actionable. In the reference script,
                // weekday/week/month/date filters are only used for completed cards.
                if (!offerId || seen.has(offerId)) continue;
                seen.add(offerId);
                unique.push(card);
            }
            return unique;
        },

        // 获取活动接口使用的 RequestVerificationToken
        async getRequestVerificationToken(pageUrl = "https://rewards.bing.com/") {
            try {
                const html = await Utils.xhr({
                    url: pageUrl,
                    headers: {
                        "user-agent": RewardsAuto.ua.pc,
                        "referer": "https://rewards.bing.com/"
                    }
                });
                const tokenMatch = html.match(/name=["']__RequestVerificationToken["'][^>]*value=["']([^"']+)["']/i)
                    || html.match(/RequestVerificationToken.*?value=["']([^"']+)["']/i)
                    || html.match(/"verificationToken"\s*:\s*"([^"]+)"/i)
                    || html.match(/"__RequestVerificationToken"\s*:\s*"([^"]+)"/i);
                return tokenMatch ? tokenMatch[1].replace(/&amp;/g, "&") : "";
            } catch (e) {
                Utils.log("🟡", `活动Token获取失败: ${e.message}`);
                return "";
            }
        },

        // 使用 reportActivity 上报活动完成
        async reportActivity(offerId, hash, referer = "https://rewards.bing.com/") {
            const token = await this.getRequestVerificationToken(referer);
            const params = new URLSearchParams({
                id: offerId,
                hash: hash || "1",
                activityAmount: "1"
            });
            if (token) params.set("__RequestVerificationToken", token);

            const headers = {
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "user-agent": RewardsAuto.ua.pc,
                "referer": referer,
                "origin": "https://rewards.bing.com",
                "x-requested-with": "XMLHttpRequest"
            };
            if (token) headers["RequestVerificationToken"] = token;

            return await Utils.xhr({
                method: "POST",
                url: "https://rewards.bing.com/api/reportactivity?X-Requested-With=XMLHttpRequest",
                headers,
                data: params.toString()
            });
        },

        // Claim promo cards through the Next.js Server Action used by the reference script.
        async claimCard(card) {
            const knownAction = "707e6eb15bdfdd5fba193f0a77e934f7018faf87ce";
            const dynamicAction = RewardsAuto._nextAction;
            const actionCandidates = [knownAction];
            if (dynamicAction && dynamicAction !== knownAction) actionCandidates.push(dynamicAction);

            const url = card.type === "dashboard" ? "https://rewards.bing.com/dashboard" : "https://rewards.bing.com/earn";
            const referer = url;
            const dashboardStateTree = "%5B%22%22%2C%7B%22children%22%3A%5B%22(nav)%22%2C%7B%22children%22%3A%5B%22dashboard%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%2C4096%5D%7D%2Cnull%2Cnull%2C4096%5D%7D%2Cnull%2Cnull%2C4096%5D%7D%2Cnull%2C%22refetch%22%2C4112%5D";

            // Strategy 1: the Server Action used by the working reference script.
            // Try the known action first, then a page-derived action as a fallback.
            for (const action of actionCandidates) {
                try {
                    const headers = {
                        "content-type": "text/plain;charset=UTF-8",
                        "next-action": action,
                        "referer": referer,
                        "origin": "https://rewards.bing.com"
                    };
                    if (card.type === "dashboard") {
                        headers["next-router-state-tree"] = dashboardStateTree;
                    }
                    await Utils.xhr({
                        method: "POST",
                        url,
                        headers,
                        data: JSON.stringify([card.hash, 11, {
                            offerid: card.offerId,
                            isPromotional: "$undefined",
                            timezoneOffset: "-480"
                        }])
                    });
                    return true;
                } catch (e) {
                    Utils.log("🟡", `Server Action 失败: ${card.offerId} (action ${action.slice(0, 12)}…, ${e.message})`);
                }
            }

            // Strategy 2: legacy reportactivity + RequestVerificationToken fallback.
            try {
                const token = await this.getRequestVerificationToken(referer);
                if (token) {
                    await Utils.xhr({
                        method: "POST",
                        url: "https://rewards.bing.com/api/reportactivity?X-Requested-With=XMLHttpRequest",
                        headers: {
                            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                            "user-agent": RewardsAuto.ua.pc,
                            "referer": referer,
                            "origin": "https://rewards.bing.com",
                            "x-requested-with": "XMLHttpRequest"
                        },
                        data: new URLSearchParams({
                            id: card.offerId,
                            hash: card.hash,
                            timeZone: "480",
                            activityAmount: "1",
                            dbs: "0",
                            form: "",
                            type: "",
                            __RequestVerificationToken: token
                        }).toString()
                    });
                    return true;
                }
            } catch (e) {
                Utils.log("🟡", `reportactivity+token 失败: ${card.offerId} (${e.message})`);
            }

            // Strategy 3/4: old reportActivity fallbacks.
            try {
                await this.reportActivity(card.offerId, card.hash, referer);
                return true;
            } catch (e) {
                Utils.log("🟡", `reportActivity 失败: ${card.offerId} (${e.message})`);
            }
            try {
                await this.reportActivity(card.offerId, "1", referer);
                return true;
            } catch (e) {
                Utils.log("🟡", `卡片领取失败(${card.offerId}): 所有策略均失败`);
                return false;
            }
        },

        async getSearchPage(query, isMobile = false) {
            const mkt = GM_getValue("Config.lock", true) ? "&mkt=zh-CN" : "";
            const deviceType = isMobile ? "m" : "d";
            return Utils.xhr({
                url: `https://${RewardsAuto.state.host}/search?q=${encodeURIComponent(query)}&form=QBLH${mkt}`,
                headers: {
                    "user-agent": isMobile ? RewardsAuto.ua.mobile : RewardsAuto.ua.pc,
                    "cookie": `_Rwho=u=${deviceType}&ts=${RewardsAuto.state.dateNowStr}`,
                    "referer": `https://${RewardsAuto.state.host}/?form=QBLH`
                }
            });
        },

        async reportSearch(html, query, isMobile = false) {
            try {
                const ig = Utils.getRandomUUID();
                const mkt = GM_getValue("Config.lock", true) ? "&mkt=zh-CN" : "";
                const params = `q=${encodeURIComponent(query)}&form=QBLH${mkt}`;
                const deviceType = isMobile ? "m" : "d";
                const headers = {
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "user-agent": isMobile ? RewardsAuto.ua.mobile : RewardsAuto.ua.pc,
                    "referer": `https://${RewardsAuto.state.host}/?form=QBLH`,
                    "cookie": `_Rwho=u=${deviceType}&ts=${RewardsAuto.state.dateNowStr}`
                };

                await Utils.xhr({
                    method: "POST",
                    url: `https://${RewardsAuto.state.host}/rewardsapp/ncheader?ver=88888888&IID=SERP.5047&IG=${ig}&ajaxreq=1`,
                    headers,
                    data: "wb=1%3bi%3d1%3bv%3d1"
                });
                await Utils.xhr({
                    method: "POST",
                    url: `https://${RewardsAuto.state.host}/rewardsapp/reportActivity?IG=${ig}&IID=SERP.5047&${params}&ajaxreq=1`,
                    headers,
                    data: `url=${encodeURIComponent(`https://${RewardsAuto.state.host}/search?${params}`)}&V=web`
                });
                return true;
            } catch (e) {
                Utils.log("🟡", `搜索上报失败: ${e.message}`);
                return false;
            }
        },

        async checkRegion(retryCount = 0) {
            if (!GM_getValue("Config.lock", true)) return true;
            try {
                const html = await Utils.xhr({ url: `https://${RewardsAuto.state.host}/` });
                if (!html) {
                    if (retryCount < 2) {
                        Utils.log("🟡", `地区检测返回空，第${retryCount + 1}次重试...`);
                        await Utils.randomDelay(3000, 8000);
                        return await this.checkRegion(retryCount + 1);
                    }
                    Utils.log("🔴", "地区检测失败（无响应）");
                    return false;
                }
                const match = html.replace(/\s/g, "").match(/Region:"(.*?)"(.*?)RevIpCC:"(.*?)"/);
                if (match) {
                    RewardsAuto.state.region = match[3].toUpperCase();
                    // if (RewardsAuto.state.region !== "CN") {
                    //     // 获取IP详细信息（来自比尔脚本）
                    //     await this.getIPInfo();
                    //     Utils.log("🔴", `IP非大陆(${RewardsAuto.state.region})，已停止\n${RewardsAuto.state.ipInfo}`, true);
                    //     return false;
                    // }
                    Utils.log("🟢", `地区检测通过: ${RewardsAuto.state.region}`);
                    return true;
                }
                // 正则未匹配到，可能是页面结构变化
                if (retryCount < 2) {
                    Utils.log("🟡", `地区检测格式异常，第${retryCount + 1}次重试...`);
                    await Utils.randomDelay(3000, 8000);
                    return await this.checkRegion(retryCount + 1);
                }
                Utils.log("🔴", "地区检测失败（格式不匹配）");
                return false;
            } catch (e) {
                if (retryCount < 2) {
                    Utils.log("🟡", `地区检测异常: ${e.message}，第${retryCount + 1}次重试...`);
                    await Utils.randomDelay(3000, 8000);
                    return await this.checkRegion(retryCount + 1);
                }
                Utils.log("🔴", `地区检测失败: ${e.message}`);
                return false;
            }
        },

        async getIPInfo() {
            try {
                const qryResult = await Utils.xhr({
                    url: "https://disp-qryapi.3g.qq.com/v1/dispatch",
                    headers: { "referer": "https://3g.qq.com/" }
                });
                if (qryResult && Utils.isJSON(qryResult)) {
                    const resJSON = JSON.parse(qryResult);
                    RewardsAuto.state.ip = (resJSON.code == 0 && resJSON.extra && resJSON.extra.ip) ? resJSON.extra.ip : "";
                    let rawInfo = (resJSON.code == 0 && resJSON.ipInfo) ? String(resJSON.ipInfo) : "";
                    rawInfo = rawInfo.replace(/[#*]+/g, " ").trim();
                    RewardsAuto.state.ipInfo = rawInfo ? `🌏所在地区：${rawInfo}` : "";
                }
            } catch {
                console.debug("获取附加 IP 信息失败");
            }
        },

        async getHotSearchWord() {
            const keywords = ["天气预报", "今日新闻", "体育赛事", "股票行情", "电影推荐", "科技资讯", "美食食谱", "旅游攻略", "历史上的今天", "健康常识"];
            const baseWord = keywords[Utils.randomRange(0, keywords.length - 1)];
            const randomSuffix = Math.random().toString(36).slice(2, 6);
            let sentence = `${baseWord} ${randomSuffix}`;

            if (RewardsAuto.apiConfig.mode !== "offline") {
                if (RewardsAuto.apiConfig.wordIndex < 1 || RewardsAuto.apiConfig.wordList.length < 1) {
                    // 获取随机API配置
                    const apiArr = RewardsAuto.apiConfig.arr;
                    const lastApiIndex = parseInt(GM_getValue("Config.apiIndex", -1));
                    const filteredArr = apiArr.filter((_, index) => index !== lastApiIndex);
                    const randomIndex = Utils.randomRange(0, filteredArr.length - 1);
                    GM_setValue("Config.apiIndex", randomIndex);
                    
                    const [apiName, apiConfig] = filteredArr[randomIndex];
                    RewardsAuto.apiConfig.url = apiConfig.url;
                    RewardsAuto.apiConfig.hot = apiConfig.hot;

                    try {
                        const hotSource = RewardsAuto.apiConfig.hot[Utils.randomRange(0, RewardsAuto.apiConfig.hot.length - 1)];
                        const result = await Utils.xhr({ url: RewardsAuto.apiConfig.url + hotSource });
                        if (result && Utils.isJSON(result)) {
                            const res = JSON.parse(result);
                            if (res.code == 200) {
                                RewardsAuto.apiConfig.wordIndex = 1;
                                RewardsAuto.apiConfig.wordList = [];
                                for (let i = 0; i < res.data.length; i++) {
                                    RewardsAuto.apiConfig.wordList.push(res.data[i].title);
                                }
                                // 随机打乱数组
                                RewardsAuto.apiConfig.wordList.sort(() => Math.random() - 0.5);
                                sentence = RewardsAuto.apiConfig.wordList[RewardsAuto.apiConfig.wordIndex];
                                // 截断到20-32字符
                                sentence = sentence.substring(0, Utils.randomRange(20, 32));
                                return sentence;
                            }
                        }
                    } catch (e) {
                        Utils.log("🟡", `热搜词获取失败: ${e.message}`);
                    }
                } else {
                    RewardsAuto.apiConfig.wordIndex++;
                    if (RewardsAuto.apiConfig.wordIndex > RewardsAuto.apiConfig.wordList.length - 1) {
                        RewardsAuto.apiConfig.wordIndex = 0;
                    }
                    sentence = RewardsAuto.apiConfig.wordList[RewardsAuto.apiConfig.wordIndex];
                    sentence = sentence.substring(0, Utils.randomRange(20, 32));
                    return sentence;
                }
                Utils.log("🟡", "热搜词接口异常，已使用随机搜索词");
            }
            return sentence;
        },

        async checkSearchRestricted() {
            // 用服务器实际进度判断，避免本地虚增导致误判
            const info = await this.getRewardsInfo();
            const currentTotal = info
                ? info.pc.progress + info.mobile.progress
                : RewardsAuto.state.pcProgress + RewardsAuto.state.mobileProgress;
            const lastTotal = RewardsAuto.state.lastSearchProgress;

            if (lastTotal !== -1) {
                if (currentTotal === lastTotal &&
                    currentTotal < (RewardsAuto.state.pcMax + RewardsAuto.state.mobileMax)) {
                    RewardsAuto.state.restrictedTimes++;
                } else {
                    RewardsAuto.state.restrictedTimes = 0;
                }
            }

            RewardsAuto.state.lastSearchProgress = currentTotal;
            GM_setValue("Config.lastSearchProgress", currentTotal);
            GM_setValue("Config.restrictedTimes", RewardsAuto.state.restrictedTimes);

            if (RewardsAuto.state.restrictedTimes >= 3) {
                Utils.log("🔴", "搜索受限或账号异常，已中断今日搜索！");
                Utils.addTodayWarning("⚠️ 搜索受限或账号异常，已中断今日搜索");
                return true;
            }
            return false;
        }
    };

    const TaskManager = {
        // 任务日期状态
        signDate: 0, readDate: 0, promosDate: 0, searchDate: 0,
        signPoint: -1, signTimes: 0, readTimes: 0, promosTimes: 0,

        // 初始化任务状态
        init() {
            RewardsAuto.state.dateNowNum = Utils.getTodayNum();
            RewardsAuto.state.dateNowStr = Utils.getTodayStr();
            const tasks = GM_getValue("Config.tasks", {});
            this.signDate = tasks.sign || 0;
            this.readDate = tasks.read || 0;
            this.promosDate = tasks.promos || 0;
            this.searchDate = tasks.search || 0;
            this.signPoint = GM_getValue("Config.signPoint", -1);
        },

        // 保存任务状态
        save() {
            GM_setValue("Config.tasks", {
                sign: this.signDate, read: this.readDate,
                promos: this.promosDate, search: this.searchDate
            });
        },

        async doSign() {
            if (!GM_getValue("Tasks.sign", true) || this.signTimes > 2) return;
            if (this.signPoint >= 0 && this.signDate === RewardsAuto.state.dateNowNum) {
                Utils.log("✅", `签入已完成(${this.signPoint}积分)`);
                return;
            }

            await Utils.randomDelay();
            
            let totalPoint = 0;
            
            // App 端签到（静默执行，不写入通知）
            const appPoint = await API.signApp();
            if (appPoint > 0) {
                GM_log(`📱 App签入静默成功 +${appPoint}积分`);
                totalPoint += appPoint;
            }
            
            // PC 端签到
            await Utils.randomDelay(3000, 8000);
            const pcPoint = await API.signPC();
            if (pcPoint >= 0) {
                Utils.log("💻", `PC签入成功！+${pcPoint}积分`);
                totalPoint += pcPoint;
            }
            
            if (totalPoint > 0) {
                this.signPoint = totalPoint;
                this.signDate = RewardsAuto.state.dateNowNum;
                GM_setValue("Config.signPoint", totalPoint);
                this.save();
                Utils.log("🔵", `签入任务完成！总积分 +${totalPoint}`);
            } else {
                this.signTimes++;
                Utils.log("🟡", `签入失败，稍后重试`);
            }
        },

        async doRead() {
            if (!GM_getValue("Tasks.read", true) || this.readTimes > 2) return;
            if (this.readDate === RewardsAuto.state.dateNowNum) {
                Utils.log("✅", "阅读任务已完成");
                return;
            }

            const progress = await API.getReadProgress();
            if (!progress) { this.readTimes++; return; }

            const { progress: cur, max } = progress;
            Utils.log("📖", `阅读进度: ${cur}/${max}`);

            if (cur >= max) {
                this.readDate = RewardsAuto.state.dateNowNum;
                this.save();
                Utils.log("✅", "阅读任务已完成");
                return;
            }

            let successCount = 0;
            for (let i = cur; i < max; i++) {
                const ok = await API.doRead();
                if (!ok) { Utils.log("🟡", `阅读第 ${i + 1} 篇失败，中止`); break; }
                successCount++;
                Utils.log("📖", `阅读文章 ${i + 1}/${max}`);
                await Utils.randomDelay(3000, 8000);
            }

            if (successCount === 0) {
                this.readTimes++;
                Utils.log("🟡", "阅读全部失败，稍后重试");
                return;
            }

            // 累计今日阅读篇数
            const stats = Utils.getTodayStats();
            stats.readCount += successCount;
            Utils.saveTodayStats(stats);

            // 二次验证：确认服务器端进度真的满了
            const verify = await API.getReadProgress();
            if (verify && verify.progress >= verify.max) {
                this.readDate = RewardsAuto.state.dateNowNum;
                this.save();
                Utils.log("🔵", "阅读任务完成！");
            } else {
                this.readTimes++;
                Utils.log("🟡", `阅读已执行但未完成，下次继续`);
            }
        },

        async doPromos(force = false) {
            if (!GM_getValue("Tasks.promos", true) || this.promosTimes > 2) return;
            if (!force && this.promosDate === RewardsAuto.state.dateNowNum) {
                Utils.log("✅", "活动卡片已完成");
                return;
            }

            Utils.log("🧩", "扫描活动卡片...");
            const cards = await API.discoverCards();

            if (cards === null) {
                this.promosTimes++;
                Utils.log("🟡", "活动扫描失败，保留任务并稍后重试");
                return;
            }

            if (cards.length === 0) {
                this.promosDate = RewardsAuto.state.dateNowNum;
                this.save();
                Utils.log("✅", "无新活动卡片");
                return;
            }

            Utils.log("🧩", `发现 ${cards.length} 个卡片`);
            let ok = 0, fail = 0;

            for (const card of cards) {
                Utils.log("  ", `[${card.kind}] ${card.title} +${card.points}p`);
                if (card.kind === "quiz" && !GM_getValue("Tasks.quiz", true)) continue;
                await Utils.randomDelay(3000, 8000);
                const result = await API.claimCard(card);
                result ? ok++ : fail++;
            }

            // 累计今日已领取的卡片数
            if (ok > 0) {
                const stats = Utils.getTodayStats();
                stats.promosClaimed += ok;
                Utils.saveTodayStats(stats);
            }

            if (fail > 0 || ok === 0) {
                this.promosTimes++;
                Utils.log("🟡", `活动本轮未完成: ${ok}成功/${fail}失败，下一轮继续`);
                return;
            }

            await Utils.delay(1000);
            const remaining = await API.discoverCards();
            if (remaining !== null && remaining.length === 0) {
                this.promosDate = RewardsAuto.state.dateNowNum;
                this.save();
                Utils.log("🔵", `活动完成: ${ok}成功/${fail}失败`);
            } else {
                this.promosTimes++;
                Utils.log("🟡", "活动请求已提交，但服务端仍有未完成卡片，下一轮继续");
            }
        },

        async doSearch() {
            if (!GM_getValue("Tasks.search", true)) return;
            
            const info = await API.getRewardsInfo();
            if (!info) { Utils.log("🔴", "无法获取积分信息"); return; }

            RewardsAuto.state.pcProgress = info.pc.progress;
            RewardsAuto.state.pcMax = info.pc.max;
            RewardsAuto.state.mobileProgress = info.mobile.progress;
            RewardsAuto.state.mobileMax = info.mobile.max;

            Utils.log("🔍", `配额: PC ${info.pc.progress}/${info.pc.max}, Mobile ${info.mobile.progress}/${info.mobile.max}`);

            if (info.mobile.max === 0) {
                Utils.log("ℹ️", "你的账号没有移动端搜索配额，将只执行 PC 端搜索");
            }

            const hasMobile = info.mobile.max > 0;
            const pcDone = info.pc.progress >= info.pc.max;
            const mobileDone = !hasMobile || info.mobile.progress >= info.mobile.max;
            if (pcDone && mobileDone) {
                this.searchDate = RewardsAuto.state.dateNowNum;
                this.save();
                const mobileReport = hasMobile ? `\n📱 移动端: ${info.mobile.progress}/${info.mobile.max}` : "";
                Utils.log("✅", `搜索配额已满\n💻 PC端: ${info.pc.progress}/${info.pc.max}${mobileReport}`);
                return;
            }

            if (this.searchDate === RewardsAuto.state.dateNowNum) {
                Utils.log("🟡", "搜索配额未满，继续执行搜索任务");
                this.searchDate = 0;
            }

            const isRestricted = await API.checkSearchRestricted();
            if (isRestricted) {
                this.searchDate = RewardsAuto.state.dateNowNum;
                this.save();
                return;
            }

            const limit = Utils.randomRange(4, 7);
            const canSearchMobile = RewardsAuto.state.mobileMax > 0;
            for (let i = 0; i < limit; i++) {
                if (RewardsAuto.state.pcProgress >= RewardsAuto.state.pcMax && 
                    (!canSearchMobile || RewardsAuto.state.mobileProgress >= RewardsAuto.state.mobileMax)) break;

                let isMobile = false;
                if (canSearchMobile && RewardsAuto.state.mobileProgress < RewardsAuto.state.mobileMax) {
                    isMobile = Math.random() > 0.6;
                }
                let query;
                if (RewardsAuto.apiConfig.mode !== "offline") {
                    query = await API.getHotSearchWord();
                } else {
                    query = RewardsAuto.searchPool[Utils.randomRange(0, RewardsAuto.searchPool.length - 1)];
                }

                Utils.log("🔍", `[${isMobile?"Mobile":"PC"}] 搜索 ${i+1}/${limit}: ${query}`);

                try {
                    const html = await API.getSearchPage(query, isMobile);
                    if (html) {
                        await API.reportSearch(html, query, isMobile);
                        if (isMobile) RewardsAuto.state.mobileProgress += 3;
                        else RewardsAuto.state.pcProgress += 3;
                    }
                } catch (e) {
                    Utils.log("🟡", `搜索失败: ${e.message}`);
                }

                const span = Number(GM_getValue("Config.span", 30));
                const wait = Utils.randomRange((span-15)*1000, (span+15)*1000);
                Utils.log("⏳", `等待 ${wait/1000}秒`);
                await Utils.delay(wait);
            }

            const finalInfo = await API.getRewardsInfo();
            if (finalInfo) {
                const hasMobile = finalInfo.mobile.max > 0;
                const pcDone = finalInfo.pc.progress >= finalInfo.pc.max;
                const mobileDone = !hasMobile || finalInfo.mobile.progress >= finalInfo.mobile.max;
                if (pcDone && mobileDone) {
                    this.searchDate = RewardsAuto.state.dateNowNum;
                    this.save();
                    RewardsAuto.state.restrictedTimes = 0;
                    GM_setValue("Config.restrictedTimes", 0);
                    GM_setValue("Config.lastSearchProgress", -1);
                    const mobileReport = hasMobile ? `\n📱 移动端: ${finalInfo.mobile.progress}/${finalInfo.mobile.max}` : "";
                    Utils.log("🔵", `🔍 搜索任务完成！\n💻 PC端: ${finalInfo.pc.progress}/${finalInfo.pc.max}${mobileReport}`);
                } else {
                    const mobileReport = hasMobile ? `\n📱 移动端: ${finalInfo.mobile.progress}/${finalInfo.mobile.max}` : "";
                    Utils.log("🟡", `搜索已执行，配额未满\n💻 PC端: ${finalInfo.pc.progress}/${finalInfo.pc.max}${mobileReport}`);
                    // 不设置searchDate，下次运行继续搜索
                }
            } else {
                Utils.log("🟡", "搜索已执行，但无法获取最终配额状态");
            }
        },

        async doDailySet() {
            const today = Utils.getTodayNum();
            const processedKey = "Config.dailySetProcessed";
            let processed = GM_getValue(processedKey, []);
            if (processed.length > 0 && processed[0]?.date !== today) processed = [];
            const processedIds = new Set(processed.map(p => p.offerId));

            Utils.log("📅", `开始执行每日活动（已处理 ${processedIds.size} 个）...`);
            await Utils.randomDelay(3000, 8000);

            // ScriptCat 后台调度运行在无 DOM 沙盒中，页面点击任务需等待访问 Rewards 页面时处理
            if (typeof document === "undefined" || !document.querySelectorAll) {
                Utils.log("ℹ️", "后台调度无页面 DOM，跳过每日活动点击；其余 API 任务继续执行");
                return;
            }

            try {
                const clickedCount = await this.clickDailySetLinks(processedIds, processed);
                if (clickedCount > 0) {
                    GM_setValue(processedKey, processed);
                    Utils.log("🔵", `每日活动完成，点击了 ${clickedCount} 个活动`);
                } else {
                    Utils.log("🟡", "未找到可点击的每日活动链接");
                }
            } catch (e) {
                Utils.log("🔴", `每日活动执行异常: ${e.message}`);
            }
        },

        // 打卡/任务卡片：后台只负责按需打开打卡入口，查找和点击都由页面脚本完成。
        // 打卡页地址每月都会变，因此不需要用户手填：页面脚本会从 /earn 自动找本月入口。
        async doPunchCard() {
            if (!GM_getValue("Tasks.punchcard", true)) return;
            const today = RewardsAuto.state.dateNowNum;

            // 脚本更新后清掉当天旧的打卡标记，避免旧版本留下的「今日已处理」挡住新逻辑
            const logicVer = (typeof GM_info !== "undefined" && GM_info.script?.version) || "unknown";
            if (GM_getValue("Config.punchCardLogicVersion", "") !== logicVer) {
                GM_setValue("Config.punchCardOpenDate", 0);
                GM_setValue("Config.punchCardBgDone", 0);
                GM_setValue("Config.punchCardLogicVersion", logicVer);
            }

            const doneKey = "Config.punchCardBgDone";
            if (GM_getValue(doneKey, 0) === today) {
                Utils.log("📅", "打卡任务今日已处理");
                return;
            }

            Utils.log("📅", "检查打卡任务...");

            if (!GM_getValue("Tasks.punchcardAutoOpen", true)) {
                Utils.log("📅", "未开启自动打开页面；可在脚本菜单「🎯 处理打卡任务」中手动处理");
                GM_setValue(doneKey, today);
                return;
            }
            if (GM_getValue("Config.punchCardOpenDate", 0) === today) {
                Utils.log("📅", "今日已自动打开过打卡页");
                GM_setValue(doneKey, today);
                return;
            }

            // 优先使用今天已捕获/自动发现的地址；手填地址只作为兜底
            const configured = String(GM_getValue("Tasks.punchcardUrl", "")).trim();
            // 手填地址如果带着上个月的月份标记（如 ..._BingMonthlyPC_Oct_punchcard），直接忽略
            const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
            const configuredMonth = configured.match(/BingMonthlyPC[_-]([A-Za-z]{3})/i);
            const configuredStale = !!configuredMonth &&
                configuredMonth[1].toLowerCase() !== monthNames[new Date().getMonth()];
            const configuredUrl = configuredStale ? "" : configured;
            if (configuredStale) {
                Utils.log("📅", "手动填写的打卡地址是上个月的，已忽略并自动查找本月入口");
            }
            let discovered = GM_getValue("Config.punchCardUrlDate", 0) === today
                ? String(GM_getValue("Config.punchCardUrl", "")).trim()
                : "";
            // 旧版本可能把普通任务页存成打卡地址，这里只认带 punchcard/monthlypc 的链接
            if (discovered && !/punchcard|monthlypc/i.test(discovered)) {
                discovered = "";
            }

            // 没有今天的地址时，先在后台直接读取 /earn、/dashboard 页面源码查找本月入口
            if (!discovered) {
                for (const pageUrl of ["https://rewards.bing.com/earn", "https://rewards.bing.com/dashboard"]) {
                    try {
                        const html = await Utils.xhr({ url: pageUrl });
                        const found = Utils.extractPunchUrl(html);
                        if (found) {
                            GM_setValue("Config.punchCardUrl", found.split("?")[0]);
                            GM_setValue("Config.punchCardUrlDate", today);
                            discovered = found;
                            Utils.log("📅", `从页面源码发现本月打卡页: ${found}`);
                            break;
                        }
                    } catch (e) {
                        Utils.log("🟡", `读取 ${pageUrl} 查找打卡入口失败: ${e.message}`);
                    }
                }
            }

            const baseUrl = discovered || configuredUrl || "https://rewards.bing.com/earn";
            if (!discovered) {
                Utils.log("📅", configuredUrl
                    ? "后台未发现本月入口，使用手动填写的打卡地址"
                    : "后台页面源码未找到打卡入口，改由页面脚本在 /earn 中继续查找");
            }
            const openUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}bingrewards_punch=1&bingrewards_autoclose=1`;
            try {
                const tab = GM_openInTab(openUrl, { active: false, insert: true, setParent: true });
                GM_setValue("Config.punchCardOpenDate", today);
                GM_setValue(doneKey, today);
                Utils.log("📅", "已在后台标签页打开打卡入口，由页面脚本点击任务");
                // 页面脚本完成后会尝试自行关闭；这里做兜底关闭
                setTimeout(() => {
                    try { tab?.close?.(); } catch (_) {}
                }, 600000);
            } catch (e) {
                Utils.log("🟡", `打开打卡入口失败: ${e.message}`);
            }
        },

        async clickDailySetLinks(processedIds, processed) {
            let clickCount = 0;

            // 多种选择器匹配活动链接（适配不同页面版本）
            const selectors = [
                'a[href*="rnoreward=1"][target="_blank"]',  // 旧版
                'a[href*="/earn/"][target="_blank"]',        // 新版通用
                'a[data-bi-id][href*="earn"]',              // 带数据属性
                'a[data-rac][href*="earn"]',                // RAC 属性
                'a[href*="promotional"]',                   // 活动链接
                '.daily-set a[href]',                       // 每日活动容器
                '.promo-card a[href]',                      // 活动卡片
                'a[href*="offerid"]',                       // 带 offerid 的链接
            ];

            let allLinks = [];
            for (const selector of selectors) {
                try {
                    const links = document.querySelectorAll(selector);
                    if (links.length > 0) {
                        allLinks = [...links];
                        Utils.log("📅", `使用选择器 "${selector}" 找到 ${links.length} 个活动链接`);
                        break;
                    }
                } catch {}
            }

            // 如果上述选择器都没找到，尝试更宽泛的匹配
            if (allLinks.length === 0) {
                const allAnchors = document.querySelectorAll('a[href]');
                for (const anchor of allAnchors) {
                    const href = anchor.href || "";
                    const text = anchor.textContent || "";
                    // 匹配包含 earn 或 promotional 的链接，且不是已完成的
                    if ((href.includes("/earn/") || href.includes("promotional") || href.includes("offerid")) &&
                        !text.includes("已完成") && !text.includes("Completed")) {
                        allLinks.push(anchor);
                    }
                }
                Utils.log("📅", `宽泛匹配找到 ${allLinks.length} 个活动链接`);
            }

            Utils.log("📅", `总共找到 ${allLinks.length} 个每日活动链接`);

            for (const link of allLinks) {
                // 提取 offerId 用于去重
                const href = link.href || "";
                const offerIdMatch = href.match(/[?&]offerid=([^&]+)/i) || href.match(/\/earn\/([^/?#]+)/);
                const offerId = offerIdMatch ? decodeURIComponent(offerIdMatch[1]) : href.slice(0, 120);
                if (processedIds.has(offerId)) continue;

                // 检查是否已完成（多种检测方式）
                const isCompleted = link.querySelector('[class*="Success"]') ||
                                   link.querySelector('[class*="complete"]') ||
                                   link.querySelector('[class*="Complete"]') ||
                                   link.querySelector('[aria-label*="已完成"]') ||
                                   link.querySelector('[aria-label*="Completed"]') ||
                                   link.textContent.includes("已完成") ||
                                   link.textContent.includes("Completed") ||
                                   link.classList.contains("completed");
                if (isCompleted) continue;

                // 获取活动标题（多种方式）
                const titleEl = link.querySelector('[class*="Body2Strong"]') ||
                               link.querySelector('[class*="title"]') ||
                               link.querySelector('[class*="Title"]') ||
                               link.querySelector('span') ||
                               link.querySelector('div');
                const title = titleEl ? titleEl.textContent.trim() : "未知活动";
                Utils.log("📅", `点击活动: ${title}`);

                // 【防封号】点击前随机延迟 3-8 秒
                await Utils.randomDelay(3000, 8000);

                try {
                    link.click();
                    clickCount++;
                    processedIds.add(offerId);
                    processed.push({ date: Utils.getTodayNum(), offerId });
                    await Utils.randomDelay(3000, 8000);
                } catch (e) {
                    Utils.log("🟡", `点击活动失败: ${e.message}`);
                }
            }
            return clickCount;
        },

        async getTaskScanSnapshot() {
            const info = await API.getRewardsInfo();
            const today = RewardsAuto.state.dateNowNum;
            const processed = GM_getValue("Config.dailySetProcessed", []);
            const todayProcessed = processed
                .filter(item => item?.date === today)
                .map(item => item.offerId)
                .sort();
            const details = (info?.todayDetails || [])
                .map(item => `${item.title}:${item.points}:${item.max || 0}`)
                .sort();
            const punchCard = Utils.getPunchCardClicked(today);

            return JSON.stringify({
                signDate: this.signDate,
                readDate: this.readDate,
                promosDate: this.promosDate,
                searchDate: this.searchDate,
                signPoint: this.signPoint,
                balance: info?.balance ?? null,
                pcProgress: info?.pc?.progress ?? null,
                mobileProgress: info?.mobile?.progress ?? null,
                details,
                todayProcessed,
                punchCardCount: punchCard.urls.length
            });
        },

        async runAll(manual = false) {
            RewardsAuto.state.startTime = Utils.getTimestamp();
            Utils.log("🚀", "启动全能自动化任务...");
            this.init();

            const today = RewardsAuto.state.dateNowNum;
            const stopKey = "Config.allTaskScanStopDate";
            if (manual) {
                // 手动启动始终视为新一轮：清除当天的停止标记和连续无变化计数
                GM_setValue(stopKey, 0);
                GM_setValue("Config.allTaskScanEmptyRounds", 0);
                Utils.log("🔄", "手动启动：已清空今日重复扫描计数，从第 1 轮重新开始");
            }
            if (GM_getValue(stopKey, 0) === today) {
                Utils.log("✅", "今日全任务扫描已连续 3 轮无变化，停止运行");
                return;
            }

            const regionOK = await API.checkRegion();
            
            // Token 续期
            let isTokenOK = false;
            if (regionOK) {
                isTokenOK = await API.renewToken();
                if (!isTokenOK) {
                    Utils.log("🟡", "Token失败，跳过签入/阅读");
                    Utils.addTodayWarning("⚠️ Token 失败，已跳过签入/阅读");
                }
            } else {
                Utils.log("🟡", "地区检测失败，尝试执行搜索任务...");
            }

            let emptyRounds = 0;
            let round = 0;
            let previousSnapshot = await this.getTaskScanSnapshot();

            while (emptyRounds < 3) {
                round++;
                Utils.log("🔄", `开始第 ${round} 轮全任务扫描（连续无变化 ${emptyRounds}/3）...`);

                if (regionOK && isTokenOK) {
                    await this.doSign();
                    await Utils.randomDelay();
                    await this.doRead();
                    await Utils.randomDelay();
                } else if (regionOK) {
                    // 地区OK但token失败，尝试签入（可能失败）
                    await this.doSign();
                    await Utils.randomDelay();
                }

                // 每轮重新检查活动卡片，以发现前置任务解锁的新卡片
                await this.doPromos(round > 1);
                await Utils.randomDelay();

                await this.doSearch();

                Utils.log("📅", "开始执行每日活动任务...");
                await Utils.randomDelay();
                try {
                    await this.doDailySet();
                } catch (e) {
                    Utils.log("🟡", `每日活动执行异常: ${e.message}`);
                }

                Utils.log("🎯", "开始执行打卡任务...");
                await Utils.randomDelay();
                try {
                    await this.doPunchCard();
                } catch (e) {
                    Utils.log("🟡", `打卡任务执行异常: ${e.message}`);
                }

                const currentSnapshot = await this.getTaskScanSnapshot();
                if (currentSnapshot !== previousSnapshot) {
                    emptyRounds = 0;
                    GM_setValue("Config.allTaskScanEmptyRounds", 0);
                    previousSnapshot = currentSnapshot;
                    Utils.log("🔵", `第 ${round} 轮发现任务变化，完成本轮后继续扫描`);
                } else {
                    emptyRounds++;
                    GM_setValue("Config.allTaskScanEmptyRounds", emptyRounds);
                    Utils.log("🟡", `第 ${round} 轮未发现新任务或进度变化（${emptyRounds}/3）`);
                }

                if (emptyRounds < 3) {
                    await Utils.randomDelay(3000, 8000);
                }
            }

            GM_setValue(stopKey, today);
            GM_setValue("Config.allTaskScanEmptyRounds", 3);
            Utils.log("✅", "连续 3 轮未发现新任务或未完成任务进度，今日停止全任务扫描");

            // 任务完成汇总
            const endTime = Utils.getTimestamp();
            const totalTime = ((endTime - RewardsAuto.state.startTime) / 1000).toFixed(1);
            Utils.log("📤", "扫描结束，正在生成汇总通知...");

            let info = false;
            let accountName = "";
            try {
                info = await API.getRewardsInfo();
                accountName = await API.getAccountName();
            } catch (e) {
                Utils.log("🟡", `汇总信息获取异常: ${e.message}`);
            }
            if (info) {
                // 构建通知消息：上面汇总，下面详细
                let notifyMsg = `任务完成！\n`;
                notifyMsg += `👤 账号: ${accountName || "未获取到"}\n`;
                notifyMsg += `💰 当前积分: ${info.balance}\n`;
                notifyMsg += `⏱️ 用时: ${totalTime}秒`;

                // 今日累计明细（跨轮次、跨运行统计）
                let todayLines = [];
                try {
                    todayLines = Utils.getTodayDetailLines();
                } catch (e) {
                    Utils.log("🟡", `今日累计明细生成失败: ${e.message}`);
                }

                // 详细数据统一放在汇总下方
                const detailLines = [...todayLines];
                detailLines.push(`🔍 PC搜索: ${info.pc.progress}/${info.pc.max}`);
                detailLines.push(`📱 移动搜索: ${info.mobile.progress}/${info.mobile.max}`);
                if (info.todayDetails && info.todayDetails.length > 0) {
                    for (const detail of info.todayDetails) {
                        if (detail.title !== '必应搜索') {
                            detailLines.push(`✨ ${detail.title}: +${detail.points}`);
                        }
                    }
                }
                if (info.history) {
                    detailLines.push(`📅 本月: ${info.history.month.toLocaleString()}`);
                }
                if (detailLines.length === 0) detailLines.push("暂无记录");

                notifyMsg += `\n──────────\n📋 今日累计\n`;
                notifyMsg += detailLines.join("\n");

                // 发送通知（等待推送完成，避免后台实例提前回收导致漏发）
                await Utils.log("🎉", notifyMsg, true);
                Utils.log("✅", "汇总通知已发送");
                
                // 构建详细日志（控制台显示）
                let detailMsg = `📊 积分明细:\n`;
                detailMsg += `┌─────────────────────────\n`;
                detailMsg += `│ 💰 今日积分: ${info.balance}\n`;
                detailMsg += `├─────────────────────────\n`;
                detailMsg += `│ 🔍 搜索积分:\n`;
                detailMsg += `│   💻 PC端: ${info.pc.progress}/${info.pc.max} ${info.pc.progress >= info.pc.max ? '✅' : '⏳'}\n`;
                detailMsg += `│   📱 移动端: ${info.mobile.progress}/${info.mobile.max} ${info.mobile.progress >= info.mobile.max ? '✅' : '⏳'}\n`;
                detailMsg += `│   📊 合计: ${info.pc.progress + info.mobile.progress}/${info.pc.max + info.mobile.max}\n`;
                detailMsg += `├─────────────────────────\n`;
                
                // 今日活动明细
                if (info.todayDetails && info.todayDetails.length > 0) {
                    detailMsg += `│ 📋 今日活动:\n`;
                    for (const detail of info.todayDetails) {
                        if (detail.max) {
                            detailMsg += `│   🔍 ${detail.title}: ${detail.points}/${detail.max}\n`;
                        } else {
                            detailMsg += `│   ✨ ${detail.title}: +${detail.points}\n`;
                        }
                    }
                    detailMsg += `├─────────────────────────\n`;
                }
                
                // 历史积分
                if (info.history) {
                    detailMsg += `│ 📈 历史积分:\n`;
                    detailMsg += `│   📅 本月: ${info.history.month.toLocaleString()}\n`;
                    detailMsg += `│   📆 今年: ${info.history.year.toLocaleString()}\n`;
                    detailMsg += `│   🏆 生存期: ${info.history.lifetime.toLocaleString()}\n`;
                    detailMsg += `├─────────────────────────\n`;
                }
                detailMsg += `│ ⏱️ 用时: ${totalTime} 秒\n`;
                detailMsg += `└─────────────────────────`;
                
                Utils.log("📊", detailMsg);
            } else {
                let fallbackMsg = `任务完成！\n`;
                fallbackMsg += `👤 账号: ${accountName || "未获取到"}\n`;
                fallbackMsg += `⏱️ 用时: ${totalTime}秒`;
                let todayLines = [];
                try {
                    todayLines = Utils.getTodayDetailLines();
                } catch (e) {
                    Utils.log("🟡", `今日累计明细生成失败: ${e.message}`);
                }
                fallbackMsg += `\n──────────\n📋 今日累计\n`;
                fallbackMsg += todayLines.length > 0 ? todayLines.join("\n") : "暂无记录";
                await Utils.log("🎉", fallbackMsg, true);
                Utils.log("✅", "汇总通知已发送");
            }
        }
    };

    // 自动打卡标签页的上下文标记（URL 参数 + sessionStorage，防止页面跳转后丢失）
    const isAutoPunchContext = () => {
        try {
            if (typeof location !== "undefined" && new URLSearchParams(location.search).get("bingrewards_punch") === "1") return true;
            if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("bingrewards_punch") === "1") return true;
        } catch (_) {}
        return false;
    };
    const shouldAutoCloseContext = () => {
        try {
            if (typeof location !== "undefined" && new URLSearchParams(location.search).get("bingrewards_autoclose") === "1") return true;
            if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("bingrewards_autoclose") === "1") return true;
        } catch (_) {}
        return false;
    };
    const clearAutoPunchContext = () => {
        try {
            sessionStorage.removeItem("bingrewards_punch");
            sessionStorage.removeItem("bingrewards_autoclose");
            sessionStorage.removeItem("bingrewards_tried_dashboard");
        } catch (_) {}
    };

    if (typeof location !== "undefined" && typeof document !== "undefined" && location.hostname === "rewards.bing.com") {
        const punchCardSelectors = [
            "a[href*='punchcard']", "a[href*='quest']",
            "a[data-rac][href*='earn']", "a.cursor-pointer[href]",
            "a.group\\/ctrl",
            "a[href*='/earn/quest/']",
            "a[href*='promotional']",
            "a[data-bi-id][href*='earn']",
        ];
        const textPatterns = ["盗贼之海", "五月亮点来袭", "每日活动", "Daily Set", "限时活动", "特别活动"];

        // 从任意文本（页面源码、RSC 数据、接口响应）中提取本月打卡页地址
        const extractPunchUrl = (text) => Utils.extractPunchUrl(text);

        const savePunchUrl = (url) => {
            if (!url) return;
            GM_setValue("Config.punchCardUrl", url.split("?")[0]);
            GM_setValue("Config.punchCardUrlDate", Utils.getTodayNum());
            console.log(`[Rewards Auto] 捕获打卡页地址: ${url}`);
        };

        // 自动模式：拦截页面请求，捕获客户端异步加载的打卡地址
        const installPunchCapture = () => {
            if (!isAutoPunchContext()) return;
            const pw = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;

            try {
                if (pw.fetch && !pw.__bingRewardsPunchHooked) {
                    const origFetch = pw.fetch;
                    pw.fetch = function(...args) {
                        const p = origFetch.apply(this, args);
                        p.then(res => {
                            try {
                                res.clone().text().then(text => savePunchUrl(extractPunchUrl(text))).catch(() => {});
                            } catch (_) {}
                        }).catch(() => {});
                        return p;
                    };
                    pw.__bingRewardsPunchHooked = true;
                }
            } catch (_) {}

            try {
                const XHR = pw.XMLHttpRequest;
                if (XHR && !XHR.prototype.__bingRewardsPunchHooked) {
                    const origSend = XHR.prototype.send;
                    XHR.prototype.send = function(...args) {
                        this.addEventListener("load", () => {
                            try {
                                if (typeof this.responseText === "string") {
                                    savePunchUrl(extractPunchUrl(this.responseText));
                                }
                            } catch (_) {}
                        });
                        return origSend.apply(this, args);
                    };
                    XHR.prototype.__bingRewardsPunchHooked = true;
                }
            } catch (_) {}
        };
        installPunchCapture();

        const clickDetailTasks = async () => {
            const today = Utils.getTodayNum();
            const isAutoPunchTab = isAutoPunchContext();
            const shouldAutoClose = shouldAutoCloseContext();

            // 下载/安装类任务不做：脚本不安装任何应用；同时排除兑换、登录等非任务按钮
            const isSkippedTask = (btn) => {
                const href = btn.href || "";
                return /microsoft-store|apps\.microsoft|aka\.ms|\/download|\/install|\/redeem|login\.live|account\.microsoft|rewardspanel/i.test(href);
            };

            const collectButtons = () => {
                const enabled = (el) =>
                    el.disabled !== true &&
                    el.getAttribute("aria-disabled") !== "true" &&
                    el.getAttribute("data-disabled") !== "true";

                // 1) 旧版/常见结构：带 data-rac 的任务按钮
                const primary = [...document.querySelectorAll(
                    "a[data-rac][target='_blank'], button[data-rac], [role='button'][data-rac]"
                )].filter(el => enabled(el) && !isSkippedTask(el));
                if (primary.length > 0) return primary;

                // 2) data-rac 名称本身像任务的元素
                const taskRac = [...document.querySelectorAll("[data-rac]")]
                    .filter(el => {
                        if (!enabled(el) || isSkippedTask(el)) return false;
                        const rac = el.getAttribute("data-rac") || "";
                        if (!/task|quest|punch|check-?in|complete|offer/i.test(rac)) return false;
                        const href = el.href || "";
                        if (/\/(?:dashboard|earn)(?:[?#]|$)/i.test(href)) return false;
                        if (/\/earn\/quest\//i.test(href)) return false;
                        return true;
                    });
                if (taskRac.length > 0) return taskRac;

                // 3) 新版结构：所有最内层可点击的 data-rac 元素，排除页面导航/打卡入口
                const rac = [...document.querySelectorAll("[data-rac]")]
                    .filter(el => {
                        if (!enabled(el) || isSkippedTask(el)) return false;
                        if (el.querySelector("[data-rac]")) return false;
                        const href = el.href || "";
                        if (/\/(?:dashboard|earn)(?:[?#]|$)/i.test(href)) return false;
                        if (/\/earn\/quest\//i.test(href)) return false;
                        return true;
                    });
                if (rac.length > 0) return rac;

                // 4) 最后兜底：文字像任务动作的按钮
                return [...document.querySelectorAll("button, [role='button'], a[href]")]
                    .filter(el => {
                        if (!enabled(el) || isSkippedTask(el)) return false;
                        const text = (el.textContent || "").trim().replace(/\s+/g, " ");
                        if (!text || text.length > 40) return false;
                        return /开始|前往|访问|搜索|查看|参与|立即|start|go|visit|search|view|play|learn/i.test(text);
                    });
            };

            // href + 按钮文字 + data-rac 作为当天去重标识
            const taskKey = (btn) => {
                const href = btn.href || "";
                const text = (btn.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80);
                const rac = btn.getAttribute("data-rac") || btn.getAttribute("data-bi-id") || btn.id || "";
                return `${href}#${text}#${rac}`;
            };

            // 防止多个打卡页面同时点击（例如手动打开页面时后台又自动打开一个）
            const lockKey = "Config.punchCardRunning";
            const lockTime = Number(GM_getValue(lockKey, 0)) || 0;
            if (Date.now() - lockTime < 5 * 60 * 1000) {
                console.log("[Rewards Auto] 另一个打卡页面正在处理，跳过本次");
                return 0;
            }
            GM_setValue(lockKey, Date.now());

            console.log("[Rewards Auto] 开始扫描打卡任务按钮...");
            // 等待页面渲染出任务按钮（最多 30 秒）
            for (let i = 0; i < 30 && collectButtons().length === 0; i++) {
                await Utils.delay(1000);
            }
            if (collectButtons().length === 0) {
                const racEls = [...document.querySelectorAll("[data-rac]")];
                console.log(`[Rewards Auto] 未找到可点击任务按钮（页面 data-rac 元素共 ${racEls.length} 个）`);
                const samples = racEls.slice(0, 30).map(el => {
                    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 20);
                    return `${el.tagName.toLowerCase()}[data-rac="${el.getAttribute("data-rac")}"]${text ? `(${text})` : ""}`;
                });
                console.log(`[Rewards Auto] data-rac 样例: ${samples.join(" | ") || "(无)"}`);
            }

            let totalClicked = 0;
            // 最多 3 轮：部分任务完成后会解锁新任务
            for (let pass = 1; pass <= 3; pass++) {
                const clicked = Utils.getPunchCardClicked(today);
                const clickedKeys = new Set(clicked.urls);
                const buttons = collectButtons().filter(btn => !clickedKeys.has(taskKey(btn)));
                if (buttons.length === 0) {
                    if (pass === 1) console.log("[Rewards Auto] 没有可点击的打卡任务（可能已完成）");
                    break;
                }

                console.log(`[Rewards Auto] 第 ${pass} 轮发现 ${buttons.length} 个可点击任务`);
                for (const btn of buttons) {
                    console.log(`[Rewards Auto] 任务按钮: "${(btn.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)}" -> ${btn.href || "(button)"}`);
                }
                for (const btn of buttons) {
                    // 页面可能重渲染，点击前重新查找同一个按钮
                    const key = taskKey(btn);
                    const current = collectButtons().find(item => taskKey(item) === key);
                    if (!current) continue;

                    const text = (current.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50) || "未知任务";
                    console.log(`[Rewards Auto] 点击任务: ${text}`);

                    // 【防封号】点击前后随机延迟
                    await Utils.randomDelay(3000, 8000);
                    try {
                        current.click();
                        totalClicked++;
                        const latest = Utils.getPunchCardClicked(today);
                        if (!latest.urls.includes(key)) {
                            latest.urls.push(key);
                            GM_setValue("Config.punchCardClicked", latest);
                        }
                    } catch (e) {
                        console.error(`[Rewards Auto] 点击任务失败: ${e.message}`);
                    }
                    await Utils.randomDelay(3000, 8000);
                }

                // 等待页面更新，再扫描是否有新解锁的任务
                await Utils.delay(5000);
            }

            if (totalClicked > 0) {
                console.log(`[Rewards Auto] 打卡任务本轮共点击 ${totalClicked} 个`);
                GM_setValue("Config.punchCardBgDone", today);
            } else {
                console.log("[Rewards Auto] 本轮没有点击任何打卡任务");
            }

            GM_setValue(lockKey, 0);
            clearAutoPunchContext();

            // 自动打开的后台标签页在完成后自行关闭
            if (isAutoPunchTab && shouldAutoClose) {
                setTimeout(() => { try { window.close(); } catch (_) {} }, 5000);
            }
            return totalClicked;
        };

        const clickPunchCards = async (depth = 0) => {
            if (depth > 5) {
                console.log("[Rewards Auto] 打卡递归深度超限，停止");
                return;
            }
            const today = Utils.getTodayNum();
            const stateKey = "Config.punchCardState";
            const dateKey = "Config.punchCardDate";
            const savedDate = GM_getValue(dateKey, 0);
            let state = savedDate === today ? GM_getValue(stateKey, 0) : 0;

            if (state >= 2) {
                console.log("[Rewards Auto] 打卡任务已完成");
                return;
            }

            console.log(`[Rewards Auto] 打卡任务: ${state}/2`);
            // 【防封号】操作前随机延迟 3-8 秒
            await Utils.randomDelay(3000, 8000);

            let found = [];
            for (const sel of punchCardSelectors) {
                try {
                    found = await Utils.waitForElementsByText(sel, textPatterns, 10000);
                    if (found.length > 0) break;
                } catch {}
            }

            if (found.length === 0) {
                console.log("[Rewards Auto] 未找到打卡卡片");
                return;
            }

            if (state < found.length) {
                const target = found[state];
                console.log(`[Rewards Auto] 点击: ${target.pattern}`);
                // 【防封号】点击前随机延迟
                await Utils.randomDelay();
                try {
                    target.element.click();
                    GM_setValue(stateKey, state + 1);
                    GM_setValue(dateKey, today);
                    if (state + 1 < 2) {
                        // 【防封号】两次点击间隔 5-10 秒
                        await Utils.randomDelay(5000, 10000);
                        await clickPunchCards(depth + 1);
                    }
                } catch (e) {
                    console.error(`[Rewards Auto] 点击失败: ${e.message}`);
                }
            }
        };

        // 在 /earn 或 /dashboard 页面自动查找本月的打卡入口（地址每月变化，不能写死）
        const findPunchCardUrl = async () => {
            for (let i = 0; i < 30; i++) {
                // 1) 网络拦截已经捕获到的地址
                const captured = GM_getValue("Config.punchCardUrlDate", 0) === Utils.getTodayNum()
                    ? String(GM_getValue("Config.punchCardUrl", "")).trim()
                    : "";
                if (captured && /\/earn\/quest\//.test(captured) && /punchcard|monthlypc/i.test(captured)) return captured;

                // 2) 页面上已渲染的 quest 链接
                const links = [...document.querySelectorAll("a[href*='quest']")];
                const punchLink = links.find(a => /punchcard|monthlypc/i.test(a.href))
                    || links.find(a => /punchcard|打卡|本月任务|月度任务/i.test(a.textContent || ""));
                if (punchLink) return punchLink.href;

                // 3) 页面源码 / RSC 数据里的地址或 questId
                if (i % 2 === 0) {
                    const url = extractPunchUrl(document.documentElement.innerHTML);
                    if (url) return url;
                }
                await Utils.delay(1000);
            }
            return "";
        };

        const startPunchCards = () => {
            setTimeout(async () => {
                const isAutoPunchTab = isAutoPunchContext();
                const shouldAutoClose = shouldAutoCloseContext();
                const path = location.pathname;

                if (path.includes("/earn/quest/") || path.includes("punchcard")) {
                    // 只有确实是本月打卡页才记录地址，避免普通任务页覆盖打卡地址
                    if (/punchcard|monthlypc/i.test(location.href)) {
                        GM_setValue("Config.punchCardUrl", location.href.split("?")[0]);
                        GM_setValue("Config.punchCardUrlDate", Utils.getTodayNum());
                    }
                    console.log("[Rewards Auto] 检测到任务详情页，开始执行任务点击...");
                    await clickDetailTasks();
                } else if (isAutoPunchTab) {
                    console.log("[Rewards Auto] 自动模式：正在查找本月打卡入口...");
                    const punchUrl = await findPunchCardUrl();
                    if (punchUrl) {
                        savePunchUrl(punchUrl);
                        console.log(`[Rewards Auto] 找到打卡页，正在跳转: ${punchUrl}`);
                        // 用 sessionStorage 记住自动模式，防止跳转后参数丢失
                        try {
                            sessionStorage.setItem("bingrewards_punch", "1");
                            if (shouldAutoClose) sessionStorage.setItem("bingrewards_autoclose", "1");
                        } catch (_) {}
                        const nextUrl = `${punchUrl}${punchUrl.includes("?") ? "&" : "?"}bingrewards_punch=1${shouldAutoClose ? "&bingrewards_autoclose=1" : ""}`;
                        location.href = nextUrl;
                        return;
                    }

                    // 兜底 1：点击文字含"打卡/本月任务"的卡片，让页面自己跳转
                    const cardText = (el) => (el.textContent || "").trim().replace(/\s+/g, " ");
                    const cardScore = (text) => {
                        let score = 0;
                        if (/punchcard|打卡/i.test(text)) score += 3;
                        if (/本月|月度|monthly/i.test(text)) score += 2;
                        if (/任务/i.test(text)) score += 1;
                        return score;
                    };
                    const candidates = [...document.querySelectorAll("a, button, [role='button'], [data-rac]")];
                    const card = candidates
                        .filter(el => {
                            const text = cardText(el);
                            return text.length > 0 && text.length <= 60 && cardScore(text) > 0;
                        })
                        .sort((a, b) => cardScore(cardText(b)) - cardScore(cardText(a)) || cardText(a).length - cardText(b).length)[0];
                    if (card) {
                        console.log(`[Rewards Auto] 未提取到地址，尝试点击打卡卡片: "${(card.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40)}"`);
                        try {
                            sessionStorage.setItem("bingrewards_punch", "1");
                            if (shouldAutoClose) sessionStorage.setItem("bingrewards_autoclose", "1");
                        } catch (_) {}
                        card.click();
                        return;
                    }

                    // 兜底 2：/earn 没有就去 /dashboard 再找一次
                    let triedDashboard = false;
                    try { triedDashboard = sessionStorage.getItem("bingrewards_tried_dashboard") === "1"; } catch (_) {}
                    if (!triedDashboard && !path.includes("/dashboard")) {
                        try { sessionStorage.setItem("bingrewards_tried_dashboard", "1"); } catch (_) {}
                        console.log("[Rewards Auto] /earn 未找到，转到 /dashboard 继续查找...");
                        location.href = `https://rewards.bing.com/dashboard?bingrewards_punch=1${shouldAutoClose ? "&bingrewards_autoclose=1" : ""}`;
                        return;
                    }

                    // 诊断信息，便于定位页面结构
                    const rac = [...document.querySelectorAll("[data-rac]")].map(el => el.getAttribute("data-rac")).filter(Boolean);
                    console.log(`[Rewards Auto] 未找到本月打卡入口（quest 链接 ${document.querySelectorAll("a[href*='quest']").length} 个，data-rac ${rac.length} 个，页面含 punchcard=${/punchcard|monthlypc/i.test(document.documentElement.innerHTML)}）`);
                    console.log(`[Rewards Auto] data-rac 样例: ${rac.slice(0, 20).join(" | ") || "(无)"}`);
                    if (shouldAutoClose) {
                        setTimeout(() => { try { window.close(); } catch (_) {} }, 3000);
                    }
                    return;
                } else {
                    console.log("[Rewards Auto] 检测到奖励主页，开始执行卡片点击...");
                    await clickPunchCards();
                }

                // 自动打开的打卡页只处理打卡，不再触发每日活动等其他点击
                if (!isAutoPunchTab) {
                    console.log("[Rewards Auto] 开始执行每日活动点击...");
                    await TaskManager.doDailySet();
                }
            }, 3000); // 延迟 3 秒等待页面渲染
        };
        
        if (document.readyState === "complete" || document.readyState === "interactive") {
            startPunchCards();
        } else {
            document.addEventListener("DOMContentLoaded", startPunchCards);
        }
    }

    GM_registerMenuCommand("🔑 手动授权", () => {
        GM_openInTab("https://login.live.com/oauth20_authorize.srf?client_id=0000000040170455&response_type=code&scope=service::prod.rewardsplatform.microsoft.com::MBI_SSL&redirect_uri=https://login.live.com/oauth20_desktop.srf", { active: true });
    });

    GM_registerMenuCommand("📋 粘贴授权码", () => {
        const code = prompt("粘贴授权页面跳转后的完整URL:");
        if (code?.trim()) {
            GM_setValue("Config.code", code.trim());
            alert("已保存！");
        }
    });

    GM_registerMenuCommand("📊 Token状态", () => {
        const token = GM_getValue("Config.token", false);
        const time = GM_getValue("Config.tokenTime", 0);
        const days = time > 0 ? Math.floor((Utils.getTimestamp() - time) / 86400000) : "未知";
        alert(`Token: ${token?"已保存":"无"}\n年龄: ${days}天\n授权码: ${GM_getValue("Config.code","")?"有":"无"}`);
    });

    GM_registerMenuCommand("🚀 立即运行", () => {
        // 后台脚本菜单回调只写入请求，由后台实例消费，避免异步回调被 ScriptCat 提前回收
        GM_setValue("Config.manualRunRequest", {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            time: Date.now()
        });
        GM_log("🚀 已提交手动运行请求，后台任务将立即开始");
    });

    GM_registerMenuCommand("🎯 处理打卡任务", () => {
        const today = Utils.getTodayNum();
        const configured = String(GM_getValue("Tasks.punchcardUrl", "")).trim();
        const discoveredRaw = GM_getValue("Config.punchCardUrlDate", 0) === today
            ? String(GM_getValue("Config.punchCardUrl", "")).trim()
            : "";
        // 只认带 punchcard/monthlypc 的自动发现地址，避免旧版本存下的普通任务页
        const discovered = /punchcard|monthlypc/i.test(discoveredRaw) ? discoveredRaw : "";
        // 没有已知地址时打开 /earn，由页面脚本自动查找本月打卡入口
        const url = discovered || configured || "https://rewards.bing.com/earn";
        const openUrl = `${url}${url.includes("?") ? "&" : "?"}bingrewards_punch=1`;
        GM_openInTab(openUrl, { active: true });
    });

    // 通知接口配置菜单
    GM_registerMenuCommand("🔔 配置通知接口", () => {
        const configNames = [
            { key: "Notice.wework", name: "企业微信 Webhook", hint: "群机器人webhook key" },
            { key: "Notice.dingding", name: "钉钉机器人 Access Token", hint: "不加签，关键词需包含 #" },
            { key: "Notice.feishu", name: "飞书机器人 Webhook", hint: "不加签，关键词需包含 #" },
            { key: "Notice.pushme", name: "PushMe Key", hint: "push.i-i.me 推送key" },
            { key: "Notice.bark", name: "Bark Key", hint: "bark.day.app 推送key" },
            { key: "Notice.telegramToken", name: "Telegram Bot Token", hint: "通过 @BotFather 创建机器人后获取" },
            { key: "Notice.telegramChatId", name: "Telegram Chat ID", hint: "先给机器人发消息，再通过 @userinfobot 获取" }
        ];
        
        let configStr = "🔔 通知接口配置\n";
        configStr += "==================\n\n";
        configNames.forEach((item, index) => {
            const saved = GM_getValue(item.key, "");
            configStr += `${index + 1}. ${item.name}\n`;
            configStr += `   状态: ${saved ? "✅ 已配置" : "❌ 未配置"}\n`;
            configStr += `   说明: ${item.hint}\n\n`;
        });
        configStr += "自定义 Webhook 请在脚本设置的「Webhook」分组中配置。\n\n";
        configStr += "请输入要配置的编号 (1-7)，或输入 0 清除所有配置：";
        
        const choice = prompt(configStr);
        if (!choice) return;
        
        const num = parseInt(choice);
        if (num === 0) {
            if (confirm("确定要清除所有通知接口配置吗？")) {
                configNames.forEach(item => GM_setValue(item.key, ""));
                GM_setValue("Webhook.enabled", false);
                GM_setValue("Webhook.url", "");
                GM_setValue("Webhook.username", "");
                GM_setValue("Webhook.password", "");
                GM_setValue("Webhook.token", "");
                GM_setValue("Webhook.headers", "");
                GM_setValue("Webhook.body", "");
                alert("所有通知接口配置已清除！");
            }
            return;
        }
        
        if (num >= 1 && num <= 7) {
            const selected = configNames[num - 1];
            const current = GM_getValue(selected.key, "");
            const newValue = prompt(`配置 ${selected.name}\n\n当前值: ${current || "(空)"}\n\n请输入新的值：`, current);
            if (newValue !== null) {
                GM_setValue(selected.key, newValue.trim());
                alert(`${selected.name} 已${newValue.trim() ? "配置" : "清除"}！`);
            }
        } else {
            alert("无效的编号！");
        }
    });

    GM_registerMenuCommand("📢 测试通知", () => {
        // 菜单回调可能在异步请求完成前被 ScriptCat 回收，改由后台实例消费请求后发送。
        GM_setValue("Config.noticeTestRequest", {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            time: Date.now()
        });
        GM_log("📢 已提交测试通知请求，后台实例将发送到已配置渠道");
        alert("测试通知请求已提交，请稍后检查各通知渠道！");
    });

    GM_registerMenuCommand("📋 查看通知状态", () => {
        const wework = GM_getValue("Notice.wework", "");
        const dingding = GM_getValue("Notice.dingding", "");
        const feishu = GM_getValue("Notice.feishu", "");
        const pushme = GM_getValue("Notice.pushme", "");
        const bark = GM_getValue("Notice.bark", "");
        const telegramToken = GM_getValue("Notice.telegramToken", "");
        const telegramChatId = GM_getValue("Notice.telegramChatId", "");
        const webhookEnabled = GM_getValue("Webhook.enabled", false);
        const webhookUrl = GM_getValue("Webhook.url", "");

        let status = "📊 通知接口配置状态：\n\n";
        status += `企业微信: ${wework ? "✅ 已配置" : "❌ 未配置"}\n`;
        status += `钉钉: ${dingding ? "✅ 已配置" : "❌ 未配置"}\n`;
        status += `飞书: ${feishu ? "✅ 已配置" : "❌ 未配置"}\n`;
        status += `PushMe: ${pushme ? "✅ 已配置" : "❌ 未配置"}\n`;
        status += `Bark: ${bark ? "✅ 已配置" : "❌ 未配置"}\n`;
        status += `Telegram Token: ${telegramToken ? "✅ 已配置" : "❌ 未配置"}\n`;
        status += `Telegram Chat ID: ${telegramChatId ? "✅ 已配置" : "❌ 未配置"}\n`;
        status += `自定义 Webhook: ${webhookEnabled && webhookUrl ? "✅ 已启用" : "❌ 未启用"}\n`;
        alert(status);
    });

    const init = () => {
        // 自动打开的打卡页只执行页面点击，不启动完整任务流程，避免重复运行
        if (isAutoPunchContext()) {
            return;
        }

        TaskManager.init();

        // 本次更新后默认开启「自动打开页面点击打卡」，只需迁移一次
        if (!GM_getValue("Config.punchAutoMigrated", false)) {
            GM_setValue("Tasks.punchcardAutoOpen", true);
            GM_setValue("Config.punchAutoMigrated", true);
        }

        // 兼容旧版本：Telegram 配置曾短暂放在 Telegram 分组，现统一放回 Notice 分组
        const legacyTelegramToken = GM_getValue("Telegram.telegramToken", "");
        const legacyTelegramChatId = GM_getValue("Telegram.telegramChatId", "");
        if (legacyTelegramToken) {
            if (!GM_getValue("Notice.telegramToken", "")) {
                GM_setValue("Notice.telegramToken", legacyTelegramToken);
            }
            GM_setValue("Telegram.telegramToken", "");
        }
        if (legacyTelegramChatId) {
            if (!GM_getValue("Notice.telegramChatId", "")) {
                GM_setValue("Notice.telegramChatId", legacyTelegramChatId);
            }
            GM_setValue("Telegram.telegramChatId", "");
        }

        const consumeNoticeTestRequest = (request) => {
            if (!request || !request.id) return;
            const consumedId = GM_getValue("Config.noticeTestConsumedId", "");
            if (request.id === consumedId) return;
            GM_setValue("Config.noticeTestConsumedId", request.id);
            RewardsAuto.state.sendMSG = "🧪 这是一条测试消息\n如果你看到这条消息，说明通知接口配置成功！";
            Utils.log("📢", "测试通知已发送", true);
        };

        try {
            GM_addValueChangeListener("Config.noticeTestRequest", (_name, _oldValue, newValue) => {
                consumeNoticeTestRequest(newValue);
            });
        } catch (_) {}

        consumeNoticeTestRequest(GM_getValue("Config.noticeTestRequest", null));

        const consumeManualRunRequest = (request) => {
            if (!request || !request.id) return false;
            const consumedId = GM_getValue("Config.manualRunConsumedId", "");
            if (request.id === consumedId) return false;
            GM_setValue("Config.manualRunConsumedId", request.id);
            Utils.log("🚀", "收到手动运行请求，立即开始任务");
            try {
                GM_notification({ title: "🚀 手动运行已开始", text: "任务完成后会发送汇总通知" });
            } catch (_) {}
            TaskManager.runAll(true).catch(e => Utils.log("🔴", `手动运行异常: ${e.message}`, true));
            return true;
        };

        // 监听脚本菜单提交的手动运行请求
        try {
            GM_addValueChangeListener("Config.manualRunRequest", (_name, _oldValue, newValue) => {
                consumeManualRunRequest(newValue);
            });
        } catch (_) {}

        // 如果请求在脚本重启/重新启用前已写入，启动时补消费一次
        const manualStarted = consumeManualRunRequest(GM_getValue("Config.manualRunRequest", null));

        // 手动请求已启动任务时，不再额外预约一次自动启动，避免同一轮并发
        if (manualStarted) return;

        // 检查今日任务是否已完成
        const isKeep = GM_getValue("Config.keep", true);
        const checkDone = (enabled, date) => !enabled || date === RewardsAuto.state.dateNowNum;
        const isAllDone = checkDone(GM_getValue("Tasks.sign"), TaskManager.signDate) &&
                          checkDone(GM_getValue("Tasks.read"), TaskManager.readDate) &&
                          checkDone(GM_getValue("Tasks.promos"), TaskManager.promosDate) &&
                          checkDone(GM_getValue("Tasks.search"), TaskManager.searchDate);

        if (!isKeep && isAllDone) {
            Utils.log("💤", "今日任务已全部完成");
            return;
        }

        // 【防封号核心】随机延迟 8-17 秒启动，避免定时器特征
        const delay = Utils.randomRange(8000, 17000);
        Utils.log("⏳", `${delay/1000}秒后启动...`);
        setTimeout(() => {
            TaskManager.runAll().catch(e => Utils.log("🔴", `自动运行异常: ${e.message}`, true));
        }, delay);
    };

    // 清除可能影响搜索的 Cookie
    try {
        GM_cookie("delete", { url: "https://bing.com", name: "_EDGE_S" });
    } catch (_) {}
    init();

})();



