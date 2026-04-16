document.getElementById("editBtn").addEventListener("click", async () => {
  // 現在アクティブなタブを取得
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    // アクティブなタブのcontent_scriptsにメッセージを送信
    chrome.tabs.sendMessage(
      tab.id,
      { action: "enterSelectionMode" },
      (response) => {
        if (chrome.runtime.lastError) {
          // content.jsが読み込まれていない可能性がある場合
          console.error(chrome.runtime.lastError);
          showPopupError(
            "manabaのページを開いてから再読み込みし、再度試してください。",
          );
        } else {
          // メッセージ送信成功時にポップアップを閉じる
          window.close();
        }
      },
    );
  }
});

// 置換セットの表示
function loadReplaceList() {
  chrome.storage.local.get(["subjectTitles"], (result) => {
    const titles = result.subjectTitles || {};
    const listEl = document.getElementById("replaceList");
    listEl.innerHTML = "";

    const keys = Object.keys(titles);
    if (keys.length === 0) {
      listEl.innerHTML = '<li class="empty-msg">設定はありません</li>';
      return;
    }

    keys.forEach((key) => {
      const li = document.createElement("li");
      li.className = "replace-item";

      const span = document.createElement("span");
      span.className = "item-name";
      span.textContent = titles[key];
      span.title = titles[key] + " (" + key + ")";

      const delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.textContent = "削除";
      delBtn.addEventListener("click", () => {
        delete titles[key];
        chrome.storage.local.set({ subjectTitles: titles }, () => {
          loadReplaceList(); // 要素の削除後に再読み込み
        });
      });

      li.appendChild(span);
      li.appendChild(delBtn);
      listEl.appendChild(li);
    });
  });
}

document.addEventListener("DOMContentLoaded", loadReplaceList);

function showPopupError(message) {
  const el = document.getElementById("errorMsg");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}
