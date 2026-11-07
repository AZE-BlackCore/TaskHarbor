; ============================================================================
; 自定义 NSIS 安装脚本片段（通过 package.json 的 build.nsis.include 引入）
;
; 1) customUnInstallCheck / customUnInstallCheckCurrentUser
;    修复旧版本卸载失败导致升级中止（"Failed to uninstall old application
;    files...: 2"）。旧卸载未成功时不再 Quit，而是强制清理旧目录与注册表后继续。
;
; 2) customInit
;    修复「半升级」与安装器弹出「$(appRunning) 无法关闭，请手动关闭它」。
;    根因：extraResources 的 renderer/preload 在 resources/ 外部目录可独立覆盖，
;    而 app.asar / 主 exe 被仍在运行的旧进程占用时替换失败，安装器却未中止；
;    同时 electron-builder 内置 CHECK_APP_RUNNING（allowOnlyOneInstallerInstance.nsh）
;    检测到残留进程会弹窗要求用户手动关闭。
; ============================================================================

; ---------------------------------------------------------------------------
; 结束所有旧实例进程。
; 关键：复用 electron-builder 内置 CHECK_APP_RUNNING 同款 taskkill 命令
; （cmd.exe /c taskkill /im "${APP_EXECUTABLE_FILENAME}" /fi "USERNAME eq %USERNAME%"），
; 已验证对中文 exe 名有效。1.15.1 曾用 nsProcess 插件，实测未能结束残留进程，
; 仍触发 appRunning 弹窗，故改为 taskkill，且不做进程探测判断（无条件执行，
; 进程不存在时 taskkill 仅返回非 0，不影响安装）。
; ---------------------------------------------------------------------------
!macro ForceCloseApp
  ; 1) 温和终止：发 WM_CLOSE，让 app 走 before-quit 保存数据（1.14.3 起干净退出）
  nsExec::Exec `%SYSTEMROOT%\System32\cmd.exe /c taskkill /im "${APP_EXECUTABLE_FILENAME}" /fi "USERNAME eq %USERNAME%"`
  Sleep 1200
  ; 2) 无条件强制结束进程树：覆盖托盘常驻 / Electron 子进程等残留
  nsExec::Exec `%SYSTEMROOT%\System32\cmd.exe /c taskkill /f /t /im "${APP_EXECUTABLE_FILENAME}" /fi "USERNAME eq %USERNAME%"`
  Sleep 800
!macroend

!macro customUnInstallCheck
  DetailPrint "旧版本卸载返回错误码 $R0，执行强制清理后继续安装..."
  ; 旧卸载程序可能自身也卡在关闭检测上，先补一次强制结束再删目录
  !insertmacro ForceCloseApp
  ReadRegStr $R2 HKEY_CURRENT_USER "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${if} $R2 != ""
    DetailPrint "强制删除旧安装目录: $R2"
    RMDir /r "$R2"
  ${endif}
  DeleteRegKey HKEY_CURRENT_USER "${UNINSTALL_REGISTRY_KEY}"
  DeleteRegKey HKEY_CURRENT_USER "Software\54c8eda9-4e0d-58e1-9270-0962a40743b0"
!macroend

!macro customUnInstallCheckCurrentUser
  !insertmacro customUnInstallCheck
!macroend

; ---------------------------------------------------------------------------
; customInit —— installer.nsi 的 Function .onInit 内通过 !ifmacrodef 调用，
; 早于 CHECK_APP_RUNNING 与 installApplicationFiles；位于非 BUILD_UNINSTALLER
; 分支内，生成卸载器时不执行。全新安装时 taskkill 为空操作，安全。
; ---------------------------------------------------------------------------
!macro customInit
  DetailPrint "安装前检查：正在结束旧版本进程，避免安装文件被占用..."
  !insertmacro ForceCloseApp
!macroend
