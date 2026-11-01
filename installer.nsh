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
