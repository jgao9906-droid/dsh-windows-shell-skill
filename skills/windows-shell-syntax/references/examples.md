# 同一意图的三种写法

这些命令是交给目标 Shell 的原始文本。若传入 JSON 工具字段，另由序列化器编码，不手工叠加 Shell 转义。

## 检查 Git 格式，成功后再看工作区

CMD：
```bat
git diff --check && git status --short
```

PowerShell 5.1：
```powershell
git diff --check
if ($LASTEXITCODE -eq 0) { git status --short }
```

PowerShell 7：
```powershell
git diff --check && git status --short
```

## cmdlet 失败时停止

PowerShell 5.1 和 7：
```powershell
try {
    Set-Location -LiteralPath 'D:\Work Files' -ErrorAction Stop
    Get-ChildItem -LiteralPath '.' -ErrorAction Stop
} catch {
    throw
}
```

不要写 `Set-Location ...; Get-ChildItem ...` 来表达“仅目录切换成功才列文件”。

## 原样包含美元符号、与号、括号、单引号

PowerShell 5.1 和 7（cmdlet 参数）：
```powershell
Write-Output 'Price $5 & (sample) O''Brien'
```

CMD：
```bat
echo Price $5 ^& ^(sample^) O'Brien
```

这个 CMD 示例不适用于包含 `%`、`!` 的任意数据或任意嵌套的命令。不要把 `echo` 当成可靠的任意数据序列化器。

## 原生命令的非零退出码

PowerShell 5.1 和 7：
```powershell
git diff --check
$code = $LASTEXITCODE
if ($code -ne 0) { throw "git diff --check failed: $code" }
git status --short
```

`$LASTEXITCODE` 是外部程序退出码；不要用它判定 `Get-ChildItem` 这样的 cmdlet。

## 无 BOM 的 UTF-8 文本

PowerShell 5.1（明确的 .NET 写文件 API）：
```powershell
$path = Join-Path (Get-Location).Path 'sample.txt'
[System.IO.File]::WriteAllText($path, '你好', [System.Text.UTF8Encoding]::new($false))
```

PowerShell 7：
```powershell
Set-Content -LiteralPath 'sample.txt' -Value '你好' -Encoding utf8NoBOM -NoNewline
```

写文件前仍需满足当前任务的覆盖权限和目标路径要求。

## 需要读取的官方资料

- [DSH Skills 服务与注册 API](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.md)
- [Microsoft：CMD](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmd)
- [Microsoft：PowerShell 条件管道连接符](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_pipeline_chain_operators)
- [Microsoft：引号规则](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules)
- [Microsoft：解析与原生参数传递](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_parsing)
- [Microsoft：字符编码](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_character_encoding)
