// ==UserScript==
// @name         Pomocnik Wystawiania Fnal
// @namespace    pomocnik-wystawiania
// @version      1.0
// @description  Jeden skrypt: na Allegro - zdjęcia + kopiowanie EAN; na panelu Lombard - import EAN, formater opisu, presety wysyłki/faktury, opis bezpieczeństwa/AI
// @match        https://*salescenter.allegro.com/*
// @match        https://panel.loombard.pl/midas/products/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @connect      edge.salescenter.allegro.com
// @match        https://www.google.com/search*
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================
    // WSPÓLNE: design tokens, ikony, toast, schowek, storage
    // =========================================================
    const T = {
        bg: "#18191d", bgHeader: "#1f2025", border: "#2b2c33", borderLight: "#34353c",
        text: "#f2f2f3", textDim: "#93949c",
        accent: "#ff5a1f", rowHover: "#232429",
        blue: "#5b9bff", purple: "#b586ff", amber: "#ffb648", green: "#3ecf7e", red: "#ff5f5f",
        font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"
    };

    const ICONS = {
        toolbox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`,
        grip: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>`,
        chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
        camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
        barcode: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5v14M7 5v14M11 5v10M15 5v14M19 5v10M21 5v14"/></svg>`,
        shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`,
        sparkles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.9L19 9.7l-4.9 1.8L12 16.4l-1.8-4.9L5.3 9.7l4.9-1.8L12 3z"/></svg>`,
        zap: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 11-14h-7z"/></svg>`,
        close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
        clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/></svg>`,
        building: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="9" y1="7" x2="9" y2="7.01"/><line x1="15" y1="7" x2="15" y2="7.01"/><line x1="9" y1="12" x2="9" y2="12.01"/><line x1="15" y1="12" x2="15" y2="12.01"/><line x1="9" y1="17" x2="15" y2="17"/></svg>`
    };

    function icon(name, size = 14) {
        return `<span style="display:inline-flex;width:${size}px;height:${size}px;flex-shrink:0">${ICONS[name]}</span>`;
    }

    function hexToRgba(hex, alpha) {
        const h = hex.replace("#", "");
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function showToast(message, isError = false) {
        const old = document.getElementById("pwToast");
        if (old) old.remove();
        const toast = document.createElement("div");
        toast.id = "pwToast";
        toast.innerText = message;
        Object.assign(toast.style, {
            position: "fixed", bottom: "20px", left: "20px",
            background: isError ? "#e5484d" : "#1f9d55",
            color: "white", padding: "11px 16px", borderRadius: "10px",
            fontFamily: T.font, fontSize: "13px", fontWeight: "600",
            zIndex: "999999", boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            opacity: "1", transition: "opacity 0.4s ease"
        });
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = "0"; }, 1800);
        setTimeout(() => { toast.remove(); }, 2300);
    }

    async function copyToClipboard(text, successMsg) {
        try {
            await navigator.clipboard.writeText(text);
            showToast(successMsg || "✓ Skopiowano");
            return true;
        } catch (error) {
            console.error(error);
            showToast("Nie udało się skopiować", true);
            return false;
        }
    }

    async function openOrCopy(url, label) {
        const win = window.open(url, "_blank");
        if (!win || win.closed || typeof win.closed === "undefined") {
            await copyToClipboard(url, `Popup zablokowany — link "${label}" skopiowany`);
        }
    }

    function buildGoogleUrl(query) {
        return "https://www.google.com/search?q=" + encodeURIComponent(query) + "&udm=50";
    }

    function makeDraggable(panel, handle, onDragEnd) {
        let isDragging = false, offsetX = 0, offsetY = 0;
        handle.addEventListener("mousedown", (e) => {
            if (e.target.closest("button")) return;
            isDragging = true;
            const rect = panel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            handle.style.cursor = "grabbing";
        });
        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            let left = e.clientX - offsetX;
            let top = e.clientY - offsetY;
            left = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, left));
            top = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, top));
            panel.style.left = left + "px";
            panel.style.top = top + "px";
            panel.style.right = "auto";
            panel.style.bottom = "auto";
        });
        document.addEventListener("mouseup", () => {
            if (!isDragging) return;
            isDragging = false;
            handle.style.cursor = "grab";
            if (onDragEnd) onDragEnd(panel.getBoundingClientRect());
        });
    }

    // wiersz akcji — ikona w kolorowym chipie + etykieta (reużywane w obu panelach)
    function createRow(label, iconName, accentColor, onClick, fontSize = "12.5px", chipSize = 26) {
        const row = document.createElement("button");
        Object.assign(row.style, {
            display: "flex", alignItems: "center", gap: "10px", width: "100%",
            padding: "9px 8px", border: "none", background: "transparent", borderRadius: "8px",
            cursor: "pointer", textAlign: "left", transition: "background 0.12s ease"
        });
        const chip = document.createElement("span");
        Object.assign(chip.style, {
            width: chipSize + "px", height: chipSize + "px", borderRadius: "8px",
            background: hexToRgba(accentColor, 0.16), color: accentColor,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0"
        });
        chip.innerHTML = icon(iconName, Math.round(chipSize * 0.55));
        const text = document.createElement("span");
        text.innerText = label;
        Object.assign(text.style, { fontSize, fontWeight: "600", color: T.text });
        row.appendChild(chip);
        row.appendChild(text);
        row._labelEl = text;
        row.addEventListener("mouseenter", () => { if (!row.disabled) row.style.background = T.rowHover; });
        row.addEventListener("mouseleave", () => { row.style.background = "transparent"; });
        row.addEventListener("click", onClick);
        return row;
    }

    async function runWithSpinner(el, fn) {
        if (el.disabled) return;
        el.disabled = true;
        el.style.cursor = "wait";
        el.style.opacity = "0.55";

        if (el._labelEl) {
            // wiersz akcji (ikona + etykieta tekstowa)
            const original = el._labelEl.innerText;
            el._labelEl.innerText = "Wczytuję…";
            try { await fn(); }
            finally {
                el._labelEl.innerText = original;
                el.disabled = false;
                el.style.cursor = "pointer";
                el.style.opacity = "1";
            }
            return;
        }

        // zwykły/duży przycisk — zapamiętujemy oryginalną zawartość przy pierwszym użyciu
        if (el.dataset.originalHtml === undefined) {
            el.dataset.originalHtml = el.innerHTML;
        }
        el.innerHTML = `${icon("zap", 14)}<span>Pracuję…</span>`;
        try { await fn(); }
        finally {
            el.innerHTML = el.dataset.originalHtml;
            el.disabled = false;
            el.style.cursor = "pointer";
            el.style.opacity = "1";
        }
    }

    // klucz storage używany do przekazania EAN-u między Allegro a panelem Lombard
    const EAN_STORAGE_KEY = "pw_ean_transfer";

    // klucze storage do handshake'u automatyzacji "Opis AI" (Lombard <-> karta Google w tle)
    const AI_STATUS_KEY = "pw_ai_status";   // "idle" | "pending" | "done" | "error"
    const AI_RESULT_KEY = "pw_ai_result";
    const AI_REQUEST_ID_KEY = "pw_ai_request_id"; // zabezpieczenie przed odczytaniem starego wyniku
    const AI_KIND_KEY = "pw_ai_kind"; // "description" | "safety" — co zrobić z wynikiem po stronie lombardu

    // =========================================================
    // MODUŁ 1: ALLEGRO (salescenter.allegro.com)
    // =========================================================
    function runAllegroModule() {
        let cachedProductData = null;
        let cachedProductId = null;
        let lastUrl = location.href;

        const MARKETING_WORDS = ["NOWOŚĆ", "PROMOCJA", "OKAZJA", "HIT", "SUPER CENA", "BESTSELLER", "MEGA ZESTAW"];

        function cleanProductName(name) {
            let cleaned = name || "";
            MARKETING_WORDS.forEach(word => {
                cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, "gi"), "");
            });
            return cleaned.replace(/\s{2,}/g, " ").trim();
        }

        // Zapytanie przez GM_xmlhttpRequest zamiast fetch() — fetch() w piaskownicy
        // Tampermonkey (uruchamianej gdy skrypt ma jakikolwiek @grant) inaczej ustawia
        // nagłówki niż fetch w kontekście strony, przez co Allegro odrzucało zapytanie
        // z błędem 401. GM_xmlhttpRequest idzie przez silnik przeglądarki z pełnym
        // kontekstem strony i nie ma tego problemu.
        function gmGetJson(url) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url,
                    headers: { "Accept": "application/vnd.allegro.form.v1+json" },
                    onload: (response) => {
                        console.log("[Pomocnik Wystawiania] GM_xhr status:", response.status, "URL:", url);
                        if (response.status >= 200 && response.status < 300) {
                            try {
                                resolve(JSON.parse(response.responseText));
                            } catch (e) {
                                reject(new Error("Nie udało się sparsować odpowiedzi JSON"));
                            }
                        } else {
                            reject(new Error(`API zwróciło błąd ${response.status} ${response.statusText}`));
                        }
                    },
                    onerror: () => reject(new Error("Błąd sieci przy GM_xmlhttpRequest"))
                });
            });
        }

        async function fetchProductData() {
            const params = new URLSearchParams(window.location.search);
            const productId = params.get("productId");
            if (cachedProductData && cachedProductId === productId) return cachedProductData;
            if (!productId) throw new Error("Brak productId w URL");

            const url = `https://edge.salescenter.allegro.com/sale/products/${productId}`;
            const data = await gmGetJson(url);
            console.log("[Pomocnik Wystawiania] API RESPONSE:", data);

            if (data.name) { cachedProductData = data; cachedProductId = productId; }
            return data;
        }

        // Szuka parametru EAN/GTIN po fladze options.isGTIN — działa niezależnie
        // od kategorii produktu (samo ID parametru zmienia się między kategoriami)
        function extractEans(data) {
            if (!data.parameters) return [];
            const gtinParam = data.parameters.find(p => p.options && p.options.isGTIN);
            if (!gtinParam) return [];
            return gtinParam.values || gtinParam.valuesLabels || [];
        }

        async function handleCopyEan() {
            try {
                const data = await fetchProductData();
                const eans = extractEans(data);

                if (!eans.length) {
                    showToast("Nie znaleziono EAN dla tego produktu", true);
                    return;
                }

                if (eans.length === 1) {
                    await commitEan(eans[0]);
                    return;
                }

                showEanPickerModal(eans);

            } catch (error) {
                console.error(error);
                showToast(`Błąd pobierania EAN: ${error.message}`, true);
            }
        }

        async function commitEan(ean) {
            GM_setValue(EAN_STORAGE_KEY, { ean, ts: Date.now() });
            await copyToClipboard(ean, `✓ EAN skopiowany: ${ean}`);
        }

        function showEanPickerModal(eans) {
            const overlay = document.createElement("div");
            Object.assign(overlay.style, {
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(10,10,12,0.6)", zIndex: 999998,
                display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font
            });
            const modal = document.createElement("div");
            Object.assign(modal.style, {
                background: "#fff", borderRadius: "14px", padding: "18px",
                width: "min(320px, 90vw)", boxShadow: "0 20px 50px rgba(0,0,0,0.35)"
            });
            const title = document.createElement("div");
            title.innerText = "Znaleziono kilka EAN — wybierz:";
            Object.assign(title.style, { fontWeight: 700, fontSize: "14px", marginBottom: "10px", color: "#1a1a1a" });
            modal.appendChild(title);

            eans.forEach(ean => {
                const btn = document.createElement("button");
                btn.innerText = ean;
                Object.assign(btn.style, {
                    display: "block", width: "100%", padding: "10px", marginBottom: "6px",
                    border: "1px solid #e5e7eb", borderRadius: "8px", background: "#f8f9fa",
                    cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#1a1a1a", textAlign: "left"
                });
                btn.onclick = async () => { await commitEan(ean); overlay.remove(); };
                modal.appendChild(btn);
            });

            overlay.appendChild(modal);
            overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
            document.body.appendChild(overlay);
        }

        async function openImagePicker() {
            try {
                const data = await fetchProductData();
                if (!data.images || !data.images.length) {
                    showToast("Brak zdjęć w odpowiedzi API", true);
                    return;
                }
                showImageModal(data.images, cleanProductName(data.name));
            } catch (error) {
                console.error(error);
                showToast(`Błąd pobierania zdjęć: ${error.message}`, true);
            }
        }

        function showImageModal(images, productName) {
            const old = document.getElementById("pwImageModal");
            if (old) old.remove();

            const overlay = document.createElement("div");
            overlay.id = "pwImageModal";
            Object.assign(overlay.style, {
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(10,10,12,0.6)", zIndex: 999998,
                display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font
            });

            const modal = document.createElement("div");
            Object.assign(modal.style, {
                background: "#fff", borderRadius: "16px", padding: "18px",
                width: "min(640px, 92vw)", maxHeight: "82vh",
                display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.35)"
            });

            const header = document.createElement("div");
            Object.assign(header.style, { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" });
            const titleEl = document.createElement("div");
            titleEl.innerText = `Wybierz zdjęcia (${images.length})`;
            Object.assign(titleEl.style, { fontWeight: 700, fontSize: "15px", color: "#1a1a1a" });
            const closeBtn = document.createElement("button");
            closeBtn.innerHTML = icon("close", 16);
            Object.assign(closeBtn.style, { border: "none", background: "transparent", cursor: "pointer", color: "#666", display: "flex", padding: "4px", borderRadius: "6px" });
            closeBtn.onclick = () => overlay.remove();
            header.appendChild(titleEl);
            header.appendChild(closeBtn);

            const actionsBar = document.createElement("div");
            Object.assign(actionsBar.style, { display: "flex", gap: "8px", marginBottom: "12px" });
            const selectAllBtn = document.createElement("button");
            selectAllBtn.innerText = "Zaznacz wszystkie";
            const deselectAllBtn = document.createElement("button");
            deselectAllBtn.innerText = "Odznacz wszystkie";
            [selectAllBtn, deselectAllBtn].forEach(b => Object.assign(b.style, {
                padding: "6px 10px", fontSize: "12px", fontWeight: 600, border: "1px solid #e5e7eb",
                borderRadius: "7px", background: "#f8f9fa", cursor: "pointer", color: "#333"
            }));
            actionsBar.appendChild(selectAllBtn);
            actionsBar.appendChild(deselectAllBtn);

            const grid = document.createElement("div");
            Object.assign(grid.style, {
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                gap: "10px", overflowY: "auto", padding: "4px", flex: "1"
            });

            const checkboxes = [];
            images.forEach((img, i) => {
                const cell = document.createElement("label");
                Object.assign(cell.style, {
                    position: "relative", display: "block", border: `2px solid ${T.blue}`,
                    borderRadius: "9px", overflow: "hidden", cursor: "pointer", aspectRatio: "1 / 1"
                });
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = true;
                checkbox.dataset.index = i;
                Object.assign(checkbox.style, { position: "absolute", top: "6px", left: "6px", width: "18px", height: "18px", zIndex: "2", cursor: "pointer" });
                const thumb = document.createElement("img");
                thumb.src = img.url;
                thumb.loading = "lazy";
                Object.assign(thumb.style, { width: "100%", height: "100%", objectFit: "cover", display: "block" });
                checkbox.addEventListener("change", () => { cell.style.borderColor = checkbox.checked ? T.blue : "#e5e7eb"; });
                cell.appendChild(checkbox);
                cell.appendChild(thumb);
                grid.appendChild(cell);
                checkboxes.push(checkbox);
            });

            selectAllBtn.onclick = () => checkboxes.forEach(cb => { cb.checked = true; cb.dispatchEvent(new Event("change")); });
            deselectAllBtn.onclick = () => checkboxes.forEach(cb => { cb.checked = false; cb.dispatchEvent(new Event("change")); });

            const footer = document.createElement("div");
            Object.assign(footer.style, { marginTop: "14px", display: "flex", justifyContent: "flex-end" });
            const downloadBtn = document.createElement("button");
            downloadBtn.innerHTML = `${icon("download", 14)}<span>Pobierz zaznaczone</span>`;
            Object.assign(downloadBtn.style, {
                display: "flex", alignItems: "center", gap: "7px", padding: "10px 16px",
                fontSize: "13px", fontWeight: 700, border: "none", borderRadius: "9px",
                background: T.blue, color: "#fff", cursor: "pointer"
            });
            downloadBtn.onclick = async () => {
                const selected = checkboxes.filter(cb => cb.checked).map(cb => Number(cb.dataset.index));
                if (!selected.length) { showToast("Nie zaznaczono żadnych zdjęć", true); return; }
                downloadBtn.disabled = true;
                downloadBtn.innerHTML = `<span>Pobieranie…</span>`;
                await downloadImagesSequentially(images, selected, productName);
                overlay.remove();
            };
            footer.appendChild(downloadBtn);

            modal.appendChild(header);
            modal.appendChild(actionsBar);
            modal.appendChild(grid);
            modal.appendChild(footer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
        }

        // Katalogowe zdjęcia czasem mają przycięte tło i wychodzą mniejsze niż
        // wymagane minimum 900x675 do wystawienia w panelu lombard. Zamiast
        // ręcznie powiększać białe tło w edytorze, dopełniamy je automatycznie
        // na canvasie, wyśrodkowując oryginalne zdjęcie.
        const MIN_WIDTH = 900;
        const MIN_HEIGHT = 675;

        function loadImageFromBlobUrl(blobUrl) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = blobUrl;
            });
        }

        async function padImageIfNeeded(blob) {
            const blobUrl = URL.createObjectURL(blob);
            try {
                const img = await loadImageFromBlobUrl(blobUrl);
                const w = img.naturalWidth;
                const h = img.naturalHeight;

                if (w >= MIN_WIDTH && h >= MIN_HEIGHT) {
                    return { blob, padded: false };
                }

                const targetW = Math.max(w, MIN_WIDTH);
                const targetH = Math.max(h, MIN_HEIGHT);

                const canvas = document.createElement("canvas");
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, targetW, targetH);
                ctx.drawImage(img, Math.round((targetW - w) / 2), Math.round((targetH - h) / 2), w, h);

                const paddedBlob = await new Promise((resolve) => {
                    canvas.toBlob((b) => resolve(b || blob), "image/jpeg", 0.92);
                });
                return { blob: paddedBlob, padded: true };
            } finally {
                URL.revokeObjectURL(blobUrl);
            }
        }

        async function downloadImagesSequentially(images, selectedIndexes, productName) {
            try {
                let count = 0;
                let paddedCount = 0;

                for (const i of selectedIndexes) {
                    const img = images[i];
                    const response = await fetch(img.url);
                    const rawBlob = await response.blob();
                    const { blob, padded } = await padImageIfNeeded(rawBlob);
                    if (padded) paddedCount++;

                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = blobUrl;
                    link.download = `${(productName || "allegro").slice(0, 40)}_${i + 1}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(blobUrl);
                    count++;

                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                showToast(paddedCount > 0
                    ? `✓ Pobrano ${count} zdjęć (${paddedCount} dopełniono białym tłem do min. rozmiaru)`
                    : `✓ Pobrano ${count} zdjęć`);

            } catch (error) {
                console.error(error);
                showToast("Błąd pobierania zdjęć", true);
            }
        }

        async function handleQuickStart(statusEl) {
            // EAN najpierw (szybkie, w tle), potem od razu okno wyboru zdjęć —
            // te dwie rzeczy i tak zawsze robisz razem przy każdym produkcie
            await handleCopyEan();
            await openImagePicker();
        }

        function createToolbox() {
            const panel = document.createElement("div");
            panel.id = "pwAllegroToolbox";
            Object.assign(panel.style, {
                position: "fixed", bottom: "20px", right: "20px", zIndex: "99999",
                fontFamily: T.font, userSelect: "none",
                background: T.bg, border: `1px solid ${T.border}`, borderRadius: "14px",
                width: "220px", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.35)"
            });

            const header = document.createElement("div");
            Object.assign(header.style, {
                display: "flex", alignItems: "center", gap: "8px", padding: "11px 12px",
                cursor: "grab", background: T.bgHeader, borderBottom: `1px solid ${T.border}`
            });
            const titleIcon = document.createElement("span");
            titleIcon.innerHTML = icon("toolbox", 15);
            titleIcon.style.color = T.accent;
            titleIcon.style.display = "flex";
            const title = document.createElement("div");
            title.innerText = "ALLEGRO TOOLBOX";
            Object.assign(title.style, { fontWeight: 700, fontSize: "11.5px", letterSpacing: "0.6px", color: T.text });
            header.appendChild(titleIcon);
            header.appendChild(title);

            const body = document.createElement("div");
            body.style.padding = "10px";

            const quickBtn = document.createElement("button");
            quickBtn.innerHTML = `${icon("zap", 14)}<span>Zdjęcia + EAN</span>`;
            Object.assign(quickBtn.style, {
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: "7px", padding: "10px", border: "none", borderRadius: "9px",
                background: T.accent, color: "#1a0d05", fontWeight: "700", fontSize: "12.5px",
                cursor: "pointer", marginBottom: "8px"
            });
            quickBtn.addEventListener("click", () => runWithSpinner(quickBtn, handleQuickStart));
            body.appendChild(quickBtn);

            const rows = document.createElement("div");
            Object.assign(rows.style, { display: "flex", flexDirection: "column", gap: "2px" });

            const downloadRow = createRow("Pobierz zdjęcia", "camera", T.blue, () => runWithSpinner(downloadRow, openImagePicker));
            const eanRow = createRow("Kopiuj EAN", "barcode", T.green, () => runWithSpinner(eanRow, handleCopyEan));
            rows.appendChild(downloadRow);
            rows.appendChild(eanRow);
            body.appendChild(rows);

            panel.appendChild(header);
            panel.appendChild(body);
            document.body.appendChild(panel);
            makeDraggable(panel, header);
        }

        function initToolbox() {
            if (!document.body.innerText.includes("ZMIEŃ PRODUKT")) return;
            if (document.getElementById("pwAllegroToolbox")) return;
            createToolbox();
        }

        function watchUrlChange() {
            setInterval(() => {
                const currentUrl = location.href;
                if (currentUrl !== lastUrl) {
                    lastUrl = currentUrl;
                    cachedProductData = null;
                    cachedProductId = null;
                    const oldPanel = document.getElementById("pwAllegroToolbox");
                    if (oldPanel) oldPanel.remove();
                    setTimeout(() => initToolbox(), 2000);
                }
            }, 1000);
        }

        setTimeout(() => initToolbox(), 3000);
        watchUrlChange();
    }

    // =========================================================
    // MODUŁ 3: GOOGLE AI MODE (strona wyniku wyszukiwania w tle)
    // =========================================================
    function runGoogleAiModule() {
        // Uruchamiamy się tylko jeśli lombard faktycznie na nas czeka —
        // żeby nie ingerować w zwykłe wyszukiwania Google
        const status = GM_getValue(AI_STATUS_KEY, "idle");
        if (status !== "pending") return;

        const myRequestId = GM_getValue(AI_REQUEST_ID_KEY, null);

        // Nakładka na całą stronę — żeby nikt nie klikał/scrollował podczas generowania
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(15,15,18,0.92)", zIndex: "2147483647",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
            color: "#fff", gap: "16px", cursor: "wait"
        });
        const spinner = document.createElement("div");
        Object.assign(spinner.style, {
            width: "40px", height: "40px", borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.25)", borderTopColor: "#ff5a1f",
            animation: "pwSpin 0.8s linear infinite"
        });
        const keyframes = document.createElement("style");
        keyframes.textContent = "@keyframes pwSpin { to { transform: rotate(360deg); } }";
        document.head.appendChild(keyframes);
        const overlayText = document.createElement("div");
        overlayText.innerText = "Czekaj… generuję opis";
        Object.assign(overlayText.style, { fontSize: "16px", fontWeight: "700", letterSpacing: "0.3px" });
        const overlaySubtext = document.createElement("div");
        overlaySubtext.innerText = "Za chwilę karta zamknie się sama — nie klikaj";
        Object.assign(overlaySubtext.style, { fontSize: "13px", color: "#93949c" });
        overlay.appendChild(spinner);
        overlay.appendChild(overlayText);
        overlay.appendChild(overlaySubtext);
        document.body.appendChild(overlay);

        // ---------- TODO: selektor kontenera z odpowiedzią AI Mode ----------
        // Priorytet: blok kodu <pre><code> — dzięki instrukcji w promptcie
        // ("umieść w bloku kodu"), Google renderuje odpowiedź jako czysty,
        // sformatowany Markdown wewnątrz <pre>, co jest dużo bardziej
        // stabilnym punktem zaczepienia niż zgadywanie klas AI Mode.
        const CANDIDATE_SELECTORS = [
            'pre code',
            'pre',
            '[data-attrid="AiOverviewText"]',
            '.LT6Xsc',
            '[jsname="RJyXff"]'
        ];
        // ---------------------------------------------------------------------

        function findAnswerElement() {
            for (const sel of CANDIDATE_SELECTORS) {
                const el = document.querySelector(sel);
                if (el && el.textContent && el.textContent.trim().length > 100) return el;
            }
            return null;
        }

        let stableTimer = null;
        let lastLength = 0;

        function checkStability() {
            const el = findAnswerElement();
            if (!el) return;

            const currentLength = el.textContent.length;

            if (currentLength === lastLength && currentLength > 100) {
                // Tekst przestał rosnąć przez cały interwał — uznajemy że generowanie się skończyło
                finishWithResult(el.innerText || el.textContent);
                return;
            }
            lastLength = currentLength;
        }

        function finishWithResult(text) {
            if (observer) observer.disconnect();
            clearInterval(stabilityInterval);
            clearTimeout(hardTimeout);

            GM_setValue(AI_RESULT_KEY, text);
            GM_setValue(AI_STATUS_KEY, "done");
            console.log("[Pomocnik Wystawiania] Wyciągnięto odpowiedź AI, zamykam kartę");

            overlayText.innerText = "Gotowe ✓";
            overlaySubtext.innerText = "Zamykam kartę…";
            setTimeout(() => { window.close(); }, 300);
        }

        function fail(reason) {
            console.warn("[Pomocnik Wystawiania] Automatyczne wyciąganie odpowiedzi nie powiodło się:", reason);
            GM_setValue(AI_STATUS_KEY, "error");
            // Zdejmujemy nakładkę i zostawiamy kartę widoczną, żeby dało się skopiować ręcznie
            overlay.remove();
        }

        const observer = new MutationObserver(() => { /* trigger re-check via interval below */ });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });

        const stabilityInterval = setInterval(checkStability, 1500);

        const hardTimeout = setTimeout(() => {
            fail("Timeout — nie udało się wykryć stabilnej odpowiedzi w wyznaczonym czasie");
        }, 35000);
    }
    // =========================================================
    // MODUŁ 2: PANEL LOMBARD (panel.loombard.pl/midas/products/*)
    // =========================================================
    function runLombardModule() {
        const EDITOR_ID = 'desc';

        // Pole wyszukiwania/dopasowania katalogu po EAN na kroku 2 ma stały,
        // semantyczny id="ean-search" — nie zależy od kategorii produktu.
        const EAN_FIELD_SELECTOR = '#ean-search';
        // Nagłówek karty aktualnego kroku — zawiera tytuł aukcji
        const TITLE_ELEMENT_SELECTOR = '.card-header.d-flex.align-items-center';

        function getAuctionTitle() {
            const el = document.querySelector(TITLE_ELEMENT_SELECTOR);
            if (!el) {
                console.warn(`[Pomocnik Wystawiania] Nie znaleziono elementu tytułu (selektor: ${TITLE_ELEMENT_SELECTOR})`);
                return null;
            }
            // Nagłówek karty czasem kończy się dopiskiem "- Opis" (nazwa aktualnego kroku) —
            // usuwamy go, żeby nie trafił do zapytania AI
            return el.textContent.trim().replace(/\s*[-–]\s*Opis\s*$/i, '').trim();
        }

        function insertEanIntoField(ean) {
            const input = document.querySelector(EAN_FIELD_SELECTOR);
            if (!input) {
                showToast("Nie znaleziono pola EAN na stronie", true);
                return false;
            }
            // Native setter — konieczny dla pól kontrolowanych przez React/Vue,
            // samo input.value = ean nie odpali walidacji/wyszukania katalogu
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(input, ean);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }

        function handleImportEan() {
            const stored = GM_getValue(EAN_STORAGE_KEY, null);
            if (!stored || !stored.ean) {
                showToast("Brak zapisanego EAN — skopiuj go najpierw na Allegro", true);
                return;
            }
            const ok = insertEanIntoField(stored.ean);
            if (ok) showToast(`✓ Wklejono EAN: ${stored.ean}`);
        }

        // Pole "Opis bezpieczeństwa" w kroku 4 to zwykła <textarea>, nie TinyMCE —
        // wstawiamy przez natywny setter + eventy, tak samo jak przy polu EAN.
        function insertSafetyDescription(text) {
            const textarea = document.querySelector('textarea[name="allegro[safetyInformation.description]"]');
            if (!textarea) return false;
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            nativeSetter.call(textarea, text);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }

        // Opis bezpieczeństwa to zwykły tekst (textarea bez formatowania) — więc zamiast
        // HTML-a robimy z segmentów czysty tekst: nagłówki/punkty listy bez znaczników markdown,
        // akapity oddzielone pustą linią.
        function stripInlineMarkup(text) {
            return text.replace(/<\/?strong>/g, '').replace(/\*\*/g, '');
        }

        function segmentsToPlainText(segments) {
            return segments.map(seg => {
                if (seg.type === 'h1' || seg.type === 'h2') return stripInlineMarkup(seg.text);
                if (seg.type === 'list') return seg.items.map(it => `- ${stripInlineMarkup(it)}`).join('\n');
                if (seg.type === 'paragraph') return stripInlineMarkup(seg.text);
                return '';
            }).filter(Boolean).join('\n\n');
        }

        // Wspólny mechanizm dla wszystkich automatyzacji przez Google AI Mode w tle:
        // otwiera kartę, czeka na wynik (patrz runGoogleAiModule), a po odebraniu
        // wstawia go w odpowiednie miejsce zależnie od "kind".
        function startAiAutomation(query, kind, statusEl) {
            const requestId = String(Date.now());
            GM_setValue(AI_REQUEST_ID_KEY, requestId);
            GM_setValue(AI_RESULT_KEY, "");
            GM_setValue(AI_STATUS_KEY, "pending");
            GM_setValue(AI_KIND_KEY, kind);

            const url = buildGoogleUrl(query);
            const tab = GM_openInTab(url, { active: true, insert: true, setParent: true });

            showToast("Generuję w tle — karta mignie na chwilę i wróci sama…");
            if (statusEl) statusEl.textContent = "Czekam na odpowiedź AI…";

            let elapsed = 0;
            const pollInterval = setInterval(() => {
                elapsed += 1000;
                const currentStatus = GM_getValue(AI_STATUS_KEY, "idle");
                const currentRequestId = GM_getValue(AI_REQUEST_ID_KEY, null);

                if (currentRequestId !== requestId) {
                    // ktoś odpalił nowe żądanie w międzyczasie — przestajemy nasłuchiwać tego
                    clearInterval(pollInterval);
                    return;
                }

                if (currentStatus === "done") {
                    clearInterval(pollInterval);
                    const result = GM_getValue(AI_RESULT_KEY, "");
                    GM_setValue(AI_STATUS_KEY, "idle");

                    if (result) {
                        const segments = parseStructure(result);

                        if (kind === "description") {
                            const html = segmentsToHtml(segments);
                            if (typeof tinymce !== 'undefined' && tinymce.get(EDITOR_ID)) {
                                tinymce.get(EDITOR_ID).setContent(html);
                                showToast("✓ Opis AI wygenerowany i wklejony");
                                if (statusEl) statusEl.textContent = "Wklejono automatycznie ✓";
                            } else {
                                showToast("Wygenerowano opis, ale nie znaleziono edytora — wklej ręcznie", true);
                            }
                        } else if (kind === "safety") {
                            const plain = segmentsToPlainText(segments);
                            const ok = insertSafetyDescription(plain);
                            if (ok) {
                                showToast("✓ Opis bezpieczeństwa wygenerowany i wklejony");
                                if (statusEl) statusEl.textContent = "Wklejono automatycznie ✓";
                            } else {
                                showToast("Wygenerowano opis, ale nie znaleziono pola — wklej ręcznie", true);
                            }
                        }
                    }
                    return;
                }

                if (currentStatus === "error") {
                    clearInterval(pollInterval);
                    GM_setValue(AI_STATUS_KEY, "idle");
                    showToast("Nie udało się wyciągnąć odpowiedzi automatycznie — otwieram kartę do ręcznego skopiowania", true);
                    if (statusEl) statusEl.textContent = "Automatyka nie zadziałała — sprawdź otwartą kartę";
                    if (tab && typeof tab.focus === "function") tab.focus();
                    return;
                }

                if (elapsed > 40000) {
                    clearInterval(pollInterval);
                    showToast("Timeout — otwieram kartę do ręcznego skopiowania", true);
                    if (statusEl) statusEl.textContent = "Timeout — sprawdź otwartą kartę";
                    if (tab && typeof tab.focus === "function") tab.focus();
                }
            }, 1000);
        }

        function handleAiDescriptionAuto(statusEl) {
            const title = getAuctionTitle();
            if (!title) {
                showToast("Nie udało się odczytać tytułu aukcji — zobacz konsolę", true);
                return;
            }
            const query = `Stwórz mi profesjonalny opis sprzedażowy do aukcji Allegro zgodny z regulaminem Allegro dla produktu "${title}". Opis ma być atrakcyjny marketingowo, podkreślać zalety produktu, być napisany naturalnym językiem sprzedażowym i gotowy do wklejenia na aukcję. Nie dodawaj komentarzy ani żadnych wstępów poza samym opisem. Użyj wyłącznie formatu Markdown (nagłówki #, ##, pogrubienia **tekst**, listy punktowane -). Cały opis umieść w jednym bloku kodu, otwierając i zamykając go potrójnym apostrofem, żeby dało się go skopiować bez utraty formatowania.`;
            startAiAutomation(query, "description", statusEl);
        }

        function handleSafetyDescriptionAuto(statusEl) {
            const title = getAuctionTitle();
            if (!title) {
                showToast("Nie udało się odczytać tytułu aukcji — zobacz konsolę", true);
                return;
            }
            const query = `Stwórz opis bezpieczeństwa (informacje o bezpiecznym użytkowaniu) zgodny z wymogami GPSR dla produktu "${title}", przeznaczony do wklejenia w sekcję "Opis bezpieczeństwa" na Allegro.

Opis ma zawierać WYŁĄCZNIE: ostrzeżenia dotyczące bezpiecznego użytkowania, zagrożenia, ograniczenia wiekowe (jeśli dotyczy), sposób przechowywania i konserwacji.

NIE dodawaj: danych producenta, importera, adresu, danych kontaktowych, osoby odpowiedzialnej w UE ani żadnych innych informacji identyfikujących firmę - to osobna sekcja, obsługiwana gdzie indziej, nie chcę jej tutaj w ogóle wspominać.

Nie dodawaj żadnych powitań, wstępów, emoji ani komentarzy na końcu. Użyj wyłącznie formatu Markdown (nagłówki #, ##, pogrubienia **tekst**, listy punktowane -). Cały opis umieść w jednym bloku kodu, otwierając i zamykając go potrójnym apostrofem, żeby dało się go skopiować bez utraty formatowania.`;
            startAiAutomation(query, "safety", statusEl);
        }

        function handleManufacturerData() {
            const title = getAuctionTitle();
            if (!title) {
                showToast("Nie udało się odczytać tytułu aukcji — zobacz konsolę", true);
                return;
            }
            const query = `znajdź mi dane producenta lub osoby odpowiedzialnej na terenie UE dla produktu "${title}" z nazwą firmy i adresem kontaktowym - wymagane do aukcji allegro`;
            openOrCopy(buildGoogleUrl(query), "dane producenta");
            // GM_openInTab, nie window.open — przeglądarka blokuje drugie programowe
            // window.open() z tego samego kliknięcia jako popup-spam
            GM_openInTab("https://salescenter.allegro.com/responsible-producers", { active: false, insert: true, setParent: true });
        }

        // ---------- FORMATER OPISU (bez zmian względem oryginału) ----------
        function isKV(line) { return /^[\p{L}][\p{L}\p{N} \-]{1,28}:\s+\S.*$/u.test(line); }
        function isHeaderCandidate(line) { return /^.{1,60}:$/.test(line); }
        function inlineBold(text) { return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }

        function preprocess(raw) {
            let text = raw.replace(/¶/g, '\n\n');
            text = text.replace(/^\s*([-*_])\1{2,}\s*$/gm, '');
            text = text.replace(/ \* \*\*/g, '\n* **');
            return text;
        }

        function parseStructure(rawInput) {
            const raw = preprocess(rawInput);
            const lines = raw.split('\n').map((l) => l.trim());
            const n = lines.length;
            let i = 0;
            const segments = [];
            while (i < n && lines[i] === '') i++;
            if (i < n) {
                const headerMatch = lines[i].match(/^(#{1,6})\s+(.*)/);
                segments.push({ type: 'h1', text: inlineBold(headerMatch ? headerMatch[2] : lines[i]) });
                i++;
            }
            while (i < n) {
                while (i < n && lines[i] === '') i++;
                if (i >= n) break;
                const line = lines[i];
                const mdHeader = line.match(/^(#{1,6})\s+(.*)/);
                if (mdHeader) {
                    segments.push({ type: mdHeader[1].length === 1 ? 'h1' : 'h2', text: inlineBold(mdHeader[2]) });
                    i++; continue;
                }
                const mdList = line.match(/^[*\-]\s+(.*)/);
                if (mdList) {
                    const items = [];
                    while (i < n && lines[i] !== '') {
                        const m = lines[i].match(/^[*\-]\s+(.*)/);
                        if (!m) break;
                        items.push(inlineBold(m[1])); i++;
                    }
                    segments.push({ type: 'list', ordered: false, items }); continue;
                }
                const mdOrderedList = line.match(/^\d+\.\s+(.*)/);
                if (mdOrderedList) {
                    const items = [];
                    while (i < n && lines[i] !== '') {
                        const m = lines[i].match(/^\d+\.\s+(.*)/);
                        if (!m) break;
                        items.push(inlineBold(m[1])); i++;
                    }
                    segments.push({ type: 'list', ordered: true, items }); continue;
                }
                if (isHeaderCandidate(line)) {
                    let j = i + 1;
                    while (j < n && lines[j] === '') j++;
                    if (j < n && isKV(lines[j])) {
                        segments.push({ type: 'h2', text: line });
                        i = j;
                        const items = [];
                        while (i < n && lines[i] !== '' && isKV(lines[i])) { items.push(lines[i]); i++; }
                        segments.push({ type: 'list', ordered: false, items });
                        continue;
                    }
                }
                const paraLines = [];
                while (i < n && lines[i] !== '') { paraLines.push(lines[i]); i++; }
                const text = paraLines.join(' ');
                segments.push({ type: 'paragraph', text, hasExplicitBold: /\*\*/.test(text) });
            }
            return segments;
        }

        function boldFirstPhrase(text) {
            const commaIdx = text.indexOf(',');
            let boldPart, rest;
            if (commaIdx > -1 && commaIdx <= 20) {
                boldPart = text.slice(0, commaIdx); rest = text.slice(commaIdx);
            } else {
                const spaceIdx = text.indexOf(' ');
                if (spaceIdx === -1) { boldPart = text; rest = ''; }
                else { boldPart = text.slice(0, spaceIdx); rest = text.slice(spaceIdx); }
            }
            return `<strong>${boldPart}</strong>${rest}`;
        }

        function segmentsToHtml(segments) {
            const paraIndices = segments.map((s, idx) => (s.type === 'paragraph' ? idx : -1)).filter((idx) => idx !== -1);
            const lastParaIdx = paraIndices.length ? paraIndices[paraIndices.length - 1] : -1;
            const SPACER = '<p>&nbsp;</p>';
            const blocks = [];
            segments.forEach((seg, idx) => {
                if (seg.type === 'h1') blocks.push(`<h1>${seg.text}</h1>`);
                else if (seg.type === 'h2') blocks.push(`<h2>${seg.text}</h2>`);
                else if (seg.type === 'list') {
                    const tag = seg.ordered ? 'ol' : 'ul';
                    blocks.push(`<${tag}>` + seg.items.map((it) => `<li>${it}</li>`).join('') + `</${tag}>`);
                } else if (seg.type === 'paragraph') {
                    if (seg.hasExplicitBold) blocks.push(`<p>${inlineBold(seg.text)}</p>`);
                    else {
                        const isLast = idx === lastParaIdx;
                        blocks.push(`<p>${isLast ? seg.text : boldFirstPhrase(seg.text)}</p>`);
                    }
                }
            });
            return blocks.join(SPACER);
        }

        function applyFormatting(raw, statusEl) {
            if (!raw.trim()) { statusEl.textContent = 'Pole jest puste.'; return; }
            if (typeof tinymce === 'undefined' || !tinymce.get(EDITOR_ID)) {
                statusEl.textContent = `Nie znaleziono edytora TinyMCE o ID "${EDITOR_ID}".`;
                return;
            }
            const html = segmentsToHtml(parseStructure(raw));
            tinymce.get(EDITOR_ID).setContent(html);
            statusEl.textContent = 'Zastosowano ✓';
        }

        // ---------- PRESETY WYSYŁKI/FAKTURY ----------
        const SHIPPING_GROUP = 'allegro[shippingRates]';
        const PAYMENT_GROUP = 'allegro[payments]';
        const CONSTANT_FIELDS = [
            { group: 'allegro[warranties]', value: '290f0025-f1b0-461a-a82f-9567eda69698' },
            { group: 'allegro[impliedWarranties]', value: '23527e52-d98f-44df-8b77-d6ed627194f3' },
            { group: 'allegro[returnPolicies]', value: '459a37dd-7f1b-49ce-9c5d-271535880851' },
            { group: 'allegro[duration]', value: 'null' },
            { group: 'allegro[handlingTime]', value: 'PT24H' },
            { group: 'allegro[safetyInformation.type]', value: 'TEXT' },
        ];

        // Domyślne presety — działają "z pudełka" tylko na koncie, na którym powstały
        // (to konkretne UUID-y cenników wysyłki z TEGO konta Allegro). Na innym koncie
        // trzeba dodać własne przez "Zarządzaj presetami" — stąd cały mechanizm poniżej.
        const DEFAULT_PRESETS = [
            { label: 'Paczkomat, nowe', shipping: '4980857f-c5a8-47e3-b345-cdff80e74b21', payment: 'NO_INVOICE' },
            { label: 'Paczkomat, używane', shipping: '4980857f-c5a8-47e3-b345-cdff80e74b21', payment: 'VAT_MARGIN' },
            { label: 'Pocztex, używane', shipping: 'a58c3471-b84f-43f8-9aeb-2339d5434018', payment: 'VAT_MARGIN' },
        ];

        const USER_PRESETS_KEY = "pw_user_shipping_presets";

        function loadUserPresets() {
            return GM_getValue(USER_PRESETS_KEY, null) || DEFAULT_PRESETS;
        }

        function saveUserPresets(list) {
            GM_setValue(USER_PRESETS_KEY, list);
        }

        // Czyta prawdziwe, aktualnie dostępne opcje danej grupy pól WPROST ze strony —
        // czyli z konta, na którym akurat działa skrypt, zamiast zaszytych na sztywno UUID-ów.
        function scanGroupOptions(groupName) {
            const inputs = Array.from(document.querySelectorAll(`input[name="${CSS.escape(groupName)}"]`));
            return inputs.map(input => {
                const label = input.closest('label');
                const text = label ? label.textContent.trim() : input.value;
                return { value: input.value, label: text };
            }).filter(o => o.label);
        }

        function setDropdownValue(groupName, targetValue) {
            const input = document.querySelector(`input[name="${CSS.escape(groupName)}"][value="${CSS.escape(targetValue)}"]`);
            if (!input) return { ok: false, reason: `Nie znaleziono opcji "${targetValue}" w grupie "${groupName}"` };
            if (!input.checked) input.click();
            return { ok: true };
        }

        function applyPreset(preset, statusEl) {
            const results = [
                setDropdownValue(SHIPPING_GROUP, preset.shipping),
                setDropdownValue(PAYMENT_GROUP, preset.payment),
                ...CONSTANT_FIELDS.map((f) => setDropdownValue(f.group, f.value)),
            ];
            const failures = results.filter((r) => !r.ok).map((r) => r.reason);
            statusEl.textContent = failures.length === 0
                ? `Zastosowano: ${preset.label} ✓ (${results.length} pól)`
                : `Częściowo: ${failures.length} pól nie znaleziono - ${failures.join(' / ')}`;
        }

        // Okno "Dodaj nowy preset" — pokazuje PRAWDZIWE opcje wysyłki/faktury z bieżącej
        // strony (czyli z konta osoby klikającej), a nie moje zaszyte na sztywno UUID-y.
        function openPresetEditorModal(onSaved) {
            const shippingOptions = scanGroupOptions(SHIPPING_GROUP);
            const paymentOptions = scanGroupOptions(PAYMENT_GROUP);

            if (!shippingOptions.length || !paymentOptions.length) {
                showToast("Nie znaleziono opcji wysyłki/faktury na tej stronie — upewnij się, że jesteś na kroku 'Dane końcowe'", true);
                return;
            }

            const overlay = document.createElement("div");
            Object.assign(overlay.style, {
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(10,10,12,0.6)", zIndex: 9999999,
                display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font
            });

            const modal = document.createElement("div");
            Object.assign(modal.style, {
                background: "#fff", borderRadius: "14px", padding: "18px",
                width: "min(360px, 90vw)", boxShadow: "0 20px 50px rgba(0,0,0,0.35)"
            });

            const title = document.createElement("div");
            title.innerText = "Nowy preset wysyłki/faktury";
            Object.assign(title.style, { fontWeight: 700, fontSize: "14px", marginBottom: "12px", color: "#1a1a1a" });
            modal.appendChild(title);

            function makeField(labelText, options) {
                const wrap = document.createElement("div");
                wrap.style.marginBottom = "10px";
                const lbl = document.createElement("div");
                lbl.innerText = labelText;
                Object.assign(lbl.style, { fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "4px" });
                const select = document.createElement("select");
                Object.assign(select.style, {
                    width: "100%", padding: "8px", borderRadius: "7px", border: "1px solid #e5e7eb",
                    fontSize: "13px", color: "#1a1a1a"
                });
                options.forEach(opt => {
                    const optionEl = document.createElement("option");
                    optionEl.value = opt.value;
                    optionEl.innerText = opt.label;
                    select.appendChild(optionEl);
                });
                wrap.appendChild(lbl);
                wrap.appendChild(select);
                modal.appendChild(wrap);
                return select;
            }

            const nameWrap = document.createElement("div");
            nameWrap.style.marginBottom = "10px";
            const nameLbl = document.createElement("div");
            nameLbl.innerText = "Nazwa presetu";
            Object.assign(nameLbl.style, { fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "4px" });
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.placeholder = "np. Inpost, nowe";
            Object.assign(nameInput.style, {
                width: "100%", boxSizing: "border-box", padding: "8px", borderRadius: "7px",
                border: "1px solid #e5e7eb", fontSize: "13px", color: "#1a1a1a"
            });
            nameWrap.appendChild(nameLbl);
            nameWrap.appendChild(nameInput);
            modal.appendChild(nameWrap);

            const shippingSelect = makeField("Wysyłka", shippingOptions);
            const paymentSelect = makeField("Faktura / płatność", paymentOptions);

            const btnRow = document.createElement("div");
            Object.assign(btnRow.style, { display: "flex", gap: "8px", marginTop: "6px" });

            const cancelBtn = document.createElement("button");
            cancelBtn.innerText = "Anuluj";
            const saveBtn = document.createElement("button");
            saveBtn.innerText = "Zapisz preset";
            Object.assign(cancelBtn.style, {
                flex: "1", padding: "10px", border: "1px solid #e5e7eb", borderRadius: "8px",
                background: "#f8f9fa", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#333"
            });
            Object.assign(saveBtn.style, {
                flex: "1", padding: "10px", border: "none", borderRadius: "8px",
                background: T.green, cursor: "pointer", fontSize: "13px", fontWeight: 700, color: "#fff"
            });
            cancelBtn.onclick = () => overlay.remove();
            saveBtn.onclick = () => {
                const label = nameInput.value.trim();
                if (!label) { nameInput.focus(); return; }
                const list = loadUserPresets();
                list.push({ label, shipping: shippingSelect.value, payment: paymentSelect.value });
                saveUserPresets(list);
                overlay.remove();
                showToast(`✓ Dodano preset: ${label}`);
                if (onSaved) onSaved();
            };
            btnRow.appendChild(cancelBtn);
            btnRow.appendChild(saveBtn);
            modal.appendChild(btnRow);

            overlay.appendChild(modal);
            overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
            document.body.appendChild(overlay);
        }

        // ---------- PRESETY BIŻUTERIA (kaskada kategorii + parametry) ----------

        // Wspólna ścieżka dla wszystkich typów biżuterii damskiej: Moda -> Biżuteria i Zegarki -> Biżuteria damska
        const JEWELRY_CATEGORY_PATH = [
            "ea5b98dd-4b6f-4bd0-8c80-22c2629132d0", // Moda
            "19732",                                 // Biżuteria i Zegarki
            "123422"                                 // Biżuteria damska
        ];

        const JEWELRY_LEAVES = {
            lancuszki: { id: "123432", label: "Łańcuszki" },
            bransoletki: { id: "257987", label: "Bransoletki" },
            pierscionki: { id: "123450", label: "Pierścionki, obrączki" },
            kolczyki: { id: "123429", label: "Kolczyki" }
        };

        // Pola wspólne dla każdego typu biżuterii, niezależnie od kategorii —
        // Splot/Długość/Waga zostają ręczne, bo są specyficzne dla konkretnego przedmiotu
        const JEWELRY_COMMON_FIELDS = [
            { group: "11323", value: "11323_2" },        // Stan: Używany
            { group: "2205[]", value: "2205_2" },        // Rodzaj: Wyrób jubilerski
            { group: "248811", value: "248811_958954" }, // Marka: bez marki
            { group: "15851", value: "15851_1" },        // Płeć: kobieta
        ];

        // Materiał musi być ustawiony PRZED próbą — pole "Próba złota" pojawia się
        // warunkowo dopiero po wybraniu materiału (data-displayed_if w HTML Allegro)
        const JEWELRY_PURITY_FIELDS = {
            "585": [
                { group: "15835[]", value: "15835_2" },      // Materiał: złoto
                { group: "206646", value: "206646_228242" }  // Próba złota: 585
            ],
            "333": [
                { group: "15835[]", value: "15835_2" },      // Materiał: złoto
                { group: "206646", value: "206646_228254" }  // Próba złota: 333
            ]
        };

        // Pola dodatkowe wymagane tylko dla niektórych typów biżuterii (bransoletki, kolczyki) —
        // Kolor i Motyw nie występują jako pola dla łańcuszków/pierścionków
        const JEWELRY_EXTRA_FIELDS_BY_LEAF = {
            bransoletki: [
                { group: "249512", value: "249512_1647429" }, // Kolor: złoty
                { group: "129129", value: "129129_1781747" }  // Motyw: boho
            ],
            kolczyki: [
                { group: "249512", value: "249512_1647429" }, // Kolor: złoty
                { group: "129129", value: "129129_1781747" }  // Motyw: boho
            ]
        };

        function findByExactText(selector, text) {
            return Array.from(document.querySelectorAll(selector)).find(el => el.textContent.trim() === text);
        }

        const JEWELRY_PENDING_KEY = "pw_jewelry_pending";

        function waitFor(checkFn, timeout = 4000, interval = 150) {
            return new Promise((resolve, reject) => {
                const start = Date.now();
                (function tick() {
                    const result = checkFn();
                    if (result) return resolve(result);
                    if (Date.now() - start > timeout) return reject(new Error("Timeout czekania na element"));
                    setTimeout(tick, interval);
                })();
            });
        }

        // Sekcja Parametry po zapisaniu kategorii renderuje się w Allegro dwuetapowo —
        // najpierw wstępny szkielet, chwilę później docelowa wersja (dociągnięta osobnym
        // zapytaniem), która nadpisuje/kasuje to, co zdążyliśmy kliknąć w wersji wstępnej.
        // Czekamy więc aż sekcja przestanie się zmieniać, zanim zaczniemy cokolwiek klikać.
        function waitForStableParameters(selector, stableMs = 700, timeout = 8000) {
            return new Promise((resolve, reject) => {
                const start = Date.now();
                let lastLength = -1;
                let stableStart = null;
                (function tick() {
                    const el = document.querySelector(selector);
                    if (el) {
                        const len = el.innerHTML.length;
                        if (len === lastLength) {
                            if (!stableStart) stableStart = Date.now();
                            if (Date.now() - stableStart >= stableMs) return resolve(el);
                        } else {
                            lastLength = len;
                            stableStart = null;
                        }
                    }
                    if (Date.now() - start > timeout) return reject(new Error("Timeout czekania na stabilne parametry"));
                    setTimeout(tick, 150);
                })();
            });
        }

        async function clickCategoryLevel(dataId) {
            const link = await waitFor(() => document.querySelector(`a.list-group-item[data-id="${CSS.escape(dataId)}"]`));
            link.click();
        }

        // Faza 1: klika kaskadę kategorii, zapisuje "co dokończyć po reloadzie" do GM
        // storage (przetrwa przeładowanie), i dopiero wtedy klika Zapisz kategorię —
        // ten klik przeładowuje stronę, więc od tego momentu skrypt i tak przestaje istnieć.
        async function startJewelryPreset(leafKey, purity, statusEl) {
            const leaf = JEWELRY_LEAVES[leafKey];
            try {
                statusEl.textContent = `Wybieram kategorię: ${leaf.label}…`;

                for (const id of JEWELRY_CATEGORY_PATH) {
                    await clickCategoryLevel(id);
                }
                await clickCategoryLevel(leaf.id);
                await new Promise(r => setTimeout(r, 500));

                const saveBtn = await waitFor(() => findByExactText("button, a", "Zapisz kategorię"));

                // zapisujemy PRZED kliknięciem — klik zaraz przeładuje stronę
                GM_setValue(JEWELRY_PENDING_KEY, { leafKey, purity });
                statusEl.textContent = `Zapisuję kategorię (strona się przeładuje)…`;
                saveBtn.click();

            } catch (error) {
                console.error("[Pomocnik Wystawiania] Błąd wyboru kategorii biżuterii:", error);
                statusEl.textContent = `Błąd — sprawdź konsolę (F12)`;
            }
        }

        // Faza 2: odpala się po przeładowaniu strony (patrz koniec runLombardModule),
        // jeśli w GM storage czeka jakiś preset — wypełnia parametry.
        async function finishJewelryPreset(pending) {
            const leaf = JEWELRY_LEAVES[pending.leafKey];
            try {
                showToast(`Wypełniam parametry: ${leaf.label} ${pending.purity}…`);
                await waitForStableParameters('[data-input_group="15835"]');

                const fields = [
                    ...JEWELRY_COMMON_FIELDS,
                    ...JEWELRY_PURITY_FIELDS[pending.purity],
                    ...(JEWELRY_EXTRA_FIELDS_BY_LEAF[pending.leafKey] || [])
                ];
                const results = [];
                for (const f of fields) {
                    results.push(setDropdownValue(f.group, f.value));
                    await new Promise(r => setTimeout(r, 200));
                }

                const failures = results.filter(r => !r.ok).map(r => r.reason);
                showToast(failures.length === 0
                    ? `✓ ${leaf.label} ${pending.purity} — parametry ustawione`
                    : `Częściowo: ${failures.length} pól nie znaleziono`, failures.length > 0);

            } catch (error) {
                console.error("[Pomocnik Wystawiania] Błąd wypełniania parametrów biżuterii:", error);
                showToast("Błąd wypełniania parametrów — sprawdź konsolę (F12)", true);
            }
        }

        // ---------- UI: JEDEN BOCZNY PANEL ----------
        const PANEL_STATE_KEY = "pw_lombard_panel_state";
        const DEFAULT_PANEL_STATE = { open: true, top: 100, left: null, width: 420, height: 560, formatterCollapsed: true, jewelry585Collapsed: true, jewelry333Collapsed: true };

        function loadPanelState() {
            const saved = GM_getValue(PANEL_STATE_KEY, null);
            const state = saved ? { ...DEFAULT_PANEL_STATE, ...saved } : { ...DEFAULT_PANEL_STATE };
            if (state.left == null) {
                // pierwsze uruchomienie albo migracja ze starego zapisu opartego o "right" —
                // pozycjonujemy przez "left", żeby CSS resize rozciągał w naturalną stronę (prawo/dół)
                const rightMargin = state.right != null ? state.right : 20;
                state.left = Math.max(0, window.innerWidth - state.width - rightMargin);
            }
            return state;
        }

        function savePanelState(patch) {
            const current = loadPanelState();
            GM_setValue(PANEL_STATE_KEY, { ...current, ...patch });
        }

        function buildPanel() {
            const state = loadPanelState();

            const panel = document.createElement("div");
            panel.id = "pwLombardPanel";
            Object.assign(panel.style, {
                position: "fixed", top: state.top + "px", left: state.left + "px", zIndex: "999999",
                fontFamily: T.font, background: T.bg, border: `1px solid ${T.border}`,
                borderRadius: "14px", width: state.width + "px", height: state.height + "px",
                minWidth: "320px", minHeight: "280px",
                boxSizing: "border-box",
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                display: state.open ? "flex" : "none", flexDirection: "column",
                overflow: "hidden"
            });

            const header = document.createElement("div");
            Object.assign(header.style, {
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "11px 12px", cursor: "grab", background: T.bgHeader, borderBottom: `1px solid ${T.border}`
            });
            const titleEl = document.createElement("div");
            titleEl.innerText = "POMOCNIK WYSTAWIANIA";
            Object.assign(titleEl.style, { fontWeight: 700, fontSize: "13px", letterSpacing: "0.6px", color: T.text });
            const closeBtn = document.createElement("button");
            closeBtn.innerHTML = icon("close", 14);
            Object.assign(closeBtn.style, { border: "none", background: "transparent", cursor: "pointer", color: T.textDim, display: "flex", padding: "4px" });
            closeBtn.onclick = () => { panel.style.display = "none"; };
            header.appendChild(titleEl);
            header.appendChild(closeBtn);

            const body = document.createElement("div");
            Object.assign(body.style, { padding: "10px", overflowY: "auto", flex: "1", minHeight: "0" });

            // sekcja: EAN + opisy
            const quickRows = document.createElement("div");
            Object.assign(quickRows.style, { display: "flex", flexDirection: "column", gap: "2px", marginBottom: "4px" });
            quickRows.appendChild(createRow("Importuj EAN", "barcode", T.green, handleImportEan, "15.5px", 32));
            quickRows.appendChild(createRow("Opis AI (auto)", "sparkles", T.accent, () => handleAiDescriptionAuto(quickStatus), "15.5px", 32));
            quickRows.appendChild(createRow("Opis bezpieczeństwa (auto)", "shield", T.amber, () => handleSafetyDescriptionAuto(quickStatus), "15.5px", 32));
            quickRows.appendChild(createRow("Dane producenta", "building", T.purple, handleManufacturerData, "15.5px", 32));
            body.appendChild(quickRows);

            const quickStatus = document.createElement("div");
            Object.assign(quickStatus.style, { fontSize: "12.5px", color: T.textDim, marginBottom: "8px", minHeight: "16px" });
            body.appendChild(quickStatus);

            // sekcja: formater — zwijana, bo przy automatycznym Opisie AI rzadko potrzebna ręcznie
            const formatterHeader = document.createElement("button");
            Object.assign(formatterHeader.style, {
                display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                border: "none", background: "transparent", cursor: "pointer", padding: "8px 0 6px", margin: "2px 0 0"
            });
            const formatterLabel = document.createElement("span");
            formatterLabel.innerText = "FORMATER OPISU (ręczne wklejanie)";
            Object.assign(formatterLabel.style, { fontSize: "11.5px", fontWeight: 700, color: T.textDim, letterSpacing: "0.5px" });
            const formatterChevron = document.createElement("span");
            formatterChevron.innerHTML = icon("chevron", 13);
            Object.assign(formatterChevron.style, { color: T.textDim, display: "flex", transition: "transform 0.15s ease" });
            formatterHeader.appendChild(formatterLabel);
            formatterHeader.appendChild(formatterChevron);
            body.appendChild(formatterHeader);

            const formatterBody = document.createElement("div");
            Object.assign(formatterBody.style, { display: "none", flexDirection: "column" });

            const textarea = document.createElement("textarea");
            textarea.placeholder = "Wklej tu oczyszczony opis z AI (zwykły tekst)...";
            Object.assign(textarea.style, {
                width: "100%", height: "180px", boxSizing: "border-box", border: `1px solid ${T.border}`,
                borderRadius: "8px", padding: "8px", resize: "vertical", fontFamily: "monospace",
                fontSize: "13px", background: "#0f1013", color: T.text
            });
            formatterBody.appendChild(textarea);

            const formatterBtns = document.createElement("div");
            Object.assign(formatterBtns.style, { display: "flex", gap: "6px", marginTop: "6px" });

            const pasteBtn = document.createElement("button");
            pasteBtn.innerHTML = `${icon("clipboard", 13)}<span>Wklej</span>`;
            const applyBtn = document.createElement("button");
            applyBtn.innerText = "Zastosuj";
            [pasteBtn, applyBtn].forEach(b => Object.assign(b.style, {
                flex: "1", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                padding: "9px", border: "none", borderRadius: "7px", cursor: "pointer",
                fontSize: "13.5px", fontWeight: 700, color: "#fff"
            }));
            pasteBtn.style.background = T.amber;
            applyBtn.style.background = T.green;
            formatterBtns.appendChild(pasteBtn);
            formatterBtns.appendChild(applyBtn);
            formatterBody.appendChild(formatterBtns);

            function setFormatterCollapsed(collapsed) {
                formatterBody.style.display = collapsed ? "none" : "flex";
                formatterChevron.style.transform = collapsed ? "rotate(0deg)" : "rotate(180deg)";
            }
            setFormatterCollapsed(state.formatterCollapsed);

            formatterHeader.addEventListener("click", () => {
                const collapsed = formatterBody.style.display === "none";
                setFormatterCollapsed(!collapsed);
                savePanelState({ formatterCollapsed: !collapsed });
            });

            const formatterStatus = document.createElement("div");
            Object.assign(formatterStatus.style, { fontSize: "12.5px", color: T.textDim, marginTop: "4px", minHeight: "16px" });
            formatterBody.appendChild(formatterStatus);

            body.appendChild(formatterBody);

            pasteBtn.onclick = async () => {
                try {
                    textarea.value = await navigator.clipboard.readText();
                    formatterStatus.textContent = "Wklejono ze schowka";
                } catch {
                    formatterStatus.textContent = "Brak dostępu do schowka — wklej ręcznie (Ctrl+V).";
                }
            };
            applyBtn.onclick = () => applyFormatting(textarea.value, formatterStatus);

            // sekcja: presety
            const presetsHeaderRow = document.createElement("div");
            Object.assign(presetsHeaderRow.style, { display: "flex", alignItems: "center", justifyContent: "space-between", margin: "14px 0 6px" });
            const presetsLabel = document.createElement("div");
            presetsLabel.innerText = "PRESETY WYSYŁKI / FAKTURY";
            Object.assign(presetsLabel.style, { fontSize: "11.5px", fontWeight: 700, color: T.textDim, letterSpacing: "0.5px" });
            const managePresetsBtn = document.createElement("button");
            managePresetsBtn.innerText = "+ Nowy";
            Object.assign(managePresetsBtn.style, {
                border: "none", background: "transparent", color: T.blue, cursor: "pointer",
                fontSize: "11.5px", fontWeight: 700, padding: "0"
            });
            presetsHeaderRow.appendChild(presetsLabel);
            presetsHeaderRow.appendChild(managePresetsBtn);
            body.appendChild(presetsHeaderRow);

            const presetsListEl = document.createElement("div");
            body.appendChild(presetsListEl);

            const presetsStatus = document.createElement("div");
            Object.assign(presetsStatus.style, { fontSize: "12.5px", color: T.textDim, marginBottom: "4px", minHeight: "16px" });

            function renderPresetsList() {
                presetsListEl.innerHTML = "";
                loadUserPresets().forEach((preset, index) => {
                    const row = document.createElement("div");
                    Object.assign(row.style, { display: "flex", gap: "5px", marginBottom: "5px" });

                    const btn = document.createElement("button");
                    btn.innerText = preset.label;
                    Object.assign(btn.style, {
                        flex: "1", padding: "10px", border: "none", borderRadius: "7px",
                        background: T.blue, color: "#fff", cursor: "pointer",
                        fontSize: "13.5px", fontWeight: 600, textAlign: "left"
                    });
                    btn.onclick = () => applyPreset(preset, presetsStatus);

                    const delBtn = document.createElement("button");
                    delBtn.innerHTML = icon("close", 13);
                    Object.assign(delBtn.style, {
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: "34px", border: "none", borderRadius: "7px",
                        background: hexToRgba(T.red, 0.16), color: T.red, cursor: "pointer"
                    });
                    delBtn.onclick = () => {
                        const list = loadUserPresets();
                        list.splice(index, 1);
                        saveUserPresets(list);
                        renderPresetsList();
                    };

                    row.appendChild(btn);
                    row.appendChild(delBtn);
                    presetsListEl.appendChild(row);
                });
            }
            renderPresetsList();
            managePresetsBtn.onclick = () => openPresetEditorModal(renderPresetsList);

            body.appendChild(presetsStatus);

            // sekcja: presety biżuterii (dwie zwijane grupy, 585 i 333)
            function buildJewelrySection(title, purity, stateKey) {
                const sectionHeader = document.createElement("button");
                Object.assign(sectionHeader.style, {
                    display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                    border: "none", background: "transparent", cursor: "pointer", padding: "10px 0 6px", margin: "2px 0 0"
                });
                const sectionLabel = document.createElement("span");
                sectionLabel.innerText = title;
                Object.assign(sectionLabel.style, { fontSize: "11.5px", fontWeight: 700, color: T.textDim, letterSpacing: "0.5px" });
                const sectionChevron = document.createElement("span");
                sectionChevron.innerHTML = icon("chevron", 13);
                Object.assign(sectionChevron.style, { color: T.textDim, display: "flex", transition: "transform 0.15s ease" });
                sectionHeader.appendChild(sectionLabel);
                sectionHeader.appendChild(sectionChevron);
                body.appendChild(sectionHeader);

                const sectionBody = document.createElement("div");
                Object.assign(sectionBody.style, { display: "none", flexDirection: "column" });

                const sectionStatus = document.createElement("div");
                Object.assign(sectionStatus.style, { fontSize: "12.5px", color: T.textDim, marginBottom: "4px", minHeight: "16px" });

                Object.keys(JEWELRY_LEAVES).forEach(leafKey => {
                    const btn = document.createElement("button");
                    btn.innerText = JEWELRY_LEAVES[leafKey].label;
                    Object.assign(btn.style, {
                        display: "block", width: "100%", padding: "10px", marginBottom: "5px",
                        border: "none", borderRadius: "7px", background: T.purple, color: "#fff",
                        cursor: "pointer", fontSize: "13.5px", fontWeight: 600, textAlign: "left"
                    });
                    btn.onclick = () => startJewelryPreset(leafKey, purity, sectionStatus);
                    sectionBody.appendChild(btn);
                });
                sectionBody.appendChild(sectionStatus);

                function setCollapsed(collapsed) {
                    sectionBody.style.display = collapsed ? "none" : "flex";
                    sectionChevron.style.transform = collapsed ? "rotate(0deg)" : "rotate(180deg)";
                }
                setCollapsed(state[stateKey]);

                sectionHeader.addEventListener("click", () => {
                    const collapsed = sectionBody.style.display === "none";
                    setCollapsed(!collapsed);
                    savePanelState({ [stateKey]: !collapsed });
                });

                body.appendChild(sectionBody);
            }

            buildJewelrySection("BIŻUTERIA 585", "585", "jewelry585Collapsed");
            buildJewelrySection("BIŻUTERIA 333", "333", "jewelry333Collapsed");

            panel.appendChild(header);
            panel.appendChild(body);
            document.body.appendChild(panel);
            makeDraggable(panel, header, (rect) => {
                savePanelState({
                    top: Math.round(rect.top),
                    left: Math.round(rect.left)
                });
            });

            // Własny uchwyt do rozciągania w LEWYM dolnym rogu — natywny CSS "resize"
            // zawsze renderuje uchwyt w prawym dolnym rogu, co nie ma sensu tutaj:
            // panel jest zadokowany przy prawej krawędzi ekranu, więc jedyny sensowny
            // kierunek powiększania to w lewo (i w dół dla wysokości).
            const resizeHandle = document.createElement("div");
            Object.assign(resizeHandle.style, {
                position: "absolute", left: "0", bottom: "0", width: "18px", height: "18px",
                cursor: "sw-resize", zIndex: "3", touchAction: "none"
            });
            resizeHandle.innerHTML = `<svg viewBox="0 0 18 18" style="width:100%;height:100%;opacity:0.45">
                <path d="M16 2L2 16M16 8L8 16M16 14L14 16" stroke="${T.textDim}" stroke-width="1.5"/>
            </svg>`;
            panel.appendChild(resizeHandle);

            let resizing = false, startX = 0, startY = 0, startWidth = 0, startHeight = 0, startRight = 0, startTop = 0;
            resizeHandle.addEventListener("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                resizing = true;
                const rect = panel.getBoundingClientRect();
                startX = e.clientX;
                startY = e.clientY;
                startWidth = rect.width;
                startHeight = rect.height;
                startRight = rect.right;   // prawa krawędź ma zostać w miejscu
                startTop = rect.top;
            });
            document.addEventListener("mousemove", (e) => {
                if (!resizing) return;
                const dx = startX - e.clientX;   // ciągnięcie w lewo => dodatnie dx => szerszy panel
                const dy = e.clientY - startY;   // ciągnięcie w dół => wyższy panel

                const minW = 320, minH = 280;
                const maxW = window.innerWidth * 0.9;
                const maxH = window.innerHeight * 0.9;

                const newWidth = Math.min(Math.max(startWidth + dx, minW), maxW);
                const newHeight = Math.min(Math.max(startHeight + dy, minH), maxH);
                const newLeft = startRight - newWidth; // prawa krawędź zostaje w miejscu

                panel.style.width = newWidth + "px";
                panel.style.height = newHeight + "px";
                panel.style.left = newLeft + "px";
            });
            document.addEventListener("mouseup", () => {
                if (!resizing) return;
                resizing = false;
                savePanelState({
                    width: panel.offsetWidth,
                    height: panel.offsetHeight,
                    left: parseInt(panel.style.left, 10),
                    top: Math.round(startTop)
                });
            });

            return panel;
        }

        function buildBubble(panel) {
            const bubble = document.createElement("div");
            bubble.id = "pwLombardBubble";
            Object.assign(bubble.style, {
                position: "fixed", bottom: "24px", right: "24px", width: "48px", height: "48px",
                borderRadius: "50%", background: T.accent, color: "#1a0d05", display: "flex",
                alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: "999999",
                boxShadow: "0 6px 18px rgba(0,0,0,0.35)"
            });
            bubble.innerHTML = icon("toolbox", 20);
            bubble.addEventListener("click", () => {
                const willOpen = panel.style.display === "none";
                panel.style.display = willOpen ? "flex" : "none";
                savePanelState({ open: willOpen });
            });
            document.body.appendChild(bubble);

            document.addEventListener("keydown", (e) => {
                if (e.key === "F2") {
                    e.preventDefault();
                    const willOpen = panel.style.display === "none";
                    panel.style.display = willOpen ? "flex" : "none";
                    savePanelState({ open: willOpen });
                }
            });
        }

        const panel = buildPanel();
        buildBubble(panel);

        // Po ewentualnym reloadzie strony (klik "Zapisz kategorię" w presecie biżuterii)
        // sprawdzamy, czy coś czeka na dokończenie
        const pendingJewelry = GM_getValue(JEWELRY_PENDING_KEY, null);
        if (pendingJewelry) {
            GM_setValue(JEWELRY_PENDING_KEY, null);
            finishJewelryPreset(pendingJewelry);
        }
    }

    // =========================================================
    // ROUTING PO DOMENIE
    // =========================================================
    if (location.hostname.includes("salescenter.allegro.com")) {
        runAllegroModule();
    } else if (location.hostname.includes("panel.loombard.pl")) {
        runLombardModule();
    } else if (location.hostname === "www.google.com") {
        runGoogleAiModule();
    }

})();// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      2026-09-08
// @description  try to take over the world!
// @author       You
// @match        https://claude.ai/chat/4977cc1b-29a0-4aaa-93f6-50dfb7388f58
// @icon         https://www.google.com/s2/favicons?sz=64&domain=claude.ai
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Your code here...
})();
