// Хранилище для подписанных аккаунтов
let signedAccounts = {};

// Загрузка данных из хранилища
chrome.storage.local.get(['signedAccounts'], function(result) {
  if (result.signedAccounts) {
    signedAccounts = result.signedAccounts;
    updateAccountLabels();
  }
});

// Функция для обновления подписей аккаунтов
function updateAccountLabels() {
  console.log('Updating account labels...');
  
  // ВРЕМЕННО отключаем observer чтобы избежать рекурсии
  observer.disconnect();
  
  // Удаляем все существующие подписи
  const existingLabels = document.querySelectorAll('.amo-partner-label');
  existingLabels.forEach(label => label.remove());
  
  // Счетчик подписанных элементов
  let signedCount = 0;
  
  // Собираем ВСЕ текстовые узлы на странице
  const textNodes = getAllTextNodes(document.body);
  
  textNodes.forEach(node => {
    const text = node.textContent.trim();
    
    // Ищем числовые ID (от 5 до 10 цифр)
    const idMatches = text.match(/\b\d{5,10}\b/g);
    
    if (idMatches) {
      idMatches.forEach(accountId => {
        // Проверяем, что это валидный ID и есть подпись
        if (isValidAccountId(accountId) && signedAccounts[accountId]) {
          
          // Проверяем, что это узел содержит ТОЛЬКО этот ID
          if (text === accountId) {
            addSignatureToTextNode(node, accountId);
            signedCount++;
          }
        }
      });
    }
  });
  
  console.log('Total signed elements on page:', signedCount);
  
  // Включаем observer обратно
  setTimeout(() => {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }, 1000);
}

// Функция для получения всех текстовых узлов
function getAllTextNodes(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  return textNodes;
}

// Добавление подписи к текстовому узлу (под ID)
function addSignatureToTextNode(textNode, accountId) {
  const parent = textNode.parentNode;
  
  // Если родитель уже содержит подпись - пропускаем
  if (parent.querySelector('.amo-partner-label')) {
    return;
  }
  
  // Создаем контейнер для ID и подписи
  const container = document.createElement('div');
  container.className = 'amo-partner-container';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'flex-start';
  
  // Создаем элемент для ID
  const idElement = document.createElement('div');
  idElement.textContent = accountId;
  idElement.style.fontWeight = 'bold';
  
  // Создаем элемент для подписи
  const label = document.createElement('div');
  label.className = 'amo-partner-label';
  label.textContent = signedAccounts[accountId];
  label.style.color = '#4CAF50';
  label.style.fontSize = '12px';
  label.style.fontWeight = 'normal';
  label.style.marginTop = '2px';
  
  // Собираем контейнер
  container.appendChild(idElement);
  container.appendChild(label);
  
  // Заменяем текстовый узел на наш контейнер
  parent.replaceChild(container, textNode);
}

// Проверка, что это валидный ID аккаунта
function isValidAccountId(id) {
  // Исключаем числа, которые вероятно не являются ID аккаунтов
  if (id.startsWith('19') || id.startsWith('20')) return false; // Годы
  if (id.length < 5) return false; // Слишком короткие
  if (id.length > 10) return false; // Слишком длинные
  return true;
}

// Функция для поиска и выделения аккаунта
function searchAndHighlightAccount(searchTerm) {
  console.log('Searching for:', searchTerm);
  
  // Убираем предыдущее выделение
  removeAllHighlights();
  
  let found = false;
  
  // 1. Поиск по точному ID в подписанных аккаунтах
  if (signedAccounts[searchTerm]) {
    console.log('Found in signed accounts:', searchTerm);
    found = findAndHighlightById(searchTerm) || found;
  }
  
  // 2. Поиск по части подписи
  for (const [accountId, signature] of Object.entries(signedAccounts)) {
    if (signature.toLowerCase().includes(searchTerm.toLowerCase())) {
      console.log('Found by signature:', accountId, signature);
      found = findAndHighlightById(accountId) || found;
    }
  }
  
  // 3. Поиск по ID на странице (даже если не подписан)
  if (/^\d{5,10}$/.test(searchTerm)) {
    console.log('Searching by ID on page:', searchTerm);
    found = findAndHighlightById(searchTerm) || found;
  }
  
  console.log('Search result:', found);
  return found;
}

// Поиск и выделение по ID
function findAndHighlightById(accountId) {
  let found = false;
  const textNodes = getAllTextNodes(document.body);
  
  textNodes.forEach(node => {
    const text = node.textContent.trim();
    if (text === accountId) {
      highlightElement(node.parentNode, accountId);
      found = true;
    }
  });
  
  return found;
}

// Выделение элемента
function highlightElement(element, searchTerm) {
  element.classList.add('amo-search-highlight');
  
  // Прокручиваем к элементу
  setTimeout(() => {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });
  }, 100);
}

// Удаление всех выделений
function removeAllHighlights() {
  const highlights = document.querySelectorAll('.amo-search-highlight');
  highlights.forEach(el => {
    el.classList.remove('amo-search-highlight');
  });
}

// Функция для добавления/обновления подписи
function addAccountSignature(accountId, signature) {
  signedAccounts[accountId] = signature;
  chrome.storage.local.set({ signedAccounts: signedAccounts });
  updateAccountLabels();
}

// Функция для удаления подписи
function removeAccountSignature(accountId) {
  delete signedAccounts[accountId];
  chrome.storage.local.set({ signedAccounts: signedAccounts });
  updateAccountLabels();
}

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Received message:', request);
  
  if (request.action === 'updateLabels') {
    updateAccountLabels();
    sendResponse({ success: true });
  } else if (request.action === 'addSignature') {
    addAccountSignature(request.accountId, request.signature);
    sendResponse({ success: true });
  } else if (request.action === 'removeSignature') {
    removeAccountSignature(request.accountId);
    sendResponse({ success: true });
  } else if (request.action === 'getAccounts') {
    sendResponse({ accounts: signedAccounts });
  } else if (request.action === 'searchAccount') {
    const found = searchAndHighlightAccount(request.searchTerm);
    sendResponse({ found: found });
  }
});

// Создаем observer
const observer = new MutationObserver(function(mutations) {
  let shouldUpdate = false;
  
  mutations.forEach(function(mutation) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      shouldUpdate = true;
    }
  });
  
  if (shouldUpdate) {
    setTimeout(updateAccountLabels, 500);
  }
});

// Обновляем подписи при загрузке страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(updateAccountLabels, 3000);
  });
} else {
  setTimeout(updateAccountLabels, 3000);
}

// Начинаем наблюдение
observer.observe(document.body, {
  childList: true,
  subtree: true
});