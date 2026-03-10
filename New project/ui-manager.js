(() => {
  const ROOT_ID = "ai-privacy-sentinel-root";

  class UIManager {
    constructor() {
      this.host = null;
      this.shadowRoot = null;
      this.shieldButton = null;
      this.modal = null;
      this.modalTitle = null;
      this.modalText = null;
      this.primaryButton = null;
      this.secondaryButton = null;
      this.currentField = null;
      this.maskHandler = null;
      this.cancelHandler = null;
    }

    ensureRoot() {
      if (this.shadowRoot) {
        return this.shadowRoot;
      }

      this.host = document.createElement("div");
      this.host.id = ROOT_ID;
      document.documentElement.appendChild(this.host);
      this.shadowRoot = this.host.attachShadow({ mode: "open" });
      this.shadowRoot.appendChild(this.buildStyles());
      this.shadowRoot.appendChild(this.buildContainer());

      return this.shadowRoot;
    }

    buildStyles() {
      const style = document.createElement("style");
      style.textContent = `
        :host {
          all: initial;
        }

        .sentinel-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .shield-button {
          position: fixed;
          display: none;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border: 0;
          border-radius: 999px;
          background: #8b0000;
          color: #fff;
          box-shadow: 0 10px 30px rgba(139, 0, 0, 0.25);
          cursor: pointer;
          pointer-events: auto;
          font-size: 13px;
          font-weight: 600;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          display: none;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.45);
          pointer-events: auto;
        }

        .modal {
          width: min(420px, calc(100vw - 32px));
          padding: 20px;
          border-radius: 16px;
          background: #fff;
          color: #0f172a;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
        }

        .modal h2 {
          margin: 0 0 10px;
          font-size: 18px;
        }

        .modal p {
          margin: 0 0 18px;
          font-size: 14px;
          line-height: 1.5;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .modal-actions button {
          border: 0;
          border-radius: 10px;
          padding: 10px 14px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }

        .modal-actions .mask {
          background: #8b0000;
          color: #fff;
        }

        .modal-actions .cancel {
          background: #e2e8f0;
          color: #0f172a;
        }
      `;
      return style;
    }

    buildContainer() {
      const layer = document.createElement("div");
      layer.className = "sentinel-layer";

      this.shieldButton = document.createElement("button");
      this.shieldButton.type = "button";
      this.shieldButton.className = "shield-button";
      this.shieldButton.textContent = "🛡 Защита активна";

      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop";

      this.modal = document.createElement("div");
      this.modal.className = "modal";
      this.modal.setAttribute("role", "dialog");
      this.modal.setAttribute("aria-modal", "true");

      this.modalTitle = document.createElement("h2");
      this.modalTitle.textContent = "Обнаружены потенциально чувствительные данные";

      this.modalText = document.createElement("p");
      this.modalText.textContent = "Замаскируйте возможные секреты перед отправкой сообщения.";

      const actions = document.createElement("div");
      actions.className = "modal-actions";

      this.secondaryButton = document.createElement("button");
      this.secondaryButton.type = "button";
      this.secondaryButton.className = "cancel";
      this.secondaryButton.textContent = "Отмена";
      this.secondaryButton.addEventListener("click", () => {
        const field = this.currentField;
        this.hideModal();
        if (this.cancelHandler) {
          this.cancelHandler(field);
        }
      });

      this.primaryButton = document.createElement("button");
      this.primaryButton.type = "button";
      this.primaryButton.className = "mask";
      this.primaryButton.textContent = "Замаскировать и отправить";
      this.primaryButton.addEventListener("click", () => {
        const field = this.currentField;
        this.hideModal();
        if (this.maskHandler) {
          this.maskHandler(field);
        }
      });

      actions.append(this.secondaryButton, this.primaryButton);
      this.modal.append(this.modalTitle, this.modalText, actions);
      backdrop.appendChild(this.modal);
      layer.append(this.shieldButton, backdrop);
      this.backdrop = backdrop;

      return layer;
    }

    showShield(anchorRect, findingCount) {
      this.ensureRoot();
      this.shieldButton.style.display = "inline-flex";
      this.shieldButton.textContent = `🛡 Найдено: ${findingCount}`;
      this.shieldButton.style.top = `${Math.max(anchorRect.top + window.scrollY - 44, 8)}px`;
      this.shieldButton.style.left = `${Math.max(anchorRect.right + window.scrollX - 150, 8)}px`;
    }

    hideShield() {
      if (this.shieldButton) {
        this.shieldButton.style.display = "none";
      }
    }

    showModal(field, findingCount, details, onMask, onCancel) {
      this.ensureRoot();
      this.currentField = field;
      this.maskHandler = onMask;
      this.cancelHandler = onCancel;
      this.modalTitle.textContent = "Обнаружены потенциально чувствительные данные";
      this.primaryButton.textContent = "Замаскировать и отправить";
      this.primaryButton.className = "mask";
      this.secondaryButton.textContent = "Отмена";
      this.secondaryButton.className = "cancel";
      this.modalText.textContent =
        details && typeof details === "string" && details.trim().length > 0
          ? details
          : `${findingCount} потенциально чувствительных элементов. Замаскируйте данные перед отправкой.`;
      this.backdrop.style.display = "flex";
    }

    hideModal() {
      if (this.backdrop) {
        this.backdrop.style.display = "none";
      }
      this.currentField = null;
    }
  }

  window.AIPrivacyUI = new UIManager();
})();
