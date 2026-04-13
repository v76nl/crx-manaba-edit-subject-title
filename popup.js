document.getElementById('editBtn').addEventListener('click', async () => {
  // 現在アクティブなタブを取得
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    // アクティブなタブのcontent_scriptsにメッセージを送信
    chrome.tabs.sendMessage(tab.id, { action: 'enterSelectionMode' }, (response) => {
      if (chrome.runtime.lastError) {
        // content.jsが読み込まれていない可能性がある場合
        console.error(chrome.runtime.lastError);
        alert('エラーが発生しました。\n・manabaのページ（https://room.chuo-u.ac.jp/ct/*）を開いているか確認してください。\n・ページを一度リロードしてから再試行してください。');
      } else {
        // メッセージ送信成功時にポップアップを閉じる
        window.close();
      }
    });
  }
});
