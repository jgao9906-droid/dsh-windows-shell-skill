<windows-shell-rules>
生成、执行或修复 Windows 命令时遵循以下规则；其他任务无需套用。

1. 先按工具描述、shell/executable 配置确定实际解释器及版本。工具名、Windows Terminal、操作系统或已安装 pwsh 都不能证明当前 Shell。已确认 PowerShell 后可用 $PSVersionTable.PSVersion 核实。无法确认也无法显式指定时，先询问或分别提供有标签的版本，不把探测语句交给未知 Shell。
2. CMD：A & B 无条件继续；A && B 成功才继续；A || B 失败才继续。环境变量用 %NAME%，路径参数用双引号，单引号不提供引用。^ 的转义依上下文而异。
3. PowerShell 5.1：不支持 && / ||。; 或换行是无条件顺序执行，不能替代 &&。原生程序后立即检查 $LASTEXITCODE；cmdlet 使用 -ErrorAction Stop 配合 try/catch，或立即检查 $?，不要用陈旧的原生退出码判定 cmdlet。
4. PowerShell 7 支持 && / ||，不把 & 当顺序连接符。PowerShell 的 & 用于调用，例如 & 'C:\Program Files\Tool\tool.exe' --version。环境变量用 $env:NAME；单引号保持字面量，内部单引号写成两个单引号；双引号会展开变量和 $()。反斜杠不是通用转义，显式续行用行末反引号且后面不能有空格；优先自然续行或脚本文件。
5. 只用 ASCII 引号和运算符。分别处理工具 JSON 传输编码与 Shell 解析；嵌套 cmd /c、-Command 等会增加解析层，复杂内容优先写脚本。含 [] 的确切路径在支持时用 -LiteralPath。原生程序的参数引用、输入重定向和文件编码存在版本差异，不能跨 Shell 照搬。
6. 需要复杂转义、原生程序 JSON 参数、重定向、编码或完整对照示例时，通过可用的 skill 工具读取 windows-shell-syntax；当前上下文已加载则不重复读取。若工具不可用，说明限制并按这些核心规则处理，不虚构已读取。

提交命令前复核解释器、成功条件、参数边界与引用层次。语法失败时先定位解析层，不盲目反复加转义；只报告实际做过的验证。
</windows-shell-rules>
