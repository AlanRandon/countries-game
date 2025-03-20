import { LitElement } from "lit";

export class LitElementNoShadow extends LitElement {
  createRenderRoot() {
    return this;
  }
}

export class Question extends LitElementNoShadow {
  lives: number;

  dispatchSkip() {
    this.dispatchEvent(
      new CustomEvent("skip-question", {
        bubbles: true,
      }),
    );
  }
  constructor(lives: number) {
    super();
    this.lives = lives;
  }
}
