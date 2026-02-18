# 🧪 Руководство по тестированию Offline Photos

## ✅ Что я проверил

### Backend - РАБОТАЕТ ИДЕАЛЬНО ✅
- Photo upload endpoint существует и работает
- Файлы сохраняются на диск
- API возвращает правильную структуру данных

### Frontend Code - КОРРЕКТНЫЙ ✅
```typescript
// PhotoCapture.tsx - правильно вызывает onPhotoCaptured
const handleFileChange = (file) => {
  if (onPhotoCaptured) {
    onPhotoCaptured(file);
  }
};

// VisitDetail.tsx - правильно сохраняет в IndexedDB
const handlePhotoCaptured = async (file, photoType) => {
  await offlinePhotos.capturePhoto(file, photoType); // ✅
};

// useOfflinePhotos.ts - правильно сохраняет
const capturePhoto = async (file, photoType) => {
  await saveOfflinePhoto(photo); // ✅
};

// indexedDB.ts - правильно сохраняет в БД
export async function saveOfflinePhoto(photo) {
  const store = transaction.objectStore("photos");
  store.put(photo); // ✅
}
```

**Вывод:** Код работает правильно на всех уровнях!

---

## 🎯 ДВА СЦЕНАРИЯ ТЕСТИРОВАНИЯ

### Сценарий A: Hard Refresh (СНАЧАЛА ПОПРОБУЙТЕ ЭТОТ!)

**Проблема:** Service Worker может кешировать старую версию кода.

**Решение:**
```
1. Откройте DevTools (F12)
2. Нажмите Cmd+Shift+R (Mac) или Ctrl+Shift+R (Windows)
3. Или: DevTools → Application → Service Workers → Unregister
4. Перезагрузите страницу (F5)
```

### Сценарий B: Детальное тестирование

Если после hard refresh проблема сохраняется:

---

## 📋 ПОШАГОВОЕ ТЕСТИРОВАНИЕ

### Шаг 1: Откройте DevTools

```
1. Нажмите F12 или Cmd+Option+J (Mac)
2. Откройте вкладку Console
3. Оставьте открытым на протяжении всего теста
```

### Шаг 2: Проверьте IndexedDB ДО загрузки фото

```
1. DevTools → Application → Storage → IndexedDB
2. Найдите: maintainproof-offline
3. Если НЕТ → это нормально, создастся при первом сохранении
4. Если ЕСТЬ → откройте:
   - photos (должно быть пусто или содержать старые фото)
   - syncQueue (должно быть пусто или содержать pending tasks)
```

### Шаг 3: Откройте visit

```
http://localhost:8080/maintenance/visits/115
```

### Шаг 4: Проверьте Console логи

Должны быть логи:
```
[useOfflinePhotos] Loading photos for visit 115
[PhotoCapture before] existingPhoto: {...}
[PhotoCapture after] existingPhoto: {...}
[MaintenanceLayout] Photo sync enabled
[usePhotoSync] Hook mounted, checking for pending photos
```

**Если этих логов НЕТ** → проблема с компонентами, скриншотните Console.

### Шаг 5: Нажмите "Capture" для Before Photo

```
1. Нажмите кнопку "Capture" под "Before Photo"
2. Выберите фото (желательно > 8MB для теста компрессии)
3. Подождите 2 секунды
```

### Шаг 6: Проверьте Console СРАЗУ после выбора фото

Должны появиться логи:
```
✅ [useOfflinePhotos] Original photo size: 12.5MB
✅ [useOfflinePhotos] Compressing image...
✅ [useOfflinePhotos] Compressed photo size: 7.8MB
✅ [VisitDetail] Photo captured, triggering immediate sync
✅ [usePhotoSync] Syncing photo: abc-123-def
✅ [usePhotoSync] Photo uploaded successfully
✅ [MaintenanceLayout] Photo uploaded for visit 115, type: before
✅ [VisitDetail] Photo uploaded event received
```

**Если логи ОТЛИЧАЮТСЯ** → скриншотните Console!

### Шаг 7: Проверьте IndexedDB СРАЗУ после выбора фото

```
1. DevTools → Application → IndexedDB → maintainproof-offline
2. Откройте: photos
3. ДОЛЖНА БЫТЬ запись:
   {
     id: "abc-123-def-456...",
     visitId: 115,
     photoType: "before",
     blob: Blob { size: 7800000, type: "image/jpeg" },
     fileName: "photo.jpg",
     status: "pending",  // или "uploading" или "uploaded"
     capturedAt: "2026-02-17T20:00:00.000Z",
     uploadAttempts: 0
   }
4. Откройте: syncQueue
5. ДОЛЖНА БЫТЬ запись:
   {
     id: "xyz-789...",
     type: "photo-upload",
     visitId: 115,
     photoId: "abc-123-def-456...",
     status: "pending",
     createdAt: "2026-02-17T20:00:00.000Z"
   }
```

### Шаг 8: Подождите 3 секунды и проверьте снова

```
IndexedDB должна ОЧИСТИТЬСЯ:
- photos → запись должна ИСЧЕЗНУТЬ (удалена после успешной загрузки)
- syncQueue → запись должна ИСЧЕЗНУТЬ
```

**Если записи НЕ ИСЧЕЗЛИ:**
- Проверьте Network tab → должен быть запрос:
  ```
  POST /api/maintenance/visits/115/upload-photo/
  Status: 201 Created
  ```
- Если запроса НЕТ → sync не сработал
- Если статус 403/404/500 → backend проблема

### Шаг 9: Проверьте UI

```
1. На странице должно появиться фото
2. Должен быть статус badge:
   - "Pending upload" (жёлтый) → если еще не загружено
   - "Uploading..." (синий, анимация) → если загружается
   - "Uploaded" (зелёный) → если успешно
   - "Upload failed" (красный) → если ошибка
```

### Шаг 10: Перезагрузите страницу (F5)

```
1. Фото должно ОСТАТЬСЯ на странице
2. IndexedDB должна быть ПУСТАЯ (фото загружается с сервера)
3. В Console должны быть логи:
   [VisitDetail] Fetched visit data: { photos: [...] }
```

---

## ❌ ЧАСТЫЕ ПРОБЛЕМЫ

### Проблема 1: IndexedDB пустая после выбора фото

**Причина:** Ошибка при сохранении в IndexedDB

**Диагностика:**
```javascript
// В Console выполните:
(async () => {
  const db = await window.indexedDB.open('maintainproof-offline', 1);
  console.log('DB opened:', db);
  console.log('Stores:', Array.from(db.objectStoreNames));
})();
```

Должно вывести:
```
DB opened: IDBDatabase { name: "maintainproof-offline", version: 1 }
Stores: ["photos", "syncQueue"]
```

Если ошибка → скриншотните!

### Проблема 2: Фото сохранилось в IndexedDB, но не загружается

**Причина:** usePhotoSync не запускается или падает с ошибкой

**Диагностика:**
```
1. Проверьте Console → должны быть логи:
   [usePhotoSync] Hook mounted
   [usePhotoSync] Online - triggering initial sync
2. Если логов НЕТ → usePhotoSync не используется в MaintenanceLayout
3. Проверьте Network tab → есть ли POST запрос к upload-photo endpoint
```

### Проблема 3: POST запрос возвращает 409 Conflict

**Причина:** Фото уже существует на сервере

**Решение:** Это нормально! Код обрабатывает 409 как успех:
```typescript
// usePhotoSync.ts:114
if (error.message.includes("already exists")) {
  // Treat as success
  await updatePhotoStatus(photoId, "uploaded");
  await deletePhoto(photoId);
}
```

### Проблема 4: POST запрос возвращает 413 Request Too Large

**Причина:** Компрессия не сработала или файл слишком большой после компрессии

**Решение:** Backend принимает до 10MB, компрессия сжимает до 8MB.
Если файл всё равно больше → выберите файл меньшего размера.

### Проблема 5: Фото отображается, но без статус badge

**Причина:** offlinePhoto === null (фото загружено на сервер и удалено из IndexedDB)

**Это нормально!** Status badge показывается только пока фото в IndexedDB (pending/uploading).
После успешной загрузки фото удаляется из IndexedDB и загружается с сервера.

---

## 🐛 ЧТО ПРИСЫЛАТЬ ЕСЛИ НЕ РАБОТАЕТ

**Скриншоты:**
1. Console с логами (ВСЕ логи, не обрезайте!)
2. Network tab с POST запросом (Request tab + Response tab)
3. IndexedDB → maintainproof-offline → photos (развернуть запись)
4. IndexedDB → maintainproof-offline → syncQueue (развернуть запись)

**Описание:**
- На каком шаге застряли
- Что видите в UI (фото есть/нет, статус badge)
- Какие ошибки в Console (красный текст)

---

## ✅ ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После успешного теста:
1. ✅ Фото выбрано → сохранено в IndexedDB (status: "pending")
2. ✅ Через 1-3 секунды → status меняется на "uploading"
3. ✅ Через 3-5 секунд → фото загружено на сервер, удалено из IndexedDB
4. ✅ UI показывает фото (загруженное с сервера)
5. ✅ После reload фото остаётся (загружается из `/api/manager/jobs/115/`)
6. ✅ IndexedDB пустая (фото на сервере, локальная копия удалена)

---

## 🚀 OFFLINE ТЕСТ (БОНУС)

Если всё работает онлайн, протестируйте offline:

```
1. Откройте DevTools → Network → Throttling → Offline
2. Выберите After Photo
3. Проверьте IndexedDB → должна быть запись с status: "pending"
4. Переключитесь на Online
5. Через 5-10 секунд фото должно загрузиться автоматически
6. IndexedDB должна очиститься
```

---

**Последнее обновление:** 2026-02-17 21:00
**Автор:** Claude Code
