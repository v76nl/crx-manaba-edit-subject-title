// 汎用トースト通知用スタイル定義
const toastStyle = document.createElement("style");
toastStyle.textContent = `
    .simple-toast {
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
    .simple-toast.simple-toast--show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
    /* バリアント */
    .simple-toast--info    { background: rgba(0, 102, 204, 0.92); }
    .simple-toast--success { background: rgba(40, 167, 69, 0.92); }
    .simple-toast--warning { background: rgba(220, 53, 69, 0.92); }
`;
document.head.appendChild(toastStyle);

/**
 * トースト通知を表示するユーティリティ
 * @param {string} message  表示するメッセージ
 * @param {'info'|'success'|'warning'} variant  スタイルバリアント（省略時: info）
 * @param {number} duration  表示時間(ms)（省略時: 3000ms）
 */
function showToast(message, variant = "info", duration = 3000) {
    const toast = document.createElement("div");
    toast.className = `simple-toast simple-toast--${variant}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // フレームを挟んでアニメーション開始
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add("simple-toast--show");
        });
    });

    // 指定時間後にフェードアウトして削除
    setTimeout(() => {
        toast.classList.remove("simple-toast--show");
        toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }, duration);
}