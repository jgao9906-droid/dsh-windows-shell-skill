---
name: "windows-shell-syntax"
description: "在 Windows 上生成、执行或修复 CMD、Windows PowerShell 5.1、PowerShell 7 命令时使用。先识别工具实际使用的 Shell 与版本，再选择连接符、引号、转义、变量、路径、重定向和编码；尤其用于修复 &&、||、&、^、反引号和引号混用。"
---

# Windows Shell 语法

你正在为 DeepSeek Harness 中的工具生成命令。目标是让命令被实际解释器正确解析，并保持原本的执行顺序、成功条件和参数值。技能提供指令，不会替换工具、强制切换 Shell，也不会自动重写或拦截命令。

## 先确定解释器

1. 优先读取工具描述、shell/executable 配置和会话环境。工具名叫 Bash、Terminal 或 exec，并不能证明内部是 Bash、CMD 或 PowerShell。Windows Terminal 也只是终端宿主。
2. Windows PowerShell 5.1 通常由 `powershell.exe` 启动；PowerShell 7 通常由 `pwsh.exe` 启动。只有确认是 PowerShell 后，才用 `$PSVersionTable.PSVersion.ToString()` 核实版本；只有确认是 CMD 后，才用 `ver`。不要把探测语句直接交给未知语法的解释器。
3. 工具允许显式选择解释器时，明确指定目标。不能确定、不能指定而语法又依赖环境时，询问实际 Shell；只需提供示例时，可以分别标注三个版本。不从操作系统、提示符外观或“已安装 pwsh”推断当前 Shell。
4. 每条命令按它自己的工具环境判断；调用 `cmd /c`、`powershell -Command`、`pwsh -Command` 时，存在外层和内层两次解析。不要沿用上一工具的转义方式。

## 符号速查

| 意图 | CMD | PowerShell 5.1 | PowerShell 7 |
|---|---|---|---|
| 无条件顺序执行 | `A & B` | `A; B` 或换行 | `A; B` 或换行 |
| A 成功才执行 B | `A && B` | A 后立即判断成功状态 | `A && B` |
| A 失败才执行 B | `A || B` | A 后立即判断失败状态 | `A || B` |
| 管道 | `A | B`，通常传文本 | `A | B`，cmdlet 间传对象 | 同 5.1；原生程序的流行为另核实 |
| 环境变量 | `%TEMP%` | `$env:TEMP` | `$env:TEMP` |
| 普通变量 | `set "name=value"`、`%name%` | `$name = 'value'`、`$name` | 同 5.1 |
| 含空格的路径参数 | `"C:\Work Files\a.txt"` | `'C:\Work Files\a.txt'` | 同 5.1 |
| 执行带引号的程序路径 | `"C:\Program Files\Tool\tool.exe" --version` | `& 'C:\Program Files\Tool\tool.exe' --version` | 同 5.1 |
| 常见转义符 | `^`，具体位置有差异 | 反引号（ASCII U+0060） | 同 5.1 |
| 丢弃标准输出 | `>nul` | `>$null` | `>$null` |

`&&` 和 `||` 从 PowerShell 7 才支持。PowerShell 5.1 的 `;` 不等价于 `&&`；PowerShell 的 `&` 是调用运算符，不是 CMD 的顺序连接符。PowerShell 7 的后缀 `&` 还能表示后台作业，不要用它表示普通顺序执行。

## 保留成功与失败语义

PowerShell 5.1 调用原生程序后，立即检查 `$LASTEXITCODE`（下一次原生调用可能覆盖它）：

```powershell
git diff --check
if ($LASTEXITCODE -eq 0) { git status --short }
```

这是针对原生程序的例子。cmdlet 通常不更新 `$LASTEXITCODE`；用 cmdlet 的 `-ErrorAction Stop` 配合 `try/catch`，或在下一条语句立即读取 `$?`。不要执行日志、赋值等其他命令后再读取上一条的 `$?`。若只执行外部程序，用它实际的退出码判断，不假设 `try/catch` 会自动捕获非零退出码。

CMD 用 `if errorlevel 1` 判断退出码至少为 1；它不是“等于 1”。在括号块中，`%var%` 可能在整块执行前展开，不能靠块内 `%ERRORLEVEL%` 读取刚执行命令的退出码。需要精确处理时分行或用明确的批处理控制流。延迟展开会影响含 `!` 的数据，不为方便而随意启用。

## 引号、变量与路径

- 只使用 ASCII 引号和运算符，不生成弯引号、全角符号或 Markdown 包装进工具参数。
- CMD 的单引号不提供字符串引用；含空格路径用双引号。双引号不阻止 `%VAR%` 展开，延迟展开开启时也不阻止 `!VAR!`。`^` 不是所有位置的通用转义，不盲目替换所有特殊字符。
- PowerShell 单引号是字面量，内部单引号写成 `''`。双引号会展开 `$var`、`$()` 与反引号转义；字面美元符号优先放进单引号。变量紧跟冒号等字符时用 `${name}` 明确边界，双引号内访问属性用 `$($obj.Name)`。
- PowerShell 中 `\` 不是通用转义符：路径 `'C:\Work Files\a.txt'` 无需把反斜杠翻倍。若命令作为 JSON 字段传输，则在 JSON 层编码 `\` 和 `"`；JSON 编码与 Shell 转义分开处理，优先让工具客户端序列化对象。
- PowerShell 的带引号程序路径本身只是字符串，要用 `&` 执行；参数分别传递，不把整条命令拼成一个字符串后交给 `&`。不要用 `Invoke-Expression` 解决引号问题。
- cmdlet 操作含 `[]` 等字符的确切路径时使用支持的 `-LiteralPath`。CMD 切换到其他盘符目录用 `cd /d "D:\Work Files"`；PowerShell 用 `Set-Location -LiteralPath 'D:\Work Files'`。
- 不假设 PowerShell 的 `dir`、`del`、`echo`、`curl` 与 CMD 或 Unix 命令兼容。PowerShell 中优先用完整 cmdlet 名；需要真正的 curl 时显式用 `curl.exe` 并确认存在。

## 换行、输入输出与嵌套

- 优先单行、短命令或脚本文件。CMD 跨行用行末 `^`；PowerShell 跨行可用行末反引号，两者后面都不能留空格或注释。PowerShell 优先使用括号内、管道后的自然续行或参数 splatting，避免脆弱的显式续行。
- CMD 支持 `< input.txt`；PowerShell 不支持这种标准输入重定向语法。文本可按需要用 `Get-Content -Raw -LiteralPath 'input.txt' | program.exe`，但这可能改变编码或末尾换行，不能当作二进制等价替换。精确字节输入优先使用程序的文件参数或经验证的进程 API。
- `2>&1` 可以合并错误与输出，但 PowerShell 有多种流。`>` 的默认文本编码在 Windows PowerShell 5.1 和 PowerShell 7 不同；写 UTF-8 文本时明确选择方案。5.1 的 `-Encoding UTF8` 带 BOM，7 的 `-Encoding utf8` 默认不带 BOM。二进制数据、原生输出重定向与 PowerShell 7.4+ 的字节保留差异，查阅对应版本文档，不跨版本保证字节完全相同。
- PowerShell 5.1 与 PowerShell 7.3+ 向原生程序传递空字符串、内嵌双引号的行为有差异，且取决于目标 `.exe`、`.cmd` 等和 `$PSNativeCommandArgumentPassing`。不要假设“PowerShell 单引号包住 JSON”就能保证原生程序收到原样 JSON。复杂 JSON 优先写文件，使用该程序支持的文件参数。
- 多层引号、正则、JSON、批处理块变复杂时，优先写 `.ps1` 或 `.cmd`，用匹配的解释器执行；`.ps1` 用 `-NoProfile -File` 并分别传参。5.1 要读取包含中文的 UTF-8 脚本时注意 BOM。不要为修复语法自动修改执行策略。
- CMD 交互命令 `for %F ...` 与批处理文件 `for %%F ...` 不同；从 `.cmd/.bat` 调用另一个批处理并希望返回时使用 `call`。不要把脚本语法原样贴进交互工具。

## 提交命令前复核

确认解释器及版本、条件执行语义、参数边界和引号闭合、外层传输编码、文件编码。需要验证时只用无副作用的解析或临时目录里的同类小例子。遇到失败，按语法、参数、程序退出码分别定位，不反复盲加转义符。告诉用户实际检查了什么；未执行的环境明确标为未验证。

需要具体命令对照时读取 [references/examples.md](references/examples.md)。
