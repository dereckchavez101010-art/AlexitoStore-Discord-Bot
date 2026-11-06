# Alexito Store · Bot de entregas privadas

Este proyecto registra `/generar`. Solo el ID configurado en `OWNER_ID` puede usarlo.
El comando solicita cliente de Discord, nombre, UID de dispositivo y plan. El bot firma
la licencia con Ed25519 siguiendo el formato de tu `Index.html`, crea un canal privado
y publica KEY, LINK y STATUS.

## Requisitos
- Node.js 20.11 o superior.
- Aplicación y bot creados en Discord Developer Portal.
- Bot invitado a tu servidor con los permisos **Manage Channels**, **View Channels**,
  **Send Messages**, **Embed Links** y **Read Message History**.
- Tu clave privada Ed25519 en formato PEM PKCS#8.

## Preparación
1. Descomprime el ZIP.
2. Copia `.env.example` como `.env`.
3. Completa `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` y `OWNER_ID`.
4. Copia tu archivo PEM a `secrets/ALEXITO_LICENSE_PRIVATE_KEY.pem`.
5. En una terminal dentro de esta carpeta ejecuta:

   ```bash
   npm install
   npm run register
   npm start
   ```

6. En Discord usa `/generar` y completa los cuatro campos.

## Privacidad
- `OWNER_ID` se valida en el servidor; los demás usuarios no pueden generar licencias.
- El canal se crea con `ViewChannel` denegado para `@everyone` y concedido solo al
  propietario, al cliente seleccionado y al bot.
- El bot necesita permiso **Manage Channels** para crear el canal y establecer permisos.
- La categoría configurada en `DELIVERY_CATEGORY_ID` también debe permitir que el bot
  administre canales. No concedas acceso de lectura a `@everyone` en la categoría.
- Si el cliente no está en el servidor, no se podrá añadir su permiso de acceso.
- Los canales creados quedan en el servidor; elimina manualmente los que ya no necesites.

## Seguridad de la clave
**Nunca envíes tu PEM por Discord, no lo pegues en este chat y no lo subas a GitHub.**
Mantén `secrets/` fuera de repositorios. En hosting, guarda el PEM como secreto/archivo
privado y configura `LICENSE_PRIVATE_KEY_PATH` con la ruta protegida. No incluyas el PEM
en el ZIP que compartas.

## Compatibilidad de la licencia
Se conserva la estructura de firma de tu Index:
`ALX1.<base64url(canonical)>.<base64url(firma Ed25519)>`

El texto firmado conserva el orden:
`ALX1|id|device|label|issued|expires`

El UID debe ser el identificador de dispositivo de 32 bytes que genera tu app, con
prefijo `ALX1-REQ-` o su base64url sin prefijo.

## STATUS
La versión iOS se muestra como "No especificada" porque `/generar` no la recibe.
El modelo se muestra como "IPHONE", igual que el ejemplo. Si quieres que el cliente
indique su versión exacta, se puede añadir un campo `ios` al comando.
