// Загрузка подписанных аккаунтов
function loadAccounts() {
  chrome.storage.local.get(['signedAccounts'], function(result) {
    const accounts = result.signedAccounts || {};
    displayAccounts(accounts);
  });
}

// Отображение списка аккаунтов
function displayAccounts(accounts) {
  const accountsList = document.getElementById('accountsList');
  accountsList.innerHTML = '';

  if (Object.keys(accounts).length === 0) {
    accountsList.innerHTML = '<div class="empty-message">Нет подписанных аккаунтов</div>';
    return;
  }

  for (const [accountId, signature] of Object.entries(accounts)) {
    const accountElement = document.createElement('div');
    accountElement.className = 'account-item';
    accountElement.innerHTML = `
      <span class="account-id">${accountId}</span>
      <span class="account-signature">${signature}</span>
      <button class="remove-btn" data-account="${accountId}">×</button>
    `;
    accountsList.appendChild(accountElement);
  }

  // Добавляем обработчики для кнопок удаления
  document.querySelectorAll('.remove-btn').forEach(button => {
    button.addEventListener('click', function() {
      const accountId = this.getAttribute('data-account');
      removeAccount(accountId);
    });
  });
}

// Добавление подписи
document.getElementById('addSignature').addEventListener('click', function() {
  const accountId = document.getElementById('accountId').value.trim();
  const signature = document.getElementById('signature').value.trim();

  if (!accountId || !signature) {
    alert('Пожалуйста, заполните оба поля');
    return;
  }

  if (!/^\d+$/.test(accountId)) {
    alert('ID аккаунта должен содержать только цифры');
    return;
  }

  // Отправляем сообщение content script
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs[0] || !tabs[0].url.includes('amocrm')) {
      alert('Пожалуйста, откройте страницу AMO CRM для использования расширения');
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'addSignature',
      accountId: accountId,
      signature: signature
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        alert('Ошибка: перезагрузите страницу AMO CRM и попробуйте снова');
      } else {
        // Очищаем поля ввода
        document.getElementById('accountId').value = '';
        document.getElementById('signature').value = '';
        // Обновляем список
        loadAccounts();
        alert('Подпись успешно добавлена!');
      }
    });
  });
});

// Поиск аккаунта - УЛУЧШЕННАЯ ФУНКЦИЯ
document.getElementById('searchButton').addEventListener('click', function() {
  const searchTerm = document.getElementById('searchAccount').value.trim();
  
  if (!searchTerm) {
    alert('Введите ID или подпись для поиска');
    return;
  }

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs[0] || !tabs[0].url.includes('amocrm')) {
      alert('Пожалуйста, откройте страницу AMO CRM для использования расширения');
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'searchAccount',
      searchTerm: searchTerm
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        alert('Ошибка: перезагрузите страницу AMO CRM и попробуйте снова');
      } else {
        if (response && response.found) {
          alert('✅ Аккаунт найден и выделен на странице');
        } else {
          alert('❌ Аккаунт не найден на странице. Проверьте:\n\n1. Правильность введенного ID/подписи\n2. Что страница полностью загрузилась\n3. Что аккаунт есть на текущей странице');
        }
      }
    });
  });
});

// Удаление аккаунта
function removeAccount(accountId) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'removeSignature',
      accountId: accountId
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
      }
      loadAccounts();
    });
  });
}

// Обновление страницы
document.getElementById('refreshPage').addEventListener('click', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.reload(tabs[0].id);
  });
});

// Очистка всех подписей
document.getElementById('clearAll').addEventListener('click', function() {
  if (confirm('Вы уверены, что хотите удалить все подписи?')) {
    chrome.storage.local.set({ signedAccounts: {} }, function() {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateLabels'
        });
      });
      loadAccounts();
      alert('Все подписи удалены!');
    });
  }
});

// Загрузка при открытии popup
document.addEventListener('DOMContentLoaded', loadAccounts);

// Обработка нажатия Enter в полях ввода
document.getElementById('accountId').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    document.getElementById('addSignature').click();
  }
});

document.getElementById('signature').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    document.getElementById('addSignature').click();
  }
});

document.getElementById('searchAccount').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    document.getElementById('searchButton').click();
  }
});