# Distribución Android mediante Supabase Storage

La aplicación consulta la versión publicada en GitHub Releases, pero descarga el APK desde una URL pública de Supabase Storage:

```text
https://gxkpiqmuhvpsbmooieod.supabase.co/storage/v1/object/public/app-releases/AtentV1.apk
```

## Configuración inicial

1. Ejecutar `infrastructure/supabase_storage_releases.sql` en el SQL Editor del proyecto Supabase.
2. En Storage, abrir el bucket `app-releases` y subir el APK estable con el nombre exacto `AtentV1.apk`.
3. Verificar la URL pública en una ventana privada del navegador. Debe iniciar la descarga sin autenticación.
4. Publicar también la GitHub Release con su etiqueta técnica superior a la versión beta, por ejemplo `v1.4`, para que el comprobador detecte la actualización.

El bucket solo debe contener artefactos públicos de distribución. No se deben subir secretos, archivos de configuración ni datos de usuarios.

## Futuras versiones

Para cambiar el nombre o la ubicación del APK, definir `VITE_ANDROID_RELEASE_URL` antes de compilar el bundle web. Android seguirá exigiendo confirmación manual y permiso para instalar desde esa fuente; no existe instalación silenciosa para este APK.
