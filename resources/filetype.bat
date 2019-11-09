@ECHO OFF &SETLOCAL
(for /r %%a in (*.jpg *.bmp *.png) do (
    set "width="
    set "height="
    for /f "tokens=1*delims=:" %%b in ('"MEDIAINFO --INFORM=Image;%%Width%%:%%Height%% "%%~a""') do (
        echo(%%~a 1 1 1 %%~b %%~c
    )
))>infofile.txt
type infofile.txt