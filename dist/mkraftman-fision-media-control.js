/**
 * mkraftman-fision-media-control
 * Custom card for Hotwire Fision transport controls via script.fision_send.
 * Controls: skip back (replay), rewind, play/pause (long-press: stop/back to live),
 * fast forward, skip forward.
 * Permanent Fision artwork background.
 */

const DEFAULTS = {
  name: "Fision Cable TV",
  script: "fision_send",
  image: "/local/images/fision.png",
};

class MkraftmanFisionMediaControl extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._el = {};
    this._built = false;
    this._pauseTimer = null;
    this._pauseHeld = false;
    // Fision has separate play and pause codes; track whether we're at normal speed
    // so the centre button can toggle. Anything other than normal play -> next tap plays.
    this._playing = true;
  }

  static getStubConfig() {
    return {};
  }

  setConfig(config) {
    this._config = { ...DEFAULTS, ...(config || {}) };
    if (this._built) this._update();
    else if (this._hass) this._build();
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { rows: 3, columns: 12, min_rows: 3, min_columns: 6 };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;

    if (!this._built) {
      this._build();
      return;
    }
  }

  _build() {
    if (this._built || !this._hass || !this._config) return;

    const shadow = this.shadowRoot;
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          --mc-fg: var(--primary-text-color, #fff);
        }
        ha-card {
          position: relative;
          overflow: hidden;
          height: 100%;
          box-sizing: border-box;
          background: #132532;
          transition: filter 0.3s, opacity 0.3s;
        }

        /* background layers */
        .bg { position: absolute; inset: 0; }
        .bg-color {
          position: absolute; inset: 0;
          background-color: #132532;
        }
        .bg-image {
          position: absolute;
          right: 0; top: 0; bottom: 0;
          background-size: cover;
          background-position: center;
          background-image: url('${this._config.image}');
          opacity: 1;
        }
        .bg-gradient {
          position: absolute;
          right: 0; top: 0; bottom: 0;
          background: linear-gradient(to right, #132532 0%, transparent 100%);
          opacity: 1;
        }

        .player {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          padding: 16px;
          height: 100%;
          box-sizing: border-box;
          color: var(--mc-fg);
        }

        .name {
          font-size: 18px;
          font-weight: 500;
          opacity: 0.85;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--mc-fg);
          margin-bottom: 8px;
        }

        .controls {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 4px 0;
          gap: 4px;
          flex: 1;
        }
        .ctrl {
          background: none;
          border: none;
          cursor: pointer;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          flex: 1;
          max-width: 72px;
          transition: background-color 0.15s;
          color: var(--mc-fg);
          -webkit-tap-highlight-color: transparent;
          outline: none;
        }
        .ctrl ha-icon {
          --mdc-icon-size: 40px;
          color: var(--mc-fg);
        }
        .ctrl.pp {
          max-width: 132px;
        }
        .ctrl.pp ha-icon {
          --mdc-icon-size: 65px;
        }
        .ctrl.skip ha-icon {
          --mdc-icon-size: 28px;
        }
        .ctrl.mirror ha-icon {
          transform: scaleX(-1);
        }
      </style>

      <ha-card>
        <div class="bg">
          <div class="bg-color"></div>
          <div class="bg-image" id="bgImage"></div>
          <div class="bg-gradient" id="bgGrad"></div>
        </div>
        <div class="player">
          <div class="name" id="name"></div>
          <div class="controls">
            <button class="ctrl skip mirror" id="prev">
              <ha-icon icon="mdi:debug-step-over"></ha-icon>
            </button>
            <button class="ctrl" id="rw">
              <ha-icon icon="mdi:rewind"></ha-icon>
            </button>
            <button class="ctrl pp" id="pp">
              <ha-icon icon="mdi:play-pause"></ha-icon>
            </button>
            <button class="ctrl" id="ff">
              <ha-icon icon="mdi:fast-forward"></ha-icon>
            </button>
            <button class="ctrl skip" id="next">
              <ha-icon icon="mdi:debug-step-over"></ha-icon>
            </button>
          </div>
        </div>
      </ha-card>
    `;

    this._el = {
      card: shadow.querySelector("ha-card"),
      bgImage: shadow.getElementById("bgImage"),
      bgGrad: shadow.getElementById("bgGrad"),
      name: shadow.getElementById("name"),
    };
    this._el.name.textContent = this._config.name;

    // Simple click handlers. Replay/skip jump within the buffer and keep playing;
    // rewind/fast-forward leave normal speed, so the next centre tap sends play.
    shadow.getElementById("prev").addEventListener("click", () => this._sendCommand("replay"));
    shadow.getElementById("rw").addEventListener("click", () => { this._playing = false; this._sendCommand("rewind"); });
    shadow.getElementById("ff").addEventListener("click", () => { this._playing = false; this._sendCommand("fast_forward"); });
    shadow.getElementById("next").addEventListener("click", () => this._sendCommand("skip_forward"));

    // Play/pause button: tap = toggle play/pause, long-press (>500ms) = stop (back to live)
    const ppBtn = shadow.getElementById("pp");

    const startHold = (e) => {
      this._pauseHeld = false;
      this._pauseTimer = setTimeout(() => {
        this._pauseHeld = true;
        this._playing = true;
        this._sendCommand("stop");
      }, 500);
    };

    const endHold = (e) => {
      if (this._pauseTimer) {
        clearTimeout(this._pauseTimer);
        this._pauseTimer = null;
      }
      if (!this._pauseHeld) {
        this._sendCommand(this._playing ? "pause" : "play");
        this._playing = !this._playing;
      }
      this._pauseHeld = false;
    };

    const cancelHold = () => {
      if (this._pauseTimer) {
        clearTimeout(this._pauseTimer);
        this._pauseTimer = null;
      }
      this._pauseHeld = false;
    };

    ppBtn.addEventListener("mousedown", startHold);
    ppBtn.addEventListener("mouseup", endHold);
    ppBtn.addEventListener("mouseleave", cancelHold);
    ppBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      startHold(e);
    });
    ppBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      endHold(e);
    });
    ppBtn.addEventListener("touchcancel", cancelHold);

    // Prevent default click so it doesn't double-fire
    ppBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    this._built = true;
    this._updateBgSize();

    // ResizeObserver for artwork sizing
    this._resizeObserver = new ResizeObserver(() => {
      this._updateBgSize();
    });
    this._resizeObserver.observe(this._el.card);
  }

  _updateBgSize() {
    if (!this._el.card || !this._el.bgImage) return;
    const h = this._el.card.offsetHeight;
    if (h > 0) {
      this._el.bgImage.style.width = h + "px";
      this._el.bgGrad.style.width = h + "px";
    }
  }

  _update() {
    // No entity state to track — card is always visible and active.
    if (this._el.name) this._el.name.textContent = this._config.name;
    if (this._el.bgImage) this._el.bgImage.style.backgroundImage = "url('" + this._config.image + "')";
  }

  _sendCommand(command) {
    if (!this._hass) return;
    // fision_send is queued and alternates the IR toggle bit
    this._hass.callService("script", this._config.script.replace(/^script\./, ""), { command });
  }

  connectedCallback() {
    if (this._hass && this._config && !this._built) {
      this._build();
    }
  }

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._pauseTimer) {
      clearTimeout(this._pauseTimer);
      this._pauseTimer = null;
    }
  }
}

customElements.define("mkraftman-fision-media-control", MkraftmanFisionMediaControl);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "mkraftman-fision-media-control",
  name: "Mkraftman Fision Media Control",
  description: "Transport controls for Hotwire Fision via script.fision_send.",
});
