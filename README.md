# dsh-windows-shell-skill

给 DeepSeek Harness 的 Windows Shell 语法技能：区分 CMD、Windows PowerShell 5.1、PowerShell 7，减少连接符、引号、转义和变量混用。

技能名称：`windows-shell-syntax`。安装插件后，精简规则会在模型请求前自动进入会话上下文，无需每次提醒。规则仅约束 Windows 命令相关任务，复杂情况再按需读取完整技能；它不会改写或拦截工具命令，也不能保证模型永不写错。

插件检查可见会话历史与当前待提交消息，只在缺少当前版本规则时补入。正常步骤不会重复追加；恢复会话保留规则时不会重复；压缩隐藏规则后会补回；不同会话各自处理。精简规则见 `shell-rules.md`，修改后重启对应 profile。

## 方式一：作为 DSH 插件安装

本目录是可直接运行的插件源码，无运行时 npm 依赖、无安装脚本、无构建步骤。在 CMD、PowerShell 5.1 或 7 中执行同一条命令（本机路径）：

```text
dsh plugin --profile web add github:jgao9906-droid/dsh-windows-shell-skill
```

`web` 换成你实际使用的 profile。仓库为私有时，安装所用的 Git 需要已获得该仓库的读取权限。若已安装旧目录中的版本，使用本条命令替换来源。重启对应的 DSH profile 后，精简规则自动加入下一次获准执行的模型步骤。

本地开发也可使用 `dsh plugin --profile web add "link:<本地仓库绝对路径>"`。

此插件使用 DSH 的 `ctx.skills.register()` 和 `agent/pre-step` 瀑布事件，profile 需要已有 `skills` 注册服务；插件通过 `inject = ['skills']` 声明依赖。精简规则自动注入不需要模型调用 skill 工具；读取完整技能则需要 preset 启用该工具。

卸载：
```text
dsh plugin --profile web rm dsh-windows-shell-skill
```

## 方式二：只安装技能文件

把 `skills/windows-shell-syntax` 整个文件夹复制到目标项目的 `.dsh/skills/`，形成：

```text
<project>/.dsh/skills/windows-shell-syntax/SKILL.md
<project>/.dsh/skills/windows-shell-syntax/references/examples.md
```

需要全局可用时，复制到实际 DSH 配置根目录的 `skills/` 下（默认 `~/.dsh/skills/`；如设置了 `DSH_HOME` 则使用其配置路径）。这种方式依赖 profile 中启用的 `dsh-skill-filesystem` 和 skill 工具。纯文件安装不会启用自动注入；需要自动注入时请选择方式一。

## 使用示例

> 接下来使用 PowerShell 5.1 执行命令，保留上一条成功才继续的语义。

> 请先读取 windows-shell-syntax，检查这条 CMD 命令的引号和特殊字符，然后给出 PowerShell 7 的等价写法。

技能内容覆盖解释器识别、条件执行、环境变量、带空格路径、单/双引号、换行、标准输入、编码、原生程序参数及嵌套解释器。

## 开发与兼容性

```text
npm test
```

默认运行 7 个单元测试；设置 `DSH_MODULES` 为 DSH 安装目录下的 `node_modules/@deepseek-ai` 后，额外运行真实 Cordis 事件、Session 持久化、恢复、压缩及卸载的集成测试。无需启动模型或提供 API Key。

插件封装按本机安装的 DSH `0.2.1-rc.2` API 开发。具体验证结果见随包 `VALIDATION.md`；未测试版本不作兼容保证。SKILL.md 的头部由本插件读取，维护时保持两个字段为单行 JSON 双引号字符串；它们同时也是合法 YAML。正文修改后重启插件安装所在 profile；纯文件安装方式由文件系统技能提供方读取。

官方参考：[DSH Skills](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.md)、[Microsoft PowerShell 条件连接符](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_pipeline_chain_operators)。
