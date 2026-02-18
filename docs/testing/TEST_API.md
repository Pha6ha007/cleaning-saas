# 🧪 Тестовый скрипт для проверки API

## Скопируйте и вставьте в Console браузера

**ВАЖНО:** Выполняйте на странице `http://localhost:8080`

### Скрипт 1: Проверка токена и текущего пользователя

```javascript
console.clear();
console.log('🔍 ====== ТЕСТ 1: Проверка аутентификации ======');

// Проверяем токен
const token = localStorage.getItem('token') || localStorage.getItem('authToken');
console.log('🔑 Token:', token ? '✅ Найден' : '❌ НЕ НАЙДЕН');
console.log('🔑 Token value:', token ? token.substring(0, 20) + '...' : 'null');

if (!token) {
  console.error('❌ ОШИБКА: Токен не найден. Войдите в систему!');
} else {
  // Проверяем текущего пользователя
  fetch('http://127.0.0.1:8000/api/user/', {
    headers: { 'Authorization': `Token ${token}` }
  })
  .then(r => r.json())
  .then(user => {
    console.log('👤 ====== Текущий пользователь ======');
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Company:', user.company);
    console.log('Full user object:', user);
    console.log('=====================================');

    if (user.role !== 'owner' && user.role !== 'manager') {
      console.warn('⚠️  ВНИМАНИЕ: Ваша роль', user.role, '- может не иметь прав на создание визитов');
      console.log('💡 Нужна роль: owner или manager');
    } else {
      console.log('✅ Роль подходит для создания визитов');
    }
  })
  .catch(err => {
    console.error('❌ Ошибка получения пользователя:', err);
  });
}
```

---

### Скрипт 2: Проверка доступных локаций

```javascript
console.log('\n🏢 ====== ТЕСТ 2: Проверка локаций ======');

const token = localStorage.getItem('token') || localStorage.getItem('authToken');

fetch('http://127.0.0.1:8000/api/locations/', {
  headers: { 'Authorization': `Token ${token}` }
})
.then(r => r.json())
.then(locations => {
  console.log('📍 Доступные локации:', locations.length);
  locations.slice(0, 3).forEach(loc => {
    console.log(`  - ID: ${loc.id}, Name: ${loc.name}`);
  });
  console.log('Первая локация ID:', locations[0]?.id);
})
.catch(err => console.error('❌ Ошибка:', err));
```

---

### Скрипт 3: Проверка доступных техников

```javascript
console.log('\n👷 ====== ТЕСТ 3: Проверка техников ======');

const token = localStorage.getItem('token') || localStorage.getItem('authToken');

fetch('http://127.0.0.1:8000/api/cleaners/', {
  headers: { 'Authorization': `Token ${token}` }
})
.then(r => r.json())
.then(cleaners => {
  console.log('👨‍🔧 Доступные техники:', cleaners.length);
  cleaners.slice(0, 3).forEach(cleaner => {
    console.log(`  - ID: ${cleaner.id}, Name: ${cleaner.full_name || cleaner.email}`);
  });
  console.log('Первый техник ID:', cleaners[0]?.id);
})
.catch(err => console.error('❌ Ошибка:', err));
```

---

### Скрипт 4: ТЕСТ СОЗДАНИЯ ВИЗИТА

**ГЛАВНЫЙ ТЕСТ** - покажет что именно возвращает API:

```javascript
console.clear();
console.log('🚀 ====== ТЕСТ 4: Создание визита ======');

const token = localStorage.getItem('token') || localStorage.getItem('authToken');

if (!token) {
  console.error('❌ Токен не найден!');
} else {
  // Используем завтрашнюю дату
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const payload = {
    scheduled_date: dateStr,
    location_id: 1,  // Замените на реальный ID из Теста 2
    cleaner_id: 1,   // Замените на реальный ID из Теста 3
    context: "maintenance",
    manager_notes: "Test visit from console"
  };

  console.log('📤 Отправка запроса...');
  console.log('📤 URL:', 'http://127.0.0.1:8000/api/manager/jobs/');
  console.log('📤 Payload:', payload);

  fetch('http://127.0.0.1:8000/api/manager/jobs/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${token}`
    },
    body: JSON.stringify(payload)
  })
  .then(response => {
    console.log('📥 ====== RESPONSE ======');
    console.log('Status:', response.status, response.statusText);
    console.log('OK?:', response.ok);
    return response.json();
  })
  .then(data => {
    console.log('📦 ====== RESPONSE DATA ======');
    console.log('Full response:', data);
    console.log('Type:', typeof data);
    console.log('Keys:', Object.keys(data));
    console.log('---');
    console.log('🔑 data.id:', data.id);
    console.log('🔑 typeof data.id:', typeof data.id);
    console.log('🔑 Has id?:', data.id !== undefined);
    console.log('---');
    console.log('🔍 Other fields:');
    console.log('   scheduled_date:', data.scheduled_date);
    console.log('   status:', data.status);
    console.log('   location:', data.location);
    console.log('   cleaner:', data.cleaner);
    console.log('================================');

    if (data.id) {
      console.log('✅ УСПЕХ! Визит создан с ID:', data.id);
      console.log('🔗 URL для перехода:', `/maintenance/visits/${data.id}`);
      console.log('🔗 Полный URL:', `http://localhost:8080/maintenance/visits/${data.id}`);
    } else {
      console.error('❌ ОШИБКА: Поле id отсутствует в response!');
      console.error('❌ Это проблема backend serializer');
    }
  })
  .catch(err => {
    console.error('❌ ====== ERROR ======');
    console.error('Error:', err);
    console.error('=====================');
  });
}
```

---

## 📋 Порядок выполнения:

1. **Скрипт 1** - проверьте токен и роль
2. **Скрипт 2** - узнайте ID первой локации
3. **Скрипт 3** - узнайте ID первого техника
4. **Скрипт 4** - создайте тестовый визит (замените location_id и cleaner_id на реальные)

---

## 🎯 Что мне прислать:

**Скриншотните Console после выполнения Скрипта 4.**

Мне нужно увидеть:
- Status code (200? 400? 500?)
- Full response object
- Есть ли поле `id`
- Какой тип у `data.id`

---

## 💡 Если увидите ошибку

### 401 Unauthorized
→ Токен невалидный, перелогиньтесь

### 403 Forbidden
→ У вас нет прав (проверьте роль из Скрипта 1)

### 400 Bad Request
→ Неправильные данные (замените location_id/cleaner_id на реальные)

### 500 Internal Server Error
→ Проблема на backend (проверьте логи Django)

---

## 🔧 Если всё равно не работает

Выполните в терминале:

```bash
# Проверьте что backend запущен:
curl http://127.0.0.1:8000/api/user/ \
  -H "Authorization: Token ВАШ_ТОКЕН"

# Должен вернуть данные пользователя
```
