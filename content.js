let selectionMode = false;

// ページ読み込み時や動的変更時にタイトルを適用
function applyTitles() {
  chrome.storage.local.get(["subjectTitles"], (result) => {
    const titles = result.subjectTitles || {};
    const links = document.querySelectorAll(
      "a:not(.courseweekly-fav):not(.courselist-fav)",
    );
    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;

      // コースIDを抽出してキーにする（例: course_1234567）
      // 末尾が$、/、?、#のいずれかであるもののみマッチさせ、_report 等への誤爆を防ぐ
      const courseMatch = href.match(/course_\d+(?=$|[/?#])/);
      const key = courseMatch ? courseMatch[0] : href;

      // キーが登録されている場合に変更
      if (titles[key]) {
        // すでに書き換えた要素の不要な書き換えを防ぐため判定
        if (link.textContent.trim() !== titles[key]) {
          link.textContent = titles[key];
        }
      }
    });
  });
}

// 初回適用
applyTitles();

// DOMの変更を監視して動的コンテンツに対応
const observer = new MutationObserver((mutations) => {
  let shouldApply = false;
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      shouldApply = true;
      break;
    }
  }
  if (shouldApply) {
    applyTitles();
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// Popupからのメッセージ受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "enterSelectionMode") {
    selectionMode = true;
    document.body.style.cursor = "crosshair";
    showToast("✏️ 科目名編集モード: 編集したい科目をクリックしてください", "info", 4000);
    sendResponse({ ok: true }); // lastError を防ぐためレスポンスを返す
  }
});

// ===== スタイル定義テンプレート =====
// ホバーハイライト + トースト通知のスタイルをまとめて定義
const style = document.createElement("style");
style.textContent = `
  /* 編集モード中のホバーハイライト */
  .manaba-edit-subject-hover {
    outline: 2px dashed #ff0000 !important;
    background-color: rgba(255, 0, 0, 0.2) !important;
    border-radius: 4px;
  }

  /* トースト通知 — 共通テンプレート */
  .manaba-toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(12px);
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-family: sans-serif;
    color: #fff;
    background: rgba(30, 30, 30, 0.92);
    box-shadow: 0 4px 16px rgba(0,0,0,0.28);
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    z-index: 2147483647;
    transition: opacity 0.25s ease, transform 0.25s ease;
  }
  .manaba-toast.manaba-toast--show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  /* バリアント */
  .manaba-toast--info    { background: rgba(0, 102, 204, 0.92); }
  .manaba-toast--success { background: rgba(40, 167, 69, 0.92); }
  .manaba-toast--warning { background: rgba(220, 53, 69, 0.92); }
`;
document.head.appendChild(style);

/**
 * トースト通知を表示するユーティリティ（再利用可能テンプレート）
 * @param {string} message  表示するメッセージ
 * @param {'info'|'success'|'warning'} variant  スタイルバリアント（省略時: info）
 * @param {number} duration  表示時間(ms)（省略時: 3000ms）
 */
function showToast(message, variant = "info", duration = 3000) {
  const toast = document.createElement("div");
  toast.className = `manaba-toast manaba-toast--${variant}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // フレームを挟んでアニメーション開始
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add("manaba-toast--show");
    });
  });

  // 指定時間後にフェードアウトして削除
  setTimeout(() => {
    toast.classList.remove("manaba-toast--show");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, duration);
}

// マウスオーバー時の枠線表示
document.addEventListener("mouseover", (e) => {
  if (!selectionMode) return;
  const link = e.target.closest(
    "a:not(.courseweekly-fav):not(.courselist-fav)",
  );
  if (link) {
    link.classList.add("manaba-edit-subject-hover");
  }
});

document.addEventListener("mouseout", (e) => {
  if (!selectionMode) return;
  const link = e.target.closest(
    "a:not(.courseweekly-fav):not(.courselist-fav)",
  );
  if (link) {
    link.classList.remove("manaba-edit-subject-hover");
  }
});

// コースリンククリック時の処理（編集モード時）
document.addEventListener(
  "click",
  (e) => {
    if (!selectionMode) return;

    const link = e.target.closest(
      "a:not(.courseweekly-fav):not(.courselist-fav)",
    );
    if (link) {
      e.preventDefault();
      e.stopPropagation();

      // ホバー状態を解除
      link.classList.remove("manaba-edit-subject-hover");

      const href = link.getAttribute("href");
      if (href) {
        // コースIDを抽出してキーにする
        const courseMatch = href.match(/course_\d+(?=$|[/?#])/);
        const key = courseMatch ? courseMatch[0] : href;

        const currentName = link.textContent.trim();
        const newName = prompt(
          "新しい科目名を入力してください（空にすると元の名前にリセットされます）:\n\n現在の表示: " +
            currentName,
          currentName,
        );

        if (newName !== null) {
          // キャンセルしていない場合
          chrome.storage.local.get(["subjectTitles"], (result) => {
            const titles = result.subjectTitles || {};

            if (newName.trim() === "") {
              delete titles[key];
              showToast("カスタム名称を削除しました（リロードで元の名前に戻ります）", "warning", 3000);
            } else {
              titles[key] = newName.trim();
              // 即座に画面上の表示を更新
              document
                .querySelectorAll(
                  "a:not(.courseweekly-fav):not(.courselist-fav)",
                )
                .forEach((a) => {
                  const aHref = a.getAttribute("href");
                  if (aHref) {
                    const aMatch = aHref.match(/course_\d+(?=$|[/?#])/);
                    const aKey = aMatch ? aMatch[0] : aHref;
                    if (aKey === key) {
                      a.textContent = newName.trim();
                    }
                  }
                });
            }

            // ストレージに保存
            chrome.storage.local.set({ subjectTitles: titles });
          });
        }
      }

      // 一度選択したらモードを終了
      selectionMode = false;
      document.body.style.cursor = "";
    } else {
      // リンク以外をクリックした場合は編集モードを終了
      selectionMode = false;
      document.body.style.cursor = "";
      showToast("編集モードを終了しました", "warning", 2500);
    }
  },
  true,
); // captureフェーズで実行して元のリンク動作をブロック
