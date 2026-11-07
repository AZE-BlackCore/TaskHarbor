; ============================================================================
; 自定义 NSIS 安装脚本片段（通过 package.json 的 build.nsis.include 引入）
;
; 修复：升级安装时旧版本卸载失败导致整个安装中止、卡在
;   "Failed to uninstall old application files. Please try running the installer again.: 2"
;
; 根因：electron-builder 默认逻辑 uninstallOldVersion 运行旧卸载程序，若其返回非 0
; （常见于旧卸载程序被杀软实时扫描锁住 exe 导致删不掉文件，或旧安装目录已不完整），
; handleUninstallResult 会弹窗并 Quit，升级直接失败。
;
; 解法：利用 electron-builder 预留钩子 customUnInstallCheck /
; customUnInstallCheckCurrentUser —— 当旧卸载未成功时，不再中止，而是：
;   1) 尽力强制删除旧安装目录（新文件随后会覆盖写入）；
;   2) 清理旧卸载注册表项与 NSIS 记忆键，避免与新安装冲突；
;   3) 继续安装流程。
; 该宏在 handleUninstallResult 内被调用后立即 Return，因此无论旧卸载成功与否都会走到这里，
; 对「全新安装」也是安全的（注册表项不存在时 DeleteRegKey 为空操作）。
; ============================================================================

!macro customUnInstallCheck
  DetailPrint "旧版本卸载返回错误码 $R0，执行强制清理后继续安装..."
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

; ============================================================================
; customInit —— 安装开始前结束所有旧实例进程（.onInit 阶段，早于文件复制）
;
; 修复「半升级」：曾出现「新 renderer/preload + 旧 app.asar」的混合版本安装。
;   根因：build.extraResources 把 renderer/dist、preload/dist 放在 resources/ 外部目录，
;   可以被独立覆盖；而 app.asar 与主 exe 若被仍在运行的旧进程占用则替换失败，
;   安装器却未中止 —— 最终 UI 是新版、主进程仍是旧版，表现为：
;     Error invoking remote method 'sync:history': No handler registered for 'sync:history'
;   同时残留的旧实例继续监听 18766，新实例开启同步报 EADDRINUSE。
;
; 解法：先优雅关闭（1.14.3 起窗口收到 WM_CLOSE 会干净退出并保存数据），
; 再对托盘常驻 / 后台子进程等残留做强制结束，确保后续文件替换不被占用。
; 说明：customInit 位于 installer.nsi 的非 BUILD_UNINSTALLER 分支内，生成卸载器时
; 不会执行；全新安装时 FindProcess 返回非 0，整段为空操作。
; ============================================================================

!ifndef nsProcess::FindProcess
  !include "nsProcess.nsh"
!endif

!macro customInit
  DetailPrint "安装前检查：正在结束旧版本进程，避免安装文件被占用..."
  ; 1) 优雅关闭：给 app 保存数据的机会
  ${nsProcess::CloseProcess} "${APP_EXECUTABLE_FILENAME}" $R0
  Sleep 1000
  ; 2) 托盘常驻 / 后台子进程未退出时强制结束（FindProcess 返回 0 表示进程仍在）
  ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
  ${if} $R0 == 0
    DetailPrint "检测到旧版本残留进程，强制结束后继续安装..."
    ${nsProcess::KillProcess} "${APP_EXECUTABLE_FILENAME}" $R0
    Sleep 800
  ${endif}
  ${nsProcess::Unload}
!macroend
