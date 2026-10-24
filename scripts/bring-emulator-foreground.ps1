Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WindowFinder {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    public static void FindAndShow(uint targetPid) {
        EnumWindows((hWnd, lParam) => {
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            if (pid == targetPid) {
                var sb = new StringBuilder(256);
                GetWindowText(hWnd, sb, 256);
                string title = sb.ToString();
                bool vis = IsWindowVisible(hWnd);
                Console.WriteLine("Found window: " + hWnd + " Title: " + title + " Visible: " + vis);
                ShowWindow(hWnd, 9); // SW_RESTORE
                SetForegroundWindow(hWnd);
            }
            return true;
        }, IntPtr.Zero);
    }
}
'@

$proc = Get-Process -Name "qemu-system-x86_64" -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "Target PID: $($proc.Id)"
    [WindowFinder]::FindAndShow([uint32]$proc.Id)
} else {
    Write-Host "qemu-system-x86_64 not found"
}
