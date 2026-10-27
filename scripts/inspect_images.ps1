Add-Type -AssemblyName System.Drawing
foreach ($name in @('Feliz.jpg', 'dudoso.jpg', 'enojado.jpg', 'tranquilo.jpg')) {
    $path = "D:\PROGRAMACION\PROYECTOS\Atent\3ds\" + $name
    $bmp = [System.Drawing.Bitmap]::FromFile($path)
    $c = $bmp.GetPixel(5, 5)
    $center = $bmp.GetPixel([int]($bmp.Width / 2), [int]($bmp.Height / 2))
    [Console]::WriteLine($name + " size: " + $bmp.Width + "x" + $bmp.Height + " | corner: R=" + $c.R + ",G=" + $c.G + ",B=" + $c.B + " | center: R=" + $center.R + ",G=" + $center.G + ",B=" + $center.B)
    $bmp.Dispose()
}
