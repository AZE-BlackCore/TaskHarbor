; ============================================================================
; 自定义 NSIS 安装脚本片段（通过 package.json 的 build.nsis.include 引入）
;
; 现场实测结论（1.16.2）：
;   1. electron-builder 内置 CHECK_APP_RUNNING 用
;      `tasklist | find.exe <中文 exe 名>` 判定进程，且 taskkill 带
;      `/fi "PID ne $pid"` 会排除 App 主进程 → 两轮重试后弹
;      $(appCannotBeClosed)「无法关闭…单击重试」，安装停滞。
;   2. 旧版脚本用 `nsExec::Exec "%SYSTEMROOT%\System32\cmd.exe /c taskkill ..."`
;      结束进程，实测在 NSIS 里**完全无效**（App 进程一个不少）；而直接执行
;      `taskkill.exe /f /t /im "小湾清单.exe"` 退出码 0、瞬间清空全部进程。
;      差异来自 nsExec 插件 + cmd.exe 这一层（代码页 / 环境变量展开 / 插件目录）。
;   3. 进程没被结束时，主 exe 被占用，NSIS File 写入失败弹窗 → 安装永久卡住，
;      并留下「卸载项已删、主程序仍是旧版」的半升级现场。
;
; 修复：
;   - ForceCloseApp 改用 NSIS **内置 ExecWait 直调 taskkill.exe**（不经 nsExec
;     插件、不经 cmd.exe、不带任何 /fi 过滤），ExecWait 不依赖插件目录，
;     在 .onInit / Section / 卸载器里都能执行。
;   - customUnInstallCheck 是实测**必定执行**的钩子（handleUninstallResult 中
;     无条件调用），且位于 installApplicationFiles 之前，作为可靠性主力；
;     customInit / customCheckAppRunning 保留为多重保险。
;   - customCheckAppRunning 完全替换内置检测，移除两个 MessageBox 与重试循环。
;   - 安装轨迹日志 %TEMP%\cove-install-trace.log，便于现场定位安装卡死。
; ============================================================================

Var /GLOBAL coveTraceFile

; 追加一行到安装轨迹日志（NSIS 内置文件指令，不依赖插件）
!macro CoveTrace _msg
  ClearErrors
  FileOpen $coveTraceFile "$TEMP\cove-install-trace.log" a
  FileWrite $coveTraceFile "${_msg}$\n"
  FileClose $coveTraceFile
  ClearErrors
!macroend

; ---------------------------------------------------------------------------
; 结束所有旧实例进程（全程无 MessageBox）
;   1) 温和终止：发 WM_CLOSE，让 app 走 before-quit 保存数据
;   2) /f /t 强杀进程树：不带 /fi，避免 USERNAME / PID 过滤漏杀
;   ExecWait 是 NSIS 内置指令；$0 会收到 taskkill 退出码（仅用于日志）。
; ---------------------------------------------------------------------------
!macro ForceCloseApp
  !insertmacro CoveTrace "ForceCloseApp begin"
  ExecWait `"$SYSDIR\taskkill.exe" /im "${APP_EXECUTABLE_FILENAME}"`
  !insertmacro CoveTrace "gentle taskkill exit=$0"
  Sleep 800
  ExecWait `"$SYSDIR\taskkill.exe" /f /t /im "${APP_EXECUTABLE_FILENAME}"`
  !insertmacro CoveTrace "force taskkill exit=$0"
  Sleep 1200
  !insertmacro CoveTrace "ForceCloseApp end"
!macroend

; ---------------------------------------------------------------------------
; 完全接管「应用是否在运行」检测（electron-builder 官方替换钩子）
; ---------------------------------------------------------------------------
!macro customCheckAppRunning
  !insertmacro CoveTrace "customCheckAppRunning begin"
  !insertmacro ForceCloseApp
  !insertmacro CoveTrace "customCheckAppRunning end"
!macroend

; ---------------------------------------------------------------------------
; .onInit：安装器启动即清理
; ---------------------------------------------------------------------------
!macro customInit
  !insertmacro CoveTrace "customInit begin"
  !insertmacro ForceCloseApp
  !insertmacro CoveTrace "customInit end"
!macroend

; ---------------------------------------------------------------------------
; 升级时的可靠性主力：handleUninstallResult 会无条件调用本宏，且位于
; installApplicationFiles 之前。删旧目录 + 清注册表后继续安装，
; 不再因旧卸载器失败而 Quit（原 "Failed to uninstall old application files"）。
; ---------------------------------------------------------------------------
!macro customUnInstallCheck
  !insertmacro CoveTrace "customUnInstallCheck begin (R0=$R0)"
  !insertmacro ForceCloseApp
  ; 只有旧卸载器真的失败（$R0 != 0）才强制删目录/清注册表。
  ; 卸载成功时旧文件已由卸载器清掉，安装器直接覆盖即可；无条件 RMDir /r
  ; 会把 2600+ 个文件全删一遍再重写，是安装耗时数分钟、体感「卡住」的主因，
  ; 且中途失败会留下「卸载项已删、主程序仍旧版」的半升级现场。
  ${if} $R0 != 0
    !insertmacro CoveTrace "customUnInstallCheck uninstall failed, force cleanup"
    ReadRegStr $R2 HKEY_CURRENT_USER "${INSTALL_REGISTRY_KEY}" InstallLocation
    ${if} $R2 != ""
      RMDir /r "$R2"
      Sleep 500
      RMDir /r "$R2"
    ${endif}
    DeleteRegKey HKEY_CURRENT_USER "${UNINSTALL_REGISTRY_KEY}"
    DeleteRegKey HKEY_CURRENT_USER "Software\54c8eda9-4e0d-58e1-9270-0962a40743b0"
  ${endif}
  !insertmacro CoveTrace "customUnInstallCheck end"
!macroend

!macro customUnInstallCheckCurrentUser
  !insertmacro customUnInstallCheck
!macroend
