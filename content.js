let selectionMode = false;

// リンクが置換・編集の対象として有効か判定
function isValidSubjectLink(link) {
    // img要素を含む場合は対象外
    if (link.querySelector("img") !== null) {
        return false;
    }
    // テキストが空の場合は対象外
    if (link.textContent.trim() === "") {
        return false;
    }
    return true;
}

// ページ読み込み時や動的変更時にタイトルを適用
function applyTitles() {
    chrome.storage.local.get(["subjectTitles"], (result) => {
        // ユーザーが設定したタイトルを取得
        const userTitles = result.subjectTitles || {};
        
        // デフォルト設定が存在する場合のみmerge
        const defaultTitles = typeof DEFAULT_SUBJECT_TITLES !== 'undefined' ? DEFAULT_SUBJECT_TITLES : {};
        
        // デフォルト設定とユーザー設定をmerge（ユーザー設定が優先）
        const titles = { ...defaultTitles, ...userTitles };

        const links = document.querySelectorAll(
            "a:not(.courseweekly-fav):not(.courselist-fav)",
        );
        links.forEach((link) => {
            // 対象外のリンクはスキップ
            if (!isValidSubjectLink(link)) return;

            const href = link.getAttribute("href");
            if (!href) return;

            // コースIDを抽出
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

// popupからのメッセージ受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "enterSelectionMode") {
        selectionMode = true;
        document.body.style.cursor = "crosshair";
        if (typeof showToast === "function") {
            showToast("科目名編集モード: 編集したい科目をクリックしてください", "info", 4000);
        }
        sendResponse({ ok: true }); // lastError を防ぐためレスポンスを返す
    }
});

const style = document.createElement("style");
style.textContent = `
    /* 編集モード中のホバーハイライト */
    .manaba-edit-subject-hover {
        outline: 2px dashed #ff0000 !important;
        background-color: rgba(255, 0, 0, 0.2) !important;
        border-radius: 4px;
    }
`;
document.head.appendChild(style);

// マウスオーバー時の枠線表示
document.addEventListener("mouseover", (e) => {
    if (!selectionMode) return;
    const link = e.target.closest(
        "a:not(.courseweekly-fav):not(.courselist-fav)",
    );

    if (link && isValidSubjectLink(link)) {
        link.classList.add("manaba-edit-subject-hover");
    }
});

document.addEventListener("mouseout", (e) => {
    if (!selectionMode) return;
    const link = e.target.closest(
        "a:not(.courseweekly-fav):not(.courselist-fav)",
    );
    if (link && isValidSubjectLink(link)) {
        link.classList.remove("manaba-edit-subject-hover");
    }
});

// 編集モード中のコースリンククリック時の処理
document.addEventListener(
    "click",
    (e) => {
        if (!selectionMode) return;

        const link = e.target.closest(
            "a:not(.courseweekly-fav):not(.courselist-fav)",
        );

        // 対象のリンク要素がクリックされた場合
        if (link && isValidSubjectLink(link)) {
            e.preventDefault();
            e.stopPropagation();

            // ホバー状態を解除
            link.classList.remove("manaba-edit-subject-hover");

            const href = link.getAttribute("href");
            if (href) {
                // コースIDを抽出
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
                            if (typeof showToast === "function") {
                                showToast("カスタム名称を削除しました（ページ再読み込みで元の名前に戻ります）", "warning", 3000);
                            }
                        } else {
                            titles[key] = newName.trim();
                            // 即座に画面上の表示を更新
                            document
                                .querySelectorAll(
                                    "a:not(.courseweekly-fav):not(.courselist-fav)",
                                )
                                .forEach((a) => {
                                    // 画面上の他のリンクも更新する際に対象外を除外
                                    if (!isValidSubjectLink(a)) return;

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

                        chrome.storage.local.set({ subjectTitles: titles });
                    });
                }
            }

            // 一度選択したらモードを終了
            selectionMode = false;
            document.body.style.cursor = "";
        } else {
            // 対象外のリンクや、リンク以外をクリックした場合は編集モードを終了
            selectionMode = false;
            document.body.style.cursor = "";
            if (typeof showToast === "function") {
                showToast("編集モードを終了しました", "warning", 2500);
            }
        }
    },
    true,
); // captureフェーズで実行して元のリンク動作をブロック