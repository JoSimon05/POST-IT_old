
!macro customUnInstall
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "POST-IT"
    RMDir /r "$PROFILE\AppData\Local\post-it-updater"
!macroend